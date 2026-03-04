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
    TextField,
    InputAdornment,
    Popover,
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
    FlipToBack,
    Search,
    RotateRight,
    ReplyAll,
    Star,
    StarBorder,
    VerticalAlignTop,
    Add,
    Remove,
    AutoAwesome,
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
    const [hand, setHand] = useState([]) // up to handSizeLimit
    const [handSizeLimit, setHandSizeLimit] = useState(MAX_HAND_SIZE)
    const handSizeLimitRef = useRef(MAX_HAND_SIZE)
    useEffect(() => {
        handSizeLimitRef.current = handSizeLimit
    }, [handSizeLimit])
    const [charges, setCharges] = useState([]) // face-down charged cards (fuel for rare/mythic)
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
    const [showBrowseDeck, setShowBrowseDeck] = useState(false)
    const [deckSearchQuery, setDeckSearchQuery] = useState("")
    const [browseShowFavoritesOnly, setBrowseShowFavoritesOnly] =
        useState(false)
    // Special-play sub-menu state: { anchorEl, uid }
    const [handSpecialMenu, setHandSpecialMenu] = useState(null)
    const [discardCardMenu, setDiscardCardMenu] = useState(null)
    const [favoritedCards, setFavoritedCards] = useState(() => {
        try {
            const saved = localStorage.getItem("imk_deck_favorites")
            return saved ? new Set(JSON.parse(saved)) : new Set()
        } catch {
            return new Set()
        }
    })
    const [lastAction, setLastAction] = useState("") // for status message

    const fileInputRef = useRef(null)

    // ─── Persist favorites to localStorage ───
    useEffect(() => {
        localStorage.setItem(
            "imk_deck_favorites",
            JSON.stringify([...favoritedCards]),
        )
    }, [favoritedCards])

    // ─── Toggle a card favorite by its deck/name key ───
    const toggleFavorite = useCallback((cardKey) => {
        setFavoritedCards((prev) => {
            const next = new Set(prev)
            if (next.has(cardKey)) {
                next.delete(cardKey)
            } else {
                if (next.size >= 3) return prev // max 3 favorites
                next.add(cardKey)
            }
            return next
        })
    }, [])

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
        const snap = { deckCards, hand, charges, inPlay, discardPile }
        historyRef.current = [...historyRef.current.slice(-19), snap]
        futureRef.current = []
        setHistoryLength(historyRef.current.length)
        setFutureLength(0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, charges, inPlay, discardPile])

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return
        const snap = historyRef.current[historyRef.current.length - 1]
        historyRef.current = historyRef.current.slice(0, -1)
        futureRef.current = [
            ...futureRef.current,
            { deckCards, hand, charges, inPlay, discardPile },
        ]
        setDeckCards(snap.deckCards)
        setHand(snap.hand)
        setCharges(snap.charges || [])
        setInPlay(snap.inPlay)
        setDiscardPile(snap.discardPile)
        setHistoryLength(historyRef.current.length)
        setFutureLength(futureRef.current.length)
        setLastAction("↩ Undid last action.")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, charges, inPlay, discardPile])

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return
        const snap = futureRef.current[futureRef.current.length - 1]
        futureRef.current = futureRef.current.slice(0, -1)
        historyRef.current = [
            ...historyRef.current,
            { deckCards, hand, charges, inPlay, discardPile },
        ]
        setDeckCards(snap.deckCards)
        setHand(snap.hand)
        setCharges(snap.charges || [])
        setInPlay(snap.inPlay)
        setDiscardPile(snap.discardPile)
        setHistoryLength(historyRef.current.length)
        setFutureLength(futureRef.current.length)
        setLastAction("↪ Redid last action.")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deckCards, hand, charges, inPlay, discardPile])
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
                if (data.charges) setCharges(data.charges)
                if (data.handSizeLimit) setHandSizeLimit(data.handSizeLimit)
                if (data.inPlay) setInPlay(data.inPlay)
                if (data.discardPile) setDiscardPile(data.discardPile)
                if (data.deckName) setDeckName(data.deckName)
                // Only restore deckImage if it's a data URL (blob: URLs expire on reload)
                if (data.deckImage && data.deckImage.startsWith("data:"))
                    setDeckImage(data.deckImage)
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
                    charges,
                    inPlay,
                    discardPile,
                    deckName,
                    deckImage,
                    cardLog,
                    handSizeLimit,
                }),
            )
        }
    }, [
        deckCards,
        hand,
        charges,
        inPlay,
        discardPile,
        deckName,
        deckImage,
        cardLog,
        handSizeLimit,
    ])

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

                // Store deck image as base64 data URL so it survives page refreshes
                const imageUrl = await new Promise((resolve) => {
                    const reader = new FileReader()
                    reader.onload = (e) => resolve(e.target.result)
                    reader.readAsDataURL(file)
                })
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
        if (hand.length >= handSizeLimitRef.current) {
            setLastAction(
                `Hand is full! You can only hold ${handSizeLimitRef.current} power${handSizeLimitRef.current !== 1 ? "s" : ""} at once.`,
            )
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
            const card = hand.find((c) => c.uid === uid)
            const rarity = (card?.rarity || "common").toLowerCase()
            const needsCharge = rarity === "rare" || rarity === "mythic"

            if (needsCharge && charges.length === 0) {
                setLastAction(
                    `⚠️ A ${rarity} card requires a charge — play a Common or Uncommon face-down first.`,
                )
                return
            }

            saveSnapshot()
            setPlayingCardId(uid)
            setTimeout(() => {
                if (needsCharge) {
                    setCharges((ch) => {
                        const [consumed, ...remaining] = ch
                        setHand((prev) => {
                            const c = prev.find((c) => c.uid === uid)
                            if (c) {
                                setInPlay((ip) => [
                                    ...ip,
                                    { ...c, chargedWith: consumed },
                                ])
                                logAction(
                                    `Played: ${c.name} (charged by ${consumed.name})`,
                                )
                            }
                            return prev.filter((c) => c.uid !== uid)
                        })
                        return remaining
                    })
                } else {
                    setHand((prev) => {
                        const c = prev.find((c) => c.uid === uid)
                        if (c) {
                            setInPlay((ip) => [...ip, c])
                            logAction(`Played: ${c.name}`)
                        }
                        return prev.filter((c) => c.uid !== uid)
                    })
                }
                setPlayingCardId(null)
                setLastAction("Played a power!")
            }, 400)
        },
        [hand, charges, logAction, saveSnapshot],
    )

    // ─── Play a card face-down as a charge ───
    const chargeCard = useCallback(
        (uid) => {
            saveSnapshot()
            setDiscardingCardId(uid)
            setTimeout(() => {
                setHand((prev) => {
                    const card = prev.find((c) => c.uid === uid)
                    if (card) {
                        setCharges((ch) => [...ch, { ...card, charged: true }])
                        logAction(`Charged (face-down): ${card.name}`)
                    }
                    return prev.filter((c) => c.uid !== uid)
                })
                setDiscardingCardId(null)
                setLastAction("Played face-down as a charge.")
            }, 300)
        },
        [logAction, saveSnapshot],
    )

    // ─── Remove a charge → discard pile ───
    const discardCharge = useCallback(
        (uid) => {
            saveSnapshot()
            setCharges((prev) => {
                const card = prev.find((c) => c.uid === uid)
                if (card) {
                    setDiscardPile((dp) => [...dp, card])
                    logAction(`Removed charge: ${card.name}`)
                }
                return prev.filter((c) => c.uid !== uid)
            })
            setLastAction("Charge removed to discard pile.")
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
                    // Discard the charge attached to this card too
                    const toDiscard = card.chargedWith
                        ? [
                              { ...card, chargedWith: undefined },
                              card.chargedWith,
                          ]
                        : [card]
                    setDiscardPile((dp) => [...dp, ...toDiscard])
                    logAction(
                        card.chargedWith
                            ? `Discarded from play: ${card.name} + charge ${card.chargedWith.name}`
                            : `Discarded from play: ${card.name}`,
                    )
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

    // ─── Grit Teeth: auto-draw up to handSizeLimit (combat respite, resets hand size) ───
    const gritTeeth = useCallback(() => {
        const limit = handSizeLimitRef.current
        const drawCount = Math.min(limit - hand.length, deckCards.length)
        if (drawCount <= 0) {
            setLastAction(
                hand.length >= limit
                    ? "Hand already full."
                    : "No cards in deck to draw.",
            )
            return
        }
        const drawn = deckCards.slice(0, drawCount)
        setDeckCards((prev) => prev.slice(drawCount))
        setHand((prev) => [...prev, ...drawn])
        setHandSizeLimit(MAX_HAND_SIZE) // always reset hand size limit back to 3
        setLastAction(
            `Grit Teeth — drew ${drawCount} power${drawCount > 1 ? "s" : ""}! Hand size reset to ${MAX_HAND_SIZE}.`,
        )
    }, [hand.length, deckCards])

    // ─── Return a card from discard pile → hand ───
    const returnFromDiscard = useCallback(
        (uid) => {
            if (hand.length >= handSizeLimitRef.current) {
                setLastAction("Hand is full — discard a card first.")
                return
            }
            saveSnapshot()
            setDiscardPile((prev) => {
                const card = prev.find((c) => c.uid === uid)
                if (card) {
                    setHand((h) => [...h, { ...card, reversed: false }])
                    logAction(`Returned from discard: ${card.name}`)
                }
                return prev.filter((c) => c.uid !== uid)
            })
            setLastAction("Returned card from discard to hand.")
        },
        [hand.length, logAction, saveSnapshot],
    )

    // ─── Take a specific card from the deck → hand (search/tutor) ───
    const takeFromDeck = useCallback(
        (uid) => {
            if (hand.length >= handSizeLimitRef.current) {
                setLastAction("Hand is full — discard a card first.")
                return
            }
            saveSnapshot()
            setDeckCards((prev) => {
                const card = prev.find((c) => c.uid === uid)
                if (card) {
                    setHand((h) => [...h, card])
                    logAction(`Searched deck and took: ${card.name}`)
                }
                return shuffle(prev.filter((c) => c.uid !== uid))
            })
            setLastAction("Took card from deck — deck reshuffled.")
            setShowBrowseDeck(false)
        },
        [hand.length, logAction, saveSnapshot],
    )

    // ─── Send a card from hand or discard pile to the top of the deck ───
    const sendToTopOfDeck = useCallback(
        (uid, fromZone) => {
            saveSnapshot()
            if (fromZone === "hand") {
                setHand((prev) => {
                    const card = prev.find((c) => c.uid === uid)
                    if (card) {
                        setDeckCards((dk) => [card, ...dk])
                        logAction(
                            `Sent to top of deck (from hand): ${card.name}`,
                        )
                    }
                    return prev.filter((c) => c.uid !== uid)
                })
            } else {
                setDiscardPile((prev) => {
                    const card = prev.find((c) => c.uid === uid)
                    if (card) {
                        setDeckCards((dk) => [card, ...dk])
                        logAction(
                            `Sent to top of deck (from discard): ${card.name}`,
                        )
                    }
                    return prev.filter((c) => c.uid !== uid)
                })
            }
            setLastAction("Card moved to top of deck.")
        },
        [logAction, saveSnapshot],
    )

    // ─── Toggle reversed state on an in-play card ───
    const toggleReversed = useCallback(
        (uid) => {
            setInPlay((prev) =>
                prev.map((c) =>
                    c.uid === uid ? { ...c, reversed: !c.reversed } : c,
                ),
            )
            setInPlay((prev) => {
                const card = prev.find((c) => c.uid === uid)
                if (card)
                    logAction(
                        `${card.reversed ? "Un-reversed" : "Reversed"}: ${card.name}`,
                    )
                return prev
            })
        },
        [logAction],
    )

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
        setCharges([])
        setInPlay([])
        setDiscardPile([])
        setDeckName("")
        setDeckImage(null)
        setLastAction("")
        sessionStorage.removeItem("imk_power_deck")
    }, [logAction])

    // ─── Total card counts ───
    const totalCards =
        deckCards.length +
        hand.length +
        charges.length +
        inPlay.length +
        discardPile.length
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
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                                alignItems: "center",
                            }}
                        >
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
                            {/* Hand size limit stepper */}
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    border: "1px solid",
                                    borderColor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.2)"
                                            : "rgba(0,0,0,0.18)",
                                    borderRadius: "16px",
                                    height: 24,
                                    overflow: "hidden",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255,255,255,0.05)"
                                            : "rgba(0,0,0,0.03)",
                                }}
                            >
                                <Tooltip title='Decrease hand size'>
                                    <span>
                                        <IconButton
                                            size='small'
                                            disabled={handSizeLimit <= 1}
                                            onClick={() =>
                                                setHandSizeLimit((v) =>
                                                    Math.max(1, v - 1),
                                                )
                                            }
                                            sx={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 0,
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#ccc"
                                                        : "#555",
                                                "&:hover": {
                                                    bgcolor:
                                                        "rgba(139,0,0,0.12)",
                                                },
                                            }}
                                        >
                                            <Remove sx={{ fontSize: 10 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip
                                    title={`Max hand size (Grit Teeth resets to ${MAX_HAND_SIZE})`}
                                >
                                    <Typography
                                        sx={{
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.62rem",
                                            fontWeight: "bold",
                                            px: 0.75,
                                            userSelect: "none",
                                            color:
                                                handSizeLimit !== MAX_HAND_SIZE
                                                    ? "#c77d00"
                                                    : "inherit",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Hand: {handSizeLimit}
                                    </Typography>
                                </Tooltip>
                                <Tooltip title='Increase hand size'>
                                    <span>
                                        <IconButton
                                            size='small'
                                            disabled={handSizeLimit >= 6}
                                            onClick={() =>
                                                setHandSizeLimit((v) =>
                                                    Math.min(6, v + 1),
                                                )
                                            }
                                            sx={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 0,
                                                color: (theme) =>
                                                    theme.palette.mode ===
                                                    "dark"
                                                        ? "#ccc"
                                                        : "#555",
                                                "&:hover": {
                                                    bgcolor:
                                                        "rgba(0,100,0,0.12)",
                                                },
                                            }}
                                        >
                                            <Add sx={{ fontSize: 10 }} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>
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
                                                position: "relative",
                                                // extra left padding so the peeking charge card doesn't clip
                                                pl: card.chargedWith
                                                    ? "18px"
                                                    : 0,
                                                transform: card.reversed
                                                    ? "rotate(180deg)"
                                                    : "none",
                                                transition:
                                                    "transform 0.4s ease, filter 0.25s",
                                                "&:hover": {
                                                    transform: card.reversed
                                                        ? "rotate(180deg) translateY(10px) scale(1.12)"
                                                        : "translateY(-10px) scale(1.12)",
                                                    zIndex: 10,
                                                },
                                            }}
                                        >
                                            {/* Attached charge card peeking behind */}
                                            {card.chargedWith && (
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 8,
                                                        width: {
                                                            xs: 110,
                                                            sm: 140,
                                                        },
                                                        height: {
                                                            xs: 165,
                                                            sm: 210,
                                                        },
                                                        borderRadius: "12px",
                                                        border: "2px solid #f9a825",
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(30,20,0,0.97)"
                                                                : "#fffde7",
                                                        boxShadow:
                                                            "0 4px 12px rgba(249,168,37,0.3)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        gap: 0.5,
                                                        transform:
                                                            "rotate(-6deg)",
                                                        zIndex: 0,
                                                        pointerEvents: "none",
                                                    }}
                                                >
                                                    {deckImage ? (
                                                        <Box
                                                            component='img'
                                                            src={deckImage}
                                                            alt='charge'
                                                            sx={{
                                                                width: "70%",
                                                                height: "65%",
                                                                objectFit:
                                                                    "contain",
                                                                opacity: 0.55,
                                                                filter: "grayscale(0.3) brightness(0.8)",
                                                            }}
                                                        />
                                                    ) : (
                                                        <FlipToBack
                                                            sx={{
                                                                fontSize: 28,
                                                                color: "#f9a825",
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "0.48rem",
                                                            fontWeight: "bold",
                                                            color: "#f9a825",
                                                            letterSpacing:
                                                                "0.08em",
                                                            textAlign: "center",
                                                            px: 0.5,
                                                        }}
                                                    >
                                                        CHARGE
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Box
                                                sx={{
                                                    position: "relative",
                                                    zIndex: 1,
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
                                                            flexDirection:
                                                                "column",
                                                            borderRadius:
                                                                "12px",
                                                            border: card.reversed
                                                                ? "2px solid #7e57c2"
                                                                : "2px solid #8B0000",
                                                            bgcolor: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "rgba(60,10,10,0.95)"
                                                                    : "#fff5f0",
                                                            boxShadow:
                                                                card.reversed
                                                                    ? "0 6px 20px rgba(126,87,194,0.45)"
                                                                    : "0 6px 20px rgba(139,0,0,0.4)",
                                                            overflow: "hidden",
                                                            transition:
                                                                "border-color 0.3s, box-shadow 0.3s",
                                                        }}
                                                    >
                                                        {/* Card Art */}
                                                        <Box
                                                            sx={{
                                                                width: "100%",
                                                                height: "55%",
                                                                bgcolor:
                                                                    "#f5f0e6",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                                borderBottom:
                                                                    "1px solid rgba(139,0,0,0.2)",
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
                                                                overflow:
                                                                    "hidden",
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
                                                                        fontSize:
                                                                            {
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
                                                                    display:
                                                                        "flex",
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
                                                                <Tooltip
                                                                    title={
                                                                        card.reversed
                                                                            ? "Un-reverse"
                                                                            : "Reverse 180°"
                                                                    }
                                                                >
                                                                    <IconButton
                                                                        size='small'
                                                                        onClick={() =>
                                                                            toggleReversed(
                                                                                card.uid,
                                                                            )
                                                                        }
                                                                        sx={{
                                                                            bgcolor:
                                                                                card.reversed
                                                                                    ? "rgba(94,53,177,0.9)"
                                                                                    : "rgba(80,80,80,0.7)",
                                                                            color: "#fff",
                                                                            width: 26,
                                                                            height: 26,
                                                                            "&:hover":
                                                                                {
                                                                                    bgcolor:
                                                                                        "rgba(94,53,177,0.9)",
                                                                                },
                                                                        }}
                                                                    >
                                                                        <RotateRight
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
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* ─── Charges Zone ─── */}
                    {charges.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                sx={{
                                    fontFamily:
                                        '"Cinzel Decorative", "Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: { xs: "0.9rem", sm: "1rem" },
                                    mb: 1,
                                    color: "#f9a825",
                                    textAlign: "center",
                                }}
                            >
                                Charged ({charges.length})
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: { xs: 1.5, sm: 2 },
                                    justifyContent: "center",
                                    flexWrap: "wrap",
                                    p: 2,
                                    borderRadius: "12px",
                                    border: "2px solid rgba(249,168,37,0.4)",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(249,168,37,0.06)"
                                            : "rgba(249,168,37,0.04)",
                                    minHeight: { xs: 90, sm: 110 },
                                    alignItems: "flex-start",
                                }}
                            >
                                {charges.map((card) => (
                                    <Zoom key={card.uid} in timeout={400}>
                                        <Box
                                            sx={{
                                                transition: "transform 0.2s",
                                                "&:hover": {
                                                    transform:
                                                        "translateY(-6px) scale(1.05)",
                                                    zIndex: 10,
                                                    position: "relative",
                                                },
                                            }}
                                        >
                                            <Paper
                                                elevation={6}
                                                sx={{
                                                    width: {
                                                        xs: 110,
                                                        sm: 140,
                                                    },
                                                    height: {
                                                        xs: 165,
                                                        sm: 210,
                                                    },
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    borderRadius: "12px",
                                                    border: "2px solid #f9a825",
                                                    overflow: "hidden",
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "rgba(30,20,0,0.97)"
                                                            : "#fffde7",
                                                    boxShadow:
                                                        "0 4px 16px rgba(249,168,37,0.35)",
                                                }}
                                            >
                                                {/* Face-down back */}
                                                <Box
                                                    sx={{
                                                        width: "100%",
                                                        flex: 1,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        gap: 0.5,
                                                        bgcolor: (theme) =>
                                                            theme.palette
                                                                .mode === "dark"
                                                                ? "rgba(80,55,0,0.6)"
                                                                : "rgba(249,168,37,0.12)",
                                                    }}
                                                >
                                                    {deckImage ? (
                                                        <Box
                                                            component='img'
                                                            src={deckImage}
                                                            alt='card back'
                                                            sx={{
                                                                width: "75%",
                                                                height: "75%",
                                                                objectFit:
                                                                    "contain",
                                                                opacity: 0.6,
                                                                filter: "grayscale(0.4) brightness(0.8)",
                                                            }}
                                                        />
                                                    ) : (
                                                        <FlipToBack
                                                            sx={{
                                                                fontSize: 32,
                                                                color: "#f9a825",
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "0.55rem",
                                                            fontWeight: "bold",
                                                            color: "#f9a825",
                                                            letterSpacing:
                                                                "0.05em",
                                                            textAlign: "center",
                                                            px: 0.5,
                                                        }}
                                                    >
                                                        CHARGE
                                                    </Typography>
                                                </Box>
                                                {/* Discard button */}
                                                <Box
                                                    sx={{
                                                        p: 0.5,
                                                        display: "flex",
                                                        justifyContent:
                                                            "center",
                                                        borderTop:
                                                            "1px solid rgba(249,168,37,0.3)",
                                                    }}
                                                >
                                                    <Tooltip title='Remove charge to discard'>
                                                        <IconButton
                                                            size='small'
                                                            onClick={() =>
                                                                discardCharge(
                                                                    card.uid,
                                                                )
                                                            }
                                                            sx={{
                                                                bgcolor:
                                                                    "rgba(100,100,100,0.7)",
                                                                color: "#fff",
                                                                width: 24,
                                                                height: 24,
                                                                "&:hover": {
                                                                    bgcolor:
                                                                        "#666",
                                                                },
                                                            }}
                                                        >
                                                            <LayersClear
                                                                sx={{
                                                                    fontSize: 12,
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Paper>
                                        </Box>
                                    </Zoom>
                                ))}
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
                                Your Hand ({hand.length}/{handSizeLimit})
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
                                                            {/* Top of deck button */}
                                                            {/* Charge button */}
                                                            {/* ─ Special Play trigger ─ */}
                                                            <Tooltip title='Special play…'>
                                                                <IconButton
                                                                    size='small'
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation()
                                                                        setHandSpecialMenu(
                                                                            (
                                                                                prev,
                                                                            ) =>
                                                                                prev?.uid ===
                                                                                card.uid
                                                                                    ? null
                                                                                    : {
                                                                                          anchorEl:
                                                                                              e.currentTarget,
                                                                                          uid: card.uid,
                                                                                      },
                                                                        )
                                                                    }}
                                                                    sx={{
                                                                        bgcolor:
                                                                            handSpecialMenu?.uid ===
                                                                            card.uid
                                                                                ? "rgba(94,53,177,0.9)"
                                                                                : "rgba(80,40,140,0.7)",
                                                                        color: "#fff",
                                                                        width: 22,
                                                                        height: 22,
                                                                        "&:hover":
                                                                            {
                                                                                bgcolor:
                                                                                    "rgba(94,53,177,0.9)",
                                                                            },
                                                                    }}
                                                                >
                                                                    <AutoAwesome
                                                                        sx={{
                                                                            fontSize: 11,
                                                                        }}
                                                                    />
                                                                </IconButton>
                                                            </Tooltip>
                                                            {/* Play button — disabled for rare/mythic with no charge */}
                                                            {(() => {
                                                                const rarity = (
                                                                    card.rarity ||
                                                                    "common"
                                                                ).toLowerCase()
                                                                const needsCharge =
                                                                    rarity ===
                                                                        "rare" ||
                                                                    rarity ===
                                                                        "mythic"
                                                                const canPlay =
                                                                    !needsCharge ||
                                                                    charges.length >
                                                                        0
                                                                return (
                                                                    <Tooltip
                                                                        title={
                                                                            canPlay
                                                                                ? "Play"
                                                                                : `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} requires a charge — play a Common or Uncommon face-down first`
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <IconButton
                                                                                size='small'
                                                                                disabled={
                                                                                    !canPlay
                                                                                }
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
                                                                                        canPlay
                                                                                            ? "rgba(139,0,0,0.85)"
                                                                                            : "rgba(80,80,80,0.4)",
                                                                                    color: "#fff",
                                                                                    width: 28,
                                                                                    height: 28,
                                                                                    "&:hover":
                                                                                        {
                                                                                            bgcolor:
                                                                                                canPlay
                                                                                                    ? "#a00"
                                                                                                    : "rgba(80,80,80,0.4)",
                                                                                        },
                                                                                    "&.Mui-disabled":
                                                                                        {
                                                                                            color: "rgba(255,255,255,0.3)",
                                                                                        },
                                                                                }}
                                                                            >
                                                                                <KeyboardDoubleArrowUp
                                                                                    sx={{
                                                                                        fontSize: 14,
                                                                                    }}
                                                                                />
                                                                            </IconButton>
                                                                        </span>
                                                                    </Tooltip>
                                                                )
                                                            })()}
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
                                    hand.length >= handSizeLimit
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
                                Draw ({hand.length}/{handSizeLimit})
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
                                    hand.length >= handSizeLimit ||
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
                            <Button
                                variant='outlined'
                                startIcon={<Search sx={{ fontSize: 14 }} />}
                                onClick={() => {
                                    setDeckSearchQuery("")
                                    setShowBrowseDeck(true)
                                }}
                                disabled={deckCards.length === 0}
                                size='small'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    textTransform: "none",
                                    fontSize: { xs: "0.6rem", sm: "0.7rem" },
                                    borderRadius: "10px",
                                    borderColor: "#5c35a8",
                                    color: "#7e57c2",
                                    "&:hover": {
                                        borderColor: "#7e57c2",
                                        color: "#9575cd",
                                        bgcolor: "rgba(94,53,177,0.08)",
                                    },
                                }}
                            >
                                Browse Deck
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
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            p: 0.5,
                                            opacity: 0.75,
                                            filter: "grayscale(30%)",
                                            transition:
                                                "filter 0.2s, opacity 0.2s",
                                            "&:hover": {
                                                opacity: 1,
                                                filter: "none",
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                flex: 1,
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <CardFace card={card} compact />
                                        </Box>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                width: "100%",
                                                borderTop:
                                                    "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <Tooltip title='Move card…'>
                                                <IconButton
                                                    size='small'
                                                    onClick={(e) =>
                                                        setDiscardCardMenu(
                                                            (prev) =>
                                                                prev?.uid ===
                                                                card.uid
                                                                    ? null
                                                                    : {
                                                                          anchorEl:
                                                                              e.currentTarget,
                                                                          uid: card.uid,
                                                                      },
                                                        )
                                                    }
                                                    sx={{
                                                        width: "100%",
                                                        height: 18,
                                                        borderRadius:
                                                            "0 0 6px 6px",
                                                        bgcolor:
                                                            discardCardMenu?.uid ===
                                                            card.uid
                                                                ? "rgba(94,53,177,0.9)"
                                                                : "rgba(60,30,110,0.7)",
                                                        color: "#fff",
                                                        "&:hover": {
                                                            bgcolor:
                                                                "rgba(94,53,177,0.9)",
                                                        },
                                                    }}
                                                >
                                                    <AutoAwesome
                                                        sx={{ fontSize: 10 }}
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
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

            {/* ═══ Hand card SpecialPlay sub-menu Popover ═══ */}
            <Popover
                open={Boolean(handSpecialMenu)}
                anchorEl={handSpecialMenu?.anchorEl}
                onClose={() => setHandSpecialMenu(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                PaperProps={{
                    sx: {
                        bgcolor: "transparent",
                        boxShadow: "none",
                        overflow: "visible",
                        p: 0,
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pb: "2px",
                    }}
                >
                    {/* Two bubble buttons */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            alignItems: "flex-end",
                        }}
                    >
                        {/* Bubble 1: Top of Deck */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                            }}
                        >
                            <Tooltip title='Send to top of deck'>
                                <IconButton
                                    size='small'
                                    onClick={() => {
                                        sendToTopOfDeck(
                                            handSpecialMenu.uid,
                                            "hand",
                                        )
                                        setHandSpecialMenu(null)
                                    }}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        bgcolor: "rgba(0,110,65,0.95)",
                                        border: "1.5px solid rgba(0,200,100,0.45)",
                                        color: "#fff",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                                        "&:hover": {
                                            bgcolor: "rgba(0,140,80,1)",
                                        },
                                    }}
                                >
                                    <VerticalAlignTop sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                            <Typography
                                sx={{
                                    fontSize: "0.42rem",
                                    color: "rgba(255,255,255,0.65)",
                                    fontFamily: '"Cinzel", serif',
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                Top of Deck
                            </Typography>
                        </Box>

                        {/* Bubble 2: Charge */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                            }}
                        >
                            <Tooltip title='Play face-down as charge'>
                                <IconButton
                                    size='small'
                                    onClick={() => {
                                        chargeCard(handSpecialMenu.uid)
                                        setHandSpecialMenu(null)
                                    }}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        bgcolor: "rgba(160,100,0,0.95)",
                                        border: "1.5px solid rgba(249,168,37,0.45)",
                                        color: "#fff",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                                        "&:hover": {
                                            bgcolor: "rgba(199,125,0,1)",
                                        },
                                    }}
                                >
                                    <FlipToBack sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                            <Typography
                                sx={{
                                    fontSize: "0.42rem",
                                    color: "rgba(255,255,255,0.65)",
                                    fontFamily: '"Cinzel", serif',
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                Charge
                            </Typography>
                        </Box>
                    </Box>

                    {/* Connector: horizontal bar + vertical stem */}
                    <Box
                        sx={{
                            position: "relative",
                            width: 68,
                            height: 10,
                            mt: "2px",
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 4,
                                right: 4,
                                height: "1px",
                                bgcolor: "rgba(200,200,200,0.25)",
                            }}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: "1px",
                                height: "100%",
                                bgcolor: "rgba(200,200,200,0.25)",
                            }}
                        />
                    </Box>
                </Box>
            </Popover>

            {/* ═══ Discard card move sub-menu Popover ═══ */}
            <Popover
                open={Boolean(discardCardMenu)}
                anchorEl={discardCardMenu?.anchorEl}
                onClose={() => setDiscardCardMenu(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                PaperProps={{
                    sx: {
                        bgcolor: "transparent",
                        boxShadow: "none",
                        overflow: "visible",
                        p: 0,
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pb: "2px",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            alignItems: "flex-end",
                        }}
                    >
                        {/* Bubble 1: Return to Hand */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                            }}
                        >
                            <Tooltip
                                title={
                                    hand.length >= handSizeLimit
                                        ? "Hand is full"
                                        : "Return to hand"
                                }
                            >
                                <span>
                                    <IconButton
                                        size='small'
                                        disabled={hand.length >= handSizeLimit}
                                        onClick={() => {
                                            returnFromDiscard(
                                                discardCardMenu.uid,
                                            )
                                            setDiscardCardMenu(null)
                                        }}
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: "50%",
                                            bgcolor:
                                                hand.length >= handSizeLimit
                                                    ? "rgba(60,60,60,0.5)"
                                                    : "rgba(20,80,180,0.95)",
                                            border: "1.5px solid rgba(80,160,255,0.4)",
                                            color: "#fff",
                                            boxShadow:
                                                "0 2px 8px rgba(0,0,0,0.45)",
                                            "&:hover": {
                                                bgcolor: "rgba(21,101,192,1)",
                                            },
                                            "&.Mui-disabled": {
                                                color: "rgba(255,255,255,0.2)",
                                            },
                                        }}
                                    >
                                        <ReplyAll sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Typography
                                sx={{
                                    fontSize: "0.42rem",
                                    color: "rgba(255,255,255,0.65)",
                                    fontFamily: '"Cinzel", serif',
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                To Hand
                            </Typography>
                        </Box>

                        {/* Bubble 2: Top of Deck */}
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "3px",
                            }}
                        >
                            <Tooltip title='Send to top of deck'>
                                <IconButton
                                    size='small'
                                    onClick={() => {
                                        sendToTopOfDeck(
                                            discardCardMenu.uid,
                                            "discard",
                                        )
                                        setDiscardCardMenu(null)
                                    }}
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        bgcolor: "rgba(0,110,65,0.95)",
                                        border: "1.5px solid rgba(0,200,100,0.45)",
                                        color: "#fff",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
                                        "&:hover": {
                                            bgcolor: "rgba(0,140,80,1)",
                                        },
                                    }}
                                >
                                    <VerticalAlignTop sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                            <Typography
                                sx={{
                                    fontSize: "0.42rem",
                                    color: "rgba(255,255,255,0.65)",
                                    fontFamily: '"Cinzel", serif',
                                    lineHeight: 1,
                                    whiteSpace: "nowrap",
                                    letterSpacing: "0.03em",
                                }}
                            >
                                Top of Deck
                            </Typography>
                        </Box>
                    </Box>

                    {/* Connector lines */}
                    <Box
                        sx={{
                            position: "relative",
                            width: 68,
                            height: 10,
                            mt: "2px",
                        }}
                    >
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 4,
                                right: 4,
                                height: "1px",
                                bgcolor: "rgba(200,200,200,0.25)",
                            }}
                        />
                        <Box
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: "1px",
                                height: "100%",
                                bgcolor: "rgba(200,200,200,0.25)",
                            }}
                        />
                    </Box>
                </Box>
            </Popover>

            {/* ═══ Browse Deck Modal ═══ */}
            <Modal
                open={showBrowseDeck}
                onClose={() => setShowBrowseDeck(false)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Paper
                    sx={{
                        width: { xs: "96%", sm: 520 },
                        maxHeight: "88vh",
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
                                    ? "rgba(0,0,0,0.85)"
                                    : "rgba(0,0,0,0.9)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderRadius: "16px 16px 0 0",
                        }}
                    >
                        <Box>
                            <Typography
                                variant='h6'
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                }}
                            >
                                Browse Deck
                            </Typography>
                            <Typography variant='caption' sx={{ opacity: 0.7 }}>
                                {deckCards.length} card
                                {deckCards.length !== 1 ? "s" : ""} remaining ·{" "}
                                {favoritedCards.size}/3 favorites
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setShowBrowseDeck(false)}
                            sx={{ color: "#fff" }}
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Search + Favorites filter */}
                    <Box
                        sx={{
                            p: 1.5,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            gap: 1,
                            alignItems: "center",
                        }}
                    >
                        <TextField
                            fullWidth
                            size='small'
                            placeholder='Search by name or rarity…'
                            value={deckSearchQuery}
                            onChange={(e) => setDeckSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <Search
                                            sx={{ fontSize: 18, opacity: 0.6 }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    fontFamily: '"Cinzel", serif',
                                    fontSize: "0.85rem",
                                },
                            }}
                        />
                        <Tooltip
                            title={
                                browseShowFavoritesOnly
                                    ? "Show all cards"
                                    : `Show favorites (${favoritedCards.size}/3)`
                            }
                        >
                            <IconButton
                                size='small'
                                onClick={() =>
                                    setBrowseShowFavoritesOnly((v) => !v)
                                }
                                sx={{
                                    flexShrink: 0,
                                    color: browseShowFavoritesOnly
                                        ? "#f9a825"
                                        : "text.secondary",
                                    bgcolor: browseShowFavoritesOnly
                                        ? "rgba(249,168,37,0.12)"
                                        : "transparent",
                                    border: "1px solid",
                                    borderColor: browseShowFavoritesOnly
                                        ? "rgba(249,168,37,0.5)"
                                        : "divider",
                                    borderRadius: "8px",
                                    width: 36,
                                    height: 36,
                                }}
                            >
                                {browseShowFavoritesOnly ? (
                                    <Star sx={{ fontSize: 18 }} />
                                ) : (
                                    <StarBorder sx={{ fontSize: 18 }} />
                                )}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Card list */}
                    <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
                        {(() => {
                            const q = deckSearchQuery.toLowerCase()
                            const allFiltered = deckCards.filter((card) => {
                                const key = `${card.deck || ""}/${card.name}`
                                const matchesQuery =
                                    !q ||
                                    card.name.toLowerCase().includes(q) ||
                                    (card.rarity || "common")
                                        .toLowerCase()
                                        .includes(q) ||
                                    (card.deck || "").toLowerCase().includes(q)
                                const matchesFav =
                                    !browseShowFavoritesOnly ||
                                    favoritedCards.has(key)
                                return matchesQuery && matchesFav
                            })

                            // Sort: favorites first
                            const favoriteRows = allFiltered.filter((c) =>
                                favoritedCards.has(`${c.deck || ""}/${c.name}`),
                            )
                            const otherRows = allFiltered.filter(
                                (c) =>
                                    !favoritedCards.has(
                                        `${c.deck || ""}/${c.name}`,
                                    ),
                            )
                            const sorted = [...favoriteRows, ...otherRows]

                            if (sorted.length === 0)
                                return (
                                    <Typography
                                        sx={{
                                            textAlign: "center",
                                            py: 3,
                                            opacity: 0.4,
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        {browseShowFavoritesOnly
                                            ? "No favorites marked yet."
                                            : "No cards match your search."}
                                    </Typography>
                                )

                            return sorted.map((card, idx) => {
                                const cardKey = `${card.deck || ""}/${card.name}`
                                const isFav = favoritedCards.has(cardKey)
                                const isFirstOther =
                                    favoriteRows.length > 0 &&
                                    idx === favoriteRows.length
                                return (
                                    <React.Fragment key={card.uid}>
                                        {isFirstOther && (
                                            <Divider
                                                sx={{
                                                    my: 1,
                                                    fontSize: "0.6rem",
                                                    color: "text.secondary",
                                                    fontFamily:
                                                        '"Cinzel", serif',
                                                    opacity: 0.5,
                                                }}
                                            >
                                                Other cards
                                            </Divider>
                                        )}
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1.5,
                                                p: 1,
                                                borderRadius: "8px",
                                                mb: 0.5,
                                                border: "1px solid",
                                                borderColor: isFav
                                                    ? "rgba(249,168,37,0.45)"
                                                    : (theme) =>
                                                          theme.palette.mode ===
                                                          "dark"
                                                              ? "rgba(255,255,255,0.07)"
                                                              : "rgba(0,0,0,0.07)",
                                                borderLeft: isFav
                                                    ? "3px solid #f9a825"
                                                    : undefined,
                                                bgcolor: isFav
                                                    ? (theme) =>
                                                          theme.palette.mode ===
                                                          "dark"
                                                              ? "rgba(249,168,37,0.05)"
                                                              : "rgba(249,168,37,0.04)"
                                                    : (theme) =>
                                                          theme.palette.mode ===
                                                          "dark"
                                                              ? "rgba(255,255,255,0.03)"
                                                              : "rgba(0,0,0,0.02)",
                                                "&:hover": {
                                                    borderColor:
                                                        rarityBorder[
                                                            card.rarity ||
                                                                "common"
                                                        ],
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode ===
                                                        "dark"
                                                            ? "rgba(255,255,255,0.06)"
                                                            : "rgba(0,0,0,0.04)",
                                                },
                                            }}
                                        >
                                            {/* Mini art */}
                                            <Box
                                                component='img'
                                                {...getCardImageProps(card)}
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    objectFit: "cover",
                                                    borderRadius: "6px",
                                                    flexShrink: 0,
                                                    border: `1px solid ${rarityBorder[card.rarity || "common"]}`,
                                                }}
                                            />
                                            {/* Name + rarity */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 0.5,
                                                    }}
                                                >
                                                    {isFav && (
                                                        <Star
                                                            sx={{
                                                                fontSize: 11,
                                                                color: "#f9a825",
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontWeight: "bold",
                                                            fontSize: "0.8rem",
                                                            lineHeight: 1.2,
                                                            color: (theme) =>
                                                                theme.palette
                                                                    .mode ===
                                                                "dark"
                                                                    ? "#f0e6d2"
                                                                    : "#1a1a1a",
                                                            overflow: "hidden",
                                                            textOverflow:
                                                                "ellipsis",
                                                            whiteSpace:
                                                                "nowrap",
                                                        }}
                                                    >
                                                        {card.name}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 0.5,
                                                        mt: 0.25,
                                                        flexWrap: "wrap",
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
                                                            fontSize: "0.45rem",
                                                            fontWeight: "bold",
                                                            bgcolor:
                                                                rarityColor[
                                                                    card.rarity ||
                                                                        "common"
                                                                ],
                                                            color: "#fff",
                                                        }}
                                                    />
                                                    {card.deck && (
                                                        <Chip
                                                            label={card.deck}
                                                            size='small'
                                                            variant='outlined'
                                                            sx={{
                                                                height: 14,
                                                                fontSize:
                                                                    "0.45rem",
                                                                opacity: 0.7,
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                            {/* Favorite toggle */}
                                            <Tooltip
                                                title={
                                                    isFav
                                                        ? "Remove favorite"
                                                        : favoritedCards.size >=
                                                            3
                                                          ? "Max 3 favorites"
                                                          : "Mark as favorite"
                                                }
                                            >
                                                <span>
                                                    <IconButton
                                                        size='small'
                                                        disabled={
                                                            !isFav &&
                                                            favoritedCards.size >=
                                                                3
                                                        }
                                                        onClick={() =>
                                                            toggleFavorite(
                                                                cardKey,
                                                            )
                                                        }
                                                        sx={{
                                                            color: isFav
                                                                ? "#f9a825"
                                                                : "text.disabled",
                                                            width: 28,
                                                            height: 28,
                                                            "&:hover": {
                                                                color: "#f9a825",
                                                            },
                                                        }}
                                                    >
                                                        {isFav ? (
                                                            <Star
                                                                sx={{
                                                                    fontSize: 16,
                                                                }}
                                                            />
                                                        ) : (
                                                            <StarBorder
                                                                sx={{
                                                                    fontSize: 16,
                                                                }}
                                                            />
                                                        )}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            {/* Take button */}
                                            <Tooltip
                                                title={
                                                    hand.length >= handSizeLimit
                                                        ? "Hand is full"
                                                        : "Take to hand (deck reshuffles)"
                                                }
                                            >
                                                <span>
                                                    <IconButton
                                                        size='small'
                                                        disabled={
                                                            hand.length >=
                                                            handSizeLimit
                                                        }
                                                        onClick={() =>
                                                            takeFromDeck(
                                                                card.uid,
                                                            )
                                                        }
                                                        sx={{
                                                            bgcolor:
                                                                hand.length >=
                                                                handSizeLimit
                                                                    ? "rgba(80,80,80,0.3)"
                                                                    : "rgba(94,53,177,0.85)",
                                                            color: "#fff",
                                                            width: 30,
                                                            height: 30,
                                                            flexShrink: 0,
                                                            "&:hover": {
                                                                bgcolor:
                                                                    "rgba(94,53,177,1)",
                                                            },
                                                            "&.Mui-disabled": {
                                                                color: "rgba(255,255,255,0.25)",
                                                            },
                                                        }}
                                                    >
                                                        <ReplyAll
                                                            sx={{
                                                                fontSize: 15,
                                                                transform:
                                                                    "scaleX(-1)",
                                                            }}
                                                        />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </React.Fragment>
                                )
                            })
                        })()}
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            p: 1.5,
                            borderTop: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            variant='outlined'
                            onClick={() => setShowBrowseDeck(false)}
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                                fontSize: "0.8rem",
                            }}
                        >
                            Close
                        </Button>
                    </Box>
                </Paper>
            </Modal>

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
