/**
 * Lambda handler for WebSocket connections
 *
 * Routes:
 * - $connect - New WebSocket connection
 * - $disconnect - Connection closed
 * - $default - Fallback for unrouted messages
 * - subscribe - Subscribe to a session's updates
 */

import {
    DynamoDBClient,
    PutItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    QueryCommand,
    UpdateItemCommand,
} from "@aws-sdk/client-dynamodb"
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const dynamodb = new DynamoDBClient({})
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!
const SESSIONS_TABLE = process.env.SESSIONS_TABLE!

interface WebSocketEvent {
    requestContext: {
        connectionId: string
        routeKey: string
        domainName: string
        stage: string
    }
    body?: string
}

interface WebSocketResult {
    statusCode: number
    body?: string
}

// Calculate TTL for connection cleanup (2 hours - connections auto-expire)
const calculateConnectionTtl = (): number => {
    return Math.floor(Date.now() / 1000) + 7200 // 2 hours
}

// Get API Gateway Management client for sending messages
const getApiClient = (event: WebSocketEvent): ApiGatewayManagementApiClient => {
    const { domainName, stage } = event.requestContext
    return new ApiGatewayManagementApiClient({
        endpoint: `https://${domainName}/${stage}`,
    })
}

// Send a message to a specific connection
const sendToConnection = async (
    client: ApiGatewayManagementApiClient,
    connectionId: string,
    data: any,
): Promise<boolean> => {
    try {
        await client.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(data)),
            }),
        )
        return true
    } catch (err: any) {
        console.log(`Failed to send to ${connectionId}:`, err.message)
        return false
    }
}

// Handle new connection
const handleConnect = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    console.log(`New connection: ${connectionId}`)

    try {
        // Store connection (initially not subscribed to any session)
        await dynamodb.send(
            new PutItemCommand({
                TableName: CONNECTIONS_TABLE,
                Item: marshall({
                    connectionId,
                    sessionId: "UNSUBSCRIBED", // Placeholder until they subscribe
                    connectedAt: Date.now(),
                    ttl: calculateConnectionTtl(),
                }),
            }),
        )

        return { statusCode: 200 }
    } catch (err) {
        console.error("Error handling connect:", err)
        return { statusCode: 500 }
    }
}

// Handle disconnection
const handleDisconnect = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    console.log(`Disconnected: ${connectionId}`)

    try {
        // Delete the connection record
        await dynamodb.send(
            new DeleteItemCommand({
                TableName: CONNECTIONS_TABLE,
                Key: marshall({ connectionId }),
            }),
        )

        return { statusCode: 200 }
    } catch (err) {
        console.error("Error handling disconnect:", err)
        return { statusCode: 500 }
    }
}

// Handle subscribe action - client wants to receive updates for a session
const handleSubscribe = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    const client = getApiClient(event)

    try {
        const body = JSON.parse(event.body || "{}")
        const { sessionId } = body

        if (!sessionId) {
            await sendToConnection(client, connectionId, {
                type: "error",
                message: "sessionId is required",
            })
            return { statusCode: 400 }
        }

        // Verify session exists
        const sessionResult = await dynamodb.send(
            new GetItemCommand({
                TableName: SESSIONS_TABLE,
                Key: marshall({ id: sessionId }),
            }),
        )

        if (!sessionResult.Item) {
            await sendToConnection(client, connectionId, {
                type: "error",
                message: "Session not found",
            })
            return { statusCode: 404 }
        }

        const session = unmarshall(sessionResult.Item)

        // Check if session is expired
        if (session.ttl && session.ttl < Math.floor(Date.now() / 1000)) {
            await sendToConnection(client, connectionId, {
                type: "error",
                message: "Session has expired",
            })
            return { statusCode: 410 }
        }

        // Update connection to subscribe to this session
        await dynamodb.send(
            new UpdateItemCommand({
                TableName: CONNECTIONS_TABLE,
                Key: marshall({ connectionId }),
                UpdateExpression:
                    "SET sessionId = :sid, subscribedAt = :now, #ttl = :ttl",
                ExpressionAttributeNames: { "#ttl": "ttl" },
                ExpressionAttributeValues: marshall({
                    ":sid": sessionId,
                    ":now": Date.now(),
                    ":ttl": calculateConnectionTtl(),
                }),
            }),
        )

        // Send current state to the newly subscribed client
        await sendToConnection(client, connectionId, {
            type: "subscribed",
            sessionId,
            combatState: session.combatState,
            expiresAt: session.ttl
                ? new Date(session.ttl * 1000).toISOString()
                : null,
        })

        console.log(
            `Connection ${connectionId} subscribed to session ${sessionId}`,
        )
        return { statusCode: 200 }
    } catch (err) {
        console.error("Error handling subscribe:", err)
        await sendToConnection(client, connectionId, {
            type: "error",
            message: "Failed to subscribe",
        })
        return { statusCode: 500 }
    }
}

// Handle ping (for keeping connection alive)
const handlePing = async (event: WebSocketEvent): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    const client = getApiClient(event)

    // Extend connection TTL
    try {
        await dynamodb.send(
            new UpdateItemCommand({
                TableName: CONNECTIONS_TABLE,
                Key: marshall({ connectionId }),
                UpdateExpression: "SET #ttl = :ttl, lastPing = :now",
                ExpressionAttributeNames: { "#ttl": "ttl" },
                ExpressionAttributeValues: marshall({
                    ":ttl": calculateConnectionTtl(),
                    ":now": Date.now(),
                }),
            }),
        )

        await sendToConnection(client, connectionId, { type: "pong" })
        return { statusCode: 200 }
    } catch (err) {
        console.error("Error handling ping:", err)
        return { statusCode: 500 }
    }
}

// Handle unsubscribe action
const handleUnsubscribe = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    const client = getApiClient(event)

    try {
        await dynamodb.send(
            new UpdateItemCommand({
                TableName: CONNECTIONS_TABLE,
                Key: marshall({ connectionId }),
                UpdateExpression:
                    "SET sessionId = :unsub, unsubscribedAt = :now",
                ExpressionAttributeValues: marshall({
                    ":unsub": "UNSUBSCRIBED",
                    ":now": Date.now(),
                }),
            }),
        )

        await sendToConnection(client, connectionId, {
            type: "unsubscribed",
            message: "Successfully unsubscribed from session",
        })

        return { statusCode: 200 }
    } catch (err) {
        console.error("Error handling unsubscribe:", err)
        return { statusCode: 500 }
    }
}

// Default handler for unrecognized routes
const handleDefault = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    const connectionId = event.requestContext.connectionId
    const client = getApiClient(event)

    console.log(`Default route for ${connectionId}:`, event.body)

    try {
        const body = JSON.parse(event.body || "{}")
        const action = body.action

        // Route based on action in body
        switch (action) {
            case "subscribe":
                return handleSubscribe(event)
            case "unsubscribe":
                return handleUnsubscribe(event)
            case "ping":
                return handlePing(event)
            default:
                await sendToConnection(client, connectionId, {
                    type: "error",
                    message: `Unknown action: ${action}. Valid actions: subscribe, unsubscribe, ping`,
                })
                return { statusCode: 400 }
        }
    } catch (err) {
        console.error("Error in default handler:", err)
        const client = getApiClient(event)
        await sendToConnection(client, connectionId, {
            type: "error",
            message:
                "Invalid message format. Expected JSON with 'action' field.",
        })
        return { statusCode: 400 }
    }
}

// Main handler - route based on WebSocket routeKey
export const handler = async (
    event: WebSocketEvent,
): Promise<WebSocketResult> => {
    console.log("Event:", JSON.stringify(event, null, 2))

    const routeKey = event.requestContext.routeKey

    switch (routeKey) {
        case "$connect":
            return handleConnect(event)
        case "$disconnect":
            return handleDisconnect(event)
        case "subscribe":
            return handleSubscribe(event)
        case "unsubscribe":
            return handleUnsubscribe(event)
        case "ping":
            return handlePing(event)
        case "$default":
            return handleDefault(event)
        default:
            console.log(`Unknown route: ${routeKey}`)
            return { statusCode: 400 }
    }
}
