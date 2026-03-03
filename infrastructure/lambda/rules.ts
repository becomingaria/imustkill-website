import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda"
import {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
    DeleteItemCommand,
    QueryCommand,
    ScanCommand,
    BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"

const dynamodb = new DynamoDBClient({})
const RULES_TABLE = process.env.RULES_TABLE!

// ── Response helper ───────────────────────────────────────────────────────────
const response = (
    statusCode: number,
    body: unknown,
): APIGatewayProxyResultV2 => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
})

// ── Item shape stored in DynamoDB ─────────────────────────────────────────────
interface RuleSection {
    category: string
    sectionId: string
    title: string
    order: number
    content: Record<string, unknown>
    lastUpdated: string
    updatedBy?: string
}

// ── Parse body ────────────────────────────────────────────────────────────────
function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
    try {
        return JSON.parse(event.body || "{}")
    } catch {
        return {}
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (
    event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method.toUpperCase()
    const rawPath = event.rawPath // e.g. /rules  /rules/combat-mechanics  /rules/combat-mechanics/actions

    // Strip leading /rules
    const pathSuffix = rawPath.replace(/^\/rules\/?/, "")
    const parts = pathSuffix ? pathSuffix.split("/") : []

    // OPTIONS preflight
    if (method === "OPTIONS") return response(200, {})

    try {
        // ── GET /rules ────────────────────────────────────────────────────────
        if (method === "GET" && parts.length === 0) {
            const result = await dynamodb.send(
                new ScanCommand({ TableName: RULES_TABLE }),
            )
            const items = (result.Items || []).map(
                (i) => unmarshall(i) as RuleSection,
            )
            // Group by category, sort each group by order
            const grouped: Record<string, RuleSection[]> = {}
            items.forEach((item) => {
                if (!grouped[item.category]) grouped[item.category] = []
                grouped[item.category].push(item)
            })
            Object.values(grouped).forEach((g) =>
                g.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            )
            return response(200, { grouped, items })
        }

        // ── GET /rules/{category} ─────────────────────────────────────────────
        if (method === "GET" && parts.length === 1) {
            const [category] = parts
            const result = await dynamodb.send(
                new QueryCommand({
                    TableName: RULES_TABLE,
                    KeyConditionExpression: "category = :cat",
                    ExpressionAttributeValues: marshall({ ":cat": category }),
                }),
            )
            const items = (result.Items || [])
                .map((i) => unmarshall(i) as RuleSection)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            return response(200, { category, items })
        }

        // ── GET /rules/{category}/{sectionId} ─────────────────────────────────
        if (method === "GET" && parts.length === 2) {
            const [category, sectionId] = parts
            const result = await dynamodb.send(
                new GetItemCommand({
                    TableName: RULES_TABLE,
                    Key: marshall({ category, sectionId }),
                }),
            )
            if (!result.Item)
                return response(404, { error: "Section not found" })
            return response(200, {
                item: unmarshall(result.Item) as RuleSection,
            })
        }

        // ── POST /rules/seed — bulk write from JSON body (admin only) ─────────
        if (method === "POST" && parts.length === 1 && parts[0] === "seed") {
            const body = parseBody(event)
            const sections = body.sections as RuleSection[]
            if (!Array.isArray(sections) || sections.length === 0) {
                return response(400, { error: "sections[] array required" })
            }
            const updatedBy = (body.updatedBy as string) || "admin"
            const now = new Date().toISOString()

            // DynamoDB batch write — 25 items per batch
            const chunks: RuleSection[][] = []
            for (let i = 0; i < sections.length; i += 25) {
                chunks.push(sections.slice(i, i + 25))
            }
            let written = 0
            for (const chunk of chunks) {
                await dynamodb.send(
                    new BatchWriteItemCommand({
                        RequestItems: {
                            [RULES_TABLE]: chunk.map((sec) => ({
                                PutRequest: {
                                    Item: marshall(
                                        {
                                            ...sec,
                                            lastUpdated: now,
                                            updatedBy,
                                        },
                                        { removeUndefinedValues: true },
                                    ),
                                },
                            })),
                        },
                    }),
                )
                written += chunk.length
            }
            return response(200, { message: `Seeded ${written} sections` })
        }

        // ── PUT /rules/{category}/{sectionId} — update section (admin only) ───
        if (method === "PUT" && parts.length === 2) {
            const [category, sectionId] = parts
            const body = parseBody(event)
            const updatedBy = (
                event.requestContext as unknown as Record<string, unknown>
            )?.authorizer as string | undefined

            const item: RuleSection = {
                category,
                sectionId,
                title: (body.title as string) || "",
                order: typeof body.order === "number" ? body.order : 0,
                content: (body.content as Record<string, unknown>) || {},
                lastUpdated: new Date().toISOString(),
                updatedBy: updatedBy || (body.updatedBy as string) || "admin",
            }

            await dynamodb.send(
                new PutItemCommand({
                    TableName: RULES_TABLE,
                    Item: marshall(item, { removeUndefinedValues: true }),
                }),
            )
            return response(200, { item })
        }

        // ── DELETE /rules/{category}/{sectionId} (admin only) ─────────────────
        if (method === "DELETE" && parts.length === 2) {
            const [category, sectionId] = parts
            await dynamodb.send(
                new DeleteItemCommand({
                    TableName: RULES_TABLE,
                    Key: marshall({ category, sectionId }),
                }),
            )
            return response(200, { message: "Deleted" })
        }

        return response(404, { error: "Not found" })
    } catch (err) {
        console.error("Rules handler error:", err)
        return response(500, {
            error: err instanceof Error ? err.message : "Internal server error",
        })
    }
}
