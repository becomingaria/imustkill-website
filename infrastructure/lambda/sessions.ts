/**
 * Lambda handler for Initiative Session CRUD operations
 *
 * Endpoints:
 * - POST /sessions - Create a new session
 * - GET /sessions/{sessionId} - Get session data
 * - PUT /sessions/{sessionId} - Update session data
 * - DELETE /sessions/{sessionId} - Delete/deactivate session
 */

import {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    QueryCommand,
} from "@aws-sdk/client-dynamodb"
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const dynamodb = new DynamoDBClient({})
const SESSIONS_TABLE = process.env.SESSIONS_TABLE!
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT

// Initialize API Gateway Management client for sending WebSocket messages
const getApiGatewayClient = () => {
    if (!WEBSOCKET_ENDPOINT) return null
    return new ApiGatewayManagementApiClient({
        endpoint: `https://${WEBSOCKET_ENDPOINT}`,
    })
}

interface APIGatewayProxyEvent {
    httpMethod: string
    path: string
    pathParameters?: { sessionId?: string }
    body?: string
    requestContext: {
        http: {
            method: string
            path: string
        }
    }
}

interface APIGatewayProxyResult {
    statusCode: number
    headers: Record<string, string>
    body: string
}

// CORS headers for all responses
const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

// Generate a unique session ID
const generateSessionId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

// Calculate TTL (DynamoDB will automatically delete expired items)
const calculateTtl = (expiresInMinutes: number): number => {
    return Math.floor(Date.now() / 1000) + expiresInMinutes * 60
}

// Broadcast update to all WebSocket connections for a session
const broadcastToSession = async (sessionId: string, data: any) => {
    const client = getApiGatewayClient()
    if (!client) return

    try {
        // Get all connections for this session
        const result = await dynamodb.send(
            new QueryCommand({
                TableName: CONNECTIONS_TABLE,
                IndexName: "session-connections",
                KeyConditionExpression: "sessionId = :sid",
                ExpressionAttributeValues: marshall({ ":sid": sessionId }),
            }),
        )

        if (!result.Items?.length) return

        const message = JSON.stringify({
            type: "session_update",
            data,
        })

        // Send to all connections (in parallel)
        const sendPromises = result.Items.map(
            async (item: Record<string, any>) => {
                const connection = unmarshall(item)
                try {
                    await client.send(
                        new PostToConnectionCommand({
                            ConnectionId: connection.connectionId,
                            Data: Buffer.from(message),
                        }),
                    )
                } catch (err: any) {
                    // Connection is stale, it will be cleaned up by TTL
                    console.log(
                        `Failed to send to ${connection.connectionId}:`,
                        err.message,
                    )
                }
            },
        )

        await Promise.all(sendPromises)
    } catch (err) {
        console.error("Error broadcasting to session:", err)
    }
}

// Handler functions for each operation
const createSession = async (body: string): Promise<APIGatewayProxyResult> => {
    try {
        const { combatState, expiresInMinutes = 480 } = JSON.parse(body) // Default 8 hours

        const sessionId = generateSessionId()
        const now = Date.now()
        const ttl = calculateTtl(expiresInMinutes)

        const item = {
            id: sessionId,
            combatState,
            isActive: "true", // String for GSI
            createdAt: now,
            updatedAt: now,
            ttl, // DynamoDB TTL - auto-cleanup!
        }

        await dynamodb.send(
            new PutItemCommand({
                TableName: SESSIONS_TABLE,
                Item: marshall(item),
            }),
        )

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                sessionId,
                expiresAt: new Date(ttl * 1000).toISOString(),
                message: "Session created successfully",
            }),
        }
    } catch (err) {
        console.error("Error creating session:", err)
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Failed to create session" }),
        }
    }
}

const getSession = async (
    sessionId: string,
): Promise<APIGatewayProxyResult> => {
    try {
        const result = await dynamodb.send(
            new GetItemCommand({
                TableName: SESSIONS_TABLE,
                Key: marshall({ id: sessionId }),
            }),
        )

        if (!result.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Session not found" }),
            }
        }

        const session = unmarshall(result.Item)

        // Check if TTL has passed (shouldn't happen often, but just in case)
        if (session.ttl && session.ttl < Math.floor(Date.now() / 1000)) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Session expired" }),
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                sessionId: session.id,
                combatState: session.combatState,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                expiresAt: session.ttl
                    ? new Date(session.ttl * 1000).toISOString()
                    : null,
            }),
        }
    } catch (err) {
        console.error("Error getting session:", err)
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Failed to get session" }),
        }
    }
}

const updateSession = async (
    sessionId: string,
    body: string,
): Promise<APIGatewayProxyResult> => {
    try {
        const { combatState, extendTtlMinutes } = JSON.parse(body)
        const now = Date.now()

        // Build update expression dynamically
        let updateExpression = "SET combatState = :cs, updatedAt = :now"
        const expressionValues: Record<string, any> = {
            ":cs": combatState,
            ":now": now,
        }

        // Optionally extend TTL
        if (extendTtlMinutes) {
            updateExpression += ", ttl = :ttl"
            expressionValues[":ttl"] = calculateTtl(extendTtlMinutes)
        }

        await dynamodb.send(
            new UpdateItemCommand({
                TableName: SESSIONS_TABLE,
                Key: marshall({ id: sessionId }),
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: marshall(expressionValues),
                ConditionExpression: "attribute_exists(id)", // Ensure session exists
            }),
        )

        // Broadcast update to all connected clients
        await broadcastToSession(sessionId, combatState)

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Session updated successfully",
                updatedAt: now,
            }),
        }
    } catch (err: any) {
        console.error("Error updating session:", err)

        if (err.name === "ConditionalCheckFailedException") {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Session not found" }),
            }
        }

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Failed to update session" }),
        }
    }
}

const deleteSession = async (
    sessionId: string,
): Promise<APIGatewayProxyResult> => {
    try {
        await dynamodb.send(
            new DeleteItemCommand({
                TableName: SESSIONS_TABLE,
                Key: marshall({ id: sessionId }),
            }),
        )

        // Notify all connected clients that session is closed
        const client = getApiGatewayClient()
        if (client) {
            const connectionsResult = await dynamodb.send(
                new QueryCommand({
                    TableName: CONNECTIONS_TABLE,
                    IndexName: "session-connections",
                    KeyConditionExpression: "sessionId = :sid",
                    ExpressionAttributeValues: marshall({ ":sid": sessionId }),
                }),
            )

            if (connectionsResult.Items?.length) {
                const message = JSON.stringify({
                    type: "session_closed",
                    message: "Session has been ended by the host",
                })

                await Promise.all(
                    connectionsResult.Items.map(
                        async (item: Record<string, any>) => {
                            const conn = unmarshall(item)
                            try {
                                await client.send(
                                    new PostToConnectionCommand({
                                        ConnectionId: conn.connectionId,
                                        Data: Buffer.from(message),
                                    }),
                                )
                            } catch {
                                // Ignore stale connections
                            }
                        },
                    ),
                )
            }
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Session deleted successfully" }),
        }
    } catch (err) {
        console.error("Error deleting session:", err)
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Failed to delete session" }),
        }
    }
}

// Main handler
export const handler = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    console.log("Event:", JSON.stringify(event, null, 2))

    const method = event.requestContext?.http?.method || event.httpMethod
    const path = event.requestContext?.http?.path || event.path
    const sessionId = event.pathParameters?.sessionId

    // Handle OPTIONS for CORS preflight
    if (method === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: "",
        }
    }

    // Route to appropriate handler
    if (path === "/sessions" && method === "POST") {
        return createSession(event.body || "{}")
    }

    if (path.startsWith("/sessions/") && sessionId) {
        switch (method) {
            case "GET":
                return getSession(sessionId)
            case "PUT":
                return updateSession(sessionId, event.body || "{}")
            case "DELETE":
                return deleteSession(sessionId)
        }
    }

    return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Not found" }),
    }
}
