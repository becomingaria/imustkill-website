/**
 * Card Artwork Utilities
 *
 * Generates URLs for card artwork from the CloudFront CDN.
 * Falls back through: card art → deck back → placeholder
 *
 * S3 Bucket Structure:
 *   cards/{deck}/{cardName}.png - Individual card art
 *   backs/{deck}.png - Deck back artwork
 *   placeholder.png - Default fallback image
 *
 * Configuration:
 *   Set REACT_APP_ARTWORK_CDN_URL in .env
 */

const ARTWORK_CDN_URL = process.env.REACT_APP_ARTWORK_CDN_URL || ""

// Local placeholder fallback when CDN is not configured
const LOCAL_PLACEHOLDER = "/placeholder-card.svg"

/**
 * Sanitize a string for use in S3 key (URL-safe)
 * @param {string} str - String to sanitize
 * @returns {string} URL-safe string
 */
const sanitizeKey = (str) => {
    if (!str) return "unknown"
    return str
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/-+/g, "-") // Collapse multiple hyphens
        .replace(/^-|-$/g, "") // Trim leading/trailing hyphens
}

/**
 * Get the URL for a specific card's artwork
 * @param {string} deck - Deck name
 * @param {string} cardName - Card name
 * @returns {string} URL to card artwork
 */
export const getCardArtUrl = (deck, cardName) => {
    if (!ARTWORK_CDN_URL) return LOCAL_PLACEHOLDER
    const deckKey = sanitizeKey(deck)
    const cardKey = sanitizeKey(cardName)
    return `${ARTWORK_CDN_URL}/cards/${deckKey}/${cardKey}.png`
}

/**
 * Get the URL for a deck's back artwork
 * @param {string} deck - Deck name
 * @returns {string} URL to deck back artwork
 */
export const getDeckBackUrl = (deck) => {
    if (!ARTWORK_CDN_URL) return LOCAL_PLACEHOLDER
    const deckKey = sanitizeKey(deck)
    return `${ARTWORK_CDN_URL}/backs/${deckKey}.png`
}

/**
 * Get the placeholder image URL
 * @returns {string} URL to placeholder image
 */
export const getPlaceholderUrl = () => {
    if (!ARTWORK_CDN_URL) return LOCAL_PLACEHOLDER
    return `${ARTWORK_CDN_URL}/placeholder.png`
}

/**
 * React hook-friendly image URL with fallback handling
 * Use this in components to get the best available image
 *
 * Note: Since CloudFront returns placeholder.png for 404s with 200 status,
 * we start with deck back as primary (since individual card art doesn't exist yet).
 * Once individual card art is uploaded, change back to cardArtUrl as primary.
 *
 * @param {Object} card - Card object with deck and name
 * @param {string} card.deck - Deck name
 * @param {string} card.name - Card name
 * @returns {Object} Image props and fallback handlers
 */
export const getCardImageProps = (card) => {
    // const cardArtUrl = getCardArtUrl(card?.deck, card?.name) // For future individual card art
    const deckBackUrl = getDeckBackUrl(card?.deck)
    const placeholderUrl = getPlaceholderUrl()

    return {
        // Start with deck back since individual card art doesn't exist yet
        src: deckBackUrl,
        // Fallback to placeholder if deck back fails
        onError: (e) => {
            if (e.target.src !== placeholderUrl) {
                e.target.src = placeholderUrl
            }
        },
        alt: card?.name || "Card",
    }
}

/**
 * Get image source with precomputed fallback URLs
 * Useful for img components that need all URLs upfront
 *
 * @param {Object} card - Card object with deck and name
 * @returns {Object} Primary, fallback, and placeholder URLs
 */
export const getCardImageSources = (card) => {
    return {
        primary: getCardArtUrl(card?.deck, card?.name),
        fallback: getDeckBackUrl(card?.deck),
        placeholder: getPlaceholderUrl(),
    }
}

const cardArtwork = {
    getCardArtUrl,
    getDeckBackUrl,
    getPlaceholderUrl,
    getCardImageProps,
    getCardImageSources,
    sanitizeKey,
}

export default cardArtwork
