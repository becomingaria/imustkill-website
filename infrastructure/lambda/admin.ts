import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda"
import {
    DynamoDBClient,
    PutItemCommand,
    QueryCommand,
    ScanCommand,
    BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb"
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const dynamodb = new DynamoDBClient({})
const s3 = new S3Client({})

const CARDS_TABLE = process.env.CARDS_TABLE!
const ARTWORK_BUCKET = process.env.ARTWORK_BUCKET!
const ARTWORK_CDN_URL = process.env.ARTWORK_CDN_URL || ""

// Deck metadata sentinel — every deck has one of these rows
const META_KEY = "__meta__"

// ── Response helper ─────────────────────────────────────────────────────────
const response = (
    statusCode: number,
    body: unknown,
): APIGatewayProxyResultV2 => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
})

// ── Sanitise a string into a URL-safe S3 key segment ────────────────────────
function sanitizeKey(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}

// ── List all decks: __meta__ rows first, then infer any missing ones ────────
async function listDecks(): Promise<APIGatewayProxyResultV2> {
    // 1. Get all explicitly created __meta__ rows
    const metaResult = await dynamodb.send(
        new ScanCommand({
            TableName: CARDS_TABLE,
            FilterExpression: "#n = :meta",
            ExpressionAttributeNames: { "#n": "name" },
            ExpressionAttributeValues: marshall({ ":meta": META_KEY }),
        }),
    )
    const metaDecks = (metaResult.Items || []).map((item) => unmarshall(item))
    const metaDeckIds = new Set(metaDecks.map((d: any) => d.deck))

    // 2. Scan all items (deck + type only) to find decks without meta rows
    const allResult = await dynamodb.send(
        new ScanCommand({
            TableName: CARDS_TABLE,
            ProjectionExpression: "deck, #t",
            ExpressionAttributeNames: { "#t": "type" },
        }),
    )
    const allItems = (allResult.Items || []).map((item) => unmarshall(item))

    // Infer cardType from actual card rows for unknown decks
    const inferredTypes: Record<string, string> = {}
    for (const item of allItems) {
        if (!item.deck || metaDeckIds.has(item.deck)) continue
        const t: string = item.type || ""
        if (t === "power" || t === "monster") {
            inferredTypes[item.deck] = t
        } else if (!inferredTypes[item.deck]) {
            inferredTypes[item.deck] = "power" // safe default
        }
    }

    // Build synthetic meta entries for legacy decks
    const syntheticDecks = Object.entries(inferredTypes).map(
        ([deck, cardType]) => ({
            deck,
            name: META_KEY,
            type: "deck_meta",
            displayName: deck
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            description: "",
            cardType,
        }),
    )

    return response(200, { decks: [...metaDecks, ...syntheticDecks] })
}

// ── Create or update a deck metadata row ────────────────────────────────────
async function upsertDeck(data: {
    deck: string
    displayName?: string
    description?: string
    cardType?: string
}): Promise<APIGatewayProxyResultV2> {
    const { deck, displayName, description, cardType } = data
    if (!deck) return response(400, { error: "deck is required" })

    const item = {
        deck,
        name: META_KEY,
        type: "deck_meta",
        displayName: displayName || deck,
        description: description || "",
        cardType: cardType || "power",
        updatedAt: Date.now(),
    }

    await dynamodb.send(
        new PutItemCommand({
            TableName: CARDS_TABLE,
            Item: marshall(item, { removeUndefinedValues: true }),
        }),
    )
    return response(200, { deck: item })
}

// ── Delete a deck and ALL its cards ─────────────────────────────────────────
async function deleteDeck(deck: string): Promise<APIGatewayProxyResultV2> {
    // 1. Query all items in the deck (PK = deck)
    const result = await dynamodb.send(
        new QueryCommand({
            TableName: CARDS_TABLE,
            KeyConditionExpression: "deck = :deck",
            ExpressionAttributeValues: marshall({ ":deck": deck }),
        }),
    )
    const items = result.Items || []

    if (items.length === 0) {
        return response(404, { error: "Deck not found" })
    }

    // 2. Batch delete all items (including __meta__)
    const BATCH = 25
    for (let i = 0; i < items.length; i += BATCH) {
        const chunk = items.slice(i, i + BATCH)
        await dynamodb.send(
            new BatchWriteItemCommand({
                RequestItems: {
                    [CARDS_TABLE]: chunk.map((item) => {
                        const u = unmarshall(item)
                        return {
                            DeleteRequest: {
                                Key: marshall({ deck: u.deck, name: u.name }),
                            },
                        }
                    }),
                },
            }),
        )
    }

    return response(200, {
        message: `Deck "${deck}" and all its cards deleted.`,
    })
}

// ── Generate a presigned S3 PUT URL for card artwork upload ─────────────────
async function getUploadUrl(body: {
    deck: string
    name: string
    folder?: string // "cards" | "backs"  defaults to "cards"
    contentType?: string
}): Promise<APIGatewayProxyResultV2> {
    const { deck, name, folder = "cards", contentType = "image/png" } = body
    if (!deck || !name)
        return response(400, { error: "deck and name are required" })

    const deckKey = sanitizeKey(deck)
    const nameKey = sanitizeKey(name)
    const s3Key =
        folder === "backs"
            ? `backs/${deckKey}.png`
            : `cards/${deckKey}/${nameKey}.png`

    const command = new PutObjectCommand({
        Bucket: ARTWORK_BUCKET,
        Key: s3Key,
        ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5 min TTL
    const cdnUrl = `${ARTWORK_CDN_URL}/${s3Key}`

    return response(200, { uploadUrl, cdnUrl, s3Key })
}

// ── Main handler ─────────────────────────────────────────────────────────────
export const handler = async (
    event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
    const method = event.requestContext.http.method
    const path = event.rawPath
    const pathParams = event.pathParameters || {}
    let body: Record<string, unknown> = {}

    try {
        if (event.body) body = JSON.parse(event.body)
    } catch {
        return response(400, { error: "Invalid JSON body" })
    }

    try {
        // GET /admin/decks
        if (method === "GET" && path === "/admin/decks") {
            return await listDecks()
        }

        // POST /admin/decks — create/update deck metadata
        if (method === "POST" && path === "/admin/decks") {
            return await upsertDeck(body as Parameters<typeof upsertDeck>[0])
        }

        // PUT /admin/decks/{deck} — update deck metadata
        if (method === "PUT" && pathParams.deck) {
            const deck = decodeURIComponent(pathParams.deck)
            return await upsertDeck({ ...(body as object), deck } as Parameters<
                typeof upsertDeck
            >[0])
        }

        // DELETE /admin/decks/{deck}
        if (method === "DELETE" && pathParams.deck) {
            const deck = decodeURIComponent(pathParams.deck)
            return await deleteDeck(deck)
        }

        // POST /admin/upload-url
        if (method === "POST" && path === "/admin/upload-url") {
            return await getUploadUrl(
                body as Parameters<typeof getUploadUrl>[0],
            )
        }

        return response(404, { error: "Route not found", path, method })
    } catch (err) {
        console.error("Admin handler error:", err)
        return response(500, {
            error: "Internal server error",
            details: err instanceof Error ? err.message : String(err),
        })
    }
}
