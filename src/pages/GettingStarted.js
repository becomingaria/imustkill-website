import React, { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Container, Typography, Box, Button, Grid } from "@mui/material"
import {
    CrossedSwordsIcon,
    ScrollIcon,
    TargetIcon,
    SkullIcon,
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

// Glass section styling
const glassSection = {
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

const GettingStarted = () => {
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
                    minHeight: "70vh",
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
                        Getting Started
                    </Typography>
                </Slide>
                <Slide delay={200}>
                    <Typography
                        variant='h4'
                        sx={{
                            fontSize: {
                                xs: "1.1rem",
                                sm: "1.3rem",
                                md: "1.5rem",
                            },
                            maxWidth: "700px",
                            lineHeight: 1.6,
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#b0b0b0"
                                    : "#333",
                        }}
                    >
                        Learn the basics of I Must Kill in 5 minutes. Everything
                        you need to run your first hunt.
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

            {/* Content */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: "60px", sm: "80px" },
                    maxWidth: "900px",
                    width: "100%",
                }}
            >
                {/* Section 1: The Core Mechanic */}
                <Slide>
                    <Box sx={{ ...glassSection, p: { xs: 3, sm: 4 } }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.8)"
                                        : "rgba(0, 0, 0, 0.7)",
                            }}
                        >
                            <TargetIcon size={40} />
                            <Typography
                                variant='h3'
                                sx={{
                                    fontSize: {
                                        xs: "1.5rem",
                                        sm: "1.75rem",
                                        md: "2rem",
                                    },
                                    fontWeight: "bold",
                                }}
                            >
                                The One Rule
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                lineHeight: 1.8,
                                mb: 3,
                            }}
                        >
                            Everything in I Must Kill uses one simple mechanic:
                        </Typography>
                        <Box
                            sx={{
                                ...glassSection,
                                p: 3,
                                textAlign: "center",
                                mb: 3,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: { xs: "1.2rem", sm: "1.4rem" },
                                    fontWeight: "bold",
                                    mb: 1,
                                }}
                            >
                                Roll 1d10. Roll equal to or under your stat to
                                succeed.
                            </Typography>
                            <Typography
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#555",
                                }}
                            >
                                A roll of 1 is always a critical success. A roll
                                of 10 always fails.
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                lineHeight: 1.8,
                            }}
                        >
                            That's it. Every action—attacking, dodging, casting
                            spells, tracking monsters—uses this same roll.
                        </Typography>
                    </Box>
                </Slide>

                {/* Section 2: The Four Stats */}
                <Slide>
                    <Box sx={{ ...glassSection, p: { xs: 3, sm: 4 } }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.8)"
                                        : "rgba(0, 0, 0, 0.7)",
                            }}
                        >
                            <ScrollIcon size={40} />
                            <Typography
                                variant='h3'
                                sx={{
                                    fontSize: {
                                        xs: "1.5rem",
                                        sm: "1.75rem",
                                        md: "2rem",
                                    },
                                    fontWeight: "bold",
                                }}
                            >
                                The Four Stats
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                lineHeight: 1.8,
                                mb: 3,
                            }}
                        >
                            Every hunter has four stats, typically ranging from
                            3 to 9:
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                {
                                    name: "Body",
                                    desc: "Strength & endurance. Used to Brace against attacks.",
                                    color: "#e57373",
                                },
                                {
                                    name: "Agility",
                                    desc: "Speed & reflexes. Used to Dodge and Flee.",
                                    color: "#81c784",
                                },
                                {
                                    name: "Focus",
                                    desc: "Mental power. Used to cast Powers and negotiate.",
                                    color: "#64b5f6",
                                },
                                {
                                    name: "Fate",
                                    desc: "Luck & life force. Determines your Hit Points.",
                                    color: "#ffb74d",
                                },
                            ].map((stat) => (
                                <Grid item xs={12} sm={6} key={stat.name}>
                                    <Box
                                        sx={{
                                            ...glassSection,
                                            p: 2,
                                            borderLeft: `3px solid ${stat.color}`,
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: "bold",
                                                fontSize: "1.1rem",
                                                mb: 0.5,
                                            }}
                                        >
                                            {stat.name}
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#b0b0b0"
                                                        : "#555",
                                            }}
                                        >
                                            {stat.desc}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                        <Typography
                            sx={{
                                fontSize: { xs: "0.9rem", sm: "1rem" },
                                lineHeight: 1.6,
                                mt: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#b0b0b0"
                                        : "#555",
                            }}
                        >
                            <strong>Quick start:</strong> Use the balanced array
                            (6, 6, 6, 6) for your first character.
                        </Typography>
                    </Box>
                </Slide>

                {/* Section 3: Combat Actions */}
                <Slide>
                    <Box sx={{ ...glassSection, p: { xs: 3, sm: 4 } }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.8)"
                                        : "rgba(0, 0, 0, 0.7)",
                            }}
                        >
                            <CrossedSwordsIcon size={40} />
                            <Typography
                                variant='h3'
                                sx={{
                                    fontSize: {
                                        xs: "1.5rem",
                                        sm: "1.75rem",
                                        md: "2rem",
                                    },
                                    fontWeight: "bold",
                                }}
                            >
                                Combat in 60 Seconds
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                lineHeight: 1.8,
                                mb: 3,
                            }}
                        >
                            Combat is fast and deadly. Each round:
                        </Typography>
                        <Box
                            sx={{
                                ...glassSection,
                                p: 3,
                                mb: 3,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: "bold",
                                    mb: 2,
                                    fontSize: "1.1rem",
                                }}
                            >
                                Turn Order
                            </Typography>
                            <Box component='ol' sx={{ pl: 2, m: 0 }}>
                                {[
                                    "Monsters act first",
                                    "GM announces who is in danger",
                                    "Players choose their actions",
                                ].map((step, i) => (
                                    <Typography
                                        component='li'
                                        key={i}
                                        sx={{ mb: 1, lineHeight: 1.6 }}
                                    >
                                        {step}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                        <Typography
                            sx={{
                                fontWeight: "bold",
                                mb: 2,
                                fontSize: "1.1rem",
                            }}
                        >
                            Player Actions
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                {
                                    action: "Attack",
                                    stat: "Attack Stat",
                                    effect: "Deal 1 damage (2 on a crit)",
                                },
                                {
                                    action: "Dodge",
                                    stat: "Agility",
                                    effect: "Avoid attacks, heal 1 HP",
                                },
                                {
                                    action: "Brace",
                                    stat: "Body",
                                    effect: "Block attacks, heal 1 HP (need equipment)",
                                },
                                {
                                    action: "Draw Power",
                                    stat: "Focus",
                                    effect: "Draw a card from your Power deck",
                                },
                                {
                                    action: "Flee",
                                    stat: "Agility",
                                    effect: "Escape combat safely",
                                },
                            ].map((item) => (
                                <Grid item xs={12} sm={6} key={item.action}>
                                    <Box
                                        sx={{
                                            ...glassSection,
                                            p: 2,
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: "bold" }}>
                                            {item.action}
                                        </Typography>
                                        <Typography
                                            variant='caption'
                                            sx={{
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#81c784"
                                                        : "#2e7d32",
                                            }}
                                        >
                                            Roll vs {item.stat}
                                        </Typography>
                                        <Typography variant='body2'>
                                            {item.effect}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Slide>

                {/* Section 4: A Basic Hunt */}
                <Slide>
                    <Box sx={{ ...glassSection, p: { xs: 3, sm: 4 } }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 3,
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.8)"
                                        : "rgba(0, 0, 0, 0.7)",
                            }}
                        >
                            <SkullIcon size={40} />
                            <Typography
                                variant='h3'
                                sx={{
                                    fontSize: {
                                        xs: "1.5rem",
                                        sm: "1.75rem",
                                        md: "2rem",
                                    },
                                    fontWeight: "bold",
                                }}
                            >
                                Your First Hunt
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.1rem" },
                                lineHeight: 1.8,
                                mb: 3,
                            }}
                        >
                            A typical hunt follows this structure. Use this as a
                            template for your first session:
                        </Typography>
                        {[
                            {
                                phase: "1. The Hook",
                                desc: "A desperate villager approaches. Livestock have been disappearing. They offer payment to deal with the threat.",
                            },
                            {
                                phase: "2. Negotiate Pay",
                                desc: "Roll Focus to bargain. Success means good pay and spending money later. Failure means you're working for scraps.",
                            },
                            {
                                phase: "3. Gather Rumors",
                                desc: "Talk to locals. The GM provides 3-4 rumors about the monster—some true, some misleading.",
                            },
                            {
                                phase: "4. Research",
                                desc: "Roll Fate to learn a monster weakness. Success reveals something useful: 'It fears fire' or 'Silver burns it.'",
                            },
                            {
                                phase: "5. Prepare",
                                desc: "Buy supplies based on what you learned. Torches? Silver blades? Healing herbs?",
                            },
                            {
                                phase: "6. Track the Monster",
                                desc: "Roll Fate to find the creature's lair. Failure means it finds you first—ambush!",
                            },
                            {
                                phase: "7. The Fight",
                                desc: "Combat! Use your preparation and tactics. Exploit weaknesses. Don't die.",
                            },
                            {
                                phase: "8. Collect Your Bounty",
                                desc: "Claim your pay, rest up, and level up. Tomorrow brings another hunt.",
                            },
                        ].map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    display: "flex",
                                    gap: 2,
                                    mb: 2,
                                    pb: 2,
                                    borderBottom:
                                        index < 7
                                            ? (theme) =>
                                                  theme.palette.mode === "dark"
                                                      ? "1px solid rgba(255,255,255,0.1)"
                                                      : "1px solid rgba(0,0,0,0.1)"
                                            : "none",
                                }}
                            >
                                <Box
                                    sx={{
                                        minWidth: "32px",
                                        height: "32px",
                                        borderRadius: "50%",
                                        bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255,255,255,0.1)"
                                                : "rgba(0,0,0,0.08)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.9rem",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: "bold" }}>
                                        {item.phase.replace(/^\d+\.\s/, "")}
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            color: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#b0b0b0"
                                                    : "#555",
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {item.desc}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Slide>

                {/* Quick Reference Box */}
                <Slide>
                    <Box sx={{ ...glassSection, p: { xs: 3, sm: 4 } }}>
                        <Typography
                            variant='h4'
                            sx={{
                                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                                fontWeight: "bold",
                                mb: 3,
                                textAlign: "center",
                            }}
                        >
                            Quick Reference
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Box
                                    sx={{
                                        ...glassSection,
                                        p: 2,
                                        height: "100%",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: "bold",
                                            mb: 1,
                                            textAlign: "center",
                                        }}
                                    >
                                        Success
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        sx={{ textAlign: "center" }}
                                    >
                                        Roll ≤ your stat
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box
                                    sx={{
                                        ...glassSection,
                                        p: 2,
                                        height: "100%",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: "bold",
                                            mb: 1,
                                            textAlign: "center",
                                        }}
                                    >
                                        Critical Hit
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        sx={{ textAlign: "center" }}
                                    >
                                        Roll a natural 1
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box
                                    sx={{
                                        ...glassSection,
                                        p: 2,
                                        height: "100%",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: "bold",
                                            mb: 1,
                                            textAlign: "center",
                                        }}
                                    >
                                        Automatic Fail
                                    </Typography>
                                    <Typography
                                        variant='body2'
                                        sx={{ textAlign: "center" }}
                                    >
                                        Roll a 10
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </Slide>

                {/* Call to Action */}
                <Slide>
                    <Box
                        sx={{
                            textAlign: "center",
                            py: { xs: 4, sm: 6 },
                        }}
                    >
                        <Typography
                            variant='h3'
                            sx={{
                                fontSize: {
                                    xs: "1.5rem",
                                    sm: "1.75rem",
                                    md: "2rem",
                                },
                                fontWeight: "bold",
                                mb: 4,
                            }}
                        >
                            Ready to create your hunter?
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                gap: 2,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Button
                                component={Link}
                                to='/character-creation'
                                variant='outlined'
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: "1rem",
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
                                    textTransform: "none",
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
                                Character Creation
                            </Button>
                            <Button
                                component={Link}
                                to='/quick-reference'
                                variant='outlined'
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    fontSize: "1rem",
                                    fontWeight: "bold",
                                    borderRadius: "12px",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "2px solid rgba(255, 255, 255, 0.2)"
                                            : "2px solid rgba(0, 0, 0, 0.15)",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#444",
                                    bgcolor: "transparent",
                                    textTransform: "none",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        border: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "2px solid rgba(255, 255, 255, 0.4)"
                                                : "2px solid rgba(0, 0, 0, 0.3)",
                                        bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255, 255, 255, 0.05)"
                                                : "rgba(0, 0, 0, 0.03)",
                                    },
                                }}
                            >
                                Quick Reference
                            </Button>
                        </Box>
                    </Box>
                </Slide>
            </Box>
        </Container>
    )
}

export default GettingStarted
