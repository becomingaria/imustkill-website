import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Container, Typography, Box, Button } from "@mui/material"
import {
    CrossedSwordsIcon,
    DarkMoonIcon,
    ScrollIcon,
    TargetIcon,
    SkullIcon,
    OpenBookIcon,
    ChevronDownIcon,
} from "../components/icons"

// Custom hook for detecting when an element is in viewport
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
            {
                threshold: options.threshold || 0.2,
                rootMargin: options.rootMargin || "0px",
            },
        )

        const currentRef = ref.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef)
            }
        }
    }, [options.threshold, options.rootMargin])

    return [ref, isInView]
}

// Animated slide component
const Slide = ({ children, delay = 0 }) => {
    const [ref, isInView] = useInView({ threshold: 0.2 })

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

const About = () => {
    const slides = [
        {
            title: "Hunt. Fight. Get Paid.",
            content:
                "I Must Kill is a tabletop roleplaying game where you take on the role of monster hunters in a dark, dangerous world. Every encounter is deadly, every hunt is personal, and every kill matters.",
            Icon: CrossedSwordsIcon,
        },
        {
            title: "A World of Darkness",
            content:
                "The world is overrun with terrifying creatures. From shambling horrors to ancient predators, monsters lurk in every shadow. Only the brave—or the desperate—dare to hunt them.",
            Icon: DarkMoonIcon,
        },
        {
            title: "Prepare for the Hunt",
            content:
                "Success depends on preparation. Research your quarry, craft specialized weapons, mix potent concoctions, and set deadly traps. Knowledge is as vital as steel.",
            Icon: ScrollIcon,
        },
        {
            title: "Fast, Tactical Combat",
            content:
                "Combat is quick and brutal. Use positioning, timing, and your arsenal of abilities to exploit monster weaknesses. One wrong move can be your last.",
            Icon: TargetIcon,
        },
        {
            title: "Grow Stronger",
            content:
                "Harvest trophies from your kills to craft powerful gear. Develop new abilities and techniques. The monsters grow stronger—so must you.",
            Icon: SkullIcon,
        },
        {
            title: "Your Story Awaits",
            content:
                "Whether you play solo or with a group, every hunt tells a story. Form bonds with fellow hunters, uncover dark secrets, and build your legend as the world's deadliest monster slayer.",
            Icon: OpenBookIcon,
        },
    ]

    return (
        <Container
            sx={{
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                padding: { xs: "15px", sm: "20px" },
                paddingBottom: { xs: "80px", sm: "100px" },
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "100vh",
            }}
        >
            {/* Hero Section */}
            <Box
                sx={{
                    minHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    marginBottom: { xs: "40px", sm: "60px" },
                }}
            >
                <Slide>
                    <Typography
                        variant='h1'
                        sx={{
                            fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
                            fontWeight: "bold",
                            marginBottom: "20px",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                        }}
                    >
                        What is "I Must Kill"?
                    </Typography>
                </Slide>
                <Slide delay={200}>
                    <Typography
                        variant='h4'
                        sx={{
                            fontSize: {
                                xs: "1.2rem",
                                sm: "1.5rem",
                                md: "2rem",
                            },
                            maxWidth: "800px",
                            lineHeight: 1.6,
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#b0b0b0"
                                    : "#333",
                        }}
                    >
                        A tabletop roleplaying game about hunting monsters,
                        surviving the darkness, and becoming legend.
                    </Typography>
                </Slide>
                <Slide delay={400}>
                    <Box
                        sx={{
                            marginTop: "40px",
                            animation: "bounce 2s infinite",
                            "@keyframes bounce": {
                                "0%, 100%": { transform: "translateY(0)" },
                                "50%": { transform: "translateY(10px)" },
                            },
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.6)"
                                    : "rgba(0, 0, 0, 0.4)",
                        }}
                    >
                        <ChevronDownIcon size={48} />
                    </Box>
                </Slide>
            </Box>

            {/* Content Slides */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: "80px", sm: "120px" },
                    maxWidth: "900px",
                    width: "100%",
                }}
            >
                {slides.map((slide, index) => (
                    <Slide key={index} delay={100}>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems:
                                    index % 2 === 0 ? "flex-start" : "flex-end",
                                textAlign: index % 2 === 0 ? "left" : "right",
                                padding: { xs: "20px", sm: "40px" },
                                borderRadius: "16px",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(0, 0, 0, 0.03)",
                                backdropFilter: "blur(10px)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.1)"
                                        : "1px solid rgba(0, 0, 0, 0.1)",
                            }}
                        >
                            <Box
                                sx={{
                                    marginBottom: "16px",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.8)"
                                            : "rgba(0, 0, 0, 0.7)",
                                }}
                            >
                                <slide.Icon size={56} />
                            </Box>
                            <Typography
                                variant='h3'
                                sx={{
                                    fontSize: {
                                        xs: "1.5rem",
                                        sm: "2rem",
                                        md: "2.5rem",
                                    },
                                    fontWeight: "bold",
                                    marginBottom: "20px",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#121212",
                                }}
                            >
                                {slide.title}
                            </Typography>
                            <Typography
                                variant='body1'
                                sx={{
                                    fontSize: { xs: "1rem", sm: "1.2rem" },
                                    lineHeight: 1.8,
                                    maxWidth: "600px",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#444",
                                }}
                            >
                                {slide.content}
                            </Typography>
                        </Box>
                    </Slide>
                ))}
            </Box>

            {/* Call to Action */}
            <Box
                sx={{
                    marginTop: { xs: "80px", sm: "120px" },
                    marginBottom: { xs: "120px", sm: "180px" },
                    textAlign: "center",
                    minHeight: { xs: "60vh", sm: "70vh" },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Slide>
                    <Typography
                        variant='h3'
                        sx={{
                            fontSize: {
                                xs: "1.5rem",
                                sm: "2rem",
                                md: "2.5rem",
                            },
                            fontWeight: "bold",
                            marginBottom: { xs: "40px", sm: "60px" },
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                        }}
                    >
                        Ready to begin your hunt?
                    </Typography>
                </Slide>
                <Slide delay={400}>
                    <Button
                        component={Link}
                        to='/'
                        variant='outlined'
                        sx={{
                            padding: { xs: "16px 40px", sm: "20px 60px" },
                            fontSize: { xs: "1.1rem", sm: "1.3rem" },
                            fontWeight: "bold",
                            borderRadius: "12px",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid rgba(255, 255, 255, 0.3)"
                                    : "2px solid rgba(0, 0, 0, 0.2)",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            backdropFilter: "blur(10px)",
                            transition: "all 0.3s ease",
                            textTransform: "none",
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
                        Begin the Hunt
                    </Button>
                </Slide>
            </Box>
        </Container>
    )
}

export default About
