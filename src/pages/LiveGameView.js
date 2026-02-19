import React, { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import {
    Box,
    Typography,
    Container,
    Paper,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Chip,
    TextField,
    Checkbox,
    FormControlLabel,
    IconButton,
} from "@mui/material"
import {
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material"
import { subscribeToSession, getSession, disconnect } from "../utils/awsClient"
import "../components/InitiativeTracker.css" // Import the same styles used in the tracker

// Read-only version of the CombatantCard that looks identical but is non-interactive
const ReadOnlyCombatantCard = ({ combatant, isActive, combatantCount = 1 }) => {
    // Calculate dynamic card size (same as InitiativeTrackerPage)
    const maxCarouselHeight = window.innerHeight * 0.9
    let baseCardHeight
    if (combatantCount === 1) {
        baseCardHeight = maxCarouselHeight * 1
    } else {
        baseCardHeight = maxCarouselHeight * 0.65
    }

    const scaleFactor = 0.8
    const dynamicCardHeight = baseCardHeight * scaleFactor
    const dynamicCardWidth = dynamicCardHeight * 0.67

    const cardHeightVh = (dynamicCardHeight / window.innerHeight) * 100
    const cardWidthVh = (dynamicCardWidth / window.innerHeight) * 100

    // Special case for Spacer card (invisible)
    if (combatant.isSpacerCard) {
        return (
            <Card
                sx={{
                    width: {
                        xs: `${cardWidthVh}vh`,
                        sm: `${cardWidthVh}vh`,
                    },
                    height: {
                        xs: `${cardHeightVh}vh`,
                        sm: `${cardHeightVh}vh`,
                    },
                    margin: 1,
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: 2,
                    position: "relative",
                    transition: "all 0.3s ease-in-out",
                    cursor: "default",
                    boxShadow: "none",
                    pointerEvents: "none",
                    visibility: "hidden",
                    contain: "layout style size",
                    willChange: "auto",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {/* Empty content - invisible spacer */}
            </Card>
        )
    }

    // Special case for DANGER card
    if (combatant.isDangerCard) {
        return (
            <Card
                sx={{
                    width: {
                        xs: `${cardWidthVh}vh`,
                        sm: `${cardWidthVh}vh`,
                    },
                    height: {
                        xs: `${cardHeightVh}vh`,
                        sm: `${cardHeightVh}vh`,
                    },
                    margin: 1,
                    backgroundColor: "rgba(244, 67, 54, 0.9)",
                    border: "3px solid #ff0000",
                    borderRadius: 2,
                    position: "relative",
                    transition: "all 0.3s ease-in-out",
                    cursor: "default",
                    boxShadow: isActive
                        ? "0 8px 24px rgba(0,0,0,0.5)"
                        : "0 2px 8px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                    contain: "layout style size",
                    willChange: "background-color",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                }}
            >
                <CardContent sx={{ padding: 2, color: "white" }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            marginY: 3,
                        }}
                    >
                        <Typography variant='h4' fontWeight='bold'>
                            DANGER!
                        </Typography>
                    </Box>

                    <Typography
                        variant='body1'
                        textAlign='center'
                        sx={{ mt: 2 }}
                    >
                        GM tells players which of them are in danger (if any).
                    </Typography>
                </CardContent>
            </Card>
        )
    }

    const getBorderColor = (type) => {
        switch (type) {
            case "Monster":
                return "#f44336" // Red
            case "Player Character":
                return "#4caf50" // Green
            case "NPC":
                return "#ff9800" // Orange/Yellow
            case "Environment":
                return "#9c27b0" // Purple
            case "DANGER":
                return "#ff0000" // Bright Red for DANGER card
            default:
                return "#757575" // Gray
        }
    }

    const getImageSource = (type) => {
        switch (type) {
            case "Monster":
                return "/monster.png"
            case "Player Character":
                return "/player.png"
            case "NPC":
                return "/player.png"
            case "Environment":
                return "/environment.png"
            case "DANGER":
                return "/monster.png"
            default:
                return "/player.png"
        }
    }

    return (
        <Card
            className={isActive ? "active-card" : undefined}
            sx={{
                width: { xs: `${cardWidthVh}vh`, sm: `${cardWidthVh}vh` },
                height: { xs: `${cardHeightVh}vh`, sm: `${cardHeightVh}vh` },
                margin: 1,
                border: `3px solid ${getBorderColor(combatant.type)}`,
                borderRadius: 2,
                position: "relative",
                transition:
                    "background-color 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out",
                cursor: "default",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "#424242" : "#ffffff",
                pointerEvents: "none", // Make the whole card non-interactive
                contain: "layout style size",
                willChange: "background-color",
                boxSizing: "border-box",
                overflow: "hidden",
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
            }}
        >
            {/* Delete button - visible but non-interactive */}
            <Box
                sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    zIndex: 1200,
                    transformOrigin: "top left",
                    transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {isActive && !combatant.isSpacerCard ? (
                    <IconButton
                        disabled
                        size='small'
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            padding: 0,
                            backgroundColor: "rgba(244, 67, 54, 0.4)", // Dimmed to show it's disabled
                            color: "white",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "not-allowed",
                        }}
                        title='Delete combatant (disabled in view-only mode)'
                    >
                        <DeleteIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                ) : (
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            backgroundColor: "transparent",
                            pointerEvents: "none",
                            opacity: 0,
                        }}
                    />
                )}
            </Box>

            {/* Move back/forward buttons - visible but non-interactive */}
            {!combatant.isSpacerCard && (
                <Box
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        flexDirection: "row",
                        gap: "4px",
                        transformOrigin: "top right",
                        transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <IconButton
                        disabled
                        size='small'
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            padding: 0,
                            backgroundColor: "rgba(0,0,0,0.1)", // Dimmed
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "not-allowed",
                        }}
                        title='Move backward in initiative order (disabled in view-only mode)'
                    >
                        <ArrowBackIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                    <IconButton
                        disabled
                        size='small'
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            padding: 0,
                            backgroundColor: "rgba(0,0,0,0.1)", // Dimmed
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "not-allowed",
                        }}
                        title='Move forward in initiative order (disabled in view-only mode)'
                    >
                        <ArrowForwardIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                </Box>
            )}

            <CardContent
                sx={{
                    padding: 2,
                    position: "relative",
                    boxSizing: "border-box",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                }}
            >
                {/* Main character image */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: 2,
                        marginTop: 0,
                        position: "relative",
                    }}
                >
                    <img
                        src={getImageSource(combatant.type)}
                        alt={combatant.type}
                        style={{
                            width: 48,
                            height: 48,
                            objectFit: "contain",
                            transition: "filter 0.3s ease",
                        }}
                    />
                    {/* Red X overlay when dead */}
                    {combatant.isDead && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                fontSize: "36px",
                                color: "#ff0000",
                                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            ❌
                        </Box>
                    )}
                </Box>

                {/* Name input - visible but disabled */}
                <TextField
                    value={combatant.name}
                    placeholder='Combatant Name'
                    variant='outlined'
                    size='small'
                    disabled
                    sx={{
                        width: "100%",
                        marginBottom: 1,
                        "& .MuiOutlinedInput-root": {
                            fontSize: "0.9rem",
                            cursor: "not-allowed",
                        },
                        "& .Mui-disabled": {
                            color: (theme) => theme.palette.text.primary,
                            WebkitTextFillColor: (theme) =>
                                theme.palette.text.primary,
                        },
                    }}
                />

                {/* Type chip */}
                <Box
                    sx={{
                        marginBottom: 1,
                    }}
                >
                    <Chip
                        label={combatant.type}
                        size='small'
                        sx={{
                            backgroundColor: getBorderColor(combatant.type),
                            color: "white",
                            fontSize: "0.75rem",
                            width: "100%",
                        }}
                    />
                </Box>

                {/* Dead checkbox - visible but disabled */}
                {combatant.type !== "Environment" && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={combatant.isDead}
                                disabled
                                size='small'
                                sx={{ cursor: "not-allowed" }}
                            />
                        }
                        label='Dead'
                        sx={{
                            width: "100%",
                            marginBottom: 1,
                            "& .MuiFormControlLabel-label": {
                                fontSize: "0.8rem",
                                color: (theme) => theme.palette.text.primary,
                            },
                            cursor: "not-allowed",
                        }}
                    />
                )}

                {/* Status checkboxes - visible but disabled */}
                {combatant.type !== "Environment" && (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 0.25,
                            marginBottom: 1,
                        }}
                    >
                        {[
                            "Frightened",
                            "Unconscious",
                            "Diseased",
                            "Poisoned",
                        ].map((status) => (
                            <FormControlLabel
                                key={status}
                                control={
                                    <Checkbox
                                        checked={
                                            combatant.statuses?.includes(
                                                status,
                                            ) || false
                                        }
                                        disabled
                                        size='small'
                                        sx={{
                                            cursor: "not-allowed",
                                            padding: "2px",
                                        }}
                                    />
                                }
                                label={status}
                                sx={{
                                    margin: 0,
                                    cursor: "not-allowed",
                                    "& .MuiFormControlLabel-label": {
                                        fontSize: "0.65rem",
                                        color: (theme) =>
                                            theme.palette.text.primary,
                                    },
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Notes field - visible but disabled */}
                <TextField
                    value={combatant.notes || ""}
                    placeholder='Notes...'
                    variant='outlined'
                    size='small'
                    multiline
                    rows={2}
                    disabled
                    sx={{
                        width: "100%",
                        marginTop: 1,
                        cursor: "not-allowed",
                        "& .MuiOutlinedInput-root": {
                            cursor: "not-allowed",
                            fontSize: "0.8rem",
                        },
                        "& .Mui-disabled": {
                            color: (theme) => theme.palette.text.primary,
                            WebkitTextFillColor: (theme) =>
                                theme.palette.text.primary,
                        },
                    }}
                />
            </CardContent>
        </Card>
    )
}

// This component is the view-only version of the Initiative Tracker
// It displays the current state of a shared initiative tracker session
// but doesn't allow interaction with it
const LiveGameView = () => {
    const { sessionId } = useParams()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [sessionData, setSessionData] = useState(null)
    const [currentTurn, setCurrentTurn] = useState(0)
    const trackerRef = useRef(null) // Reference for the carousel element

    // Scroll gravity state for carousel
    const scrollTimeoutRef = useRef(null)
    const gravityTimeoutRef = useRef(null)

    // Load initial session data and subscribe to updates
    useEffect(() => {
        const loadSession = async () => {
            try {
                setLoading(true)

                // Get initial data
                const data = await getSession(sessionId)
                if (!data) throw new Error("Session not found or expired")

                console.log("Session data received:", data)

                // Check which property contains our state data
                if (data.combatState) {
                    setSessionData(data.combatState)
                    setCurrentTurn(data.combatState.currentTurn || 0)
                } else {
                    throw new Error("Session data structure is invalid")
                }

                // Subscribe to real-time updates via WebSocket
                await subscribeToSession(
                    sessionId,
                    (updatedData) => {
                        setSessionData(updatedData)
                        setCurrentTurn(updatedData.currentTurn || 0)
                    },
                    (err) => {
                        console.error("WebSocket error:", err)
                        setError(err.message)
                    },
                    (message) => {
                        console.log("Session closed:", message)
                        setError("Session has been ended by the host")
                    },
                )

                setLoading(false)
            } catch (err) {
                console.error("Error loading session:", err)
                setError(err.message)
                setLoading(false)
            }
        }

        if (sessionId) {
            loadSession()
        }

        // Clean up WebSocket connection
        return () => {
            disconnect()
        }
    }, [sessionId])

    // Enhanced scroll gravity effect that works even when carousel is mounted later
    useEffect(() => {
        // Set up a scroll handler that will work regardless of when the carousel appears
        const handleScroll = () => {
            // Clear any existing timeouts
            clearTimeout(scrollTimeoutRef.current)
            clearTimeout(gravityTimeoutRef.current)

            // Set a timeout to detect when scrolling has stopped
            scrollTimeoutRef.current = setTimeout(() => {
                // Check if the carousel element exists NOW (it might have been added since the effect ran)
                const carouselElement = trackerRef.current
                if (!carouselElement) return

                // Apply gravity effect - check if carousel is roughly centered
                const rect = carouselElement.getBoundingClientRect()
                const viewportHeight = window.innerHeight
                const carouselCenter = rect.top + rect.height / 2 // Adjusted to 2 for more precise centering
                const viewportCenter = viewportHeight / 2

                // Calculate distance from center
                const distanceFromCenter = Math.abs(
                    carouselCenter - viewportCenter,
                )
                const threshold = viewportHeight * 0.3 // Increased to 30% of viewport height for even stronger snap zone

                // If carousel is close to center but not perfectly aligned, apply stronger "gravity"
                if (distanceFromCenter < threshold && distanceFromCenter > 5) {
                    // Reduced minimum distance from 10 to 5
                    gravityTimeoutRef.current = setTimeout(() => {
                        const targetScroll =
                            window.pageYOffset +
                            (carouselCenter - viewportCenter) * 0.9 // Even stronger pull, 90% of the way

                        window.scrollTo({
                            top: targetScroll,
                            behavior: "smooth",
                        })
                    }, 100) // Reduced delay to 100ms for immediate response
                }
            }, 80) // Reduced detection time to 80ms for faster response
        }

        // Set up a mutation observer to detect when the carousel is added to the DOM
        const observerTarget = document.body
        const observerConfig = { childList: true, subtree: true }

        const mutationObserver = new MutationObserver(() => {
            // If the carousel ref exists after a DOM mutation, check if we need to apply gravity
            if (trackerRef.current) {
                handleScroll() // Check immediately when carousel appears
            }
        })

        // Start observing for carousel element appearing
        mutationObserver.observe(observerTarget, observerConfig)

        // Also listen for scroll events
        window.addEventListener("scroll", handleScroll, { passive: true })

        return () => {
            mutationObserver.disconnect()
            window.removeEventListener("scroll", handleScroll)
            clearTimeout(scrollTimeoutRef.current)
            clearTimeout(gravityTimeoutRef.current)
        }
    }, []) // No dependencies - this effect should only run once on component mount

    // Function to get combatants in turn order with DANGER card (same logic as InitiativeTrackerPage)
    const getCombatantsInTurnOrder = useCallback(() => {
        if (!sessionData || !sessionData.combatants) return []

        const combatants = sessionData.combatants
        const monsters = combatants.filter((c) => c.type === "Monster")
        const npcs = combatants.filter((c) => c.type === "NPC")
        const environment = combatants.filter((c) => c.type === "Environment")
        const players = combatants.filter((c) => c.type === "Player Character")

        // Add a DANGER card before player characters if there are any players
        const orderedList = [...monsters, ...npcs, ...environment]

        if (players.length > 0) {
            // Add a special DANGER card that will be rendered differently
            const dangerCard = {
                id: "danger-card", // Unique ID that won't conflict
                name: "DANGER!",
                type: "DANGER", // Special type to handle differently
                statuses: [],
                isDead: false,
                notes: "GM tells players which of them are in danger (if any).",
                isDangerCard: true, // Flag to identify this special card
            }
            orderedList.push(dangerCard)
        }

        const finalList = [...orderedList, ...players]

        // Add spacer cards if we have 2 or 3 total cards to maintain proper spacing
        if (finalList.length >= 2 && finalList.length <= 3) {
            const spacersNeeded = 4 - finalList.length

            for (let i = 0; i < spacersNeeded; i++) {
                const spacerCard = {
                    id: `spacer-card-${i}`, // Unique ID for each spacer
                    name: "Spacer",
                    type: "Spacer",
                    statuses: [],
                    isDead: false,
                    notes: "",
                    isSpacerCard: true, // Flag to identify spacer cards
                }

                if (finalList.length === 2) {
                    // For 2 cards, add spacers: Card1, Spacer1, Spacer2, Card2
                    if (i === 0) {
                        finalList.splice(1, 0, spacerCard) // Insert after first card
                    } else {
                        finalList.splice(2, 0, spacerCard) // Insert after first spacer
                    }
                } else if (finalList.length === 3) {
                    // For 3 cards, add 1 spacer: Card1, Card2, Spacer1, Card3
                    finalList.splice(2, 0, spacerCard) // Insert before last card
                }
            }
        }

        return finalList
    }, [sessionData])

    // Effect to center the carousel and handle scrolling
    useEffect(() => {
        if (!sessionData || !trackerRef.current) return

        // Center the carousel vertically when it loads
        const scrollToCenter = () => {
            if (trackerRef.current) {
                const rect = trackerRef.current.getBoundingClientRect()
                const viewportHeight = window.innerHeight
                const scrollY =
                    rect.top +
                    rect.height / 2 -
                    viewportHeight / 2 +
                    window.scrollY
                window.scrollTo({ top: scrollY, behavior: "smooth" })
            }
        }

        scrollToCenter()

        // Re-center if window is resized
        window.addEventListener("resize", scrollToCenter)

        return () => {
            window.removeEventListener("resize", scrollToCenter)
        }
    }, [sessionData])

    // Early return states
    if (loading) {
        return (
            <Container
                sx={{ display: "flex", justifyContent: "center", py: 4 }}
            >
                <CircularProgress />
            </Container>
        )
    }

    if (error) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='error'>
                    Error loading shared initiative tracker: {error}
                </Alert>
            </Container>
        )
    }

    if (
        !sessionData ||
        !sessionData.combatants ||
        sessionData.combatants.length === 0
    ) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='info'>
                    This shared initiative tracker session has no combatants or
                    has expired.
                </Alert>
            </Container>
        )
    }

    // Get the combatants in turn order (including DANGER card and spacers)
    const orderedCombatants = getCombatantsInTurnOrder()

    // Render the view-only initiative tracker

    return (
        <Container
            sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                padding: { xs: "10px", sm: "20px", md: 3 },
                marginBottom: "100px",
                position: "relative",
            }}
        >
            <Box
                sx={{
                    textAlign: "center",
                    marginBottom: 4,
                    marginTop: { xs: 2, sm: 4 },
                }}
            >
                <Typography
                    variant='h3'
                    component='h1'
                    gutterBottom
                    sx={{
                        fontWeight: "bold",
                        textShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "none"
                                : "0px 1px 2px rgba(0,0,0,0.1)",
                        fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                        marginBottom: 2,
                    }}
                >
                    Live Initiative Tracker
                </Typography>
                <Typography
                    variant='h6'
                    sx={{
                        opacity: 0.8,
                        fontSize: { xs: "1rem", sm: "1.25rem" },
                        maxWidth: "600px",
                        margin: "0 auto",
                    }}
                >
                    View-only mode - Updates in real time
                </Typography>

                <Paper
                    sx={{
                        padding: 2,
                        margin: "0 auto",
                        marginBottom: 5,
                        marginTop: 3,
                        maxWidth: "500px",
                    }}
                >
                    <Typography variant='body1' align='center'>
                        Session ID: <strong>{sessionId}</strong>
                    </Typography>
                </Paper>
            </Box>

            {/* Combat tracker carousel */}
            {orderedCombatants && orderedCombatants.length > 0 && (
                <Box sx={{ padding: 2 }}>
                    {/* Carousel view matching InitiativeTrackerPage exactly */}
                    <Box sx={{ marginBottom: 3 }} ref={trackerRef}>
                        <Box
                            sx={{
                                position: "relative",
                                height: "100vh",
                                width: "100vw",
                                marginLeft: "-50vw",
                                left: "50%",
                                border: "2px solid",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#444"
                                        : "#ddd",
                                borderRadius: 2,
                                backgroundColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#1a1a1a"
                                        : "#f9f9f9",
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                perspective: "2000px",
                            }}
                        >
                            {orderedCombatants.map((combatant, index) => {
                                const totalCombatants = orderedCombatants.length
                                const isActive = index === currentTurn

                                // Calculate relative position (same as InitiativeTrackerPage)
                                let relativePosition = index - currentTurn

                                // Handle wrap-around for circular navigation
                                if (
                                    relativePosition <
                                    -Math.floor(totalCombatants / 2)
                                ) {
                                    relativePosition += totalCombatants
                                } else if (
                                    relativePosition >
                                    Math.floor(totalCombatants / 2)
                                ) {
                                    relativePosition -= totalCombatants
                                }

                                // Calculate carousel positioning (same as InitiativeTrackerPage)
                                const angle =
                                    (relativePosition / totalCombatants) * 360
                                const baseRadius = Math.max(
                                    350,
                                    totalCombatants * 50,
                                )
                                const maxRadius = Math.min(
                                    600,
                                    totalCombatants * 120,
                                )
                                const radius = Math.min(maxRadius, baseRadius)
                                const x =
                                    Math.sin((angle * Math.PI) / 180) * radius
                                const z =
                                    Math.cos((angle * Math.PI) / 180) * radius

                                // Scale and opacity based on position (same as InitiativeTrackerPage)
                                const scale = Math.max(
                                    0.5,
                                    1 - Math.abs(relativePosition) * 0.08,
                                )

                                // Set z-index based on position (same as InitiativeTrackerPage)
                                const zIndex = isActive
                                    ? 100
                                    : 50 - Math.abs(relativePosition)

                                return (
                                    <Box
                                        key={combatant.id}
                                        sx={{
                                            position: "absolute",
                                            transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
                                            transformStyle: "preserve-3d",
                                            transition:
                                                "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                                            zIndex: zIndex,
                                            pointerEvents: "none", // Disable all interactions
                                        }}
                                    >
                                        <ReadOnlyCombatantCard
                                            combatant={combatant}
                                            isActive={isActive}
                                            combatantCount={totalCombatants}
                                        />
                                    </Box>
                                )
                            })}

                            {/* Navigation dots (same as InitiativeTrackerPage but non-interactive) */}
                            <Box
                                sx={{
                                    position: "absolute",
                                    bottom: 20,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    display: "flex",
                                    gap: 1,
                                    zIndex: 200,
                                }}
                            >
                                {orderedCombatants.map((combatant, index) => (
                                    <Box
                                        key={`dot-${combatant.id}`}
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: "50%",
                                            backgroundColor:
                                                index === currentTurn
                                                    ? "#4caf50"
                                                    : "rgba(255,255,255,0.3)",
                                            cursor: "default", // Not clickable in view-only mode
                                            transition: "all 0.3s ease",
                                            border: `2px solid ${(() => {
                                                switch (combatant.type) {
                                                    case "Monster":
                                                        return "#f44336"
                                                    case "Player Character":
                                                        return "#4caf50"
                                                    case "NPC":
                                                        return "#ff9800"
                                                    case "Environment":
                                                        return "#9c27b0"
                                                    case "DANGER":
                                                        return "#ff0000"
                                                    default:
                                                        return "#757575"
                                                }
                                            })()}`,
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            )}
        </Container>
    )
}

export default LiveGameView
