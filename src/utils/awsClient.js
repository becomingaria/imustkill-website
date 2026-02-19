/**
 * AWS Session Client for I Must Kill Initiative Tracker
 *
 * Replaces Supabase with direct AWS API calls.
 * Uses HTTP API for CRUD operations and WebSocket for real-time updates.
 *
 * Configuration:
 * Set these in .env (or .env.local for Create React App):
 *   REACT_APP_SESSIONS_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
 *   REACT_APP_WEBSOCKET_API_URL=wss://xxxxxx.execute-api.us-east-1.amazonaws.com/prod
 */

// API endpoints from environment
const HTTP_API_URL = process.env.REACT_APP_SESSIONS_API_URL || ""
const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API_URL || ""

// Debug: Log API URLs on load (remove in production)
if (!HTTP_API_URL) {
    console.warn("REACT_APP_SESSIONS_API_URL is not set!")
}
if (!WEBSOCKET_API_URL) {
    console.warn("REACT_APP_WEBSOCKET_API_URL is not set!")
}

// Active WebSocket connection
let ws = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
let pingInterval = null
let messageHandlers = new Set()

/**
 * Session CRUD Operations (HTTP API)
 */

/**
 * Create a new initiative session
 * @param {Object} combatState - The initial combat state
 * @param {number} expiresInMinutes - Session lifetime (default 480 = 8 hours)
 * @returns {Promise<{sessionId: string, expiresAt: string}>}
 */
export const createSession = async (combatState, expiresInMinutes = 480) => {
    if (!HTTP_API_URL) {
        throw new Error(
            "API URL not configured. Please set REACT_APP_SESSIONS_API_URL environment variable.",
        )
    }

    console.log("Creating session at:", `${HTTP_API_URL}/sessions`)

    const response = await fetch(`${HTTP_API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combatState, expiresInMinutes }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create session")
    }

    return response.json()
}

/**
 * Get a session by ID
 * @param {string} sessionId
 * @returns {Promise<{sessionId: string, combatState: Object, expiresAt: string}>}
 */
export const getSession = async (sessionId) => {
    const response = await fetch(`${HTTP_API_URL}/sessions/${sessionId}`)

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Session not found")
        }
        const error = await response.json()
        throw new Error(error.error || "Failed to get session")
    }

    return response.json()
}

/**
 * Update a session's combat state
 * @param {string} sessionId
 * @param {Object} combatState
 * @param {number} extendTtlMinutes - Optionally extend TTL
 * @returns {Promise<{message: string, updatedAt: number}>}
 */
export const updateSession = async (
    sessionId,
    combatState,
    extendTtlMinutes = null,
) => {
    const body = { combatState }
    if (extendTtlMinutes) {
        body.extendTtlMinutes = extendTtlMinutes
    }

    const response = await fetch(`${HTTP_API_URL}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update session")
    }

    return response.json()
}

/**
 * Delete/end a session
 * @param {string} sessionId
 * @returns {Promise<{message: string}>}
 */
export const deleteSession = async (sessionId) => {
    const response = await fetch(`${HTTP_API_URL}/sessions/${sessionId}`, {
        method: "DELETE",
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete session")
    }

    return response.json()
}

/**
 * WebSocket Operations (Real-time Updates)
 */

/**
 * Connect to WebSocket and subscribe to a session
 * @param {string} sessionId - Session to subscribe to
 * @param {function} onUpdate - Callback for session updates
 * @param {function} onError - Callback for errors
 * @param {function} onClose - Callback when session closes
 * @returns {Promise<void>}
 */
export const subscribeToSession = (sessionId, onUpdate, onError, onClose) => {
    return new Promise((resolve, reject) => {
        if (!WEBSOCKET_API_URL) {
            reject(new Error("WebSocket API URL not configured"))
            return
        }

        // Close existing connection if any
        if (ws) {
            ws.close()
            ws = null
        }

        clearInterval(pingInterval)
        reconnectAttempts = 0

        const connect = () => {
            console.log("Connecting to WebSocket...")
            ws = new WebSocket(WEBSOCKET_API_URL)

            ws.onopen = () => {
                console.log(
                    "WebSocket connected, subscribing to session:",
                    sessionId,
                )
                reconnectAttempts = 0

                // Subscribe to the session
                ws.send(
                    JSON.stringify({
                        action: "subscribe",
                        sessionId,
                    }),
                )

                // Start ping to keep connection alive
                pingInterval = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ action: "ping" }))
                    }
                }, 30000) // Ping every 30 seconds
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log("WebSocket message:", data.type)

                    switch (data.type) {
                        case "subscribed":
                            // Successfully subscribed, initial state received
                            if (data.combatState) {
                                onUpdate(data.combatState)
                            }
                            resolve()
                            break

                        case "session_update":
                            // Session was updated by the host
                            onUpdate(data.data)
                            break

                        case "session_closed":
                            // Host ended the session
                            if (onClose) {
                                onClose(data.message || "Session ended")
                            }
                            ws.close()
                            break

                        case "error":
                            if (onError) {
                                onError(new Error(data.message))
                            }
                            break

                        case "pong":
                            // Keep-alive response, ignore
                            break

                        default:
                            console.log("Unknown message type:", data.type)
                    }

                    // Notify all registered handlers
                    messageHandlers.forEach((handler) => handler(data))
                } catch (err) {
                    console.error("Error parsing WebSocket message:", err)
                }
            }

            ws.onerror = (error) => {
                console.error("WebSocket error:", error)
                if (onError) {
                    onError(new Error("WebSocket connection error"))
                }
            }

            ws.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason)
                clearInterval(pingInterval)

                // Attempt to reconnect (unless intentionally closed)
                if (
                    event.code !== 1000 &&
                    reconnectAttempts < MAX_RECONNECT_ATTEMPTS
                ) {
                    reconnectAttempts++
                    const delay = Math.min(
                        1000 * Math.pow(2, reconnectAttempts),
                        30000,
                    )
                    console.log(
                        `Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`,
                    )
                    setTimeout(connect, delay)
                } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    if (onError) {
                        onError(
                            new Error(
                                "Failed to reconnect after multiple attempts",
                            ),
                        )
                    }
                }
            }
        }

        connect()
    })
}

/**
 * Unsubscribe from current session
 */
export const unsubscribeFromSession = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "unsubscribe" }))
    }
}

/**
 * Disconnect WebSocket completely
 */
export const disconnect = () => {
    clearInterval(pingInterval)
    if (ws) {
        ws.close(1000, "Client disconnecting")
        ws = null
    }
    messageHandlers.clear()
}

/**
 * Add a message handler
 * @param {function} handler - Function to call on each WebSocket message
 * @returns {function} - Cleanup function to remove the handler
 */
export const addMessageHandler = (handler) => {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
}

/**
 * Check if WebSocket is connected
 * @returns {boolean}
 */
export const isConnected = () => {
    return ws && ws.readyState === WebSocket.OPEN
}

/**
 * Get connection state
 * @returns {'disconnected'|'connecting'|'connected'|'closing'}
 */
export const getConnectionState = () => {
    if (!ws) return "disconnected"
    switch (ws.readyState) {
        case WebSocket.CONNECTING:
            return "connecting"
        case WebSocket.OPEN:
            return "connected"
        case WebSocket.CLOSING:
            return "closing"
        default:
            return "disconnected"
    }
}

// Re-export for compatibility (can use these instead of Supabase)
export default {
    createSession,
    getSession,
    updateSession,
    deleteSession,
    subscribeToSession,
    unsubscribeFromSession,
    disconnect,
    addMessageHandler,
    isConnected,
    getConnectionState,
}
