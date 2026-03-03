import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2"
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import * as apigatewayAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
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
        // DynamoDB Table for Cards (Powers + Monsters)
        // ============================================================
        // Partition by deck for efficient "get all cards in deck" queries
        // Sort by name for unique identification within each deck
        // Type field distinguishes between "power" and "monster" cards
        const cardsTable = new dynamodb.Table(this, "CardsTable", {
            tableName: "imk-cards",
            partitionKey: {
                name: "deck",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "name",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            pointInTimeRecovery: false,
        })

        // GSI for querying by type (power vs monster)
        cardsTable.addGlobalSecondaryIndex({
            indexName: "type-index",
            partitionKey: {
                name: "type",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "name",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        })

        // GSI for querying powers by rarity
        cardsTable.addGlobalSecondaryIndex({
            indexName: "rarity-index",
            partitionKey: {
                name: "rarity",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "name",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        })

        // ============================================================
        // S3 Bucket for Card Artwork
        // ============================================================
        // Structure:
        //   cards/{deck}/{cardName}.png - Individual card art
        //   backs/{deck}.png - Deck back artwork
        //   placeholder.png - Default fallback image
        const artworkBucket = new s3.Bucket(this, "CardArtworkBucket", {
            bucketName: `imk-card-artwork-${this.account}`,
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep artwork on stack deletion
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // CloudFront only
            encryption: s3.BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                },
            ],
        })

        // CloudFront distribution for artwork CDN
        // ResponseHeadersPolicy to add CORS headers for canvas usage
        const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
            this,
            "ArtworkCorsPolicy",
            {
                responseHeadersPolicyName: "imk-artwork-cors",
                corsBehavior: {
                    accessControlAllowCredentials: false,
                    accessControlAllowHeaders: ["*"],
                    accessControlAllowMethods: ["GET"],
                    accessControlAllowOrigins: ["*"],
                    accessControlMaxAge: cdk.Duration.days(1),
                    originOverride: true,
                },
            },
        )

        const artworkDistribution = new cloudfront.Distribution(
            this,
            "ArtworkDistribution",
            {
                defaultBehavior: {
                    origin: origins.S3BucketOrigin.withOriginAccessControl(
                        artworkBucket,
                    ),
                    viewerProtocolPolicy:
                        cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    responseHeadersPolicy: corsHeadersPolicy,
                },
                // Error page for missing images (serves placeholder)
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 200,
                        responsePagePath: "/placeholder.png",
                        ttl: cdk.Duration.seconds(10),
                    },
                    {
                        httpStatus: 404,
                        responseHttpStatus: 200,
                        responsePagePath: "/placeholder.png",
                        ttl: cdk.Duration.seconds(10),
                    },
                ],
            },
        )

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
        // Cards Lambda Handler (CRUD for powers + monsters)
        // ============================================================
        const cardsHandler = new NodejsFunction(this, "CardsHandler", {
            functionName: "imk-cards-handler",
            entry: path.join(__dirname, "../lambda/cards.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            environment: {
                CARDS_TABLE: cardsTable.tableName,
                NODE_OPTIONS: "--enable-source-maps",
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: {
                minify: true,
                sourceMap: true,
            },
        })

        // Grant DynamoDB permissions for cards
        cardsTable.grantReadWriteData(cardsHandler)

        // ============================================================
        // Admin Lambda (Deck CRUD + S3 Presigned Upload URLs)
        // ============================================================
        const adminHandler = new NodejsFunction(this, "AdminHandler", {
            functionName: "imk-admin-handler",
            entry: path.join(__dirname, "../lambda/admin.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            timeout: cdk.Duration.seconds(15),
            environment: {
                CARDS_TABLE: cardsTable.tableName,
                ARTWORK_BUCKET: artworkBucket.bucketName,
                ARTWORK_CDN_URL: `https://${artworkDistribution.distributionDomainName}`,
                NODE_OPTIONS: "--enable-source-maps",
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: [],
            },
        })

        cardsTable.grantReadWriteData(adminHandler)
        artworkBucket.grantPut(adminHandler)
        artworkBucket.grantRead(adminHandler)

        // ============================================================
        // DynamoDB Table for Rules Database
        // ============================================================
        // Stores every section of every rules page.
        // PK: category  ("combat-mechanics", "character-creation", …)
        // SK: sectionId ("actions", "stats", …)
        const rulesTable = new dynamodb.Table(this, "RulesTable", {
            tableName: "imk-rules",
            partitionKey: {
                name: "category",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "sectionId",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Never accidentally delete game rules
            pointInTimeRecovery: true,
        })

        // ── Rules Lambda (CRUD for game rules) ────────────────────────────────
        const rulesHandler = new NodejsFunction(this, "RulesHandler", {
            functionName: "imk-rules-handler",
            entry: path.join(__dirname, "../lambda/rules.ts"),
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            environment: {
                RULES_TABLE: rulesTable.tableName,
                NODE_OPTIONS: "--enable-source-maps",
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
            bundling: { minify: true, sourceMap: true },
        })

        rulesTable.grantReadData(rulesHandler) // public reads
        rulesTable.grantReadWriteData(rulesHandler) // admin writes

        // ============================================================
        // Cognito User Pool for Admin Authentication
        // ============================================================
        const adminUserPool = new cognito.UserPool(this, "AdminUserPool", {
            userPoolName: "imk-admin-pool",
            selfSignUpEnabled: false,
            signInAliases: { email: true },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
                tempPasswordValidity: cdk.Duration.days(7),
            },
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        const adminUserPoolClient = adminUserPool.addClient("AdminWebClient", {
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            generateSecret: false,
            accessTokenValidity: cdk.Duration.hours(8),
            idTokenValidity: cdk.Duration.hours(8),
            refreshTokenValidity: cdk.Duration.days(30),
        })

        // Create admin users (sends invitation email with temporary password)
        new cognito.CfnUserPoolUser(this, "AdminUser1", {
            userPoolId: adminUserPool.userPoolId,
            username: "becomingaria@gmail.com",
            userAttributes: [
                { name: "email", value: "becomingaria@gmail.com" },
                { name: "email_verified", value: "true" },
            ],
            desiredDeliveryMediums: ["EMAIL"],
        })

        new cognito.CfnUserPoolUser(this, "AdminUser2", {
            userPoolId: adminUserPool.userPoolId,
            username: "kat.hallo@outlook.com",
            userAttributes: [
                { name: "email", value: "kat.hallo@outlook.com" },
                { name: "email_verified", value: "true" },
            ],
            desiredDeliveryMediums: ["EMAIL"],
        })

        // JWT Authorizer — protects all /admin/* routes and card write routes
        const adminAuthorizer =
            new apigatewayAuthorizers.HttpUserPoolAuthorizer(
                "AdminAuthorizer",
                adminUserPool,
                {
                    userPoolClients: [adminUserPoolClient],
                    identitySource: ["$request.header.Authorization"],
                },
            )
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

        // Cards API endpoints (powers + monsters)
        const cardsIntegration =
            new apigatewayIntegrations.HttpLambdaIntegration(
                "CardsIntegration",
                cardsHandler,
            )

        const adminIntegration =
            new apigatewayIntegrations.HttpLambdaIntegration(
                "AdminIntegration",
                adminHandler,
            )

        // ── Rules routes (public reads, admin writes) ──────────────
        const rulesIntegration =
            new apigatewayIntegrations.HttpLambdaIntegration(
                "RulesIntegration",
                rulesHandler,
            )

        // Public rule reads
        httpApi.addRoutes({
            path: "/rules",
            methods: [apigateway.HttpMethod.GET],
            integration: rulesIntegration,
        })

        httpApi.addRoutes({
            path: "/rules/{category}",
            methods: [apigateway.HttpMethod.GET],
            integration: rulesIntegration,
        })

        httpApi.addRoutes({
            path: "/rules/{category}/{sectionId}",
            methods: [apigateway.HttpMethod.GET],
            integration: rulesIntegration,
        })

        // Admin-only rule writes
        httpApi.addRoutes({
            path: "/rules/seed",
            methods: [apigateway.HttpMethod.POST],
            integration: rulesIntegration,
            authorizer: adminAuthorizer,
        })

        httpApi.addRoutes({
            path: "/rules/{category}/{sectionId}",
            methods: [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE],
            integration: rulesIntegration,
            authorizer: adminAuthorizer,
        })

        // ── Public card reads ──────────────────────────────────────
        httpApi.addRoutes({
            path: "/cards",
            methods: [apigateway.HttpMethod.GET],
            integration: cardsIntegration,
        })

        httpApi.addRoutes({
            path: "/cards/{deck}/{name}",
            methods: [apigateway.HttpMethod.GET],
            integration: cardsIntegration,
        })

        // ── Protected card writes (require Cognito auth) ───────────
        httpApi.addRoutes({
            path: "/cards",
            methods: [apigateway.HttpMethod.POST],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        })

        httpApi.addRoutes({
            path: "/cards/{deck}/{name}",
            methods: [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        })

        httpApi.addRoutes({
            path: "/cards/batch",
            methods: [apigateway.HttpMethod.POST],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        })

        // ── Admin routes (deck management + image upload) ──────────
        httpApi.addRoutes({
            path: "/admin/decks",
            methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
        })

        httpApi.addRoutes({
            path: "/admin/decks/{deck}",
            methods: [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
        })

        httpApi.addRoutes({
            path: "/admin/upload-url",
            methods: [apigateway.HttpMethod.POST],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
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

        new cdk.CfnOutput(this, "CardsTableName", {
            value: cardsTable.tableName,
            description: "DynamoDB table name for cards (powers + monsters)",
        })

        new cdk.CfnOutput(this, "ArtworkBucketName", {
            value: artworkBucket.bucketName,
            description: "S3 bucket for card artwork",
            exportName: "ImkArtworkBucket",
        })

        new cdk.CfnOutput(this, "ArtworkCdnUrl", {
            value: `https://${artworkDistribution.distributionDomainName}`,
            description: "CloudFront CDN URL for card artwork",
            exportName: "ImkArtworkCdnUrl",
        })

        new cdk.CfnOutput(this, "AdminUserPoolId", {
            value: adminUserPool.userPoolId,
            description: "Cognito User Pool ID for admin authentication",
            exportName: "ImkAdminUserPoolId",
        })

        new cdk.CfnOutput(this, "AdminUserPoolClientId", {
            value: adminUserPoolClient.userPoolClientId,
            description: "Cognito User Pool Client ID for admin web app",
            exportName: "ImkAdminUserPoolClientId",
        })

        new cdk.CfnOutput(this, "AdminUserPoolRegion", {
            value: this.region,
            description: "AWS Region for Cognito User Pool",
        })

        new cdk.CfnOutput(this, "RulesTableName", {
            value: rulesTable.tableName,
            description: "DynamoDB table name for rules database",
        })

        new cdk.CfnOutput(this, "RulesApiUrl", {
            value: `${httpApi.url || ""}rules`,
            description: "Rules API base URL",
            exportName: "ImkRulesApiUrl",
        })
    }
}
