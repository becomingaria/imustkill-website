import {
    Container,
    Typography,
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

const Casting = () => {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [castingData, setCastingData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        if (!loading && !error) {
            const data = getCategoryRules("spellcasting")
            setCastingData(data)
        }
    }, [loading, error, getCategoryRules])

    // Handle scrolling to anchor sections
    useEffect(() => {
        if (castingData && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [castingData, location.hash])

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
                    Error loading casting rules: {error}
                </Alert>
            </Container>
        )
    }

    if (!castingData) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='warning'>No casting data found</Alert>
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
                    paddingBottom: "100px",
                    display: "flex",
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
                    {castingData.title}
                </Typography>

                {/* Render all sections dynamically */}
                {castingData.sections.map((section) => (
                    <Paper
                        key={section.id}
                        id={section.id} // anchor link id
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

                        {/* Section timing */}
                        {section.timing && (
                            <Typography variant='body1' paragraph>
                                <strong>Timing:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.timing}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section mechanics */}
                        {section.mechanics && (
                            <Typography variant='body1' paragraph>
                                <strong>Mechanics:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.mechanics}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section limits */}
                        {section.limits && (
                            <Typography variant='body1' paragraph>
                                <strong>Limits:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.limits}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section targeting */}
                        {section.targeting && (
                            <Typography variant='body1' paragraph>
                                <strong>Targeting:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.targeting}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section recovery */}
                        {section.recovery && (
                            <Typography variant='body1' paragraph>
                                <strong>Recovery:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.recovery}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Power rarities */}
                        {section.rarities && (
                            <>
                                {/* Charge mechanic callout */}
                                {section.charge && (
                                    <Box
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(249, 168, 37, 0.08)"
                                                    : "rgba(249, 168, 37, 0.06)",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(249, 168, 37, 0.4)"
                                                    : "1px solid rgba(249, 168, 37, 0.5)",
                                            borderLeft: "4px solid #f9a825",
                                            borderRadius: "12px",
                                            p: 2,
                                            mb: 3,
                                        }}
                                    >
                                        <Typography
                                            variant='subtitle2'
                                            sx={{
                                                color: "#f9a825",
                                                fontWeight: "bold",
                                                mb: 0.5,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.05em",
                                                fontSize: "0.7rem",
                                            }}
                                        >
                                            Charging Rule
                                        </Typography>
                                        <Typography variant='body1'>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {section.charge}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                    </Box>
                                )}

                                {section.rarities.map((rarity) => (
                                    <Paper
                                        key={rarity.name}
                                        sx={{
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.1)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderLeft: `4px solid ${rarity.color}`,
                                            borderRadius: "12px",
                                            p: 2,
                                            mb: 2,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                flexWrap: "wrap",
                                                gap: 1,
                                                mb: 1.5,
                                            }}
                                        >
                                            <Chip
                                                label={rarity.name}
                                                size='small'
                                                sx={{
                                                    bgcolor: rarity.color,
                                                    color: "#fff",
                                                    fontWeight: "bold",
                                                    letterSpacing: "0.04em",
                                                }}
                                            />
                                            {rarity.charge_required && (
                                                <Chip
                                                    label='Charge Required'
                                                    size='small'
                                                    variant='outlined'
                                                    sx={{
                                                        borderColor:
                                                            rarity.color,
                                                        color: rarity.color,
                                                        fontWeight: "600",
                                                    }}
                                                />
                                            )}
                                        </Box>

                                        <Typography variant='body1' paragraph>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {rarity.description}
                                            </EnhancedKeywordLinker>
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 3,
                                                mt: 1,
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    variant='caption'
                                                    color='text.secondary'
                                                    sx={{
                                                        display: "block",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontSize: "0.65rem",
                                                    }}
                                                >
                                                    Targets
                                                </Typography>
                                                <Typography variant='body2'>
                                                    <strong>
                                                        {rarity.targets}
                                                    </strong>
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography
                                                    variant='caption'
                                                    color='text.secondary'
                                                    sx={{
                                                        display: "block",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontSize: "0.65rem",
                                                    }}
                                                >
                                                    Range
                                                </Typography>
                                                <Typography variant='body2'>
                                                    <strong>
                                                        <EnhancedKeywordLinker
                                                            referencesOnly={
                                                                true
                                                            }
                                                        >
                                                            {rarity.range}
                                                        </EnhancedKeywordLinker>
                                                    </strong>
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography
                                                    variant='caption'
                                                    color='text.secondary'
                                                    sx={{
                                                        display: "block",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.06em",
                                                        fontSize: "0.65rem",
                                                    }}
                                                >
                                                    Duration
                                                </Typography>
                                                <Typography variant='body2'>
                                                    <strong>
                                                        <EnhancedKeywordLinker
                                                            referencesOnly={
                                                                true
                                                            }
                                                        >
                                                            {rarity.duration}
                                                        </EnhancedKeywordLinker>
                                                    </strong>
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                ))}
                            </>
                        )}
                    </Paper>
                ))}

                {/* Card Rarity Explanation */}
                <Paper
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
                        Card Rarity & Deck Building
                    </Typography>
                    <Typography variant='body1' paragraph>
                        Power cards come in four levels of rarity:{" "}
                        <strong>Common</strong>, <strong>Uncommon</strong>,{" "}
                        <strong>Rare</strong>, and <strong>Mythic</strong>.
                    </Typography>
                    <Typography variant='body1' paragraph>
                        When building a deck, you must follow these rarity
                        requirements:
                    </Typography>
                    <Box component='ul' sx={{ m: 0, pl: 3 }}>
                        <Typography component='li' variant='body1'>
                            For every <strong>Mythic</strong> card, you must
                            include at least <strong>2 Rare</strong> cards
                        </Typography>
                        <Typography component='li' variant='body1'>
                            For every <strong>Rare</strong> card, you must
                            include at least <strong>2 Uncommon</strong> cards
                        </Typography>
                        <Typography component='li' variant='body1'>
                            For every <strong>Uncommon</strong> card, you must
                            include at least <strong>2 Common</strong> cards
                        </Typography>
                    </Box>
                </Paper>
            </Container>

            <HomeButton />
        </>
    )
}

export default Casting
