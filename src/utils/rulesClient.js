/**
 * rulesClient — API helper for the Rules Database.
 *
 * API URL comes from REACT_APP_RULES_API_URL env var.
 * If not set, all functions return null so useRulesEngine falls back to JSON.
 *
 * Routes:
 *   GET  /rules                              → all sections grouped by category
 *   GET  /rules/{category}                  → sections for one category
 *   GET  /rules/{category}/{sectionId}      → one section
 *   PUT  /rules/{category}/{sectionId}      → update (admin, JWT required)
 *   DELETE /rules/{category}/{sectionId}    → delete (admin, JWT required)
 *   POST /rules/seed                        → bulk seed (admin, JWT required)
 */

const BASE = (process.env.REACT_APP_RULES_API_URL || "").replace(/\/+$/, "")

// Returns true if the API is configured
export function rulesApiEnabled() {
    return Boolean(BASE)
}

// ── Internal fetch ────────────────────────────────────────────────────────────
async function rulesFetch(path, method = "GET", body, idToken) {
    const headers = { "Content-Type": "application/json" }
    if (idToken) headers["Authorization"] = `Bearer ${idToken}`

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
}

// ── Public reads ──────────────────────────────────────────────────────────────

/**
 * Fetch all rule sections grouped by category.
 * Returns { grouped: { [category]: Section[] }, items: Section[] }
 */
export async function getAllRules() {
    if (!BASE) return null
    return rulesFetch("/rules")
}

/**
 * Fetch all sections for one category.
 * Returns { category, items: Section[] }
 */
export async function getRulesByCategory(category) {
    if (!BASE) return null
    return rulesFetch(`/rules/${encodeURIComponent(category)}`)
}

/**
 * Fetch a single section.
 * Returns { item: Section }
 */
export async function getRule(category, sectionId) {
    if (!BASE) return null
    return rulesFetch(
        `/rules/${encodeURIComponent(category)}/${encodeURIComponent(sectionId)}`,
    )
}

// ── Admin writes ──────────────────────────────────────────────────────────────

/**
 * Update (upsert) a rule section.
 * @param {string} category
 * @param {string} sectionId
 * @param {{ title, order, content, updatedBy }} data
 * @param {string} idToken  — Cognito id_token from AuthContext
 */
export async function updateRule(category, sectionId, data, idToken) {
    return rulesFetch(
        `/rules/${encodeURIComponent(category)}/${encodeURIComponent(sectionId)}`,
        "PUT",
        data,
        idToken,
    )
}

/**
 * Delete a rule section.
 * @param {string} category
 * @param {string} sectionId
 * @param {string} idToken
 */
export async function deleteRule(category, sectionId, idToken) {
    return rulesFetch(
        `/rules/${encodeURIComponent(category)}/${encodeURIComponent(sectionId)}`,
        "DELETE",
        undefined,
        idToken,
    )
}

/**
 * Seed the database with an array of sections.
 * @param {{ category, sectionId, title, order, content }[]} sections
 * @param {string} idToken
 */
export async function seedRules(sections, idToken) {
    return rulesFetch(
        "/rules/seed",
        "POST",
        { sections, updatedBy: "admin-ui" },
        idToken,
    )
}

// ── Nav config helpers ────────────────────────────────────────────────────────

/**
 * Fetch the nav config from the DB.
 * Stored as category=_meta, sectionId=nav-config.
 * Returns null if not found or API is disabled.
 */
export async function getNavConfig() {
    if (!BASE) return null
    try {
        const result = await rulesFetch("/rules/_meta/nav-config")
        return result?.item?.content?.navItems ?? null
    } catch {
        return null // 404 or API error — caller falls back to static JSON
    }
}

/**
 * Save the nav config to the DB.
 * @param {object[]} navItems  Array of nav item objects
 * @param {string}   idToken   Cognito id_token
 */
export async function saveNavConfig(navItems, idToken) {
    return rulesFetch(
        "/rules/_meta/nav-config",
        "PUT",
        {
            title: "Nav Config",
            order: 0,
            content: { navItems },
            updatedBy: "admin-ui",
        },
        idToken,
    )
}

// ── Whitepaper version helpers ────────────────────────────────────────────────
// Version is stored as { major: number, minor: number } in content.
// Displayed as "${major}.${minor}" — e.g. "1.1", "1.12", "2.0".
// Minor rolls over from 99 → major+1, minor=0.

/** Parse a "major.minor" version string into { major, minor }. */
export function parseVersion(str) {
    const parts = String(str || "1.1").split(".")
    return {
        major: parseInt(parts[0], 10) || 1,
        minor: parseInt(parts[1], 10) || 1,
    }
}

/** Format a { major, minor } object back to a string. */
export function formatVersion({ major, minor }) {
    return `${major}.${minor}`
}

/** Compute the next version after one edit. */
export function nextVersion({ major, minor }) {
    if (minor >= 99) return { major: major + 1, minor: 0 }
    return { major, minor: minor + 1 }
}

/**
 * Fetch the current whitepaper version from the DB.
 * Returns a version string like "1.1". Falls back to "1.1" if not stored yet.
 */
export async function getWhitepaperVersion() {
    if (!BASE) return "1.1"
    try {
        const result = await rulesFetch("/rules/_meta/whitepaper-version")
        const v = result?.item?.content
        if (v?.major !== undefined) return formatVersion(v)
        return "1.1"
    } catch {
        return "1.1"
    }
}

/**
 * Increment the whitepaper version by one edit and persist to the DB.
 * Returns the new version string.
 * @param {string} idToken  Cognito id_token (required to write)
 * @param {string} [currentVersionStr]  Pass the currently known version to
 *   avoid an extra round-trip; if omitted the method fetches it first.
 */
export async function bumpWhitepaperVersion(idToken, currentVersionStr) {
    if (!BASE) return currentVersionStr || "1.1"
    try {
        const current = currentVersionStr
            ? parseVersion(currentVersionStr)
            : parseVersion(await getWhitepaperVersion())
        const bumped = nextVersion(current)
        await rulesFetch(
            "/rules/_meta/whitepaper-version",
            "PUT",
            {
                title: "Whitepaper Version",
                order: 0,
                content: bumped,
                updatedBy: "admin-ui",
            },
            idToken,
        )
        return formatVersion(bumped)
    } catch {
        return currentVersionStr || "1.1"
    }
}
