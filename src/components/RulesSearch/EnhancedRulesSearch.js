import React, { useState, useEffect, useMemo } from "react"
import {
    Box,
    TextField,
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
    CircularProgress,
    Alert,
} from "@mui/material"
import {
    Search,
    Clear,
    MenuBook,
    Psychology,
    Shield,
    LocalFireDepartment,
    Home,
    Pets,
    Build,
    AutoFixHigh,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import useRulesEngine from "../../hooks/useRulesEngine"

// Page navigation mapping
const PAGE_ROUTES = {
    "character creation": "/character-creation",
    "combat mechanics": "/combat-mechanics",
    "death and resting": "/death-and-resting",
    progression: "/progression",
    casting: "/casting",
    powers: "/powers",
    equipment: "/equipment",
    monsters: "/monsters",
    "quick reference": "/quick-reference",
    "running the game": "/running-the-game",
    "player tools": "/player-tools",
    "gm tools": "/gm-tools",
    about: "/about",
    "what is i must kill": "/about",
    home: "/",
}

const EnhancedRulesSearch = () => {
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const navigate = useNavigate()

    const { rulesData, loading, error, search, getKeywordSuggestions } =
        useRulesEngine()

    // Get suggestions for autocomplete
    const suggestions = useMemo(() => {
        if (searchQuery && searchQuery.length >= 2) {
            return getKeywordSuggestions(searchQuery)
        }
        return []
    }, [searchQuery, getKeywordSuggestions])

    // Combine search results with page navigation suggestions
    const combinedResults = useMemo(() => {
        const results = []

        // Check for page navigation matches first
        const lowerQuery = searchQuery.toLowerCase().trim()
        Object.entries(PAGE_ROUTES).forEach(([pageName, path]) => {
            if (pageName.includes(lowerQuery) && lowerQuery.length >= 2) {
                results.push({
                    type: "page-navigation",
                    title:
                        pageName.charAt(0).toUpperCase() +
                        pageName.slice(1).replace(/-/g, " "),
                    description: `Go to ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page`,
                    path: path,
                    category: "navigation",
                    relevanceScore: pageName === lowerQuery ? 10000 : 5000,
                })
            }
        })

        // Add rule search results
        results.push(...searchResults)

        // Sort by relevance
        return results
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, 15)
    }, [searchQuery, searchResults])

    // Perform search when query changes
    useEffect(() => {
        if (searchQuery.trim() && searchQuery.length >= 2) {
            const results = search(searchQuery)
            setSearchResults(results)
            setIsExpanded(true)
        } else {
            setSearchResults([])
            setIsExpanded(false)
        }
    }, [searchQuery, search])

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value)
    }

    const clearSearch = () => {
        setSearchQuery("")
        setSearchResults([])
        setIsExpanded(false)
    }

    const handleResultClick = (result) => {
        navigate(result.path, {
            state: {
                searchTerm: searchQuery,
                highlightSection: result.section,
            },
        })
        setIsExpanded(false)
        setSearchQuery("")
    }

    const handleSuggestionClick = (suggestion) => {
        // Check if it's a page name
        const lowerSuggestion = suggestion.toLowerCase()
        if (PAGE_ROUTES[lowerSuggestion]) {
            navigate(PAGE_ROUTES[lowerSuggestion])
            setSearchQuery("")
            setIsExpanded(false)
        } else {
            setSearchQuery(suggestion)
        }
    }

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && combinedResults.length > 0) {
            handleResultClick(combinedResults[0])
        }
        if (event.key === "Escape") {
            clearSearch()
            event.target.blur()
        }
    }

    const getResultIcon = (type) => {
        switch (type) {
            case "page-navigation":
                return <Home fontSize='small' />
            case "combat-action":
            case "damage-type":
                return <Shield fontSize='small' />
            case "power":
                return <LocalFireDepartment fontSize='small' />
            case "monster":
                return <Pets fontSize='small' />
            case "equipment":
            case "equipment-rule":
                return <Build fontSize='small' />
            case "stat":
                return <AutoFixHigh fontSize='small' />
            case "rule-section":
            case "rule-subsection":
                return <MenuBook fontSize='small' />
            case "quick-reference":
                return <Psychology fontSize='small' />
            default:
                return <MenuBook fontSize='small' />
        }
    }

    const getResultTypeColor = (type) => {
        switch (type) {
            case "page-navigation":
                return "primary"
            case "combat-action":
                return "error"
            case "damage-type":
                return "warning"
            case "power":
                return "secondary"
            case "equipment-rule":
            case "equipment":
                return "info"
            case "hunt-phase":
                return "success"
            case "monster":
                return "warning"
            case "quick-reference":
                return "primary"
            default:
                return "default"
        }
    }

    const formatResultType = (type) => {
        if (type === "page-navigation") return "Page"
        return type
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={24} />
            </Box>
        )
    }

    if (error) {
        return (
            <Alert severity='error' sx={{ m: 2 }}>
                Error loading rules data: {error}
            </Alert>
        )
    }

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                margin: "0 auto",
            }}
        >
            <TextField
                fullWidth
                variant='outlined'
                placeholder='Search rules, pages, monsters...'
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.03)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "12px",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                        "& fieldset": {
                            border: "none",
                        },
                        "&:hover": {
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.3)"
                                    : "1px solid rgba(0, 0, 0, 0.2)",
                        },
                        "&.Mui-focused": {
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.4)"
                                    : "1px solid rgba(0, 0, 0, 0.3)",
                        },
                    },
                    "& .MuiInputBase-input": {
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                        "&::placeholder": {
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "rgba(0, 0, 0, 0.4)",
                            opacity: 1,
                        },
                    },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position='start'>
                            <Search
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.5)"
                                            : "rgba(0, 0, 0, 0.4)",
                                }}
                            />
                        </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                        <InputAdornment position='end'>
                            <IconButton
                                onClick={clearSearch}
                                edge='end'
                                size='small'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.5)"
                                            : "rgba(0, 0, 0, 0.4)",
                                }}
                            >
                                <Clear fontSize='small' />
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {/* Suggestions chips */}
            <Collapse in={isFocused && suggestions.length > 0 && !isExpanded}>
                <Box
                    sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mt: 1,
                        p: 1,
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.03)",
                        borderRadius: "12px",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.08)",
                        backdropFilter: "blur(10px)",
                    }}
                >
                    {suggestions.slice(0, 6).map((suggestion, index) => (
                        <Chip
                            key={index}
                            label={suggestion}
                            size='small'
                            onClick={() => handleSuggestionClick(suggestion)}
                            sx={{
                                cursor: "pointer",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.08)"
                                        : "rgba(0, 0, 0, 0.05)",
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#e0e0e0"
                                        : "#121212",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.15)"
                                        : "1px solid rgba(0, 0, 0, 0.1)",
                                "&:hover": {
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.15)"
                                            : "rgba(0, 0, 0, 0.1)",
                                },
                            }}
                        />
                    ))}
                </Box>
            </Collapse>

            {/* Search results dropdown */}
            <Collapse in={isExpanded && combinedResults.length > 0}>
                <Box
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        maxHeight: "400px",
                        overflow: "auto",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(31, 31, 31, 0.95)"
                                : "rgba(255, 255, 255, 0.95)",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.15)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: "12px",
                        mt: 1,
                        backdropFilter: "blur(20px)",
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 8px 32px rgba(0, 0, 0, 0.4)"
                                : "0 8px 32px rgba(0, 0, 0, 0.15)",
                    }}
                >
                    <Box
                        sx={{
                            p: 1.5,
                            borderBottom: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(0, 0, 0, 0.08)",
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.6)"
                                        : "rgba(0, 0, 0, 0.5)",
                                fontWeight: 500,
                            }}
                        >
                            {combinedResults.length} result
                            {combinedResults.length !== 1 ? "s" : ""} found
                        </Typography>
                    </Box>

                    <List sx={{ p: 0 }}>
                        {combinedResults.map((result, index) => (
                            <React.Fragment
                                key={`${result.category}-${result.id || result.title}-${index}`}
                            >
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() =>
                                            handleResultClick(result)
                                        }
                                        sx={{
                                            py: 1.5,
                                            px: 2,
                                            transition: "background 0.2s ease",
                                            "&:hover": {
                                                bgcolor: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "rgba(255,255,255,0.08)"
                                                        : "rgba(0,0,0,0.04)",
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                mr: 2,
                                                display: "flex",
                                                alignItems: "center",
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "rgba(255, 255, 255, 0.7)"
                                                        : "rgba(0, 0, 0, 0.6)",
                                            }}
                                        >
                                            {getResultIcon(result.type)}
                                        </Box>
                                        <ListItemText
                                            primary={
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <Typography
                                                        variant='body1'
                                                        sx={{
                                                            fontWeight: 500,
                                                            color: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "#e0e0e0"
                                                                    : "#121212",
                                                        }}
                                                    >
                                                        {result.title}
                                                    </Typography>
                                                    <Chip
                                                        label={formatResultType(
                                                            result.type,
                                                        )}
                                                        size='small'
                                                        color={getResultTypeColor(
                                                            result.type,
                                                        )}
                                                        variant='outlined'
                                                        sx={{
                                                            height: "20px",
                                                            fontSize: "0.7rem",
                                                        }}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Typography
                                                    variant='body2'
                                                    sx={{
                                                        color: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(255, 255, 255, 0.5)"
                                                                : "rgba(0, 0, 0, 0.5)",
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    {result.description
                                                        ?.length > 80
                                                        ? `${result.description.substring(0, 80)}...`
                                                        : result.description}
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {index < combinedResults.length - 1 && (
                                    <Divider
                                        sx={{
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.05)"
                                                    : "rgba(0, 0, 0, 0.05)",
                                        }}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
            </Collapse>

            {/* No results message */}
            <Collapse
                in={
                    isExpanded &&
                    combinedResults.length === 0 &&
                    searchQuery.length >= 2
                }
            >
                <Box
                    sx={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        p: 2,
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(31, 31, 31, 0.95)"
                                : "rgba(255, 255, 255, 0.95)",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.15)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: "12px",
                        mt: 1,
                        backdropFilter: "blur(20px)",
                        textAlign: "center",
                    }}
                >
                    <Typography
                        variant='body2'
                        sx={{
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "rgba(0, 0, 0, 0.5)",
                        }}
                    >
                        No results found for "{searchQuery}"
                    </Typography>
                </Box>
            </Collapse>
        </Box>
    )
}

export default EnhancedRulesSearch
