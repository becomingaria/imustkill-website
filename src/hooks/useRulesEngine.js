import { useState, useEffect, useMemo, useCallback } from "react"

/* ────────────────────────────────────────────────────────────────
 *  useRulesEngine
 * ──────────────────────────────────────────────────────────────── */
export const useRulesEngine = () => {
    const [rulesData, setRulesData] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    /* ───────────────── Load JSON on mount ───────────────────────── */
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)

                const dbResp = await fetch("/rules-database.json")
                const db = await dbResp.json()

                const catFiles = Object.entries(
                    db.rulesDatabase.categories,
                ).map(async ([key, cat]) => {
                    const r = await fetch(`/${cat.file}`)
                    return [key, await r.json()]
                })

                setRulesData({
                    database: db.rulesDatabase,
                    ...Object.fromEntries(await Promise.all(catFiles)),
                })
                setError(null)
            } catch (e) {
                console.error("Error loading rules:", e)
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    /* ───────────────── Clean-ups ────────────────────────────────── */
    if (rulesData.database?.quickReference) {
        Object.values(rulesData.database.quickReference).forEach((items) =>
            items.forEach((i) => delete i["%Source"]),
        )
    }

    if (rulesData.database?.categories) {
        const seen = new Map()
        const dedupe = (arr) =>
            arr.filter((src) => {
                const k = src.toLowerCase()
                if (seen.has(k)) return false
                seen.set(k, true)
                return true
            })

        Object.entries(rulesData.database.categories).forEach(([cat]) => {
            const main = rulesData[cat] && Object.values(rulesData[cat])[0]
            if (!main?.sections) return // <-- Fix: only proceed if sections exist
            main.sections.forEach((sec) => {
                if (Array.isArray(sec["%Source"]))
                    sec["%Source"] = dedupe(sec["%Source"])
                ;(sec.subsections ?? []).forEach((sub) => {
                    if (Array.isArray(sub["%Source"]))
                        sub["%Source"] = dedupe(sub["%Source"])
                })
            })
        })
    }

    /* ───────────────── Build searchableContent ─────────────────── */
    const searchableContent = useMemo(() => {
        if (!rulesData.database) return []
        const content = []

        /* quick-reference */
        rulesData.database.quickReference &&
            Object.entries(rulesData.database.quickReference).forEach(
                ([cat, items]) =>
                    items.forEach((i) =>
                        content.push({
                            type: "quick-reference",
                            category: cat,
                            title: i.term || i.stat || i.type,
                            description:
                                i.description ||
                                i.uses?.join(", ") ||
                                i.effective_against,
                            keywords: i.keywords || [],
                            path: "/quick-reference",
                            section: i.term || i.stat || i.type,
                            id: i.term || i.stat || i.type,
                            isQuickReference: true,
                        }),
                    ),
            )

        /* categories */
        Object.entries(rulesData.database.categories).forEach(([catKey]) => {
            const main =
                rulesData[catKey] && Object.values(rulesData[catKey])[0]
            if (!main?.sections) return

            main.sections.forEach((sec) => {
                /* section */
                content.push({
                    type: "rule-section",
                    category: catKey,
                    title: sec.title,
                    description: sec.description || "",
                    keywords: sec.keywords || [],
                    path: `/${catKey}#${sec.id}`, // e.g. "/combat-mechanics#actions"
                    section: sec.title,
                    id: sec.id,
                })

                /* subsections */
                ;(sec.subsections ?? []).forEach((sub) =>
                    content.push({
                        type: "rule-subsection",
                        category: catKey,
                        title: sub.title,
                        description: sub.description || "",
                        keywords: sub.keywords || [],
                        path: `/${catKey}`,
                        section: sub.title,
                        id: sub.id,
                    }),
                )

                /* ── stats in character-creation/stats ── */
                if (Array.isArray(sec.content)) {
                    sec.content.forEach((entry) => {
                        const slug = entry.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                        content.push({
                            type: "stat",
                            category: catKey,
                            title: entry.name,
                            description: entry.description || "",
                            keywords: entry.keywords || [],
                            path: `/${catKey}#${slug}`,
                            section: entry.name,
                            id: slug,
                            isSourceLinked: true,
                            sourceNames: sec["%Source"] || [],
                        })
                    })
                }

                /* ── combat actions (PATCHED) ── */
                ;(sec.actions ?? []).forEach((a) =>
                    content.push({
                        type: "combat-action",
                        category: catKey,
                        title: a.name,
                        description: a.description,
                        keywords: a.keywords || [],
                        path: `/${catKey}#${a.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`,
                        section: a.name,
                        id: a.name.toLowerCase().replace(/\s+/g, "-"),
                        isSourceLinked: true, // ← NEW
                        sourceNames: sec["%Source"] || [], // ← NEW
                    }),
                )

                /* other blocks unchanged … */
                ;(sec.types ?? []).forEach((t) =>
                    content.push({
                        type: "damage-type",
                        category: catKey,
                        title: t.name,
                        description: t.description,
                        keywords: t.keywords || [],
                        path: `/${catKey}`,
                        section: t.name,
                        examples: t.examples || [],
                    }),
                )
                ;(sec.conditions ?? []).forEach((c) =>
                    content.push({
                        type: "status-condition",
                        category: catKey,
                        title: c.name,
                        description: c.description,
                        keywords: c.keywords || [],
                        path: `/${catKey}`,
                        section: c.name,
                    }),
                )
                ;(sec.equipment ?? []).forEach((e) =>
                    content.push({
                        type: "equipment-rule",
                        category: catKey,
                        title: e.name,
                        description: e.effect,
                        keywords: e.keywords || [],
                        path: `/${catKey}`,
                        section: e.name,
                    }),
                )
                ;(sec.phases ?? []).forEach((p) =>
                    content.push({
                        type: "hunt-phase",
                        category: catKey,
                        title: p.name,
                        description: p.description,
                        keywords: [
                            ...(sec.keywords || []),
                            p.name.toLowerCase(),
                        ],
                        path: `/${catKey}`,
                        section: p.name,
                    }),
                )
            })
        })

        return content
    }, [rulesData])

    /* ───────────────── Search ───────────────────────────────────── */
    const search = useCallback(
        (query) => {
            if (!query.trim()) return []

            const terms = query.toLowerCase().trim().split(/\s+/)
            const results = []
            let canonicalStatSection = null

            /* pass 1: hits (no quick-reference yet) */
            searchableContent.forEach((item) => {
                const haystack = (
                    item.title +
                    " " +
                    item.description +
                    " " +
                    item.keywords.join(" ")
                ).toLowerCase()

                if (!terms.every((t) => haystack.includes(t))) return
                if (item.isQuickReference) return

                let score = 0
                if (item.title.toLowerCase().includes(query.toLowerCase()))
                    score += 10
                score +=
                    item.keywords.filter((k) =>
                        k.toLowerCase().includes(query.toLowerCase()),
                    ).length * 5
                if (
                    item.description.toLowerCase().includes(query.toLowerCase())
                )
                    score += 2
                if (
                    item.keywords.some(
                        (k) =>
                            k.startsWith("@") &&
                            k.toLowerCase().includes(query.toLowerCase()),
                    )
                )
                    score += 1000
                if (item.isSourceLinked) score += 2000
                if (
                    item.sourceNames?.some(
                        (s) =>
                            s.replace(/^[@%]/, "").toLowerCase() ===
                            query.toLowerCase(),
                    )
                ) {
                    score += 5000
                }

                /* direct %Source bump */
                if (item.id && rulesData.database) {
                    const cats = rulesData.database.categories || {}
                    for (const catKey of Object.keys(cats)) {
                        const main =
                            rulesData[catKey] &&
                            Object.values(rulesData[catKey])[0]
                        if (!main?.sections) continue
                        const hit = main.sections.find(
                            (sec) =>
                                sec.id === item.id &&
                                sec["%Source"]?.some((src) =>
                                    terms.includes(
                                        src.replace(/^[@%]/, "").toLowerCase(),
                                    ),
                                ),
                        )
                        if (hit) {
                            score += 20000
                            if (catKey === "character-creation")
                                canonicalStatSection = item
                            break
                        }
                    }
                }

                results.push({ ...item, relevanceScore: score })
            })

            /* pass 2: quick-reference */
            searchableContent.forEach((item) => {
                if (!item.isQuickReference) return
                const haystack =
                    item.title +
                    " " +
                    item.description +
                    " " +
                    item.keywords.join(" ")
                if (terms.every((t) => haystack.toLowerCase().includes(t)))
                    results.push({ ...item, relevanceScore: 0 })
            })

            /* ── canonical filter (patched) ── */
            const canonicalResults = results.filter((item) => {
                if (item.type === "stat") return true
                if (item.isQuickReference || !item.id || !rulesData.database)
                    return false

                /* NEW: combat-action canonical check */
                if (item.type === "combat-action") {
                    const main =
                        rulesData[item.category] &&
                        Object.values(rulesData[item.category])[0]
                    if (!main?.sections) return false

                    return main.sections.some(
                        (sec) =>
                            sec.actions?.some(
                                (a) =>
                                    a.name.toLowerCase() ===
                                    item.title.toLowerCase(),
                            ) &&
                            sec["%Source"]?.some((src) =>
                                terms.some(
                                    (term) =>
                                        src
                                            .replace(/^[@%]/, "")
                                            .toLowerCase() ===
                                        term.replace(/^[@%]/, "").toLowerCase(),
                                ),
                            ),
                    )
                }

                /* original checks for other types */
                const cats = rulesData.database.categories || {}
                for (const catKey of Object.keys(cats)) {
                    const main =
                        rulesData[catKey] && Object.values(rulesData[catKey])[0]
                    if (!main?.sections) continue
                    const sec = main.sections.find((s) => s.id === item.id)
                    if (!sec) continue

                    if (
                        sec["%Source"]?.some((src) =>
                            terms.includes(
                                src.replace(/^[@%]/, "").toLowerCase(),
                            ),
                        )
                    )
                        return true

                    if (
                        sec.content?.some((c) =>
                            terms.includes(c.name?.toLowerCase()),
                        )
                    )
                        return true
                }
                return false
            })

            /* sort + trim */
            let sorted = canonicalResults
                .sort((a, b) =>
                    b.relevanceScore !== a.relevanceScore
                        ? b.relevanceScore - a.relevanceScore
                        : a.title.localeCompare(b.title),
                )
                .slice(0, 20)

            /* ensure canonical stat first */
            if (canonicalStatSection) {
                const idx = sorted.findIndex(
                    (i) =>
                        i.id === canonicalStatSection.id &&
                        i.category === canonicalStatSection.category,
                )
                if (idx > 0) {
                    const [c] = sorted.splice(idx, 1)
                    sorted.unshift(c)
                }
            }

            /* nearest-result fallback */
            if (sorted.length === 0) {
                const pool =
                    results.filter((r) => !r.isQuickReference).length > 0
                        ? results.filter((r) => !r.isQuickReference)
                        : results

                sorted = pool
                    .sort((a, b) =>
                        b.relevanceScore !== a.relevanceScore
                            ? b.relevanceScore - a.relevanceScore
                            : a.title.localeCompare(b.title),
                    )
                    .slice(0, 20)
            }

            return sorted
        },
        [searchableContent, rulesData],
    )

    /* ───────────────── Helpers (unchanged) ─────────────────────── */
    const getRule = useCallback(
        (cat, id) =>
            rulesData[cat]?.[Object.keys(rulesData[cat])[0]]?.sections?.find(
                (s) => s.id === id,
            ) || null,
        [rulesData],
    )

    const getCategoryRules = useCallback(
        (cat) => rulesData[cat] && Object.values(rulesData[cat])[0],
        [rulesData],
    )

    const getKeywordSuggestions = useCallback(
        (query) => {
            if (!query || query.length < 2) return []

            const lowerQuery = query.toLowerCase()
            const suggestions = new Set()

            // Add matching rule titles
            searchableContent.forEach((item) => {
                if (item.title.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(item.title)
                }
                // Add matching keywords
                item.keywords?.forEach((keyword) => {
                    const cleanKeyword = keyword.replace(/^[@%]/, "")
                    if (cleanKeyword.toLowerCase().includes(lowerQuery)) {
                        suggestions.add(cleanKeyword)
                    }
                })
            })

            // Add page names for navigation
            const pages = [
                "Character Creation",
                "Combat Mechanics",
                "Death and Resting",
                "Progression",
                "Casting",
                "Powers",
                "Equipment",
                "Monsters",
                "Quick Reference",
                "Running the Game",
                "Player Tools",
                "GM Tools",
            ]
            pages.forEach((page) => {
                if (page.toLowerCase().includes(lowerQuery)) {
                    suggestions.add(page)
                }
            })

            // Add reference IDs
            if (rulesData.database?.referenceIds) {
                Object.entries(rulesData.database.referenceIds).forEach(
                    ([refId, refData]) => {
                        const cleanId = refId.replace(/^[@%]/, "")
                        if (
                            cleanId.toLowerCase().includes(lowerQuery) ||
                            refData.title.toLowerCase().includes(lowerQuery)
                        ) {
                            suggestions.add(refData.title)
                        }
                    },
                )
            }

            // Sort suggestions by relevance (exact match first, then starts with, then contains)
            return Array.from(suggestions)
                .sort((a, b) => {
                    const aLower = a.toLowerCase()
                    const bLower = b.toLowerCase()
                    const aExact = aLower === lowerQuery
                    const bExact = bLower === lowerQuery
                    const aStarts = aLower.startsWith(lowerQuery)
                    const bStarts = bLower.startsWith(lowerQuery)

                    if (aExact && !bExact) return -1
                    if (!aExact && bExact) return 1
                    if (aStarts && !bStarts) return -1
                    if (!aStarts && bStarts) return 1
                    return a.localeCompare(b)
                })
                .slice(0, 10)
        },
        [searchableContent, rulesData],
    )

    const getSourceMap = useCallback(() => {
        if (!rulesData.database) return new Map()
        const map = new Map()

        Object.keys(rulesData.database.categories || {}).forEach((catKey) => {
            const main =
                rulesData[catKey] && Object.values(rulesData[catKey])[0]
            if (!main?.sections) return

            const scan = (arr) =>
                arr.forEach((sec) => {
                    sec["%Source"]?.forEach((name) => {
                        if (!map.has(name)) map.set(name, [])
                        map.get(name).push({
                            category: catKey,
                            categoryTitle:
                                rulesData.database.categories[catKey]?.title,
                            sectionId: sec.id,
                            sectionTitle: sec.title,
                            description: sec.description || "",
                            path: `/${catKey}#${sec.id}`,
                        })
                    })
                    scan(sec.subsections ?? [])
                })

            scan(main.sections)
        })

        return map
    }, [rulesData])

    const getUncategorizedRules = useCallback(() => {
        if (!rulesData.database) return []
        const allRefs = Object.keys(rulesData.database.referenceIds || {})
        const sourced = new Set(getSourceMap().keys())
        return allRefs.filter((r) => !sourced.has(r))
    }, [rulesData, getSourceMap])

    /* ───────────────── return ──────────────────────────────────── */
    return {
        searchableContent,
        search,
        getRule,
        getCategoryRules,
        getSourceMap,
        getUncategorizedRules,
        getKeywordSuggestions,
        rulesData,
        loading,
        error,
    }
}

export default useRulesEngine
