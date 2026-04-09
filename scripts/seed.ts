#!/usr/bin/env node
/**
 * Unified seed script — seeds rules and/or equipment to DynamoDB.
 * Reads connection config from scripts/seed.config.json.
 * Reads password from PASSWORD key in .env (project root).
 *
 * Usage:
 *   npx ts-node scripts/seed.ts
 *   npx ts-node scripts/seed.ts --rules-only
 *   npx ts-node scripts/seed.ts --equipment-only
 */

import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

// Load .env from project root
require("dotenv").config({ path: path.join(__dirname, "../.env") })

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────
interface SeedConfig {
    apiUrl: string
    cognitoClientId: string
    cognitoUsername: string
    awsProfile: string
    awsRegion: string
}

function loadConfig(): SeedConfig {
    const configPath = path.join(__dirname, "seed.config.json")
    if (!fs.existsSync(configPath)) {
        console.error(
            "❌  seed.config.json not found at scripts/seed.config.json",
        )
        process.exit(1)
    }
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as SeedConfig
}

// ────────────────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────────────────
function getIdToken(config: SeedConfig): string {
    const password = process.env.PASSWORD || process.env.IMK_ADMIN_PASSWORD
    if (!password) {
        console.error(
            "❌  Missing password.\n" +
                "    Add PASSWORD=yourpass to your .env file, or set IMK_ADMIN_PASSWORD env var.",
        )
        process.exit(1)
    }

    console.log(`🔐  Authenticating as ${config.cognitoUsername} …`)
    try {
        const token = execSync(
            `aws cognito-idp initiate-auth \
                --auth-flow USER_PASSWORD_AUTH \
                --client-id ${config.cognitoClientId} \
                --auth-parameters USERNAME=${config.cognitoUsername},PASSWORD='${password}' \
                --profile ${config.awsProfile} \
                --region ${config.awsRegion} \
                --query 'AuthenticationResult.IdToken' \
                --output text`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim()

        if (!token || token === "None") {
            console.error("❌  Auth succeeded but no token returned.")
            process.exit(1)
        }
        console.log("✅  Token acquired.\n")
        return token
    } catch (err) {
        console.error("❌  Cognito auth failed:", (err as Error).message)
        process.exit(1)
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Seed Rules
// ────────────────────────────────────────────────────────────────────────────
interface CategoryMeta {
    title: string
    description: string
    file: string
    keywords: string[]
}

interface Section {
    id: string
    title: string
    [key: string]: unknown
}

interface CategoryData {
    title: string
    sections: Section[]
}

interface SeedItem {
    category: string
    sectionId: string
    title: string
    order: number
    content: Section
}

function readJson<T>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}

async function seedRules(apiUrl: string, idToken: string): Promise<void> {
    console.log("📖  Seeding rules …")

    const publicDir = path.join(__dirname, "../public")
    const db = readJson<{
        rulesDatabase: { categories: Record<string, CategoryMeta> }
    }>(path.join(publicDir, "rules-database.json"))
    const categories = db.rulesDatabase.categories
    console.log(`     Found ${Object.keys(categories).length} categories`)

    const allSections: SeedItem[] = []
    for (const [categoryKey, meta] of Object.entries(categories)) {
        let raw: Record<string, unknown>
        try {
            raw = readJson<Record<string, unknown>>(
                path.join(publicDir, meta.file),
            )
        } catch (err) {
            console.warn(
                `  ⚠️   Skipping ${categoryKey}: ${(err as Error).message}`,
            )
            continue
        }

        const categoryData = Object.values(raw)[0] as CategoryData
        if (!categoryData?.sections?.length) {
            console.warn(`  ⚠️   No sections in ${meta.file}, skipping.`)
            continue
        }

        const items: SeedItem[] = categoryData.sections.map(
            (section, index) => ({
                category: categoryKey,
                sectionId: section.id,
                title: section.title,
                order: index,
                content: section,
            }),
        )
        allSections.push(...items)
        console.log(`     ✓  ${categoryKey}: ${items.length} sections`)
    }

    console.log(`\n     Total: ${allSections.length} sections`)

    const res = await fetch(`${apiUrl}/rules/seed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
            sections: allSections,
            updatedBy: "seed-script",
        }),
    })

    const json = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
        console.error(`❌  Rules seed failed (HTTP ${res.status}):`, json)
        process.exit(1)
    }
    console.log(`✅  Rules: ${json.message || "Done!"}\n`)
}

// ────────────────────────────────────────────────────────────────────────────
// Seed Equipment
// ────────────────────────────────────────────────────────────────────────────
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

async function seedEquipment(apiUrl: string, idToken: string): Promise<void> {
    console.log("📦  Seeding equipment …")

    const filePath = path.join(__dirname, "../public/equipment.json")
    if (!fs.existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}`)
        process.exit(1)
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
        equipment: EquipmentItem[]
    }
    const items = data.equipment
    console.log(`     Found ${items.length} items`)

    for (const cat of ["Weapon", "Protection", "Control", "Denial"]) {
        const lo = items.filter(
            (i) => i.subcategory === cat && i.tier === "Low Pay",
        ).length
        const hi = items.filter(
            (i) => i.subcategory === cat && i.tier === "High Pay",
        ).length
        console.log(`     ✓  ${cat}: ${lo} low, ${hi} high`)
    }

    const res = await fetch(`${apiUrl}/equipment/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ equipment: items }),
    })

    const json = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
        console.error(`❌  Equipment seed failed (HTTP ${res.status}):`, json)
        process.exit(1)
    }
    console.log(`✅  Equipment: ${json.message || "Done!"}`)
    console.log(`     Imported: ${json.imported}, Failed: ${json.failed}\n`)
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2)
    const rulesOnly = args.includes("--rules-only")
    const equipmentOnly = args.includes("--equipment-only")

    const config = loadConfig()
    const idToken = getIdToken(config)
    const apiUrl = config.apiUrl.replace(/\/$/, "")

    if (!equipmentOnly) await seedRules(apiUrl, idToken)
    if (!rulesOnly) await seedEquipment(apiUrl, idToken)

    console.log("🎉  All done!")
}

main().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
