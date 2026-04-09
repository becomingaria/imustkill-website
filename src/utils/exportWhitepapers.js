/**
 * exportWhitepapers.js
 *
 * Generates the IMK Whitepapers as a .docx file from live rules data.
 *
 * Version history:
 *   1.1  — 2026-03-03  Initial digitized ruleset export
 *
 * To bump the version: update CURRENT_VERSION below and re-export.
 */

import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    SectionType,
    Header,
    Footer,
    PageNumber,
    TabStopType,
    convertInchesToTwip,
} from "docx"
import { saveAs } from "file-saver"

// ── Version (bump before each official export) ────────────────────────────────
export const CURRENT_VERSION = "1.1"

// ── Typography ────────────────────────────────────────────────────────────────
const BODY_FONT = "Garamond"
const HEAD_FONT = "Cinzel"

// Sizes in half-points
const SZ_TITLE = 64 // 32pt — document title
const SZ_SUBTITLE = 44 // 22pt — "The Whitepapers"
const SZ_CHAPTER = 36 // 18pt — category headings
const SZ_SECTION = 26 // 13pt — section headings
const SZ_SUBSECT = 22 // 11pt — sub-section headings
const SZ_BODY = 20 // 10pt — body text
const SZ_META = 18 // 9pt — captions, headers, footers

// Colours (hex, no #)
const COL_DARK = "1a0a0a"
const COL_MUTED = "555555"

// ── Category configuration ────────────────────────────────────────────────────
// These defaults are used if the rules database cannot be loaded.
const DEFAULT_CATEGORY_ORDER = [
    "getting-started",
    "character-creation",
    "progression",
    "equipment",
    "combat-mechanics",
    "spellcasting",
    "death-and-resting",
    "running-the-game",
]

const DEFAULT_CATEGORY_TITLES = {
    "getting-started": "Getting Started",
    "character-creation": "Character Creation",
    progression: "Progression",
    equipment: "Equipment",
    "combat-mechanics": "Combat Mechanics",
    spellcasting: "Powers",
    "death-and-resting": "Death & Resting",
    "running-the-game": "Running the Game",
}

// Derive category order from grouped rules and optional DB metadata.
const getCategoryOrder = (grouped, database) => {
    const order = []
    if (database?.categories) {
        order.push(...Object.keys(database.categories))
    }
    if (order.length === 0) {
        order.push(...DEFAULT_CATEGORY_ORDER)
    }

    const extra = Object.keys(grouped)
        .filter((k) => !order.includes(k))
        .sort()

    return [...order, ...extra].filter((k) => grouped[k]?.length)
}

const getCategoryTitle = (categoryKey, database) => {
    const titleFromDb = database?.categories?.[categoryKey]?.title
    if (titleFromDb) return titleFromDb
    if (DEFAULT_CATEGORY_TITLES[categoryKey])
        return DEFAULT_CATEGORY_TITLES[categoryKey]
    return categoryKey
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
}

// ── Inline text parser — turns @Word into a bold run ─────────────────────────
/**
 * Split a string on @token tokens and return an array of TextRun objects.
 * Anything starting with @ (letters/digits/hyphens) becomes bold.
 */
function parseInlineRuns(text, baseOpts = {}) {
    const str = String(text ?? "")
    // Match @Tag where each word starts with an uppercase letter.
    // Supports multi-word tags like "@Hit Points" or "@Physical Damage".
    // Optionally captures a trailing space so spacing is preserved naturally.
    const parts = str.split(/(@[A-Z][A-Za-z0-9]*(?:\s[A-Z][A-Za-z0-9]*)* ?)/)
    return parts
        .filter((p) => p.length > 0)
        .map((p) => {
            if (p.startsWith("@")) {
                // Strip the leading @ and render bold (trailing space preserved)
                return new TextRun({
                    text: p.slice(1),
                    font: BODY_FONT,
                    size: SZ_BODY,
                    bold: true,
                    ...baseOpts,
                })
            }
            return new TextRun({
                text: p,
                font: BODY_FONT,
                size: SZ_BODY,
                ...baseOpts,
            })
        })
}

// ── Primitive helpers ─────────────────────────────────────────────────────────
const t = (text, opts = {}) =>
    new TextRun({
        text: String(text ?? ""),
        font: BODY_FONT,
        size: SZ_BODY,
        ...opts,
    })

const th = (text, opts = {}) =>
    new TextRun({ text: String(text ?? ""), font: HEAD_FONT, ...opts })

const para = (children, opts = {}) =>
    new Paragraph({
        spacing: { after: 80, before: 40 },
        ...opts,
        children: Array.isArray(children) ? children : [children],
    })

const emptyLine = () =>
    new Paragraph({ spacing: { after: 80 }, children: [t("")] })

// Labeled field: bold key followed by body text (with @Token parsing on value)
const labeledPara = (label, text) =>
    para([t(label + ": ", { bold: true }), ...parseInlineRuns(text ?? "")])

// Bullet point paragraph (with @Token parsing)
const bullet = (text, italic = false) =>
    new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: parseInlineRuns(String(text ?? ""), { italics: italic }),
    })

// Named item: "Title — description" (name or title; description gets @Token parsing)
const namedItem = ({ title, name, description } = {}) => {
    const label = title || name || ""
    return para([
        t(label + (description ? " — " : ""), { bold: true }),
        ...parseInlineRuns(description || ""),
    ])
}

// Sub-heading within a section
const subHead = (text) =>
    new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [th(text, { size: SZ_SUBSECT, bold: true })],
    })

// ── Render a section's content fields ────────────────────────────────────────
const LABELED_FIELDS = [
    { key: "mechanics", label: "Mechanics" },
    { key: "limitations", label: "Limitations" },
    { key: "limits", label: "Limits" },
    { key: "perception", label: "Perception" },
    { key: "maximum", label: "Maximum" },
    { key: "ascendant", label: "Ascendant" },
    { key: "timing", label: "Timing" },
]

const LIST_FIELDS = ["actions", "types", "equipment", "conditions"]

function renderContent(c) {
    if (!c) return []
    const out = []

    // Description
    if (c.description) out.push(para(parseInlineRuns(c.description)))

    // body — general prose paragraph
    if (c.body) out.push(para(parseInlineRuns(c.body)))

    // Core rule callout (boxed / indented)
    if (c.coreRule) {
        out.push(
            new Paragraph({
                spacing: { before: 100, after: 60 },
                indent: {
                    left: convertInchesToTwip(0.25),
                    right: convertInchesToTwip(0.25),
                },
                border: {
                    left: {
                        style: "single",
                        size: 12,
                        space: 8,
                        color: "8B0000",
                    },
                },
                children: [t(c.coreRule, { bold: true, italics: true })],
            }),
        )
    }
    if (c.coreRuleNote) {
        out.push(
            new Paragraph({
                spacing: { after: 60 },
                indent: { left: convertInchesToTwip(0.25) },
                children: [
                    t(c.coreRuleNote, { italics: true, color: COL_MUTED }),
                ],
            }),
        )
    }
    if (c.d10Note) {
        out.push(
            new Paragraph({
                spacing: { after: 80 },
                indent: { left: convertInchesToTwip(0.25) },
                children: [t(c.d10Note, { italics: true, color: COL_MUTED })],
            }),
        )
    }

    // quickStart hint
    if (c.quickStart) {
        out.push(
            para([
                t("Quick Start: ", { bold: true }),
                t(c.quickStart, { italics: true }),
            ]),
        )
    }

    // Labeled fields
    for (const { key, label } of LABELED_FIELDS) {
        if (c[key]) out.push(labeledPara(label, c[key]))
    }

    // Available stats
    if (c.available_stats?.length) {
        out.push(labeledPara("Available Stats", c.available_stats.join(", ")))
    }

    // Benefits
    if (c.benefits?.length) {
        out.push(subHead("Benefits"))
        c.benefits.forEach((b) => out.push(bullet(String(b))))
    }

    // Charge (for powers)
    if (c.charge) {
        out.push(labeledPara("Charge", c.charge))
    }

    // Power rarities (for powers)
    if (Array.isArray(c.rarities) && c.rarities.length) {
        out.push(subHead("Rarities"))
        c.rarities.forEach((rarity) => {
            const title = rarity.name || rarity.title || ""
            const desc = rarity.description || ""
            // Main rarity line
            out.push(
                para([
                    t(title + (desc ? " — " : ""), { bold: true }),
                    ...parseInlineRuns(desc),
                ]),
            )

            const metaParts = []
            if (rarity.targets) metaParts.push(`Targets: ${rarity.targets}`)
            if (rarity.range) metaParts.push(`Range: ${rarity.range}`)
            if (rarity.duration) metaParts.push(`Duration: ${rarity.duration}`)
            if (rarity.charge_required != null)
                metaParts.push(
                    `Charge required: ${rarity.charge_required ? "Yes" : "No"}`,
                )

            if (metaParts.length) {
                out.push(para(metaParts.join(" • ")))
            }
        })
    }

    // Rules
    if (c.rules?.length) {
        c.rules.forEach((r) => {
            if (typeof r === "string") {
                out.push(bullet(r))
            } else if (r && (r.title || r.description)) {
                out.push(namedItem(r))
            }
        })
    }

    // Examples
    if (c.examples?.length) {
        out.push(subHead("Examples"))
        c.examples.forEach((e) => out.push(bullet(String(e), true)))
    }

    // stats array — name + desc (used in getting-started)
    if (c.stats?.length) {
        c.stats.forEach((s) => {
            out.push(
                para([
                    t((s.name || "") + ": ", { bold: true }),
                    ...parseInlineRuns(s.desc || s.description || ""),
                ]),
            )
        })
    }

    // turnOrder — ordered steps before actions
    if (c.turnOrder?.length) {
        out.push(subHead("Turn Order"))
        c.turnOrder.forEach((step, i) =>
            out.push(
                para([
                    t(`${i + 1}. `, { bold: true }),
                    ...parseInlineRuns(step),
                ]),
            ),
        )
    }

    // List fields: actions, types, equipment, conditions
    // actions may have { action, stat, effect } or { title, description }
    for (const field of LIST_FIELDS) {
        if (c[field]?.length) {
            out.push(subHead(field.charAt(0).toUpperCase() + field.slice(1)))
            c[field].forEach((item) => {
                if (typeof item === "string") {
                    out.push(bullet(item))
                } else if (item.action != null) {
                    // Combat action row: Action — Stat — Effect
                    const label =
                        [item.action, item.stat].filter(Boolean).join(" (") +
                        (item.stat ? ")" : "")
                    out.push(
                        para([
                            t(label + ": ", { bold: true }),
                            ...parseInlineRuns(item.effect || ""),
                        ]),
                    )
                } else {
                    out.push(namedItem(item))
                }
            })
        }
    }

    // Phases (numbered) — supports both { name, desc } and { title, description }
    if (c.phases?.length) {
        out.push(subHead("Phases"))
        c.phases.forEach((phase, i) => {
            let text
            if (typeof phase === "string") {
                text = phase
            } else {
                const title = phase.name || phase.title || ""
                const desc = phase.desc || phase.description || ""
                text = title + (desc ? " — " + desc : "")
            }
            out.push(
                para([
                    t(`${i + 1}. `, { bold: true }),
                    ...parseInlineRuns(text),
                ]),
            )
        })
    }

    // items — { label, value } quick-reference rows
    if (c.items?.length) {
        out.push(subHead("Quick Reference"))
        c.items.forEach((item) => {
            out.push(
                para([
                    t((item.label || "") + ": ", { bold: true }),
                    ...parseInlineRuns(item.value || ""),
                ]),
            )
        })
    }

    // Content — stat/description pairs (CharacterCreation stats)
    if (c.content?.length) {
        c.content.forEach((item) => {
            if (item && (item.stat || item.name || item.description)) {
                out.push(
                    para([
                        t((item.stat || item.name || "") + ": ", {
                            bold: true,
                        }),
                        ...parseInlineRuns(item.description || ""),
                    ]),
                )
            }
        })
    }

    // Subsections
    if (c.subsections?.length) {
        c.subsections.forEach((sub) => {
            if (sub.title) {
                out.push(
                    new Paragraph({
                        spacing: { before: 160, after: 80 },
                        children: [
                            th(sub.title, { size: SZ_SUBSECT, bold: true }),
                        ],
                    }),
                )
            }
            out.push(...renderContent(sub))
        })
    }

    return out
}

// ── Equipment chapter renderer ────────────────────────────────────────────────
// Renders the full Equipment chapter from live API items + static metadata.
// Called instead of the generic section loop when equipmentData is provided.
function renderEquipmentChapter({ system, items }) {
    const out = []
    const sys = system || {}

    // System overview description
    if (sys.description) out.push(para(parseInlineRuns(sys.description)))

    // Core rules
    const r = sys.rules || {}
    const ruleLines = [
        r.maxItems != null && `Carry limit: ${r.maxItems} items`,
        r.startingEquipment && `Starting equipment: ${r.startingEquipment}`,
        r.highPayReward && `High pay reward: ${r.highPayReward}`,
        r.lowPayResupply && `Low pay resupply: ${r.lowPayResupply}`,
    ].filter(Boolean)
    if (ruleLines.length) {
        out.push(subHead("Rules"))
        ruleLines.forEach((line) => out.push(bullet(line)))
    }

    // Tiers
    if (sys.tiers?.length) {
        out.push(subHead("Tiers"))
        sys.tiers.forEach((tier) => {
            out.push(
                para([
                    t((tier.name || "") + " — ", { bold: true }),
                    ...parseInlineRuns(tier.description || ""),
                ]),
            )
        })
    }

    out.push(emptyLine())

    // Build subcategory meta lookup
    const subcatMeta = {}
    ;(sys.subcategories || []).forEach((s) => {
        subcatMeta[s.name] = s
    })

    // Group items by subcategory
    const bySubcat = {}
    ;(items || []).forEach((item) => {
        if (!bySubcat[item.subcategory]) bySubcat[item.subcategory] = []
        bySubcat[item.subcategory].push(item)
    })

    const subcatOrder = ["Weapon", "Protection", "Control", "Denial"]
    const presentSubcats = subcatOrder.filter((s) => bySubcat[s]?.length)

    presentSubcats.forEach((subcat) => {
        // Subcategory heading
        out.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 80 },
                children: [th(subcat, { size: SZ_SECTION, color: COL_DARK })],
            }),
        )

        // Subcategory description
        const meta = subcatMeta[subcat]
        if (meta?.description) {
            out.push(para(parseInlineRuns(meta.description)))
        }

        // Items — Low Pay first, then alpha
        const subcatItems = [...bySubcat[subcat]].sort((a, b) => {
            const tierDiff =
                (a.tier === "High Pay" ? 1 : 0) -
                (b.tier === "High Pay" ? 1 : 0)
            if (tierDiff !== 0) return tierDiff
            return a.name.localeCompare(b.name)
        })

        subcatItems.forEach((item) => {
            const metaParts = []
            if (item.damageType) metaParts.push(item.damageType)
            if (item.range) metaParts.push(item.range)
            if (item.protects) metaParts.push(`Protects: ${item.protects}`)
            if (item.uses != null && item.uses !== "")
                metaParts.push(`${item.uses} uses`)
            const metaStr = metaParts.join(" • ")

            // Name line: Name (Tier) — meta
            out.push(
                para([
                    t(item.name, { bold: true }),
                    t(` (${item.tier})`, { color: COL_MUTED }),
                    ...(metaStr
                        ? [t(" — " + metaStr, { color: COL_MUTED })]
                        : []),
                ]),
            )

            // Description (indented)
            if (item.description) {
                out.push(
                    new Paragraph({
                        spacing: { after: 40, before: 0 },
                        indent: { left: convertInchesToTwip(0.2) },
                        children: parseInlineRuns(item.description),
                    }),
                )
            }

            // Trick (indented, italic)
            if (item.trick) {
                out.push(
                    new Paragraph({
                        spacing: { after: 80, before: 0 },
                        indent: { left: convertInchesToTwip(0.2) },
                        children: [
                            t("Trick: ", { bold: true, italics: true }),
                            t(item.trick, { italics: true }),
                        ],
                    }),
                )
            }
        })

        out.push(emptyLine())
    })

    return out
}

// ── Build the header for content pages ───────────────────────────────────────
function makeHeader(version) {
    return new Header({
        children: [
            new Paragraph({
                tabStops: [
                    {
                        type: TabStopType.RIGHT,
                        position: convertInchesToTwip(6.5),
                    },
                ],
                spacing: { after: 0 },
                border: {
                    bottom: {
                        style: "single",
                        size: 6,
                        space: 4,
                        color: "cccccc",
                    },
                },
                children: [
                    th("I Must Kill — The Whitepapers", {
                        size: SZ_META,
                        color: COL_MUTED,
                    }),
                    new TextRun({ text: "\t", size: SZ_META }),
                    t(`v${version}`, { size: SZ_META, color: COL_MUTED }),
                ],
            }),
        ],
    })
}

// ── Build the footer for content pages ───────────────────────────────────────
function makeFooter() {
    return new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                    top: {
                        style: "single",
                        size: 6,
                        space: 4,
                        color: "cccccc",
                    },
                },
                spacing: { before: 0 },
                children: [
                    t("— ", { size: SZ_META, color: COL_MUTED }),
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: BODY_FONT,
                        size: SZ_META,
                        color: COL_MUTED,
                    }),
                    t(" —", { size: SZ_META, color: COL_MUTED }),
                ],
            }),
        ],
    })
}

// ── Main export function ──────────────────────────────────────────────────────
/**
 * Build and download the Whitepapers .docx.
 *
 * @param {{ [categoryKey: string]: Array<{ content: object, order: number }> }} grouped
 *   The grouped rules object from GET /rules (or AdminRulesPanel state).
 * @param {string} version  e.g. "1.1"
 */
export async function exportWhitepapers(
    grouped,
    version = CURRENT_VERSION,
    database = null,
    equipmentData = null,
) {
    // Ensure we have rules database metadata for ordering and titles.
    let db = database
    if (!db) {
        try {
            const dbRes = await fetch("/rules-database.json")
            const json = await dbRes.json()
            db = json?.rulesDatabase || null
        } catch {
            db = null
        }
    }

    const categoryOrder = getCategoryOrder(grouped, db)

    // Ensure "equipment" appears in the order when live data is provided,
    // even though grouped["equipment"] is empty (it lives in a separate table).
    if (equipmentData && !categoryOrder.includes("equipment")) {
        // Try to insert after "progression" (its natural position)
        const anchor = categoryOrder.indexOf("progression")
        if (anchor >= 0) {
            categoryOrder.splice(anchor + 1, 0, "equipment")
        } else {
            // Fallback: insert before "combat-mechanics" or at end
            const combatIdx = categoryOrder.indexOf("combat-mechanics")
            if (combatIdx >= 0) {
                categoryOrder.splice(combatIdx, 0, "equipment")
            } else {
                categoryOrder.push("equipment")
            }
        }
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    // ── Title page ──────────────────────────────────────────────────────────
    const titleChildren = [
        // Push title down ~1/3 of the page
        new Paragraph({
            spacing: { before: convertInchesToTwip(2.2) },
            children: [],
        }),

        // "I MUST KILL"
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120, before: 0 },
            children: [
                th("I MUST KILL", {
                    size: SZ_TITLE,
                    bold: true,
                    color: COL_DARK,
                }),
            ],
        }),

        // "The Whitepapers"
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                th("The Whitepapers", {
                    size: SZ_SUBTITLE,
                    color: COL_DARK,
                }),
            ],
        }),

        // Decorative rule
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
                bottom: {
                    style: "single",
                    size: 12,
                    space: 8,
                    color: "8B0000",
                },
            },
            children: [],
        }),

        // Version + date
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
                t(`Version ${version}`, {
                    size: SZ_META + 2,
                    bold: true,
                    color: COL_MUTED,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [t(dateStr, { size: SZ_META, color: COL_MUTED })],
        }),

        // "Contents" heading
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 160 },
            children: [
                th("Contents", {
                    size: SZ_SECTION,
                    bold: true,
                    color: COL_DARK,
                }),
            ],
        }),

        // TOC list
        ...categoryOrder.map(
            (k, i) =>
                new Paragraph({
                    spacing: { after: 80 },
                    indent: { left: convertInchesToTwip(0.5) },
                    children: [
                        th(`${i + 1}.  `, {
                            size: SZ_BODY + 2,
                            color: "8B0000",
                        }),
                        t(getCategoryTitle(k, db), { size: SZ_BODY + 2 }),
                    ],
                }),
        ),
    ]

    // ── Content section ─────────────────────────────────────────────────────
    const contentChildren = []
    let firstChapter = true

    for (const catKey of categoryOrder) {
        const sections = grouped[catKey]
        const isEquipment = catKey === "equipment" && equipmentData
        if (!sections?.length && !isEquipment) continue

        // Chapter heading — page break before every chapter except first
        contentChildren.push(
            new Paragraph({
                pageBreakBefore: !firstChapter,
                spacing: { before: firstChapter ? 0 : 80, after: 160 },
                children: [
                    th(getCategoryTitle(catKey, db).toUpperCase(), {
                        size: SZ_CHAPTER,
                        bold: true,
                        color: COL_DARK,
                    }),
                ],
            }),
        )
        // Thin red rule under chapter heading
        contentChildren.push(
            new Paragraph({
                spacing: { before: 0, after: 200 },
                border: {
                    bottom: {
                        style: "single",
                        size: 8,
                        space: 4,
                        color: "8B0000",
                    },
                },
                children: [],
            }),
        )

        firstChapter = false

        // Equipment chapter — rendered from live API data + static metadata
        if (isEquipment) {
            contentChildren.push(...renderEquipmentChapter(equipmentData))
            continue
        }

        // Sort sections by order
        const sorted = [...sections].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
        )

        for (const sec of sorted) {
            const c = sec.content
            if (!c) continue

            // Section heading
            contentChildren.push(
                new Paragraph({
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 80 },
                    children: [
                        th(c.title || sec.sectionId, {
                            size: SZ_SECTION,
                            color: COL_DARK,
                        }),
                    ],
                }),
            )

            // Section content
            contentChildren.push(...renderContent(c))

            // Spacer between sections
            contentChildren.push(emptyLine())
        }
    }

    // ── Key Words appendix ───────────────────────────────────────────────────
    // Load referenceIds from rules-database.json if not provided
    let refIds = db?.referenceIds || null
    if (!refIds && db) {
        refIds = db?.referenceIds || null
    }

    if (refIds) {
        // Sort entries alphabetically by the tag label (strip leading @)
        const entries = Object.entries(refIds).sort(([a], [b]) =>
            a.slice(1).localeCompare(b.slice(1)),
        )

        contentChildren.push(
            new Paragraph({
                pageBreakBefore: true,
                spacing: { before: 0, after: 160 },
                children: [
                    th("KEY WORDS", {
                        size: SZ_CHAPTER,
                        bold: true,
                        color: COL_DARK,
                    }),
                ],
            }),
            new Paragraph({
                spacing: { before: 0, after: 200 },
                border: {
                    bottom: {
                        style: "single",
                        size: 8,
                        space: 4,
                        color: "8B0000",
                    },
                },
                children: [],
            }),
            ...entries.map(([tag, entry]) => {
                const label = tag.slice(1) // strip @
                const def = entry.definition || entry.description || ""
                return para([
                    t(label + " — ", { bold: true }),
                    ...parseInlineRuns(def),
                ])
            }),
        )
    }

    // ── Assemble document ────────────────────────────────────────────────────
    const header = makeHeader(version)
    const footer = makeFooter()

    const doc = new Document({
        creator: "I Must Kill",
        title: `I Must Kill — The Whitepapers v${version}`,
        description: `Official ruleset document. Version ${version}, ${dateStr}.`,

        styles: {
            default: {
                document: {
                    run: { font: BODY_FONT, size: SZ_BODY },
                },
                heading1: {
                    run: {
                        font: HEAD_FONT,
                        size: SZ_CHAPTER,
                        bold: true,
                        color: COL_DARK,
                    },
                    paragraph: { spacing: { before: 200, after: 160 } },
                },
                heading2: {
                    run: {
                        font: HEAD_FONT,
                        size: SZ_SECTION,
                        bold: false,
                        color: COL_DARK,
                    },
                    paragraph: { spacing: { before: 160, after: 80 } },
                },
                heading3: {
                    run: {
                        font: HEAD_FONT,
                        size: SZ_SUBSECT,
                        bold: false,
                        color: COL_MUTED,
                    },
                    paragraph: { spacing: { before: 120, after: 60 } },
                },
            },
        },

        sections: [
            // ── Section 1: Title page (no columns, wide margins) ────────────
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1.75),
                            right: convertInchesToTwip(1.75),
                        },
                    },
                },
                children: titleChildren,
            },

            // ── Section 2: Rules content (2 columns) ────────────────────────
            {
                properties: {
                    type: SectionType.NEXT_PAGE,
                    column: {
                        count: 2,
                        space: convertInchesToTwip(0.3),
                        equalWidth: true,
                    },
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(0.8),
                            right: convertInchesToTwip(0.8),
                            header: convertInchesToTwip(0.5),
                            footer: convertInchesToTwip(0.5),
                        },
                    },
                },
                headers: { default: header },
                footers: { default: footer },
                children: contentChildren,
            },
        ],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `imk-whitepapers-v${version}.docx`)
}
