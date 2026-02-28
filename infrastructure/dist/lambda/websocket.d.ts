/**
 * Lambda handler for WebSocket connections
 *
 * Routes:
 * - $connect - New WebSocket connection
 * - $disconnect - Connection closed
 * - $default - Fallback for unrouted messages
 * - subscribe - Subscribe to a session's updates
 */
interface WebSocketEvent {
    requestContext: {
        connectionId: string;
        routeKey: string;
        domainName: string;
        stage: string;
    };
    body?: string;
}
interface WebSocketResult {
    statusCode: number;
    body?: string;
}
export declare const handler: (event: WebSocketEvent) => Promise<WebSocketResult>;
export {};
