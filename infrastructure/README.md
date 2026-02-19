# I Must Kill - AWS Infrastructure

Serverless infrastructure for the Initiative Tracker live sharing feature.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│                 │     │              │     │                 │
│   React App     │────▶│  HTTP API    │────▶│  Lambda         │
│                 │     │  (sessions)  │     │  (sessions.ts)  │
└────────┬────────┘     └──────────────┘     └────────┬────────┘
         │                                            │
         │              ┌──────────────┐              │
         │              │              │              │
         └─────────────▶│ WebSocket API│─────────────▶│
                        │              │              │
                        └──────────────┘              │
                                                      │
                        ┌──────────────┐              │
                        │              │              │
                        │  DynamoDB    │◀─────────────┘
                        │  (tables)    │
                        │              │
                        └──────────────┘
```

### Components

- **HTTP API Gateway**: REST endpoints for session CRUD
- **WebSocket API Gateway**: Real-time updates for viewers
- **Lambda Functions**: Session logic (ARM64 for cost savings)
- **DynamoDB Tables**:
    - `InitiativeSessions`: Session data with TTL auto-cleanup
    - `WebSocketConnections`: Active connections with GSI for session lookup

### Cost Optimization

- **Pay-per-request billing**: No minimum costs when not in use
- **ARM64 Lambdas**: ~34% cheaper than x86
- **DynamoDB TTL**: Automatic cleanup of expired sessions (no extra cost)
- **HTTP/WebSocket APIs**: Cheaper than REST API

**Estimated monthly cost for hobby use**: $0.50 - $2.00

## Prerequisites

1. [AWS CLI](https://aws.amazon.com/cli/) installed and configured
2. [Node.js](https://nodejs.org/) 18+ installed
3. [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) installed globally:
    ```bash
    npm install -g aws-cdk
    ```

## Deployment

### 1. Install dependencies

```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (first time only)

```bash
cdk bootstrap
```

### 3. Deploy

```bash
cdk deploy
```

The deployment will output:

- `SessionsApiUrl`: HTTP API endpoint
- `WebSocketApiUrl`: WebSocket endpoint

### 4. Configure the React app

Create a `.env.local` file in the project root:

```env
REACT_APP_SESSIONS_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
REACT_APP_WEBSOCKET_API_URL=wss://xxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

Replace the URLs with the values from the CDK output.

## Usage

### API Reference

#### Create Session

```javascript
import {
    createSession,
    getSession,
    updateSession,
    subscribeToSession,
} from "../utils/awsClient"

const { sessionId, expiresAt } = await createSession(
    combatState,
    expiresInMinutes,
)
```

#### Get Session

```javascript
const session = await getSession(sessionId)
// { sessionId, combatState, createdAt, updatedAt, expiresAt }
```

#### Update Session

```javascript
await updateSession(sessionId, combatState, extendTtlMinutes)
```

#### Subscribe to Updates (Viewers)

```javascript
await subscribeToSession(
    sessionId,
    (combatState) => setCombatState(combatState), // onUpdate
    (error) => console.error(error), // onError
    (message) => alert(message), // onClose
)
```

## Development

### Useful commands

```bash
# Synthesize CloudFormation template
cdk synth

# Compare deployed stack with current state
cdk diff

# Deploy with approval
cdk deploy --require-approval=never

# Destroy infrastructure
cdk destroy
```

### Testing locally

The Lambda functions can be tested with [SAM Local](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) or by deploying to a development stage.

## Cleanup

To completely remove the infrastructure:

```bash
cdk destroy
```

This will delete all resources **except** the DynamoDB tables (set to RETAIN by default for data safety). To delete tables:

```bash
aws dynamodb delete-table --table-name ImkStack-InitiativeSessions-xxxxx
aws dynamodb delete-table --table-name ImkStack-WebSocketConnections-xxxxx
```

## Troubleshooting

### "CORS error" in browser

The Lambda handler includes CORS headers. Ensure you're using the correct API URL.

### "Session not found" immediately

Check that the session ID matches exactly. Session IDs are case-sensitive.

### WebSocket disconnects frequently

The client includes automatic reconnection. Check browser console for details.

### High costs

Review CloudWatch metrics. Ensure TTL is working (check for `ItemsDeletedByTTL` metric).
