#!/usr/bin/env node
/**
 * Seed the Rules Database DynamoDB table from the public JSON files.
 *
 * Usage:
 *   npx ts-node scripts/seed-rules.ts <API_URL> <ID_TOKEN>
 *
 * Or set env vars:
 *   RULES_API_URL  — e.g. https://6tnku32a8f.execute-api.us-east-1.amazonaws.com
 *   IMK_ID_TOKEN   — Cognito id_token from Admin login
 *
 * To obtain an id_token, sign in on /admin, open DevTools → Application →
 * Local Storage → copy the value of imk_admin_id_token.
 *
 * Reads:  public/rules-database.json  (category list + file refs)
 *         public/<file>.json          (one per category)
 * Writes: POST /rules/seed            (batch upsert to DynamoDB)
 */

import * as fs from "fs"
import * as path from "path"

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface CategoryMeta {
    title: string
    description: string
    file: string
    keywords: string[]
}

interface RulesDatabaseJson {
    rulesDatabase: {
        categories: Record<string, CategoryMeta>
    }
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

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function readJson<T>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T
}

function flattenSections(category: string, data: CategoryData): SeedItem[] {
    const sections = data.sections || []
    return sections.map((section, index) => ({
        category,
        sectionId: section.id,
        title: section.title,
        order: index,
        content: section,
    }))
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function seedRules() {
    // ── Resolve config ────────────────────────────────────────────────────────
    let apiUrl = process.argv[2] || process.env.RULES_API_URL
    let idToken = process.argv[3] || process.env.IMK_ID_TOKEN

    if (!apiUrl) {
        console.error(
            "❌  Missing API URL.\n" +
                "    npx ts-node scripts/seed-rules.ts <API_URL> <ID_TOKEN>\n" +
                "    or set RULES_API_URL env var",
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

    // ── Load rules-database.json ──────────────────────────────────────────────
    const publicDir = path.join(__dirname, "../public")
    const dbPath = path.join(publicDir, "rules-database.json")
    const db = readJson<RulesDatabaseJson>(dbPath)
    const categories = db.rulesDatabase.categories

    console.log(
        `📖  Found ${Object.keys(categories).length} categories in rules-database.json`,
    )

    // ── Flatten all sections across all categories ────────────────────────────
    const allSections: SeedItem[] = []

    for (const [categoryKey, meta] of Object.entries(categories)) {
        const filePath = path.join(publicDir, meta.file)
        let raw: Record<string, unknown>
        try {
            raw = readJson<Record<string, unknown>>(filePath)
        } catch (err) {
            console.warn(
                `⚠️   Skipping ${categoryKey}: ${(err as Error).message}`,
            )
            continue
        }

        // Category JSON has one top-level key: { combatMechanics: { title, sections[] } }
        const categoryData = Object.values(raw)[0] as CategoryData
        if (!categoryData?.sections?.length) {
            console.warn(`⚠️   No sections found in ${meta.file}, skipping.`)
            continue
        }

        const items = flattenSections(categoryKey, categoryData)
        allSections.push(...items)
        console.log(
            `  ✓  ${categoryKey}: ${items.length} sections (from ${meta.file})`,
        )
    }

    console.log(`\n🔢  Total sections to seed: ${allSections.length}`)

    // ── POST to API ───────────────────────────────────────────────────────────
    const endpoint = `${apiUrl}/rules/seed`
    console.log(`\n⬆️   POSTing to ${endpoint} …`)

    const res = await fetch(endpoint, {
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
        console.error(`❌  Seed failed (HTTP ${res.status}):`, json)
        process.exit(1)
    }

    console.log(`✅  ${json.message || "Done!"}`)
    console.log(
        `\n💡  To use the live API in the frontend, set:\n` +
            `    REACT_APP_RULES_API_URL=${apiUrl}\n` +
            `    in your .env file, then rebuild.`,
    )
}

seedRules().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
