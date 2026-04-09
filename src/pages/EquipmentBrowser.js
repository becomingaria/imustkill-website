import React, { useState, useEffect, useRef } from "react"
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
    Chip,
} from "@mui/material"
import PlayerToolsButton from "../components/PlayerToolsButton"
import EnhancedKeywordLinker from "../components/RulesSearch/EnhancedKeywordLinker"

const SUBCATEGORIES = ["All", "Weapon", "Protection", "Control", "Denial"]
const TIERS = ["All", "Low Pay", "High Pay"]
const TIER_ORDER = ["Low Pay", "High Pay"]

const getGroupedEquipment = (items) => {
    const groups = {}
    TIER_ORDER.forEach((tier) => {
        const tierItems = items.filter((i) => i.tier === tier)
        if (tierItems.length === 0) return
        groups[tier] = {}
        const subcats = [...new Set(tierItems.map((i) => i.subcategory))].sort()
        subcats.forEach((subcat) => {
            const subcatItems = tierItems
                .filter((i) => i.subcategory === subcat)
                .sort((a, b) => a.name.localeCompare(b.name))
            groups[tier][subcat] = subcatItems
        })
    })
    return groups
}

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

// Equipment card component
const EquipmentCard = ({ item, index }) => {
    const catColor = subcategoryColors[item.subcategory] || "#666"

    return (
        <Slide delay={Math.min(index * 50, 300)}>
            <Box
                sx={{
                    padding: { xs: "16px", sm: "20px" },
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
                    borderLeft: `4px solid ${catColor}`,
                    transition: "all 0.3s ease",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                        transform: "translateY(-4px) scale(1.02)",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "1px solid rgba(255, 255, 255, 0.25)"
                                : "1px solid rgba(0, 0, 0, 0.2)",
                        borderLeft: `4px solid ${catColor}`,
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.08)"
                                : "rgba(0, 0, 0, 0.05)",
                    },
                }}
            >
                {/* Header: Name + Tier */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                        gap: 1,
                    }}
                >
                    <Typography
                        variant='h6'
                        sx={{
                            fontWeight: "bold",
                            color: "text.primary",
                            fontSize: { xs: "1rem", sm: "1.15rem" },
                            lineHeight: 1.3,
                        }}
                    >
                        {item.name}
                    </Typography>
                    <Chip
                        label={item.tier}
                        size='small'
                        sx={{
                            bgcolor: tierColors[item.tier],
                            color:
                                item.tier === "High Pay" ? "#121212" : "#fff",
                            fontWeight: "bold",
                            fontSize: "0.65rem",
                            flexShrink: 0,
                        }}
                    />
                </Box>

                {/* Subcategory badge */}
                <Chip
                    label={item.subcategory}
                    size='small'
                    sx={{
                        bgcolor: `${catColor}22`,
                        color: catColor,
                        border: `1px solid ${catColor}44`,
                        fontWeight: "bold",
                        fontSize: "0.65rem",
                        alignSelf: "flex-start",
                        mb: 1.5,
                    }}
                />

                {/* Description */}
                <Typography
                    variant='body2'
                    sx={{
                        opacity: 0.8,
                        color: "text.primary",
                        mb: 1.5,
                        flexGrow: 1,
                        fontStyle: "italic",
                        lineHeight: 1.6,
                        fontSize: { xs: "0.8rem", sm: "0.875rem" },
                    }}
                >
                    <EnhancedKeywordLinker referencesOnly={true}>
                        {item.description}
                    </EnhancedKeywordLinker>
                </Typography>

                {/* Property chips */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 0.75,
                        flexWrap: "wrap",
                        mb: item.trick ? 1.5 : 0,
                    }}
                >
                    {item.damageType && (
                        <Chip
                            label={item.damageType}
                            size='small'
                            variant='outlined'
                            sx={{
                                fontSize: "0.7rem",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.2)",
                            }}
                        />
                    )}
                    {item.range && (
                        <Chip
                            label={item.range}
                            size='small'
                            variant='outlined'
                            sx={{
                                fontSize: "0.7rem",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.2)",
                            }}
                        />
                    )}
                    {item.protects && (
                        <Chip
                            label={`Protects: ${item.protects}`}
                            size='small'
                            variant='outlined'
                            sx={{
                                fontSize: "0.7rem",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.2)",
                            }}
                        />
                    )}
                    {item.uses && (
                        <Chip
                            label={`${item.uses} use${item.uses > 1 ? "s" : ""}`}
                            size='small'
                            variant='outlined'
                            sx={{
                                fontSize: "0.7rem",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.2)",
                            }}
                        />
                    )}
                </Box>

                {/* Trick weapon effect */}
                {item.trick && (
                    <Box
                        sx={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 213, 79, 0.08)"
                                    : "rgba(255, 213, 79, 0.12)",
                            border: "1px solid rgba(255, 213, 79, 0.3)",
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: "#ffd54f",
                                fontWeight: "bold",
                                display: "block",
                                mb: 0.5,
                                letterSpacing: "0.05em",
                            }}
                        >
                            TRICK
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{
                                color: "text.primary",
                                opacity: 0.9,
                                fontSize: "0.8rem",
                                lineHeight: 1.5,
                            }}
                        >
                            <EnhancedKeywordLinker referencesOnly={true}>
                                {item.trick}
                            </EnhancedKeywordLinker>
                        </Typography>
                    </Box>
                )}
            </Box>
        </Slide>
    )
}

const EquipmentBrowser = () => {
    const [equipment, setEquipment] = useState([])
    const [filteredEquipment, setFilteredEquipment] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [subcategoryFilter, setSubcategoryFilter] = useState("All")
    const [tierFilter, setTierFilter] = useState("All")
    const [sortBy, setSortBy] = useState("grouped")

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const response = await fetch("/equipment.json")
                const data = await response.json()
                setEquipment(data.equipment)
                setFilteredEquipment(data.equipment)
            } catch (error) {
                console.error("Error fetching equipment data:", error)
            }
        }

        fetchEquipment()
    }, [])

    useEffect(() => {
        let filtered = equipment.filter((item) => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())

            const matchesSubcategory =
                subcategoryFilter === "All" ||
                item.subcategory === subcategoryFilter

            const matchesTier = tierFilter === "All" || item.tier === tierFilter

            return matchesSearch && matchesSubcategory && matchesTier
        })

        filtered.sort((a, b) => {
            const tierIndex = (t) => TIER_ORDER.indexOf(t)
            switch (sortBy) {
                case "grouped":
                    return (
                        tierIndex(a.tier) - tierIndex(b.tier) ||
                        a.subcategory.localeCompare(b.subcategory) ||
                        a.name.localeCompare(b.name)
                    )
                case "name":
                    return a.name.localeCompare(b.name)
                case "subcategory":
                    return (
                        a.subcategory.localeCompare(b.subcategory) ||
                        a.name.localeCompare(b.name)
                    )
                case "tier":
                    return (
                        tierIndex(a.tier) - tierIndex(b.tier) ||
                        a.name.localeCompare(b.name)
                    )
                default:
                    return a.name.localeCompare(b.name)
            }
        })

        setFilteredEquipment(filtered)
    }, [equipment, searchTerm, subcategoryFilter, tierFilter, sortBy])

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
                        minHeight: "30vh",
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
                            Hunter's Arsenal
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
                            Weapons, protection, traps, and tools of the trade.
                            Carry up to 5 — choose wisely.
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
                                label='Search equipment'
                                variant='outlined'
                                size='small'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                        xs: "calc(33% - 11px)",
                                        sm: 160,
                                    },
                                }}
                            >
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={subcategoryFilter}
                                    label='Category'
                                    onChange={(e) =>
                                        setSubcategoryFilter(e.target.value)
                                    }
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
                                    {SUBCATEGORIES.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat === "All" ? (
                                                "All Categories"
                                            ) : (
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: "50%",
                                                            bgcolor:
                                                                subcategoryColors[
                                                                    cat
                                                                ],
                                                        }}
                                                    />
                                                    {cat}
                                                </Box>
                                            )}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl
                                size='small'
                                sx={{
                                    minWidth: {
                                        xs: "calc(33% - 11px)",
                                        sm: 140,
                                    },
                                }}
                            >
                                <InputLabel>Tier</InputLabel>
                                <Select
                                    value={tierFilter}
                                    label='Tier'
                                    onChange={(e) =>
                                        setTierFilter(e.target.value)
                                    }
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
                                    {TIERS.map((tier) => (
                                        <MenuItem key={tier} value={tier}>
                                            {tier === "All"
                                                ? "All Tiers"
                                                : tier}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl
                                size='small'
                                sx={{
                                    minWidth: {
                                        xs: "calc(33% - 11px)",
                                        sm: 140,
                                    },
                                }}
                            >
                                <InputLabel>Sort by</InputLabel>
                                <Select
                                    value={sortBy}
                                    label='Sort by'
                                    onChange={(e) => setSortBy(e.target.value)}
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
                                    <MenuItem value='grouped'>
                                        Tier &amp; Category
                                    </MenuItem>
                                    <MenuItem value='name'>Name (A-Z)</MenuItem>
                                    <MenuItem value='subcategory'>
                                        Category
                                    </MenuItem>
                                    <MenuItem value='tier'>Tier</MenuItem>
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
                            {filteredEquipment.length} item
                            {filteredEquipment.length !== 1 ? "s" : ""} found
                        </Typography>
                    </Box>
                </Slide>

                {/* Equipment Grid */}
                <Box sx={{ width: "100%", maxWidth: "1200px" }}>
                    {sortBy === "grouped" ? (
                        Object.entries(
                            getGroupedEquipment(filteredEquipment),
                        ).map(([tier, subcats]) => (
                            <Box key={tier} sx={{ mb: 5 }}>
                                <Typography
                                    variant='h4'
                                    sx={{
                                        fontWeight: "bold",
                                        mb: 3,
                                        pb: 1,
                                        borderBottom: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "2px solid rgba(255,255,255,0.15)"
                                                : "2px solid rgba(0,0,0,0.15)",
                                        color:
                                            tier === "High Pay"
                                                ? "#ffd54f"
                                                : "text.primary",
                                        fontSize: {
                                            xs: "1.5rem",
                                            sm: "2rem",
                                        },
                                    }}
                                >
                                    {tier}
                                </Typography>
                                {Object.entries(subcats).map(
                                    ([subcat, items]) => (
                                        <Box key={subcat} sx={{ mb: 4 }}>
                                            <Typography
                                                variant='h6'
                                                sx={{
                                                    fontWeight: "bold",
                                                    mb: 2,
                                                    opacity: 0.7,
                                                    letterSpacing: "0.08em",
                                                    textTransform: "uppercase",
                                                    fontSize: "0.85rem",
                                                    color: subcategoryColors[
                                                        subcat
                                                    ],
                                                }}
                                            >
                                                {subcat}
                                            </Typography>
                                            <Grid container spacing={3}>
                                                {items.map((item, index) => (
                                                    <Grid
                                                        item
                                                        xs={12}
                                                        sm={6}
                                                        md={4}
                                                        key={item.name}
                                                    >
                                                        <EquipmentCard
                                                            item={item}
                                                            index={index}
                                                        />
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    ),
                                )}
                            </Box>
                        ))
                    ) : (
                        <Grid container spacing={3}>
                            {filteredEquipment.map((item, index) => (
                                <Grid
                                    item
                                    xs={12}
                                    sm={6}
                                    md={4}
                                    key={item.name}
                                >
                                    <EquipmentCard item={item} index={index} />
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {filteredEquipment.length === 0 && (
                        <Box
                            sx={{
                                textAlign: "center",
                                padding: "60px 20px",
                                opacity: 0.6,
                            }}
                        >
                            <Typography variant='h5'>
                                No equipment found
                            </Typography>
                            <Typography variant='body1' sx={{ mt: 1 }}>
                                Try adjusting your search or filters
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Container>

            <PlayerToolsButton />
        </>
    )
}

export default EquipmentBrowser
