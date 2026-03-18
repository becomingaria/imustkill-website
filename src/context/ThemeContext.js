import React, { createContext, useState, useEffect } from "react"

export const ThemeContext = createContext()

// Utility function for theme-aware colors
export const getThemeColors = (isDark) => ({
    text: {
        primary: isDark ? "#ffffff" : "#121212",
        secondary: isDark ? "#cccccc" : "#252525",
        light: isDark ? "#aaaaaa" : "#505050",
    },
    background: {
        primary: isDark ? "#000000" : "#ffffff",
        secondary: isDark ? "#1f1f1f" : "#f0f0f0",
        paper: isDark ? "#333333" : "#f5f5f5",
    },
    border: isDark ? "#444444" : "#999999",
    shadow: isDark ? "0 4px 8px rgba(0,0,0,0.5)" : "0 4px 8px rgba(0,0,0,0.15)",
})

export const ThemeProvider = ({ children }) => {
    // Check local storage for saved preference, default to dark mode if no preference is saved
    const savedTheme = localStorage.getItem("theme")
    const [isDarkTheme, setIsDarkTheme] = useState(
        savedTheme ? savedTheme === "dark" : true, // Default to dark mode (true)
    )

    // Check local storage for saved menu mode preference, default to fancy menu
    const savedMenuMode = localStorage.getItem("menuMode")
    const [useListMenu, setUseListMenu] = useState(
        savedMenuMode ? savedMenuMode === "list" : false,
    )

    // Update local storage when theme changes
    useEffect(() => {
        localStorage.setItem("theme", isDarkTheme ? "dark" : "light")

        // Apply theme class to body for global styles
        document.body.classList.toggle("light-theme", !isDarkTheme)

        // Apply a data attribute for easier CSS targeting
        document.documentElement.setAttribute(
            "data-theme",
            isDarkTheme ? "dark" : "light",
        )

        // Announce theme change to screen readers for accessibility
        const message = isDarkTheme ? "Dark mode enabled" : "Light mode enabled"
        const announcement = document.createElement("div")
        announcement.setAttribute("role", "status")
        announcement.setAttribute("aria-live", "polite")
        announcement.className = "sr-only" // Screen reader only
        announcement.textContent = message
        document.body.appendChild(announcement)

        // Force re-calculation of colors for all elements with inline styles
        document.querySelectorAll('[style*="color"]').forEach((element) => {
            element.style.transition = "color 0.3s ease"
        })

        // Remove after announcement is read
        setTimeout(() => {
            document.body.removeChild(announcement)
        }, 1000)
    }, [isDarkTheme])

    // Persist the menu mode preference
    useEffect(() => {
        localStorage.setItem("menuMode", useListMenu ? "list" : "fancy")
    }, [useListMenu])

    const toggleTheme = () => {
        setIsDarkTheme((prevTheme) => !prevTheme)
    }

    const toggleMenuMode = () => {
        setUseListMenu((prev) => !prev)
    }

    const contextValue = {
        isDarkTheme,
        toggleTheme,
        useListMenu,
        toggleMenuMode,
    }

    return (
        <ThemeContext.Provider value={contextValue}>
            {typeof children === "function" ? children(contextValue) : children}
        </ThemeContext.Provider>
    )
}
