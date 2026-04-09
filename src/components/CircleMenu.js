import React, { useMemo, useState } from "react"
import { Box, useTheme } from "@mui/material"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { useNavigate } from "react-router-dom"
import MenuIcon from "@mui/icons-material/Menu"
import CloseIcon from "@mui/icons-material/Close"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import HandymanIcon from "@mui/icons-material/Handyman"
import ShieldIcon from "@mui/icons-material/Shield"
import BedtimeIcon from "@mui/icons-material/Bedtime"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import BoltIcon from "@mui/icons-material/Bolt"
import GavelIcon from "@mui/icons-material/Gavel"

// ── Skull icon — uses the public/skull_vector.svg asset ─────────────────────
const SkullIcon = ({ size = 28 }) => (
    <img
        src='/skull_vector.svg'
        alt=''
        aria-hidden='true'
        width={size}
        height={size}
        style={{
            display: "block",
            // The SVG is near-black (#231f20); invert to white for the button
            filter: "brightness(0) invert(1)",
            // Aspect ratio of source viewBox (228 × 251) — give it a touch of height
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
        }}
    />
)

// ── Single expanding white pulse ring — one pulse every 8 seconds ────────────
// duration 1.5s (expand + fade) + repeatDelay 6.5s = 8s total cycle
const PulseRing = ({ delay = 0, size }) => (
    <motion.div
        style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            border: "2px solid rgba(255, 255, 255, 0.6)",
            boxShadow:
                "0 0 10px rgba(255,255,255,0.4), 0 0 28px rgba(255,255,255,0.18)",
            pointerEvents: "none",
        }}
        animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
        transition={{
            duration: 1.5,
            delay,
            repeat: Infinity,
            repeatDelay: 6.5,
            ease: "easeOut",
        }}
    />
)

const ITEM_SIZE = 68
const CONTAINER_SIZE = 500

const CONSTANTS = {
    itemSize: ITEM_SIZE,
    containerSize: CONTAINER_SIZE,
    openStagger: 0.03,
    closeStagger: 0.06,
}

const pointOnCircle = (i, n, r, cx = 0, cy = 0) => {
    const theta = (2 * Math.PI * i) / n - Math.PI / 2
    const x = cx + r * Math.cos(theta)
    const y = cy + r * Math.sin(theta)
    return { x, y }
}

const defaultIcon = (path) => {
    if (path.includes("about")) return <InfoOutlinedIcon />
    if (path.includes("getting-started")) return <PlayArrowIcon />
    if (path.includes("character-creation")) return <PersonAddIcon />
    if (path.includes("player-tools")) return <HandymanIcon />
    if (path.includes("combat")) return <ShieldIcon />
    if (path.includes("death")) return <BedtimeIcon />
    if (path.includes("progression")) return <TrendingUpIcon />
    if (path.includes("powers")) return <BoltIcon />
    if (path.includes("gm-tools")) return <GavelIcon />
    return <MenuIcon />
}

const CircleMenu = ({ items = [], size = CONSTANTS.containerSize }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const navigate = useNavigate()
    const theme = useTheme()
    const isDark = theme.palette.mode === "dark"
    const jitterControls = useAnimation()

    const enhancedItems = useMemo(() => {
        return items.map((item) => ({
            ...item,
            icon: item.icon ?? defaultIcon(item.href),
        }))
    }, [items])

    const radius = size / 2 - CONSTANTS.itemSize * 0.8
    const centerBtnSize = CONSTANTS.itemSize * 1.4

    const onCenterEnter = async () => {
        if (isOpen) return
        // Rapid jitter + scale up on hover
        await jitterControls.start({
            x: [0, -6, 6, -6, 6, -5, 5, -4, 4, -3, 3, -1, 1, 0],
            scale: 1.3,
            transition: {
                x: { duration: 0.45, ease: "linear" },
                scale: { duration: 0.1 },
            },
        })
        // Hold at enlarged scale while still hovering
        jitterControls.start({ x: 0, scale: 1.28 })
    }

    const onCenterLeave = () => {
        jitterControls.stop()
        jitterControls.start({
            x: 0,
            scale: 1,
            transition: { duration: 0.2, ease: "easeOut" },
        })
    }

    return (
        <Box
            sx={{
                width: size,
                height: size,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
            }}
        >
            {enhancedItems.map((item, index) => {
                const { x, y } = pointOnCircle(
                    index,
                    enhancedItems.length,
                    radius,
                )
                const isHovered = hoveredIndex === index
                return (
                    <motion.button
                        key={item.href}
                        type='button'
                        onClick={() => {
                            setIsOpen(false)
                            navigate(item.href)
                        }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        animate={{
                            x: isOpen ? x : 0,
                            y: isOpen ? y : 0,
                            opacity: isOpen ? 1 : 0,
                            scale: isOpen ? 1 : 0.4,
                            pointerEvents: isOpen ? "auto" : "none",
                        }}
                        whileHover={{ scale: 1.18 }}
                        transition={{
                            delay: isOpen
                                ? index * CONSTANTS.openStagger
                                : index * CONSTANTS.closeStagger,
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                        }}
                        style={{
                            position: "absolute",
                            zIndex: isHovered ? 20 : 1,
                            width: CONSTANTS.itemSize,
                            height: CONSTANTS.itemSize,
                            borderRadius: "999px",
                            border: isDark
                                ? "1.5px solid rgba(255,255,255,0.25)"
                                : "1.5px solid rgba(0,0,0,0.15)",
                            background: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.07)",
                            boxShadow: isDark
                                ? "0 4px 24px rgba(0,0,0,0.5)"
                                : "0 4px 24px rgba(0,0,0,0.12)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: isDark ? "#fff" : "#121212",
                            backdropFilter: "blur(12px)",
                            overflow: "visible",
                        }}
                    >
                        {item.icon}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.span
                                    key='label'
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: "absolute",
                                        top: "calc(100% + 6px)",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        whiteSpace: "nowrap",
                                        fontSize: "0.72rem",
                                        fontWeight: 600,
                                        fontFamily: '"Cinzel", serif',
                                        color: isDark ? "#fff" : "#111",
                                        background: isDark
                                            ? "rgba(0,0,0,0.65)"
                                            : "rgba(255,255,255,0.8)",
                                        backdropFilter: "blur(8px)",
                                        borderRadius: 4,
                                        padding: "2px 8px",
                                        pointerEvents: "none",
                                    }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                )
            })}

            {/* Pulse rings — white glowing halos that float outward while menu is closed */}
            <motion.div
                animate={{ opacity: isOpen ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: "absolute",
                    zIndex: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}
            >
                <PulseRing size={centerBtnSize} delay={0} />
            </motion.div>

            {/* Central toggle button */}
            <motion.button
                type='button'
                onClick={() => {
                    const opening = !isOpen
                    setIsOpen(opening)
                    if (opening) {
                        // Stop jitter when opening menu
                        jitterControls.stop()
                        jitterControls.start({
                            x: 0,
                            scale: 1,
                            transition: { duration: 0.12 },
                        })
                    }
                }}
                animate={jitterControls}
                whileTap={{ scale: 0.94 }}
                onMouseEnter={onCenterEnter}
                onMouseLeave={onCenterLeave}
                style={{
                    position: "relative",
                    zIndex: 10,
                    width: centerBtnSize,
                    height: centerBtnSize,
                    borderRadius: "999px",
                    background: isDark
                        ? "rgba(139,0,0,0.55)"
                        : "rgba(139,0,0,0.75)",
                    border: "2px solid rgba(255,80,80,0.35)",
                    boxShadow: isOpen
                        ? "0 0 32px rgba(180,0,0,0.6)"
                        : "0 0 16px rgba(180,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    backdropFilter: "blur(12px)",
                    transition: "box-shadow 0.3s ease",
                }}
            >
                <AnimatePresence mode='popLayout'>
                    {isOpen ? (
                        <motion.span
                            key='close'
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.18 }}
                        >
                            <CloseIcon fontSize='medium' />
                        </motion.span>
                    ) : (
                        <motion.span
                            key='skull'
                            initial={{ opacity: 0, rotate: 90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: -90 }}
                            transition={{ duration: 0.18 }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {/* Skull with idle breathing pulse */}
                            <motion.span
                                animate={{
                                    scale: [1, 1.12, 1],
                                    filter: [
                                        "drop-shadow(0 0 3px rgba(255,220,220,0.4))",
                                        "drop-shadow(0 0 11px rgba(255,200,200,0.95))",
                                        "drop-shadow(0 0 3px rgba(255,220,220,0.4))",
                                    ],
                                }}
                                transition={{
                                    duration: 2.4,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 0,
                                }}
                            >
                                <SkullIcon size={26} />
                            </motion.span>
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        </Box>
    )
}

export default CircleMenu
