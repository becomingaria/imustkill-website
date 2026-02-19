import React from "react"
import { Link } from "react-router-dom"
import { Container, Box, Typography, Button } from "@mui/material"
import FlashyMenu from "../components/FlashyMenu"
import EnhancedRulesSearch from "../components/RulesSearch/EnhancedRulesSearch.js"

// Helper function for consistent button styling - glassmorphic style
const getButtonStyles = () => ({
    width: "100%",
    maxWidth: { xs: "280px", sm: "300px" },
    height: { xs: "50px", sm: "60px" },
    fontSize: { xs: "16px", sm: "18px" },
    fontWeight: "bold",
    textTransform: "none",
    borderRadius: "12px",
    border: (theme) =>
        theme.palette.mode === "dark"
            ? "2px solid rgba(255, 255, 255, 0.3)"
            : "2px solid rgba(0, 0, 0, 0.2)",
    color: (theme) => (theme.palette.mode === "dark" ? "#e0e0e0" : "#121212"),
    bgcolor: (theme) =>
        theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.03)",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease",
    marginBottom: { xs: "8px", sm: "10px" },
    "&:hover": {
        border: (theme) =>
            theme.palette.mode === "dark"
                ? "2px solid rgba(255, 255, 255, 0.6)"
                : "2px solid rgba(0, 0, 0, 0.4)",
        bgcolor: (theme) =>
            theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
        transform: { xs: "scale(1.02)", sm: "scale(1.05)" },
    },
})

const HomePage = () => {
    return (
        <Container
            sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                padding: { xs: "10px", sm: "20px", md: 0 },
            }}
        >
            <header
                style={{
                    textAlign: "center",
                    padding: "20px 0",
                }}
            >
                <Typography
                    variant='h1'
                    component='h1'
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
                        fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4rem" },
                    }}
                >
                    I Must Kill
                </Typography>
                <Typography
                    variant='h3'
                    component='h3'
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                        textShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "none"
                                : "0px 1px 2px rgba(0,0,0,0.1)",
                        fontSize: { xs: "1.25rem", sm: "1.75rem", md: "2rem" },
                    }}
                >
                    The hunt awaits you...
                </Typography>
            </header>

            {/* Rules Search Component */}
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: { xs: "20px", sm: "30px" }, // Add spacing below search
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "280px", sm: "300px" }, // Match button width
                    }}
                >
                    <EnhancedRulesSearch />
                </Box>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    gap: 2, // Space out the buttons more
                }}
            >
                <FlashyMenu
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2, // Space out the buttons more
                    }}
                >
                    <Button
                        component={Link}
                        to='/about'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        What is "I Must Kill"?
                    </Button>
                    <Button
                        component={Link}
                        to='/getting-started'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Getting Started
                    </Button>
                    <Button
                        component={Link}
                        to='/character-creation'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Character Creation
                    </Button>
                    <Button
                        component={Link}
                        to='/player-tools'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Player Tools
                    </Button>
                    <Button
                        component={Link}
                        to='/combat-mechanics'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Combat Mechanics
                    </Button>
                    <Button
                        component={Link}
                        to='/death-and-resting'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Death and Resting
                    </Button>
                    <Button
                        component={Link}
                        to='/progression'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Progression
                    </Button>
                    <Button
                        component={Link}
                        to='/casting'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Casting
                    </Button>
                    <Button
                        component={Link}
                        to='/powers'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        Powers
                    </Button>
                    <Button
                        component={Link}
                        to='/gm-tools'
                        variant='outlined'
                        sx={getButtonStyles()}
                    >
                        GM Tools
                    </Button>
                </FlashyMenu>
            </Box>

            <Box
                component='footer'
                sx={{
                    textAlign: "center",
                    padding: "20px 0",
                    bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#1f1f1f" : "#f0f0f0",
                    borderTop: (theme) =>
                        theme.palette.mode === "dark"
                            ? "none"
                            : "1px solid #ccc",
                }}
            >
                <Typography
                    variant='body2'
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                        fontWeight: (theme) =>
                            theme.palette.mode === "dark" ? "normal" : 500,
                    }}
                >
                    &copy; 2024-{new Date().getFullYear()} I Must Kill. All
                    rights reserved.
                </Typography>
            </Box>
        </Container>
    )
}

export default HomePage
