/**
 * Cards API Client
 *
 * Fetches cards (powers + monsters) from AWS DynamoDB via API Gateway.
 * Falls back to local JSON files if API is not configured.
 *
 * Configuration:
 * Set in .env (or .env.local for Create React App):
 *   REACT_APP_CARDS_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
 */

const API_URL = process.env.REACT_APP_CARDS_API_URL || ""

// Cache for cards data (avoids repeated API calls)
let cardsCache = null
let cacheTimestamp = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if cache is still valid
 */
const isCacheValid = () => {
    return (
        cardsCache !== null &&
        cacheTimestamp !== null &&
        Date.now() - cacheTimestamp < CACHE_TTL
    )
}

/**
 * Fetch all cards from API or fallback to static JSON files
 * @param {boolean} forceRefresh - Bypass cache and fetch fresh data
 * @returns {Promise<{cards: Array, powers: Array, monsters: Array, decks: Array}>}
 */
export const fetchAllCards = async (forceRefresh = false) => {
    // Return cached data if valid
    if (!forceRefresh && isCacheValid()) {
        return cardsCache
    }

    // Try API first if configured
    if (API_URL) {
        try {
            const response = await fetch(`${API_URL}/cards`)
            if (response.ok) {
                const data = await response.json()
                cardsCache = data
                cacheTimestamp = Date.now()
                console.log(
                    `📦 Loaded ${data.count} cards from API (${data.powerCount} powers, ${data.monsterCount} monsters)`,
                )
                return data
            }
            console.error("Cards API returned error")
        } catch (error) {
            console.error("Cards API unavailable:", error)
        }
    }

    // No API available - return empty data structure
    console.warn("Cards API not configured or unavailable")
    return {
        cards: [],
        powers: [],
        monsters: [],
        count: 0,
        powerCount: 0,
        monsterCount: 0,
        decks: [],
    }
}

/**
 * Fetch only power cards
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<{powers: Array, decks: Array, count: number}>}
 */
export const fetchPowers = async (forceRefresh = false) => {
    if (API_URL) {
        try {
            const response = await fetch(`${API_URL}/cards?type=power`)
            if (response.ok) {
                const data = await response.json()
                return {
                    powers: data.powers,
                    decks: data.decks,
                    count: data.powerCount,
                }
            }
        } catch (error) {
            console.warn("Cards API unavailable:", error)
        }
    }

    // Fallback: get all and filter
    const data = await fetchAllCards(forceRefresh)
    return {
        powers: data.powers,
        decks: data.decks.filter((d) => d !== "Monsters"),
        count: data.powerCount,
    }
}

/**
 * Fetch only monster cards
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<Array>}
 */
export const fetchMonsters = async (forceRefresh = false) => {
    if (API_URL) {
        try {
            const response = await fetch(`${API_URL}/cards?type=monster`)
            if (response.ok) {
                const data = await response.json()
                return data.monsters
            }
        } catch (error) {
            console.warn("Cards API unavailable:", error)
        }
    }

    // Fallback: get all and filter
    const data = await fetchAllCards(forceRefresh)
    return data.monsters
}

/**
 * Fetch cards by deck
 * @param {string} deck - Deck name to filter by
 * @returns {Promise<Array>}
 */
export const fetchCardsByDeck = async (deck) => {
    if (API_URL) {
        try {
            const response = await fetch(
                `${API_URL}/cards?deck=${encodeURIComponent(deck)}`,
            )
            if (response.ok) {
                const data = await response.json()
                return data.cards
            }
        } catch (error) {
            console.warn("Cards API unavailable:", error)
        }
    }

    // Fallback: filter from all cards
    const data = await fetchAllCards()
    return data.cards.filter((c) => c.deck === deck)
}

/**
 * Get a specific card
 * @param {string} deck - Deck name
 * @param {string} name - Card name
 * @returns {Promise<Object|null>}
 */
export const getCard = async (deck, name) => {
    if (API_URL) {
        try {
            const response = await fetch(
                `${API_URL}/cards/${encodeURIComponent(deck)}/${encodeURIComponent(name)}`,
            )
            if (response.ok) {
                return await response.json()
            }
        } catch (error) {
            console.warn("Cards API unavailable:", error)
        }
    }

    // Fallback: find from all cards
    const data = await fetchAllCards()
    return data.cards.find((c) => c.deck === deck && c.name === name) || null
}

/**
 * Create a new card (Admin only)
 * @param {Object} card - Card data with deck, name, type, and type-specific fields
 * @returns {Promise<Object>}
 */
export const createCard = async (card) => {
    if (!API_URL) {
        throw new Error("Cards API not configured")
    }

    const response = await fetch(`${API_URL}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create card")
    }

    // Invalidate cache
    cardsCache = null
    return await response.json()
}

/**
 * Update an existing card (Admin only)
 * @param {string} deck - Deck name (cannot be changed)
 * @param {string} name - Card name (cannot be changed)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export const updateCard = async (deck, name, updates) => {
    if (!API_URL) {
        throw new Error("Cards API not configured")
    }

    const response = await fetch(
        `${API_URL}/cards/${encodeURIComponent(deck)}/${encodeURIComponent(name)}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        },
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update card")
    }

    // Invalidate cache
    cardsCache = null
    return await response.json()
}

/**
 * Delete a card (Admin only)
 * @param {string} deck - Deck name
 * @param {string} name - Card name
 * @returns {Promise<Object>}
 */
export const deleteCard = async (deck, name) => {
    if (!API_URL) {
        throw new Error("Cards API not configured")
    }

    const response = await fetch(
        `${API_URL}/cards/${encodeURIComponent(deck)}/${encodeURIComponent(name)}`,
        {
            method: "DELETE",
        },
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete card")
    }

    // Invalidate cache
    cardsCache = null
    return await response.json()
}

/**
 * Check if API is configured and available
 * @returns {Promise<boolean>}
 */
export const isApiAvailable = async () => {
    if (!API_URL) return false

    try {
        const response = await fetch(`${API_URL}/cards`, { method: "HEAD" })
        return response.ok
    } catch {
        return false
    }
}

/**
 * Clear the local cache
 */
export const clearCache = () => {
    cardsCache = null
    cacheTimestamp = null
}

const cardsClient = {
    fetchAllCards,
    fetchPowers,
    fetchMonsters,
    fetchCardsByDeck,
    getCard,
    createCard,
    updateCard,
    deleteCard,
    isApiAvailable,
    clearCache,
}

export default cardsClient
