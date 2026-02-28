import React, { useState, useCallback, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
    Box,
    Typography,
    Button,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Fade,
    Zoom,
    Collapse,
    Modal,
    Divider,
} from "@mui/material"
import {
    Shuffle,
    Delete,
    Upload,
    Layers,
    LayersClear,
    Style,
    Close,
    MenuBook,
    KeyboardDoubleArrowUp,
    Undo,
    Redo,
} from "@mui/icons-material"
import { D10Icon } from "./icons"
import { fetchPowers } from "../utils/cardsClient"
import { getCardImageProps } from "../utils/cardArtwork"

// ─── Utility: extract "Deck Data" tEXt chunk from a PNG ───
const extractDeckDataFromPNG = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const uint8 = new Uint8Array(reader.result)
                let i = 8 // skip PNG signature
                while (i < uint8.length) {
                    const view = new DataView(uint8.buffer)
                    const length = view.getUint32(i, false)
                    const type = String.fromCharCode(
                        uint8[i + 4],
                        uint8[i + 5],
                        uint8[i + 6],
                        uint8[i + 7],
                    )
                    if (type === "tEXt") {
                        const data = uint8.slice(i + 8, i + 8 + length)
                        const text = new TextDecoder().decode(data)
                        const nullIdx = text.indexOf("\0")
                        if (nullIdx !== -1) {
                            const keyword = text.substring(0, nullIdx)
                            const value = text.substring(nullIdx + 1)
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
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

// ─── Fisher-Yates shuffle ───
const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

// ─── Constants matching game rules ───
const MAX_HAND_SIZE = 3

// ─── Rarity colour map ───
const rarityColor = {
    common: "#888",
    uncommon: "#2e7d32",
    rare: "#1565c0",
    mythic: "#8e24aa",
}

const rarityBorder = {
    common: "#666",
    uncommon: "#1b5e20",
    rare: "#0d47a1",
    mythic: "#6a1b9a",
}

// ─── Tiny card face ───
const CardFace = ({ card, compact = false }) => {
    const rarity = card.rarity || "common"
    return (
        <Box
            sx={{
                textAlign: "center",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 0.5,
            }}
        >
            <Typography
                sx={{
                    fontFamily: '"Cinzel", serif',
                    fontWeight: "bold",
                    fontSize: compact
                        ? { xs: "0.55rem", sm: "0.65rem" }
                        : { xs: "0.65rem", sm: "0.75rem", md: "0.85rem" },
                    lineHeight: 1.2,
                    wordBreak: "break-word",
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#f0e6d2" : "#1a1a1a",
                }}
            >
                {card.name}
            </Typography>
            {!compact && (
                <>
                    <Typography
                        sx={{
                            fontSize: { xs: "0.5rem", sm: "0.55rem" },
                            opacity: 0.7,
                            fontFamily: '"Cinzel", serif',
                            color: (theme) =>
                                theme.palette.mode === "dark" ? "#ccc" : "#555",
                        }}
                    >
                        {card.deck}
                    </Typography>
                    <Chip
                        label={rarity}
                        size='small'
                        sx={{
                            height: 16,
                            fontSize: "0.5rem",
                            fontWeight: "bold",
                            bgcolor: rarityColor[rarity],
                            color: "#fff",
                            alignSelf: "center",
                            mt: 0.5,
                        }}
                    />
                </>
            )}
        </Box>
    )
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
const PowerDeckManager = () => {
    const navigate = useNavigate()

    // ─── Zones ───
    const [deckCards, setDeckCards] = useState([]) // draw pile (shuffled)
    const [hand, setHand] = useState([]) // up to MAX_HAND_SIZE
    const [inPlay, setInPlay] = useState([]) // cards actively played
    const [discardPile, setDiscardPile] = useState([]) // discarded cards
    const [deckName, setDeckName] = useState("")
    const [deckImage, setDeckImage] = useState(null) // original PNG URL for deck back
    const [cardLog, setCardLog] = useState([])
    const [showLog, setShowLog] = useState(false)
    const [cardDescriptions, setCardDescriptions] = useState({}) // { "deck/name": { description, effect, ... } }
    const [detailCard, setDetailCard] = useState(null) // card for detail modal

    // UI state
    const [isDragOver, setIsDragOver] = useState(false)
    const [playingCardId, setPlayingCardId] = useState(null) // animation target
    const [discardingCardId, setDiscardingCardId] = useState(null)
    const [drawAnimating, setDrawAnimating] = useState(false)
    const [showDiscardPile, setShowDiscardPile] = useState(false)
    const [lastAction, setLastAction] = useState("") // for status message

    const fileInputRef = useRef(null)

    // ─── Action logging helper ───
    const logAction = useCallback((action) => {
        const timestamp = new Date().toLocaleTimeString()
        setCardLog((prev) => [...prev, `[${timestamp}] ${action}`])
    }, [])

    // ─── Undo / Redo ───
    const historyRef = useRef([]) // stack of { deckCards, hand, inPlay, discardPile } snapshots
    const futureRef = useRef([]) // stack for redo
    const [historyLength, setHistoryLength] = useState(0)
    const [futureLength, setFutureLength] = useState(0)

    const saveSnapshot = useCallback(() => {
        // cap history at 20 to avoid memory growth
        const snap = { deckCards, hand, inPlay, discardPile }
        historyRef.current = [...historyRef.current.slice(-19), snap]
        futureRef.current = []
        setHistoryLength(historyRef.current.length)
        setFutureLength(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, inPlay, discardPile])

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return
        const snap = historyRef.current[historyRef.current.length - 1]
        historyRef.current = historyRef.current.slice(0, -1)
        futureRef.current = [
            ...futureRef.current,
            { deckCards, hand, inPlay, discardPile },
        ]
        setDeckCards(snap.deckCards)
        setHand(snap.hand)
        setInPlay(snap.inPlay)
        setDiscardPile(snap.discardPile)
        setHistoryLength(historyRef.current.length)
        setFutureLength(futureRef.current.length)
        setLastAction("↩ Undid last action.")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, inPlay, discardPile])

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return
        const snap = futureRef.current[futureRef.current.length - 1]
        futureRef.current = futureRef.current.slice(0, -1)
        historyRef.current = [
            ...historyRef.current,
            { deckCards, hand, inPlay, discardPile },
        ]
        setDeckCards(snap.deckCards)
        setHand(snap.hand)
        setInPlay(snap.inPlay)
        setDiscardPile(snap.discardPile)
        setHistoryLength(historyRef.current.length)
        setFutureLength(futureRef.current.length)
        setLastAction("↪ Redid last action.")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, inPlay, discardPile])
    const fetchCardDescriptions = useCallback(async (cards) => {
        try {
            const { powers } = await fetchPowers()
            if (!powers || powers.length === 0) return

            const descMap = {}
            powers.forEach((p) => {
                const key = `${p.deck}/${p.name}`
                descMap[key] = p
            })

            // Only keep entries for cards in this deck
            const filtered = {}
            cards.forEach((c) => {
                const key = `${c.deck}/${c.name}`
                if (descMap[key]) {
                    filtered[key] = descMap[key]
                }
            })

            setCardDescriptions(filtered)
        } catch (err) {
            console.error("Error fetching card descriptions:", err)
        }
    }, [])

    // ─── Helper: get description for a card ───
    const getCardDescription = useCallback(
        (card) => {
            const key = `${card.deck}/${card.name}`
            return cardDescriptions[key] || null
        },
        [cardDescriptions],
    )

    // ─── Persist deck state to sessionStorage ───
    useEffect(() => {
        const saved = sessionStorage.getItem("imk_power_deck")
        if (saved) {
            try {
                const data = JSON.parse(saved)
                if (data.deckCards) setDeckCards(data.deckCards)
                if (data.hand) setHand(data.hand)
                if (data.inPlay) setInPlay(data.inPlay)
                if (data.discardPile) setDiscardPile(data.discardPile)
                if (data.deckName) setDeckName(data.deckName)
                if (data.deckImage) setDeckImage(data.deckImage)
                if (data.cardLog) setCardLog(data.cardLog)

                // Restore descriptions from API for persisted deck
                const allCards = [
                    ...(data.deckCards || []),
                    ...(data.hand || []),
                    ...(data.inPlay || []),
                    ...(data.discardPile || []),
                ]
                if (allCards.length > 0) {
                    fetchCardDescriptions(allCards)
                }
            } catch (e) {
                console.error("Error restoring deck session:", e)
            }
        }
    }, [fetchCardDescriptions])

    useEffect(() => {
        if (deckName) {
            sessionStorage.setItem(
                "imk_power_deck",
                JSON.stringify({
                    deckCards,
                    hand,
                    inPlay,
                    discardPile,
                    deckName,
                    deckImage,
                    cardLog,
                }),
            )
        }
    }, [deckCards, hand, inPlay, discardPile, deckName, deckImage, cardLog])

    // ─── Auto-reshuffle when deck is empty and discardPile has cards ───
    useEffect(() => {
        if (
            deckCards.length === 0 &&
            discardPile.length > 0 &&
            hand.length === 0 &&
            inPlay.length === 0
        ) {
            // All cards used – auto reshuffle
            const reshuffled = shuffle(discardPile)
            setDeckCards(reshuffled)
            setDiscardPile([])
            setLastAction(
                "All cards discarded — deck reshuffled automatically!",
            )
        }
    }, [
        deckCards.length,
        discardPile.length,
        hand.length,
        inPlay.length,
        discardPile,
    ])

    // ─── Load deck from file ───
    const loadDeckFromFile = useCallback(
        async (file) => {
            try {
                const deckData = await extractDeckDataFromPNG(file)
                if (!deckData) {
                    setLastAction("No deck data found in this file.")
                    return
                }

                const cards = (deckData.cards || []).map((c, idx) => ({
                    ...c,
                    uid: `${Date.now()}-${idx}-${Math.random()}`,
                }))

                const shuffled = shuffle(cards)
                setDeckCards(shuffled)
                setHand([])
                setInPlay([])
                setDiscardPile([])
                setDeckName(deckData.name || "Loaded Deck")

                // Store deck image URL from dropped file
                const imageUrl = URL.createObjectURL(file)
                setDeckImage(imageUrl)

                // Fetch descriptions from API
                fetchCardDescriptions(cards)

                setLastAction(
                    `Loaded "${deckData.name}" — ${cards.length} cards shuffled.`,
                )
            } catch (err) {
                console.error("Error loading deck:", err)
                setLastAction("Error loading deck file.")
            }
        },
        [fetchCardDescriptions],
    )

    // ─── Drag/drop handlers ───
    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file && file.name.endsWith(".png")) {
                loadDeckFromFile(file)
            } else {
                setLastAction("Please drop a .deck.png file.")
            }
        },
        [loadDeckFromFile],
    )

    const handleFileInput = useCallback(
        (e) => {
            const file = e.target.files[0]
            if (file) loadDeckFromFile(file)
        },
        [loadDeckFromFile],
    )

    // ─── Draw a card ───
    const drawCard = useCallback(() => {
        if (hand.length >= MAX_HAND_SIZE) {
            setLastAction("Hand is full! You can only hold 3 powers at once.")
            return
        }
        if (deckCards.length === 0) {
            if (discardPile.length > 0) {
                setLastAction(
                    "Deck empty. Reshuffle the discard pile first, or discard all cards in hand.",
                )
            } else {
                setLastAction("No cards left to draw.")
            }
            return
        }

        saveSnapshot()
        setDrawAnimating(true)
        setTimeout(() => {
            setDeckCards((prev) => {
                const [drawn, ...rest] = prev
                setHand((h) => [...h, drawn])
                logAction(`Drew: ${drawn.name} (${drawn.deck})`)
                return rest
            })
            setDrawAnimating(false)
            setLastAction("Drew a power card.")
        }, 300)
    }, [
        hand.length,
        deckCards.length,
        discardPile.length,
        logAction,
        saveSnapshot,
    ])

    // ─── Play a card from hand → in-play zone ───
    const playCard = useCallback(
        (uid) => {
            saveSnapshot()
            setPlayingCardId(uid)
            setTimeout(() => {
                setHand((prev) => {
                    const card = prev.find((c) => c.uid === uid)
                    if (card) {
                        setInPlay((ip) => [...ip, card])
                        logAction(`Played: ${card.name}`)
                    }
                    return prev.filter((c) => c.uid !== uid)
                })
                setPlayingCardId(null)
                setLastAction("Played a power!")
            }, 400)
        },
        [logAction, saveSnapshot],
    )

    // ─── Discard a card from hand → discard pile ───
    const discardFromHand = useCallback(
        (uid) => {
            saveSnapshot()
            setDiscardingCardId(uid)
            setTimeout(() => {
                setHand((prev) => {
                    const card = prev.find((c) => c.uid === uid)
                    if (card) {
                        setDiscardPile((dp) => [...dp, card])
                        logAction(`Discarded from hand: ${card.name}`)
                    }
                    return prev.filter((c) => c.uid !== uid)
                })
                setDiscardingCardId(null)
                setLastAction("Discarded a power from hand.")
            }, 300)
        },
        [logAction, saveSnapshot],
    )

    // ─── Discard ALL cards from hand (rule: you must discard entire hand to replace) ───
    const discardEntireHand = useCallback(() => {
        if (hand.length === 0) return
        saveSnapshot()
        setDiscardPile((dp) => [...dp, ...hand])
        logAction(`Discarded entire hand (${hand.length} cards)`)
        setHand([])
        setLastAction("Discarded entire hand.")
    }, [hand, logAction, saveSnapshot])

    // ─── Discard from in-play → discard pile ───
    const discardFromPlay = useCallback(
        (uid) => {
            saveSnapshot()
            setInPlay((prev) => {
                const card = prev.find((c) => c.uid === uid)
                if (card) {
                    setDiscardPile((dp) => [...dp, card])
                    logAction(`Discarded from play: ${card.name}`)
                }
                return prev.filter((c) => c.uid !== uid)
            })
            setLastAction("Removed played power to discard pile.")
        },
        [logAction, saveSnapshot],
    )

    // ─── Manual reshuffle: discard pile → deck (keeps hand & in-play) ───
    const reshuffleDeck = useCallback(() => {
        if (discardPile.length === 0) {
            setLastAction("Discard pile is empty — nothing to reshuffle.")
            return
        }
        saveSnapshot()
        const reshuffled = shuffle(discardPile)
        setDeckCards((prev) => shuffle([...prev, ...reshuffled]))
        setDiscardPile([])
        setLastAction(
            `Reshuffled ${reshuffled.length} cards back into the deck.`,
        )
    }, [discardPile, saveSnapshot])

    // ─── Grit Teeth: auto-draw 3 (combat respite, no Focus test) ───
    const gritTeeth = useCallback(() => {
        // Grit Teeth: draw up to 3 from deck, no test needed
        const drawCount = Math.min(
            MAX_HAND_SIZE - hand.length,
            deckCards.length,
        )
        if (drawCount <= 0) {
            setLastAction(
                hand.length >= MAX_HAND_SIZE
                    ? "Hand already full."
                    : "No cards in deck to draw.",
            )
            return
        }
        const drawn = deckCards.slice(0, drawCount)
        setDeckCards((prev) => prev.slice(drawCount))
        setHand((prev) => [...prev, ...drawn])
        setLastAction(
            `Grit Teeth — drew ${drawCount} power${drawCount > 1 ? "s" : ""}!`,
        )
    }, [hand.length, deckCards])

    // ─── Keyboard shortcuts: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo ───
    useEffect(() => {
        const onKey = (e) => {
            const mod = e.ctrlKey || e.metaKey
            if (!mod) return
            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault()
                undo()
            }
            if (e.key === "z" && e.shiftKey) {
                e.preventDefault()
                redo()
            }
            if (e.key === "y") {
                e.preventDefault()
                redo()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [undo, redo])

    // ─── Unload deck ───
    const unloadDeck = useCallback(() => {
        logAction("Removed deck")
        setDeckCards([])
        setHand([])
        setInPlay([])
        setDiscardPile([])
        setDeckName("")
        setDeckImage(null)
        setLastAction("")
        sessionStorage.removeItem("imk_power_deck")
    }, [logAction])

    // ─── Total card counts ───
    const totalCards =
        deckCards.length + hand.length + inPlay.length + discardPile.length
    const hasLoadedDeck = totalCards > 0 || deckName

    // ═══════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════
    return (
        <Box sx={{ mt: 2, mb: "100px" }}>
            {/* Section Header */}
            <Typography
                variant='h4'
                component='h2'
                gutterBottom
                sx={{
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: {
                        xs: "1.5rem",
                        sm: "2rem",
                        md: "2.25rem",
                    },
                    mb: 1,
                    fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#000000",
                }}
            >
                Power Deck
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    textAlign: "center",
                    mb: 3,
                    opacity: 0.8,
                    fontFamily: '"Cinzel", serif',
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#ccc" : "#333",
                    maxWidth: 600,
                    mx: "auto",
                }}
            >
                {hasLoadedDeck
                    ? "Draw powers into your hand, play them, and manage your discard pile."
                    : "Drag your .deck.png here or click to load your power deck."}
            </Typography>

            {/* ─── Drop Zone / Deck Loaded ─── */}
            {!hasLoadedDeck ? (
                /* Empty state — drop zone */
                <>
                    <Paper
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            p: 4,
                            textAlign: "center",
                            cursor: "pointer",
                            border: (theme) =>
                                isDragOver
                                    ? "3px dashed #8B0000"
                                    : theme.palette.mode === "dark"
                                      ? "2px dashed rgba(255,255,255,0.3)"
                                      : "2px dashed rgba(0,0,0,0.2)",
                            borderRadius: "16px",
                            bgcolor: (theme) =>
                                isDragOver
                                    ? theme.palette.mode === "dark"
                                        ? "rgba(139,0,0,0.15)"
                                        : "rgba(139,0,0,0.06)"
                                    : theme.palette.mode === "dark"
                                      ? "rgba(255,255,255,0.03)"
                                      : "rgba(0,0,0,0.02)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                                borderColor: "#8B0000",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(139,0,0,0.1)"
                                        : "rgba(139,0,0,0.04)",
                            },
                            minHeight: 160,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1.5,
                        }}
                    >
                        <Upload
                            sx={{
                                fontSize: 48,
                                opacity: 0.5,
                                color: isDragOver ? "#8B0000" : "inherit",
                            }}
                        />
                        <Typography
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                fontWeight: "bold",
                                fontSize: { xs: "0.95rem", sm: "1.1rem" },
                                color: isDragOver
                                    ? "#8B0000"
                                    : (theme) =>
                                          theme.palette.mode === "dark"
                                              ? "#e0e0e0"
                                              : "#333",
                            }}
                        >
                            {isDragOver
                                ? "Drop your deck here!"
                                : "Drag & drop your .deck.png"}
                        </Typography>
                        <Typography
                            variant='caption'
                            sx={{
                                opacity: 0.6,
                                fontFamily: '"Cinzel", serif',
                            }}
                        >
                            Built in the Deck Builder
                        </Typography>
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='.png'
                            style={{ display: "none" }}
                            onChange={handleFileInput}
                        />
                    </Paper>
                    <Typography
                        onClick={() => navigate("/deck-builder")}
                        sx={{
                            textAlign: "center",
                            mt: 2,
                            cursor: "pointer",
                            fontFamily: '"Cinzel", serif',
                            fontSize: { xs: "0.8rem", sm: "0.9rem" },
                            color: (theme) =>
                                theme.palette.mode === "dark" ? "#aaa" : "#666",
                            "&:hover": {
                                color: "#8B0000",
                                textDecoration: "underline",
                            },
                            transition: "color 0.2s",
                        }}
                    >
                        or click here to build a new deck
                    </Typography>
                </>
            ) : (
                /* Deck is loaded — game board */
                <Paper
                    sx={{
                        p: { xs: 2, sm: 3 },
                        borderRadius: "16px",
                        border: (theme) =>
                            theme.palette.mode === "dark"
                                ? "2px solid #ffffff"
                                : "2px solid #000000",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.02)",
                    }}
                >
                    {/* Deck header row */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 2,
                            flexWrap: "wrap",
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Style sx={{ color: "#8B0000" }} />
                            <Typography
                                sx={{
                                    fontFamily:
                                        '"Cinzel Decorative", "Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: { xs: "1rem", sm: "1.2rem" },
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#1a1a1a",
                                }}
                            >
                                {deckName}
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            <Chip
                                icon={<Layers sx={{ fontSize: 14 }} />}
                                label={`Deck: ${deckCards.length}`}
                                size='small'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: "0.7rem",
                                }}
                            />
                            <Chip
                                icon={<LayersClear sx={{ fontSize: 14 }} />}
                                label={`Discard: ${discardPile.length}`}
                                size='small'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: "0.7rem",
                                    cursor: "pointer",
                                }}
                                onClick={() =>
                                    setShowDiscardPile(!showDiscardPile)
                                }
                            />
                            <Chip
                                label={`Total: ${totalCards}`}
                                size='small'
                                variant='outlined'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontSize: "0.65rem",
                                }}
                            />
                        </Box>
                    </Box>

                    {/* ─── In-Play Zone ─── */}
                    {inPlay.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                sx={{
                                    fontFamily:
                                        '"Cinzel Decorative", "Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: { xs: "0.9rem", sm: "1rem" },
                                    mb: 1,
                                    color: "#8B0000",
                                    textAlign: "center",
                                }}
                            >
                                In Play
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: { xs: 1.5, sm: 2 },
                                    justifyContent: "center",
                                    flexWrap: "wrap",
                                    p: 2,
                                    borderRadius: "12px",
                                    border: "2px solid rgba(139,0,0,0.3)",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(139,0,0,0.06)"
                                            : "rgba(139,0,0,0.03)",
                                    minHeight: { xs: 90, sm: 110 },
                                    alignItems: "flex-start",
                                }}
                            >
                                {inPlay.map((card) => {
                                    const fullCard = getCardDescription(card)
                                    return (
                                        <Box
                                            key={card.uid}
                                            sx={{
                                                transition:
                                                    "transform 0.25s, filter 0.25s",
                                                "&:hover": {
                                                    transform:
                                                        "translateY(-10px) scale(1.12)",
                                                    zIndex: 10,
                                                    position: "relative",
                                                },
                                            }}
                                        >
                                            <Zoom in timeout={400}>
                                                <Paper
                                                    elevation={8}
                                                    sx={{
                                                        width: {
                                                            xs: 110,
                                                            sm: 140,
                                                        },
                                                        height: {
                                                            xs: 165,
                                                            sm: 210,
                                                        },
                                                        aspectRatio: "2/3",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        borderRadius: "12px",
                                                        border: "2px solid #8B0000",
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(60,10,10,0.95)"
                                                                : "#fff5f0",
                                                        boxShadow:
                                                            "0 6px 20px rgba(139,0,0,0.4)",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {/* Card Art */}
                                                    <Box
                                                        sx={{
                                                            width: "100%",
                                                            height: "55%",
                                                            bgcolor: "#f5f0e6",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            borderBottom:
                                                                "1px solid rgba(139,0,0,0.2)",
                                                            overflow: "hidden",
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

                                                    {/* Card Info */}
                                                    <Box
                                                        sx={{
                                                            height: "45%",
                                                            p: {
                                                                xs: 0.75,
                                                                sm: 1,
                                                            },
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 0.5,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {/* Title & Rarity */}
                                                        <Box
                                                            sx={{
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <Typography
                                                                sx={{
                                                                    fontFamily:
                                                                        '"Cinzel", serif',
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize: {
                                                                        xs: "0.65rem",
                                                                        sm: "0.75rem",
                                                                    },
                                                                    lineHeight: 1.1,
                                                                    color: (
                                                                        theme,
                                                                    ) =>
                                                                        theme
                                                                            .palette
                                                                            .mode ===
                                                                        "dark"
                                                                            ? "#f0e6d2"
                                                                            : "#1a1a1a",
                                                                    wordBreak:
                                                                        "break-word",
                                                                }}
                                                            >
                                                                {card.name}
                                                            </Typography>
                                                            <Box
                                                                sx={{
                                                                    display:
                                                                        "flex",
                                                                    gap: 0.5,
                                                                    mt: 0.25,
                                                                }}
                                                            >
                                                                <Chip
                                                                    label={
                                                                        card.rarity ||
                                                                        "common"
                                                                    }
                                                                    size='small'
                                                                    sx={{
                                                                        height: 14,
                                                                        fontSize:
                                                                            "0.4rem",
                                                                        fontWeight:
                                                                            "bold",
                                                                        bgcolor:
                                                                            rarityColor[
                                                                                card.rarity ||
                                                                                    "common"
                                                                            ],
                                                                        color: "#fff",
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>

                                                        {/* Action Buttons */}
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                gap: 0.5,
                                                                justifyContent:
                                                                    "center",
                                                                alignItems:
                                                                    "center",
                                                            }}
                                                        >
                                                            <Tooltip title='More info'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        setDetailCard(
                                                                            {
                                                                                ...card,
                                                                                ...(fullCard ||
                                                                                    {}),
                                                                            },
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        bgcolor:
                                                                            "rgba(30,100,180,0.85)",
                                                                        color: "#fff",
                                                                        width: 26,
                                                                        height: 26,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "#1565c0",
                                                                            },
                                                                    }}
                                                                >
                                                                    <MenuBook
                                                                        sx={{
                                                                            fontSize: 13,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title='Discard'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={() =>
                                                                        discardFromPlay(
                                                                            card.uid,
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        bgcolor:
                                                                            "rgba(100,100,100,0.85)",
                                                                        color: "#fff",
                                                                        width: 26,
                                                                        height: 26,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "#666",
                                                                            },
                                                                    }}
                                                                >
                                                                    <LayersClear
                                                                        sx={{
                                                                            fontSize: 13,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            </Zoom>
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* ─── Hand ─── */}
                    <Box sx={{ mb: 3 }}>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 1.5,
                                flexWrap: "wrap",
                                gap: 1,
                            }}
                        >
                            <Typography
                                sx={{
                                    fontFamily:
                                        '"Cinzel Decorative", "Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: { xs: "0.95rem", sm: "1.1rem" },
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#1a1a1a",
                                }}
                            >
                                Your Hand ({hand.length}/{MAX_HAND_SIZE})
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                }}
                            >
                                {hand.length > 0 && (
                                    <Tooltip title='Discard entire hand (rule: you must discard all to replace)'>
                                        <Button
                                            size='small'
                                            color='error'
                                            startIcon={
                                                <Delete sx={{ fontSize: 14 }} />
                                            }
                                            onClick={discardEntireHand}
                                            sx={{
                                                fontFamily: '"Cinzel", serif',
                                                textTransform: "none",
                                                fontSize: "0.7rem",
                                            }}
                                        >
                                            Discard All
                                        </Button>
                                    </Tooltip>
                                )}
                                <Button
                                    size='small'
                                    variant='outlined'
                                    onClick={() => setShowLog(true)}
                                    sx={{
                                        fontFamily: '"Cinzel", serif',
                                        textTransform: "none",
                                        fontSize: "0.7rem",
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255,255,255,0.3)"
                                                : "rgba(0,0,0,0.3)",
                                    }}
                                >
                                    Card Play Log
                                </Button>
                                <Tooltip
                                    title={`Undo (Ctrl+Z) — ${historyLength} step${historyLength !== 1 ? "s" : ""} available`}
                                >
                                    <span>
                                        <IconButton
                                            size='small'
                                            onClick={undo}
                                            disabled={historyLength === 0}
                                            sx={{
                                                opacity:
                                                    historyLength === 0
                                                        ? 0.3
                                                        : 1,
                                            }}
                                        >
                                            <Undo sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip
                                    title={`Redo (Ctrl+Shift+Z) — ${futureLength} step${futureLength !== 1 ? "s" : ""} available`}
                                >
                                    <span>
                                        <IconButton
                                            size='small'
                                            onClick={redo}
                                            disabled={futureLength === 0}
                                            sx={{
                                                opacity:
                                                    futureLength === 0
                                                        ? 0.3
                                                        : 1,
                                            }}
                                        >
                                            <Redo sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: "flex",
                                gap: { xs: 1, sm: 1.5 },
                                justifyContent: "center",
                                flexWrap: "wrap",
                                alignItems: "flex-start",
                                overflow: "visible",
                                p: 1,
                            }}
                        >
                            {hand.length === 0 ? (
                                <Typography
                                    sx={{
                                        opacity: 0.4,
                                        fontFamily: '"Cinzel", serif',
                                        fontSize: "0.85rem",
                                        textAlign: "center",
                                    }}
                                >
                                    No powers gathered — draw from your deck
                                </Typography>
                            ) : (
                                hand.map((card) => {
                                    const fullCard = getCardDescription(card)
                                    return (
                                        <Box
                                            key={card.uid}
                                            sx={{
                                                transition: "transform 0.25s",
                                                "&:hover": {
                                                    transform:
                                                        "translateY(-10px) scale(1.12)",
                                                    zIndex: 10,
                                                    position: "relative",
                                                },
                                            }}
                                        >
                                            <Zoom
                                                in={
                                                    playingCardId !==
                                                        card.uid &&
                                                    discardingCardId !==
                                                        card.uid
                                                }
                                                timeout={300}
                                            >
                                                <Paper
                                                    elevation={3}
                                                    sx={{
                                                        width: {
                                                            xs: 110,
                                                            sm: 140,
                                                        },
                                                        height: {
                                                            xs: 165,
                                                            sm: 210,
                                                        },
                                                        aspectRatio: "2/3",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        borderRadius: "12px",
                                                        border: `2px solid ${rarityBorder[card.rarity || "common"]}`,
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(30,15,5,0.9)"
                                                                : "#faf6ef",
                                                        boxShadow:
                                                            "0 4px 12px rgba(139,0,0,0.2)",
                                                        overflow: "hidden",
                                                        // Playing animation
                                                        ...(playingCardId ===
                                                            card.uid && {
                                                            animation:
                                                                "cardPlay 0.4s ease-out forwards",
                                                            perspective:
                                                                "1000px",
                                                            "@keyframes cardPlay":
                                                                {
                                                                    "0%": {
                                                                        transform:
                                                                            "scale(1) translateY(0)",
                                                                        opacity: 1,
                                                                    },
                                                                    "50%": {
                                                                        transform:
                                                                            "scale(1.15) translateY(-20px) rotateY(0deg)",
                                                                        opacity: 1,
                                                                        boxShadow:
                                                                            "0 12px 40px rgba(139,0,0,0.5)",
                                                                    },
                                                                    "100%": {
                                                                        transform:
                                                                            "scale(0.9) translateY(30px) rotateY(90deg)",
                                                                        opacity: 0,
                                                                    },
                                                                },
                                                        }),
                                                        // Discard animation
                                                        ...(discardingCardId ===
                                                            card.uid && {
                                                            animation:
                                                                "cardDiscard 0.3s ease-in forwards",
                                                            perspective:
                                                                "1000px",
                                                            "@keyframes cardDiscard":
                                                                {
                                                                    "0%": {
                                                                        transform:
                                                                            "scale(1) rotate(0)",
                                                                        opacity: 1,
                                                                    },
                                                                    "100%": {
                                                                        transform:
                                                                            "scale(0.6) rotate(15deg) translateX(50px) rotateY(90deg)",
                                                                        opacity: 0,
                                                                    },
                                                                },
                                                        }),
                                                    }}
                                                >
                                                    {/* Card Art */}
                                                    <Box
                                                        sx={{
                                                            width: "100%",
                                                            height: "60%",
                                                            bgcolor: "#f5f0e6",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            borderBottom:
                                                                "1px solid rgba(139,0,0,0.2)",
                                                            overflow: "hidden",
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

                                                    {/* Card Info and Actions */}
                                                    <Box
                                                        sx={{
                                                            height: "40%",
                                                            p: 0.75,
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: 0.5,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {/* Title */}
                                                        <Box>
                                                            <Typography
                                                                sx={{
                                                                    fontFamily:
                                                                        '"Cinzel", serif',
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize:
                                                                        "0.6rem",
                                                                    lineHeight: 1.1,
                                                                    color: (
                                                                        theme,
                                                                    ) =>
                                                                        theme
                                                                            .palette
                                                                            .mode ===
                                                                        "dark"
                                                                            ? "#f0e6d2"
                                                                            : "#1a1a1a",
                                                                    wordBreak:
                                                                        "break-word",
                                                                }}
                                                            >
                                                                {card.name}
                                                            </Typography>
                                                            <Chip
                                                                label={
                                                                    card.rarity ||
                                                                    "common"
                                                                }
                                                                size='small'
                                                                sx={{
                                                                    height: 12,
                                                                    fontSize:
                                                                        "0.35rem",
                                                                    fontWeight:
                                                                        "bold",
                                                                    bgcolor:
                                                                        rarityColor[
                                                                            card.rarity ||
                                                                                "common"
                                                                        ],
                                                                    color: "#fff",
                                                                    mt: 0.25,
                                                                }}
                                                            />
                                                        </Box>

                                                        {/* Action Buttons */}
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                gap: 0.5,
                                                                justifyContent:
                                                                    "center",
                                                                alignItems:
                                                                    "center",
                                                            }}
                                                        >
                                                            <Tooltip title='More info'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        setDetailCard(
                                                                            {
                                                                                ...card,
                                                                                ...(fullCard ||
                                                                                    {}),
                                                                            },
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        bgcolor:
                                                                            "rgba(30,100,180,0.85)",
                                                                        color: "#fff",
                                                                        width: 22,
                                                                        height: 22,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "#1565c0",
                                                                            },
                                                                    }}
                                                                >
                                                                    <MenuBook
                                                                        sx={{
                                                                            fontSize: 11,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title='Play'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        playCard(
                                                                            card.uid,
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        bgcolor:
                                                                            "rgba(139,0,0,0.85)",
                                                                        color: "#fff",
                                                                        width: 28,
                                                                        height: 28,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "#a00",
                                                                            },
                                                                    }}
                                                                >
                                                                    <KeyboardDoubleArrowUp
                                                                        sx={{
                                                                            fontSize: 14,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title='Discard'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        discardFromHand(
                                                                            card.uid,
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        bgcolor:
                                                                            "rgba(100,100,100,0.85)",
                                                                        color: "#fff",
                                                                        width: 22,
                                                                        height: 22,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "#666",
                                                                            },
                                                                    }}
                                                                >
                                                                    <LayersClear
                                                                        sx={{
                                                                            fontSize: 11,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </Box>
                                                </Paper>
                                            </Zoom>
                                        </Box>
                                    )
                                })
                            )}
                        </Box>
                    </Box>

                    {/* ─── Deck + Draw Area ─── */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: { xs: 2, sm: 3 },
                            mb: 3,
                        }}
                    >
                        {/* Deck pile visual */}
                        <Tooltip title={`${deckCards.length} cards in deck`}>
                            <Box
                                onClick={drawCard}
                                sx={{
                                    position: "relative",
                                    cursor:
                                        deckCards.length > 0
                                            ? "pointer"
                                            : "default",
                                    opacity: deckCards.length > 0 ? 1 : 0.3,
                                    transition: "transform 0.2s",
                                    "&:hover": {
                                        transform:
                                            deckCards.length > 0
                                                ? "scale(1.05)"
                                                : "none",
                                    },
                                }}
                            >
                                {/* Stacked card backs */}
                                {[2, 1, 0].map((offset) =>
                                    deckCards.length > offset ? (
                                        <Box
                                            key={offset}
                                            sx={{
                                                position:
                                                    offset === 0
                                                        ? "relative"
                                                        : "absolute",
                                                top: offset * -2,
                                                left: offset * 1,
                                                width: {
                                                    xs: 80,
                                                    sm: 100,
                                                    md: 120,
                                                },
                                                height: {
                                                    xs: 112,
                                                    sm: 140,
                                                    md: 168,
                                                },
                                                borderRadius: "10px",
                                                border: "2px solid #8B0000",
                                                bgcolor: "#1a0a0a",
                                                backgroundImage: deckImage
                                                    ? `url(${deckImage})`
                                                    : "none",
                                                backgroundSize: "cover",
                                                backgroundPosition: "center",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                boxShadow:
                                                    "0 2px 8px rgba(0,0,0,0.4)",
                                                ...(drawAnimating &&
                                                    offset === 0 && {
                                                        animation:
                                                            "deckDraw 0.3s ease-out",
                                                        "@keyframes deckDraw": {
                                                            "0%": {
                                                                transform:
                                                                    "translateX(0) rotateY(0)",
                                                            },
                                                            "50%": {
                                                                transform:
                                                                    "translateX(40px) rotateY(90deg)",
                                                            },
                                                            "100%": {
                                                                transform:
                                                                    "translateX(80px) rotateY(0) scale(0.8)",
                                                                opacity: 0,
                                                            },
                                                        },
                                                    }),
                                            }}
                                        >
                                            {!deckImage && (
                                                <Typography
                                                    sx={{
                                                        fontFamily:
                                                            '"Cinzel Decorative", serif',
                                                        color: "#8B0000",
                                                        fontSize: {
                                                            xs: "0.6rem",
                                                            sm: "0.75rem",
                                                        },
                                                        fontWeight: "bold",
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    DECK
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : null,
                                )}
                                {deckCards.length === 0 && (
                                    <Box
                                        sx={{
                                            width: { xs: 80, sm: 100, md: 120 },
                                            height: {
                                                xs: 112,
                                                sm: 140,
                                                md: 168,
                                            },
                                            borderRadius: "10px",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "2px dashed rgba(255,255,255,0.15)"
                                                    : "2px dashed rgba(0,0,0,0.15)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                opacity: 0.4,
                                                fontSize: "0.7rem",
                                                fontFamily: '"Cinzel", serif',
                                            }}
                                        >
                                            Empty
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Tooltip>

                        {/* Draw / Action buttons */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >
                            <Button
                                variant='contained'
                                startIcon={<D10Icon size={22} />}
                                onClick={drawCard}
                                disabled={
                                    deckCards.length === 0 ||
                                    hand.length >= MAX_HAND_SIZE
                                }
                                sx={{
                                    bgcolor: "#8B0000",
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                    textTransform: "none",
                                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                                    borderRadius: "10px",
                                    "&:hover": { bgcolor: "#a00" },
                                    "&:disabled": {
                                        bgcolor: "rgba(139,0,0,0.3)",
                                        color: "rgba(255,255,255,0.4)",
                                    },
                                }}
                            >
                                Draw ({hand.length}/{MAX_HAND_SIZE})
                            </Button>
                            <Button
                                variant='outlined'
                                startIcon={<Shuffle />}
                                onClick={reshuffleDeck}
                                disabled={discardPile.length === 0}
                                size='small'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    textTransform: "none",
                                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                    borderRadius: "10px",
                                    borderColor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.3)"
                                            : "rgba(0,0,0,0.3)",
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#333",
                                    "&:hover": {
                                        borderColor: "#8B0000",
                                        color: "#8B0000",
                                    },
                                }}
                            >
                                Reshuffle
                            </Button>
                            <Button
                                variant='outlined'
                                onClick={gritTeeth}
                                disabled={
                                    hand.length >= MAX_HAND_SIZE ||
                                    deckCards.length === 0
                                }
                                size='small'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    textTransform: "none",
                                    fontSize: { xs: "0.6rem", sm: "0.7rem" },
                                    borderRadius: "10px",
                                    borderColor: "#c77d00",
                                    color: "#c77d00",
                                    "&:hover": {
                                        borderColor: "#e8a700",
                                        color: "#e8a700",
                                        bgcolor: "rgba(199,125,0,0.08)",
                                    },
                                }}
                            >
                                Grit Teeth
                            </Button>
                        </Box>

                        {/* Discard pile visual */}
                        <Tooltip
                            title={`${discardPile.length} cards in discard pile — click to view`}
                        >
                            <Box
                                onClick={() =>
                                    discardPile.length > 0 &&
                                    setShowDiscardPile(!showDiscardPile)
                                }
                                sx={{
                                    position: "relative",
                                    cursor:
                                        discardPile.length > 0
                                            ? "pointer"
                                            : "default",
                                    opacity: discardPile.length > 0 ? 1 : 0.3,
                                    transition: "transform 0.2s",
                                    "&:hover": {
                                        transform:
                                            discardPile.length > 0
                                                ? "scale(1.05)"
                                                : "none",
                                    },
                                }}
                            >
                                {discardPile.length > 0 ? (
                                    <Box
                                        sx={{
                                            width: { xs: 80, sm: 100, md: 120 },
                                            height: {
                                                xs: 112,
                                                sm: 140,
                                                md: 168,
                                            },
                                            borderRadius: "10px",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "2px solid rgba(255,255,255,0.3)"
                                                    : "2px solid rgba(0,0,0,0.3)",
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(255,255,255,0.05)"
                                                    : "rgba(0,0,0,0.05)",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 0.5,
                                        }}
                                    >
                                        <LayersClear
                                            sx={{
                                                fontSize: 28,
                                                opacity: 0.5,
                                            }}
                                        />
                                        <Typography
                                            sx={{
                                                fontSize: "0.7rem",
                                                fontFamily: '"Cinzel", serif',
                                                fontWeight: "bold",
                                            }}
                                        >
                                            Discard
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: "1.2rem",
                                                fontWeight: "bold",
                                                fontFamily: '"Cinzel", serif',
                                            }}
                                        >
                                            {discardPile.length}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            width: { xs: 80, sm: 100, md: 120 },
                                            height: {
                                                xs: 112,
                                                sm: 140,
                                                md: 168,
                                            },
                                            borderRadius: "10px",
                                            border: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "2px dashed rgba(255,255,255,0.15)"
                                                    : "2px dashed rgba(0,0,0,0.15)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                opacity: 0.4,
                                                fontSize: "0.7rem",
                                                fontFamily: '"Cinzel", serif',
                                            }}
                                        >
                                            Discard
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>

                    {/* Status message */}
                    {lastAction && (
                        <Fade in>
                            <Typography
                                sx={{
                                    textAlign: "center",
                                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                                    fontFamily: '"Cinzel", serif',
                                    fontStyle: "italic",
                                    mb: 2,
                                    opacity: 0.8,
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#ccc"
                                            : "#555",
                                }}
                            >
                                {lastAction}
                            </Typography>
                        </Fade>
                    )}

                    {/* ─── Discard Pile (expandable) ─── */}
                    <Collapse in={showDiscardPile && discardPile.length > 0}>
                        <Box sx={{ mb: 2 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 1,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontFamily: '"Cinzel", serif',
                                        fontWeight: "bold",
                                        fontSize: "0.9rem",
                                        opacity: 0.7,
                                    }}
                                >
                                    Discard Pile ({discardPile.length})
                                </Typography>
                                <IconButton
                                    size='small'
                                    onClick={() => setShowDiscardPile(false)}
                                >
                                    <Close sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                    justifyContent: "center",
                                    p: 1.5,
                                    borderRadius: "10px",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255,255,255,0.1)"
                                            : "1px solid rgba(0,0,0,0.1)",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.02)"
                                            : "rgba(0,0,0,0.02)",
                                    maxHeight: 300,
                                    overflowY: "auto",
                                }}
                            >
                                {discardPile.map((card) => (
                                    <Paper
                                        key={card.uid}
                                        elevation={1}
                                        sx={{
                                            width: { xs: 70, sm: 85 },
                                            height: { xs: 98, sm: 119 },
                                            borderRadius: "8px",
                                            border: `1px solid ${rarityBorder[card.rarity || "common"]}`,
                                            bgcolor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "rgba(40,20,10,0.8)"
                                                    : "#f0ebe4",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            p: 0.5,
                                            opacity: 0.6,
                                            filter: "grayscale(40%)",
                                        }}
                                    >
                                        <CardFace card={card} compact />
                                    </Paper>
                                ))}
                            </Box>
                        </Box>
                    </Collapse>

                    {/* ─── Bottom action row ─── */}
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 1,
                            mt: 1,
                            flexWrap: "wrap",
                        }}
                    >
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<Upload sx={{ fontSize: 14 }} />}
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                                fontSize: "0.7rem",
                                borderRadius: "8px",
                                borderColor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255,255,255,0.2)"
                                        : "rgba(0,0,0,0.2)",
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#ccc"
                                        : "#555",
                            }}
                        >
                            Load Different Deck
                        </Button>
                        <Button
                            size='small'
                            variant='outlined'
                            color='error'
                            startIcon={<Close sx={{ fontSize: 14 }} />}
                            onClick={unloadDeck}
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                                fontSize: "0.7rem",
                                borderRadius: "8px",
                            }}
                        >
                            Remove Deck
                        </Button>
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='.png'
                            style={{ display: "none" }}
                            onChange={handleFileInput}
                        />
                    </Box>
                </Paper>
            )}

            {/* ═══ Card Detail Modal ═══ */}
            <Modal
                open={!!detailCard}
                onClose={() => setDetailCard(null)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Paper
                    sx={{
                        width: { xs: "92%", sm: 420 },
                        maxHeight: "90vh",
                        overflow: "auto",
                        borderRadius: "16px",
                        outline: "none",
                        position: "relative",
                    }}
                >
                    {detailCard && (
                        <>
                            {/* Close */}
                            <IconButton
                                onClick={() => setDetailCard(null)}
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

                            {/* Header */}
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
                                    {detailCard.name}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        mt: 1,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Chip
                                        label={detailCard.rarity || "common"}
                                        size='small'
                                        variant='outlined'
                                        sx={{
                                            borderColor: "#fff",
                                            color: "#fff",
                                        }}
                                    />
                                    <Chip
                                        label={detailCard.deck || "Unknown"}
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
                                    {...getCardImageProps(detailCard)}
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
                                    {detailCard.description ||
                                        "No description available."}
                                </Typography>

                                {detailCard.effect && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography
                                            variant='subtitle2'
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 0.5,
                                            }}
                                        >
                                            Effect:
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                        >
                                            {detailCard.effect}
                                        </Typography>
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />

                                <Button
                                    fullWidth
                                    variant='outlined'
                                    onClick={() => setDetailCard(null)}
                                    sx={{
                                        fontFamily: '"Cinzel", serif',
                                        textTransform: "none",
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "rgba(255,255,255,0.3)"
                                                : "rgba(0,0,0,0.3)",
                                    }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>
            </Modal>

            {/* ═══════════════════════════════════════════════════════════
                Card Play Log Modal
            ═══════════════════════════════════════════════════════════ */}
            <Modal
                open={showLog}
                onClose={() => setShowLog(false)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Paper
                    sx={{
                        width: { xs: "90%", sm: 500 },
                        maxHeight: "80vh",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: "16px",
                        outline: "none",
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(0,0,0,0.8)"
                                    : "rgba(0,0,0,0.9)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography
                            variant='h6'
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                fontWeight: "bold",
                            }}
                        >
                            Card Play Log
                        </Typography>
                        <IconButton
                            onClick={() => setShowLog(false)}
                            sx={{ color: "#fff" }}
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Log Content */}
                    <Box
                        sx={{
                            flex: 1,
                            p: 2,
                            overflow: "auto",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: (theme) =>
                                theme.palette.mode === "dark" ? "#aaa" : "#555",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.02)"
                                    : "rgba(0,0,0,0.02)",
                        }}
                    >
                        {cardLog.length === 0 ? (
                            <Typography
                                sx={{
                                    opacity: 0.5,
                                    fontFamily: '"Cinzel", serif',
                                }}
                            >
                                No actions logged yet.
                            </Typography>
                        ) : (
                            cardLog.map((entry, idx) => (
                                <div key={idx}>{entry}</div>
                            ))
                        )}
                    </Box>

                    {/* Footer with Download Button */}
                    <Box
                        sx={{
                            p: 2,
                            borderTop: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            variant='outlined'
                            onClick={() => setShowLog(false)}
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            variant='contained'
                            onClick={() => {
                                const logText = cardLog.join("\n")
                                const blob = new Blob([logText], {
                                    type: "text/plain",
                                })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = `card-log-${new Date().toISOString().slice(0, 10)}.txt`
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                            }}
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                                bgcolor: "#8B0000",
                                "&:hover": { bgcolor: "#a00" },
                            }}
                        >
                            Download as .txt
                        </Button>
                    </Box>
                </Paper>
            </Modal>
        </Box>
    )
}

export default PowerDeckManager
