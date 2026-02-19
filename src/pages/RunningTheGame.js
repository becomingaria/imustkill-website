import {
    Container,
    Typography,
    Box,
    List,
    ListItem,
    CircularProgress,
    Alert,
} from "@mui/material"
import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import GMToolsButton from "../components/GMToolsButton"
import useRulesEngine from "../hooks/useRulesEngine"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import { scrollToAnchor } from "../utils/scrollToAnchor"

// Custom hook for detecting when an element is in viewport
const useInView = (options = {}) => {
    const ref = useRef(null)
    const [isInView, setIsInView] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                }
            },
            {
                threshold: options.threshold || 0.2,
                rootMargin: options.rootMargin || "0px",
            },
        )

        const currentRef = ref.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef)
            }
        }
    }, [options.threshold, options.rootMargin])

    return [ref, isInView]
}

// Animated slide component
const Slide = ({ children, delay = 0 }) => {
    const [ref, isInView] = useInView({ threshold: 0.2 })

    return (
        <Box
            ref={ref}
            sx={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(60px)",
                transition: `all 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
                width: "100%",
            }}
        >
            {children}
        </Box>
    )
}

const RunningTheGame = () => {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [runningGameData, setRunningGameData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        if (!loading && !error) {
            const data = getCategoryRules("running-the-game")
            setRunningGameData(data)
        }
    }, [loading, error, getCategoryRules])

    // Handle scrolling to anchor sections
    useEffect(() => {
        if (runningGameData && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [runningGameData, location.hash])

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
                    Error loading running the game rules: {error}
                </Alert>
            </Container>
        )
    }

    if (!runningGameData) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='warning'>No running the game data found</Alert>
            </Container>
        )
    }
    return (
        <>
            <Container
                sx={{
                    color: "text.primary",
                    padding: { xs: "15px", sm: "20px" },
                    paddingBottom: { xs: "80px", sm: "100px" },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                {/* Hero Section */}
                <Box
                    sx={{
                        minHeight: "50vh",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        marginBottom: { xs: "40px", sm: "60px" },
                    }}
                >
                    <Slide>
                        <Typography
                            variant='h1'
                            sx={{
                                fontSize: {
                                    xs: "2rem",
                                    sm: "3rem",
                                    md: "4rem",
                                },
                                fontWeight: "bold",
                                marginBottom: "20px",
                            }}
                        >
                            {runningGameData.title}
                        </Typography>
                    </Slide>
                    <Slide delay={200}>
                        <Typography
                            variant='h5'
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.25rem" },
                                maxWidth: "700px",
                                lineHeight: 1.6,
                                opacity: 0.8,
                            }}
                        >
                            A comprehensive guide for Game Masters on running
                            hunts, managing encounters, and creating
                            unforgettable sessions.
                        </Typography>
                    </Slide>
                    <Slide delay={400}>
                        <Box
                            sx={{
                                marginTop: "40px",
                                fontSize: "3rem",
                                animation: "bounce 2s infinite",
                                "@keyframes bounce": {
                                    "0%, 100%": { transform: "translateY(0)" },
                                    "50%": { transform: "translateY(10px)" },
                                },
                            }}
                        >
                            ↓
                        </Box>
                    </Slide>
                </Box>

                {/* Content Sections */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: { xs: "60px", sm: "80px" },
                        maxWidth: "900px",
                        width: "100%",
                    }}
                >
                    {runningGameData.sections.map((section, sectionIndex) => (
                        <Slide key={section.id} delay={100}>
                            <Box
                                id={section.id}
                                sx={{
                                    padding: { xs: "20px", sm: "40px" },
                                    borderRadius: "16px",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    backdropFilter: "blur(10px)",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255, 255, 255, 0.1)"
                                            : "1px solid rgba(0, 0, 0, 0.1)",
                                }}
                            >
                                <Typography
                                    variant='h3'
                                    sx={{
                                        fontSize: {
                                            xs: "1.5rem",
                                            sm: "2rem",
                                            md: "2.5rem",
                                        },
                                        fontWeight: "bold",
                                        marginBottom: "24px",
                                    }}
                                >
                                    {section.title}
                                </Typography>

                                {/* Hunt phases */}
                                {section.phases && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2,
                                        }}
                                    >
                                        {section.phases.map((phase, index) => (
                                            <Box
                                                key={phase.name}
                                                sx={{
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "rgba(255, 255, 255, 0.03)"
                                                            : "rgba(0, 0, 0, 0.02)",
                                                    padding: {
                                                        xs: "16px",
                                                        sm: "20px",
                                                    },
                                                    borderRadius: "12px",
                                                    border: (theme) =>
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "1px solid rgba(255, 255, 255, 0.08)"
                                                            : "1px solid rgba(0, 0, 0, 0.06)",
                                                }}
                                            >
                                                <Typography
                                                    variant='h4'
                                                    sx={{
                                                        fontWeight: "bold",
                                                        mb: 1,
                                                        fontSize: {
                                                            xs: "1.1rem",
                                                            sm: "1.3rem",
                                                        },
                                                    }}
                                                >
                                                    {index + 1}. {phase.name}
                                                </Typography>
                                                <Typography
                                                    variant='body1'
                                                    sx={{ lineHeight: 1.7 }}
                                                >
                                                    <EnhancedKeywordLinker>
                                                        {phase.description}
                                                    </EnhancedKeywordLinker>
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {/* Subsections */}
                                {section.subsections && (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 3,
                                        }}
                                    >
                                        {section.subsections.map(
                                            (subsection) => (
                                                <Box
                                                    key={subsection.id}
                                                    id={subsection.id}
                                                    sx={{
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(255, 255, 255, 0.03)"
                                                                : "rgba(0, 0, 0, 0.02)",
                                                        padding: {
                                                            xs: "16px",
                                                            sm: "24px",
                                                        },
                                                        borderRadius: "12px",
                                                        border: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "1px solid rgba(255, 255, 255, 0.08)"
                                                                : "1px solid rgba(0, 0, 0, 0.06)",
                                                    }}
                                                >
                                                    <Typography
                                                        variant='h4'
                                                        sx={{
                                                            fontWeight: "bold",
                                                            mb: 2,
                                                            fontSize: {
                                                                xs: "1.2rem",
                                                                sm: "1.5rem",
                                                            },
                                                        }}
                                                    >
                                                        {subsection.title}
                                                    </Typography>

                                                    {subsection.description && (
                                                        <Typography
                                                            variant='body1'
                                                            sx={{
                                                                lineHeight: 1.7,
                                                                mb: 2,
                                                            }}
                                                        >
                                                            <EnhancedKeywordLinker>
                                                                {
                                                                    subsection.description
                                                                }
                                                            </EnhancedKeywordLinker>
                                                        </Typography>
                                                    )}

                                                    {subsection.mechanics && (
                                                        <Box
                                                            sx={{
                                                                fontStyle:
                                                                    "italic",
                                                                bgcolor: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "rgba(255, 255, 255, 0.05)"
                                                                        : "rgba(0, 0, 0, 0.04)",
                                                                p: 2,
                                                                borderRadius:
                                                                    "8px",
                                                                mb: 2,
                                                            }}
                                                        >
                                                            <Typography variant='body1'>
                                                                <strong>
                                                                    Mechanics:
                                                                </strong>{" "}
                                                                <EnhancedKeywordLinker>
                                                                    {
                                                                        subsection.mechanics
                                                                    }
                                                                </EnhancedKeywordLinker>
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {subsection.stat_explanations && (
                                                        <>
                                                            <Typography
                                                                variant='body1'
                                                                sx={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    mt: 2,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                Stat Breakdown:
                                                            </Typography>
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    flexDirection:
                                                                        "column",
                                                                    gap: 1,
                                                                }}
                                                            >
                                                                {subsection.stat_explanations.map(
                                                                    (
                                                                        statExp,
                                                                        index,
                                                                    ) => (
                                                                        <Box
                                                                            key={
                                                                                index
                                                                            }
                                                                            sx={{
                                                                                bgcolor:
                                                                                    (
                                                                                        theme,
                                                                                    ) =>
                                                                                        theme
                                                                                            .palette
                                                                                            .mode ===
                                                                                        "dark"
                                                                                            ? "rgba(255, 255, 255, 0.04)"
                                                                                            : "rgba(0, 0, 0, 0.03)",
                                                                                padding:
                                                                                    "12px",
                                                                                borderRadius:
                                                                                    "8px",
                                                                                border: (
                                                                                    theme,
                                                                                ) =>
                                                                                    theme
                                                                                        .palette
                                                                                        .mode ===
                                                                                    "dark"
                                                                                        ? "1px solid rgba(255, 255, 255, 0.06)"
                                                                                        : "1px solid rgba(0, 0, 0, 0.05)",
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                variant='subtitle2'
                                                                                sx={{
                                                                                    fontWeight:
                                                                                        "bold",
                                                                                    color: "primary.main",
                                                                                }}
                                                                            >
                                                                                {
                                                                                    statExp.stat
                                                                                }
                                                                                :
                                                                            </Typography>
                                                                            <Typography variant='body2'>
                                                                                <EnhancedKeywordLinker>
                                                                                    {
                                                                                        statExp.description
                                                                                    }
                                                                                </EnhancedKeywordLinker>
                                                                            </Typography>
                                                                        </Box>
                                                                    ),
                                                                )}
                                                            </Box>
                                                        </>
                                                    )}

                                                    {subsection.rules && (
                                                        <List sx={{ pl: 1 }}>
                                                            {subsection.rules.map(
                                                                (
                                                                    rule,
                                                                    index,
                                                                ) => (
                                                                    <ListItem
                                                                        key={
                                                                            index
                                                                        }
                                                                        sx={{
                                                                            py: 0.5,
                                                                        }}
                                                                    >
                                                                        <Typography variant='body1'>
                                                                            <EnhancedKeywordLinker>
                                                                                {
                                                                                    rule
                                                                                }
                                                                            </EnhancedKeywordLinker>
                                                                        </Typography>
                                                                    </ListItem>
                                                                ),
                                                            )}
                                                        </List>
                                                    )}

                                                    {subsection.example_actions && (
                                                        <>
                                                            <Typography
                                                                variant='body1'
                                                                sx={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    mt: 2,
                                                                }}
                                                            >
                                                                Example Actions:
                                                            </Typography>
                                                            <List
                                                                sx={{ pl: 1 }}
                                                            >
                                                                {subsection.example_actions.map(
                                                                    (
                                                                        action,
                                                                        index,
                                                                    ) => (
                                                                        <ListItem
                                                                            key={
                                                                                index
                                                                            }
                                                                            sx={{
                                                                                py: 0.5,
                                                                            }}
                                                                        >
                                                                            <Typography variant='body1'>
                                                                                <EnhancedKeywordLinker>
                                                                                    {
                                                                                        action
                                                                                    }
                                                                                </EnhancedKeywordLinker>
                                                                            </Typography>
                                                                        </ListItem>
                                                                    ),
                                                                )}
                                                            </List>
                                                        </>
                                                    )}

                                                    {subsection.examples && (
                                                        <>
                                                            <Typography
                                                                variant='body1'
                                                                sx={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    mt: 2,
                                                                }}
                                                            >
                                                                Examples:
                                                            </Typography>
                                                            <List
                                                                sx={{ pl: 1 }}
                                                            >
                                                                {subsection.examples.map(
                                                                    (
                                                                        example,
                                                                        index,
                                                                    ) => (
                                                                        <ListItem
                                                                            key={
                                                                                index
                                                                            }
                                                                            sx={{
                                                                                py: 0.5,
                                                                            }}
                                                                        >
                                                                            <Typography variant='body1'>
                                                                                <EnhancedKeywordLinker>
                                                                                    {
                                                                                        example
                                                                                    }
                                                                                </EnhancedKeywordLinker>
                                                                            </Typography>
                                                                        </ListItem>
                                                                    ),
                                                                )}
                                                            </List>
                                                        </>
                                                    )}
                                                </Box>
                                            ),
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Slide>
                    ))}
                </Box>
            </Container>

            <GMToolsButton />
        </>
    )
}

export default RunningTheGame
