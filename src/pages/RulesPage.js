/**
 * RulesPage.js
 *
 * Single generic component for every rules reference page.
 * Pass the category key (matching the DB record) and the component does the rest.
 *
 * Usage:
 *   <RulesPage categoryKey="combat-mechanics" />
 *   <RulesPage categoryKey="running-the-game" />
 */
import React, { useEffect } from "react"
import {
    Container,
    Typography,
    Box,
    Grid,
    List,
    ListItem,
    Chip,
    CircularProgress,
    Alert,
} from "@mui/material"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import GMToolsButton from "../components/GMToolsButton"
import useSectionManager from "../hooks/useSectionManager"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import EditableSection from "../components/EditableSection"
import { scrollToAnchor } from "../utils/scrollToAnchor"
import { Slide, glassSection, glassItem } from "../components/RulesPageShared"

// ── Per-category page config ────────────────────────────────────────────────
// footerButton: "home" | "gm" | null
// heroSubtitle: shown beneath the h1 in a brief hero block
const PAGE_CONFIG = {
    "running-the-game": {
        footerButton: "gm",
        heroSubtitle:
            "A comprehensive guide for Game Masters on running hunts, managing encounters, and creating unforgettable sessions.",
    },
}

// ── Labeled plain-text fields that appear in many categories ────────────────
const LABELED_FIELDS = [
    { key: "mechanics", label: "Mechanics" },
    { key: "limitations", label: "Limitations" },
    { key: "limits", label: "Limits" },
    { key: "perception", label: "Perception" },
    { key: "maximum", label: "Maximum" },
    { key: "ascendant", label: "Ascendant" },
    { key: "timing", label: "Timing" },
]

// ── Helpers ─────────────────────────────────────────────────────────────────
function Kw({ children }) {
    return (
        <EnhancedKeywordLinker referencesOnly={true}>
            {children}
        </EnhancedKeywordLinker>
    )
}

function BulletList({ items }) {
    return (
        <List>
            {items.map((item, i) => (
                <ListItem key={i}>
                    <Typography variant='body1'>
                        <Kw>{item}</Kw>
                    </Typography>
                </ListItem>
            ))}
        </List>
    )
}

// ── Sub-section renderer (RunningTheGame + CharacterCreation) ───────────────
function renderSubsection(sub) {
    return (
        <Box
            key={sub.id || sub.title}
            id={sub.id}
            sx={{ ...glassItem, p: { xs: "16px", sm: "24px" }, mb: 0 }}
        >
            <Typography
                variant='h4'
                sx={{
                    fontWeight: "bold",
                    mb: 2,
                    fontSize: { xs: "1.1rem", sm: "1.3rem" },
                }}
            >
                {sub.title}
            </Typography>

            {sub.description && (
                <Typography variant='body1' sx={{ lineHeight: 1.7, mb: 2 }}>
                    <Kw>{sub.description}</Kw>
                </Typography>
            )}

            {/* Mechanics callout box (RunningTheGame) */}
            {sub.mechanics && (
                <Box
                    sx={{
                        fontStyle: "italic",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.04)",
                        p: 2,
                        borderRadius: "8px",
                        mb: 2,
                    }}
                >
                    <Typography variant='body1'>
                        <strong>Mechanics:</strong> <Kw>{sub.mechanics}</Kw>
                    </Typography>
                </Box>
            )}

            {/* Stat breakdown (RunningTheGame) */}
            {sub.stat_explanations && (
                <>
                    <Typography
                        variant='body1'
                        sx={{ fontWeight: "bold", mt: 2, mb: 1 }}
                    >
                        Stat Breakdown:
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        {sub.stat_explanations.map((se, i) => (
                            <Box
                                key={i}
                                sx={{
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.04)"
                                            : "rgba(0,0,0,0.03)",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255,255,255,0.06)"
                                            : "1px solid rgba(0,0,0,0.05)",
                                }}
                            >
                                <Typography
                                    variant='subtitle2'
                                    sx={{
                                        fontWeight: "bold",
                                        color: "primary.main",
                                    }}
                                >
                                    {se.stat}:
                                </Typography>
                                <Typography variant='body2'>
                                    <Kw>{se.description}</Kw>
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </>
            )}

            {/* Rules list */}
            {sub.rules && (
                <List sx={{ pl: 1 }}>
                    {sub.rules.map((rule, i) => (
                        <ListItem key={i} sx={{ py: 0.5 }}>
                            <Typography variant='body1'>
                                <Kw>{rule}</Kw>
                            </Typography>
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Example actions (RunningTheGame) */}
            {sub.example_actions && (
                <>
                    <Typography
                        variant='body1'
                        sx={{ fontWeight: "bold", mt: 2 }}
                    >
                        Example Actions:
                    </Typography>
                    <List sx={{ pl: 1 }}>
                        {sub.example_actions.map((a, i) => (
                            <ListItem key={i} sx={{ py: 0.5 }}>
                                <Typography variant='body1'>
                                    <Kw>{a}</Kw>
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            {/* Examples list (RunningTheGame) */}
            {sub.examples && (
                <>
                    <Typography
                        variant='body1'
                        sx={{ fontWeight: "bold", mt: 2 }}
                    >
                        Examples:
                    </Typography>
                    <List sx={{ pl: 1 }}>
                        {sub.examples.map((ex, i) => (
                            <ListItem key={i} sx={{ py: 0.5 }}>
                                <Typography variant='body1'>
                                    <Kw>{ex}</Kw>
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                </>
            )}

            {/* Options list (CharacterCreation) */}
            {sub.options && (
                <List>
                    {sub.options.map((opt, i) => (
                        <ListItem key={i}>
                            <Kw>{opt}</Kw>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    )
}

// ── Generic section body renderer ───────────────────────────────────────────
function renderSectionFields(section) {
    return (
        <>
            {/* Plain description (no label) */}
            {section.description && (
                <Typography variant='body1' paragraph>
                    <Kw>{section.description}</Kw>
                </Typography>
            )}

            {/* Labeled text fields */}
            {LABELED_FIELDS.map(({ key, label }) =>
                section[key] ? (
                    <Typography key={key} variant='body1' paragraph>
                        <strong>{label}:</strong> <Kw>{section[key]}</Kw>
                    </Typography>
                ) : null,
            )}

            {/* Available stats (join array) */}
            {section.available_stats && (
                <Typography variant='body1' paragraph>
                    <strong>Available Stats:</strong>{" "}
                    {section.available_stats.join(", ")}
                </Typography>
            )}

            {/* Benefits list */}
            {section.benefits && (
                <>
                    <Typography variant='body1' paragraph>
                        <strong>Benefits:</strong>
                    </Typography>
                    <BulletList items={section.benefits} />
                </>
            )}

            {/* Examples (italic paragraphs) */}
            {section.examples && (
                <>
                    <Typography variant='body1' paragraph>
                        <strong>Examples:</strong>
                    </Typography>
                    {section.examples.map((ex, i) => (
                        <Typography
                            key={i}
                            variant='body1'
                            paragraph
                            sx={{ fontStyle: "italic", ml: 2 }}
                        >
                            <Kw>{ex}</Kw>
                        </Typography>
                    ))}
                </>
            )}

            {/* Rules: turns grid (id="turns") OR bullet list */}
            {section.rules &&
                (section.id === "turns" ? (
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
                            height: { xs: "auto", sm: "180px", md: "200px" },
                        }}
                    >
                        {section.rules.map((rule, i) => (
                            <React.Fragment key={i}>
                                <Chip
                                    label={rule}
                                    sx={{
                                        gridColumn: {
                                            xs: "1",
                                            sm: `${i * 2 + 1} / ${i * 2 + 2}`,
                                        },
                                        gridRow: {
                                            xs: `${i * 2 + 1}`,
                                            sm: "1",
                                        },
                                        height: { xs: "auto", sm: "100%" },
                                        width: "100%",
                                        maxWidth: "none",
                                        fontSize: {
                                            xs: "0.85rem",
                                            sm: "0.95rem",
                                            md: "1rem",
                                        },
                                        fontWeight: "600",
                                        textAlign: "center",
                                        "& .MuiChip-label": {
                                            whiteSpace: "normal",
                                            lineHeight: 1.4,
                                            padding: {
                                                xs: "10px 8px",
                                                sm: "16px 14px",
                                                md: "18px 16px",
                                            },
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            height: "100%",
                                        },
                                        bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#424242"
                                                : "#f8f9fa",
                                        color: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#ffffff"
                                                : "#2c3e50",
                                        border: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "1px solid #616161"
                                                : "1px solid #dee2e6",
                                        boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
                                        "&:hover": {
                                            transform: "translateY(-1px)",
                                        },
                                    }}
                                />
                                {i < section.rules.length - 1 && (
                                    <Typography
                                        variant='body1'
                                        sx={{
                                            gridColumn: {
                                                xs: "1",
                                                sm: `${i * 2 + 2} / ${i * 2 + 3}`,
                                            },
                                            gridRow: {
                                                xs: `${i * 2 + 2}`,
                                                sm: "1",
                                            },
                                            color: (theme) =>
                                                theme.palette.mode === "dark"
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
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        ▶
                                    </Typography>
                                )}
                            </React.Fragment>
                        ))}
                    </Box>
                ) : (
                    <BulletList items={section.rules} />
                ))}

            {/* Combat actions */}
            {section.actions &&
                section.actions.map((action) => (
                    <Box
                        key={action.name}
                        sx={{ ...glassItem }}
                        id={
                            action.id ||
                            (action.name || "")
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/^-+|-+$/g, "")
                        }
                    >
                        <Typography variant='h4' gutterBottom>
                            {action.name}:
                        </Typography>
                        <Typography variant='body1' paragraph>
                            <Kw>{action.description}</Kw>
                        </Typography>
                    </Box>
                ))}

            {/* Damage / effect types */}
            {section.types &&
                section.types.map((type) => (
                    <Box key={type.name} sx={{ ...glassItem }}>
                        <Typography variant='h4' gutterBottom>
                            {type.name}
                        </Typography>
                        <Typography variant='body1' paragraph>
                            <Kw>{type.description}</Kw>
                        </Typography>
                        {type.examples && (
                            <Typography variant='body2' paragraph>
                                <strong>Examples:</strong>{" "}
                                {type.examples.join(", ")}
                            </Typography>
                        )}
                    </Box>
                ))}

            {/* Equipment (shields, armour) */}
            {section.equipment &&
                section.equipment.map((item) => (
                    <Box key={item.name} sx={{ ...glassItem }}>
                        <Typography variant='h4' gutterBottom>
                            {item.name}:
                        </Typography>
                        <Typography variant='body1' paragraph>
                            <Kw>{item.effect}</Kw>
                        </Typography>
                    </Box>
                ))}

            {/* Status conditions */}
            {section.conditions &&
                section.conditions.map((cond) => (
                    <Box key={cond.name} sx={{ ...glassItem }}>
                        <Typography variant='h4' gutterBottom>
                            {cond.name}
                        </Typography>
                        <Typography variant='body1' paragraph>
                            <Kw>{cond.description}</Kw>
                        </Typography>
                    </Box>
                ))}

            {/* Phases (numbered breakdown, e.g. RunningTheGame hunt phases) */}
            {section.phases && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {section.phases.map((phase, i) => (
                        <Box key={phase.name} sx={{ ...glassItem }}>
                            <Typography
                                variant='h4'
                                sx={{
                                    fontWeight: "bold",
                                    mb: 1,
                                    fontSize: { xs: "1.1rem", sm: "1.3rem" },
                                }}
                            >
                                {i + 1}. {phase.name}
                            </Typography>
                            <Typography
                                variant='body1'
                                sx={{ lineHeight: 1.7 }}
                            >
                                <Kw>{phase.description}</Kw>
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Stats grid — section.content[] (CharacterCreation "stats" section) */}
            {section.content && (
                <Grid container spacing={2}>
                    {section.content.map((stat, i) => (
                        <Grid item xs={12} sm={6} key={i}>
                            <Box
                                sx={{
                                    ...glassItem,
                                    margin: 0,
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                                id={
                                    stat.id ||
                                    (stat.name || "")
                                        .toLowerCase()
                                        .replace(/[^a-z0-9]+/g, "-")
                                        .replace(/^-+|-+$/g, "")
                                }
                            >
                                <Typography
                                    variant='h5'
                                    sx={{
                                        fontWeight: "bold",
                                        mb: 1,
                                        color: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#4fc3f7"
                                                : "#1976d2",
                                    }}
                                >
                                    {stat.name}
                                </Typography>
                                <Typography
                                    variant='body1'
                                    sx={{ flexGrow: 1, lineHeight: 1.6 }}
                                >
                                    <Kw>{stat.description}</Kw>
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Subsections (RunningTheGame nested content / CharacterCreation steps) */}
            {section.subsections && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {section.subsections.map(renderSubsection)}
                </Box>
            )}
        </>
    )
}

// ── Main component ───────────────────────────────────────────────────────────
function RulesPage({ categoryKey }) {
    const config = PAGE_CONFIG[categoryKey] || { footerButton: "home" }
    const {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager(categoryKey)
    const location = useLocation()

    // Scroll to anchor once sections are loaded
    useEffect(() => {
        if (sections.length > 0 && location.hash) {
            const timer = setTimeout(() => {
                scrollToAnchor(location.hash.substring(1))
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
                    Error loading {title || categoryKey}: {error}
                </Alert>
            </Container>
        )
    }

    const FooterButton =
        config.footerButton === "gm" ? GMToolsButton : HomeButton

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
                {/* Hero block — shown when a subtitle is configured (e.g. RunningTheGame) */}
                {config.heroSubtitle ? (
                    <Box
                        sx={{
                            minHeight: "50vh",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            mb: { xs: "40px", sm: "60px" },
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
                                    mb: "20px",
                                }}
                            >
                                {title}
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
                                {config.heroSubtitle}
                            </Typography>
                        </Slide>
                        <Slide delay={400}>
                            <Box
                                sx={{
                                    mt: "40px",
                                    fontSize: "3rem",
                                    animation: "bounce 2s infinite",
                                    "@keyframes bounce": {
                                        "0%, 100%": {
                                            transform: "translateY(0)",
                                        },
                                        "50%": {
                                            transform: "translateY(10px)",
                                        },
                                    },
                                }}
                            >
                                ↓
                            </Box>
                        </Slide>
                    </Box>
                ) : (
                    /* Simple page title for all other rules pages */
                    <Typography
                        variant='h1'
                        gutterBottom
                        sx={{
                            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                            textAlign: "center",
                        }}
                    >
                        {title}
                    </Typography>
                )}

                {/* Content wrapper — RunningTheGame had an explicit max-width container */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: config.heroSubtitle
                            ? { xs: "60px", sm: "80px" }
                            : "20px",
                        maxWidth: config.heroSubtitle ? "900px" : "800px",
                        width: "100%",
                    }}
                >
                    {sections.map((section, idx) => (
                        <EditableSection
                            key={section.id}
                            category={categoryKey}
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
                                    }}
                                >
                                    <Typography variant='h3' gutterBottom>
                                        {section.title}
                                    </Typography>
                                    {renderSectionFields(section)}
                                </Box>
                            </Slide>
                        </EditableSection>
                    ))}
                </Box>
            </Container>

            {config.footerButton !== null && <FooterButton />}
        </>
    )
}

export default RulesPage
