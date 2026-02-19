import React, { useState } from "react"
import { Container, Typography, Box, Button, Grid, Chip } from "@mui/material"
import {
    CrossedSwordsIcon,
    DarkMoonIcon,
    ScrollIcon,
    TargetIcon,
    SkullIcon,
    OpenBookIcon,
    ChevronDownIcon,
    MonsterClawIcon,
    BatteredShieldIcon,
    PotionIcon,
} from "../components/icons"

/**
 * ============================================================================
 * I MUST KILL - STYLE GUIDE
 * ============================================================================
 *
 * This document codifies the design system for the I Must Kill website.
 * All styling decisions should reference this guide to maintain consistency.
 *
 * DESIGN PHILOSOPHY:
 * - Dark fantasy aesthetic with a modern, clean feel
 * - Glassmorphic design language
 * - Responsive mobile-first approach
 * - Accessible contrast ratios in both light and dark modes
 *
 * ============================================================================
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

const COLORS = {
    // Background colors
    background: {
        dark: "#121212",
        light: "#f5f5f5",
    },

    // Text colors
    text: {
        primary: {
            dark: "#e0e0e0",
            light: "#121212",
        },
        secondary: {
            dark: "#b0b0b0",
            light: "#444444",
        },
        muted: {
            dark: "rgba(255, 255, 255, 0.5)",
            light: "rgba(0, 0, 0, 0.4)",
        },
    },

    // Glassmorphic surface colors
    surface: {
        dark: "rgba(255, 255, 255, 0.05)",
        light: "rgba(0, 0, 0, 0.03)",
    },

    // Border colors
    border: {
        default: {
            dark: "rgba(255, 255, 255, 0.1)",
            light: "rgba(0, 0, 0, 0.1)",
        },
        hover: {
            dark: "rgba(255, 255, 255, 0.3)",
            light: "rgba(0, 0, 0, 0.2)",
        },
        active: {
            dark: "rgba(255, 255, 255, 0.6)",
            light: "rgba(0, 0, 0, 0.4)",
        },
    },
}

// ============================================================================
// SPACING SYSTEM
// ============================================================================

const SPACING = {
    // Base unit: 8px
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",

    // Section spacing
    sectionGap: { xs: "40px", sm: "60px", md: "80px" },
    contentMaxWidth: "900px",

    // Component padding
    cardPadding: { xs: "16px", sm: "24px", md: "32px" },
    buttonPadding: { xs: "12px 24px", sm: "16px 32px" },
}

// ============================================================================
// TYPOGRAPHY
// ============================================================================

const TYPOGRAPHY = {
    // Font family is inherited from MUI theme (Cinzel for headings, system for body)

    // Heading sizes
    h1: { xs: "2rem", sm: "3rem", md: "4rem" },
    h2: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
    h3: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
    h4: { xs: "1.1rem", sm: "1.25rem", md: "1.5rem" },

    // Body sizes
    body1: { xs: "1rem", sm: "1.1rem" },
    body2: { xs: "0.875rem", sm: "1rem" },
    caption: { xs: "0.75rem", sm: "0.875rem" },

    // Line heights
    headingLineHeight: 1.2,
    bodyLineHeight: 1.6,
}

// ============================================================================
// BORDER RADIUS
// ============================================================================

const RADIUS = {
    small: "8px",
    medium: "12px",
    large: "16px",
    pill: "9999px",
}

// ============================================================================
// ANIMATIONS & TRANSITIONS
// ============================================================================

const ANIMATIONS = {
    // Standard transitions
    fast: "0.15s ease",
    normal: "0.3s ease",
    slow: "0.5s ease",

    // Complex easing
    cubic: "0.8s cubic-bezier(0.4, 0, 0.2, 1)",

    // Hover scale
    hoverScale: "scale(1.02)",
    hoverScaleLarge: "scale(1.05)",
}

// ============================================================================
// GLASSMORPHIC STYLES (UTILITY FUNCTIONS)
// ============================================================================

/**
 * Get glassmorphic section styles
 * Use for main content sections, cards, and containers
 */
export const getGlassSectionStyles = () => ({
    bgcolor: (theme) =>
        theme.palette.mode === "dark"
            ? COLORS.surface.dark
            : COLORS.surface.light,
    border: (theme) =>
        theme.palette.mode === "dark"
            ? `1px solid ${COLORS.border.default.dark}`
            : `1px solid ${COLORS.border.default.light}`,
    borderRadius: RADIUS.large,
    backdropFilter: "blur(10px)",
    transition: `all ${ANIMATIONS.normal}`,
})

/**
 * Get glassmorphic button styles
 * Use for primary action buttons
 */
export const getGlassButtonStyles = () => ({
    borderRadius: RADIUS.medium,
    border: (theme) =>
        theme.palette.mode === "dark"
            ? `2px solid ${COLORS.border.hover.dark}`
            : `2px solid ${COLORS.border.hover.light}`,
    color: (theme) =>
        theme.palette.mode === "dark"
            ? COLORS.text.primary.dark
            : COLORS.text.primary.light,
    bgcolor: (theme) =>
        theme.palette.mode === "dark"
            ? COLORS.surface.dark
            : COLORS.surface.light,
    backdropFilter: "blur(10px)",
    textTransform: "none",
    fontWeight: "bold",
    transition: `all ${ANIMATIONS.normal}`,
    "&:hover": {
        border: (theme) =>
            theme.palette.mode === "dark"
                ? `2px solid ${COLORS.border.active.dark}`
                : `2px solid ${COLORS.border.active.light}`,
        bgcolor: (theme) =>
            theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
        transform: ANIMATIONS.hoverScaleLarge,
    },
})

/**
 * Get glassmorphic card styles with hover effect
 * Use for clickable cards and list items
 */
export const getGlassCardStyles = () => ({
    ...getGlassSectionStyles(),
    cursor: "pointer",
    "&:hover": {
        border: (theme) =>
            theme.palette.mode === "dark"
                ? `1px solid ${COLORS.border.hover.dark}`
                : `1px solid ${COLORS.border.hover.light}`,
        transform: ANIMATIONS.hoverScale,
    },
})

/**
 * Get text input styles
 * Use for text fields, selects, and search inputs
 */
export const getGlassInputStyles = () => ({
    "& .MuiOutlinedInput-root": {
        bgcolor: (theme) =>
            theme.palette.mode === "dark"
                ? COLORS.surface.dark
                : COLORS.surface.light,
        backdropFilter: "blur(10px)",
        borderRadius: RADIUS.medium,
        border: (theme) =>
            theme.palette.mode === "dark"
                ? `1px solid ${COLORS.border.default.dark}`
                : `1px solid ${COLORS.border.default.light}`,
        "& fieldset": { border: "none" },
        "&:hover": {
            border: (theme) =>
                theme.palette.mode === "dark"
                    ? `1px solid ${COLORS.border.hover.dark}`
                    : `1px solid ${COLORS.border.hover.light}`,
        },
        "&.Mui-focused": {
            border: (theme) =>
                theme.palette.mode === "dark"
                    ? `1px solid ${COLORS.border.active.dark}`
                    : `1px solid ${COLORS.border.active.light}`,
        },
    },
})

// ============================================================================
// STYLE GUIDE PAGE COMPONENT
// ============================================================================

const StyleGuide = () => {
    const [activeSection, setActiveSection] = useState("overview")

    const sections = [
        { id: "overview", label: "Overview" },
        { id: "colors", label: "Colors" },
        { id: "typography", label: "Typography" },
        { id: "buttons", label: "Buttons" },
        { id: "cards", label: "Cards & Sections" },
        { id: "icons", label: "Icons" },
        { id: "animations", label: "Animations" },
        { id: "code", label: "Code Examples" },
    ]

    const SectionTitle = ({ children }) => (
        <Typography
            variant='h2'
            sx={{
                fontSize: TYPOGRAPHY.h2,
                fontWeight: "bold",
                mb: 3,
                color: (theme) =>
                    theme.palette.mode === "dark"
                        ? COLORS.text.primary.dark
                        : COLORS.text.primary.light,
            }}
        >
            {children}
        </Typography>
    )

    const SubTitle = ({ children }) => (
        <Typography
            variant='h4'
            sx={{
                fontSize: TYPOGRAPHY.h4,
                fontWeight: "bold",
                mb: 2,
                mt: 4,
                color: (theme) =>
                    theme.palette.mode === "dark"
                        ? COLORS.text.primary.dark
                        : COLORS.text.primary.light,
            }}
        >
            {children}
        </Typography>
    )

    const CodeBlock = ({ children }) => (
        <Box
            component='pre'
            sx={{
                ...getGlassSectionStyles(),
                p: 2,
                mt: 2,
                overflow: "auto",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#a5d6ff" : "#0550ae",
            }}
        >
            <code>{children}</code>
        </Box>
    )

    const ColorSwatch = ({ name, value, textColor = "#fff" }) => (
        <Box sx={{ textAlign: "center", mb: 2 }}>
            <Box
                sx={{
                    width: "100%",
                    height: "60px",
                    bgcolor: value,
                    borderRadius: RADIUS.medium,
                    border: `1px solid ${COLORS.border.default.dark}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1,
                }}
            >
                <Typography
                    variant='caption'
                    sx={{ color: textColor, fontFamily: "monospace" }}
                >
                    {value}
                </Typography>
            </Box>
            <Typography variant='caption'>{name}</Typography>
        </Box>
    )

    return (
        <Container
            sx={{
                color: (theme) =>
                    theme.palette.mode === "dark"
                        ? COLORS.text.primary.dark
                        : COLORS.text.primary.light,
                py: 4,
                pb: 10,
            }}
        >
            {/* Header */}
            <Box sx={{ textAlign: "center", mb: 6 }}>
                <Typography
                    variant='h1'
                    sx={{
                        fontSize: TYPOGRAPHY.h1,
                        fontWeight: "bold",
                        mb: 2,
                    }}
                >
                    I Must Kill Style Guide
                </Typography>
                <Typography
                    variant='body1'
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? COLORS.text.secondary.dark
                                : COLORS.text.secondary.light,
                        maxWidth: "600px",
                        mx: "auto",
                    }}
                >
                    A comprehensive design system reference for developers. This
                    guide codifies the glassmorphic dark fantasy aesthetic used
                    throughout the application.
                </Typography>
            </Box>

            {/* Navigation */}
            <Box
                sx={{
                    ...getGlassSectionStyles(),
                    p: 2,
                    mb: 4,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "center",
                }}
            >
                {sections.map((section) => (
                    <Chip
                        key={section.id}
                        label={section.label}
                        onClick={() => setActiveSection(section.id)}
                        sx={{
                            cursor: "pointer",
                            bgcolor:
                                activeSection === section.id
                                    ? (theme) =>
                                          theme.palette.mode === "dark"
                                              ? "rgba(255,255,255,0.15)"
                                              : "rgba(0,0,0,0.1)"
                                    : "transparent",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? `1px solid ${COLORS.border.default.dark}`
                                    : `1px solid ${COLORS.border.default.light}`,
                            "&:hover": {
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.1)"
                                        : "rgba(0,0,0,0.05)",
                            },
                        }}
                    />
                ))}
            </Box>

            {/* Overview Section */}
            {activeSection === "overview" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Design Philosophy</SectionTitle>
                    <Typography
                        sx={{ mb: 3, lineHeight: TYPOGRAPHY.bodyLineHeight }}
                    >
                        I Must Kill uses a{" "}
                        <strong>glassmorphic design language</strong> that
                        creates depth and atmosphere while maintaining
                        readability and accessibility. The design evokes the
                        dark fantasy monster-hunting theme while feeling modern
                        and clean.
                    </Typography>

                    <SubTitle>Core Principles</SubTitle>
                    <Grid container spacing={2}>
                        {[
                            {
                                title: "Glassmorphism",
                                desc: "Semi-transparent surfaces with blur effects create depth and layering",
                            },
                            {
                                title: "Dark Fantasy",
                                desc: "Muted colors with selective highlights evoke a dangerous, mysterious world",
                            },
                            {
                                title: "Mobile-First",
                                desc: "All components are designed responsively, scaling from mobile to desktop",
                            },
                            {
                                title: "Accessibility",
                                desc: "Proper contrast ratios and focus states in both light and dark modes",
                            },
                        ].map((item) => (
                            <Grid item xs={12} sm={6} key={item.title}>
                                <Box
                                    sx={{
                                        ...getGlassSectionStyles(),
                                        p: 2,
                                    }}
                                >
                                    <Typography
                                        sx={{ fontWeight: "bold", mb: 1 }}
                                    >
                                        {item.title}
                                    </Typography>
                                    <Typography variant='body2'>
                                        {item.desc}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    <SubTitle>Technology Stack</SubTitle>
                    <Typography>
                        <strong>React</strong> with{" "}
                        <strong>Material UI (MUI)</strong> for component
                        foundation. Custom glassmorphic styles are applied via
                        the MUI <code>sx</code> prop system. Theme toggling is
                        handled via React Context.
                    </Typography>
                </Box>
            )}

            {/* Colors Section */}
            {activeSection === "colors" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Color System</SectionTitle>
                    <Typography sx={{ mb: 4 }}>
                        Colors adapt between dark and light modes. Use
                        theme-aware functions to ensure proper contrast.
                    </Typography>

                    <SubTitle>Text Colors (Dark Mode)</SubTitle>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <ColorSwatch
                                name='Primary'
                                value='#e0e0e0'
                                textColor='#121212'
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <ColorSwatch
                                name='Secondary'
                                value='#b0b0b0'
                                textColor='#121212'
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <ColorSwatch
                                name='Muted'
                                value='rgba(255,255,255,0.5)'
                                textColor='#121212'
                            />
                        </Grid>
                    </Grid>

                    <SubTitle>Surface Colors</SubTitle>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box sx={{ textAlign: "center" }}>
                                <Box
                                    sx={{
                                        height: "80px",
                                        bgcolor: "rgba(255,255,255,0.05)",
                                        borderRadius: RADIUS.medium,
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        backdropFilter: "blur(10px)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        mb: 1,
                                    }}
                                >
                                    <Typography variant='caption'>
                                        Dark Mode Surface
                                    </Typography>
                                </Box>
                                <Typography
                                    variant='caption'
                                    sx={{ fontFamily: "monospace" }}
                                >
                                    rgba(255,255,255,0.05)
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box sx={{ textAlign: "center" }}>
                                <Box
                                    sx={{
                                        height: "80px",
                                        bgcolor: "rgba(0,0,0,0.03)",
                                        borderRadius: RADIUS.medium,
                                        border: "1px solid rgba(0,0,0,0.1)",
                                        backdropFilter: "blur(10px)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        mb: 1,
                                    }}
                                >
                                    <Typography
                                        variant='caption'
                                        sx={{ color: "#121212" }}
                                    >
                                        Light Mode Surface
                                    </Typography>
                                </Box>
                                <Typography
                                    variant='caption'
                                    sx={{ fontFamily: "monospace" }}
                                >
                                    rgba(0,0,0,0.03)
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    <SubTitle>Border States</SubTitle>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: RADIUS.medium,
                                    textAlign: "center",
                                }}
                            >
                                <Typography variant='caption'>
                                    Default
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    borderRadius: RADIUS.medium,
                                    textAlign: "center",
                                }}
                            >
                                <Typography variant='caption'>Hover</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box
                                sx={{
                                    p: 2,
                                    border: "2px solid rgba(255,255,255,0.6)",
                                    borderRadius: RADIUS.medium,
                                    textAlign: "center",
                                }}
                            >
                                <Typography variant='caption'>
                                    Active
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Typography Section */}
            {activeSection === "typography" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Typography</SectionTitle>
                    <Typography sx={{ mb: 4 }}>
                        Headings use the Cinzel font family for a classic,
                        fantasy feel. Body text uses system fonts for
                        readability.
                    </Typography>

                    <SubTitle>Heading Sizes</SubTitle>
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            sx={{
                                fontSize: TYPOGRAPHY.h1,
                                fontWeight: "bold",
                                mb: 2,
                            }}
                        >
                            H1 - Page Title (2-4rem)
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: TYPOGRAPHY.h2,
                                fontWeight: "bold",
                                mb: 2,
                            }}
                        >
                            H2 - Section Title (1.5-2.5rem)
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: TYPOGRAPHY.h3,
                                fontWeight: "bold",
                                mb: 2,
                            }}
                        >
                            H3 - Subsection (1.25-1.75rem)
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: TYPOGRAPHY.h4,
                                fontWeight: "bold",
                                mb: 2,
                            }}
                        >
                            H4 - Card Title (1.1-1.5rem)
                        </Typography>
                    </Box>

                    <SubTitle>Body Text</SubTitle>
                    <Box sx={{ mb: 4 }}>
                        <Typography sx={{ fontSize: TYPOGRAPHY.body1, mb: 2 }}>
                            Body 1 (1-1.1rem) - Primary body text used for main
                            content and descriptions. Line height should be 1.6
                            for readability.
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: TYPOGRAPHY.body2,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? COLORS.text.secondary.dark
                                        : COLORS.text.secondary.light,
                                mb: 2,
                            }}
                        >
                            Body 2 (0.875-1rem) - Secondary text for supporting
                            information.
                        </Typography>
                        <Typography
                            variant='caption'
                            sx={{
                                fontSize: TYPOGRAPHY.caption,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? COLORS.text.muted.dark
                                        : COLORS.text.muted.light,
                            }}
                        >
                            Caption (0.75-0.875rem) - Small text for labels and
                            metadata.
                        </Typography>
                    </Box>

                    <SubTitle>Responsive Font Sizes</SubTitle>
                    <CodeBlock>
                        {`// Use responsive objects for all font sizes
fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" }

// Standard heading scale:
h1: { xs: "2rem", sm: "3rem", md: "4rem" }
h2: { xs: "1.5rem", sm: "2rem", md: "2.5rem" }
h3: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" }`}
                    </CodeBlock>
                </Box>
            )}

            {/* Buttons Section */}
            {activeSection === "buttons" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Buttons</SectionTitle>
                    <Typography sx={{ mb: 4 }}>
                        All buttons use the outlined variant with glassmorphic
                        styling. Never use solid/contained buttons.
                    </Typography>

                    <SubTitle>Primary Button</SubTitle>
                    <Box sx={{ mb: 4 }}>
                        <Button
                            variant='outlined'
                            sx={{
                                ...getGlassButtonStyles(),
                                px: 4,
                                py: 1.5,
                                fontSize: "1rem",
                            }}
                        >
                            Primary Action
                        </Button>
                    </Box>

                    <SubTitle>Button Sizes</SubTitle>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            flexWrap: "wrap",
                            mb: 4,
                        }}
                    >
                        <Button
                            variant='outlined'
                            sx={{
                                ...getGlassButtonStyles(),
                                px: 2,
                                py: 0.75,
                                fontSize: "0.875rem",
                            }}
                        >
                            Small
                        </Button>
                        <Button
                            variant='outlined'
                            sx={{
                                ...getGlassButtonStyles(),
                                px: 3,
                                py: 1,
                                fontSize: "1rem",
                            }}
                        >
                            Medium
                        </Button>
                        <Button
                            variant='outlined'
                            sx={{
                                ...getGlassButtonStyles(),
                                px: 4,
                                py: 1.5,
                                fontSize: "1.1rem",
                            }}
                        >
                            Large
                        </Button>
                    </Box>

                    <SubTitle>Full-Width Button</SubTitle>
                    <Button
                        variant='outlined'
                        fullWidth
                        sx={{
                            ...getGlassButtonStyles(),
                            py: 1.5,
                            fontSize: "1rem",
                            maxWidth: "400px",
                        }}
                    >
                        Full Width Action
                    </Button>

                    <SubTitle>Button Code</SubTitle>
                    <CodeBlock>
                        {`<Button
    variant='outlined'
    sx={{
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
        textTransform: "none",
        fontWeight: "bold",
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
            transform: "scale(1.05)",
        },
    }}
>
    Button Text
</Button>`}
                    </CodeBlock>
                </Box>
            )}

            {/* Cards Section */}
            {activeSection === "cards" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Cards & Sections</SectionTitle>

                    <SubTitle>Standard Section</SubTitle>
                    <Box sx={{ ...getGlassSectionStyles(), p: 3, mb: 4 }}>
                        <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                            Section Title
                        </Typography>
                        <Typography variant='body2'>
                            Section content goes here. This is the standard
                            container for grouping related content.
                        </Typography>
                    </Box>

                    <SubTitle>Clickable Card</SubTitle>
                    <Box sx={{ ...getGlassCardStyles(), p: 3, mb: 4 }}>
                        <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                            Clickable Card
                        </Typography>
                        <Typography variant='body2'>
                            Hover to see the interaction effect. Cards scale
                            slightly and borders brighten.
                        </Typography>
                    </Box>

                    <SubTitle>Nested Content</SubTitle>
                    <Box sx={{ ...getGlassSectionStyles(), p: 3, mb: 4 }}>
                        <Typography sx={{ fontWeight: "bold", mb: 2 }}>
                            Parent Section
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Box
                                    sx={{
                                        ...getGlassCardStyles(),
                                        p: 2,
                                    }}
                                >
                                    <Typography variant='body2'>
                                        Nested Card 1
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box
                                    sx={{
                                        ...getGlassCardStyles(),
                                        p: 2,
                                    }}
                                >
                                    <Typography variant='body2'>
                                        Nested Card 2
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>

                    <SubTitle>Section Code</SubTitle>
                    <CodeBlock>
                        {`// Standard glassmorphic section
<Box
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
        padding: { xs: "16px", sm: "24px", md: "32px" },
    }}
>
    {/* Content */}
</Box>`}
                    </CodeBlock>
                </Box>
            )}

            {/* Icons Section */}
            {activeSection === "icons" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Custom Icons</SectionTitle>
                    <Typography sx={{ mb: 4 }}>
                        Custom SVG icons are located in{" "}
                        <code>src/components/icons/index.js</code>. All icons
                        accept <code>size</code> and <code>color</code> props
                        and inherit <code>currentColor</code> by default.
                    </Typography>

                    <SubTitle>Available Icons</SubTitle>
                    <Grid container spacing={3}>
                        {[
                            {
                                Icon: CrossedSwordsIcon,
                                name: "CrossedSwordsIcon",
                            },
                            { Icon: DarkMoonIcon, name: "DarkMoonIcon" },
                            { Icon: ScrollIcon, name: "ScrollIcon" },
                            { Icon: TargetIcon, name: "TargetIcon" },
                            { Icon: SkullIcon, name: "SkullIcon" },
                            { Icon: OpenBookIcon, name: "OpenBookIcon" },
                            { Icon: ChevronDownIcon, name: "ChevronDownIcon" },
                            { Icon: MonsterClawIcon, name: "MonsterClawIcon" },
                            {
                                Icon: BatteredShieldIcon,
                                name: "BatteredShieldIcon",
                            },
                            { Icon: PotionIcon, name: "PotionIcon" },
                        ].map(({ Icon, name }) => (
                            <Grid item xs={6} sm={4} md={3} key={name}>
                                <Box
                                    sx={{
                                        ...getGlassSectionStyles(),
                                        p: 2,
                                        textAlign: "center",
                                    }}
                                >
                                    <Icon size={48} />
                                    <Typography
                                        variant='caption'
                                        display='block'
                                        sx={{ mt: 1, fontFamily: "monospace" }}
                                    >
                                        {name}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    <SubTitle>Icon Sizes</SubTitle>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            mb: 4,
                        }}
                    >
                        <Box sx={{ textAlign: "center" }}>
                            <SkullIcon size={24} />
                            <Typography variant='caption' display='block'>
                                24px
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                            <SkullIcon size={32} />
                            <Typography variant='caption' display='block'>
                                32px
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                            <SkullIcon size={48} />
                            <Typography variant='caption' display='block'>
                                48px
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                            <SkullIcon size={64} />
                            <Typography variant='caption' display='block'>
                                64px
                            </Typography>
                        </Box>
                    </Box>

                    <SubTitle>Usage</SubTitle>
                    <CodeBlock>
                        {`import { SkullIcon, CrossedSwordsIcon } from "../components/icons"

// Default (inherits currentColor)
<SkullIcon size={48} />

// Custom color
<CrossedSwordsIcon size={32} color="#ff5555" />`}
                    </CodeBlock>
                </Box>
            )}

            {/* Animations Section */}
            {activeSection === "animations" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Animations</SectionTitle>

                    <SubTitle>
                        Scroll Animations (Intersection Observer)
                    </SubTitle>
                    <Typography sx={{ mb: 3 }}>
                        Use the <code>useInView</code> hook with the{" "}
                        <code>Slide</code> component for scroll-triggered
                        animations.
                    </Typography>
                    <CodeBlock>
                        {`// Custom hook for intersection observer
const useInView = (options = {}) => {
    const ref = useRef(null)
    const [isInView, setIsInView] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                }
            },
            { threshold: options.threshold || 0.2 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return [ref, isInView]
}

// Slide component
const Slide = ({ children, delay = 0 }) => {
    const [ref, isInView] = useInView()
    return (
        <Box
            ref={ref}
            sx={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(60px)",
                transition: \`all 0.8s cubic-bezier(0.4, 0, 0.2, 1) \${delay}ms\`,
            }}
        >
            {children}
        </Box>
    )
}`}
                    </CodeBlock>

                    <SubTitle>Hover Effects</SubTitle>
                    <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
                        <Box
                            sx={{
                                ...getGlassCardStyles(),
                                p: 3,
                                textAlign: "center",
                            }}
                        >
                            <Typography variant='body2'>
                                Hover me (scale)
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                ...getGlassSectionStyles(),
                                p: 3,
                                textAlign: "center",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.08)",
                                },
                            }}
                        >
                            <Typography variant='body2'>
                                Hover me (glow)
                            </Typography>
                        </Box>
                    </Box>

                    <SubTitle>Transition Timing</SubTitle>
                    <CodeBlock>
                        {`// Standard transitions
fast: "0.15s ease"    // Micro-interactions
normal: "0.3s ease"   // Button hovers, state changes
slow: "0.5s ease"     // Panel expansions

// Complex easing (scroll animations)
cubic: "0.8s cubic-bezier(0.4, 0, 0.2, 1)"`}
                    </CodeBlock>
                </Box>
            )}

            {/* Code Examples Section */}
            {activeSection === "code" && (
                <Box sx={{ ...getGlassSectionStyles(), p: 4 }}>
                    <SectionTitle>Code Examples</SectionTitle>

                    <SubTitle>Import the Style Utilities</SubTitle>
                    <CodeBlock>
                        {`import { 
    getGlassSectionStyles,
    getGlassButtonStyles,
    getGlassCardStyles,
    getGlassInputStyles,
} from "../pages/StyleGuide"

// Use in your components:
<Box sx={{ ...getGlassSectionStyles(), p: 3 }}>
    Content here
</Box>`}
                    </CodeBlock>

                    <SubTitle>Complete Page Template</SubTitle>
                    <CodeBlock>
                        {`import React from "react"
import { Container, Typography, Box, Button } from "@mui/material"

const MyPage = () => {
    return (
        <Container
            sx={{
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                py: 4,
                pb: 10, // Account for fixed bottom button
            }}
        >
            {/* Page Title */}
            <Typography
                variant='h1'
                sx={{
                    fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
                    fontWeight: "bold",
                    textAlign: "center",
                    mb: 4,
                }}
            >
                Page Title
            </Typography>

            {/* Content Section */}
            <Box
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
                    p: { xs: 2, sm: 3, md: 4 },
                }}
            >
                <Typography>Your content here</Typography>
            </Box>
        </Container>
    )
}

export default MyPage`}
                    </CodeBlock>

                    <SubTitle>Theme-Aware Color Usage</SubTitle>
                    <CodeBlock>
                        {`// Always use functions for theme-aware colors:

// Text colors
color: (theme) =>
    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212"

// Background colors  
bgcolor: (theme) =>
    theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.03)"

// Border colors
border: (theme) =>
    theme.palette.mode === "dark"
        ? "1px solid rgba(255, 255, 255, 0.1)"
        : "1px solid rgba(0, 0, 0, 0.1)"

// NEVER use hard-coded colors without theme check!`}
                    </CodeBlock>
                </Box>
            )}

            {/* Footer */}
            <Box
                sx={{
                    textAlign: "center",
                    mt: 6,
                    pt: 4,
                    borderTop: (theme) =>
                        theme.palette.mode === "dark"
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "1px solid rgba(0,0,0,0.1)",
                }}
            >
                <Typography
                    variant='caption'
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? COLORS.text.muted.dark
                                : COLORS.text.muted.light,
                    }}
                >
                    I Must Kill Style Guide v1.0 - Last updated:{" "}
                    {new Date().toLocaleDateString()}
                </Typography>
            </Box>
        </Container>
    )
}

export default StyleGuide
