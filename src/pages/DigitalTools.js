import React from "react"
import { Link } from "react-router-dom"
import {
    Container,
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
} from "@mui/material"
import { MoreHoriz, MenuBook, Assignment } from "@mui/icons-material"
import HomeButton from "../components/HomeButton.js"

const DigitalTools = () => {
    const getButtonStyles = () => ({
        width: "100%",
        height: "50px",
        fontSize: "16px",
        fontWeight: "bold",
        textTransform: "none",
        borderRadius: "12px",
        border: (theme) =>
            theme.palette.mode === "dark"
                ? "2px solid rgba(255, 255, 255, 0.3)"
                : "2px solid rgba(0, 0, 0, 0.2)",
        color: (theme) =>
            theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
        bgcolor: (theme) =>
            theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)",
        backdropFilter: "blur(10px)",
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
            transform: "scale(1.02)",
        },
    })

    const getCardStyles = () => ({
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: (theme) =>
            theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.03)",
        border: (theme) =>
            theme.palette.mode === "dark"
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.1)",
        borderRadius: "16px",
        backdropFilter: "blur(10px)",
        transition: "all 0.3s ease",
        "&:hover": {
            transform: "translateY(-4px)",
            border: (theme) =>
                theme.palette.mode === "dark"
                    ? "1px solid rgba(255, 255, 255, 0.2)"
                    : "1px solid rgba(0, 0, 0, 0.2)",
        },
    })

    const tools = [
        {
            title: "Quick Reference",
            description:
                "Quick access to essential rules, mechanics, and game information for easy reference during play.",
            icon: <MenuBook sx={{ fontSize: 40 }} />,
            path: "/quick-reference",
            available: true,
        },
        {
            title: "Character Sheet",
            description:
                "Create, edit, and manage your character with our interactive digital character sheet. Includes insight token management.",
            icon: <Assignment sx={{ fontSize: 40 }} />,
            path: "/digital-character-sheet",
            available: true,
        },
        // Placeholder for future tools
        {
            title: "More Tools Coming Soon",
            description:
                "Additional digital tools will be added here to enhance your gaming experience.",
            icon: <MoreHoriz sx={{ fontSize: 40 }} />,
            path: "#",
            available: false,
        },
    ]

    return (
        <>
            <Container
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: { xs: "10px", sm: "20px", md: 3 },
                    marginBottom: "100px",
                }}
            >
                <Box
                    sx={{
                        textAlign: "center",
                        marginBottom: 4,
                        marginTop: { xs: 2, sm: 4 },
                    }}
                >
                    <Typography
                        variant='h3'
                        component='h1'
                        gutterBottom
                        sx={{
                            fontWeight: "bold",
                            textShadow: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "none"
                                    : "0px 1px 2px rgba(0,0,0,0.1)",
                            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                            marginBottom: 2,
                        }}
                    >
                        Player Tools
                    </Typography>
                    <Typography
                        variant='h6'
                        sx={{
                            opacity: 0.8,
                            fontSize: { xs: "1rem", sm: "1.25rem" },
                            maxWidth: "600px",
                            margin: "0 auto",
                        }}
                    >
                        Enhanced digital tools to improve your tabletop gaming
                        experience
                    </Typography>
                </Box>

                <Grid container spacing={3} justifyContent='center'>
                    {tools.map((tool, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card sx={getCardStyles()}>
                                <CardContent
                                    sx={{
                                        flexGrow: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        padding: 3,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            color: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#ffffff"
                                                    : "#121212",
                                            marginBottom: 2,
                                            opacity: tool.available ? 1 : 0.5,
                                        }}
                                    >
                                        {tool.icon}
                                    </Box>
                                    <Typography
                                        variant='h5'
                                        component='h2'
                                        gutterBottom
                                        sx={{
                                            fontWeight: "bold",
                                            opacity: tool.available ? 1 : 0.5,
                                        }}
                                    >
                                        {tool.title}
                                    </Typography>
                                    <Typography
                                        variant='body1'
                                        sx={{
                                            opacity: tool.available ? 0.8 : 0.4,
                                            flexGrow: 1,
                                        }}
                                    >
                                        {tool.description}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ padding: 2 }}>
                                    {tool.available ? (
                                        <Button
                                            component={Link}
                                            to={tool.path}
                                            variant='outlined'
                                            sx={getButtonStyles()}
                                        >
                                            Open Tool
                                        </Button>
                                    ) : (
                                        <Button
                                            variant='outlined'
                                            disabled
                                            sx={{
                                                ...getButtonStyles(),
                                                opacity: 0.5,
                                            }}
                                        >
                                            Coming Soon
                                        </Button>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            <HomeButton />
        </>
    )
}

export default DigitalTools
