/**
 * EditableSection
 *
 * Wraps any section Paper/Box. When an admin is signed in, hovering the
 * section reveals:
 *   • Amber edit button  (top-right)  — edit section JSON
 *   • Red delete button  (top-left)   — delete section
 *   • Green + buttons    (top & bottom centre) — insert new section above / below
 *
 * Clicking edit opens a structured JSON edit modal.
 * Clicking + opens a "New Section" creation modal with title, window-type
 * selector, and description text.
 *
 * Props:
 *   category        {string}  e.g. "combat-mechanics"
 *   sectionId       {string}  e.g. "actions"
 *   sectionOrder    {number}  0-based display order
 *   section         {object}  current full section JSON object
 *   onUpdate        {func}    called with updated section after edit save
 *   onDelete        {func}    (optional) called with sectionId after delete
 *   onInsertAfter   {func}    (optional) called with newSection after insert below
 *   onInsertBefore  {func}    (optional) called with newSection after insert above
 *   children        {node}    the existing section JSX to render
 */
import React, { useState, useCallback } from "react"
import {
    Box,
    Modal,
    Paper,
    Typography,
    TextField,
    Button,
    IconButton,
    Tooltip,
    CircularProgress,
    Alert,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Divider,
} from "@mui/material"
import {
    EditOutlined,
    Close,
    Save,
    CheckCircle,
    DeleteOutline,
    AddCircleOutline,
} from "@mui/icons-material"
import { useAuth } from "../context/AuthContext"
import { updateRule, deleteRule, rulesApiEnabled } from "../utils/rulesClient"

// ── Window type options ────────────────────────────────────────────────────────
const WINDOW_TYPES = [
    {
        value: "rule-block",
        label: "Rule Block",
        description: "Title + text body (most common)",
    },
    { value: "callout", label: "Callout", description: "Highlighted info box" },
    {
        value: "numbered-list",
        label: "Numbered List",
        description: "Title + ordered steps",
    },
    {
        value: "stat-table",
        label: "Stat Table",
        description: "Title + stat/value pairs",
    },
]

// ── Slugify helper ─────────────────────────────────────────────────────────────
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 48)
}

// ── Modal styles ───────────────────────────────────────────────────────────────
const modalSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: { xs: 1, sm: 2 },
}

const paperSx = {
    width: { xs: "calc(100vw - 16px)", sm: 680 },
    maxWidth: 680,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    overflow: "hidden",
    outline: "none",
}

// ── Shared insert-button style ─────────────────────────────────────────────────
const insertBtnSx = {
    bgcolor: "rgba(46, 125, 50, 0.15)",
    border: "1px solid rgba(46,125,50,0.5)",
    color: "#4caf50",
    backdropFilter: "blur(4px)",
    width: 26,
    height: 26,
    "&:hover": {
        bgcolor: "rgba(46,125,50,0.3)",
        border: "1px solid #4caf50",
    },
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function EditableSection({
    category,
    sectionId,
    sectionOrder = 0,
    section,
    onUpdate,
    onDelete,
    onInsertAfter,
    onInsertBefore,
    children,
}) {
    const { isAdmin, idToken } = useAuth()
    const [hovered, setHovered] = useState(false)

    // ── Edit modal state ───────────────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [saveError, setSaveError] = useState("")
    const [editTitle, setEditTitle] = useState("")
    const [editJson, setEditJson] = useState("")
    const [jsonError, setJsonError] = useState("")

    // ── Delete state ───────────────────────────────────────────────────────────
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState("")

    // ── Insert modal state ─────────────────────────────────────────────────────
    const [insertDir, setInsertDir] = useState(null) // "above" | "below"
    const [insertTitle, setInsertTitle] = useState("")
    const [insertWindowType, setInsertWindowType] = useState("rule-block")
    const [insertDescription, setInsertDescription] = useState("")
    const [inserting, setInserting] = useState(false)
    const [insertError, setInsertError] = useState("")

    // ── Open edit modal ────────────────────────────────────────────────────────
    const openModal = useCallback(() => {
        setEditTitle(section?.title || "")
        setEditJson(JSON.stringify(section || {}, null, 2))
        setJsonError("")
        setSaveError("")
        setSaveSuccess(false)
        setModalOpen(true)
    }, [section])

    // ── Validate JSON ──────────────────────────────────────────────────────────
    const handleJsonChange = (value) => {
        setEditJson(value)
        try {
            JSON.parse(value)
            setJsonError("")
        } catch (e) {
            setJsonError(e.message)
        }
    }

    // ── Edit Save ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        let parsed
        try {
            parsed = JSON.parse(editJson)
        } catch (e) {
            setJsonError("Invalid JSON: " + e.message)
            return
        }
        parsed.title = editTitle || parsed.title || ""
        parsed.id = sectionId

        setSaving(true)
        setSaveError("")
        try {
            await updateRule(
                category,
                sectionId,
                {
                    title: parsed.title,
                    order: sectionOrder,
                    content: parsed,
                    updatedBy: "admin-ui",
                },
                idToken,
            )
            setSaveSuccess(true)
            onUpdate?.(parsed)
            setTimeout(() => {
                setModalOpen(false)
                setSaveSuccess(false)
            }, 1200)
        } catch (err) {
            setSaveError(err.message || "Save failed")
        } finally {
            setSaving(false)
        }
    }

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError("")
        try {
            await deleteRule(category, sectionId, idToken)
            setConfirmDelete(false)
            onDelete?.(sectionId)
        } catch (err) {
            setDeleteError(err.message || "Delete failed")
        } finally {
            setDeleting(false)
        }
    }

    // ── Open insert modal ──────────────────────────────────────────────────────
    const openInsert = (dir) => {
        setInsertDir(dir)
        setInsertTitle("")
        setInsertWindowType("rule-block")
        setInsertDescription("")
        setInsertError("")
    }

    // ── Insert Save ────────────────────────────────────────────────────────────
    const handleInsertSave = async () => {
        if (!insertTitle.trim()) {
            setInsertError("Title is required.")
            return
        }
        const newId = slugify(insertTitle) + "-" + Date.now().toString(36)
        const newOrder =
            insertDir === "above" ? sectionOrder - 0.5 : sectionOrder + 0.5
        const newSection = {
            id: newId,
            title: insertTitle.trim(),
            windowType: insertWindowType,
            description: insertDescription.trim(),
        }

        setInserting(true)
        setInsertError("")
        try {
            await updateRule(
                category,
                newId,
                {
                    title: newSection.title,
                    order: newOrder,
                    content: newSection,
                    updatedBy: "admin-ui",
                },
                idToken,
            )
            if (insertDir === "above") {
                onInsertBefore?.(sectionId, newSection)
            } else {
                onInsertAfter?.(sectionId, newSection)
            }
            setInsertDir(null)
        } catch (err) {
            setInsertError(err.message || "Insert failed")
        } finally {
            setInserting(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    if (!isAdmin || !rulesApiEnabled()) {
        return <>{children}</>
    }

    return (
        <>
            {/* ── Wrapper: centres content + provides position context for buttons ── */}
            <Box
                sx={{
                    position: "relative",
                    width: "100%",
                    overflow: "visible",
                    display: "flex",
                    justifyContent: "center",
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {children}

                {hovered && (
                    <>
                        {/* Edit button — amber, top-right */}
                        <Tooltip title='Edit section (admin)' placement='top'>
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                }}
                            >
                                <IconButton
                                    size='small'
                                    onClick={openModal}
                                    sx={{
                                        bgcolor: "rgba(255, 160, 0, 0.15)",
                                        border: "1px solid rgba(255,160,0,0.5)",
                                        color: "#ffa000",
                                        backdropFilter: "blur(4px)",
                                        width: 30,
                                        height: 30,
                                        "&:hover": {
                                            bgcolor: "rgba(255,160,0,0.3)",
                                            border: "1px solid #ffa000",
                                        },
                                    }}
                                >
                                    <EditOutlined sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Box>
                        </Tooltip>

                        {/* Delete button — red, top-left */}
                        <Tooltip title='Delete section' placement='top'>
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 8,
                                    left: 8,
                                    zIndex: 10,
                                }}
                            >
                                <IconButton
                                    size='small'
                                    onClick={() => setConfirmDelete(true)}
                                    sx={{
                                        bgcolor: "rgba(198, 40, 40, 0.12)",
                                        border: "1px solid rgba(198,40,40,0.4)",
                                        color: "#e57373",
                                        backdropFilter: "blur(4px)",
                                        width: 30,
                                        height: 30,
                                        "&:hover": {
                                            bgcolor: "rgba(198,40,40,0.25)",
                                            border: "1px solid #e57373",
                                        },
                                    }}
                                >
                                    <DeleteOutline sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Box>
                        </Tooltip>

                        {/* Insert Above button — floats above the section, no layout impact */}
                        <Tooltip title='Insert section above' placement='top'>
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: -13,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    zIndex: 20,
                                }}
                            >
                                <IconButton
                                    size='small'
                                    onClick={() => openInsert("above")}
                                    sx={insertBtnSx}
                                >
                                    <AddCircleOutline sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        </Tooltip>

                        {/* Insert Below button — floats below the section, no layout impact */}
                        <Tooltip
                            title='Insert section below'
                            placement='bottom'
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    bottom: -13,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    zIndex: 20,
                                }}
                            >
                                <IconButton
                                    size='small'
                                    onClick={() => openInsert("below")}
                                    sx={insertBtnSx}
                                >
                                    <AddCircleOutline sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        </Tooltip>
                    </>
                )}
            </Box>

            {/* ══════════════════════════════════════════════════════════════
                Edit Modal
            ═══════════════════════════════════════════════════════════════ */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                sx={modalSx}
            >
                <Paper sx={paperSx}>
                    {/* Header */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            bgcolor: "#1a0a0a",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                        }}
                    >
                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: "0.95rem",
                                    color: "#ffa000",
                                }}
                            >
                                Edit Rule Section
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: "0.7rem",
                                    opacity: 0.5,
                                    mt: 0.2,
                                }}
                            >
                                {category} / {sectionId}
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setModalOpen(false)}
                            sx={{ color: "#fff" }}
                            size='small'
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Body */}
                    <Box
                        sx={{
                            p: 2.5,
                            overflowY: "auto",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {saveError && (
                            <Alert
                                severity='error'
                                onClose={() => setSaveError("")}
                            >
                                {saveError}
                            </Alert>
                        )}
                        {saveSuccess && (
                            <Alert severity='success' icon={<CheckCircle />}>
                                Saved!
                            </Alert>
                        )}
                        <TextField
                            label='Section Title'
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            fullWidth
                            size='small'
                        />
                        <TextField
                            label='Section Content (JSON)'
                            value={editJson}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            multiline
                            minRows={12}
                            maxRows={24}
                            fullWidth
                            error={Boolean(jsonError)}
                            helperText={
                                jsonError ||
                                "Edit the full section object. The title field above overrides title here."
                            }
                            inputProps={{
                                style: {
                                    fontFamily: "monospace",
                                    fontSize: "0.78rem",
                                    lineHeight: 1.5,
                                },
                            }}
                        />
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            borderTop: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1.5,
                            flexShrink: 0,
                        }}
                    >
                        <Button
                            onClick={() => setModalOpen(false)}
                            disabled={saving}
                            sx={{ opacity: 0.7 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={handleSave}
                            disabled={
                                saving || Boolean(jsonError) || saveSuccess
                            }
                            startIcon={
                                saving ? (
                                    <CircularProgress
                                        size={14}
                                        color='inherit'
                                    />
                                ) : saveSuccess ? (
                                    <CheckCircle />
                                ) : (
                                    <Save />
                                )
                            }
                            sx={{
                                bgcolor: "#ffa000",
                                color: "#1a0a0a",
                                fontWeight: "bold",
                                "&:hover": { bgcolor: "#ffb300" },
                                "&:disabled": {
                                    bgcolor: "#666",
                                    color: "#999",
                                },
                            }}
                        >
                            {saving
                                ? "Saving…"
                                : saveSuccess
                                  ? "Saved!"
                                  : "Save Changes"}
                        </Button>
                    </Box>
                </Paper>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                Delete Confirm Modal
            ═══════════════════════════════════════════════════════════════ */}
            <Modal
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                sx={modalSx}
            >
                <Paper
                    sx={{
                        width: { xs: "calc(100vw - 32px)", sm: 420 },
                        maxWidth: 420,
                        borderRadius: "16px",
                        overflow: "hidden",
                        outline: "none",
                    }}
                >
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            bgcolor: "#c62828",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: '"Cinzel", serif',
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                            }}
                        >
                            Delete Section?
                        </Typography>
                        <IconButton
                            onClick={() => setConfirmDelete(false)}
                            sx={{ color: "#fff" }}
                            size='small'
                        >
                            <Close />
                        </IconButton>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                        {deleteError && (
                            <Alert
                                severity='error'
                                onClose={() => setDeleteError("")}
                                sx={{ mb: 2 }}
                            >
                                {deleteError}
                            </Alert>
                        )}
                        <Typography sx={{ mb: 2, opacity: 0.8 }}>
                            Permanently delete{" "}
                            <strong>{section?.title || sectionId}</strong>? This
                            cannot be undone.
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1.5,
                            }}
                        >
                            <Button
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                                sx={{ opacity: 0.7 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant='contained'
                                color='error'
                                onClick={handleDelete}
                                disabled={deleting}
                                startIcon={
                                    deleting ? (
                                        <CircularProgress
                                            size={14}
                                            color='inherit'
                                        />
                                    ) : (
                                        <DeleteOutline />
                                    )
                                }
                            >
                                {deleting ? "Deleting…" : "Delete"}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════
                Insert Section Modal
            ═══════════════════════════════════════════════════════════════ */}
            <Modal
                open={Boolean(insertDir)}
                onClose={() => setInsertDir(null)}
                sx={modalSx}
            >
                <Paper
                    sx={{
                        ...paperSx,
                        maxWidth: 520,
                        width: { xs: "calc(100vw - 32px)", sm: 520 },
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            bgcolor: "#1a2a1a",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                        }}
                    >
                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                    fontSize: "0.95rem",
                                    color: "#4caf50",
                                }}
                            >
                                Add New Section
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: "0.7rem",
                                    opacity: 0.5,
                                    mt: 0.2,
                                }}
                            >
                                {category} — inserting{" "}
                                {insertDir === "above" ? "above" : "below"} "
                                {section?.title || sectionId}"
                            </Typography>
                        </Box>
                        <IconButton
                            onClick={() => setInsertDir(null)}
                            sx={{ color: "#fff" }}
                            size='small'
                        >
                            <Close />
                        </IconButton>
                    </Box>

                    {/* Body */}
                    <Box
                        sx={{
                            p: 2.5,
                            overflowY: "auto",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2.5,
                        }}
                    >
                        {insertError && (
                            <Alert
                                severity='error'
                                onClose={() => setInsertError("")}
                            >
                                {insertError}
                            </Alert>
                        )}

                        <TextField
                            label='Section Title'
                            value={insertTitle}
                            onChange={(e) => setInsertTitle(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            size='small'
                            helperText={
                                insertTitle
                                    ? `ID will be: ${slugify(insertTitle)}-…`
                                    : "Required"
                            }
                        />

                        <FormControl fullWidth size='small'>
                            <InputLabel>Window Type</InputLabel>
                            <Select
                                value={insertWindowType}
                                label='Window Type'
                                onChange={(e) =>
                                    setInsertWindowType(e.target.value)
                                }
                            >
                                {WINDOW_TYPES.map((wt) => (
                                    <MenuItem key={wt.value} value={wt.value}>
                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.85rem",
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {wt.label}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: "0.7rem",
                                                    opacity: 0.55,
                                                }}
                                            >
                                                {wt.description}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Divider sx={{ opacity: 0.3 }} />

                        <TextField
                            label='Description / Body Text'
                            value={insertDescription}
                            onChange={(e) =>
                                setInsertDescription(e.target.value)
                            }
                            multiline
                            minRows={5}
                            fullWidth
                            helperText='Main text shown in the section. You can edit the full JSON later.'
                        />
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.5,
                            borderTop: "1px solid",
                            borderColor: "divider",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1.5,
                            flexShrink: 0,
                        }}
                    >
                        <Button
                            onClick={() => setInsertDir(null)}
                            disabled={inserting}
                            sx={{ opacity: 0.7 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={handleInsertSave}
                            disabled={inserting || !insertTitle.trim()}
                            startIcon={
                                inserting ? (
                                    <CircularProgress
                                        size={14}
                                        color='inherit'
                                    />
                                ) : (
                                    <AddCircleOutline />
                                )
                            }
                            sx={{
                                bgcolor: "#2e7d32",
                                color: "#fff",
                                fontWeight: "bold",
                                "&:hover": { bgcolor: "#388e3c" },
                                "&:disabled": {
                                    bgcolor: "#666",
                                    color: "#999",
                                },
                            }}
                        >
                            {inserting ? "Creating…" : "Create Section"}
                        </Button>
                    </Box>
                </Paper>
            </Modal>
        </>
    )
}
