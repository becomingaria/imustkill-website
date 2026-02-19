import React, { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import {
    Container,
    Typography,
    TextField,
    List,
    ListItem,
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ReplayIcon from "@mui/icons-material/Replay"
import HomeButton from "../components/HomeButton"
import Section from "../components/Section"

const Powers = () => {
    // eslint-disable-next-line no-unused-vars
    const location = useLocation()
    const [powers, setPowers] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDecks, setSelectedDecks] = useState(["All"])
    const [selectedRarities, setSelectedRarities] = useState(["All"])
    const [availableDecks, setAvailableDecks] = useState(["All"])
    const [availableRarities, setAvailableRarities] = useState(["All"])

    // Expanded state for accordions (collapsed by default)
    const [deckAccordionExpanded, setDeckAccordionExpanded] = useState(false)
    const [rarityAccordionExpanded, setRarityAccordionExpanded] =
        useState(false)

    // On first mount, check if we should load from localStorage
    useEffect(() => {
        const savedSelections = localStorage.getItem("powerDeckSelections")
        const savedRarities = localStorage.getItem("powerRaritySelections")

        if (savedSelections) {
            try {
                const parsedSelections =
                    JSON.stringify(savedSelections) === JSON.stringify(["All"])
                        ? ["All"]
                        : JSON.parse(savedSelections)
                setSelectedDecks(parsedSelections)
            } catch (error) {
                console.error("Error parsing saved deck selections:", error)
            }
        }

        if (savedRarities) {
            try {
                const parsedRarities =
                    JSON.stringify(savedRarities) === JSON.stringify(["All"])
                        ? ["All"]
                        : JSON.parse(savedRarities)
                setSelectedRarities(parsedRarities)
            } catch (error) {
                console.error("Error parsing saved rarity selections:", error)
            }
        }
    }, [])

    // Save selections to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(
            "powerDeckSelections",
            JSON.stringify(selectedDecks),
        )
        localStorage.setItem(
            "powerRaritySelections",
            JSON.stringify(selectedRarities),
        )
    }, [selectedDecks, selectedRarities])

    useEffect(() => {
        const fetchPowers = async () => {
            try {
                const response = await fetch("/powers.json")
                const data = await response.json()
                setPowers(data.powers)

                // Extract unique deck and rarity names
                const decks = [
                    "All",
                    ...new Set(
                        data.powers.map((power) => power.deck || "Unknown"),
                    ),
                ]
                setAvailableDecks(decks)

                const rarities = [
                    "All",
                    ...new Set(
                        data.powers.map((power) => power.rarity || "Unknown"),
                    ),
                ]
                setAvailableRarities(rarities)
            } catch (error) {
                console.error("Error fetching powers data:", error)
            }
        }

        fetchPowers()
    }, [])

    const handleSearchInputChange = (event) => {
        setSearchQuery(event.target.value)
    }

    const clearSearchQuery = () => {
        setSearchQuery("")
    }

    const handleDeckToggle = (deck) => {
        setSelectedDecks((prevSelectedDecks) => {
            // If "All" is clicked
            if (deck === "All") {
                // If "All" is already selected, don't change anything
                if (prevSelectedDecks.includes("All")) {
                    return prevSelectedDecks
                }
                // Otherwise, select only "All"
                return ["All"]
            }

            // Create a new array for the updated selection
            let newSelectedDecks

            // If the deck is already selected, remove it
            if (prevSelectedDecks.includes(deck)) {
                newSelectedDecks = prevSelectedDecks.filter((d) => d !== deck)
                // If removing the last deck, select "All" again
                if (newSelectedDecks.length === 0) {
                    return ["All"]
                }
                // If "All" was previously selected, remove it
                return newSelectedDecks.filter((d) => d !== "All")
            }
            // If the deck is not selected, add it
            else {
                // If already selected decks includes "All", remove "All" and add the new deck
                if (prevSelectedDecks.includes("All")) {
                    return [deck]
                }
                // Otherwise add the new deck to the existing selections
                return [...prevSelectedDecks, deck]
            }
        })
    }

    const handleRarityToggle = (rarity) => {
        setSelectedRarities((prevSelectedRarities) => {
            // If "All" is clicked
            if (rarity === "All") {
                // If "All" is already selected, don't change anything
                if (prevSelectedRarities.includes("All")) {
                    return prevSelectedRarities
                }
                // Otherwise, select only "All"
                return ["All"]
            }

            // Create a new array for the updated selection
            let newSelectedRarities

            // If the rarity is already selected, remove it
            if (prevSelectedRarities.includes(rarity)) {
                newSelectedRarities = prevSelectedRarities.filter(
                    (r) => r !== rarity,
                )
                // If removing the last rarity, select "All" again
                if (newSelectedRarities.length === 0) {
                    return ["All"]
                }
                // If "All" was previously selected, remove it
                return newSelectedRarities.filter((r) => r !== "All")
            }
            // If the rarity is not selected, add it
            else {
                // If already selected rarities includes "All", remove "All" and add the new rarity
                if (prevSelectedRarities.includes("All")) {
                    return [rarity]
                }
                // Otherwise add the new rarity to the existing selections
                return [...prevSelectedRarities, rarity]
            }
        })
    }

    // Reset filters functions
    const resetDeckFilters = () => {
        setSelectedDecks(["All"])
    }

    const resetRarityFilters = () => {
        setSelectedRarities(["All"])
    }

    // Handle accordion expansion toggling
    const handleDeckAccordionChange = (event, isExpanded) => {
        setDeckAccordionExpanded(isExpanded)
    }

    const handleRarityAccordionChange = (event, isExpanded) => {
        setRarityAccordionExpanded(isExpanded)
    }

    const filteredPowers = powers
        .filter(
            (power) =>
                power.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                (selectedDecks.includes("All") ||
                    selectedDecks.includes(power.deck)) &&
                (selectedRarities.includes("All") ||
                    selectedRarities.includes(power.rarity)),
        )
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name

    return (
        <>
            <Container
                sx={{
                    color: "text.primary",
                    padding: { xs: "15px", sm: "20px" },
                    paddingBottom: { xs: "80px", sm: "100px" }, // Adjust this value as needed
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Typography variant='h1' gutterBottom>
                    Powers
                </Typography>

                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "800px",
                        marginBottom: "20px",
                        backgroundColor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.03)",
                        borderRadius: "16px",
                        padding: "16px",
                        position: "relative",
                        backdropFilter: "blur(10px)",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                    }}
                >
                    {/* Filter menu header */}
                    <Typography
                        variant='h6'
                        sx={{
                            mb: 2,
                            pb: 1,
                            borderBottom: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(0, 0, 0, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <span
                            role='img'
                            aria-label='filter'
                            style={{ fontSize: "0.9em" }}
                        >
                            🔍
                        </span>
                        Filter & Search
                    </Typography>

                    {/* Filter menu layout with search box */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            gap: 2,
                        }}
                    >
                        {/* Left side - Filters */}
                        <Box
                            sx={{
                                flex: 2,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                            }}
                        >
                            {/* Deck Filters - Accordion */}
                            <Accordion
                                expanded={deckAccordionExpanded}
                                onChange={handleDeckAccordionChange}
                                sx={{
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    color: "inherit",
                                    boxShadow: "none",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255, 255, 255, 0.1)"
                                            : "1px solid rgba(0, 0, 0, 0.1)",
                                    borderRadius: "12px !important",
                                    "&:before": {
                                        display: "none", // Removes the default divider
                                    },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={
                                        <ExpandMoreIcon
                                            sx={{ color: "inherit" }}
                                        />
                                    }
                                    aria-controls='deck-filters-content'
                                    id='deck-filters-header'
                                    sx={{
                                        borderBottom: deckAccordionExpanded
                                            ? (theme) =>
                                                  theme.palette.mode === "dark"
                                                      ? "1px solid rgba(255, 255, 255, 0.1)"
                                                      : "1px solid rgba(0, 0, 0, 0.1)"
                                            : "none",
                                        minHeight: "48px",
                                        "&.Mui-expanded": {
                                            minHeight: "48px",
                                        },
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            flexShrink: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        Deck Filters
                                        <Box
                                            component='span'
                                            sx={{
                                                ml: 1,
                                                fontSize: "0.75rem",
                                                bgcolor: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "rgba(255, 255, 255, 0.15)"
                                                        : "rgba(0, 0, 0, 0.1)",
                                                color: "inherit",
                                                py: 0.5,
                                                px: 1,
                                                borderRadius: "10px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                height: "20px",
                                            }}
                                        >
                                            {selectedDecks.includes("All")
                                                ? "All"
                                                : `${selectedDecks.length} selected`}
                                        </Box>
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 2, pb: 1 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant='body2'
                                            sx={{ opacity: 0.7 }}
                                        >
                                            Select decks to filter:
                                        </Typography>
                                        <Button
                                            startIcon={<ReplayIcon />}
                                            size='small'
                                            onClick={resetDeckFilters}
                                            sx={{
                                                color: "inherit",
                                                opacity: 0.7,
                                                "&:hover": {
                                                    opacity: 1,
                                                    bgcolor:
                                                        "rgba(255,255,255,0.05)",
                                                },
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </Box>
                                    <FormGroup sx={{ ml: 1 }}>
                                        {availableDecks.map((deck) => (
                                            <FormControlLabel
                                                key={deck}
                                                control={
                                                    <Checkbox
                                                        checked={selectedDecks.includes(
                                                            deck,
                                                        )}
                                                        onChange={() =>
                                                            handleDeckToggle(
                                                                deck,
                                                            )
                                                        }
                                                        sx={{
                                                            color: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "rgba(255, 255, 255, 0.4)"
                                                                    : "rgba(0, 0, 0, 0.4)",
                                                            "&.Mui-checked": {
                                                                color: "primary.main",
                                                            },
                                                        }}
                                                        size='small'
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            color: "inherit",
                                                        }}
                                                    >
                                                        {deck}
                                                    </Typography>
                                                }
                                            />
                                        ))}
                                    </FormGroup>
                                </AccordionDetails>
                            </Accordion>

                            {/* Rarity Filters - Accordion */}
                            <Accordion
                                expanded={rarityAccordionExpanded}
                                onChange={handleRarityAccordionChange}
                                sx={{
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    color: "inherit",
                                    boxShadow: "none",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255, 255, 255, 0.1)"
                                            : "1px solid rgba(0, 0, 0, 0.1)",
                                    borderRadius: "12px !important",
                                    "&:before": {
                                        display: "none", // Removes the default divider
                                    },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={
                                        <ExpandMoreIcon
                                            sx={{ color: "inherit" }}
                                        />
                                    }
                                    aria-controls='rarity-filters-content'
                                    id='rarity-filters-header'
                                    sx={{
                                        borderBottom: rarityAccordionExpanded
                                            ? (theme) =>
                                                  theme.palette.mode === "dark"
                                                      ? "1px solid rgba(255, 255, 255, 0.1)"
                                                      : "1px solid rgba(0, 0, 0, 0.1)"
                                            : "none",
                                        minHeight: "48px",
                                        "&.Mui-expanded": {
                                            minHeight: "48px",
                                        },
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            flexShrink: 0,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        Rarity Filters
                                        <Box
                                            component='span'
                                            sx={{
                                                ml: 1,
                                                fontSize: "0.75rem",
                                                bgcolor: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "rgba(255, 255, 255, 0.15)"
                                                        : "rgba(0, 0, 0, 0.1)",
                                                color: "inherit",
                                                py: 0.5,
                                                px: 1,
                                                borderRadius: "10px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                height: "20px",
                                            }}
                                        >
                                            {selectedRarities.includes("All")
                                                ? "All"
                                                : `${selectedRarities.length} selected`}
                                        </Box>
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 2, pb: 1 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                        }}
                                    >
                                        <Typography
                                            variant='body2'
                                            sx={{ opacity: 0.7 }}
                                        >
                                            Select rarities to filter:
                                        </Typography>
                                        <Button
                                            startIcon={<ReplayIcon />}
                                            size='small'
                                            onClick={resetRarityFilters}
                                            sx={{
                                                color: "inherit",
                                                opacity: 0.7,
                                                "&:hover": {
                                                    opacity: 1,
                                                    bgcolor:
                                                        "rgba(255,255,255,0.05)",
                                                },
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </Box>
                                    <FormGroup sx={{ ml: 1 }}>
                                        {availableRarities.map((rarity) => (
                                            <FormControlLabel
                                                key={rarity}
                                                control={
                                                    <Checkbox
                                                        checked={selectedRarities.includes(
                                                            rarity,
                                                        )}
                                                        onChange={() =>
                                                            handleRarityToggle(
                                                                rarity,
                                                            )
                                                        }
                                                        sx={{
                                                            color: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "rgba(255, 255, 255, 0.4)"
                                                                    : "rgba(0, 0, 0, 0.4)",
                                                            "&.Mui-checked": {
                                                                color: "primary.main",
                                                            },
                                                        }}
                                                        size='small'
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            color: "inherit",
                                                        }}
                                                    >
                                                        {rarity}
                                                    </Typography>
                                                }
                                            />
                                        ))}
                                    </FormGroup>
                                </AccordionDetails>
                            </Accordion>
                        </Box>

                        {/* Right side - Search */}
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                                alignItems: "stretch",
                                mt: { xs: 2, md: 0 },
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 1,
                                }}
                            >
                                <Typography
                                    variant='body2'
                                    sx={{ opacity: 0.7 }}
                                >
                                    Search powers:
                                </Typography>
                                {searchQuery && (
                                    <Button
                                        size='small'
                                        onClick={clearSearchQuery}
                                        sx={{
                                            color: "inherit",
                                            opacity: 0.7,
                                            "&:hover": {
                                                opacity: 1,
                                                bgcolor:
                                                    "rgba(255,255,255,0.05)",
                                            },
                                        }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </Box>
                            <TextField
                                variant='outlined'
                                placeholder='Enter power name...'
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                sx={{
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    borderRadius: "12px",
                                    width: "100%",
                                    input: {
                                        color: "inherit",
                                    },
                                    fieldset: {
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255, 255, 255, 0.1)"
                                                : "rgba(0, 0, 0, 0.1)",
                                        borderRadius: "12px",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255, 255, 255, 0.2) !important"
                                                : "rgba(0, 0, 0, 0.2) !important",
                                    },
                                    flex: 1,
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Results count */}
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: "800px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                        px: 1,
                    }}
                >
                    <Typography variant='body2' sx={{ opacity: 0.7 }}>
                        <strong>{filteredPowers.length}</strong> power
                        {filteredPowers.length !== 1 ? "s" : ""} found
                    </Typography>
                </Box>

                <List
                    sx={{
                        width: "100%",
                        maxWidth: "800px",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "rgba(0, 0, 0, 0.03)",
                        borderRadius: "16px",
                        padding: "10px",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.1)"
                                : "1px solid rgba(0, 0, 0, 0.1)",
                        backdropFilter: "blur(10px)",
                    }}
                >
                    {filteredPowers.map((power, index) => (
                        <ListItem
                            key={index}
                            sx={{
                                borderBottom: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.1)"
                                        : "1px solid rgba(0, 0, 0, 0.1)",
                                padding: "10px",
                                "&:last-child": {
                                    borderBottom: "none",
                                },
                            }}
                        >
                            <Section
                                sx={{
                                    width: "100%",
                                    padding: "20px",
                                }}
                            >
                                <Typography variant='h2' gutterBottom>
                                    {power.name}
                                </Typography>
                                <Typography variant='body1' paragraph>
                                    <strong>Rarity:</strong> {power.rarity}
                                </Typography>
                                <Typography variant='body1' paragraph>
                                    <strong>Deck:</strong>{" "}
                                    {power.deck || "Unknown"}
                                </Typography>
                                <Typography variant='body1' paragraph>
                                    {power.description}
                                </Typography>
                            </Section>
                        </ListItem>
                    ))}
                </List>
            </Container>

            <HomeButton />
        </>
    )
}

export default Powers
