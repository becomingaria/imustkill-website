import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2"
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from "path"

export class ImkLiveSessionsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        // ============================================================
        // DynamoDB Table for Initiative Sessions
        // ============================================================
        // Using PAY_PER_REQUEST billing = only pay for what you use
        // TTL enabled = automatic cleanup of expired sessions (FREE!)
        const sessionsTable = new dynamodb.Table(this, "InitiativeSessions", {
            tableName: "imk-initiative-sessions",
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Easy cleanup for dev
            timeToLiveAttribute: "ttl", // Automatic cleanup!
            pointInTimeRecovery: false, // Disable for cost savings
        })

        // GSI for listing active sessions (if needed in the future)
        sessionsTable.addGlobalSecondaryIndex({
            indexName: "active-sessions",
            partitionKey: {
                name: "isActive",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "createdAt",
                type: dynamodb.AttributeType.NUMBER,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        })

        // ============================================================
        // WebSocket Connections Table
        // ============================================================
        // Tracks which WebSocket connections are subscribed to which sessions
        const connectionsTable = new dynamodb.Table(
            this,
            "WebSocketConnections",
            {
                tableName: "imk-websocket-connections",
                partitionKey: {
                    name: "connectionId",
                    type: dynamodb.AttributeType.STRING,
                },
                billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                timeToLiveAttribute: "ttl", // Auto-cleanup stale connections
            },
        )

        // GSI to find all connections for a session
        connectionsTable.addGlobalSecondaryIndex({
            indexName: "session-connections",
            partitionKey: {
                name: "sessionId",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        })

        // ============================================================
        // Lambda Functions for REST API
        // ============================================================
        const sessionsHandler = new NodejsFunction(this, "SessionsHandler", {
            functionName: "imk-sessions-handler",
            entry: path.join(__dirname, "../lambda/sessions.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64, // Cheaper!
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            environment: {
                SESSIONS_TABLE: sessionsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,
                NODE_OPTIONS: "--enable-source-maps",
            },
            logRetention: logs.RetentionDays.ONE_WEEK, // Cost savings
            bundling: {
                minify: true,
                sourceMap: true,
            },
        })

        // Grant DynamoDB permissions
        sessionsTable.grantReadWriteData(sessionsHandler)
        connectionsTable.grantReadData(sessionsHandler)

        // ============================================================
        // HTTP API (REST endpoints)
        // ============================================================
        const httpApi = new apigateway.HttpApi(this, "SessionsHttpApi", {
            apiName: "imk-sessions-api",
            description: "I Must Kill - Initiative Session Management API",
            corsPreflight: {
                allowOrigins: ["*"], // Configure for your domain in production
                allowMethods: [
                    apigateway.CorsHttpMethod.GET,
                    apigateway.CorsHttpMethod.POST,
                    apigateway.CorsHttpMethod.PUT,
                    apigateway.CorsHttpMethod.DELETE,
                    apigateway.CorsHttpMethod.OPTIONS,
                ],
                allowHeaders: ["Content-Type", "Authorization"],
                maxAge: cdk.Duration.hours(1),
            },
        })

        const sessionsIntegration =
            new apigatewayIntegrations.HttpLambdaIntegration(
                "SessionsIntegration",
                sessionsHandler,
            )

        // REST endpoints
        httpApi.addRoutes({
            path: "/sessions",
            methods: [apigateway.HttpMethod.POST],
            integration: sessionsIntegration,
        })

        httpApi.addRoutes({
            path: "/sessions/{sessionId}",
            methods: [
                apigateway.HttpMethod.GET,
                apigateway.HttpMethod.PUT,
                apigateway.HttpMethod.DELETE,
            ],
            integration: sessionsIntegration,
        })

        // ============================================================
        // WebSocket API (Real-time updates)
        // ============================================================
        const webSocketHandler = new NodejsFunction(this, "WebSocketHandler", {
            functionName: "imk-websocket-handler",
            entry: path.join(__dirname, "../lambda/websocket.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            environment: {
                SESSIONS_TABLE: sessionsTable.tableName,
                CONNECTIONS_TABLE: connectionsTable.tableName,
                NODE_OPTIONS: "--enable-source-maps",
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: {
                minify: true,
                sourceMap: true,
            },
        })

        // Grant permissions
        sessionsTable.grantReadWriteData(webSocketHandler)
        connectionsTable.grantReadWriteData(webSocketHandler)

        const webSocketApi = new apigateway.WebSocketApi(
            this,
            "SessionsWebSocketApi",
            {
                apiName: "imk-sessions-websocket",
                description: "I Must Kill - Real-time Session Updates",
                connectRouteOptions: {
                    integration:
                        new apigatewayIntegrations.WebSocketLambdaIntegration(
                            "ConnectIntegration",
                            webSocketHandler,
                        ),
                },
                disconnectRouteOptions: {
                    integration:
                        new apigatewayIntegrations.WebSocketLambdaIntegration(
                            "DisconnectIntegration",
                            webSocketHandler,
                        ),
                },
                defaultRouteOptions: {
                    integration:
                        new apigatewayIntegrations.WebSocketLambdaIntegration(
                            "DefaultIntegration",
                            webSocketHandler,
                        ),
                },
            },
        )

        // Add custom routes for session management
        webSocketApi.addRoute("subscribe", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
                "SubscribeIntegration",
                webSocketHandler,
            ),
        })

        webSocketApi.addRoute("unsubscribe", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
                "UnsubscribeIntegration",
                webSocketHandler,
            ),
        })

        webSocketApi.addRoute("ping", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration(
                "PingIntegration",
                webSocketHandler,
            ),
        })

        // WebSocket stage
        const webSocketStage = new apigateway.WebSocketStage(
            this,
            "WebSocketStage",
            {
                webSocketApi,
                stageName: "live",
                autoDeploy: true,
            },
        )

        // Grant WebSocket management permissions to the handler
        webSocketHandler.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["execute-api:ManageConnections"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`,
                ],
            }),
        )

        // Also grant to sessions handler (for broadcasting updates)
        sessionsHandler.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["execute-api:ManageConnections"],
                resources: [
                    `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`,
                ],
            }),
        )

        // Add WebSocket endpoint to sessions handler environment
        sessionsHandler.addEnvironment(
            "WEBSOCKET_ENDPOINT",
            `${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`,
        )

        // ============================================================
        // Outputs
        // ============================================================
        new cdk.CfnOutput(this, "HttpApiUrl", {
            value: httpApi.url || "",
            description: "HTTP API URL for session management",
            exportName: "ImkHttpApiUrl",
        })

        new cdk.CfnOutput(this, "WebSocketUrl", {
            value: webSocketStage.url,
            description: "WebSocket URL for real-time updates",
            exportName: "ImkWebSocketUrl",
        })

        new cdk.CfnOutput(this, "SessionsTableName", {
            value: sessionsTable.tableName,
            description: "DynamoDB table name for sessions",
        })

        new cdk.CfnOutput(this, "ConnectionsTableName", {
            value: connectionsTable.tableName,
            description: "DynamoDB table name for WebSocket connections",
        })
    }
}
