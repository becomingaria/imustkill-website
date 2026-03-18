import React, { useContext } from "react"
import { ThemeContext } from "../../context/ThemeContext"
import {
    Box,
    IconButton,
    Tooltip,
    useMediaQuery,
    useTheme,
} from "@mui/material"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import ViewListIcon from "@mui/icons-material/ViewList"
import PanToolIcon from "@mui/icons-material/PanTool"

const ThemeToggle = () => {
    const { isDarkTheme, toggleTheme, useListMenu, toggleMenuMode } =
        useContext(ThemeContext)

    const theme = useTheme()
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"))

    return (
        <Box
            sx={{
                position: "fixed",
                bottom: { xs: "15px", sm: "20px" },
                left: { xs: "15px", sm: "20px" },
                zIndex: 1000,
                backgroundColor: isDarkTheme
                    ? "rgba(50, 50, 50, 0.85)"
                    : "rgba(200, 200, 200, 0.9)", // Darker in light mode for better visibility
                borderRadius: "50%",
                padding: { xs: "3px", sm: "5px" },
                boxShadow: isDarkTheme
                    ? "0 2px 8px rgba(0,0,0,0.5)"
                    : "0 2px 8px rgba(0,0,0,0.25)", // More visible shadow in both modes
                border: isDarkTheme ? "none" : "1px solid #999", // Add border in light mode
                display: "flex",
                gap: 1,
            }}
        >
            <Tooltip
                title={
                    isDarkTheme
                        ? "Switch to light theme"
                        : "Switch to dark theme"
                }
            >
                <IconButton
                    onClick={toggleTheme}
                    aria-label={
                        isDarkTheme
                            ? "Switch to light theme"
                            : "Switch to dark theme"
                    }
                    sx={{
                        color: isDarkTheme ? "#ffffff" : "#121212", // Darker text in light mode
                        padding: { xs: "6px", sm: "8px" },
                        "&:hover": {
                            backgroundColor: isDarkTheme
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.1)",
                        },
                        "&:focus": {
                            outline: isDarkTheme
                                ? "2px solid #90caf9"
                                : "2px solid #1976d2", // Focus indicator
                        },
                    }}
                >
                    {isDarkTheme ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
            </Tooltip>

            {isDesktop && (
                <Tooltip
                    title={
                        useListMenu
                            ? "Use fancy menu"
                            : "Use accessible list menu"
                    }
                >
                    <IconButton
                        onClick={toggleMenuMode}
                        aria-label={
                            useListMenu
                                ? "Use fancy menu"
                                : "Use accessible list menu"
                        }
                        sx={{
                            color: isDarkTheme ? "#ffffff" : "#121212",
                            padding: { xs: "6px", sm: "8px" },
                            "&:hover": {
                                backgroundColor: isDarkTheme
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.1)",
                            },
                            "&:focus": {
                                outline: isDarkTheme
                                    ? "2px solid #90caf9"
                                    : "2px solid #1976d2",
                            },
                        }}
                    >
                        {useListMenu ? <ViewListIcon /> : <PanToolIcon />}
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    )
}

export default ThemeToggle
