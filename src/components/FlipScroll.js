import React, { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

const FlipScrollItem = ({
    image,
    index,
    isLeft,
    scrollYProgress,
    totalItems,
    mode = "normal",
}) => {
    const direction = isLeft ? -1 : 1
    const position = index / totalItems

    const translateX = useTransform(
        scrollYProgress,
        [0, position, 1],
        [-index * 400 * direction, 0, (totalItems - index) * 400 * direction],
    )

    const normalRotateY = useTransform(
        scrollYProgress,
        [
            0,
            position - 0.04,
            position - 0.015,
            position + 0.015,
            position + 0.04,
            1,
        ],
        [180, 180, 0, 0, -180, -180],
    )
    const alternateRotateY = useTransform(
        scrollYProgress,
        [0, position, 1],
        [index * -180 * direction, 0, (totalItems - index) * 180 * direction],
    )

    return (
        <motion.div
            style={{
                translateX,
                perspective: 1000,
                transformStyle: "preserve-3d",
                position: "absolute",
                width: "100%",
                height: "500px",
                borderRadius: "24px",
            }}
        >
            <motion.div
                style={{
                    rotateY:
                        mode === "normal" ? normalRotateY : alternateRotateY,
                    transformStyle: "preserve-3d",
                    width: "100%",
                    height: "100%",
                }}
            >
                <img
                    src={image}
                    alt=''
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "translateZ(1px)",
                        objectFit: "cover",
                        width: "100%",
                        height: "100%",
                        borderRadius: "24px",
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                />
            </motion.div>
        </motion.div>
    )
}

const FlipScroll = ({ items, mode = "normal" }) => {
    const ref = useRef(null)

    const { scrollYProgress } = useScroll({
        container: ref,
        offset: ["start start", "end end"],
    })

    const spacerHeight = Math.max((items.length - 3) * 500, 500)

    return (
        <div
            ref={ref}
            style={{
                height: "100%",
                width: "100%",
                overflowY: "auto",
                position: "relative",
                minHeight: "400px",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: spacerHeight,
                }}
            />
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    height: "100%",
                    width: "100%",
                    position: "sticky",
                    top: 0,
                    left: 0,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        justifyContent: "center",
                        width: "100%",
                        alignItems: "center",
                        position: "relative",
                    }}
                >
                    {items.map((item, index) => (
                        <FlipScrollItem
                            key={`flip-item-${index}`}
                            image={item.image}
                            index={index}
                            isLeft={true}
                            scrollYProgress={scrollYProgress}
                            totalItems={items.length}
                            mode={mode}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default FlipScroll
