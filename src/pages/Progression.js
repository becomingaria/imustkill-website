import {
    Container,
    Typography,
    Paper,
    CircularProgress,
    Alert,
} from "@mui/material"
import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useRulesEngine from "../hooks/useRulesEngine"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import { scrollToAnchor } from "../utils/scrollToAnchor"

const Progression = () => {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [progressionData, setProgressionData] = useState(null)
    const location = useLocation()

    useEffect(() => {
        if (!loading && !error) {
            const data = getCategoryRules("progression")
            setProgressionData(data)
        }
    }, [loading, error, getCategoryRules])

    // Handle scrolling to anchor sections
    useEffect(() => {
        if (progressionData && location.hash) {
            const timer = setTimeout(() => {
                const elementId = location.hash.substring(1)
                scrollToAnchor(elementId)
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [progressionData, location.hash])

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
                    Error loading progression rules: {error}
                </Alert>
            </Container>
        )
    }

    if (!progressionData) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity='warning'>No progression data found</Alert>
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
                    {progressionData.title}
                </Typography>

                {/* Render all sections dynamically */}
                {progressionData.sections.map((section) => (
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

                        {/* Section perception */}
                        {section.perception && (
                            <Typography variant='body1' paragraph>
                                <strong>Perception:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.perception}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section maximum */}
                        {section.maximum && (
                            <Typography variant='body1' paragraph>
                                <strong>Maximum:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.maximum}
                                </EnhancedKeywordLinker>
                            </Typography>
                        )}

                        {/* Section ascendant */}
                        {section.ascendant && (
                            <Typography variant='body1' paragraph>
                                <strong>Ascendant:</strong>{" "}
                                <EnhancedKeywordLinker referencesOnly={true}>
                                    {section.ascendant}
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

export default Progression
