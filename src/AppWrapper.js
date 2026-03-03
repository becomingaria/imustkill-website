// AppWrapper.js
import React from "react"
import {
    ThemeProvider as MuiThemeProvider,
    createTheme,
    CssBaseline,
} from "@mui/material"
import App from "./App"
import { ThemeProvider, ThemeContext } from "./context/ThemeContext"
import { AuthProvider } from "./context/AuthContext"
import "./theme.css"
import "./responsive.css" // Import responsive styles
import "./lightModeContrast.css" // Import light mode contrast overrides

function AppWrapper() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <ThemedApp />
            </ThemeProvider>
        </AuthProvider>
    )
}

// Separate component to consume the ThemeContext
const ThemedApp = () => {
    // Use our custom ThemeProvider to get access to the theme state
    const { isDarkTheme } = React.useContext(ThemeContext)

    // Create MUI theme based on our theme state with improved contrast
    const theme = createTheme({
        palette: {
            mode: isDarkTheme ? "dark" : "light",
            background: {
                default: isDarkTheme ? "#000000" : "#ffffff",
                paper: isDarkTheme ? "#333333" : "#eaeaea", // Darker in light mode for better contrast
            },
            text: {
                primary: isDarkTheme ? "#ffffff" : "#121212", // Darker text in light mode
                secondary: isDarkTheme ? "#cccccc" : "#2c2c2c", // Darker secondary text in light mode
            },
            // Add components colors for better contrast in light mode
            primary: {
                main: isDarkTheme ? "#90caf9" : "#0056b3", // Darker blue in light mode
            },
            secondary: {
                main: isDarkTheme ? "#f48fb1" : "#ab003c", // Darker pink in light mode
            },
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        // Ensure buttons have good contrast
                        color: isDarkTheme ? "#ffffff" : "#121212",
                    },
                    contained: {
                        // Remove hardcoded backgroundColor to let CSS custom properties work
                        color: isDarkTheme ? "#000000" : "#333333",
                        border: isDarkTheme
                            ? "2px solid #ffffff"
                            : "2px solid var(--button-bg)",
                        "&:hover": {
                            backgroundColor: isDarkTheme
                                ? "#e0e0e0"
                                : "#e9e9e9",
                            color: isDarkTheme ? "#000000" : "#333333",
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDarkTheme ? "#1a1a1a" : "#f0f0f0",
                    },
                },
            },
        },
    })

    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </MuiThemeProvider>
    )
}

export default AppWrapper
