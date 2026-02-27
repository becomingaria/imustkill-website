#!/usr/bin/env node
/**
 * Seed script to populate the Cards DynamoDB table from powers.json and monsters.json
 *
 * Usage:
 *   npx ts-node scripts/seed-cards.ts [API_URL]
 *
 * If API_URL is not provided, it will prompt for it
 */

import * as fs from "fs"
import * as path from "path"

interface Power {
    name: string
    rarity: string
    deck: string
    description: string
}

interface Monster {
    Name: string
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

interface PowersJson {
    powers: Power[]
}

async function seedCards() {
    // Get API URL from argument or use default
    let apiUrl = process.argv[2]

    if (!apiUrl) {
        console.log(
            "No API URL provided as argument. Please provide the API URL:",
        )
        console.log(
            "  npx ts-node scripts/seed-cards.ts https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com",
        )
        process.exit(1)
    }

    // Remove trailing slash if present
    apiUrl = apiUrl.replace(/\/$/, "")

    // Read powers.json
    const powersJsonPath = path.join(__dirname, "../public/powers.json")
    if (!fs.existsSync(powersJsonPath)) {
        console.error("❌ powers.json not found at:", powersJsonPath)
        process.exit(1)
    }

    const powersData: PowersJson = JSON.parse(
        fs.readFileSync(powersJsonPath, "utf-8"),
    )

    // Read monsters.json
    const monstersJsonPath = path.join(__dirname, "../public/monsters.json")
    if (!fs.existsSync(monstersJsonPath)) {
        console.error("❌ monsters.json not found at:", monstersJsonPath)
        process.exit(1)
    }

    const monstersData: Monster[] = JSON.parse(
        fs.readFileSync(monstersJsonPath, "utf-8"),
    )

    // Transform powers to cards with type
    const powerCards = powersData.powers.map((p) => ({
        ...p,
        type: "power",
    }))

    // Transform monsters to cards with type
    const monsterCards = monstersData.map((m) => ({
        ...m,
        deck: "Monsters",
        name: m.Name,
        type: "monster",
    }))

    const allCards = [...powerCards, ...monsterCards]

    console.log(`📦 Found ${powerCards.length} powers to import`)
    console.log(`📦 Found ${monsterCards.length} monsters to import`)
    console.log(`📦 Total: ${allCards.length} cards`)

    // Group powers by deck for summary
    const byDeck = powerCards.reduce(
        (acc, p) => {
            acc[p.deck] = (acc[p.deck] || 0) + 1
            return acc
        },
        {} as Record<string, number>,
    )
    console.log("📊 Powers by deck:", byDeck)

    // Send batch import request
    console.log(`\n🚀 Sending batch import to ${apiUrl}/cards/batch...`)

    try {
        const response = await fetch(`${apiUrl}/cards/batch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cards: allCards }),
        })

        const result = (await response.json()) as {
            imported: number
            failed: number
            total: number
            message?: string
            error?: string
        }

        if (response.ok) {
            console.log("✅ Import successful!")
            console.log(`   Imported: ${result.imported}`)
            console.log(`   Failed: ${result.failed}`)
            console.log(`   Total: ${result.total}`)
        } else {
            console.error("❌ Import failed:", result)
            process.exit(1)
        }
    } catch (error) {
        console.error("❌ Request failed:", error)
        process.exit(1)
    }
}

seedCards()
