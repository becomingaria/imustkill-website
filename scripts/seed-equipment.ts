#!/usr/bin/env node
/**
 * Seed the Equipment DynamoDB table from public/equipment.json.
 *
 * Usage:
 *   npx ts-node scripts/seed-equipment.ts <API_URL> <ID_TOKEN>
 *
 * Or set env vars:
 *   EQUIPMENT_API_URL — e.g. https://6tnku32a8f.execute-api.us-east-1.amazonaws.com
 *   IMK_ID_TOKEN      — Cognito id_token from Admin login
 */

import * as fs from "fs"
import * as path from "path"

interface EquipmentItem {
    name: string
    subcategory: string
    tier: string
    description: string
    damageType?: string
    range?: string
    protects?: string
    uses?: number
    trick?: string
}

interface EquipmentJson {
    equipmentSystem: unknown
    equipment: EquipmentItem[]
}

async function seedEquipment() {
    let apiUrl = process.argv[2] || process.env.EQUIPMENT_API_URL
    let idToken = process.argv[3] || process.env.IMK_ID_TOKEN

    if (!apiUrl) {
        console.error(
            "❌  Missing API URL.\n" +
                "    npx ts-node scripts/seed-equipment.ts <API_URL> <ID_TOKEN>",
        )
        process.exit(1)
    }
    if (!idToken) {
        console.error(
            "❌  Missing Cognito id_token.\n" +
                "    Sign in at /admin, then copy imk_admin_id_token from localStorage.",
        )
        process.exit(1)
    }

    apiUrl = apiUrl.replace(/\/$/, "")

    const filePath = path.join(__dirname, "../public/equipment.json")
    if (!fs.existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}`)
        process.exit(1)
    }

    const data: EquipmentJson = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    const items = data.equipment

    console.log(`📦  Found ${items.length} equipment items in equipment.json`)

    for (const cat of ["Weapon", "Protection", "Control", "Denial"]) {
        const lo = items.filter(
            (i) => i.subcategory === cat && i.tier === "Low Pay",
        )
        const hi = items.filter(
            (i) => i.subcategory === cat && i.tier === "High Pay",
        )
        console.log(`  ✓  ${cat}: ${lo.length} low, ${hi.length} high`)
    }

    const endpoint = `${apiUrl}/equipment/batch`
    console.log(`\n⬆️   POSTing to ${endpoint} …`)

    const res = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ equipment: items }),
    })

    const json = (await res.json()) as Record<string, unknown>

    if (!res.ok) {
        console.error(`❌  Seed failed (HTTP ${res.status}):`, json)
        process.exit(1)
    }

    console.log(`✅  ${json.message || "Done!"}`)
    console.log(`    Imported: ${json.imported}, Failed: ${json.failed}`)
}

seedEquipment().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
