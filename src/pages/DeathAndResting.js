import {
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    CircularProgress,
    Alert,
} from "@mui/material"
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useRulesEngine from "../hooks/useRulesEngine"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import { scrollToAnchor } from "../utils/scrollToAnchor"

const DeathAndResting = () => {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [deathRestingData, setDeathRestingData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        if (!loading && !error) {
            const data = getCategoryRules("death-and-resting")
            setDeathRestingData(data)
        }
    }, [loading, error, getCategoryRules]) // Handle scrolling to anchor sections
    useEffect(() => {
        if (deathRestingData && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [deathRestingData, location.hash])

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
                    Error loading death and resting rules: {error}
                </Alert>
            </Container>
        )
    }

    if (!deathRestingData) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='warning'>
                    No death and resting data found
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
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                    paddingBottom: "100px",
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
                    {deathRestingData.title}
                </Typography>

                {/* Render all sections dynamically */}
                {deathRestingData.sections.map((section) => (
                    <Paper
                        key={section.id}
                        id={section.id} // add anchor id
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

                        {/* Section mechanics */}
                        {section.mechanics && (
                            <Typography variant='body1' paragraph>
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.mechanics}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section limitations */}
                        {section.limitations && (
                            <Typography variant='body1' paragraph>
                                <strong>Limitations:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.limitations}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section benefits */}
                        {section.benefits && (
                            <>
                                <Typography variant='body1' paragraph>
                                    <strong>Benefits:</strong>
                                </Typography>
                                <List>
                                    {section.benefits.map((benefit, index) => (
                                        <ListItem key={index}>
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {benefit}
                                            </EnhancedKeywordLinker>
                                        </ListItem>
                                    ))}
                                </List>
                            </>
                        )}

                        {/* Section examples */}
                        {section.examples && (
                            <>
                                <Typography variant='body1' paragraph>
                                    <strong>Examples:</strong>
                                </Typography>
                                {section.examples.map((example, index) => (
                                    <Typography
                                        key={index}
                                        variant='body1'
                                        paragraph
                                        sx={{ fontStyle: "italic", ml: 2 }}
                                    >
                                        <EnhancedKeywordLinker
                                            referencesOnly={true}
                                        >
                                            {example}
                                        </EnhancedKeywordLinker>
                                    </Typography>
                                ))}
                            </>
                        )}

                        {/* Available stats */}
                        {section.available_stats && (
                            <Typography variant='body1' paragraph>
                                <strong>Available Stats:</strong>{" "}
                                {section.available_stats.join(", ")}
                            </Typography>
                        )}

                        {/* Timing */}
                        {section.timing && (
                            <Typography variant='body1' paragraph>
                                <strong>Timing:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.timing}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}
                    </Paper>
                ))}
            </Container>

            <HomeButton />
        </>
    )
}

export default DeathAndResting
