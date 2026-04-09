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
const EQUIPMENT_TABLE = process.env.EQUIPMENT_TABLE!

interface EquipmentItem {
    subcategory: string // PK: "Weapon" | "Protection" | "Control" | "Denial"
    name: string // SK
    tier: string // "Low Pay" | "High Pay"
    description: string
    damageType?: string
    range?: string
    protects?: string
    uses?: number
    trick?: string
    updatedAt?: number
}

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

async function createEquipment(
    item: EquipmentItem,
): Promise<APIGatewayProxyResultV2> {
    const { subcategory, name, tier, description } = item

    if (!subcategory || !name || !tier || !description) {
        return response(400, {
            error: "Missing required fields: subcategory, name, tier, description",
        })
    }

    await dynamodb.send(
        new PutItemCommand({
            TableName: EQUIPMENT_TABLE,
            Item: marshall(
                { ...item, updatedAt: Date.now() },
                { removeUndefinedValues: true },
            ),
        }),
    )

    return response(201, { message: "Equipment created", item })
}

async function getEquipment(
    subcategory: string,
    name: string,
): Promise<APIGatewayProxyResultV2> {
    const result = await dynamodb.send(
        new GetItemCommand({
            TableName: EQUIPMENT_TABLE,
            Key: marshall({ subcategory, name }),
        }),
    )

    if (!result.Item) {
        return response(404, { error: "Equipment not found" })
    }

    return response(200, unmarshall(result.Item))
}

async function updateEquipment(
    subcategory: string,
    name: string,
    updates: Partial<EquipmentItem>,
): Promise<APIGatewayProxyResultV2> {
    const existing = await dynamodb.send(
        new GetItemCommand({
            TableName: EQUIPMENT_TABLE,
            Key: marshall({ subcategory, name }),
        }),
    )

    if (!existing.Item) {
        return response(404, { error: "Equipment not found" })
    }

    const current = unmarshall(existing.Item) as EquipmentItem
    const updated = {
        ...current,
        ...updates,
        subcategory,
        name,
        updatedAt: Date.now(),
    }

    await dynamodb.send(
        new PutItemCommand({
            TableName: EQUIPMENT_TABLE,
            Item: marshall(updated, { removeUndefinedValues: true }),
        }),
    )

    return response(200, { message: "Equipment updated", item: updated })
}

async function deleteEquipment(
    subcategory: string,
    name: string,
): Promise<APIGatewayProxyResultV2> {
    await dynamodb.send(
        new DeleteItemCommand({
            TableName: EQUIPMENT_TABLE,
            Key: marshall({ subcategory, name }),
        }),
    )

    return response(200, { message: "Equipment deleted" })
}

async function listEquipment(
    subcategory?: string,
    tier?: string,
): Promise<APIGatewayProxyResultV2> {
    let items: EquipmentItem[] = []

    if (subcategory) {
        const params: Record<string, unknown> = {
            TableName: EQUIPMENT_TABLE,
            KeyConditionExpression: "subcategory = :sub",
            ExpressionAttributeValues: marshall({ ":sub": subcategory }),
        }

        if (tier) {
            ;(params as Record<string, unknown>).FilterExpression =
                "tier = :tier"
            const existing = marshall({ ":sub": subcategory, ":tier": tier })
            ;(params as Record<string, unknown>).ExpressionAttributeValues =
                existing
        }

        const result = await dynamodb.send(new QueryCommand(params as never))
        items = (result.Items || []).map(
            (item) => unmarshall(item) as EquipmentItem,
        )
    } else if (tier) {
        const result = await dynamodb.send(
            new QueryCommand({
                TableName: EQUIPMENT_TABLE,
                IndexName: "tier-index",
                KeyConditionExpression: "tier = :tier",
                ExpressionAttributeValues: marshall({ ":tier": tier }),
            }),
        )
        items = (result.Items || []).map(
            (item) => unmarshall(item) as EquipmentItem,
        )
    } else {
        const result = await dynamodb.send(
            new ScanCommand({ TableName: EQUIPMENT_TABLE }),
        )
        items = (result.Items || []).map(
            (item) => unmarshall(item) as EquipmentItem,
        )
    }

    const bySubcategory = items.reduce(
        (acc, item) => {
            if (!acc[item.subcategory]) acc[item.subcategory] = []
            acc[item.subcategory].push(item)
            return acc
        },
        {} as Record<string, EquipmentItem[]>,
    )

    return response(200, {
        equipment: items,
        bySubcategory,
        count: items.length,
        subcategories: [...new Set(items.map((i) => i.subcategory))],
    })
}

async function batchImportEquipment(
    items: EquipmentItem[],
): Promise<APIGatewayProxyResultV2> {
    if (!Array.isArray(items) || items.length === 0) {
        return response(400, { error: "Equipment array is required" })
    }

    const BATCH_SIZE = 25
    let imported = 0
    let failed = 0

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const writeRequests = batch.map((item) => ({
            PutRequest: {
                Item: marshall(
                    { ...item, updatedAt: Date.now() },
                    { removeUndefinedValues: true },
                ),
            },
        }))

        try {
            await dynamodb.send(
                new BatchWriteItemCommand({
                    RequestItems: { [EQUIPMENT_TABLE]: writeRequests },
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
        total: items.length,
    })
}

export const handler = async (
    event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
    console.log("Event:", JSON.stringify(event, null, 2))

    const method = event.requestContext.http.method
    const path = event.rawPath
    const pathParams = event.pathParameters || {}

    try {
        // POST /equipment/batch - Batch import
        if (method === "POST" && path === "/equipment/batch") {
            const body = JSON.parse(event.body || "{}")
            return await batchImportEquipment(body.equipment || body)
        }

        // POST /equipment - Create
        if (method === "POST" && path === "/equipment") {
            const item = JSON.parse(event.body || "{}")
            return await createEquipment(item)
        }

        // GET /equipment - List (optional ?subcategory= or ?tier=)
        if (method === "GET" && path === "/equipment") {
            const subcategory = event.queryStringParameters?.subcategory
            const tier = event.queryStringParameters?.tier
            return await listEquipment(subcategory, tier)
        }

        // GET /equipment/{subcategory}/{name}
        if (method === "GET" && pathParams.subcategory && pathParams.name) {
            const subcategory = decodeURIComponent(pathParams.subcategory)
            const name = decodeURIComponent(pathParams.name)
            return await getEquipment(subcategory, name)
        }

        // PUT /equipment/{subcategory}/{name}
        if (method === "PUT" && pathParams.subcategory && pathParams.name) {
            const subcategory = decodeURIComponent(pathParams.subcategory)
            const name = decodeURIComponent(pathParams.name)
            const updates = JSON.parse(event.body || "{}")
            return await updateEquipment(subcategory, name, updates)
        }

        // DELETE /equipment/{subcategory}/{name}
        if (method === "DELETE" && pathParams.subcategory && pathParams.name) {
            const subcategory = decodeURIComponent(pathParams.subcategory)
            const name = decodeURIComponent(pathParams.name)
            return await deleteEquipment(subcategory, name)
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
