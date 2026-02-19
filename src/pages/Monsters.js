import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
    Container,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Grid,
} from "@mui/material"
import GMToolsButton from "../components/GMToolsButton"

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
    const [ref, isInView] = useInView({ threshold: 0.1 })

    return (
        <Box
            ref={ref}
            sx={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? "translateY(0)" : "translateY(40px)",
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
                width: "100%",
            }}
        >
            {children}
        </Box>
    )
}

// Monster card component
const MonsterCard = ({ monster, index }) => {
    return (
        <Slide delay={Math.min(index * 50, 300)}>
            <Link
                to={`/monsters/${monster.Name}`}
                style={{ textDecoration: "none" }}
            >
                <Box
                    sx={{
                        padding: { xs: "16px", sm: "24px" },
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
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        "&:hover": {
                            transform: "translateY(-4px) scale(1.02)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.25)"
                                    : "1px solid rgba(0, 0, 0, 0.2)",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.08)"
                                    : "rgba(0, 0, 0, 0.05)",
                        },
                    }}
                >
                    <Typography
                        variant='h5'
                        sx={{
                            fontWeight: "bold",
                            marginBottom: "12px",
                            color: "text.primary",
                            fontSize: { xs: "1.1rem", sm: "1.25rem" },
                        }}
                    >
                        {monster.Name}
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            flexGrow: 1,
                        }}
                    >
                        <Typography
                            variant='body2'
                            sx={{ opacity: 0.7, color: "text.primary" }}
                        >
                            Attack: {monster.Attack}
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{ opacity: 0.7, color: "text.primary" }}
                        >
                            Damage: {monster.Damage}
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{ opacity: 0.7, color: "text.primary" }}
                        >
                            HP: {monster["Hit Points Multiplier"]}
                        </Typography>
                    </Box>
                    {monster.Immunities && monster.Immunities !== "None" && (
                        <Box
                            sx={{
                                marginTop: "12px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.06)",
                                display: "inline-block",
                                alignSelf: "flex-start",
                            }}
                        >
                            <Typography
                                variant='caption'
                                sx={{ opacity: 0.8, color: "text.primary" }}
                            >
                                Immune: {monster.Immunities}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Link>
        </Slide>
    )
}

const Monsters = () => {
    const [monstersData, setMonstersData] = useState([])
    const [filteredMonsters, setFilteredMonsters] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState("name")
    const [damageTypeFilter, setDamageTypeFilter] = useState("all")

    useEffect(() => {
        const fetchMonstersData = async () => {
            try {
                const response = await fetch("/monsters.json")
                const data = await response.json()
                setMonstersData(data)
                setFilteredMonsters(data)
            } catch (error) {
                console.error("Error fetching monsters data:", error)
            }
        }

        fetchMonstersData()
    }, [])

    useEffect(() => {
        let filtered = monstersData.filter((monster) => {
            const matchesSearch = monster.Name.toLowerCase().includes(
                searchTerm.toLowerCase(),
            )

            let matchesDamageType = true
            if (damageTypeFilter !== "all") {
                matchesDamageType = monster.Immunities === damageTypeFilter
            }

            return matchesSearch && matchesDamageType
        })

        // Sort the filtered monsters
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "name":
                    return a.Name.localeCompare(b.Name)
                case "attack":
                    const getAttackValue = (attack) => {
                        const match = attack.match(/(\d+)/)
                        return match ? parseInt(match[1]) : 0
                    }
                    return getAttackValue(b.Attack) - getAttackValue(a.Attack)
                case "damage":
                    return parseInt(b.Damage) - parseInt(a.Damage)
                case "hitPoints":
                    const getHPValue = (hp) => {
                        const match = hp.match(/(\d+)/)
                        return match ? parseInt(match[1]) : 0
                    }
                    return (
                        getHPValue(b["Hit Points Multiplier"]) -
                        getHPValue(a["Hit Points Multiplier"])
                    )
                default:
                    return a.Name.localeCompare(b.Name)
            }
        })

        setFilteredMonsters(filtered)
    }, [monstersData, searchTerm, sortBy, damageTypeFilter])

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value)
    }

    const handleSortChange = (event) => {
        setSortBy(event.target.value)
    }

    const handleDamageTypeChange = (event) => {
        setDamageTypeFilter(event.target.value)
    }

    return (
        <>
            <Container
                sx={{
                    color: "text.primary",
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
                        minHeight: "40vh",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        marginBottom: { xs: "30px", sm: "40px" },
                    }}
                >
                    <Slide>
                        <Typography
                            variant='h1'
                            sx={{
                                fontSize: {
                                    xs: "2.5rem",
                                    sm: "3.5rem",
                                    md: "4.5rem",
                                },
                                fontWeight: "bold",
                                marginBottom: "16px",
                            }}
                        >
                            🐾 Bestiary
                        </Typography>
                    </Slide>
                    <Slide delay={200}>
                        <Typography
                            variant='h5'
                            sx={{
                                fontSize: { xs: "1rem", sm: "1.25rem" },
                                maxWidth: "600px",
                                lineHeight: 1.6,
                                opacity: 0.8,
                            }}
                        >
                            The creatures that lurk in darkness. Study them
                            well—your life depends on it.
                        </Typography>
                    </Slide>
                </Box>

                {/* Filter Controls */}
                <Slide delay={300}>
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: "1200px",
                            marginBottom: { xs: "30px", sm: "40px" },
                            padding: { xs: "16px", sm: "24px" },
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
                                display: "flex",
                                gap: 2,
                                flexWrap: "wrap",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <TextField
                                label='Search monsters'
                                variant='outlined'
                                size='small'
                                value={searchTerm}
                                onChange={handleSearchChange}
                                sx={{
                                    minWidth: { xs: "100%", sm: 220 },
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                        "& fieldset": {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.15)"
                                                    : "rgba(0, 0, 0, 0.15)",
                                        },
                                        "&:hover fieldset": {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.3)"
                                                    : "rgba(0, 0, 0, 0.3)",
                                        },
                                    },
                                }}
                            />

                            <FormControl
                                size='small'
                                sx={{
                                    minWidth: {
                                        xs: "calc(50% - 8px)",
                                        sm: 160,
                                    },
                                }}
                            >
                                <InputLabel>Sort by</InputLabel>
                                <Select
                                    value={sortBy}
                                    label='Sort by'
                                    onChange={handleSortChange}
                                    sx={{
                                        borderRadius: "12px",
                                        "& fieldset": {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.15)"
                                                    : "rgba(0, 0, 0, 0.15)",
                                        },
                                    }}
                                >
                                    <MenuItem value='name'>Name (A-Z)</MenuItem>
                                    <MenuItem value='attack'>
                                        Attack (High-Low)
                                    </MenuItem>
                                    <MenuItem value='damage'>
                                        Damage (High-Low)
                                    </MenuItem>
                                    <MenuItem value='hitPoints'>
                                        HP (High-Low)
                                    </MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl
                                size='small'
                                sx={{
                                    minWidth: {
                                        xs: "calc(50% - 8px)",
                                        sm: 180,
                                    },
                                }}
                            >
                                <InputLabel>Immunities</InputLabel>
                                <Select
                                    value={damageTypeFilter}
                                    label='Immunities'
                                    onChange={handleDamageTypeChange}
                                    sx={{
                                        borderRadius: "12px",
                                        "& fieldset": {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255, 255, 255, 0.15)"
                                                    : "rgba(0, 0, 0, 0.15)",
                                        },
                                    }}
                                >
                                    <MenuItem value='all'>All</MenuItem>
                                    <MenuItem value='Physical'>
                                        Physical
                                    </MenuItem>
                                    <MenuItem value='Spiritual'>
                                        Spiritual
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Typography
                            variant='body2'
                            sx={{
                                textAlign: "center",
                                marginTop: 2,
                                opacity: 0.6,
                            }}
                        >
                            {filteredMonsters.length} creature
                            {filteredMonsters.length !== 1 ? "s" : ""} found
                        </Typography>
                    </Box>
                </Slide>

                {/* Monster Grid */}
                <Box sx={{ width: "100%", maxWidth: "1200px" }}>
                    <Grid container spacing={3}>
                        {filteredMonsters.map((monster, index) => (
                            <Grid item xs={12} sm={6} md={4} key={monster.Name}>
                                <MonsterCard monster={monster} index={index} />
                            </Grid>
                        ))}
                    </Grid>

                    {filteredMonsters.length === 0 && (
                        <Box
                            sx={{
                                textAlign: "center",
                                padding: "60px 20px",
                                opacity: 0.6,
                            }}
                        >
                            <Typography variant='h5'>
                                No monsters found
                            </Typography>
                            <Typography variant='body1' sx={{ mt: 1 }}>
                                Try adjusting your search or filters
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Container>

            <GMToolsButton />
        </>
    )
}

export default Monsters
