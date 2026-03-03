/**
 * RulesPageShared.js
 *
 * Shared primitives used by every rules page so we keep a single source of
 * truth instead of copy-pasting across six files.
 *
 * Exports:
 *   useInView    — IntersectionObserver hook; returns [ref, isInView]
 *   Slide        — fade-up animation wrapper (uses useInView internally)
 *   glassSection — MUI sx object for the outer section card
 *   glassItem    — MUI sx object for inner sub-cards (actions, types, etc.)
 */

import React, { useEffect, useRef, useState } from "react"
import { Box } from "@mui/material"

// ── IntersectionObserver hook ────────────────────────────────────────────────
export const useInView = (options = {}) => {
    const ref = useRef(null)
    const [isInView, setIsInView] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                }
            },
            {
                threshold: options.threshold || 0.2,
                rootMargin: options.rootMargin || "0px",
            },
        )

        const currentRef = ref.current
        if (currentRef) observer.observe(currentRef)
        return () => {
            if (currentRef) observer.unobserve(currentRef)
        }
    }, [options.threshold, options.rootMargin])

    return [ref, isInView]
}

// ── Fade-up slide-in animation wrapper ──────────────────────────────────────
export const Slide = ({ children, delay = 0 }) => {
    const [ref, isInView] = useInView({ threshold: 0.15 })

    return (
        <Box
            ref={ref}
            sx={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(60px)",
                transition: `all 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
                width: "100%",
            }}
        >
            {children}
        </Box>
    )
}

// ── Outer section card styling ───────────────────────────────────────────────
export const glassSection = {
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
}

// ── Inner sub-card styling (actions, types, conditions, phases …) ────────────
export const glassItem = {
    bgcolor: (theme) =>
        theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.03)"
            : "rgba(0, 0, 0, 0.02)",
    border: (theme) =>
        theme.palette.mode === "dark"
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
    borderRadius: "12px",
    padding: "15px",
    margin: "15px 0",
    transition: "all 0.3s ease",
    "&:hover": {
        border: (theme) =>
            theme.palette.mode === "dark"
                ? "1px solid rgba(255, 255, 255, 0.2)"
                : "1px solid rgba(0, 0, 0, 0.2)",
    },
}
