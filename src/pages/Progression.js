import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert,
} from "@mui/material"
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useSectionManager from "../hooks/useSectionManager"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import EditableSection from "../components/EditableSection"
import { scrollToAnchor } from "../utils/scrollToAnchor"
import { Slide, glassSection } from "../components/RulesPageShared"

const Progression = () => {
    const {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager("progression")
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
                    Error loading progression rules: {error}
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
                    {title}
                </Typography>

                {/* Render all sections dynamically */}
                {sections.map((section, idx) => (
                    <EditableSection
                        key={section.id}
                        category='progression'
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

                            {/* Section mechanics */}
                            {section.mechanics && (
                                <Typography variant='body1' paragraph>
                                    <strong>Mechanics:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.mechanics}
                                    </EnhancedKeywordLinker>
                                </Typography>
                            )}

                            {/* Section limits */}
                            {section.limits && (
                                <Typography variant='body1' paragraph>
                                    <strong>Limits:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.limits}
                                    </EnhancedKeywordLinker>
                                </Typography>
                            )}

                            {/* Section perception */}
                            {section.perception && (
                                <Typography variant='body1' paragraph>
                                    <strong>Perception:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.perception}
                                    </EnhancedKeywordLinker>
                                </Typography>
                            )}

                            {/* Section maximum */}
                            {section.maximum && (
                                <Typography variant='body1' paragraph>
                                    <strong>Maximum:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.maximum}
                                    </EnhancedKeywordLinker>
                                </Typography>
                            )}

                            {/* Section ascendant */}
                            {section.ascendant && (
                                <Typography variant='body1' paragraph>
                                    <strong>Ascendant:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.ascendant}
                                    </EnhancedKeywordLinker>
                                </Typography>
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

export default Progression
