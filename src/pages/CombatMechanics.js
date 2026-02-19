import {
    Container,
    Typography,
    List,
    ListItem,
    Paper,
    CircularProgress,
    Alert,
    Box,
    Chip,
} from "@mui/material"
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useRulesEngine from "../hooks/useRulesEngine"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import { scrollToAnchor } from "../utils/scrollToAnchor"

const CombatMechanics = () => {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [combatData, setCombatData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        if (!loading && !error) {
            const data = getCategoryRules("combat-mechanics")
            setCombatData(data)
        }
    }, [loading, error, getCategoryRules])

    // Handle scrolling to anchor sections
    useEffect(() => {
        if (combatData && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [combatData, location.hash])

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
                    Error loading combat mechanics: {error}
                </Alert>
            </Container>
        )
    }

    if (!combatData) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='warning'>No combat mechanics data found</Alert>
            </Container>
        )
    }

    return (
        <>
            <Container
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: "20px",
                    display: "flex",
                    paddingBottom: "100px",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Typography
                    variant='h1'
                    gutterBottom
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                    }}
                >
                    {combatData.title}
                </Typography>

                {/* Render all sections dynamically */}
                {combatData.sections.map((section) => (
                    <Paper
                        key={section.id}
                        id={section.id} // Add this ID for anchor links
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                    : "1px solid rgba(0, 0, 0, 0.1)",
                            borderRadius: "16px",
                            backdropFilter: "blur(10px)",
                            padding: "20px",
                            width: "100%",
                            maxWidth: "800px",
                            marginBottom: "20px",
                        }}
                    >
                        <Typography variant='h3' gutterBottom>
                            {section.title}
                        </Typography>

                        {/* Section description */}
                        {section.description && (
                            <Typography variant='body1' paragraph>
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.description}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section rules */}
                        {section.rules && (
                            <>
                                {" "}
                                {section.id === "turns" ? (
                                    /* Turns Grid Flowchart */
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "5fr 0.2fr 5fr 0.2fr 5fr 0.2fr 5fr",
                                                md: "5fr 0.15fr 5fr 0.15fr 5fr 0.15fr 5fr",
                                            },
                                            gridTemplateRows: {
                                                xs: "repeat(7, auto)",
                                                sm: "1fr",
                                            },
                                            gap: { xs: 1, sm: 0.1 },
                                            alignItems: "stretch",
                                            justifyItems: "center",
                                            my: 3,
                                            maxWidth: "100%",
                                            height: {
                                                xs: "auto",
                                                sm: "180px",
                                                md: "200px",
                                            },
                                        }}
                                    >
                                        {section.rules.map((rule, index) => (
                                            <>
                                                {/* Step Chip */}
                                                <Chip
                                                    key={`step-${index}`}
                                                    label={rule}
                                                    sx={{
                                                        gridColumn: {
                                                            xs: "1",
                                                            sm: `${
                                                                index * 2 + 1
                                                            } / ${
                                                                index * 2 + 2
                                                            }`,
                                                        },
                                                        gridRow: {
                                                            xs: `${
                                                                index * 2 + 1
                                                            }`,
                                                            sm: "1",
                                                        },
                                                        height: {
                                                            xs: "auto",
                                                            sm: "100%",
                                                        },
                                                        width: "100%",
                                                        maxWidth: "none",
                                                        fontSize: {
                                                            xs: "0.85rem",
                                                            sm: "0.95rem",
                                                            md: "1rem",
                                                        },
                                                        fontWeight: "600",
                                                        fontFamily:
                                                            "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
                                                        textAlign: "center",
                                                        letterSpacing: "0.02em",
                                                        "& .MuiChip-label": {
                                                            whiteSpace:
                                                                "normal",
                                                            lineHeight: 1.4,
                                                            padding: {
                                                                xs: "10px 8px",
                                                                sm: "16px 14px",
                                                                md: "18px 16px",
                                                            },
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            height: "100%",
                                                        },
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "#424242"
                                                                : "#f8f9fa",
                                                        color: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "#ffffff"
                                                                : "#2c3e50",
                                                        border: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "1px solid #616161"
                                                                : "1px solid #dee2e6",
                                                        boxShadow:
                                                            "0 3px 8px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                                                        transition:
                                                            "all 0.2s ease-in-out",
                                                        "&:hover": {
                                                            transform:
                                                                "translateY(-1px)",
                                                            boxShadow:
                                                                "0 4px 12px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)",
                                                        },
                                                    }}
                                                />

                                                {/* Arrow between steps */}
                                                {index <
                                                    section.rules.length -
                                                        1 && (
                                                    <Typography
                                                        key={`arrow-${index}`}
                                                        variant='body1'
                                                        sx={{
                                                            gridColumn: {
                                                                xs: "1",
                                                                sm: `${
                                                                    index * 2 +
                                                                    2
                                                                } / ${
                                                                    index * 2 +
                                                                    3
                                                                }`,
                                                            },
                                                            gridRow: {
                                                                xs: `${
                                                                    index * 2 +
                                                                    2
                                                                }`,
                                                                sm: "1",
                                                            },
                                                            color: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "#81c784"
                                                                    : "#66bb6a",
                                                            fontWeight: "bold",
                                                            fontSize: {
                                                                xs: "1.1rem",
                                                                sm: "1.4rem",
                                                                md: "1.6rem",
                                                            },
                                                            transform: {
                                                                xs: "rotate(90deg)",
                                                                sm: "none",
                                                            },
                                                            userSelect: "none",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            padding: 0,
                                                            margin: 0,
                                                            textShadow:
                                                                "0 1px 2px rgba(0,0,0,0.1)",
                                                            transition:
                                                                "all 0.3s ease-in-out",
                                                            "&:hover": {
                                                                transform: {
                                                                    xs: "rotate(90deg) scale(1.1)",
                                                                    sm: "scale(1.2)",
                                                                },
                                                                color: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "#a5d6a7"
                                                                        : "#4caf50",
                                                            },
                                                        }}
                                                    >
                                                        ▶
                                                    </Typography>
                                                )}
                                            </>
                                        ))}
                                    </Box>
                                ) : (
                                    /* Regular list for other sections */
                                    <List>
                                        {section.rules.map((rule, index) => (
                                            <ListItem key={index}>
                                                <EnhancedKeywordLinker
                                                    referencesOnly={true}
                                                >
                                                    {rule}
                                                </EnhancedKeywordLinker>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </>
                        )}

                        {/* Combat actions */}
                        {section.actions && (
                            <>
                                {/* Detailed action descriptions */}
                                {section.actions.map((action, index) => (
                                    <Paper
                                        key={`${action.name}-detail`}
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            padding: "15px",
                                            margin: "15px 0",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderRadius: "12px",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                border: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "1px solid rgba(255, 255, 255, 0.2)"
                                                        : "1px solid rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant='h4'
                                            gutterBottom
                                            id={
                                                action.id ||
                                                action.name
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, "-")
                                                    .replace(/^-+|-+$/g, "")
                                            }
                                        >
                                            {action.name}:
                                        </Typography>
                                        <Typography variant='body1' paragraph>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {action.description}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                    </Paper>
                                ))}
                            </>
                        )}

                        {/* Damage types */}
                        {section.types && (
                            <>
                                {section.types.map((type) => (
                                    <Paper
                                        key={type.name}
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            padding: "15px",
                                            margin: "15px 0",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderRadius: "12px",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                border: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "1px solid rgba(255, 255, 255, 0.2)"
                                                        : "1px solid rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <Typography variant='h4' gutterBottom>
                                            {type.name}
                                        </Typography>
                                        <Typography variant='body1' paragraph>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {type.description}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                        {type.examples && (
                                            <Typography
                                                variant='body2'
                                                paragraph
                                            >
                                                <strong>Examples:</strong>{" "}
                                                {type.examples.join(", ")}
                                            </Typography>
                                        )}
                                    </Paper>
                                ))}
                            </>
                        )}

                        {/* Equipment (shields & armor) */}
                        {section.equipment && (
                            <>
                                {section.equipment.map((item) => (
                                    <Paper
                                        key={item.name}
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            padding: "15px",
                                            margin: "15px 0",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderRadius: "12px",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                border: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "1px solid rgba(255, 255, 255, 0.2)"
                                                        : "1px solid rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <Typography variant='h4' gutterBottom>
                                            {item.name}:
                                        </Typography>
                                        <Typography variant='body1' paragraph>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {item.effect}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                    </Paper>
                                ))}
                            </>
                        )}

                        {/* Status conditions */}
                        {section.conditions && (
                            <>
                                {section.conditions.map((condition) => (
                                    <Paper
                                        key={condition.name}
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            padding: "15px",
                                            margin: "15px 0",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderRadius: "12px",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                border: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "1px solid rgba(255, 255, 255, 0.2)"
                                                        : "1px solid rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <Typography variant='h4' gutterBottom>
                                            {condition.name}
                                        </Typography>
                                        <Typography variant='body1' paragraph>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {condition.description}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                    </Paper>
                                ))}
                            </>
                        )}
                    </Paper>
                ))}
            </Container>

            <HomeButton />
        </>
    )
}

export default CombatMechanics
