/**
 * Lambda handler for Initiative Session CRUD operations
 *
 * Endpoints:
 * - POST /sessions - Create a new session
 * - GET /sessions/{sessionId} - Get session data
 * - PUT /sessions/{sessionId} - Update session data
 * - DELETE /sessions/{sessionId} - Delete/deactivate session
 */
interface APIGatewayProxyEvent {
    httpMethod: string;
    path: string;
    pathParameters?: {
        sessionId?: string;
    };
    body?: string;
    requestContext: {
        http: {
            method: string;
            path: string;
        };
    };
}
interface APIGatewayProxyResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
export {};
