"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImkLiveSessionsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigatewayIntegrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const apigatewayAuthorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const path = __importStar(require("path"));
class ImkLiveSessionsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
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
        });
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
        });
        // ============================================================
        // WebSocket Connections Table
        // ============================================================
        // Tracks which WebSocket connections are subscribed to which sessions
        const connectionsTable = new dynamodb.Table(this, "WebSocketConnections", {
            tableName: "imk-websocket-connections",
            partitionKey: {
                name: "connectionId",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            timeToLiveAttribute: "ttl", // Auto-cleanup stale connections
        });
        // GSI to find all connections for a session
        connectionsTable.addGlobalSecondaryIndex({
            indexName: "session-connections",
            partitionKey: {
                name: "sessionId",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });
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
        });
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
        });
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
        });
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
        });
        // CloudFront distribution for artwork CDN
        // ResponseHeadersPolicy to add CORS headers for canvas usage
        const corsHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, "ArtworkCorsPolicy", {
            responseHeadersPolicyName: "imk-artwork-cors",
            corsBehavior: {
                accessControlAllowCredentials: false,
                accessControlAllowHeaders: ["*"],
                accessControlAllowMethods: ["GET"],
                accessControlAllowOrigins: ["*"],
                accessControlMaxAge: cdk.Duration.days(1),
                originOverride: true,
            },
        });
        const artworkDistribution = new cloudfront.Distribution(this, "ArtworkDistribution", {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(artworkBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
        });
        // ============================================================
        // Lambda Functions for REST API
        // ============================================================
        const sessionsHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "SessionsHandler", {
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
        });
        // Grant DynamoDB permissions
        sessionsTable.grantReadWriteData(sessionsHandler);
        connectionsTable.grantReadData(sessionsHandler);
        // ============================================================
        // Cards Lambda Handler (CRUD for powers + monsters)
        // ============================================================
        const cardsHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "CardsHandler", {
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
        });
        // Grant DynamoDB permissions for cards
        cardsTable.grantReadWriteData(cardsHandler);
        // ============================================================
        // Admin Lambda (Deck CRUD + S3 Presigned Upload URLs)
        // ============================================================
        const adminHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "AdminHandler", {
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
        });
        cardsTable.grantReadWriteData(adminHandler);
        artworkBucket.grantPut(adminHandler);
        artworkBucket.grantRead(adminHandler);
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
        });
        const adminUserPoolClient = adminUserPool.addClient("AdminWebClient", {
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            generateSecret: false,
            accessTokenValidity: cdk.Duration.hours(8),
            idTokenValidity: cdk.Duration.hours(8),
            refreshTokenValidity: cdk.Duration.days(30),
        });
        // Create admin users (sends invitation email with temporary password)
        new cognito.CfnUserPoolUser(this, "AdminUser1", {
            userPoolId: adminUserPool.userPoolId,
            username: "becomingaria@gmail.com",
            userAttributes: [
                { name: "email", value: "becomingaria@gmail.com" },
                { name: "email_verified", value: "true" },
            ],
            desiredDeliveryMediums: ["EMAIL"],
        });
        new cognito.CfnUserPoolUser(this, "AdminUser2", {
            userPoolId: adminUserPool.userPoolId,
            username: "kat.hallo@outlook.com",
            userAttributes: [
                { name: "email", value: "kat.hallo@outlook.com" },
                { name: "email_verified", value: "true" },
            ],
            desiredDeliveryMediums: ["EMAIL"],
        });
        // JWT Authorizer — protects all /admin/* routes and card write routes
        const adminAuthorizer = new apigatewayAuthorizers.HttpUserPoolAuthorizer("AdminAuthorizer", adminUserPool, {
            userPoolClients: [adminUserPoolClient],
            identitySource: ["$request.header.Authorization"],
        });
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
        });
        const sessionsIntegration = new apigatewayIntegrations.HttpLambdaIntegration("SessionsIntegration", sessionsHandler);
        // REST endpoints
        httpApi.addRoutes({
            path: "/sessions",
            methods: [apigateway.HttpMethod.POST],
            integration: sessionsIntegration,
        });
        httpApi.addRoutes({
            path: "/sessions/{sessionId}",
            methods: [
                apigateway.HttpMethod.GET,
                apigateway.HttpMethod.PUT,
                apigateway.HttpMethod.DELETE,
            ],
            integration: sessionsIntegration,
        });
        // Cards API endpoints (powers + monsters)
        const cardsIntegration = new apigatewayIntegrations.HttpLambdaIntegration("CardsIntegration", cardsHandler);
        const adminIntegration = new apigatewayIntegrations.HttpLambdaIntegration("AdminIntegration", adminHandler);
        // ── Public card reads ──────────────────────────────────────
        httpApi.addRoutes({
            path: "/cards",
            methods: [apigateway.HttpMethod.GET],
            integration: cardsIntegration,
        });
        httpApi.addRoutes({
            path: "/cards/{deck}/{name}",
            methods: [apigateway.HttpMethod.GET],
            integration: cardsIntegration,
        });
        // ── Protected card writes (require Cognito auth) ───────────
        httpApi.addRoutes({
            path: "/cards",
            methods: [apigateway.HttpMethod.POST],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        });
        httpApi.addRoutes({
            path: "/cards/{deck}/{name}",
            methods: [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        });
        httpApi.addRoutes({
            path: "/cards/batch",
            methods: [apigateway.HttpMethod.POST],
            integration: cardsIntegration,
            authorizer: adminAuthorizer,
        });
        // ── Admin routes (deck management + image upload) ──────────
        httpApi.addRoutes({
            path: "/admin/decks",
            methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
        });
        httpApi.addRoutes({
            path: "/admin/decks/{deck}",
            methods: [apigateway.HttpMethod.PUT, apigateway.HttpMethod.DELETE],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
        });
        httpApi.addRoutes({
            path: "/admin/upload-url",
            methods: [apigateway.HttpMethod.POST],
            integration: adminIntegration,
            authorizer: adminAuthorizer,
        });
        // ============================================================
        // WebSocket API (Real-time updates)
        // ============================================================
        const webSocketHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "WebSocketHandler", {
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
        });
        // Grant permissions
        sessionsTable.grantReadWriteData(webSocketHandler);
        connectionsTable.grantReadWriteData(webSocketHandler);
        const webSocketApi = new apigateway.WebSocketApi(this, "SessionsWebSocketApi", {
            apiName: "imk-sessions-websocket",
            description: "I Must Kill - Real-time Session Updates",
            connectRouteOptions: {
                integration: new apigatewayIntegrations.WebSocketLambdaIntegration("ConnectIntegration", webSocketHandler),
            },
            disconnectRouteOptions: {
                integration: new apigatewayIntegrations.WebSocketLambdaIntegration("DisconnectIntegration", webSocketHandler),
            },
            defaultRouteOptions: {
                integration: new apigatewayIntegrations.WebSocketLambdaIntegration("DefaultIntegration", webSocketHandler),
            },
        });
        // Add custom routes for session management
        webSocketApi.addRoute("subscribe", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration("SubscribeIntegration", webSocketHandler),
        });
        webSocketApi.addRoute("unsubscribe", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration("UnsubscribeIntegration", webSocketHandler),
        });
        webSocketApi.addRoute("ping", {
            integration: new apigatewayIntegrations.WebSocketLambdaIntegration("PingIntegration", webSocketHandler),
        });
        // WebSocket stage
        const webSocketStage = new apigateway.WebSocketStage(this, "WebSocketStage", {
            webSocketApi,
            stageName: "live",
            autoDeploy: true,
        });
        // Grant WebSocket management permissions to the handler
        webSocketHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["execute-api:ManageConnections"],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`,
            ],
        }));
        // Also grant to sessions handler (for broadcasting updates)
        sessionsHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["execute-api:ManageConnections"],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`,
            ],
        }));
        // Add WebSocket endpoint to sessions handler environment
        sessionsHandler.addEnvironment("WEBSOCKET_ENDPOINT", `${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`);
        // ============================================================
        // Outputs
        // ============================================================
        new cdk.CfnOutput(this, "HttpApiUrl", {
            value: httpApi.url || "",
            description: "HTTP API URL for session management",
            exportName: "ImkHttpApiUrl",
        });
        new cdk.CfnOutput(this, "WebSocketUrl", {
            value: webSocketStage.url,
            description: "WebSocket URL for real-time updates",
            exportName: "ImkWebSocketUrl",
        });
        new cdk.CfnOutput(this, "SessionsTableName", {
            value: sessionsTable.tableName,
            description: "DynamoDB table name for sessions",
        });
        new cdk.CfnOutput(this, "ConnectionsTableName", {
            value: connectionsTable.tableName,
            description: "DynamoDB table name for WebSocket connections",
        });
        new cdk.CfnOutput(this, "CardsTableName", {
            value: cardsTable.tableName,
            description: "DynamoDB table name for cards (powers + monsters)",
        });
        new cdk.CfnOutput(this, "ArtworkBucketName", {
            value: artworkBucket.bucketName,
            description: "S3 bucket for card artwork",
            exportName: "ImkArtworkBucket",
        });
        new cdk.CfnOutput(this, "ArtworkCdnUrl", {
            value: `https://${artworkDistribution.distributionDomainName}`,
            description: "CloudFront CDN URL for card artwork",
            exportName: "ImkArtworkCdnUrl",
        });
        new cdk.CfnOutput(this, "AdminUserPoolId", {
            value: adminUserPool.userPoolId,
            description: "Cognito User Pool ID for admin authentication",
            exportName: "ImkAdminUserPoolId",
        });
        new cdk.CfnOutput(this, "AdminUserPoolClientId", {
            value: adminUserPoolClient.userPoolClientId,
            description: "Cognito User Pool Client ID for admin web app",
            exportName: "ImkAdminUserPoolClientId",
        });
        new cdk.CfnOutput(this, "AdminUserPoolRegion", {
            value: this.region,
            description: "AWS Region for Cognito User Pool",
        });
    }
}
exports.ImkLiveSessionsStack = ImkLiveSessionsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1rLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2ltay1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBa0M7QUFFbEMsbUVBQW9EO0FBQ3BELCtEQUFnRDtBQUNoRCx5RUFBMEQ7QUFDMUQsa0dBQW1GO0FBQ25GLGdHQUFpRjtBQUNqRixpRUFBa0Q7QUFDbEQseURBQTBDO0FBQzFDLDJEQUE0QztBQUM1Qyx1REFBd0M7QUFDeEMsdUVBQXdEO0FBQ3hELDRFQUE2RDtBQUM3RCxxRUFBOEQ7QUFDOUQsMkNBQTRCO0FBRTVCLE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QiwrREFBK0Q7UUFDL0QseUNBQXlDO1FBQ3pDLCtEQUErRDtRQUMvRCw0REFBNEQ7UUFDNUQsOERBQThEO1FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDakUsU0FBUyxFQUFFLHlCQUF5QjtZQUNwQyxZQUFZLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUN0QztZQUNELFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLHVCQUF1QjtZQUNqRSxtQkFBbUIsRUFBRSxLQUFLLEVBQUUscUJBQXFCO1lBQ2pELG1CQUFtQixFQUFFLEtBQUssRUFBRSwyQkFBMkI7U0FDMUQsQ0FBQyxDQUFBO1FBRUYsNERBQTREO1FBQzVELGFBQWEsQ0FB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QyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxXQUFXLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFO1lBQzlELFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsVUFBVSxFQUFFLGtCQUFrQjtTQUNqQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3ZDLEtBQUssRUFBRSxhQUFhLENBQUMsVUFBVTtZQUMvQixXQUFXLEVBQUUsK0NBQStDO1lBQzVELFVBQVUsRUFBRSxvQkFBb0I7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCO1lBQzNDLFdBQVcsRUFBRSwrQ0FBK0M7WUFDNUQsVUFBVSxFQUFFLDBCQUEwQjtTQUN6QyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNsQixXQUFXLEVBQUUsa0NBQWtDO1NBQ2xELENBQUMsQ0FBQTtJQUNOLENBQUM7Q0FDSjtBQXZtQkQsb0RBdW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIlxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIlxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIlxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2MlwiXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5SW50ZWdyYXRpb25zIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9uc1wiXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5QXV0aG9yaXplcnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnNcIlxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIlxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCJcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIlxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnRcIlxuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2luc1wiXG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqc1wiXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCJcblxuZXhwb3J0IGNsYXNzIElta0xpdmVTZXNzaW9uc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpXG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIER5bmFtb0RCIFRhYmxlIGZvciBJbml0aWF0aXZlIFNlc3Npb25zXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBVc2luZyBQQVlfUEVSX1JFUVVFU1QgYmlsbGluZyA9IG9ubHkgcGF5IGZvciB3aGF0IHlvdSB1c2VcbiAgICAgICAgLy8gVFRMIGVuYWJsZWQgPSBhdXRvbWF0aWMgY2xlYW51cCBvZiBleHBpcmVkIHNlc3Npb25zIChGUkVFISlcbiAgICAgICAgY29uc3Qgc2Vzc2lvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBcIkluaXRpYXRpdmVTZXNzaW9uc1wiLCB7XG4gICAgICAgICAgICB0YWJsZU5hbWU6IFwiaW1rLWluaXRpYXRpdmUtc2Vzc2lvbnNcIixcbiAgICAgICAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICAgICAgICAgIG5hbWU6IFwiaWRcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRWFzeSBjbGVhbnVwIGZvciBkZXZcbiAgICAgICAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6IFwidHRsXCIsIC8vIEF1dG9tYXRpYyBjbGVhbnVwIVxuICAgICAgICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZmFsc2UsIC8vIERpc2FibGUgZm9yIGNvc3Qgc2F2aW5nc1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEdTSSBmb3IgbGlzdGluZyBhY3RpdmUgc2Vzc2lvbnMgKGlmIG5lZWRlZCBpbiB0aGUgZnV0dXJlKVxuICAgICAgICBzZXNzaW9uc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgICAgICAgIGluZGV4TmFtZTogXCJhY3RpdmUtc2Vzc2lvbnNcIixcbiAgICAgICAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICAgICAgICAgIG5hbWU6IFwiaXNBY3RpdmVcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzb3J0S2V5OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJjcmVhdGVkQXRcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBXZWJTb2NrZXQgQ29ubmVjdGlvbnMgVGFibGVcbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIFRyYWNrcyB3aGljaCBXZWJTb2NrZXQgY29ubmVjdGlvbnMgYXJlIHN1YnNjcmliZWQgdG8gd2hpY2ggc2Vzc2lvbnNcbiAgICAgICAgY29uc3QgY29ubmVjdGlvbnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZShcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBcIldlYlNvY2tldENvbm5lY3Rpb25zXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdGFibGVOYW1lOiBcImltay13ZWJzb2NrZXQtY29ubmVjdGlvbnNcIixcbiAgICAgICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjb25uZWN0aW9uSWRcIixcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgICAgICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogXCJ0dGxcIiwgLy8gQXV0by1jbGVhbnVwIHN0YWxlIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICB9LFxuICAgICAgICApXG5cbiAgICAgICAgLy8gR1NJIHRvIGZpbmQgYWxsIGNvbm5lY3Rpb25zIGZvciBhIHNlc3Npb25cbiAgICAgICAgY29ubmVjdGlvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgICAgICBpbmRleE5hbWU6IFwic2Vzc2lvbi1jb25uZWN0aW9uc1wiLFxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJzZXNzaW9uSWRcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBEeW5hbW9EQiBUYWJsZSBmb3IgQ2FyZHMgKFBvd2VycyArIE1vbnN0ZXJzKVxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gUGFydGl0aW9uIGJ5IGRlY2sgZm9yIGVmZmljaWVudCBcImdldCBhbGwgY2FyZHMgaW4gZGVja1wiIHF1ZXJpZXNcbiAgICAgICAgLy8gU29ydCBieSBuYW1lIGZvciB1bmlxdWUgaWRlbnRpZmljYXRpb24gd2l0aGluIGVhY2ggZGVja1xuICAgICAgICAvLyBUeXBlIGZpZWxkIGRpc3Rpbmd1aXNoZXMgYmV0d2VlbiBcInBvd2VyXCIgYW5kIFwibW9uc3RlclwiIGNhcmRzXG4gICAgICAgIGNvbnN0IGNhcmRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgXCJDYXJkc1RhYmxlXCIsIHtcbiAgICAgICAgICAgIHRhYmxlTmFtZTogXCJpbWstY2FyZHNcIixcbiAgICAgICAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICAgICAgICAgIG5hbWU6IFwiZGVja1wiLFxuICAgICAgICAgICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm5hbWVcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGZhbHNlLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEdTSSBmb3IgcXVlcnlpbmcgYnkgdHlwZSAocG93ZXIgdnMgbW9uc3RlcilcbiAgICAgICAgY2FyZHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgICAgICBpbmRleE5hbWU6IFwidHlwZS1pbmRleFwiLFxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJ0eXBlXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc29ydEtleToge1xuICAgICAgICAgICAgICAgIG5hbWU6IFwibmFtZVwiLFxuICAgICAgICAgICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gR1NJIGZvciBxdWVyeWluZyBwb3dlcnMgYnkgcmFyaXR5XG4gICAgICAgIGNhcmRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgICAgICAgaW5kZXhOYW1lOiBcInJhcml0eS1pbmRleFwiLFxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJyYXJpdHlcIixcbiAgICAgICAgICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzb3J0S2V5OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJuYW1lXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gUzMgQnVja2V0IGZvciBDYXJkIEFydHdvcmtcbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIFN0cnVjdHVyZTpcbiAgICAgICAgLy8gICBjYXJkcy97ZGVja30ve2NhcmROYW1lfS5wbmcgLSBJbmRpdmlkdWFsIGNhcmQgYXJ0XG4gICAgICAgIC8vICAgYmFja3Mve2RlY2t9LnBuZyAtIERlY2sgYmFjayBhcnR3b3JrXG4gICAgICAgIC8vICAgcGxhY2Vob2xkZXIucG5nIC0gRGVmYXVsdCBmYWxsYmFjayBpbWFnZVxuICAgICAgICBjb25zdCBhcnR3b3JrQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIkNhcmRBcnR3b3JrQnVja2V0XCIsIHtcbiAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGBpbWstY2FyZC1hcnR3b3JrLSR7dGhpcy5hY2NvdW50fWAsXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sIC8vIEtlZXAgYXJ0d29yayBvbiBzdGFjayBkZWxldGlvblxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCwgLy8gQ2xvdWRGcm9udCBvbmx5XG4gICAgICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICAgICAgICBjb3JzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCwgczMuSHR0cE1ldGhvZHMuUFVUXSxcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFtcIipcIl0sXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBhcnR3b3JrIENETlxuICAgICAgICAvLyBSZXNwb25zZUhlYWRlcnNQb2xpY3kgdG8gYWRkIENPUlMgaGVhZGVycyBmb3IgY2FudmFzIHVzYWdlXG4gICAgICAgIGNvbnN0IGNvcnNIZWFkZXJzUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuUmVzcG9uc2VIZWFkZXJzUG9saWN5KFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIFwiQXJ0d29ya0NvcnNQb2xpY3lcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3lOYW1lOiBcImltay1hcnR3b3JrLWNvcnNcIixcbiAgICAgICAgICAgICAgICBjb3JzQmVoYXZpb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjZXNzQ29udHJvbEFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICAgICAgICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dNZXRob2RzOiBbXCJHRVRcIl0sXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc0NvbnRyb2xBbGxvd09yaWdpbnM6IFtcIipcIl0sXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc0NvbnRyb2xNYXhBZ2U6IGNkay5EdXJhdGlvbi5kYXlzKDEpLFxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5PdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgKVxuXG4gICAgICAgIGNvbnN0IGFydHdvcmtEaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24oXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgXCJBcnR3b3JrRGlzdHJpYnV0aW9uXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbjogb3JpZ2lucy5TM0J1Y2tldE9yaWdpbi53aXRoT3JpZ2luQWNjZXNzQ29udHJvbChcbiAgICAgICAgICAgICAgICAgICAgICAgIGFydHdvcmtCdWNrZXQsXG4gICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OlxuICAgICAgICAgICAgICAgICAgICAgICAgY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogY29yc0hlYWRlcnNQb2xpY3ksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBFcnJvciBwYWdlIGZvciBtaXNzaW5nIGltYWdlcyAoc2VydmVzIHBsYWNlaG9sZGVyKVxuICAgICAgICAgICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogXCIvcGxhY2Vob2xkZXIucG5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiBcIi9wbGFjZWhvbGRlci5wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICApXG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIExhbWJkYSBGdW5jdGlvbnMgZm9yIFJFU1QgQVBJXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICBjb25zdCBzZXNzaW9uc0hhbmRsZXIgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgXCJTZXNzaW9uc0hhbmRsZXJcIiwge1xuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImltay1zZXNzaW9ucy1oYW5kbGVyXCIsXG4gICAgICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGEvc2Vzc2lvbnMudHNcIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCwgLy8gQ2hlYXBlciFcbiAgICAgICAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgU0VTU0lPTlNfVEFCTEU6IHNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgIENPTk5FQ1RJT05TX1RBQkxFOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgICAgICBOT0RFX09QVElPTlM6IFwiLS1lbmFibGUtc291cmNlLW1hcHNcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSywgLy8gQ29zdCBzYXZpbmdzXG4gICAgICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgICAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEdyYW50IER5bmFtb0RCIHBlcm1pc3Npb25zXG4gICAgICAgIHNlc3Npb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHNlc3Npb25zSGFuZGxlcilcbiAgICAgICAgY29ubmVjdGlvbnNUYWJsZS5ncmFudFJlYWREYXRhKHNlc3Npb25zSGFuZGxlcilcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gQ2FyZHMgTGFtYmRhIEhhbmRsZXIgKENSVUQgZm9yIHBvd2VycyArIG1vbnN0ZXJzKVxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgY29uc3QgY2FyZHNIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsIFwiQ2FyZHNIYW5kbGVyXCIsIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogXCJpbWstY2FyZHMtaGFuZGxlclwiLFxuICAgICAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhL2NhcmRzLnRzXCIpLFxuICAgICAgICAgICAgaGFuZGxlcjogXCJoYW5kbGVyXCIsXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgICAgICAgIGFyY2hpdGVjdHVyZTogbGFtYmRhLkFyY2hpdGVjdHVyZS5BUk1fNjQsXG4gICAgICAgICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIENBUkRTX1RBQkxFOiBjYXJkc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgICAgICBOT0RFX09QVElPTlM6IFwiLS1lbmFibGUtc291cmNlLW1hcHNcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgICAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgICAgICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgICAgICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnMgZm9yIGNhcmRzXG4gICAgICAgIGNhcmRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNhcmRzSGFuZGxlcilcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gQWRtaW4gTGFtYmRhIChEZWNrIENSVUQgKyBTMyBQcmVzaWduZWQgVXBsb2FkIFVSTHMpXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICBjb25zdCBhZG1pbkhhbmRsZXIgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgXCJBZG1pbkhhbmRsZXJcIiwge1xuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImltay1hZG1pbi1oYW5kbGVyXCIsXG4gICAgICAgICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuLi9sYW1iZGEvYWRtaW4udHNcIiksXG4gICAgICAgICAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCxcbiAgICAgICAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDE1KSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgQ0FSRFNfVEFCTEU6IGNhcmRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgIEFSVFdPUktfQlVDS0VUOiBhcnR3b3JrQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICAgICAgQVJUV09SS19DRE5fVVJMOiBgaHR0cHM6Ly8ke2FydHdvcmtEaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxuICAgICAgICAgICAgICAgIE5PREVfT1BUSU9OUzogXCItLWVuYWJsZS1zb3VyY2UtbWFwc1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4dGVybmFsTW9kdWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KVxuXG4gICAgICAgIGNhcmRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFkbWluSGFuZGxlcilcbiAgICAgICAgYXJ0d29ya0J1Y2tldC5ncmFudFB1dChhZG1pbkhhbmRsZXIpXG4gICAgICAgIGFydHdvcmtCdWNrZXQuZ3JhbnRSZWFkKGFkbWluSGFuZGxlcilcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gQ29nbml0byBVc2VyIFBvb2wgZm9yIEFkbWluIEF1dGhlbnRpY2F0aW9uXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICBjb25zdCBhZG1pblVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgXCJBZG1pblVzZXJQb29sXCIsIHtcbiAgICAgICAgICAgIHVzZXJQb29sTmFtZTogXCJpbWstYWRtaW4tcG9vbFwiLFxuICAgICAgICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgc2lnbkluQWxpYXNlczogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxuICAgICAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbWFpbDogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIH0pXG5cbiAgICAgICAgY29uc3QgYWRtaW5Vc2VyUG9vbENsaWVudCA9IGFkbWluVXNlclBvb2wuYWRkQ2xpZW50KFwiQWRtaW5XZWJDbGllbnRcIiwge1xuICAgICAgICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgICAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxuICAgICAgICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDgpLFxuICAgICAgICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoOCksXG4gICAgICAgICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIENyZWF0ZSBhZG1pbiB1c2VycyAoc2VuZHMgaW52aXRhdGlvbiBlbWFpbCB3aXRoIHRlbXBvcmFyeSBwYXNzd29yZClcbiAgICAgICAgbmV3IGNvZ25pdG8uQ2ZuVXNlclBvb2xVc2VyKHRoaXMsIFwiQWRtaW5Vc2VyMVwiLCB7XG4gICAgICAgICAgICB1c2VyUG9vbElkOiBhZG1pblVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgICAgICB1c2VybmFtZTogXCJiZWNvbWluZ2FyaWFAZ21haWwuY29tXCIsXG4gICAgICAgICAgICB1c2VyQXR0cmlidXRlczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogXCJlbWFpbFwiLCB2YWx1ZTogXCJiZWNvbWluZ2FyaWFAZ21haWwuY29tXCIgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6IFwiZW1haWxfdmVyaWZpZWRcIiwgdmFsdWU6IFwidHJ1ZVwiIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZGVzaXJlZERlbGl2ZXJ5TWVkaXVtczogW1wiRU1BSUxcIl0sXG4gICAgICAgIH0pXG5cbiAgICAgICAgbmV3IGNvZ25pdG8uQ2ZuVXNlclBvb2xVc2VyKHRoaXMsIFwiQWRtaW5Vc2VyMlwiLCB7XG4gICAgICAgICAgICB1c2VyUG9vbElkOiBhZG1pblVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICAgICAgICB1c2VybmFtZTogXCJrYXQuaGFsbG9Ab3V0bG9vay5jb21cIixcbiAgICAgICAgICAgIHVzZXJBdHRyaWJ1dGVzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBcImVtYWlsXCIsIHZhbHVlOiBcImthdC5oYWxsb0BvdXRsb29rLmNvbVwiIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBcImVtYWlsX3ZlcmlmaWVkXCIsIHZhbHVlOiBcInRydWVcIiB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGRlc2lyZWREZWxpdmVyeU1lZGl1bXM6IFtcIkVNQUlMXCJdLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEpXVCBBdXRob3JpemVyIOKAlCBwcm90ZWN0cyBhbGwgL2FkbWluLyogcm91dGVzIGFuZCBjYXJkIHdyaXRlIHJvdXRlc1xuICAgICAgICBjb25zdCBhZG1pbkF1dGhvcml6ZXIgPVxuICAgICAgICAgICAgbmV3IGFwaWdhdGV3YXlBdXRob3JpemVycy5IdHRwVXNlclBvb2xBdXRob3JpemVyKFxuICAgICAgICAgICAgICAgIFwiQWRtaW5BdXRob3JpemVyXCIsXG4gICAgICAgICAgICAgICAgYWRtaW5Vc2VyUG9vbCxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50czogW2FkbWluVXNlclBvb2xDbGllbnRdLFxuICAgICAgICAgICAgICAgICAgICBpZGVudGl0eVNvdXJjZTogW1wiJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb25cIl0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIClcbiAgICAgICAgLy8gSFRUUCBBUEkgKFJFU1QgZW5kcG9pbnRzKVxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgXCJTZXNzaW9uc0h0dHBBcGlcIiwge1xuICAgICAgICAgICAgYXBpTmFtZTogXCJpbWstc2Vzc2lvbnMtYXBpXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJJIE11c3QgS2lsbCAtIEluaXRpYXRpdmUgU2Vzc2lvbiBNYW5hZ2VtZW50IEFQSVwiLFxuICAgICAgICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICAgICAgICAgIGFsbG93T3JpZ2luczogW1wiKlwiXSwgLy8gQ29uZmlndXJlIGZvciB5b3VyIGRvbWFpbiBpbiBwcm9kdWN0aW9uXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBbXG4gICAgICAgICAgICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxuICAgICAgICAgICAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxuICAgICAgICAgICAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgICAgICAgICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5PUFRJT05TLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbXCJDb250ZW50LVR5cGVcIiwgXCJBdXRob3JpemF0aW9uXCJdLFxuICAgICAgICAgICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSlcblxuICAgICAgICBjb25zdCBzZXNzaW9uc0ludGVncmF0aW9uID1cbiAgICAgICAgICAgIG5ldyBhcGlnYXRld2F5SW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICAgICAgICAgICBcIlNlc3Npb25zSW50ZWdyYXRpb25cIixcbiAgICAgICAgICAgICAgICBzZXNzaW9uc0hhbmRsZXIsXG4gICAgICAgICAgICApXG5cbiAgICAgICAgLy8gUkVTVCBlbmRwb2ludHNcbiAgICAgICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgICAgICAgcGF0aDogXCIvc2Vzc2lvbnNcIixcbiAgICAgICAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogc2Vzc2lvbnNJbnRlZ3JhdGlvbixcbiAgICAgICAgfSlcblxuICAgICAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICAgICAgICBwYXRoOiBcIi9zZXNzaW9ucy97c2Vzc2lvbklkfVwiLFxuICAgICAgICAgICAgbWV0aG9kczogW1xuICAgICAgICAgICAgICAgIGFwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgICAgICAgICAgYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVCxcbiAgICAgICAgICAgICAgICBhcGlnYXRld2F5Lkh0dHBNZXRob2QuREVMRVRFLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiBzZXNzaW9uc0ludGVncmF0aW9uLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIENhcmRzIEFQSSBlbmRwb2ludHMgKHBvd2VycyArIG1vbnN0ZXJzKVxuICAgICAgICBjb25zdCBjYXJkc0ludGVncmF0aW9uID1cbiAgICAgICAgICAgIG5ldyBhcGlnYXRld2F5SW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICAgICAgICAgICBcIkNhcmRzSW50ZWdyYXRpb25cIixcbiAgICAgICAgICAgICAgICBjYXJkc0hhbmRsZXIsXG4gICAgICAgICAgICApXG5cbiAgICAgICAgY29uc3QgYWRtaW5JbnRlZ3JhdGlvbiA9XG4gICAgICAgICAgICBuZXcgYXBpZ2F0ZXdheUludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgICAgICAgXCJBZG1pbkludGVncmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgYWRtaW5IYW5kbGVyLFxuICAgICAgICAgICAgKVxuXG4gICAgICAgIC8vIOKUgOKUgCBQdWJsaWMgY2FyZCByZWFkcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICAgICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgICAgICAgcGF0aDogXCIvY2FyZHNcIixcbiAgICAgICAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiBjYXJkc0ludGVncmF0aW9uLFxuICAgICAgICB9KVxuXG4gICAgICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgICAgICAgIHBhdGg6IFwiL2NhcmRzL3tkZWNrfS97bmFtZX1cIixcbiAgICAgICAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiBjYXJkc0ludGVncmF0aW9uLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIOKUgOKUgCBQcm90ZWN0ZWQgY2FyZCB3cml0ZXMgKHJlcXVpcmUgQ29nbml0byBhdXRoKSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICAgICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgICAgICAgcGF0aDogXCIvY2FyZHNcIixcbiAgICAgICAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogY2FyZHNJbnRlZ3JhdGlvbixcbiAgICAgICAgICAgIGF1dGhvcml6ZXI6IGFkbWluQXV0aG9yaXplcixcbiAgICAgICAgfSlcblxuICAgICAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICAgICAgICBwYXRoOiBcIi9jYXJkcy97ZGVja30ve25hbWV9XCIsXG4gICAgICAgICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVCwgYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkRFTEVURV0sXG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogY2FyZHNJbnRlZ3JhdGlvbixcbiAgICAgICAgICAgIGF1dGhvcml6ZXI6IGFkbWluQXV0aG9yaXplcixcbiAgICAgICAgfSlcblxuICAgICAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICAgICAgICBwYXRoOiBcIi9jYXJkcy9iYXRjaFwiLFxuICAgICAgICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgICAgICAgIGludGVncmF0aW9uOiBjYXJkc0ludGVncmF0aW9uLFxuICAgICAgICAgICAgYXV0aG9yaXplcjogYWRtaW5BdXRob3JpemVyLFxuICAgICAgICB9KVxuXG4gICAgICAgIC8vIOKUgOKUgCBBZG1pbiByb3V0ZXMgKGRlY2sgbWFuYWdlbWVudCArIGltYWdlIHVwbG9hZCkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgICAgICAgIHBhdGg6IFwiL2FkbWluL2RlY2tzXCIsXG4gICAgICAgICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVCwgYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgICAgICAgaW50ZWdyYXRpb246IGFkbWluSW50ZWdyYXRpb24sXG4gICAgICAgICAgICBhdXRob3JpemVyOiBhZG1pbkF1dGhvcml6ZXIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgICAgICAgcGF0aDogXCIvYWRtaW4vZGVja3Mve2RlY2t9XCIsXG4gICAgICAgICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVCwgYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkRFTEVURV0sXG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogYWRtaW5JbnRlZ3JhdGlvbixcbiAgICAgICAgICAgIGF1dGhvcml6ZXI6IGFkbWluQXV0aG9yaXplcixcbiAgICAgICAgfSlcblxuICAgICAgICBodHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICAgICAgICBwYXRoOiBcIi9hZG1pbi91cGxvYWQtdXJsXCIsXG4gICAgICAgICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgICAgICAgaW50ZWdyYXRpb246IGFkbWluSW50ZWdyYXRpb24sXG4gICAgICAgICAgICBhdXRob3JpemVyOiBhZG1pbkF1dGhvcml6ZXIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIFdlYlNvY2tldCBBUEkgKFJlYWwtdGltZSB1cGRhdGVzKVxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgY29uc3Qgd2ViU29ja2V0SGFuZGxlciA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCBcIldlYlNvY2tldEhhbmRsZXJcIiwge1xuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImltay13ZWJzb2NrZXQtaGFuZGxlclwiLFxuICAgICAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi4vbGFtYmRhL3dlYnNvY2tldC50c1wiKSxcbiAgICAgICAgICAgIGhhbmRsZXI6IFwiaGFuZGxlclwiLFxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICAgICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LFxuICAgICAgICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICBTRVNTSU9OU19UQUJMRTogc2Vzc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgICAgIE5PREVfT1BUSU9OUzogXCItLWVuYWJsZS1zb3VyY2UtbWFwc1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xuICAgICAgICBzZXNzaW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh3ZWJTb2NrZXRIYW5kbGVyKVxuICAgICAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh3ZWJTb2NrZXRIYW5kbGVyKVxuXG4gICAgICAgIGNvbnN0IHdlYlNvY2tldEFwaSA9IG5ldyBhcGlnYXRld2F5LldlYlNvY2tldEFwaShcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBcIlNlc3Npb25zV2ViU29ja2V0QXBpXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXBpTmFtZTogXCJpbWstc2Vzc2lvbnMtd2Vic29ja2V0XCIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSSBNdXN0IEtpbGwgLSBSZWFsLXRpbWUgU2Vzc2lvbiBVcGRhdGVzXCIsXG4gICAgICAgICAgICAgICAgY29ubmVjdFJvdXRlT3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICBpbnRlZ3JhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBhcGlnYXRld2F5SW50ZWdyYXRpb25zLldlYlNvY2tldExhbWJkYUludGVncmF0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29ubmVjdEludGVncmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2ViU29ja2V0SGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkaXNjb25uZWN0Um91dGVPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIGludGVncmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IGFwaWdhdGV3YXlJbnRlZ3JhdGlvbnMuV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJEaXNjb25uZWN0SW50ZWdyYXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3ZWJTb2NrZXRIYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRSb3V0ZU9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZWdyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgYXBpZ2F0ZXdheUludGVncmF0aW9ucy5XZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkRlZmF1bHRJbnRlZ3JhdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdlYlNvY2tldEhhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICApXG5cbiAgICAgICAgLy8gQWRkIGN1c3RvbSByb3V0ZXMgZm9yIHNlc3Npb24gbWFuYWdlbWVudFxuICAgICAgICB3ZWJTb2NrZXRBcGkuYWRkUm91dGUoXCJzdWJzY3JpYmVcIiwge1xuICAgICAgICAgICAgaW50ZWdyYXRpb246IG5ldyBhcGlnYXRld2F5SW50ZWdyYXRpb25zLldlYlNvY2tldExhbWJkYUludGVncmF0aW9uKFxuICAgICAgICAgICAgICAgIFwiU3Vic2NyaWJlSW50ZWdyYXRpb25cIixcbiAgICAgICAgICAgICAgICB3ZWJTb2NrZXRIYW5kbGVyLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgfSlcblxuICAgICAgICB3ZWJTb2NrZXRBcGkuYWRkUm91dGUoXCJ1bnN1YnNjcmliZVwiLCB7XG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IGFwaWdhdGV3YXlJbnRlZ3JhdGlvbnMuV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgICAgICAgXCJVbnN1YnNjcmliZUludGVncmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgd2ViU29ja2V0SGFuZGxlcixcbiAgICAgICAgICAgICksXG4gICAgICAgIH0pXG5cbiAgICAgICAgd2ViU29ja2V0QXBpLmFkZFJvdXRlKFwicGluZ1wiLCB7XG4gICAgICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IGFwaWdhdGV3YXlJbnRlZ3JhdGlvbnMuV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgICAgICAgXCJQaW5nSW50ZWdyYXRpb25cIixcbiAgICAgICAgICAgICAgICB3ZWJTb2NrZXRIYW5kbGVyLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBXZWJTb2NrZXQgc3RhZ2VcbiAgICAgICAgY29uc3Qgd2ViU29ja2V0U3RhZ2UgPSBuZXcgYXBpZ2F0ZXdheS5XZWJTb2NrZXRTdGFnZShcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBcIldlYlNvY2tldFN0YWdlXCIsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd2ViU29ja2V0QXBpLFxuICAgICAgICAgICAgICAgIHN0YWdlTmFtZTogXCJsaXZlXCIsXG4gICAgICAgICAgICAgICAgYXV0b0RlcGxveTogdHJ1ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIClcblxuICAgICAgICAvLyBHcmFudCBXZWJTb2NrZXQgbWFuYWdlbWVudCBwZXJtaXNzaW9ucyB0byB0aGUgaGFuZGxlclxuICAgICAgICB3ZWJTb2NrZXRIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJleGVjdXRlLWFwaTpNYW5hZ2VDb25uZWN0aW9uc1wiXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6ZXhlY3V0ZS1hcGk6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OiR7d2ViU29ja2V0QXBpLmFwaUlkfS8qYCxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgIClcblxuICAgICAgICAvLyBBbHNvIGdyYW50IHRvIHNlc3Npb25zIGhhbmRsZXIgKGZvciBicm9hZGNhc3RpbmcgdXBkYXRlcylcbiAgICAgICAgc2Vzc2lvbnNIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJleGVjdXRlLWFwaTpNYW5hZ2VDb25uZWN0aW9uc1wiXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgYGFybjphd3M6ZXhlY3V0ZS1hcGk6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OiR7d2ViU29ja2V0QXBpLmFwaUlkfS8qYCxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgIClcblxuICAgICAgICAvLyBBZGQgV2ViU29ja2V0IGVuZHBvaW50IHRvIHNlc3Npb25zIGhhbmRsZXIgZW52aXJvbm1lbnRcbiAgICAgICAgc2Vzc2lvbnNIYW5kbGVyLmFkZEVudmlyb25tZW50KFxuICAgICAgICAgICAgXCJXRUJTT0NLRVRfRU5EUE9JTlRcIixcbiAgICAgICAgICAgIGAke3dlYlNvY2tldEFwaS5hcGlJZH0uZXhlY3V0ZS1hcGkuJHt0aGlzLnJlZ2lvbn0uYW1hem9uYXdzLmNvbS8ke3dlYlNvY2tldFN0YWdlLnN0YWdlTmFtZX1gLFxuICAgICAgICApXG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIE91dHB1dHNcbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiSHR0cEFwaVVybFwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogaHR0cEFwaS51cmwgfHwgXCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkhUVFAgQVBJIFVSTCBmb3Igc2Vzc2lvbiBtYW5hZ2VtZW50XCIsXG4gICAgICAgICAgICBleHBvcnROYW1lOiBcIklta0h0dHBBcGlVcmxcIixcbiAgICAgICAgfSlcblxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIldlYlNvY2tldFVybFwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogd2ViU29ja2V0U3RhZ2UudXJsLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiV2ViU29ja2V0IFVSTCBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcIixcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IFwiSW1rV2ViU29ja2V0VXJsXCIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJTZXNzaW9uc1RhYmxlTmFtZVwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogc2Vzc2lvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJEeW5hbW9EQiB0YWJsZSBuYW1lIGZvciBzZXNzaW9uc1wiLFxuICAgICAgICB9KVxuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQ29ubmVjdGlvbnNUYWJsZU5hbWVcIiwge1xuICAgICAgICAgICAgdmFsdWU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRHluYW1vREIgdGFibGUgbmFtZSBmb3IgV2ViU29ja2V0IGNvbm5lY3Rpb25zXCIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJDYXJkc1RhYmxlTmFtZVwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogY2FyZHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJEeW5hbW9EQiB0YWJsZSBuYW1lIGZvciBjYXJkcyAocG93ZXJzICsgbW9uc3RlcnMpXCIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJBcnR3b3JrQnVja2V0TmFtZVwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogYXJ0d29ya0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUzMgYnVja2V0IGZvciBjYXJkIGFydHdvcmtcIixcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IFwiSW1rQXJ0d29ya0J1Y2tldFwiLFxuICAgICAgICB9KVxuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQXJ0d29ya0NkblVybFwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogYGh0dHBzOi8vJHthcnR3b3JrRGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNsb3VkRnJvbnQgQ0ROIFVSTCBmb3IgY2FyZCBhcnR3b3JrXCIsXG4gICAgICAgICAgICBleHBvcnROYW1lOiBcIklta0FydHdvcmtDZG5VcmxcIixcbiAgICAgICAgfSlcblxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkFkbWluVXNlclBvb2xJZFwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogYWRtaW5Vc2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29nbml0byBVc2VyIFBvb2wgSUQgZm9yIGFkbWluIGF1dGhlbnRpY2F0aW9uXCIsXG4gICAgICAgICAgICBleHBvcnROYW1lOiBcIklta0FkbWluVXNlclBvb2xJZFwiLFxuICAgICAgICB9KVxuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQWRtaW5Vc2VyUG9vbENsaWVudElkXCIsIHtcbiAgICAgICAgICAgIHZhbHVlOiBhZG1pblVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQgZm9yIGFkbWluIHdlYiBhcHBcIixcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IFwiSW1rQWRtaW5Vc2VyUG9vbENsaWVudElkXCIsXG4gICAgICAgIH0pXG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJBZG1pblVzZXJQb29sUmVnaW9uXCIsIHtcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLnJlZ2lvbixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkFXUyBSZWdpb24gZm9yIENvZ25pdG8gVXNlciBQb29sXCIsXG4gICAgICAgIH0pXG4gICAgfVxufVxuIl19