import React, { useState, useEffect, useMemo } from "react"
import {
    Box,
    TextField,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    InputAdornment,
    IconButton,
    Collapse,
    Divider,
} from "@mui/material"
import { Search, Clear, ExpandMore, ExpandLess } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { fetchAllCards } from "../../utils/cardsClient"

const RulesSearch = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [allContent, setAllContent] = useState([])
    const navigate = useNavigate()

    // Define searchable content structure
    const staticContent = useMemo(
        () => [
            {
                page: "Character Creation",
                path: "/character-creation",
                sections: [
                    {
                        title: "Stats",
                        content:
                            "Body Agility Focus Fate lift push climb drag grapple jump swim catch squeeze pick lock escape manacles perceive listen conjure magic track prey control will resist enchantment luck life force fortune death",
                    },
                    {
                        title: "Standard Stat Arrays",
                        content:
                            "Choose from predefined array 6 6 6 6 or 4 4 8 8 or 3 4 8 9",
                    },
                    {
                        title: "Rolling Stats",
                        content:
                            "Roll 4d10s for character creation assign values to Body Agility Focus Fate maximum stat value is 10 minimum is 2",
                    },
                    {
                        title: "Attack Stat and Hit Points",
                        content:
                            "Choose Body Agility or Focus as attack stat half of Fate rounded up is hit points",
                    },
                    {
                        title: "Equipment",
                        content:
                            "Random start hunters begin with 10 random items",
                    },
                ],
            },
            {
                page: "Combat Mechanics",
                path: "/combat-mechanics",
                sections: [
                    {
                        title: "Actions in Combat",
                        content:
                            "Attack Dodge Brace Draw a Power Flee Negotiate",
                    },
                    {
                        title: "Attack",
                        content:
                            "Roll 1d10 against Attack Stat if roll is lower deal 1 damage 2 for natural 1 crit",
                    },
                    {
                        title: "Dodge",
                        content:
                            "Roll 1d10 against Agility if roll is lower avoid damage",
                    },
                    {
                        title: "Brace",
                        content:
                            "Roll 1d10 against Body if roll is lower reduce incoming damage by 1",
                    },
                    {
                        title: "Weapons",
                        content:
                            "Two-weapons polearms ranged weapons special weapons roll 2d10s when attacking choose lower",
                    },
                    {
                        title: "Physical Damage",
                        content:
                            "Standard damage conventional weapons swords guns clubs mundane armaments creatures harmed physical damage resistance immunity examples swords firearms clubs arrows claws fangs",
                    },
                    {
                        title: "Spiritual Damage",
                        content:
                            "Damage affects soul essence creature effective undead demons supernatural entities vulnerable spiritual damage resistant physical attacks examples prayers holy water consecrated rituals divine magic exorcism curses",
                    },
                    {
                        title: "Hybrid Damage",
                        content:
                            "Damage combines physical spiritual elements effective wider range creatures weapons attacks harm corporeal incorporeal beings examples silver weapons fire elemental attacks enchanted weapons alchemical compounds",
                    },
                    {
                        title: "Shield",
                        content:
                            "Roll additional d10 when bracing choose lower",
                    },
                    {
                        title: "Armor",
                        content:
                            "Roll additional d10 when dodging choose lower",
                    },
                    {
                        title: "No Armor",
                        content: "Roll 2d10s when dodging choose lower",
                    },
                    {
                        title: "Statuses",
                        content:
                            "Frightened cannot attack willingly move towards source of fear Unconscious cannot defend make attacks move attacks automatically succeed",
                    },
                ],
            },
            {
                page: "Death and Resting",
                path: "/death-and-resting",
                sections: [
                    {
                        title: "Death",
                        content:
                            "When reach 0 hit points test Fate on success live with 1 hit point",
                    },
                    {
                        title: "Grit Teeth",
                        content:
                            "Once per night's rest regain 1 hit point during 1-minute respite from combat",
                    },
                    {
                        title: "Night's Rest",
                        content:
                            "Comfortable place to sleep inn farmer's barn full hit points regain all gathered powers recharge abilities gain rerolls from insight",
                    },
                ],
            },
            {
                page: "Progression",
                path: "/progression",
                sections: [
                    {
                        title: "Leveling Up",
                        content:
                            "Level up after survive Fight and rest roll 1d10 against 1 chosen stat if roll is lower increase stat by 1 max 9 or gain Insight",
                    },
                    {
                        title: "Insight",
                        content:
                            "All hunters start with 1 Insight reroll any tests number of times equal to insight quantity per day after Night's Rest see hidden creatures lights objects learn about cosmos see threats to mankind capped at 10 ascendant",
                    },
                    {
                        title: "Ascendant",
                        content:
                            "Hunter Ascendant audience with Old Man Ancient Mistress make wish price all 10 insight points limitations cannot alter flow of time",
                    },
                ],
            },
            {
                page: "Powers",
                path: "/powers",
                sections: [
                    {
                        title: "Drawing Powers",
                        content:
                            "Test Focus to gather power from deck hold up to 3 powers at time",
                    },
                    {
                        title: "Using Powers",
                        content:
                            "Cast gathered power follow description discard after use or keep if specified",
                    },
                ],
            },
            {
                page: "Running the Game",
                path: "/running-the-game",
                sections: [
                    {
                        title: "Hunt Outline",
                        content:
                            "Hook introduce scenario Negotiate Pay test Focus high pay low pay Rumor Phase meet someone rumors Tracking Monster test Fate find or ambush Fight battle monster Denouement collect bounty replenish equipment rest level up",
                    },
                    {
                        title: "Hidden Creatures",
                        content:
                            "Monsters have Insight requirement before hunter can see them metaphysical threats challenge perception appear as beasts rationalized by context werewolf as large bear changeling as deformed man",
                    },
                    {
                        title: "Downsides of Insight",
                        content:
                            "Higher insight enables perception of entities others cannot exceed fellow hunters insight scores pose risks only hunter with required insight can see and attack draws attention",
                    },
                    {
                        title: "Monster Tables",
                        content:
                            "Actions determined by rolling d10 Attack multi-attack target more than 1 creature Special Ability uses unique power Defend reduce incoming damage Move reposition",
                    },
                ],
            },
        ],
        [],
    )

    // Load dynamic content (powers, equipment, monsters)
    useEffect(() => {
        const loadDynamicContent = async () => {
            try {
                const [cardsData, equipmentResponse] = await Promise.all([
                    fetchAllCards(),
                    fetch("/equipment.json"),
                ])

                const equipmentData = await equipmentResponse.json()

                const dynamicContent = [
                    {
                        page: "Power Cards",
                        path: "/power-cards",
                        sections:
                            cardsData.powers?.map((power) => ({
                                title: power.name,
                                content: `${power.deck} ${power.rarity} ${power.description}`,
                                type: "power",
                            })) || [],
                    },
                    {
                        page: "Equipment",
                        path: "/equipment",
                        sections:
                            equipmentData.equipment?.map((item) => ({
                                title: item.name,
                                content: item.description,
                                type: "equipment",
                            })) || [],
                    },
                    {
                        page: "Monsters",
                        path: "/monsters",
                        sections:
                            cardsData.monsters?.map((monster) => ({
                                title: monster.Name || monster.name,
                                content: `${monster.Description} ${monster.Actions} ${monster.Damage} ${monster["Special Abilities"]} Body ${monster.Body} Agility ${monster.Agility} Focus ${monster.Focus} Fate ${monster.Fate} Insight ${monster.Insight}`,
                                type: "monster",
                                path: `/monsters/${monster.Name || monster.name}`,
                            })) || [],
                    },
                ]

                setAllContent([...staticContent, ...dynamicContent])
            } catch (error) {
                console.error("Error loading dynamic content:", error)
                setAllContent(staticContent)
            }
        }

        loadDynamicContent()
    }, [staticContent])

    // Search function
    const performSearch = (query) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        const searchTerms = query.toLowerCase().trim().split(/\s+/)
        const results = []

        allContent.forEach((page) => {
            page.sections.forEach((section) => {
                const searchText =
                    `${section.title} ${section.content}`.toLowerCase()

                // Check if all search terms are present
                const matchesAllTerms = searchTerms.every((term) =>
                    searchText.includes(term),
                )

                if (matchesAllTerms) {
                    // Calculate relevance score
                    let score = 0
                    searchTerms.forEach((term) => {
                        const titleMatches = section.title
                            .toLowerCase()
                            .includes(term)
                        const contentMatches = section.content
                            .toLowerCase()
                            .includes(term)

                        if (titleMatches) score += 10
                        if (contentMatches) score += 1
                    })

                    // Create snippet
                    const words = section.content.split(/\s+/)
                    let snippet = section.content

                    if (words.length > 20) {
                        // Find the best snippet around the search terms
                        const searchTerm = searchTerms[0]
                        const searchIndex = section.content
                            .toLowerCase()
                            .indexOf(searchTerm)

                        if (searchIndex !== -1) {
                            const start = Math.max(0, searchIndex - 50)
                            const end = Math.min(
                                section.content.length,
                                searchIndex + 100,
                            )
                            snippet = section.content.substring(start, end)
                            if (start > 0) snippet = "..." + snippet
                            if (end < section.content.length)
                                snippet = snippet + "..."
                        } else {
                            snippet = words.slice(0, 20).join(" ") + "..."
                        }
                    }

                    results.push({
                        page: page.page,
                        path: section.path || page.path,
                        section: section.title,
                        snippet,
                        type: section.type || "rule",
                        score,
                    })
                }
            })
        })

        // Sort by relevance score (highest first)
        results.sort((a, b) => b.score - a.score)
        setSearchResults(results.slice(0, 10)) // Limit to top 10 results
    }

    // Handle search input
    const handleSearchChange = (event) => {
        const query = event.target.value
        setSearchQuery(query)
        performSearch(query)

        // Auto-expand if there are results
        if (query.trim() && !isExpanded) {
            setIsExpanded(true)
        }
    }

    // Clear search
    const clearSearch = () => {
        setSearchQuery("")
        setSearchResults([])
        setIsExpanded(false)
    }

    // Navigate to result
    const handleResultClick = (result) => {
        navigate(result.path)
        clearSearch()
    }

    // Get chip color based on type
    const getChipColor = (type) => {
        switch (type) {
            case "power":
                return "secondary"
            case "equipment":
                return "primary"
            case "monster":
                return "error"
            default:
                return "default"
        }
    }

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: "600px",
                margin: "0 auto",
                mb: 3,
            }}
        >
            <TextField
                fullWidth
                variant='outlined'
                placeholder='Search rules, powers, equipment, monsters...'
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        backgroundColor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#2a2a2a"
                                : "#ffffff",
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                        "& fieldset": {
                            borderColor: (theme) =>
                                theme.palette.mode === "dark" ? "#555" : "#ccc",
                        },
                        "&:hover fieldset": {
                            borderColor: (theme) =>
                                theme.palette.mode === "dark" ? "#777" : "#999",
                        },
                        "&.Mui-focused fieldset": {
                            borderColor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#90caf9"
                                    : "#0056b3",
                        },
                    },
                    "& .MuiInputBase-input::placeholder": {
                        color: (theme) =>
                            theme.palette.mode === "dark" ? "#999" : "#666",
                        opacity: 1,
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position='start'>
                            <Search
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#999"
                                            : "#666",
                                }}
                            />
                        </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                        <InputAdornment position='end'>
                            <IconButton
                                onClick={clearSearch}
                                size='small'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#999"
                                            : "#666",
                                }}
                            >
                                <Clear />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {/* Results dropdown */}
            <Collapse in={searchResults.length > 0 && isExpanded}>
                <Paper
                    sx={{
                        mt: 1,
                        maxHeight: "400px",
                        overflow: "auto",
                        backgroundColor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#1f1f1f"
                                : "#ffffff",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid #555"
                                : "1px solid #ccc",
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid #333"
                                    : "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography variant='body2' color='text.secondary'>
                            {searchResults.length} result
                            {searchResults.length !== 1 ? "s" : ""} found
                        </Typography>
                        <IconButton
                            onClick={() => setIsExpanded(false)}
                            size='small'
                        >
                            <ExpandLess />
                        </IconButton>
                    </Box>

                    <List dense>
                        {searchResults.map((result, index) => (
                            <React.Fragment key={index}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() =>
                                            handleResultClick(result)
                                        }
                                        sx={{
                                            "&:hover": {
                                                backgroundColor: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#333"
                                                        : "#f5f5f5",
                                            },
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    <Typography
                                                        variant='subtitle2'
                                                        component='span'
                                                    >
                                                        {result.section}
                                                    </Typography>
                                                    <Chip
                                                        label={result.type}
                                                        size='small'
                                                        color={getChipColor(
                                                            result.type,
                                                        )}
                                                        sx={{
                                                            fontSize: "0.7rem",
                                                            height: "18px",
                                                        }}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography
                                                        variant='body2'
                                                        color='text.secondary'
                                                        sx={{
                                                            fontSize:
                                                                "0.875rem",
                                                            mb: 0.5,
                                                        }}
                                                    >
                                                        {result.snippet}
                                                    </Typography>
                                                    <Typography
                                                        variant='caption'
                                                        color='primary'
                                                        sx={{
                                                            fontStyle: "italic",
                                                        }}
                                                    >
                                                        from {result.page}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {index < searchResults.length - 1 && (
                                    <Divider />
                                )}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            </Collapse>

            {/* Show expand button if there are results but collapsed */}
            {searchResults.length > 0 && !isExpanded && (
                <Box sx={{ textAlign: "center", mt: 1 }}>
                    <IconButton
                        onClick={() => setIsExpanded(true)}
                        sx={{
                            backgroundColor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#1f1f1f"
                                    : "#f5f5f5",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid #555"
                                    : "1px solid #ccc",
                            "&:hover": {
                                backgroundColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#333"
                                        : "#e0e0e0",
                            },
                        }}
                    >
                        <ExpandMore />
                    </IconButton>
                </Box>
            )}
        </Box>
    )
}

export default RulesSearch
