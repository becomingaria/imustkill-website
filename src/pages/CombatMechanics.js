import {
    Container,
    Typography,
    List,
    ListItem,
    CircularProgress,
    Alert,
    Box,
    Chip,
} from "@mui/material"
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useSectionManager from "../hooks/useSectionManager"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import EditableSection from "../components/EditableSection"
import { scrollToAnchor } from "../utils/scrollToAnchor"
import { Slide, glassSection, glassItem } from "../components/RulesPageShared"

const CombatMechanics = () => {
    const {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager("combat-mechanics")
    const location = useLocation()

    // Handle scrolling to anchor sections once data is loaded
    useEffect(() => {
        if (sections.length > 0 && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [sections.length, location.hash])

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
                    {title}
                </Typography>

                {/* Render all sections dynamically */}
                {sections.map((section, idx) => (
                    <EditableSection
                        key={section.id}
                        category='combat-mechanics'
                        sectionId={section.id}
                        sectionOrder={idx}
                        section={section}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onInsertAfter={handleInsertAfter}
                        onInsertBefore={handleInsertBefore}
                    >
                        <Slide delay={idx * 50}>
                        <Box
                            id={section.id}
                            sx={{
                                ...glassSection,
                                p: { xs: 3, sm: 4 },
                                width: "100%",
                                maxWidth: "800px",
                            }}
                        >
                            <Typography variant='h3' gutterBottom>
                                {section.title}
                            </Typography>

                            {/* Section description */}
                            {section.description && (
                                <Typography variant='body1' paragraph>
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
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
                                            {section.rules.map(
                                                (rule, index) => (
                                                    <>
                                                        {/* Step Chip */}
                                                        <Chip
                                                            key={`step-${index}`}
                                                            label={rule}
                                                            sx={{
                                                                gridColumn: {
                                                                    xs: "1",
                                                                    sm: `${
                                                                        index *
                                                                            2 +
                                                                        1
                                                                    } / ${
                                                                        index *
                                                                            2 +
                                                                        2
                                                                    }`,
                                                                },
                                                                gridRow: {
                                                                    xs: `${
                                                                        index *
                                                                            2 +
                                                                        1
                                                                    }`,
                                                                    sm: "1",
                                                                },
                                                                height: {
                                                                    xs: "auto",
                                                                    sm: "100%",
                                                                },
                                                                width: "100%",
                                                                maxWidth:
                                                                    "none",
                                                                fontSize: {
                                                                    xs: "0.85rem",
                                                                    sm: "0.95rem",
                                                                    md: "1rem",
                                                                },
                                                                fontWeight:
                                                                    "600",
                                                                fontFamily:
                                                                    "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
                                                                textAlign:
                                                                    "center",
                                                                letterSpacing:
                                                                    "0.02em",
                                                                "& .MuiChip-label":
                                                                    {
                                                                        whiteSpace:
                                                                            "normal",
                                                                        lineHeight: 1.4,
                                                                        padding:
                                                                            {
                                                                                xs: "10px 8px",
                                                                                sm: "16px 14px",
                                                                                md: "18px 16px",
                                                                            },
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        justifyContent:
                                                                            "center",
                                                                        height: "100%",
                                                                    },
                                                                bgcolor: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "#424242"
                                                                        : "#f8f9fa",
                                                                color: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "#ffffff"
                                                                        : "#2c3e50",
                                                                border: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
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
                                                            section.rules
                                                                .length -
                                                                1 && (
                                                            <Typography
                                                                key={`arrow-${index}`}
                                                                variant='body1'
                                                                sx={{
                                                                    gridColumn:
                                                                        {
                                                                            xs: "1",
                                                                            sm: `${
                                                                                index *
                                                                                    2 +
                                                                                2
                                                                            } / ${
                                                                                index *
                                                                                    2 +
                                                                                3
                                                                            }`,
                                                                        },
                                                                    gridRow: {
                                                                        xs: `${
                                                                            index *
                                                                                2 +
                                                                            2
                                                                        }`,
                                                                        sm: "1",
                                                                    },
                                                                    color: (
                                                                        theme,
                                                                    ) =>
                                                                        theme
                                                                            .palette
                                                                            .mode ===
                                                                        "dark"
                                                                            ? "#81c784"
                                                                            : "#66bb6a",
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize: {
                                                                        xs: "1.1rem",
                                                                        sm: "1.4rem",
                                                                        md: "1.6rem",
                                                                    },
                                                                    transform: {
                                                                        xs: "rotate(90deg)",
                                                                        sm: "none",
                                                                    },
                                                                    userSelect:
                                                                        "none",
                                                                    display:
                                                                        "flex",
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
                                                                        transform:
                                                                            {
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
                                                ),
                                            )}
                                        </Box>
                                    ) : (
                                        /* Regular list for other sections */
                                        <List>
                                            {section.rules.map(
                                                (rule, index) => (
                                                    <ListItem key={index}>
                                                        <EnhancedKeywordLinker
                                                            referencesOnly={
                                                                true
                                                            }
                                                        >
                                                            {rule}
                                                        </EnhancedKeywordLinker>
                                                    </ListItem>
                                                ),
                                            )}
                                        </List>
                                    )}
                                </>
                            )}

                            {/* Combat actions */}
                            {section.actions && (
                                <>
                                    {/* Detailed action descriptions */}
                                    {section.actions.map((action, index) => (
                                        <Box
                                            key={`${action.name}-detail`}
                                            sx={{ ...glassItem }}
                                        >
                                            <Typography
                                                variant='h4'
                                                gutterBottom
                                                id={
                                                    action.id ||
                                                    action.name
                                                        .toLowerCase()
                                                        .replace(
                                                            /[^a-z0-9]+/g,
                                                            "-",
                                                        )
                                                        .replace(/^-+|-+$/g, "")
                                                }
                                            >
                                                {action.name}:
                                            </Typography>
                                            <Typography
                                                variant='body1'
                                                paragraph
                                            >
                                                <EnhancedKeywordLinker
                                                    referencesOnly={true}
                                                >
                                                    {action.description}
                                                </EnhancedKeywordLinker>
                                            </Typography>
                                        </Box>
                                    ))}
                                </>
                            )}

                            {/* Damage types */}
                            {section.types && (
                                <>
                                    {section.types.map((type) => (
                                        <Box
                                            key={type.name}
                                            sx={{ ...glassItem }}
                                        >
                                            <Typography
                                                variant='h4'
                                                gutterBottom
                                            >
                                                {type.name}
                                            </Typography>
                                            <Typography
                                                variant='body1'
                                                paragraph
                                            >
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
                                        </Box>
                                    ))}
                                </>
                            )}

                            {/* Equipment (shields & armor) */}
                            {section.equipment && (
                                <>
                                    {section.equipment.map((item) => (
                                        <Box
                                            key={item.name}
                                            sx={{ ...glassItem }}
                                        >
                                            <Typography
                                                variant='h4'
                                                gutterBottom
                                            >
                                                {item.name}:
                                            </Typography>
                                            <Typography
                                                variant='body1'
                                                paragraph
                                            >
                                                <EnhancedKeywordLinker
                                                    referencesOnly={true}
                                                >
                                                    {item.effect}
                                                </EnhancedKeywordLinker>
                                            </Typography>
                                        </Box>
                                    ))}
                                </>
                            )}

                            {/* Status conditions */}
                            {section.conditions && (
                                <>
                                    {section.conditions.map((condition) => (
                                        <Box
                                            key={condition.name}
                                            sx={{ ...glassItem }}
                                        >
                                            <Typography
                                                variant='h4'
                                                gutterBottom
                                            >
                                                {condition.name}
                                            </Typography>
                                            <Typography
                                                variant='body1'
                                                paragraph
                                            >
                                                <EnhancedKeywordLinker
                                                    referencesOnly={true}
                                                >
                                                    {condition.description}
                                                </EnhancedKeywordLinker>
                                            </Typography>
                                        </Box>
                                    ))}
                                </>
                            )}
                        </Box>
                        </Slide>
                    </EditableSection>
                ))}
            </Container>

            <HomeButton />
        </>
    )
}

export default CombatMechanics
