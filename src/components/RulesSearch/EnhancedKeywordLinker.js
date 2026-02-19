import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Tooltip, Box } from "@mui/material"
import useRulesEngine from "../../hooks/useRulesEngine"

const EnhancedKeywordLinker = ({
    children,
    disabled = false,
    referencesOnly = true,
}) => {
    const [allContent, setAllContent] = useState({
        powers: [],
        equipment: [],
        monsters: [],
    })

    const { searchableContent, rulesData } = useRulesEngine()

    // Load dynamic content for power/equipment/monster references
    useEffect(() => {
        const loadDynamicContent = async () => {
            try {
                const [powersResponse, equipmentResponse, monstersResponse] =
                    await Promise.all([
                        fetch("/powers.json"),
                        fetch("/equipment.json"),
                        fetch("/monsters.json"),
                    ])

                const powersData = await powersResponse.json()
                const equipmentData = await equipmentResponse.json()
                const monstersData = await monstersResponse.json()

                setAllContent({
                    powers: powersData.powers || [],
                    equipment: equipmentData.equipment || [],
                    monsters: monstersData || [],
                })
            } catch (error) {
                console.error("Error loading dynamic content:", error)
            }
        }

        loadDynamicContent()
    }, [])

    // Create enhanced keyword mappings with dynamic content
    const enhancedKeywordMappings = useMemo(() => {
        const mappings = new Map()

        // Add rules content from searchableContent
        searchableContent.forEach((item) => {
            // Add main title
            mappings.set(item.title.toLowerCase(), {
                page: item.category,
                path: item.path,
                section: item.section,
                description: item.description,
                type: item.type,
            })

            // Add keywords
            item.keywords.forEach((keyword) => {
                mappings.set(keyword.toLowerCase(), {
                    page: item.category,
                    path: item.path,
                    section: item.section,
                    description: item.description,
                    type: item.type,
                })
            })
        })

        // Add power names
        allContent.powers?.forEach((power) => {
            mappings.set(power.name.toLowerCase(), {
                page: "Powers",
                path: "/powers",
                section: power.name,
                description: `${power.deck} power - ${power.description}`,
                type: "power",
            })
        })

        // Add equipment names
        allContent.equipment?.forEach((item) => {
            mappings.set(item.name.toLowerCase(), {
                page: "Equipment",
                path: "/equipment",
                section: item.name,
                description: item.description,
                type: "equipment",
            })
        })

        // Add monster names
        allContent.monsters?.forEach((monster) => {
            mappings.set(monster.Name.toLowerCase(), {
                page: "Monsters",
                path: `/monsters/${monster.Name}`,
                section: monster.Name,
                description: monster.Description,
                type: "monster",
            })
        })

        // Add reference IDs from rules database
        if (rulesData?.database?.referenceIds) {
            Object.entries(rulesData.database.referenceIds).forEach(
                ([refId, refData]) => {
                    // Map category to the correct route path
                    let routePath = `/${refData.category}`
                    if (refData.category === "character-creation") {
                        routePath = "/character-creation"
                    } else if (refData.category === "combat-mechanics") {
                        routePath = "/combat-mechanics"
                    } else if (refData.category === "death-and-resting") {
                        routePath = "/death-and-resting"
                    } else if (refData.category === "running-the-game") {
                        routePath = "/running-the-game"
                    } else if (refData.category === "quick-reference") {
                        routePath = "/quick-reference"
                    }

                    // Add section anchor if available
                    if (refData.section) {
                        routePath += `#${refData.section}`
                    }

                    mappings.set(refId.toLowerCase(), {
                        page: refData.category,
                        path: routePath,
                        section: refData.section,
                        description: refData.description,
                        type: "reference",
                        title: refData.title,
                    })
                },
            )
        }

        return mappings
    }, [searchableContent, allContent, rulesData])

    // Function to process text and add keyword links
    const processText = (text) => {
        if (disabled || typeof text !== "string") {
            return text
        }

        // First handle reference IDs (like @Body, @Focus, etc.)
        const processedText = text.replace(/@(\w+)/g, (match, refId) => {
            const fullRefId = `@${refId}`
            const mapping = enhancedKeywordMappings.get(fullRefId.toLowerCase())
            if (mapping) {
                return `<REFERENCE_LINK>${fullRefId}</REFERENCE_LINK>`
            }
            return match
        })

        // Handle ***bold italic***, **bold**, and *italic* markdown (replace with special tags)
        let mdProcessed = processedText
            .replace(/\*\*\*(.+?)\*\*\*/g, "<BOLDITALIC>$1</BOLDITALIC>")
            .replace(/\*\*(.+?)\*\*/g, "<BOLD>$1</BOLD>")
            .replace(/\*(.+?)\*/g, "<ITALIC>$1</ITALIC>")

        // Split text while preserving spaces, punctuation, special reference tags, and markdown tags
        const parts = mdProcessed.split(
            /(\s+|[.,!?;:()[\]{}'""-]|<REFERENCE_LINK>.*?<\/REFERENCE_LINK>|<BOLDITALIC>.*?<\/BOLDITALIC>|<BOLD>.*?<\/BOLD>|<ITALIC>.*?<\/ITALIC>)/g,
        )

        return parts.map((part, index) => {
            // Handle <BOLDITALIC> tags
            const boldItalicMatch = part.match(
                /<BOLDITALIC>(.*?)<\/BOLDITALIC>/,
            )
            if (boldItalicMatch) {
                return (
                    <span
                        key={index}
                        style={{ fontWeight: "bold", fontStyle: "italic" }}
                    >
                        {boldItalicMatch[1]}
                    </span>
                )
            }
            // Handle <BOLD> tags
            const boldMatch = part.match(/<BOLD>(.*?)<\/BOLD>/)
            if (boldMatch) {
                return <strong key={index}>{boldMatch[1]}</strong>
            }
            // Handle <ITALIC> tags
            const italicMatch = part.match(/<ITALIC>(.*?)<\/ITALIC>/)
            if (italicMatch) {
                return <em key={index}>{italicMatch[1]}</em>
            }

            // Handle reference links
            const refMatch = part.match(
                /<REFERENCE_LINK>(.*?)<\/REFERENCE_LINK>/,
            )
            if (refMatch) {
                const refId = refMatch[1]
                const mapping = enhancedKeywordMappings.get(refId.toLowerCase())

                // Remove the @ symbol for display
                const displayText = refId.startsWith("@")
                    ? refId.substring(1)
                    : refId

                return (
                    <Tooltip
                        key={index}
                        title={
                            <Box sx={{ p: 1 }}>
                                <Box sx={{ fontWeight: "bold", mb: 0.5 }}>
                                    {mapping.title}
                                </Box>
                                <Box sx={{ fontSize: "0.875rem" }}>
                                    {mapping.description}
                                </Box>
                                <Box
                                    sx={{
                                        fontSize: "0.75rem",
                                        mt: 0.5,
                                        opacity: 0.8,
                                    }}
                                >
                                    Click to view: {mapping.page}
                                </Box>
                            </Box>
                        }
                        arrow
                        placement='top'
                    >
                        <Link
                            to={mapping.path}
                            style={{
                                color: "#1976d2",
                                textDecoration: "none",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontFamily:
                                    "'Roboto Mono', 'Courier New', monospace",
                                fontSize: "0.95em",
                                padding: "1px 4px",
                                borderRadius: "3px",
                                backgroundColor: "rgba(25, 118, 210, 0.08)",
                                border: "1px solid rgba(25, 118, 210, 0.2)",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor =
                                    "rgba(25, 118, 210, 0.15)"
                                e.target.style.borderColor =
                                    "rgba(25, 118, 210, 0.4)"
                                e.target.style.transform = "translateY(-1px)"
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor =
                                    "rgba(25, 118, 210, 0.08)"
                                e.target.style.borderColor =
                                    "rgba(25, 118, 210, 0.2)"
                                e.target.style.transform = "translateY(0)"
                            }}
                        >
                            {displayText}
                        </Link>
                    </Tooltip>
                )
            }

            // Handle regular keyword matching (skip if referencesOnly is true)
            if (!referencesOnly) {
                const cleanWord = part
                    .toLowerCase()
                    .replace(/[.,!?;:()[\]{}'""-]/g, "")

                if (cleanWord && enhancedKeywordMappings.has(cleanWord)) {
                    const mapping = enhancedKeywordMappings.get(cleanWord)

                    // Don't link reference IDs that are already processed
                    if (mapping.type === "reference") {
                        return <span key={index}>{part}</span>
                    }

                    return (
                        <Tooltip
                            key={index}
                            title={
                                <Box sx={{ p: 1 }}>
                                    <Box sx={{ fontWeight: "bold", mb: 0.5 }}>
                                        {mapping.section}
                                    </Box>
                                    <Box sx={{ fontSize: "0.875rem" }}>
                                        {mapping.description}
                                    </Box>
                                    <Box
                                        sx={{
                                            fontSize: "0.75rem",
                                            mt: 0.5,
                                            opacity: 0.8,
                                        }}
                                    >
                                        From: {mapping.page}
                                    </Box>
                                </Box>
                            }
                            arrow
                            placement='top'
                        >
                            <Link
                                to={mapping.path}
                                style={{
                                    color: "inherit",
                                    textDecoration: "underline",
                                    textDecorationColor:
                                        "rgba(25, 118, 210, 0.4)",
                                    textUnderlineOffset: "2px",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.textDecorationColor =
                                        "rgba(25, 118, 210, 0.8)"
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.textDecorationColor =
                                        "rgba(25, 118, 210, 0.4)"
                                }}
                            >
                                {part}
                            </Link>
                        </Tooltip>
                    )
                }
            }

            return <span key={index}>{part}</span>
        })
    }

    if (React.isValidElement(children)) {
        // If children is a React element, clone it with processed text content
        return React.cloneElement(children, {
            children: processText(children.props.children),
        })
    }

    return <span>{processText(children)}</span>
}

export default EnhancedKeywordLinker
