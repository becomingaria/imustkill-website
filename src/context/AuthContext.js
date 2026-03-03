/**
 * AuthContext — exposes admin auth state across the whole app.
 *
 * Admin.js handles the actual sign-in/sign-out flows and writes tokens
 * to localStorage. This context reads those tokens and makes the state
 * available anywhere (rules pages, EditableSection, etc.).
 *
 * Storage keys (set by Admin.js):
 *   imk_admin_id_token     — Cognito JWT id token
 *   imk_admin_access_token — Cognito access token
 *   imk_admin_email        — signed-in email
 */
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react"

const AuthContext = createContext({
    isAdmin: false,
    adminEmail: null,
    idToken: null,
    refreshAuth: () => {},
})

// ── Helper: check if stored token is still valid ──────────────────────────────
function readStoredAuth() {
    try {
        const idToken = localStorage.getItem("imk_admin_id_token")
        const email = localStorage.getItem("imk_admin_email")
        if (!idToken || !email)
            return { isAdmin: false, adminEmail: null, idToken: null }

        // Decode JWT payload to check expiry (no signature needed)
        const payload = JSON.parse(atob(idToken.split(".")[1]))
        if (payload.exp * 1000 <= Date.now()) {
            // Expired — clean up
            localStorage.removeItem("imk_admin_id_token")
            localStorage.removeItem("imk_admin_access_token")
            localStorage.removeItem("imk_admin_email")
            return { isAdmin: false, adminEmail: null, idToken: null }
        }

        return { isAdmin: true, adminEmail: email, idToken }
    } catch {
        return { isAdmin: false, adminEmail: null, idToken: null }
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => readStoredAuth())

    const refreshAuth = useCallback(() => {
        setAuth(readStoredAuth())
    }, [])

    // Sync when Admin.js writes to localStorage in the same tab
    // (storage events only fire for CROSS-tab changes, so we also expose refreshAuth)
    useEffect(() => {
        const onStorage = (e) => {
            if (
                e.key === "imk_admin_id_token" ||
                e.key === "imk_admin_email" ||
                e.key === null // localStorage.clear()
            ) {
                setAuth(readStoredAuth())
            }
        }
        // Cross-tab: storage event
        window.addEventListener("storage", onStorage)
        // Same-tab: custom event (dispatched by Admin.js after sign-in/out)
        const onAuthChanged = () => setAuth(readStoredAuth())
        window.addEventListener("imk-auth-changed", onAuthChanged)
        return () => {
            window.removeEventListener("storage", onStorage)
            window.removeEventListener("imk-auth-changed", onAuthChanged)
        }
    }, [])

    return (
        <AuthContext.Provider value={{ ...auth, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
    return useContext(AuthContext)
}

export default AuthContext
