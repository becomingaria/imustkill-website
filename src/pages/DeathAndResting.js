import {
    Container,
    Typography,
    Box,
    List,
    ListItem,
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

const DeathAndResting = () => {
    const {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager("death-and-resting")
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
                    Error loading death and resting rules: {error}
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
                    {title}
                </Typography>

                {/* Render all sections dynamically */}
                {sections.map((section, idx) => (
                    <EditableSection
                        key={section.id}
                        category='death-and-resting'
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
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.mechanics}
                                    </EnhancedKeywordLinker>
                                </Typography>
                            )}

                            {/* Section limitations */}
                            {section.limitations && (
                                <Typography variant='body1' paragraph>
                                    <strong>Limitations:</strong>{" "}
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
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
                                        {section.benefits.map(
                                            (benefit, index) => (
                                                <ListItem key={index}>
                                                    <EnhancedKeywordLinker
                                                        referencesOnly={true}
                                                    >
                                                        {benefit}
                                                    </EnhancedKeywordLinker>
                                                </ListItem>
                                            ),
                                        )}
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
                                    <EnhancedKeywordLinker
                                        referencesOnly={true}
                                    >
                                        {section.timing}
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

export default DeathAndResting
