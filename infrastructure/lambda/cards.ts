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
const CARDS_TABLE = process.env.CARDS_TABLE!

// Card types
type CardType = "power" | "monster"

// Base card interface - all cards have these fields
interface BaseCard {
    deck: string
    name: string
    type: CardType
}

// Power card interface
interface PowerCard extends BaseCard {
    type: "power"
    rarity: string
    description: string
}

// Monster card interface (matches monsters.json schema)
interface MonsterCard extends BaseCard {
    type: "monster"
    Description: string
    Guise: string
    Attack: string
    Damage: string
    "Hit Points Multiplier": string
    Bloodied: string
    Buffs: string
    Crit: string
    Immunities: string
    "Special Weaknesses": string[]
    Body: string
    Agility: string
    Focus: string
    Fate: string
    Insight: string
}

type Card = PowerCard | MonsterCard

// Helper functions
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

// Create or update a card
async function createCard(card: Card): Promise<APIGatewayProxyResultV2> {
    const { deck, name, type } = card

    if (!deck || !name || !type) {
        return response(400, {
            error: "Missing required fields: deck, name, type",
        })
    }

    // Validate type-specific required fields
    if (type === "power") {
        const powerCard = card as PowerCard
        if (!powerCard.rarity || !powerCard.description) {
            return response(400, {
                error: "Power cards require: rarity, description",
            })
        }
    } else if (type === "monster") {
        const monsterCard = card as MonsterCard
        if (!monsterCard.Description || !monsterCard.Attack) {
            return response(400, {
                error: "Monster cards require: Description, Attack",
            })
        }
    }

    await dynamodb.send(
        new PutItemCommand({
            TableName: CARDS_TABLE,
            Item: marshall(
                {
                    ...card,
                    updatedAt: Date.now(),
                },
                { removeUndefinedValues: true },
            ),
        }),
    )

    return response(201, { message: "Card created", card })
}

// Get a specific card by deck and name
async function getCard(
    deck: string,
    name: string,
): Promise<APIGatewayProxyResultV2> {
    const result = await dynamodb.send(
        new GetItemCommand({
            TableName: CARDS_TABLE,
            Key: marshall({ deck, name }),
        }),
    )

    if (!result.Item) {
        return response(404, { error: "Card not found" })
    }

    return response(200, unmarshall(result.Item))
}

// Update a card
async function updateCard(
    deck: string,
    name: string,
    updates: Partial<Card>,
): Promise<APIGatewayProxyResultV2> {
    // First check if card exists
    const existing = await dynamodb.send(
        new GetItemCommand({
            TableName: CARDS_TABLE,
            Key: marshall({ deck, name }),
        }),
    )

    if (!existing.Item) {
        return response(404, { error: "Card not found" })
    }

    const currentCard = unmarshall(existing.Item) as Card

    // Merge updates (can't change deck, name, or type)
    const updatedCard = {
        ...currentCard,
        ...updates,
        deck,
        name,
        type: currentCard.type, // Preserve original type
        updatedAt: Date.now(),
    }

    await dynamodb.send(
        new PutItemCommand({
            TableName: CARDS_TABLE,
            Item: marshall(updatedCard, { removeUndefinedValues: true }),
        }),
    )

    return response(200, { message: "Card updated", card: updatedCard })
}

// Delete a card
async function deleteCard(
    deck: string,
    name: string,
): Promise<APIGatewayProxyResultV2> {
    await dynamodb.send(
        new DeleteItemCommand({
            TableName: CARDS_TABLE,
            Key: marshall({ deck, name }),
        }),
    )

    return response(200, { message: "Card deleted" })
}

// List cards with optional filters
async function listCards(
    type?: CardType,
    deck?: string,
): Promise<APIGatewayProxyResultV2> {
    let cards: Card[] = []

    if (deck) {
        // Query by deck (efficient partition key query)
        const result = await dynamodb.send(
            new QueryCommand({
                TableName: CARDS_TABLE,
                KeyConditionExpression: "deck = :deck",
                ExpressionAttributeValues: marshall({ ":deck": deck }),
            }),
        )
        cards = (result.Items || []).map((item) => unmarshall(item) as Card)
    } else if (type) {
        // Query by type using GSI
        const result = await dynamodb.send(
            new QueryCommand({
                TableName: CARDS_TABLE,
                IndexName: "type-index",
                KeyConditionExpression: "#type = :type",
                ExpressionAttributeNames: { "#type": "type" },
                ExpressionAttributeValues: marshall({ ":type": type }),
            }),
        )
        cards = (result.Items || []).map((item) => unmarshall(item) as Card)
    } else {
        // Scan all cards
        const result = await dynamodb.send(
            new ScanCommand({
                TableName: CARDS_TABLE,
            }),
        )
        cards = (result.Items || []).map((item) => unmarshall(item) as Card)
    }

    // Separate powers and monsters
    const powers = cards.filter((c) => c.type === "power") as PowerCard[]
    const monsters = cards.filter((c) => c.type === "monster") as MonsterCard[]

    // Group powers by deck
    const powersByDeck = powers.reduce(
        (acc, power) => {
            if (!acc[power.deck]) {
                acc[power.deck] = []
            }
            acc[power.deck].push(power)
            return acc
        },
        {} as Record<string, PowerCard[]>,
    )

    return response(200, {
        cards,
        powers,
        monsters,
        byDeck: powersByDeck,
        count: cards.length,
        powerCount: powers.length,
        monsterCount: monsters.length,
        decks: [...new Set(cards.map((c) => c.deck))],
    })
}

// Batch import cards (for seeding)
async function batchImportCards(
    cards: Card[],
): Promise<APIGatewayProxyResultV2> {
    if (!Array.isArray(cards) || cards.length === 0) {
        return response(400, { error: "Cards array is required" })
    }

    // DynamoDB BatchWriteItem supports max 25 items per request
    const BATCH_SIZE = 25
    let imported = 0
    let failed = 0

    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = cards.slice(i, i + BATCH_SIZE)

        const writeRequests = batch.map((card) => ({
            PutRequest: {
                Item: marshall(
                    {
                        ...card,
                        updatedAt: Date.now(),
                    },
                    { removeUndefinedValues: true },
                ),
            },
        }))

        try {
            await dynamodb.send(
                new BatchWriteItemCommand({
                    RequestItems: {
                        [CARDS_TABLE]: writeRequests,
                    },
                }),
            )
            imported += batch.length
        } catch (error) {
            console.error("Batch write error:", error)
            failed += batch.length
        }
    }

    return response(200, {
        message: "Batch import complete",
        imported,
        failed,
        total: cards.length,
    })
}

// Main handler
export const handler = async (
    event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
    console.log("Event:", JSON.stringify(event, null, 2))

    const method = event.requestContext.http.method
    const path = event.rawPath
    const pathParams = event.pathParameters || {}

    try {
        // POST /cards/batch - Batch import
        if (method === "POST" && path === "/cards/batch") {
            const body = JSON.parse(event.body || "{}")
            return await batchImportCards(body.cards || body)
        }

        // POST /cards - Create card
        if (method === "POST" && path === "/cards") {
            const card = JSON.parse(event.body || "{}")
            return await createCard(card)
        }

        // GET /cards - List all cards (with optional ?type= or ?deck= filter)
        if (method === "GET" && path === "/cards") {
            const type = event.queryStringParameters?.type as
                | CardType
                | undefined
            const deck = event.queryStringParameters?.deck
            return await listCards(type, deck)
        }

        // GET /cards/{deck}/{name} - Get specific card
        if (method === "GET" && pathParams.deck && pathParams.name) {
            const deck = decodeURIComponent(pathParams.deck)
            const name = decodeURIComponent(pathParams.name)
            return await getCard(deck, name)
        }

        // PUT /cards/{deck}/{name} - Update card
        if (method === "PUT" && pathParams.deck && pathParams.name) {
            const deck = decodeURIComponent(pathParams.deck)
            const name = decodeURIComponent(pathParams.name)
            const updates = JSON.parse(event.body || "{}")
            return await updateCard(deck, name, updates)
        }

        // DELETE /cards/{deck}/{name} - Delete card
        if (method === "DELETE" && pathParams.deck && pathParams.name) {
            const deck = decodeURIComponent(pathParams.deck)
            const name = decodeURIComponent(pathParams.name)
            return await deleteCard(deck, name)
        }

        return response(404, { error: "Route not found" })
    } catch (error) {
        console.error("Error:", error)
        return response(500, {
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
        })
    }
}
