import React from "react"
import { Link } from "react-router-dom"
import {
    Container,
    Typography,
    Box,
    Button,
    Grid,
    CircularProgress,
    Alert,
} from "@mui/material"
import {
    CrossedSwordsIcon,
    ScrollIcon,
    TargetIcon,
    SkullIcon,
    ChevronDownIcon,
    D10Icon,
} from "../components/icons"
import useSectionManager from "../hooks/useSectionManager"
import EditableSection from "../components/EditableSection"
import { Slide, glassSection } from "../components/RulesPageShared"

const SECTION_ICONS = {
    "the-core-mechanic": TargetIcon,
    "the-four-stats": ScrollIcon,
    "combat-in-60-seconds": CrossedSwordsIcon,
    "your-first-hunt": SkullIcon,
}

const renderSectionContent = (section, glassSection) => {
    switch (section.id) {
        case "the-core-mechanic":
            return (
                <>
                    <Typography
                        sx={{
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            lineHeight: 1.8,
                            mb: 3,
                        }}
                    >
                        {section.description}
                    </Typography>
                    <Box
                        sx={{
                            ...glassSection,
                            p: 3,
                            textAlign: "center",
                            mb: 3,
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: { xs: "1.2rem", sm: "1.4rem" },
                                fontWeight: "bold",
                                mb: 1,
                            }}
                        >
                            {section.coreRule}
                        </Typography>
                        <Typography
                            sx={{
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#b0b0b0"
                                        : "#555",
                            }}
                        >
                            {section.coreRuleNote}
                        </Typography>
                    </Box>
                    <Typography
                        sx={{
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            lineHeight: 1.8,
                            mb: 3,
                        }}
                    >
                        {section.body}
                    </Typography>
                    <Box
                        sx={{
                            ...glassSection,
                            p: 2.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 2.5,
                        }}
                    >
                        <Box sx={{ flexShrink: 0 }}>
                            <D10Icon size={48} />
                        </Box>
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight: "bold",
                                    mb: 0.5,
                                    fontSize: "1rem",
                                }}
                            >
                                What's a d10?
                            </Typography>
                            <Typography
                                variant='body2'
                                sx={{
                                    lineHeight: 1.7,
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#555",
                                }}
                            >
                                {section.d10Note}
                            </Typography>
                        </Box>
                    </Box>
                </>
            )

        case "the-four-stats":
            return (
                <>
                    <Typography
                        sx={{
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            lineHeight: 1.8,
                            mb: 3,
                        }}
                    >
                        {section.description}
                    </Typography>
                    <Grid container spacing={2}>
                        {(section.stats || []).map((stat) => (
                            <Grid item xs={12} sm={6} key={stat.name}>
                                <Box
                                    sx={{
                                        ...glassSection,
                                        p: 2,
                                        borderLeft: `3px solid ${stat.color}`,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: "bold",
                                            fontSize: "1.1rem",
                                            mb: 0.5,
                                        }}
                                    >
                                        {stat.name}
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            color: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#b0b0b0"
                                                    : "#555",
                                        }}
                                    >
                                        {stat.desc}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    {section.quickStart && (
                        <Typography
                            sx={{
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                                lineHeight: 1.6,
                                mt: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#b0b0b0"
                                        : "#555",
                            }}
                        >
                            <strong>Quick start:</strong> {section.quickStart}
                        </Typography>
                    )}
                </>
            )

        case "combat-in-60-seconds":
            return (
                <>
                    <Typography
                        sx={{
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            lineHeight: 1.8,
                            mb: 3,
                        }}
                    >
                        {section.description}
                    </Typography>
                    {section.turnOrder && (
                        <Box sx={{ ...glassSection, p: 3, mb: 3 }}>
                            <Typography
                                sx={{
                                    fontWeight: "bold",
                                    mb: 2,
                                    fontSize: "1.1rem",
                                }}
                            >
                                Turn Order
                            </Typography>
                            <Box component='ol' sx={{ pl: 2, m: 0 }}>
                                {section.turnOrder.map((step, i) => (
                                    <Typography
                                        component='li'
                                        key={i}
                                        sx={{ mb: 1, lineHeight: 1.6 }}
                                    >
                                        {step}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {section.actions && (
                        <>
                            <Typography
                                sx={{
                                    fontWeight: "bold",
                                    mb: 2,
                                    fontSize: "1.1rem",
                                }}
                            >
                                Player Actions
                            </Typography>
                            <Grid container spacing={2}>
                                {section.actions.map((item) => (
                                    <Grid item xs={12} sm={6} key={item.action}>
                                        <Box sx={{ ...glassSection, p: 2 }}>
                                            <Typography
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                {item.action}
                                            </Typography>
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    color: (theme) =>
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "#81c784"
                                                            : "#2e7d32",
                                                }}
                                            >
                                                Roll vs {item.stat}
                                            </Typography>
                                            <Typography variant='body2'>
                                                {item.effect}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                </>
            )

        case "your-first-hunt":
            return (
                <>
                    <Typography
                        sx={{
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                            lineHeight: 1.8,
                            mb: 3,
                        }}
                    >
                        {section.description}
                    </Typography>
                    {(section.phases || []).map((item, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: "flex",
                                gap: 2,
                                mb: 2,
                                pb: 2,
                                borderBottom:
                                    index < section.phases.length - 1
                                        ? (theme) =>
                                              theme.palette.mode === "dark"
                                                  ? "1px solid rgba(255,255,255,0.1)"
                                                  : "1px solid rgba(0,0,0,0.1)"
                                        : "none",
                            }}
                        >
                            <Box
                                sx={{
                                    minWidth: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.9rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {index + 1}
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: "bold" }}>
                                    {item.name}
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{
                                        color: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#b0b0b0"
                                                : "#555",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {item.desc}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </>
            )

        case "quick-reference-callout":
            return (
                <Grid container spacing={2}>
                    {(section.items || []).map((item) => (
                        <Grid item xs={12} md={4} key={item.label}>
                            <Box
                                sx={{
                                    ...glassSection,
                                    p: 2,
                                    height: "100%",
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: "bold",
                                        mb: 1,
                                        textAlign: "center",
                                    }}
                                >
                                    {item.label}
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{ textAlign: "center" }}
                                >
                                    {item.value}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )

        default:
            return null
    }
}

const GettingStarted = () => {
    const {
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager("getting-started")

    return (
        <Container
            sx={{
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
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
                    minHeight: "70vh",
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
                            fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
                            fontWeight: "bold",
                            marginBottom: "20px",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                        }}
                    >
                        Getting Started
                    </Typography>
                </Slide>
                <Slide delay={200}>
                    <Typography
                        variant='h4'
                        sx={{
                            fontSize: {
                                xs: "1.1rem",
                                sm: "1.3rem",
                                md: "1.5rem",
                            },
                            maxWidth: "700px",
                            lineHeight: 1.6,
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#b0b0b0"
                                    : "#333",
                        }}
                    >
                        Learn the basics of I Must Kill in 5 minutes. Everything
                        you need to run your first hunt.
                    </Typography>
                </Slide>
                <Slide delay={400}>
                    <Box
                        sx={{
                            marginTop: "40px",
                            animation: "bounce 2s infinite",
                            "@keyframes bounce": {
                                "0%, 100%": { transform: "translateY(0)" },
                                "50%": { transform: "translateY(10px)" },
                            },
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.6)"
                                    : "rgba(0, 0, 0, 0.4)",
                        }}
                    >
                        <ChevronDownIcon size={48} />
                    </Box>
                </Slide>
            </Box>

            {/* Content */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: "60px", sm: "80px" },
                    maxWidth: "900px",
                    width: "100%",
                }}
            >
                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Alert severity='error'>Error loading rules: {error}</Alert>
                )}

                {sections.map((section, idx) => {
                    const IconComp = SECTION_ICONS[section.id]
                    const isCallout = section.id === "quick-reference-callout"
                    return (
                        <EditableSection
                            key={section.id}
                            category='getting-started'
                            sectionId={section.id}
                            sectionOrder={idx}
                            section={section}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onInsertAfter={handleInsertAfter}
                            onInsertBefore={handleInsertBefore}
                        >
                            <Slide>
                                <Box
                                    sx={{
                                        ...glassSection,
                                        p: { xs: 3, sm: 4 },
                                    }}
                                >
                                    {/* Section Header */}
                                    {isCallout ? (
                                        <Typography
                                            variant='h4'
                                            sx={{
                                                fontSize: {
                                                    xs: "1.25rem",
                                                    sm: "1.5rem",
                                                },
                                                fontWeight: "bold",
                                                mb: 3,
                                                textAlign: "center",
                                            }}
                                        >
                                            {section.title}
                                        </Typography>
                                    ) : (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                                mb: 3,
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "rgba(255, 255, 255, 0.8)"
                                                        : "rgba(0, 0, 0, 0.7)",
                                            }}
                                        >
                                            {IconComp && <IconComp size={40} />}
                                            <Typography
                                                variant='h3'
                                                sx={{
                                                    fontSize: {
                                                        xs: "1.5rem",
                                                        sm: "1.75rem",
                                                        md: "2rem",
                                                    },
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {section.title}
                                            </Typography>
                                        </Box>
                                    )}
                                    {/* Section Body */}
                                    {renderSectionContent(
                                        section,
                                        glassSection,
                                    )}
                                </Box>
                            </Slide>
                        </EditableSection>
                    )
                })}

                {/* Call to Action */}
                <Slide>
                    <Box
                        sx={{
                            textAlign: "center",
                            py: { xs: 4, sm: 6 },
                        }}
                    >
                        <Typography
                            variant='h3'
                            sx={{
                                fontSize: {
                                    xs: "1.5rem",
                                    sm: "1.75rem",
                                    md: "2rem",
                                },
                                fontWeight: "bold",
                                mb: 4,
                            }}
                        >
                            Ready to create your hunter?
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                gap: 2,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                component={Link}
                                to='/character-creation'
                                variant='outlined'
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: "1rem",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "2px solid rgba(255, 255, 255, 0.3)"
                                            : "2px solid rgba(0, 0, 0, 0.2)",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#121212",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    backdropFilter: "blur(10px)",
                                    textTransform: "none",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        border: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "2px solid rgba(255, 255, 255, 0.6)"
                                                : "2px solid rgba(0, 0, 0, 0.4)",
                                        bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255, 255, 255, 0.1)"
                                                : "rgba(0, 0, 0, 0.08)",
                                        transform: "scale(1.05)",
                                    },
                                }}
                            >
                                Character Creation
                            </Button>
                            <Button
                                component={Link}
                                to='/quick-reference'
                                variant='outlined'
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: "1rem",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "2px solid rgba(255, 255, 255, 0.2)"
                                            : "2px solid rgba(0, 0, 0, 0.15)",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#444",
                                    bgcolor: "transparent",
                                    textTransform: "none",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        border: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "2px solid rgba(255, 255, 255, 0.4)"
                                                : "2px solid rgba(0, 0, 0, 0.3)",
                                        bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255, 255, 255, 0.05)"
                                                : "rgba(0, 0, 0, 0.03)",
                                    },
                                }}
                            >
                                Quick Reference
                            </Button>
                        </Box>
                    </Box>
                </Slide>
            </Box>
        </Container>
    )
}

export default GettingStarted
