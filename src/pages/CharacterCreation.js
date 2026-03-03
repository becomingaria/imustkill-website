import {
    Container,
    Typography,
    List,
    ListItem,
    CircularProgress,
    Alert,
    Grid,
    Box,
} from "@mui/material"
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import useSectionManager from "../hooks/useSectionManager"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"
import EditableSection from "../components/EditableSection"
import { scrollToAnchor } from "../utils/scrollToAnchor"
import { Slide, glassSection } from "../components/RulesPageShared"

const CharacterCreation = () => {
    const {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    } = useSectionManager("character-creation")
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
                    Error loading character creation rules: {error}
                </Alert>
            </Container>
        )
    }

    const statsSection = sections.find((section) => section.id === "stats")

    return (
        <>
            <Container
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: { xs: "15px", sm: "20px" },
                    display: "flex",
                    paddingBottom: { xs: "80px", sm: "100px" },
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
                        textShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "none"
                                : "0px 1px 2px rgba(0,0,0,0.1)",
                        fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                        textAlign: "center",
                    }}
                >
                    {title}
                </Typography>

                <EditableSection
                    category='character-creation'
                    sectionId='stats'
                    sectionOrder={0}
                    section={statsSection}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onInsertAfter={handleInsertAfter}
                    onInsertBefore={handleInsertBefore}
                >
                    <Slide>
                    <Box
                        id='stats'
                        sx={{
                            ...glassSection,
                            p: { xs: "15px", sm: "20px" },
                            width: "100%",
                            maxWidth: "800px",
                        }}
                    >
                        <Typography variant='h3' gutterBottom sx={{ mb: 3 }}>
                            {statsSection?.title}
                        </Typography>

                        <Grid container spacing={2}>
                            {statsSection?.content.map((stat, index) => (
                                <Grid item xs={12} sm={6} key={index}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                                    : "1px solid rgba(0, 0, 0, 0.1)",
                                            borderRadius: "12px",
                                            backgroundColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.03)"
                                                    : "rgba(0, 0, 0, 0.02)",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                border: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "1px solid rgba(255, 255, 255, 0.3)"
                                                        : "1px solid rgba(0, 0, 0, 0.2)",
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant='h5'
                                            id={
                                                stat.id ||
                                                stat.name
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, "-")
                                                    .replace(/^-+|-+$/g, "")
                                            }
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 1,
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#4fc3f7"
                                                        : "#1976d2",
                                            }}
                                        >
                                            {stat.name}
                                        </Typography>
                                        <Typography
                                            variant='body1'
                                            sx={{
                                                flexGrow: 1,
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            <EnhancedKeywordLinker
                                                referencesOnly={true}
                                            >
                                                {stat.description}
                                            </EnhancedKeywordLinker>
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                    </Slide>
                </EditableSection>

                {/* Render all other sections dynamically */}
                {sections
                    .filter((section) => section.id !== "stats")
                    .map((section, idx) => (
                        <EditableSection
                            key={section.id}
                            category='character-creation'
                            sectionId={section.id}
                            sectionOrder={idx + 1}
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
                                    p: 3,
                                    width: "100%",
                                    maxWidth: "800px",
                                }}
                            >
                                <Typography variant='h3' gutterBottom>
                                    {section.title}
                                </Typography>

                                {section.description && (
                                    <Typography variant='body1' paragraph>
                                        <EnhancedKeywordLinker
                                            referencesOnly={true}
                                        >
                                            {section.description}
                                        </EnhancedKeywordLinker>
                                    </Typography>
                                )}

                                {section.subsections && (
                                    <>
                                        {section.subsections.map(
                                            (subsection) => (
                                                <div
                                                    key={subsection.id}
                                                    id={subsection.id}
                                                    style={{
                                                        marginBottom: "20px",
                                                    }}
                                                >
                                                    <Typography
                                                        variant='h4'
                                                        gutterBottom
                                                    >
                                                        {subsection.title}
                                                    </Typography>
                                                    <Typography
                                                        variant='body1'
                                                        paragraph
                                                    >
                                                        <EnhancedKeywordLinker
                                                            referencesOnly={
                                                                true
                                                            }
                                                        >
                                                            {
                                                                subsection.description
                                                            }
                                                        </EnhancedKeywordLinker>
                                                    </Typography>

                                                    {subsection.options && (
                                                        <List>
                                                            {subsection.options.map(
                                                                (
                                                                    option,
                                                                    optIndex,
                                                                ) => (
                                                                    <ListItem
                                                                        key={
                                                                            optIndex
                                                                        }
                                                                    >
                                                                        <EnhancedKeywordLinker
                                                                            referencesOnly={
                                                                                true
                                                                            }
                                                                        >
                                                                            {
                                                                                option
                                                                            }
                                                                        </EnhancedKeywordLinker>
                                                                    </ListItem>
                                                                ),
                                                            )}
                                                        </List>
                                                    )}
                                                </div>
                                            ),
                                        )}
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

export default CharacterCreation
