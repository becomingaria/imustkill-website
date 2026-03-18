# I Must Kill — Game System Context

## High-Level Overview

"I Must Kill" is a tabletop roleplaying game (TTRPG) system about hunters facing down monsters using a blend of physical combat, supernatural powers, and resource management.

The core of the system is organized as a set of structured rules sections that define:

- character stats and actions
- combat and hit point mechanics
- power cards and power deck mechanics
- recovery and resting systems
- running the game (GM guidance, monster mechanics, etc.)

These sections are stored as structured data and referenced via unique IDs, which allows the system to link terminology, generate a rulebook, and support easy updates.

## Key Concepts

### Sections & Categories

Rules are organized into **categories** (e.g., `combat-mechanics`, `spellcasting`, `running-the-game`), each containing multiple **sections** (e.g., `actions`, `using-powers`).

Each section is structured and may include fields such as:

- `title` / `description`
- `rules` (list of bullet points or named items)
- `keywords` (terms to make searchable and linkable)
- `rarities`, `charge`, and other structured sub-fields

This structure makes it easy to extend the system by adding new sections or categories.

### Keyword References (`@Keyword`)

The system uses **keyword references** (entries like `@Power`, `@Insight`, `@Grit Teeth`) to connect text across the rules.

These are defined in a central reference database (e.g. `rules-database.json`), which maps each keyword to:

- a friendly title
- a category and section where it belongs
- a short description/definition

This allows keywords to be treated as “links” within the rules, guiding players to the right information.

### Power Deck System

A major focus of the system is the **power deck** mechanic, where characters draw and play power cards.

Important concepts in this subsystem include:

- **Power Rarities**: Cards are categorized into tiers (Common, Uncommon, Rare, Mythic).
- **Charge rules**: Some high-tier powers require charges or other resources to play.
- **Deck management**: Gathering powers, discarding, and using power cards in combat.

Structured data for power rarities includes fields like `targets`, `range`, `duration`, `charge_required`, and descriptive text.

### Exporting a Rulebook

The system can generate an export (called "Whitepapers") that converts the current rules content into a formatted reference document.

The export is data-driven and attempts to include everything in the rules database, including:

- all categories and sections
- structured sub-fields (like power rarities)
- keyword definitions (as a glossary)

## How to Expand the System

To add new content or mechanics:

1. **Add or update structured rule data** (e.g., section JSON content).
2. **Add keyword references** for any new terminology so it can be linked.
3. If adding new structured fields, ensure the export logic supports rendering them.

## Notes for an LLM

- Work from the structured data: the rules are stored as JSON-style sections.
- Avoid hardcoding category names or section IDs; the system should behave dynamically.
- Focus on making rule content extensible and consistent (e.g., keep keywords accurate, keep rarity/tier data structured).
