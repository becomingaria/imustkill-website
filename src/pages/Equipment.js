import React, { useState, useEffect } from "react"
import {
    Container,
    Typography,
    Paper,
    Box,
    Chip,
    Tabs,
    Tab,
    Divider,
} from "@mui/material"
import PlayerToolsButton from "../components/PlayerToolsButton"

const SUBCATEGORIES = ["Weapon", "Protection", "Control", "Denial"]
const TIERS = ["Low Pay", "High Pay"]

const subcategoryColors = {
    Weapon: "#e57373",
    Protection: "#64b5f6",
    Control: "#ffb74d",
    Denial: "#81c784",
}

const tierColors = {
    "Low Pay": "#9e9e9e",
    "High Pay": "#ffd54f",
}

const Equipment = () => {
    const [equipment, setEquipment] = useState([])
    const [system, setSystem] = useState(null)
    const [selectedTab, setSelectedTab] = useState(0)

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const response = await fetch("/equipment.json")
                const data = await response.json()
                setEquipment(data.equipment)
                setSystem(data.equipmentSystem)
            } catch (error) {
                console.error("Error fetching equipment data:", error)
            }
        }

        fetchEquipment()
    }, [])

    const currentSubcategory = SUBCATEGORIES[selectedTab]
    const filteredItems = equipment.filter(
        (item) => item.subcategory === currentSubcategory,
    )
    const lowItems = filteredItems.filter((item) => item.tier === "Low Pay")
    const highItems = filteredItems.filter((item) => item.tier === "High Pay")

    const subcategoryInfo = system?.subcategories?.find(
        (s) => s.name === currentSubcategory,
    )

    const renderItem = (item) => (
        <Paper
            key={item.name}
            sx={{
                bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#1a1a1a" : "#fafafa",
                border: (theme) =>
                    `1px solid ${theme.palette.mode === "dark" ? "#333" : "#ddd"}`,
                padding: "16px",
                marginBottom: "12px",
                borderLeft: `4px solid ${subcategoryColors[item.subcategory] || "#666"}`,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                }}
            >
                <Typography
                    variant='h6'
                    sx={{
                        fontFamily: "'Cinzel', serif",
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                    }}
                >
                    {item.name}
                </Typography>
                <Chip
                    label={item.tier}
                    size='small'
                    sx={{
                        bgcolor: tierColors[item.tier],
                        color: item.tier === "High Pay" ? "#121212" : "#fff",
                        fontWeight: "bold",
                        fontSize: "0.7rem",
                    }}
                />
            </Box>

            <Typography
                variant='body2'
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#bbb" : "#444",
                    mb: 1,
                    fontStyle: "italic",
                }}
            >
                {item.description}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                {item.damageType && (
                    <Chip
                        label={item.damageType}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: "0.7rem" }}
                    />
                )}
                {item.range && (
                    <Chip
                        label={item.range}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: "0.7rem" }}
                    />
                )}
                {item.protects && (
                    <Chip
                        label={`Protects: ${item.protects}`}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: "0.7rem" }}
                    />
                )}
                {item.uses && (
                    <Chip
                        label={`${item.uses} use${item.uses > 1 ? "s" : ""}`}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: "0.7rem" }}
                    />
                )}
            </Box>

            {item.trick && (
                <Paper
                    sx={{
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#2a1a00"
                                : "#fff8e1",
                        border: "1px solid #ffd54f",
                        padding: "8px 12px",
                        mt: 1,
                    }}
                >
                    <Typography
                        variant='caption'
                        sx={{
                            color: "#ffd54f",
                            fontWeight: "bold",
                            display: "block",
                            mb: 0.5,
                        }}
                    >
                        TRICK
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#333",
                        }}
                    >
                        {item.trick}
                    </Typography>
                </Paper>
            )}
        </Paper>
    )

    return (
        <>
            <Container
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: "20px",
                    display: "flex",
                    paddingBottom: "100px",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Typography
                    variant='h1'
                    gutterBottom
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                    }}
                >
                    Hunter's Arsenal
                </Typography>

                {system && (
                    <Paper
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#1f1f1f"
                                    : "#f5f5f5",
                            padding: "20px",
                            width: "100%",
                            maxWidth: "800px",
                            marginBottom: "24px",
                        }}
                    >
                        <Typography
                            variant='body1'
                            sx={{
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#bbb"
                                        : "#444",
                                mb: 2,
                            }}
                        >
                            {system.description}
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Chip
                                label='Max 5 items'
                                size='small'
                                variant='outlined'
                            />
                            <Chip
                                label='Start: 1 weapon + 4 items'
                                size='small'
                                variant='outlined'
                            />
                        </Box>
                    </Paper>
                )}

                <Box sx={{ width: "100%", maxWidth: "800px" }}>
                    <Tabs
                        value={selectedTab}
                        onChange={(_, newVal) => setSelectedTab(newVal)}
                        variant='fullWidth'
                        sx={{
                            mb: 3,
                            "& .MuiTab-root": {
                                fontFamily: "'Cinzel', serif",
                                fontWeight: "bold",
                            },
                        }}
                    >
                        {SUBCATEGORIES.map((cat) => (
                            <Tab
                                key={cat}
                                label={cat}
                                sx={{
                                    color: subcategoryColors[cat],
                                    "&.Mui-selected": {
                                        color: subcategoryColors[cat],
                                    },
                                }}
                            />
                        ))}
                    </Tabs>

                    {subcategoryInfo && (
                        <Typography
                            variant='body2'
                            sx={{
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#999"
                                        : "#666",
                                mb: 3,
                                textAlign: "center",
                                fontStyle: "italic",
                            }}
                        >
                            {subcategoryInfo.description}
                        </Typography>
                    )}

                    {lowItems.length > 0 && (
                        <>
                            <Typography
                                variant='h5'
                                sx={{
                                    fontFamily: "'Cinzel', serif",
                                    mb: 2,
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#9e9e9e"
                                            : "#666",
                                }}
                            >
                                Low Pay
                            </Typography>
                            {lowItems.map(renderItem)}
                        </>
                    )}

                    {highItems.length > 0 && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography
                                variant='h5'
                                sx={{
                                    fontFamily: "'Cinzel', serif",
                                    mb: 2,
                                    color: "#ffd54f",
                                }}
                            >
                                High Pay
                                {currentSubcategory === "Weapon" &&
                                    " — Trick Weapons"}
                            </Typography>
                            {highItems.map(renderItem)}
                        </>
                    )}
                </Box>
            </Container>

            <PlayerToolsButton />
        </>
    )
}

export default Equipment
