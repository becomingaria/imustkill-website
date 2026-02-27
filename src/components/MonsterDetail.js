import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Button,
    Chip,
    Box,
    TextField,
    Card,
    CardContent,
    Divider,
} from "@mui/material"
import GMToolsButton from "./GMToolsButton"
import { fetchMonsters } from "../utils/cardsClient"

const MonsterDetail = () => {
    const [monstersData, setMonstersData] = useState([])
    const [playerCount, setPlayerCount] = useState(3) // Default to 3 players

    useEffect(() => {
        const loadMonsters = async () => {
            try {
                const monsters = await fetchMonsters()
                // Normalize data - API returns 'name' field, static JSON uses 'Name'
                const normalizedMonsters = monsters.map((m) => ({
                    ...m,
                    Name: m.Name || m.name,
                }))
                setMonstersData(normalizedMonsters)
            } catch (error) {
                console.error("Error fetching monsters data:", error)
            }
        }

        loadMonsters()
    }, [])

    const { name } = useParams()
    const monster = monstersData.find((monster) => monster.Name === name)

    // Helper function to determine if a monster is incorporeal
    const isIncorporeal = (monster) => {
        if (!monster) return false

        // Check if description mentions incorporeal
        const descriptionCheck =
            monster.Description?.toLowerCase().includes("incorporeal")

        // Check if immunities include Physical (common for incorporeal creatures)
        const immunityCheck =
            monster.Immunities?.toLowerCase().includes("physical")

        // Check if buffs mention non-magical weapons (another incorporeal indicator)
        const buffsCheck = monster.Buffs?.toLowerCase().includes(
            "non-magical weapons",
        )

        return descriptionCheck || (immunityCheck && buffsCheck)
    }

    // Helper function to calculate hit points based on multiplier and player count
    const calculateHitPoints = (hpMultiplier, players) => {
        if (!hpMultiplier || !players) return 0

        const multiplierStr = hpMultiplier.toString()

        // Handle formats like "0+1", "2+3", or just "5"
        if (multiplierStr.includes("+")) {
            const [multiplier, addition] = multiplierStr
                .split("+")
                .map((num) => parseInt(num.trim()))
            return players * multiplier + addition
        } else {
            // Simple multiplier like "5"
            return players * parseInt(multiplierStr)
        }
    }

    // Helper function to calculate bloodied threshold
    const calculateBloodied = (bloodiedValue, players) => {
        if (!bloodiedValue || !players) return 0
        return parseInt(bloodiedValue) * players
    }

    if (!monster) {
        return (
            <Container
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Typography
                    variant='h2'
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#e0e0e0"
                                : "#121212",
                    }}
                >
                    Monster not found
                </Typography>
                <GMToolsButton />
            </Container>
        )
    }

    return (
        <Container
            sx={{
                color: (theme) =>
                    theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                padding: "20px",
                paddingBottom: "100px", // Adjust this value as needed
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minHeight: "100vh",
            }}
        >
            <Typography
                variant='h3'
                gutterBottom
                sx={{
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    marginBottom: "20px",
                }}
            >
                {monster.Name}
            </Typography>

            {/* Incorporeal Tag */}
            {isIncorporeal(monster) && (
                <Box sx={{ marginBottom: "20px" }}>
                    <Chip
                        label='Incorporeal'
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#4a148c"
                                    : "#7b1fa2",
                            color: "#ffffff",
                            fontWeight: "bold",
                            fontSize: "0.875rem",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                        }}
                    />
                </Box>
            )}

            {/* Hit Points Calculator */}
            <Card
                sx={{
                    bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#2a2a2a" : "#f8f9fa",
                    marginBottom: "20px",
                    width: "100%",
                    maxWidth: "800px",
                    border: (theme) =>
                        theme.palette.mode === "dark"
                            ? "1px solid #444"
                            : "1px solid #ddd",
                }}
            >
                <CardContent>
                    <Typography
                        variant='h6'
                        sx={{
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            marginBottom: "15px",
                            fontWeight: "bold",
                        }}
                    >
                        Combat Calculator
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            marginBottom: "15px",
                        }}
                    >
                        <TextField
                            label='Number of Players'
                            type='number'
                            value={playerCount}
                            onChange={(e) =>
                                setPlayerCount(
                                    Math.max(1, parseInt(e.target.value) || 1),
                                )
                            }
                            inputProps={{ min: 1, max: 10 }}
                            size='small'
                            sx={{
                                width: "150px",
                                "& .MuiOutlinedInput-root": {
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#121212",
                                },
                                "& .MuiInputLabel-root": {
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#121212",
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#555"
                                            : "#ccc",
                                },
                            }}
                        />
                    </Box>

                    <Divider
                        sx={{
                            marginY: "10px",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "#555" : "#ddd",
                        }}
                    />

                    <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Box>
                            <Typography
                                variant='subtitle2'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#666",
                                    fontWeight: "bold",
                                }}
                            >
                                Hit Points
                            </Typography>
                            <Typography
                                variant='h5'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#4caf50"
                                            : "#2e7d32",
                                    fontWeight: "bold",
                                }}
                            >
                                {calculateHitPoints(
                                    monster["Hit Points Multiplier"],
                                    playerCount,
                                )}
                            </Typography>
                            <Typography
                                variant='caption'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#888"
                                            : "#999",
                                }}
                            >
                                Formula: {monster["Hit Points Multiplier"]}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                variant='subtitle2'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#b0b0b0"
                                            : "#666",
                                    fontWeight: "bold",
                                }}
                            >
                                Bloodied Threshold
                            </Typography>
                            <Typography
                                variant='h5'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#ff5722"
                                            : "#d32f2f",
                                    fontWeight: "bold",
                                }}
                            >
                                {calculateBloodied(
                                    monster.Bloodied,
                                    playerCount,
                                )}
                            </Typography>
                            <Typography
                                variant='caption'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#888"
                                            : "#999",
                                }}
                            >
                                {monster.Bloodied} × {playerCount} players
                            </Typography>
                        </Box>
                    </Box>

                    <Typography
                        variant='caption'
                        sx={{
                            display: "block",
                            marginTop: "15px",
                            color: (theme) =>
                                theme.palette.mode === "dark" ? "#888" : "#999",
                            fontStyle: "italic",
                        }}
                    >
                        When the monster drops below the bloodied threshold, it
                        will attempt to flee or negotiate.
                    </Typography>
                </CardContent>
            </Card>

            <Paper
                sx={{
                    bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#1f1f1f" : "#f5f5f5",
                    padding: "20px",
                    width: "100%",
                    maxWidth: "800px",
                    marginBottom: "20px",
                    border: (theme) =>
                        theme.palette.mode === "dark"
                            ? "none"
                            : "1px solid #ccc",
                }}
            >
                <TableContainer
                    component={Paper}
                    sx={{
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "#2a2a2a"
                                : "#ffffff",
                        marginBottom: "20px",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid #444"
                                : "1px solid #ccc",
                    }}
                >
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Description
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "pre-line" }}>
                                    {monster.Description}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Attack
                                </TableCell>
                                <TableCell>{monster.Attack}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Damage
                                </TableCell>
                                <TableCell>{monster.Damage}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Hit Points Multiplier
                                </TableCell>
                                <TableCell>
                                    {monster["Hit Points Multiplier"]}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Bloodied
                                </TableCell>
                                <TableCell>{monster.Bloodied}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Buffs
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "pre-line" }}>
                                    {monster.Buffs}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Crit
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "pre-line" }}>
                                    {monster["Crit"]}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Immunities
                                </TableCell>
                                <TableCell>{monster.Immunities}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Body
                                </TableCell>
                                <TableCell>{monster.Body}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Agility
                                </TableCell>
                                <TableCell>{monster.Agility}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Focus
                                </TableCell>
                                <TableCell>{monster.Focus}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Fate
                                </TableCell>
                                <TableCell>{monster.Fate}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: "bold",
                                        borderRight: "1px solid #ddd",
                                    }}
                                >
                                    Insight
                                </TableCell>
                                <TableCell>{monster.Insight}</TableCell>
                            </TableRow>
                            {/* Only show Guise if monster has insight requirement and a guise */}
                            {monster.Insight !== "0" && monster.Guise && (
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            fontWeight: "bold",
                                            borderRight: "1px solid #ddd",
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#2c2c2c"
                                                    : "#f0f0f0",
                                        }}
                                    >
                                        Guise
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            whiteSpace: "pre-line",
                                            fontStyle: "italic",
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#2c2c2c"
                                                    : "#f0f0f0",
                                        }}
                                    >
                                        {monster.Guise}
                                    </TableCell>
                                </TableRow>
                            )}
                            {monster["Special Weaknesses"] && (
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            fontWeight: "bold",
                                            borderRight: "1px solid #ddd",
                                            verticalAlign: "top",
                                        }}
                                    >
                                        Special Weaknesses
                                    </TableCell>
                                    <TableCell>
                                        <ul
                                            style={{
                                                margin: 0,
                                                paddingLeft: "20px",
                                            }}
                                        >
                                            {monster["Special Weaknesses"].map(
                                                (weakness, index) => (
                                                    <li
                                                        key={index}
                                                        style={{
                                                            marginBottom: "8px",
                                                        }}
                                                    >
                                                        {weakness}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Button
                    component={Link}
                    to='/monsters'
                    variant='contained'
                    sx={{
                        bgcolor: "#333",
                        color: "#e0e0e0",
                        border: "1px solid #e0e0e0",
                        fontWeight: "bold",
                        marginTop: "20px",
                        "&:hover": {
                            bgcolor: "#555",
                        },
                    }}
                >
                    ← Back to Monsters
                </Button>
            </Paper>
            <GMToolsButton />
        </Container>
    )
}

export default MonsterDetail
