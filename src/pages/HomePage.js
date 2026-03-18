import React, { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import {
    Container,
    Box,
    Typography,
    Button,
    useMediaQuery,
    useTheme,
} from "@mui/material"
import FlashyMenu from "../components/FlashyMenu"
import CircleMenu from "../components/CircleMenu"
import EnhancedRulesSearch from "../components/RulesSearch/EnhancedRulesSearch.js"
import { getNavConfig } from "../utils/rulesClient"
import { ThemeContext } from "../context/ThemeContext"

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
    const theme = useTheme()
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"))
    const { useListMenu } = useContext(ThemeContext)
    const [navItems, setNavItems] = useState([])

    // Load nav config: DB first, then fall back to static JSON
    useEffect(() => {
        const load = async () => {
            // Try DB override
            const dbNav = await getNavConfig()
            if (dbNav) {
                setNavItems(
                    dbNav
                        .filter((n) => n.visible !== false)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
                )
                return
            }
            // Fall back to static JSON
            try {
                const res = await fetch("/nav-config.json")
                const data = await res.json()
                setNavItems(
                    (data.navItems || [])
                        .filter((n) => n.visible !== false)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
                )
            } catch {
                // ultimate fallback — empty, no nav shown
                setNavItems([])
            }
        }
        load()
    }, [])

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
                {isDesktop && !useListMenu ? (
                    <Box sx={{ overflow: "visible", py: 4 }}>
                        <CircleMenu
                            items={navItems.map((item) => ({
                                label: item.label,
                                href: item.path,
                            }))}
                        />
                    </Box>
                ) : (
                    <FlashyMenu
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                        }}
                    >
                        {navItems.map((item) => (
                            <Button
                                key={item.id}
                                component={Link}
                                to={item.path}
                                variant='outlined'
                                sx={getButtonStyles()}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </FlashyMenu>
                )}
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
