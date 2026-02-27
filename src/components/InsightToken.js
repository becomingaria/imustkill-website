import React from "react"
import { Box } from "@mui/material"
import { motion } from "framer-motion"

// Flame SVG component
const FlameIcon = ({ size }) => (
    <svg
        width={size * 0.6}
        height={size * 0.7}
        viewBox='0 0 24 32'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
    >
        {/* Outer flame - orange/red gradient */}
        <defs>
            <linearGradient
                id='flameGradient'
                x1='0%'
                y1='100%'
                x2='0%'
                y2='0%'
            >
                <stop offset='0%' stopColor='#FF4500' />
                <stop offset='50%' stopColor='#FF6600' />
                <stop offset='100%' stopColor='#FFD700' />
            </linearGradient>
            <linearGradient
                id='innerFlameGradient'
                x1='0%'
                y1='100%'
                x2='0%'
                y2='0%'
            >
                <stop offset='0%' stopColor='#FFD700' />
                <stop offset='100%' stopColor='#FFFFFF' />
            </linearGradient>
        </defs>
        {/* Main flame shape */}
        <path
            d='M12 0C12 0 4 8 4 16C4 22 7.5 28 12 32C16.5 28 20 22 20 16C20 8 12 0 12 0Z'
            fill='url(#flameGradient)'
        />
        {/* Inner bright core */}
        <path
            d='M12 10C12 10 8 14 8 18C8 22 9.5 26 12 28C14.5 26 16 22 16 18C16 14 12 10 12 10Z'
            fill='url(#innerFlameGradient)'
        />
    </svg>
)

const InsightToken = ({
    id,
    isFlipped,
    onFlip,
    size = 80,
    isBurned = false,
    isDeathMode = false,
}) => {
    const handleClick = () => {
        onFlip(id)
    }

    // If burned, show burned state with flame icon
    if (isBurned) {
        return (
            <Box
                onClick={handleClick}
                sx={{
                    position: "relative",
                    width: size,
                    height: size,
                    margin: 1,
                    cursor: "pointer",
                }}
            >
                {/* Pulsing background circle with flame */}
                <motion.div
                    animate={{
                        scale: [1, 1.02, 1],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        backgroundColor: "#1a1a1a",
                        border: "3px solid #FF6600",
                        boxShadow:
                            "0 0 25px rgba(255, 102, 0, 0.6), 0 0 50px rgba(255, 68, 0, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <FlameIcon size={size} />
                </motion.div>
                {/* Static "BURNED" text overlay */}
                <span
                    style={{
                        position: "absolute",
                        bottom: size * 0.15,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        fontSize: size * 0.12,
                        fontWeight: "bold",
                        color: "#FF6600",
                        fontFamily: '"Cinzel", serif',
                        letterSpacing: "1px",
                        pointerEvents: "none",
                        textShadow:
                            "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                    }}
                >
                    BURNED
                </span>
            </Box>
        )
    }

    // In death mode (but not burned), show current flip state statically without flip animation
    if (isDeathMode) {
        const tokenImage = isFlipped
            ? "/insight_token_back.png"
            : "/insight_token_front.png"
        const tokenAlt = isFlipped
            ? "Insight Token Back"
            : "Insight Token Front"
        return (
            <Box
                sx={{
                    perspective: "1000px",
                    width: size,
                    height: size,
                    margin: 1,
                }}
            >
                <Box
                    onClick={handleClick}
                    sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        overflow: "hidden",
                        cursor: "pointer",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "2px solid #ffffff"
                                : "2px solid #000000",
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 4px 8px rgba(0, 0, 0, 0.5)"
                                : "0 4px 8px rgba(0, 0, 0, 0.25)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                            transform: "scale(1.05)",
                            boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "0 6px 12px rgba(0, 0, 0, 0.7)"
                                    : "0 6px 12px rgba(0, 0, 0, 0.35)",
                        },
                    }}
                >
                    <img
                        src={tokenImage}
                        alt={tokenAlt}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                </Box>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                perspective: "1000px",
                width: size,
                height: size,
                margin: 1,
            }}
        >
            <motion.div
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    transformStyle: "preserve-3d",
                    cursor: "pointer",
                }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                onClick={handleClick}
            >
                {/* Front side */}
                <Box
                    sx={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backfaceVisibility: "hidden",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "2px solid #ffffff"
                                : "2px solid #000000",
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 4px 8px rgba(0, 0, 0, 0.5)"
                                : "0 4px 8px rgba(0, 0, 0, 0.25)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                            transform: "scale(1.05)",
                            boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "0 6px 12px rgba(0, 0, 0, 0.7)"
                                    : "0 6px 12px rgba(0, 0, 0, 0.35)",
                        },
                    }}
                >
                    <img
                        src='/insight_token_front.png'
                        alt='Insight Token Front'
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                </Box>

                {/* Back side */}
                <Box
                    sx={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "2px solid #ffffff"
                                : "2px solid #000000",
                        boxShadow: (theme) =>
                            theme.palette.mode === "dark"
                                ? "0 4px 8px rgba(0, 0, 0, 0.5)"
                                : "0 4px 8px rgba(0, 0, 0, 0.25)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                            transform: "rotateY(180deg) scale(1.05)",
                            boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "0 6px 12px rgba(0, 0, 0, 0.7)"
                                    : "0 6px 12px rgba(0, 0, 0, 0.35)",
                        },
                    }}
                >
                    <img
                        src='/insight_token_back.png'
                        alt='Insight Token Back'
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                </Box>
            </motion.div>
        </Box>
    )
}

export default InsightToken
