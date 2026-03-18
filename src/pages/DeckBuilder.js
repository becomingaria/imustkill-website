import React, { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    Card,
    Checkbox,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormGroup,
    Chip,
    IconButton,
    Paper,
    Divider,
    Alert,
    Snackbar,
    Modal,
} from "@mui/material"
import {
    ExpandMore,
    Add,
    Remove,
    Delete,
    Save,
    Upload,
    Close,
    Info,
    Undo,
    SortByAlpha,
} from "@mui/icons-material"
import { saveAs } from "file-saver"
import HomeButton from "../components/HomeButton.js"
import PlayerToolsButton from "../components/PlayerToolsButton.js"
import { fetchPowers } from "../utils/cardsClient.js"
import { getCardImageProps, getPlaceholderUrl } from "../utils/cardArtwork.js"

const MIN_DECK_SIZE = 20
const MAX_DECK_SIZE = 60

const rarityColorMap = {
    common: { bgcolor: "#9e9e9e", color: "#fff" },
    uncommon: { bgcolor: "#2196f3", color: "#fff" },
    rare: { bgcolor: "#4caf50", color: "#fff" },
    mythic: { bgcolor: "#ab47bc", color: "#fff" },
    legendary: { bgcolor: "#ffb300", color: "#000" },
}

const getRarityChipSx = (rarity, { variant } = {}) => {
    const key = (rarity || "common").toString().toLowerCase()
    const base = rarityColorMap[key] || rarityColorMap.common
    if (variant === "outlined") {
        return {
            borderColor: base.bgcolor,
            color: base.bgcolor,
        }
    }
    return base
}

const formatDeckTitle = (name) => {
    if (!name) return ""

    // Convert things like "fragmented-time" or "fragmented_time" to "Fragmented Time"
    return name
        .toString()
        .trim()
        .replace(/[-_]+/g, " ")
        .split(/\s+/)
        .map((word) =>
            word.length > 0
                ? word[0].toUpperCase() + word.slice(1).toLowerCase()
                : "",
        )
        .join(" ")
}

const DeckBuilder = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { deckName: routeDeckName } = useParams()

    // Available cards from database
    const [allPowers, setAllPowers] = useState([])
    const [availableDecks, setAvailableDecks] = useState([])
    const [availableRarities, setAvailableRarities] = useState([])
    const [loading, setLoading] = useState(true)

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDecks, setSelectedDecks] = useState(["All"])
    const [selectedRarities, setSelectedRarities] = useState(["All"])

    // Player's deck
    const [playerDeck, setPlayerDeck] = useState([])
    const [deckName, setDeckName] = useState(routeDeckName || "My Deck")

    // My Deck search and filter state
    const [deckSearchQuery, setDeckSearchQuery] = useState("")
    const [deckFilterDecks, setDeckFilterDecks] = useState(["All"])
    const [showMultiplesOnly, setShowMultiplesOnly] = useState(false)

    // UI state
    const [alert, setAlert] = useState({
        open: false,
        message: "",
        severity: "success",
    })
    const [selectedCard, setSelectedCard] = useState(null)
    const [selectedCardSource, setSelectedCardSource] = useState(null) // 'library' or 'deck'
    const [selectedCardId, setSelectedCardId] = useState(null) // ID for deck cards
    const deckRef = useRef(null)
    const fileInputRef = useRef(null)

    // Undo history
    const [undoStack, setUndoStack] = useState([])

    // Drag state
    const [draggedCard, setDraggedCard] = useState(null)
    const [dragSource, setDragSource] = useState(null) // 'library' or 'deck'
    const [isDragOverDeck, setIsDragOverDeck] = useState(false)

    // Load powers on mount
    useEffect(() => {
        const loadPowers = async () => {
            try {
                const data = await fetchPowers()
                setAllPowers(data.powers || [])
                const decks = [
                    "All",
                    ...new Set(data.powers.map((p) => p.deck || "Unknown")),
                ]
                setAvailableDecks(decks)
                const rarities = [
                    "All",
                    ...new Set(data.powers.map((p) => p.rarity || "common")),
                ]
                setAvailableRarities(rarities)
            } catch (error) {
                console.error("Error loading powers:", error)
                showAlert("Error loading cards", "error")
            } finally {
                setLoading(false)
            }
        }
        loadPowers()
    }, [])

    // Build storage key based on deck name (or default)
    const storageKey = `imk_deck_builder_${encodeURIComponent(
        deckName || "default",
    )}`

    // Load deck from sessionStorage
    useEffect(() => {
        const savedDeck = sessionStorage.getItem(storageKey)
        if (savedDeck) {
            try {
                const parsed = JSON.parse(savedDeck)
                if (parsed.playerDeck) setPlayerDeck(parsed.playerDeck)
                if (parsed.deckName) setDeckName(parsed.deckName)
            } catch (error) {
                console.error("Error loading saved deck:", error)
            }
        }
    }, [storageKey])

    // Save deck to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(
            storageKey,
            JSON.stringify({ playerDeck, deckName }),
        )
    }, [playerDeck, deckName, storageKey])

    // Keep the URL in sync when deck name changes.
    useEffect(() => {
        const isDeckRoute = location.pathname.startsWith("/deck/")
        const desiredPath = `/deck/${encodeURIComponent(deckName)}`
        if (deckName && location.pathname !== desiredPath) {
            // If we're on the builder root or a different deck, update URL.
            if (location.pathname === "/deck-builder" || isDeckRoute) {
                navigate(desiredPath, { replace: true })
            }
        }
    }, [deckName, location.pathname, navigate])

    const showAlert = (message, severity = "success") => {
        setAlert({ open: true, message, severity })
    }

    // Filter powers based on search, deck, and rarity selection
    const filteredPowers = allPowers.filter((power) => {
        const matchesSearch =
            searchQuery === "" ||
            power.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (power.deck &&
                power.deck.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (power.description &&
                power.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()))

        const matchesDeck =
            selectedDecks.includes("All") || selectedDecks.includes(power.deck)

        const matchesRarity =
            selectedRarities.includes("All") ||
            selectedRarities.includes(power.rarity || "common")

        return matchesSearch && matchesDeck && matchesRarity
    })

    // Group powers by deck for display
    const groupedPowers = filteredPowers.reduce((acc, power) => {
        const deck = power.deck || "Unknown"
        if (!acc[deck]) acc[deck] = []
        acc[deck].push(power)
        return acc
    }, {})

    const handleDeckFilterChange = (deck) => {
        if (deck === "All") {
            setSelectedDecks(["All"])
            return
        }

        const newSelection = selectedDecks.includes("All")
            ? [deck]
            : selectedDecks.includes(deck)
              ? selectedDecks.filter((d) => d !== deck)
              : [...selectedDecks, deck]
        const finalSelection =
            newSelection.length === 0 ? ["All"] : newSelection
        setSelectedDecks(finalSelection)

        // If user selects a single deck, keep the URL in sync by treating it as the active deck name.
        if (finalSelection.length === 1 && finalSelection[0] !== "All") {
            setDeckName(finalSelection[0])
        }
    }

    const addCardToDeck = (power) => {
        if (playerDeck.length >= MAX_DECK_SIZE) {
            showAlert(`Deck cannot exceed ${MAX_DECK_SIZE} cards`, "warning")
            return
        }
        const newCard = {
            deck: power.deck,
            name: power.name,
            rarity: power.rarity || "common",
            id: `${Date.now()}-${Math.random()}`,
        }
        // Save for undo
        setUndoStack((prev) => [...prev, { type: "add", card: newCard }])
        // Add to top of deck
        setPlayerDeck((prev) => [newCard, ...prev])
    }

    const addEntireDeckToDeck = (deckName) => {
        const cardsToAdd = allPowers.filter((p) => p.deck === deckName)
        const spaceLeft = MAX_DECK_SIZE - playerDeck.length
        if (spaceLeft <= 0) {
            showAlert(`Deck is full (${MAX_DECK_SIZE} cards max)`, "warning")
            return
        }
        const cardsToAddSlice = cardsToAdd.slice(0, spaceLeft)
        const newCards = cardsToAddSlice.map((p) => ({
            deck: p.deck,
            name: p.name,
            rarity: p.rarity || "common",
            id: `${Date.now()}-${Math.random()}`,
        }))
        setPlayerDeck((prev) => [...prev, ...newCards])
        showAlert(
            `Added ${cardsToAddSlice.length} cards from ${formatDeckTitle(deckName)}`,
        )
    }

    const removeCardFromDeck = (id) => {
        const removedCard = playerDeck.find((c) => c.id === id)
        const removedIndex = playerDeck.findIndex((c) => c.id === id)
        if (removedCard) {
            setUndoStack((prev) => [
                ...prev,
                { type: "remove", card: removedCard, index: removedIndex },
            ])
        }
        setPlayerDeck((prev) => prev.filter((c) => c.id !== id))
    }

    const undoLastAction = () => {
        if (undoStack.length === 0) return
        const lastAction = undoStack[undoStack.length - 1]
        setUndoStack((prev) => prev.slice(0, -1))
        if (lastAction.type === "add") {
            // Undo add = remove the card
            setPlayerDeck((prev) =>
                prev.filter((c) => c.id !== lastAction.card.id),
            )
            showAlert("Undid add", "info")
        } else if (lastAction.type === "remove") {
            // Undo remove = add the card back at original position
            setPlayerDeck((prev) => {
                const newDeck = [...prev]
                newDeck.splice(lastAction.index, 0, lastAction.card)
                return newDeck
            })
            showAlert("Undid remove", "info")
        } else if (lastAction.type === "clear") {
            // Undo clear = restore entire deck
            setPlayerDeck(lastAction.cards)
            showAlert("Undid clear", "info")
        }
    }

    const alphabetizeDeck = () => {
        setPlayerDeck((prev) =>
            [...prev].sort((a, b) => a.name.localeCompare(b.name)),
        )
        showAlert("Deck sorted alphabetically")
    }

    // Drag handlers
    const handleDragStart = (card, source, cardId = null) => {
        setDraggedCard(card)
        setDragSource(source)
        if (cardId) setSelectedCardId(cardId)
    }

    const handleDragEnd = () => {
        setDraggedCard(null)
        setDragSource(null)
        setIsDragOverDeck(false)
    }

    const handleDeckDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation() // Prevent triggering outside deck handlers
        if (dragSource === "library") {
            setIsDragOverDeck(true)
        }
    }

    const handleDeckDragLeave = () => {
        setIsDragOverDeck(false)
    }

    const handleDeckDrop = (e) => {
        e.preventDefault()
        e.stopPropagation() // Prevent triggering outside deck drop
        if (dragSource === "library" && draggedCard) {
            addCardToDeck(draggedCard)
        }
        handleDragEnd()
    }

    const handleLibraryDrop = (e) => {
        e.preventDefault()
        if (dragSource === "deck" && selectedCardId) {
            removeCardFromDeck(selectedCardId)
        }
        handleDragEnd()
    }

    // Handle dropping card outside deck to remove it
    const handleOutsideDeckDrop = (e) => {
        e.preventDefault()
        if (dragSource === "deck" && selectedCardId) {
            removeCardFromDeck(selectedCardId)
        }
        handleDragEnd()
    }

    const handleOutsideDeckDragOver = (e) => {
        if (dragSource === "deck") {
            e.preventDefault()
        }
    }

    // Modal helpers
    const openCardModal = (card, source, cardId = null) => {
        setSelectedCard(card)
        setSelectedCardSource(source)
        setSelectedCardId(cardId)
    }

    const clearDeck = () => {
        // Save entire deck to undo stack as single action
        if (playerDeck.length > 0) {
            setUndoStack((prev) => [
                ...prev,
                { type: "clear", cards: [...playerDeck] },
            ])
        }
        setPlayerDeck([])
        showAlert("Deck cleared")
    }

    // CRC32 calculation for PNG embedding
    const calculateCRC32 = useCallback((data) => {
        let crc = 0xffffffff
        const table = new Uint32Array(256)
        for (let i = 0; i < 256; i++) {
            let c = i
            for (let j = 0; j < 8; j++) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
            }
            table[i] = c
        }
        for (let i = 0; i < data.length; i++) {
            crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
        }
        return (crc ^ 0xffffffff) >>> 0
    }, [])

    const embedDeckDataInPNG = useCallback(
        (canvas, deckData) => {
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        const arrayBuffer = reader.result
                        const uint8Array = new Uint8Array(arrayBuffer)

                        let insertPosition = uint8Array.length - 12

                        const deckJSON = JSON.stringify(deckData)
                        const keyword = "Deck Data"
                        const textData = new TextEncoder().encode(
                            keyword + "\0" + deckJSON,
                        )

                        const chunkLength = textData.length
                        const chunkType = new TextEncoder().encode("tEXt")
                        const crc32 = calculateCRC32(
                            new Uint8Array([...chunkType, ...textData]),
                        )

                        const chunk = new Uint8Array(4 + 4 + chunkLength + 4)
                        const view = new DataView(chunk.buffer)

                        view.setUint32(0, chunkLength, false)
                        chunk.set(chunkType, 4)
                        chunk.set(textData, 8)
                        view.setUint32(8 + chunkLength, crc32, false)

                        const newPNG = new Uint8Array(
                            uint8Array.length + chunk.length,
                        )
                        newPNG.set(uint8Array.slice(0, insertPosition), 0)
                        newPNG.set(chunk, insertPosition)
                        newPNG.set(
                            uint8Array.slice(insertPosition),
                            insertPosition + chunk.length,
                        )

                        const newBlob = new Blob([newPNG], {
                            type: "image/png",
                        })
                        resolve(newBlob)
                    }
                    reader.readAsArrayBuffer(blob)
                }, "image/png")
            })
        },
        [calculateCRC32],
    )

    const extractDeckDataFromPNG = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    let i = 8
                    while (i < uint8Array.length) {
                        const view = new DataView(uint8Array.buffer)
                        const length = view.getUint32(i, false)
                        const type = String.fromCharCode(
                            uint8Array[i + 4],
                            uint8Array[i + 5],
                            uint8Array[i + 6],
                            uint8Array[i + 7],
                        )

                        if (type === "tEXt") {
                            const data = uint8Array.slice(i + 8, i + 8 + length)
                            const text = new TextDecoder().decode(data)
                            const nullIndex = text.indexOf("\0")
                            if (nullIndex !== -1) {
                                const keyword = text.substring(0, nullIndex)
                                const value = text.substring(nullIndex + 1)
                                if (keyword === "Deck Data") {
                                    resolve(JSON.parse(value))
                                    return
                                }
                            }
                        }

                        if (type === "IEND") break
                        i += 12 + length
                    }
                    resolve(null)
                } catch (error) {
                    reject(error)
                }
            }
            reader.onerror = reject
            reader.readAsArrayBuffer(file)
        })
    }

    const saveDeck = async () => {
        if (playerDeck.length < MIN_DECK_SIZE) {
            showAlert(`Deck must have at least ${MIN_DECK_SIZE} cards`, "error")
            return
        }
        if (playerDeck.length > MAX_DECK_SIZE) {
            showAlert(`Deck cannot exceed ${MAX_DECK_SIZE} cards`, "error")
            return
        }
        if (!isRarityValid) {
            const issues = []
            if (!rarityValid.rare) {
                issues.push(
                    `Need ${rarityCounts.mythic * 2 - rarityCounts.rare} more Rare cards`,
                )
            }
            if (!rarityValid.uncommon) {
                issues.push(
                    `Need ${rarityCounts.rare * 2 - rarityCounts.uncommon} more Uncommon cards`,
                )
            }
            if (!rarityValid.common) {
                issues.push(
                    `Need ${rarityCounts.uncommon * 2 - rarityCounts.common} more Common cards`,
                )
            }
            showAlert(
                `Rarity requirements not met: ${issues.join(", ")}`,
                "error",
            )
            return
        }

        try {
            // Create custom canvas with beige background and placeholder image
            // 2:3 aspect ratio with rounded corners
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
            const width = 400
            const height = 600 // 2:3 ratio
            const cornerRadius = 24
            canvas.width = width
            canvas.height = height

            // Helper function to draw rounded rectangle
            const roundRect = (x, y, w, h, r) => {
                ctx.beginPath()
                ctx.moveTo(x + r, y)
                ctx.lineTo(x + w - r, y)
                ctx.quadraticCurveTo(x + w, y, x + w, y + r)
                ctx.lineTo(x + w, y + h - r)
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
                ctx.lineTo(x + r, y + h)
                ctx.quadraticCurveTo(x, y + h, x, y + h - r)
                ctx.lineTo(x, y + r)
                ctx.quadraticCurveTo(x, y, x + r, y)
                ctx.closePath()
            }

            // Clip to rounded rectangle
            roundRect(0, 0, width, height, cornerRadius)
            ctx.clip()

            // Beige background
            ctx.fillStyle = "#f5f0e6"
            ctx.fillRect(0, 0, width, height)

            // Load placeholder image (eye.png)
            const placeholderUrl = getPlaceholderUrl()
            const img = new Image()
            img.crossOrigin = "anonymous"

            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = placeholderUrl
            })

            // Draw placeholder centered with padding
            const padding = 40
            const imgWidth = width - padding * 2
            const imgHeight = imgWidth // Square image area
            const imgX = padding
            const imgY = (height - imgHeight) / 2 - 30
            ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight)

            // Add deck name text
            ctx.fillStyle = "#1a1a1a"
            ctx.font = "bold 28px Cinzel, serif"
            ctx.textAlign = "center"
            ctx.fillText(deckName, width / 2, height - 80)

            // Add card count
            ctx.font = "18px sans-serif"
            ctx.fillStyle = "#666"
            ctx.fillText(`${playerDeck.length} cards`, width / 2, height - 50)

            const deckData = {
                name: deckName,
                cards: playerDeck.map((c, index) => ({
                    order: index,
                    deck: c.deck,
                    name: c.name,
                    rarity: c.rarity || "common",
                })),
                cardCount: playerDeck.length,
                savedAt: new Date().toISOString(),
            }

            const blobWithData = await embedDeckDataInPNG(canvas, deckData)
            const fileName = `${deckName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.deck.png`
            saveAs(blobWithData, fileName)
            showAlert("Deck saved as .deck.png with embedded data!")
        } catch (error) {
            console.error("Error saving deck:", error)
            showAlert("Error saving deck", "error")
        }
    }

    const loadDeck = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        try {
            const deckData = await extractDeckDataFromPNG(file)
            if (deckData) {
                setDeckName(deckData.name || "Loaded Deck")
                setPlayerDeck(
                    deckData.cards.map((c) => {
                        // Look up rarity from allPowers
                        const fullCard = allPowers.find(
                            (p) => p.deck === c.deck && p.name === c.name,
                        )
                        return {
                            deck: c.deck,
                            name: c.name,
                            rarity: fullCard?.rarity || c.rarity || "common",
                            id: `${Date.now()}-${Math.random()}`,
                        }
                    }),
                )
                showAlert(
                    `Loaded "${deckData.name}" (${deckData.cardCount} cards)`,
                )
            } else {
                showAlert("No deck data found in this file", "error")
            }
        } catch (error) {
            console.error("Error loading deck:", error)
            showAlert("Error loading deck file", "error")
        }
        event.target.value = null
    }

    // Calculate rarity counts
    const rarityCounts = playerDeck.reduce(
        (acc, card) => {
            const rarity = (card.rarity || "common").toLowerCase()
            acc[rarity] = (acc[rarity] || 0) + 1
            return acc
        },
        { common: 0, uncommon: 0, rare: 0, mythic: 0 },
    )

    // Rarity requirements: each rarity tier needs 2x of the next lower tier
    const rarityValid = {
        rare: rarityCounts.rare >= rarityCounts.mythic * 2,
        uncommon: rarityCounts.uncommon >= rarityCounts.rare * 2,
        common: rarityCounts.common >= rarityCounts.uncommon * 2,
    }

    // Calculate shortfalls
    const rarityShortfall = {
        rare: Math.max(0, rarityCounts.mythic * 2 - rarityCounts.rare),
        uncommon: Math.max(0, rarityCounts.rare * 2 - rarityCounts.uncommon),
        common: Math.max(0, rarityCounts.uncommon * 2 - rarityCounts.common),
    }

    // Calculate total cards needed to meet requirements
    const totalCardsNeeded =
        rarityShortfall.rare + rarityShortfall.uncommon + rarityShortfall.common
    const spaceRemaining = MAX_DECK_SIZE - playerDeck.length
    const canFitNeededCards = totalCardsNeeded <= spaceRemaining

    const isRarityValid =
        rarityValid.rare && rarityValid.uncommon && rarityValid.common

    // Build guidance messages
    const getRarityGuidance = () => {
        const messages = []

        if (isRarityValid) return messages

        // What cards are needed
        const neededCards = []
        if (rarityShortfall.rare > 0) {
            neededCards.push(`${rarityShortfall.rare} Rare`)
        }
        if (rarityShortfall.uncommon > 0) {
            neededCards.push(`${rarityShortfall.uncommon} Uncommon`)
        }
        if (rarityShortfall.common > 0) {
            neededCards.push(`${rarityShortfall.common} Common`)
        }

        if (neededCards.length > 0) {
            if (canFitNeededCards) {
                messages.push({
                    type: "add",
                    text: `Add ${neededCards.join(", ")} card${totalCardsNeeded > 1 ? "s" : ""} to meet requirements`,
                })
            } else {
                // Calculate what to remove
                const overflow = totalCardsNeeded - spaceRemaining
                messages.push({
                    type: "warning",
                    text: `Need ${totalCardsNeeded} more cards but only ${spaceRemaining} space left`,
                })

                // Suggest removals - prioritize highest rarity
                const removals = []
                let cardsToFree = overflow

                if (rarityCounts.mythic > 0 && cardsToFree > 0) {
                    // Each mythic removed frees: 1 mythic + 2 rare requirement
                    // But those 2 rare also need 4 uncommon, etc.
                    // Simpler: removing 1 mythic reduces rare needed by 2
                    const mythicsToRemove = Math.min(
                        rarityCounts.mythic,
                        Math.ceil(cardsToFree / 3), // rough estimate: 1 mythic = ~3 cards worth
                    )
                    if (mythicsToRemove > 0) {
                        removals.push(`${mythicsToRemove} Mythic`)
                        cardsToFree -= mythicsToRemove * 3
                    }
                }

                if (
                    rarityCounts.rare > rarityCounts.mythic * 2 &&
                    cardsToFree > 0
                ) {
                    // Extra rares beyond requirement
                    const extraRares =
                        rarityCounts.rare - rarityCounts.mythic * 2
                    const raresToRemove = Math.min(
                        extraRares,
                        Math.ceil(cardsToFree / 2),
                    )
                    if (raresToRemove > 0) {
                        removals.push(`${raresToRemove} Rare`)
                        cardsToFree -= raresToRemove * 2
                    }
                }

                if (removals.length > 0) {
                    messages.push({
                        type: "remove",
                        text: `Consider removing: ${removals.join(" or ")} to make room`,
                    })
                }
            }
        }

        return messages
    }

    const rarityGuidance = getRarityGuidance()

    const isDeckSizeValid =
        playerDeck.length >= MIN_DECK_SIZE && playerDeck.length <= MAX_DECK_SIZE

    const isDeckValid = isDeckSizeValid && isRarityValid

    return (
        <Container
            maxWidth='xl'
            sx={{
                py: 4,
                position: "relative",
                minHeight: "100vh",
            }}
            onDragOver={handleOutsideDeckDragOver}
            onDrop={handleOutsideDeckDrop}
        >
            {/* Drop zone indicator */}
            {dragSource === "deck" && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: "4px dashed",
                        borderColor: "error.main",
                        backgroundColor: "rgba(211, 47, 47, 0.08)",
                        pointerEvents: "none",
                        zIndex: 9998,
                    }}
                />
            )}
            {dragSource === "deck" && (
                <Box
                    sx={{
                        position: "fixed",
                        top: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        pointerEvents: "none",
                        zIndex: 10001,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: "1.2rem",
                            fontWeight: "bold",
                            color: "error.main",
                            backgroundColor: "background.paper",
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                            boxShadow: 3,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <Remove /> Drop outside deck to remove
                    </Typography>
                </Box>
            )}
            <HomeButton />
            <PlayerToolsButton />

            <Box sx={{ textAlign: "center", mb: 4 }}>
                <Typography
                    variant='h2'
                    component='h1'
                    gutterBottom
                    sx={{
                        fontWeight: "bold",
                        fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                        fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                    }}
                >
                    Deck Builder
                </Typography>
                <Typography variant='body1' sx={{ opacity: 0.8 }}>
                    Build your custom power deck ({MIN_DECK_SIZE}-
                    {MAX_DECK_SIZE} cards)
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Left Side - Card Browser */}
                <Grid item xs={12} md={7}>
                    <Paper
                        sx={{ p: 2, borderRadius: "16px" }}
                        onDragOver={(e) => {
                            if (dragSource === "deck") e.preventDefault()
                        }}
                        onDrop={handleLibraryDrop}
                    >
                        <Typography
                            variant='h5'
                            sx={{ mb: 2, fontFamily: '"Cinzel", serif' }}
                        >
                            Card Library
                        </Typography>

                        {/* Search */}
                        <TextField
                            fullWidth
                            label='Search cards by name, deck, or description...'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        {/* Deck Filter */}
                        <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography>
                                    Filter by Deck/Booster Pack
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <FormGroup row>
                                    {availableDecks.map((deck) => (
                                        <FormControlLabel
                                            key={deck}
                                            control={
                                                <Checkbox
                                                    checked={
                                                        deck === "All"
                                                            ? selectedDecks.includes(
                                                                  "All",
                                                              )
                                                            : selectedDecks.includes(
                                                                  deck,
                                                              )
                                                    }
                                                    onChange={() =>
                                                        handleDeckFilterChange(
                                                            deck,
                                                        )
                                                    }
                                                />
                                            }
                                            label={formatDeckTitle(deck)}
                                        />
                                    ))}
                                </FormGroup>
                            </AccordionDetails>
                        </Accordion>

                        {/* Rarity Filter */}
                        <Accordion sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography>Filter by Rarity</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <FormGroup row>
                                    {availableRarities.map((rarity) => (
                                        <FormControlLabel
                                            key={rarity}
                                            control={
                                                <Checkbox
                                                    checked={
                                                        rarity === "All"
                                                            ? selectedRarities.includes(
                                                                  "All",
                                                              )
                                                            : selectedRarities.includes(
                                                                  rarity,
                                                              )
                                                    }
                                                    onChange={() => {
                                                        if (rarity === "All") {
                                                            setSelectedRarities(
                                                                ["All"],
                                                            )
                                                        } else {
                                                            setSelectedRarities(
                                                                (prev) => {
                                                                    const withoutAll =
                                                                        prev.filter(
                                                                            (
                                                                                r,
                                                                            ) =>
                                                                                r !==
                                                                                "All",
                                                                        )
                                                                    if (
                                                                        prev.includes(
                                                                            rarity,
                                                                        )
                                                                    ) {
                                                                        const newSel =
                                                                            withoutAll.filter(
                                                                                (
                                                                                    r,
                                                                                ) =>
                                                                                    r !==
                                                                                    rarity,
                                                                            )
                                                                        return newSel.length ===
                                                                            0
                                                                            ? [
                                                                                  "All",
                                                                              ]
                                                                            : newSel
                                                                    } else {
                                                                        return [
                                                                            ...withoutAll,
                                                                            rarity,
                                                                        ]
                                                                    }
                                                                },
                                                            )
                                                        }
                                                    }}
                                                />
                                            }
                                            label={
                                                rarity.charAt(0).toUpperCase() +
                                                rarity.slice(1)
                                            }
                                        />
                                    ))}
                                </FormGroup>
                            </AccordionDetails>
                        </Accordion>

                        {/* Card List by Deck */}
                        <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                            {loading ? (
                                <Typography>Loading cards...</Typography>
                            ) : Object.keys(groupedPowers).length === 0 ? (
                                <Typography>No cards found</Typography>
                            ) : (
                                Object.entries(groupedPowers).map(
                                    ([deckName, cards]) => (
                                        <Accordion key={deckName}>
                                            <AccordionSummary
                                                expandIcon={<ExpandMore />}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "space-between",
                                                        width: "100%",
                                                        pr: 2,
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {formatDeckTitle(
                                                            deckName,
                                                        )}{" "}
                                                        ({cards.length} cards)
                                                    </Typography>
                                                    <Button
                                                        size='small'
                                                        variant='outlined'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            addEntireDeckToDeck(
                                                                deckName,
                                                            )
                                                        }}
                                                        sx={{ ml: 2 }}
                                                    >
                                                        Add All
                                                    </Button>
                                                </Box>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: 2,
                                                        justifyContent:
                                                            "flex-start",
                                                    }}
                                                >
                                                    {cards.map((card) => (
                                                        <Card
                                                            key={`${card.deck}-${card.name}`}
                                                            draggable
                                                            onDragStart={() =>
                                                                handleDragStart(
                                                                    card,
                                                                    "library",
                                                                )
                                                            }
                                                            onDragEnd={
                                                                handleDragEnd
                                                            }
                                                            onClick={() =>
                                                                openCardModal(
                                                                    card,
                                                                    "library",
                                                                )
                                                            }
                                                            sx={{
                                                                width: 160,
                                                                aspectRatio:
                                                                    "2/3",
                                                                display: "flex",
                                                                flexDirection:
                                                                    "column",
                                                                borderRadius:
                                                                    "12px",
                                                                overflow:
                                                                    "hidden",
                                                                position:
                                                                    "relative",
                                                                cursor: "grab",
                                                                transition:
                                                                    "transform 0.2s, box-shadow 0.2s",
                                                                "&:hover": {
                                                                    transform:
                                                                        "translateY(-4px)",
                                                                    boxShadow: 6,
                                                                },
                                                                "&:active": {
                                                                    cursor: "grabbing",
                                                                },
                                                            }}
                                                        >
                                                            {/* Card Header - Name & Cost */}
                                                            <Box
                                                                sx={{
                                                                    p: 1,
                                                                    bgcolor: (
                                                                        theme,
                                                                    ) =>
                                                                        theme
                                                                            .palette
                                                                            .mode ===
                                                                        "dark"
                                                                            ? "rgba(0,0,0,0.6)"
                                                                            : "rgba(0,0,0,0.8)",
                                                                    color: "#fff",
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant='subtitle2'
                                                                    sx={{
                                                                        fontWeight:
                                                                            "bold",
                                                                        fontSize:
                                                                            "0.75rem",
                                                                        lineHeight: 1.2,
                                                                        overflow:
                                                                            "hidden",
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                    }}
                                                                >
                                                                    {card.name}
                                                                </Typography>
                                                                {card.cost && (
                                                                    <Chip
                                                                        size='small'
                                                                        label={`${card.cost} Cost`}
                                                                        sx={{
                                                                            height: 18,
                                                                            fontSize:
                                                                                "0.65rem",
                                                                            mt: 0.5,
                                                                            bgcolor:
                                                                                "primary.main",
                                                                            color: "#fff",
                                                                        }}
                                                                    />
                                                                )}
                                                            </Box>

                                                            {/* Card Image */}
                                                            <Box
                                                                sx={{
                                                                    flex: 1,
                                                                    bgcolor:
                                                                        "#f5f0e6",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    borderTop:
                                                                        "1px solid",
                                                                    borderBottom:
                                                                        "1px solid",
                                                                    borderColor:
                                                                        "divider",
                                                                    overflow:
                                                                        "hidden",
                                                                }}
                                                            >
                                                                <Box
                                                                    component='img'
                                                                    {...getCardImageProps(
                                                                        card,
                                                                    )}
                                                                    sx={{
                                                                        width: "100%",
                                                                        height: "100%",
                                                                        objectFit:
                                                                            "cover",
                                                                    }}
                                                                />
                                                            </Box>

                                                            {/* Card Footer - Rarity & Description */}
                                                            <Box
                                                                sx={{
                                                                    p: 1,
                                                                    bgcolor: (
                                                                        theme,
                                                                    ) =>
                                                                        theme
                                                                            .palette
                                                                            .mode ===
                                                                        "dark"
                                                                            ? "rgba(30,30,30,0.95)"
                                                                            : "rgba(250,250,250,0.95)",
                                                                }}
                                                            >
                                                                <Chip
                                                                    size='small'
                                                                    label={
                                                                        card.rarity ||
                                                                        "Common"
                                                                    }
                                                                    sx={{
                                                                        height: 18,
                                                                        fontSize:
                                                                            "0.6rem",
                                                                        mb: 0.5,
                                                                        ...getRarityChipSx(
                                                                            card.rarity,
                                                                        ),
                                                                    }}
                                                                />
                                                                <Typography
                                                                    variant='caption'
                                                                    sx={{
                                                                        display:
                                                                            "block",
                                                                        fontSize:
                                                                            "0.6rem",
                                                                        lineHeight: 1.3,
                                                                        overflow:
                                                                            "hidden",
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        maxHeight:
                                                                            "2.6em",
                                                                        color: "text.secondary",
                                                                    }}
                                                                >
                                                                    {card.description ||
                                                                        "No description"}
                                                                </Typography>
                                                                <Typography
                                                                    variant='caption'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        openCardModal(
                                                                            card,
                                                                            "library",
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: 0.5,
                                                                        fontSize:
                                                                            "0.55rem",
                                                                        color: "primary.main",
                                                                        cursor: "pointer",
                                                                        mt: 0.5,
                                                                        "&:hover":
                                                                            {
                                                                                textDecoration:
                                                                                    "underline",
                                                                            },
                                                                    }}
                                                                >
                                                                    <Info
                                                                        sx={{
                                                                            fontSize: 12,
                                                                        }}
                                                                    />
                                                                    More Info
                                                                </Typography>
                                                            </Box>

                                                            {/* Add Button Overlay */}
                                                            <IconButton
                                                                size='small'
                                                                color='primary'
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    addCardToDeck(
                                                                        card,
                                                                    )
                                                                }}
                                                                sx={{
                                                                    position:
                                                                        "absolute",
                                                                    top: 4,
                                                                    right: 4,
                                                                    bgcolor:
                                                                        "background.paper",
                                                                    boxShadow: 2,
                                                                    "&:hover": {
                                                                        bgcolor:
                                                                            "primary.main",
                                                                        color: "#fff",
                                                                    },
                                                                }}
                                                            >
                                                                <Add fontSize='small' />
                                                            </IconButton>
                                                        </Card>
                                                    ))}
                                                </Box>
                                            </AccordionDetails>
                                        </Accordion>
                                    ),
                                )
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* Right Side - Player Deck */}
                <Grid item xs={12} md={5}>
                    <Paper
                        ref={deckRef}
                        sx={{
                            p: 2,
                            borderRadius: "16px",
                            transition: "box-shadow 0.2s, border-color 0.2s",
                            border: isDragOverDeck
                                ? "2px dashed"
                                : "2px solid transparent",
                            borderColor: isDragOverDeck
                                ? "primary.main"
                                : "transparent",
                            boxShadow: isDragOverDeck ? 8 : 1,
                            position: "relative",
                            zIndex: dragSource === "deck" ? 10000 : "auto",
                            backgroundColor: "background.paper",
                        }}
                        onDragOver={handleDeckDragOver}
                        onDragLeave={handleDeckDragLeave}
                        onDrop={handleDeckDrop}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                                position: "relative",
                                p: 1.5,
                                borderRadius: 2,
                                background: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(30,30,30,0.95)"
                                        : "rgba(255,255,255,0.95)",
                                border: "2px solid transparent",
                                overflow: "hidden",
                                "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    width: "300%",
                                    paddingBottom: "300%",
                                    transform: "translate(-50%, -50%)",
                                    borderRadius: "50%",
                                    background: `conic-gradient(
                                        from 0deg,
                                        #1976d2 0deg,
                                        #1976d2 330deg,
                                        transparent 330deg,
                                        transparent 360deg
                                    )`,
                                    animation: "rotateGap 6s linear infinite",
                                    pointerEvents: "none",
                                },
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    inset: "2px",
                                    borderRadius: "6px",
                                    background: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(30,30,30,0.95)"
                                            : "rgba(255,255,255,0.95)",
                                    pointerEvents: "none",
                                },
                                boxShadow: "0 0 15px #1976d2, 0 0 30px #42a5f5",
                                "@keyframes rotateGap": {
                                    "0%": {
                                        transform:
                                            "translate(-50%, -50%) rotate(0deg)",
                                    },
                                    "100%": {
                                        transform:
                                            "translate(-50%, -50%) rotate(360deg)",
                                    },
                                },
                            }}
                        >
                            <TextField
                                value={deckName}
                                onChange={(e) => setDeckName(e.target.value)}
                                variant='standard'
                                placeholder='Click to name your deck...'
                                sx={{
                                    flex: 1,
                                    position: "relative",
                                    zIndex: 1,
                                    "& .MuiInputBase-input": {
                                        fontSize: "1.5rem",
                                        fontFamily: '"Cinzel", serif',
                                        fontWeight: "bold",
                                    },
                                    "& .MuiInput-underline:before": {
                                        borderBottom: "none",
                                    },
                                    "& .MuiInput-underline:hover:before": {
                                        borderBottom: "2px solid",
                                        borderColor: "primary.main",
                                    },
                                }}
                            />
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                mb: 2,
                                gap: 1,
                            }}
                        >
                            <Chip
                                label={`${playerDeck.length} / ${MAX_DECK_SIZE} cards`}
                                color={
                                    isDeckSizeValid
                                        ? "success"
                                        : playerDeck.length < MIN_DECK_SIZE
                                          ? "warning"
                                          : "error"
                                }
                            />
                            <Typography variant='body2' color='text.secondary'>
                                (Min: {MIN_DECK_SIZE})
                            </Typography>
                        </Box>

                        {/* Rarity Requirements Display */}
                        <Box
                            sx={{
                                mb: 2,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.05)"
                                        : "rgba(0,0,0,0.03)",
                                border: (theme) =>
                                    `1px solid ${
                                        isRarityValid
                                            ? theme.palette.success.main
                                            : theme.palette.warning.main
                                    }`,
                            }}
                        >
                            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                Rarity Requirements
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1,
                                }}
                            >
                                <Chip
                                    size='small'
                                    label={`Mythic: ${rarityCounts.mythic}`}
                                    sx={{ bgcolor: "#9c27b0", color: "white" }}
                                />
                                <Chip
                                    size='small'
                                    label={`Rare: ${rarityCounts.rare}${rarityCounts.mythic > 0 ? ` / ${rarityCounts.mythic * 2} req` : ""}`}
                                    color={
                                        rarityValid.rare ? "success" : "error"
                                    }
                                />
                                <Chip
                                    size='small'
                                    label={`Uncommon: ${rarityCounts.uncommon}${rarityCounts.rare > 0 ? ` / ${rarityCounts.rare * 2} req` : ""}`}
                                    color={
                                        rarityValid.uncommon
                                            ? "success"
                                            : "error"
                                    }
                                />
                                <Chip
                                    size='small'
                                    label={`Common: ${rarityCounts.common}${rarityCounts.uncommon > 0 ? ` / ${rarityCounts.uncommon * 2} req` : ""}`}
                                    color={
                                        rarityValid.common ? "success" : "error"
                                    }
                                />
                            </Box>
                            {!isRarityValid && rarityGuidance.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                    {rarityGuidance.map((msg, idx) => (
                                        <Typography
                                            key={idx}
                                            variant='caption'
                                            sx={{
                                                display: "block",
                                                color:
                                                    msg.type === "add"
                                                        ? "info.main"
                                                        : msg.type === "remove"
                                                          ? "error.main"
                                                          : "warning.main",
                                                mb: 0.5,
                                            }}
                                        >
                                            {msg.type === "add" && "➕ "}
                                            {msg.type === "remove" && "➖ "}
                                            {msg.type === "warning" && "⚠️ "}
                                            {msg.text}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                mb: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Button
                                variant='outlined'
                                color='error'
                                startIcon={<Delete />}
                                onClick={clearDeck}
                                disabled={playerDeck.length === 0}
                            >
                                Clear
                            </Button>
                            <Button
                                variant='outlined'
                                startIcon={<Undo />}
                                onClick={undoLastAction}
                                disabled={undoStack.length === 0}
                            >
                                Undo
                            </Button>
                            <Button
                                variant='outlined'
                                startIcon={<SortByAlpha />}
                                onClick={alphabetizeDeck}
                                disabled={playerDeck.length === 0}
                            >
                                Sort A-Z
                            </Button>
                            <Button
                                variant='contained'
                                color={isDeckValid ? "success" : "warning"}
                                startIcon={<Save />}
                                onClick={saveDeck}
                            >
                                Save Deck
                            </Button>
                            <Button
                                variant='outlined'
                                onClick={() =>
                                    navigate("/digital-character-sheet")
                                }
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    textTransform: "none",
                                    borderColor: "#fff",
                                    color: "#fff",
                                    background: "rgba(0,0,0,0.08)",
                                    "&:hover": {
                                        borderColor: "#fff",
                                        color: "#8B0000",
                                        background: "#fff",
                                    },
                                }}
                            >
                                Use Deck
                            </Button>
                            <Button
                                variant='outlined'
                                startIcon={<Upload />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Load
                            </Button>
                            <input
                                type='file'
                                ref={fileInputRef}
                                onChange={loadDeck}
                                accept='.png,.deck.png'
                                style={{ display: "none" }}
                            />
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* My Deck Search & Filter */}
                        {playerDeck.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <TextField
                                    fullWidth
                                    size='small'
                                    label='Search my deck...'
                                    value={deckSearchQuery}
                                    onChange={(e) =>
                                        setDeckSearchQuery(e.target.value)
                                    }
                                    sx={{ mb: 1 }}
                                />
                                <Accordion sx={{ mb: 1 }}>
                                    <AccordionSummary
                                        expandIcon={<ExpandMore />}
                                    >
                                        <Typography variant='body2'>
                                            Filter by Source Deck
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <FormGroup row>
                                            {[
                                                "All",
                                                ...new Set(
                                                    playerDeck.map(
                                                        (c) => c.deck,
                                                    ),
                                                ),
                                            ].map((deck) => (
                                                <FormControlLabel
                                                    key={deck}
                                                    control={
                                                        <Checkbox
                                                            size='small'
                                                            checked={
                                                                deck === "All"
                                                                    ? deckFilterDecks.includes(
                                                                          "All",
                                                                      )
                                                                    : deckFilterDecks.includes(
                                                                          deck,
                                                                      )
                                                            }
                                                            onChange={() => {
                                                                if (
                                                                    deck ===
                                                                    "All"
                                                                ) {
                                                                    setDeckFilterDecks(
                                                                        ["All"],
                                                                    )
                                                                } else {
                                                                    const newSelection =
                                                                        deckFilterDecks.includes(
                                                                            "All",
                                                                        )
                                                                            ? [
                                                                                  deck,
                                                                              ]
                                                                            : deckFilterDecks.includes(
                                                                                    deck,
                                                                                )
                                                                              ? deckFilterDecks.filter(
                                                                                    (
                                                                                        d,
                                                                                    ) =>
                                                                                        d !==
                                                                                        deck,
                                                                                )
                                                                              : [
                                                                                    ...deckFilterDecks,
                                                                                    deck,
                                                                                ]
                                                                    setDeckFilterDecks(
                                                                        newSelection.length ===
                                                                            0
                                                                            ? [
                                                                                  "All",
                                                                              ]
                                                                            : newSelection,
                                                                    )
                                                                }
                                                            }}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant='caption'>
                                                            {formatDeckTitle(
                                                                deck,
                                                            )}
                                                        </Typography>
                                                    }
                                                />
                                            ))}
                                        </FormGroup>
                                    </AccordionDetails>
                                </Accordion>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            size='small'
                                            checked={showMultiplesOnly}
                                            onChange={(e) =>
                                                setShowMultiplesOnly(
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                    }
                                    label={
                                        <Typography variant='body2'>
                                            Show multiples only
                                        </Typography>
                                    }
                                />
                            </Box>
                        )}

                        <Box sx={{ maxHeight: "50vh", overflow: "auto" }}>
                            {playerDeck.length === 0 ? (
                                <Typography
                                    color='text.secondary'
                                    sx={{ textAlign: "center", py: 4 }}
                                >
                                    Add cards from the library to build your
                                    deck
                                </Typography>
                            ) : (
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 2,
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    {playerDeck
                                        .map((card, index) => ({
                                            card,
                                            originalIndex: index,
                                        }))
                                        .filter(({ card }) => {
                                            const fullCard =
                                                allPowers.find(
                                                    (p) =>
                                                        p.deck === card.deck &&
                                                        p.name === card.name,
                                                ) || card
                                            const matchesSearch =
                                                deckSearchQuery === "" ||
                                                card.name
                                                    .toLowerCase()
                                                    .includes(
                                                        deckSearchQuery.toLowerCase(),
                                                    ) ||
                                                card.deck
                                                    .toLowerCase()
                                                    .includes(
                                                        deckSearchQuery.toLowerCase(),
                                                    ) ||
                                                (fullCard.description &&
                                                    fullCard.description
                                                        .toLowerCase()
                                                        .includes(
                                                            deckSearchQuery.toLowerCase(),
                                                        ))
                                            const matchesDeck =
                                                deckFilterDecks.includes(
                                                    "All",
                                                ) ||
                                                deckFilterDecks.includes(
                                                    card.deck,
                                                )
                                            // Check for multiples
                                            const cardKey = `${card.deck}|${card.name}`
                                            const cardCount = playerDeck.filter(
                                                (c) =>
                                                    `${c.deck}|${c.name}` ===
                                                    cardKey,
                                            ).length
                                            const matchesMultiples =
                                                !showMultiplesOnly ||
                                                cardCount > 1
                                            return (
                                                matchesSearch &&
                                                matchesDeck &&
                                                matchesMultiples
                                            )
                                        })
                                        .map(({ card, originalIndex }) => {
                                            // Look up full card data
                                            const fullCard =
                                                allPowers.find(
                                                    (p) =>
                                                        p.deck === card.deck &&
                                                        p.name === card.name,
                                                ) || card
                                            return (
                                                <Box
                                                    key={card.id}
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <Card
                                                        draggable
                                                        onDragStart={() =>
                                                            handleDragStart(
                                                                fullCard,
                                                                "deck",
                                                                card.id,
                                                            )
                                                        }
                                                        onDragEnd={
                                                            handleDragEnd
                                                        }
                                                        onClick={() =>
                                                            openCardModal(
                                                                fullCard,
                                                                "deck",
                                                                card.id,
                                                            )
                                                        }
                                                        sx={{
                                                            width: 120,
                                                            aspectRatio: "2/3",
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            borderRadius:
                                                                "10px",
                                                            overflow: "hidden",
                                                            position:
                                                                "relative",
                                                            cursor: "grab",
                                                            transition:
                                                                "transform 0.2s, box-shadow 0.2s",
                                                            "&:hover": {
                                                                transform:
                                                                    "translateY(-2px)",
                                                                boxShadow: 4,
                                                            },
                                                            "&:active": {
                                                                cursor: "grabbing",
                                                            },
                                                        }}
                                                    >
                                                        {/* Remove Button */}
                                                        <IconButton
                                                            size='small'
                                                            color='error'
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                removeCardFromDeck(
                                                                    card.id,
                                                                )
                                                            }}
                                                            sx={{
                                                                position:
                                                                    "absolute",
                                                                top: 2,
                                                                right: 2,
                                                                bgcolor:
                                                                    "background.paper",
                                                                boxShadow: 1,
                                                                zIndex: 5,
                                                                width: 22,
                                                                height: 22,
                                                                "&:hover": {
                                                                    bgcolor:
                                                                        "error.main",
                                                                    color: "#fff",
                                                                },
                                                            }}
                                                        >
                                                            <Remove
                                                                sx={{
                                                                    fontSize: 14,
                                                                }}
                                                            />
                                                        </IconButton>

                                                        {/* Card Header */}
                                                        <Box
                                                            sx={{
                                                                p: 0.5,
                                                                pt: 1,
                                                                bgcolor: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "rgba(0,0,0,0.6)"
                                                                        : "rgba(0,0,0,0.8)",
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            <Typography
                                                                variant='caption'
                                                                sx={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize:
                                                                        "0.6rem",
                                                                    lineHeight: 1.2,
                                                                    overflow:
                                                                        "hidden",
                                                                    textOverflow:
                                                                        "ellipsis",
                                                                    whiteSpace:
                                                                        "nowrap",
                                                                    display:
                                                                        "block",
                                                                }}
                                                            >
                                                                {card.name}
                                                            </Typography>
                                                        </Box>

                                                        {/* Card Image */}
                                                        <Box
                                                            sx={{
                                                                flex: 1,
                                                                bgcolor:
                                                                    "#f5f0e6",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                borderTop:
                                                                    "1px solid",
                                                                borderBottom:
                                                                    "1px solid",
                                                                borderColor:
                                                                    "divider",
                                                                overflow:
                                                                    "hidden",
                                                            }}
                                                        >
                                                            <Box
                                                                component='img'
                                                                {...getCardImageProps(
                                                                    fullCard,
                                                                )}
                                                                sx={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit:
                                                                        "cover",
                                                                }}
                                                            />
                                                        </Box>

                                                        {/* Card Footer */}
                                                        <Box
                                                            sx={{
                                                                p: 0.5,
                                                                bgcolor: (
                                                                    theme,
                                                                ) =>
                                                                    theme
                                                                        .palette
                                                                        .mode ===
                                                                    "dark"
                                                                        ? "rgba(30,30,30,0.95)"
                                                                        : "rgba(250,250,250,0.95)",
                                                            }}
                                                        >
                                                            <Chip
                                                                size='small'
                                                                label={
                                                                    fullCard.rarity ||
                                                                    card.rarity ||
                                                                    "Common"
                                                                }
                                                                sx={{
                                                                    height: 16,
                                                                    fontSize:
                                                                        "0.55rem",
                                                                    mb: 0.25,
                                                                    ...getRarityChipSx(
                                                                        fullCard.rarity ||
                                                                            card.rarity,
                                                                    ),
                                                                }}
                                                            />
                                                            <Typography
                                                                variant='caption'
                                                                sx={{
                                                                    fontSize:
                                                                        "0.5rem",
                                                                    color: "text.secondary",
                                                                    overflow:
                                                                        "hidden",
                                                                    textOverflow:
                                                                        "ellipsis",
                                                                    maxHeight:
                                                                        "2em",
                                                                    display:
                                                                        "-webkit-box",
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient:
                                                                        "vertical",
                                                                }}
                                                            >
                                                                {fullCard.description ||
                                                                    card.deck}
                                                            </Typography>
                                                            {fullCard.description &&
                                                                fullCard
                                                                    .description
                                                                    .length >
                                                                    40 && (
                                                                    <Typography
                                                                        variant='caption'
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation()
                                                                            openCardModal(
                                                                                fullCard,
                                                                                "deck",
                                                                                card.id,
                                                                            )
                                                                        }}
                                                                        sx={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: 0.3,
                                                                            fontSize:
                                                                                "0.45rem",
                                                                            color: "primary.main",
                                                                            cursor: "pointer",
                                                                            mt: 0.25,
                                                                            "&:hover":
                                                                                {
                                                                                    textDecoration:
                                                                                        "underline",
                                                                                },
                                                                        }}
                                                                    >
                                                                        <Info
                                                                            sx={{
                                                                                fontSize: 10,
                                                                            }}
                                                                        />
                                                                        More
                                                                        Info
                                                                    </Typography>
                                                                )}
                                                        </Box>
                                                    </Card>
                                                    {/* Card Number Below */}
                                                    <Typography
                                                        variant='caption'
                                                        sx={{
                                                            mt: 0.5,
                                                            fontWeight: "bold",
                                                            fontSize: "0.7rem",
                                                            color: "text.secondary",
                                                        }}
                                                    >
                                                        #{originalIndex + 1}
                                                    </Typography>
                                                </Box>
                                            )
                                        })}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={alert.open}
                autoHideDuration={3000}
                onClose={() => setAlert({ ...alert, open: false })}
            >
                <Alert
                    severity={alert.severity}
                    onClose={() => setAlert({ ...alert, open: false })}
                >
                    {alert.message}
                </Alert>
            </Snackbar>

            {/* Card Detail Modal */}
            <Modal
                open={selectedCard !== null}
                onClose={() => {
                    setSelectedCard(null)
                    setSelectedCardSource(null)
                    setSelectedCardId(null)
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Paper
                    sx={{
                        width: { xs: "95%", sm: 400 },
                        maxHeight: "90vh",
                        overflow: "auto",
                        borderRadius: "16px",
                        outline: "none",
                        position: "relative",
                    }}
                >
                    {selectedCard && (
                        <>
                            {/* Close Button */}
                            <IconButton
                                onClick={() => {
                                    setSelectedCard(null)
                                    setSelectedCardSource(null)
                                    setSelectedCardId(null)
                                }}
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                    bgcolor: "background.paper",
                                }}
                            >
                                <Close />
                            </IconButton>

                            {/* Card Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(0,0,0,0.8)"
                                            : "rgba(0,0,0,0.9)",
                                    color: "#fff",
                                }}
                            >
                                <Typography
                                    variant='h5'
                                    sx={{
                                        fontWeight: "bold",
                                        fontFamily: '"Cinzel", serif',
                                        pr: 4,
                                    }}
                                >
                                    {selectedCard.name}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        mt: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {selectedCard.cost && (
                                        <Chip
                                            label={`${selectedCard.cost} Cost`}
                                            size='small'
                                            sx={{
                                                bgcolor: "primary.main",
                                                color: "#fff",
                                            }}
                                        />
                                    )}
                                    <Chip
                                        label={selectedCard.rarity || "Common"}
                                        size='small'
                                        variant='outlined'
                                        sx={getRarityChipSx(
                                            selectedCard.rarity,
                                            {
                                                variant: "outlined",
                                            },
                                        )}
                                    />
                                    <Chip
                                        label={selectedCard.deck || "Unknown"}
                                        size='small'
                                        variant='outlined'
                                        sx={{
                                            borderColor: "#fff",
                                            color: "#fff",
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Card Image */}
                            <Box
                                sx={{
                                    width: "100%",
                                    aspectRatio: "4/3",
                                    bgcolor: "#f5f0e6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderTop: "1px solid",
                                    borderBottom: "1px solid",
                                    borderColor: "divider",
                                    overflow: "hidden",
                                }}
                            >
                                <Box
                                    component='img'
                                    {...getCardImageProps(selectedCard)}
                                    sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                            </Box>

                            {/* Card Details */}
                            <Box sx={{ p: 2 }}>
                                <Typography
                                    variant='body1'
                                    sx={{ mb: 2, lineHeight: 1.6 }}
                                >
                                    {selectedCard.description ||
                                        "No description available."}
                                </Typography>

                                {selectedCard.effect && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography
                                            variant='subtitle2'
                                            sx={{ fontWeight: "bold", mb: 0.5 }}
                                        >
                                            Effect:
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {selectedCard.effect}
                                        </Typography>
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />

                                {selectedCardSource === "deck" &&
                                selectedCardId ? (
                                    <Button
                                        fullWidth
                                        variant='contained'
                                        color='error'
                                        startIcon={<Remove />}
                                        onClick={() => {
                                            removeCardFromDeck(selectedCardId)
                                            setSelectedCard(null)
                                            setSelectedCardSource(null)
                                            setSelectedCardId(null)
                                        }}
                                    >
                                        Remove from Deck
                                    </Button>
                                ) : (
                                    <Button
                                        fullWidth
                                        variant='contained'
                                        startIcon={<Add />}
                                        onClick={() => {
                                            addCardToDeck(selectedCard)
                                            setSelectedCard(null)
                                            setSelectedCardSource(null)
                                            setSelectedCardId(null)
                                        }}
                                    >
                                        Add to Deck
                                    </Button>
                                )}
                            </Box>
                        </>
                    )}
                </Paper>
            </Modal>
        </Container>
    )
}

export default DeckBuilder
