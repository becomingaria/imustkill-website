/**
 * useSectionManager
 *
 * Wraps useRulesEngine for a single category and provides mutable section
 * state with insert / delete / update helpers.  Designed to replace the
 * hand-rolled `setCombatData(...)` boilerplate in every rules page.
 *
 * Usage:
 *   const { title, sections, loading, error,
 *           handleUpdate, handleDelete,
 *           handleInsertAfter, handleInsertBefore } = useSectionManager("combat-mechanics")
 *
 *   Then pass the callbacks to <EditableSection ... onUpdate onDelete onInsertAfter onInsertBefore>
 */

import { useState, useEffect } from "react"
import useRulesEngine from "./useRulesEngine"

export default function useSectionManager(categoryKey) {
    const { getCategoryRules, loading, error } = useRulesEngine()
    const [sections, setSections] = useState([])
    const [title, setTitle] = useState("")

    // Populate from the engine once data is loaded
    useEffect(() => {
        if (!loading && !error && categoryKey) {
            const data = getCategoryRules(categoryKey)
            if (data) {
                setTitle(data.title || "")
                setSections(data.sections || [])
            }
        }
    }, [loading, error, categoryKey, getCategoryRules])

    // ── Update one section in place ─────────────────────────────────────────
    const handleUpdate = (sectionId, updatedSection) => {
        setSections((prev) =>
            prev.map((s) => (s.id === sectionId ? updatedSection : s)),
        )
    }

    // ── Remove a section from the list ──────────────────────────────────────
    const handleDelete = (sectionId) => {
        setSections((prev) => prev.filter((s) => s.id !== sectionId))
    }

    // ── Insert a new section immediately after `afterSectionId` ─────────────
    const handleInsertAfter = (afterSectionId, newSection) => {
        setSections((prev) => {
            const idx = prev.findIndex((s) => s.id === afterSectionId)
            const next = [...prev]
            next.splice(idx + 1, 0, newSection)
            return next
        })
    }

    // ── Insert a new section immediately before `beforeSectionId` ───────────
    const handleInsertBefore = (beforeSectionId, newSection) => {
        setSections((prev) => {
            const idx = prev.findIndex((s) => s.id === beforeSectionId)
            const next = [...prev]
            next.splice(Math.max(0, idx), 0, newSection)
            return next
        })
    }

    return {
        title,
        sections,
        loading,
        error,
        handleUpdate,
        handleDelete,
        handleInsertAfter,
        handleInsertBefore,
    }
}
