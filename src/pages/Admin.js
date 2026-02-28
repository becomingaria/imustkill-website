import React, { useState, useEffect, useCallback, useRef } from "react"
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    IconButton,
    Chip,
    CircularProgress,
    LinearProgress,
    Alert,
    Modal,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    Tooltip,
    Grid,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
} from "@mui/material"
import {
    Add,
    Edit,
    Delete,
    Logout,
    Casino,
    BugReport,
    CloudUpload,
    Close,
    Save,
    Warning,
    AutoAwesome,
    FileDownload,
    FileUpload,
    TableChart,
    CheckCircle,
} from "@mui/icons-material"
import { getCardArtUrl, getDeckBackUrl } from "../utils/cardArtwork"

// ═══════════════════════════════════════════════════════════
// Configuration — set these env vars after deploying CDK:
//   REACT_APP_COGNITO_USER_POOL_ID
//   REACT_APP_COGNITO_CLIENT_ID
//   REACT_APP_AWS_REGION
// ═══════════════════════════════════════════════════════════
const AWS_REGION = process.env.REACT_APP_AWS_REGION || "us-east-1"
const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || ""
const API_URL = (
    process.env.REACT_APP_CARDS_API_URL ||
    "https://6tnku32a8f.execute-api.us-east-1.amazonaws.com"
).replace(/\/$/, "")

// ── Cognito direct-API helpers ────────────────────────────────────────────────
async function cognitoCall(target, body) {
    const res = await fetch(
        `https://cognito-idp.${AWS_REGION}.amazonaws.com/`,
        {
            method: "POST",
            headers: {
                "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
                "Content-Type": "application/x-amz-json-1.1",
            },
            body: JSON.stringify(body),
        },
    )
    return res.json()
}

async function cognitoSignIn(email, password) {
    const data = await cognitoCall("InitiateAuth", {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
    })
    if (data.__type === "NotAuthorizedException")
        throw new Error("Incorrect username or password.")
    if (data.__type === "UserNotFoundException")
        throw new Error("No account found for this email.")
    if (data.__type) throw new Error(data.message || data.__type)
    if (data.ChallengeName === "NEW_PASSWORD_REQUIRED") {
        return { type: "newPasswordRequired", session: data.Session }
    }
    return { type: "success", tokens: data.AuthenticationResult }
}

async function cognitoNewPassword(email, session, newPassword) {
    const data = await cognitoCall("RespondToAuthChallenge", {
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: CLIENT_ID,
        Session: session,
        ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
    })
    if (data.__type) throw new Error(data.message || data.__type)
    return data.AuthenticationResult
}

async function cognitoSignOut(accessToken) {
    await cognitoCall("GlobalSignOut", { AccessToken: accessToken }).catch(
        () => {},
    )
}

// ── Admin API helpers ─────────────────────────────────────────────────────────
function adminFetch(path, method = "GET", body) {
    const idToken = localStorage.getItem("imk_admin_id_token")
    return fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error || `HTTP ${r.status}`)
        return json
    })
}

// ── Rarity colours matching the game ──────────────────────────────────────────
const RARITY_COLORS = {
    common: "#777",
    uncommon: "#2e7d32",
    rare: "#1565c0",
    mythic: "#8e24aa",
}

const CARD_TYPES = ["power", "monster"]
const POWER_RARITIES = ["common", "uncommon", "rare", "mythic"]

// ── CSV helpers ───────────────────────────────────────────────────────────
const POWER_CSV_COLS = ["name", "rarity", "description"]
const MONSTER_CSV_COLS = [
    "name",
    "Description",
    "Guise",
    "Attack",
    "Damage",
    "Hit Points Multiplier",
    "Bloodied",
    "Buffs",
    "Crit",
    "Immunities",
    "Special Weaknesses",
    "Body",
    "Agility",
    "Focus",
    "Fate",
    "Insight",
]

function csvCell(val) {
    const s =
        val === null || val === undefined
            ? ""
            : String(Array.isArray(val) ? val.join(", ") : val)
    return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s
}

function exportCardsAsCsv(cards, cardType, deckDisplayName) {
    const cols = cardType === "monster" ? MONSTER_CSV_COLS : POWER_CSV_COLS
    const header = cols.join(",")
    const rows = cards.map((c) => cols.map((col) => csvCell(c[col])).join(","))
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${deckDisplayName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-cards.csv`
    a.click()
    URL.revokeObjectURL(url)
}

// Parse a CSV string into an array of objects. Handles quoted fields.
function parseCsv(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    if (lines.length < 2)
        throw new Error("CSV must have a header row and at least one data row.")
    const headers = splitCsvRow(lines[0])
    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const values = splitCsvRow(line)
        const obj = {}
        headers.forEach((h, idx) => {
            obj[h.trim()] = (values[idx] || "").trim()
        })
        rows.push(obj)
    }
    return { headers, rows }
}

function splitCsvRow(row) {
    const cells = []
    let cur = "",
        inQuote = false
    for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch === '"') {
            if (inQuote && row[i + 1] === '"') {
                cur += '"'
                i++
            } else inQuote = !inQuote
        } else if (ch === "," && !inQuote) {
            cells.push(cur)
            cur = ""
        } else {
            cur += ch
        }
    }
    cells.push(cur)
    return cells
}

// ═══════════════════════════════════════════════════════════
// Deck Form Modal
// ═══════════════════════════════════════════════════════════
function DeckFormModal({ open, onClose, onSave, initialDeck }) {
    const isEdit = !!initialDeck
    const [form, setForm] = useState({
        deck: "",
        displayName: "",
        description: "",
        cardType: "power",
    })
    const [backImageFile, setBackImageFile] = useState(null)
    const [backImagePreview, setBackImagePreview] = useState("")
    const backFileRef = useRef()
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (open) {
            setBackImageFile(null)
            if (isEdit) {
                setForm({
                    deck: initialDeck.deck,
                    displayName: initialDeck.displayName || initialDeck.deck,
                    description: initialDeck.description || "",
                    cardType: initialDeck.cardType || "power",
                })
                setBackImagePreview(getDeckBackUrl(initialDeck.deck))
            } else {
                setForm({
                    deck: "",
                    displayName: "",
                    description: "",
                    cardType: "power",
                })
                setBackImagePreview("")
            }
            setError("")
        }
    }, [open, initialDeck, isEdit])

    const handleBackImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setBackImageFile(file)
        setBackImagePreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        if (!form.displayName.trim()) {
            setError("Name is required.")
            return
        }
        setSaving(true)
        try {
            const deckId = isEdit
                ? form.deck
                : form.displayName
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
            // Upload deck back art if provided
            if (backImageFile) {
                const { uploadUrl } = await adminFetch(
                    "/admin/upload-url",
                    "POST",
                    {
                        deck: deckId,
                        name: "back",
                        folder: "backs",
                        contentType: backImageFile.type || "image/png",
                    },
                )
                await fetch(uploadUrl, {
                    method: "PUT",
                    body: backImageFile,
                    headers: {
                        "Content-Type": backImageFile.type || "image/png",
                    },
                })
            }
            await onSave({ ...form, deck: deckId })
            onClose()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Paper
                sx={{
                    width: 480,
                    borderRadius: "16px",
                    overflow: "hidden",
                    outline: "none",
                }}
            >
                <Box
                    sx={{
                        p: 2.5,
                        bgcolor: "#1a0a0a",
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
                            fontSize: "1.1rem",
                        }}
                    >
                        {isEdit ? "Edit Deck" : "New Deck / Booster Pack"}
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: "#fff" }}>
                        <Close />
                    </IconButton>
                </Box>
                <Box
                    sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {error && <Alert severity='error'>{error}</Alert>}
                    <TextField
                        label='Display Name'
                        value={form.displayName}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                displayName: e.target.value,
                            }))
                        }
                        fullWidth
                        required
                        autoFocus
                        helperText={
                            !isEdit
                                ? `ID: ${
                                      form.displayName
                                          .toLowerCase()
                                          .replace(/[^a-z0-9]+/g, "-")
                                          .replace(/^-|-$/g, "") ||
                                      "auto-generated"
                                  }`
                                : `ID: ${form.deck}`
                        }
                    />
                    <FormControl fullWidth>
                        <InputLabel>Card Type</InputLabel>
                        <Select
                            value={form.cardType}
                            label='Card Type'
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    cardType: e.target.value,
                                }))
                            }
                        >
                            <MenuItem value='power'>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <AutoAwesome
                                        sx={{ fontSize: 16, color: "#8e24aa" }}
                                    />{" "}
                                    Power Cards
                                </Box>
                            </MenuItem>
                            <MenuItem value='monster'>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    <BugReport
                                        sx={{ fontSize: 16, color: "#c62828" }}
                                    />{" "}
                                    Monster Cards
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label='Description'
                        value={form.description}
                        onChange={(e) =>
                            setForm((f) => ({
                                ...f,
                                description: e.target.value,
                            }))
                        }
                        fullWidth
                        multiline
                        rows={3}
                    />
                    {/* Deck back art */}
                    <Box>
                        <Typography
                            sx={{ fontSize: "0.75rem", opacity: 0.5, mb: 0.5 }}
                        >
                            Deck Back Art
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                            }}
                        >
                            <Box
                                onClick={() => backFileRef.current?.click()}
                                sx={{
                                    width: 80,
                                    height: 120,
                                    borderRadius: "8px",
                                    border: "2px dashed",
                                    borderColor: "divider",
                                    cursor: "pointer",
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: "action.hover",
                                    "&:hover": { borderColor: "#8B0000" },
                                    backgroundImage: backImagePreview
                                        ? `url(${backImagePreview})`
                                        : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {!backImagePreview && (
                                    <>
                                        <CloudUpload
                                            sx={{ fontSize: 22, opacity: 0.4 }}
                                        />
                                        <Typography
                                            sx={{
                                                fontSize: "0.6rem",
                                                opacity: 0.5,
                                                mt: 0.5,
                                                textAlign: "center",
                                            }}
                                        >
                                            Back Art
                                        </Typography>
                                    </>
                                )}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    sx={{
                                        fontSize: "0.75rem",
                                        opacity: 0.6,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    This image appears on the back of every card
                                    in this deck. Stored at{" "}
                                    <code style={{ fontSize: "0.7rem" }}>
                                        backs/{form.deck || "deck-id"}.png
                                    </code>
                                </Typography>
                                {backImageFile && (
                                    <Chip
                                        label={backImageFile.name}
                                        size='small'
                                        sx={{ mt: 1, maxWidth: "100%" }}
                                        onDelete={() => {
                                            setBackImageFile(null)
                                            setBackImagePreview(
                                                isEdit
                                                    ? getDeckBackUrl(
                                                          initialDeck.deck,
                                                      )
                                                    : "",
                                            )
                                        }}
                                    />
                                )}
                            </Box>
                            <input
                                ref={backFileRef}
                                type='file'
                                accept='image/*'
                                style={{ display: "none" }}
                                onChange={handleBackImageChange}
                            />
                        </Box>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                            mt: 1,
                        }}
                    >
                        <Button onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={
                                saving ? (
                                    <CircularProgress size={14} />
                                ) : (
                                    <Save />
                                )
                            }
                            sx={{
                                bgcolor: "#8B0000",
                                "&:hover": { bgcolor: "#a00" },
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                            }}
                        >
                            {saving ? "Saving…" : "Save Deck"}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════
// Card Form Modal (Power + Monster)
// ═══════════════════════════════════════════════════════════
const POWER_DEFAULTS = {
    name: "",
    rarity: "common",
    description: "",
}
const MONSTER_DEFAULTS = {
    name: "",
    Description: "",
    Guise: "",
    Attack: "",
    Damage: "",
    "Hit Points Multiplier": "",
    Bloodied: "",
    Buffs: "",
    Crit: "",
    Immunities: "",
    "Special Weaknesses": "",
    Body: "",
    Agility: "",
    Focus: "",
    Fate: "",
    Insight: "",
}

function CardFormModal({ open, onClose, onSave, initialCard, deck }) {
    const isEdit = !!initialCard
    const cardType = deck?.cardType || "power"
    const [form, setForm] = useState(
        cardType === "power" ? POWER_DEFAULTS : MONSTER_DEFAULTS,
    )
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const fileRef = useRef()

    useEffect(() => {
        if (open) {
            setError("")
            setImageFile(null)
            setImagePreview("")
            if (isEdit) {
                setForm(
                    cardType === "power"
                        ? {
                              name: initialCard.name,
                              rarity: initialCard.rarity || "common",
                              description: initialCard.description || "",
                          }
                        : Object.fromEntries(
                              Object.keys(MONSTER_DEFAULTS).map((k) => [
                                  k,
                                  String(initialCard[k] ?? ""),
                              ]),
                          ),
                )
                if (initialCard.name && deck?.deck)
                    setImagePreview(getCardArtUrl(deck.deck, initialCard.name))
            } else {
                setForm(
                    cardType === "power" ? POWER_DEFAULTS : MONSTER_DEFAULTS,
                )
            }
        }
    }, [open, initialCard, isEdit, deck, cardType])

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        if (!form.name?.trim()) {
            setError("Name is required.")
            return
        }
        setSaving(true)
        try {
            let artUrl = isEdit
                ? imageFile
                    ? ""
                    : getCardArtUrl(deck.deck, form.name)
                : ""
            // Upload image if one was selected
            if (imageFile) {
                const { uploadUrl, cdnUrl } = await adminFetch(
                    "/admin/upload-url",
                    "POST",
                    {
                        deck: deck.deck,
                        name: form.name,
                        folder: "cards",
                        contentType: imageFile.type || "image/png",
                    },
                )
                await fetch(uploadUrl, {
                    method: "PUT",
                    body: imageFile,
                    headers: { "Content-Type": imageFile.type || "image/png" },
                })
                artUrl = cdnUrl
            }
            const cardData = {
                ...form,
                deck: deck.deck,
                type: cardType,
                ...(artUrl ? { artUrl } : {}),
                ...(cardType === "monster" && form["Special Weaknesses"]
                    ? {
                          "Special Weaknesses": form["Special Weaknesses"]
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                      }
                    : {}),
            }
            await onSave(cardData, isEdit)
            onClose()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const f = (key) => ({
        label: key,
        value: form[key] ?? "",
        onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
    })

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
            }}
        >
            <Paper
                sx={{
                    width: { xs: "98%", sm: 640 },
                    maxHeight: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "16px",
                    outline: "none",
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 2.5,
                        bgcolor: "#1a0a0a",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: '"Cinzel", serif',
                            fontWeight: "bold",
                        }}
                    >
                        {isEdit
                            ? `Edit: ${initialCard?.name}`
                            : `New ${cardType === "power" ? "Power" : "Monster"} Card`}
                    </Typography>
                    <IconButton onClick={onClose} sx={{ color: "#fff" }}>
                        <Close />
                    </IconButton>
                </Box>

                {/* Body */}
                <Box
                    sx={{
                        p: 3,
                        overflow: "auto",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {error && (
                        <Alert severity='error' onClose={() => setError("")}>
                            {error}
                        </Alert>
                    )}

                    {/* Image Upload */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "flex-start",
                        }}
                    >
                        <Box
                            onClick={() => fileRef.current?.click()}
                            sx={{
                                width: 100,
                                height: 150,
                                borderRadius: "10px",
                                border: "2px dashed",
                                borderColor: "divider",
                                cursor: "pointer",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "action.hover",
                                flexShrink: 0,
                                "&:hover": {
                                    borderColor: "#8B0000",
                                    bgcolor: "rgba(139,0,0,0.04)",
                                },
                                backgroundImage: imagePreview
                                    ? `url(${imagePreview})`
                                    : "none",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            {!imagePreview && (
                                <>
                                    <CloudUpload
                                        sx={{ fontSize: 28, opacity: 0.4 }}
                                    />
                                    <Typography
                                        sx={{
                                            fontSize: "0.65rem",
                                            opacity: 0.5,
                                            mt: 0.5,
                                        }}
                                    >
                                        Upload Art
                                    </Typography>
                                </>
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <input
                                ref={fileRef}
                                type='file'
                                accept='image/*'
                                style={{ display: "none" }}
                                onChange={handleImageChange}
                            />
                            <TextField
                                {...f("name")}
                                label='Card Name'
                                fullWidth
                                required
                                sx={{ mb: 1.5 }}
                            />
                            {cardType === "power" && (
                                <FormControl fullWidth size='small'>
                                    <InputLabel>Rarity</InputLabel>
                                    <Select
                                        value={form.rarity || "common"}
                                        label='Rarity'
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                rarity: e.target.value,
                                            }))
                                        }
                                    >
                                        {POWER_RARITIES.map((r) => (
                                            <MenuItem key={r} value={r}>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: "50%",
                                                            bgcolor:
                                                                RARITY_COLORS[
                                                                    r
                                                                ],
                                                        }}
                                                    />
                                                    {r.charAt(0).toUpperCase() +
                                                        r.slice(1)}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                    </Box>

                    {/* Power Card Fields */}
                    {cardType === "power" && (
                        <>
                            <TextField
                                {...f("description")}
                                label='Description'
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </>
                    )}

                    {/* Monster Card Fields */}
                    {cardType === "monster" && (
                        <>
                            <TextField
                                {...f("Description")}
                                label='Description / Flavour'
                                fullWidth
                                multiline
                                rows={2}
                            />
                            <TextField
                                {...f("Guise")}
                                label='Guise (NPC appearance)'
                                fullWidth
                            />
                            <Divider>
                                <Typography
                                    sx={{
                                        fontSize: "0.7rem",
                                        opacity: 0.5,
                                        fontFamily: '"Cinzel", serif',
                                    }}
                                >
                                    COMBAT
                                </Typography>
                            </Divider>
                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Attack")}
                                        label='Attack'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Damage")}
                                        label='Damage'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Hit Points Multiplier")}
                                        label='HP Multiplier'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Bloodied")}
                                        label='Bloodied'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        {...f("Crit")}
                                        label='Crit Effect'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        {...f("Buffs")}
                                        label='Buffs / Special Abilities'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Immunities")}
                                        label='Immunities'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        {...f("Special Weaknesses")}
                                        label='Weaknesses (comma-sep)'
                                        fullWidth
                                        size='small'
                                    />
                                </Grid>
                            </Grid>
                            <Divider>
                                <Typography
                                    sx={{
                                        fontSize: "0.7rem",
                                        opacity: 0.5,
                                        fontFamily: '"Cinzel", serif',
                                    }}
                                >
                                    STATS
                                </Typography>
                            </Divider>
                            <Grid container spacing={1.5}>
                                {[
                                    "Body",
                                    "Agility",
                                    "Focus",
                                    "Fate",
                                    "Insight",
                                ].map((stat) => (
                                    <Grid item xs={4} sm={2.4} key={stat}>
                                        <TextField
                                            {...f(stat)}
                                            label={stat}
                                            fullWidth
                                            size='small'
                                            type='number'
                                            inputProps={{ min: 0, max: 20 }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </>
                    )}
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        gap: 1,
                        justifyContent: "flex-end",
                        flexShrink: 0,
                    }}
                >
                    <Button onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        variant='contained'
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={
                            saving ? <CircularProgress size={14} /> : <Save />
                        }
                        sx={{
                            bgcolor: "#8B0000",
                            "&:hover": { bgcolor: "#a00" },
                            fontFamily: '"Cinzel", serif',
                            textTransform: "none",
                        }}
                    >
                        {saving
                            ? "Saving…"
                            : `Save ${cardType === "power" ? "Power" : "Monster"}`}
                    </Button>
                </Box>
            </Paper>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════
// Delete Confirm Modal
// ═══════════════════════════════════════════════════════════
function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    loading,
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Paper
                sx={{
                    width: 400,
                    borderRadius: "16px",
                    overflow: "hidden",
                    outline: "none",
                }}
            >
                <Box
                    sx={{
                        p: 2.5,
                        bgcolor: "#c62828",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <Warning />
                    <Typography
                        sx={{
                            fontFamily: '"Cinzel", serif',
                            fontWeight: "bold",
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                    <Typography>{message}</Typography>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                            mt: 3,
                        }}
                    >
                        <Button onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            variant='contained'
                            color='error'
                            onClick={onConfirm}
                            disabled={loading}
                            startIcon={
                                loading ? (
                                    <CircularProgress size={14} />
                                ) : (
                                    <Delete />
                                )
                            }
                        >
                            {loading ? "Deleting…" : "Delete"}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════
// CSV Import Modal
// ═══════════════════════════════════════════════════════════
function CsvImportModal({ open, onClose, onImport, deck }) {
    const cardType = deck?.cardType || "power"
    const expectedCols =
        cardType === "monster" ? MONSTER_CSV_COLS : POWER_CSV_COLS
    const [parsedRows, setParsedRows] = useState([])
    const [parseError, setParseError] = useState("")
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [fileName, setFileName] = useState("")
    const fileRef = useRef()

    useEffect(() => {
        if (open) {
            setParsedRows([])
            setParseError("")
            setImporting(false)
            setImportResult(null)
            setFileName("")
        }
    }, [open])

    const handleFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setFileName(file.name)
        setParseError("")
        setParsedRows([])
        setImportResult(null)
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const { headers, rows } = parseCsv(ev.target.result)
                // Warn about unrecognised columns but don't block
                const unknown = headers.filter(
                    (h) =>
                        !expectedCols.includes(h) &&
                        h !== "deck" &&
                        h !== "type",
                )
                if (!headers.includes("name"))
                    throw new Error('CSV must have a "name" column.')
                if (unknown.length)
                    setParseError(
                        `Note: unknown columns will be ignored: ${unknown.join(", ")}`,
                    )
                setParsedRows(rows)
            } catch (err) {
                setParseError(err.message)
            }
        }
        reader.readAsText(file)
    }

    const handleImport = async () => {
        setImporting(true)
        setImportResult(null)
        try {
            const cardsToImport = parsedRows
                .filter((r) => r.name?.trim())
                .map((r) => ({
                    ...r,
                    deck: deck.deck,
                    type: cardType,
                    rarity: r.rarity || "common",
                }))
            const result = await onImport(cardsToImport)
            setImportResult(result)
            setParsedRows([])
            setFileName("")
        } catch (err) {
            setParseError(err.message)
        } finally {
            setImporting(false)
        }
    }

    const previewCols = expectedCols.slice(0, 4)
    const validRows = parsedRows.filter((r) => r.name?.trim())

    return (
        <Modal
            open={open}
            onClose={onClose}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
            }}
        >
            <Paper
                sx={{
                    width: { xs: "98%", sm: 700 },
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "16px",
                    outline: "none",
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        p: 2.5,
                        bgcolor: "#1a0a0a",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                        <FileUpload sx={{ color: "#8B0000" }} />
                        <Box>
                            <Typography
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontWeight: "bold",
                                }}
                            >
                                Import Cards from CSV
                            </Typography>
                            <Typography
                                sx={{ fontSize: "0.7rem", opacity: 0.5 }}
                            >
                                Deck: {deck?.displayName}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: "#fff" }}>
                        <Close />
                    </IconButton>
                </Box>

                <Box
                    sx={{
                        p: 3,
                        overflow: "auto",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {/* Format hint */}
                    <Paper
                        variant='outlined'
                        sx={{
                            p: 1.5,
                            bgcolor: "rgba(139,0,0,0.04)",
                            borderColor: "rgba(139,0,0,0.2)",
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: "0.72rem",
                                fontWeight: "bold",
                                mb: 0.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                            }}
                        >
                            <TableChart sx={{ fontSize: 14 }} /> Expected
                            columns ({cardType})
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "0.68rem",
                                fontFamily: "monospace",
                                opacity: 0.7,
                                wordBreak: "break-all",
                            }}
                        >
                            {expectedCols.join(", ")}
                        </Typography>
                    </Paper>

                    {/* File picker */}
                    <Box
                        onClick={() => fileRef.current?.click()}
                        sx={{
                            border: "2px dashed",
                            borderColor: parsedRows.length
                                ? "#2e7d32"
                                : "divider",
                            borderRadius: "12px",
                            p: 3,
                            textAlign: "center",
                            cursor: "pointer",
                            bgcolor: parsedRows.length
                                ? "rgba(46,125,50,0.04)"
                                : "action.hover",
                            "&:hover": { borderColor: "#8B0000" },
                            transition: "border-color 0.2s",
                        }}
                    >
                        <input
                            ref={fileRef}
                            type='file'
                            accept='.csv,text/csv'
                            style={{ display: "none" }}
                            onChange={handleFile}
                        />
                        {parsedRows.length ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                }}
                            >
                                <CheckCircle sx={{ color: "#2e7d32" }} />
                                <Typography sx={{ fontWeight: "bold" }}>
                                    {fileName}
                                </Typography>
                                <Chip
                                    label={`${validRows.length} card${validRows.length !== 1 ? "s" : ""}`}
                                    size='small'
                                    color='success'
                                />
                            </Box>
                        ) : (
                            <>
                                <FileUpload
                                    sx={{ fontSize: 36, opacity: 0.3, mb: 1 }}
                                />
                                <Typography sx={{ opacity: 0.5 }}>
                                    Click to choose a .csv file
                                </Typography>
                            </>
                        )}
                    </Box>

                    {parseError && (
                        <Alert
                            severity={parsedRows.length ? "warning" : "error"}
                            onClose={() => setParseError("")}
                        >
                            {parseError}
                        </Alert>
                    )}

                    {/* Preview table */}
                    {parsedRows.length > 0 && !importResult && (
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: "0.75rem",
                                    opacity: 0.5,
                                    mb: 1,
                                }}
                            >
                                Preview (first 5 rows)
                            </Typography>
                            <Box
                                sx={{
                                    overflow: "auto",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px",
                                }}
                            >
                                <Table size='small'>
                                    <TableHead>
                                        <TableRow
                                            sx={{
                                                bgcolor: "rgba(139,0,0,0.06)",
                                            }}
                                        >
                                            {previewCols.map((col) => (
                                                <TableCell
                                                    key={col}
                                                    sx={{
                                                        fontFamily:
                                                            '"Cinzel", serif',
                                                        fontSize: "0.65rem",
                                                        fontWeight: "bold",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {col}
                                                </TableCell>
                                            ))}
                                            {parsedRows[0] &&
                                                Object.keys(parsedRows[0])
                                                    .length >
                                                    previewCols.length && (
                                                    <TableCell
                                                        sx={{
                                                            fontSize: "0.65rem",
                                                            opacity: 0.4,
                                                        }}
                                                    >
                                                        +
                                                        {Object.keys(
                                                            parsedRows[0],
                                                        ).length -
                                                            previewCols.length}{" "}
                                                        more
                                                    </TableCell>
                                                )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {parsedRows
                                            .slice(0, 5)
                                            .map((row, i) => (
                                                <TableRow key={i}>
                                                    {previewCols.map((col) => (
                                                        <TableCell
                                                            key={col}
                                                            sx={{
                                                                fontSize:
                                                                    "0.7rem",
                                                                maxWidth: 160,
                                                                overflow:
                                                                    "hidden",
                                                                textOverflow:
                                                                    "ellipsis",
                                                                whiteSpace:
                                                                    "nowrap",
                                                            }}
                                                        >
                                                            {row[col] || "—"}
                                                        </TableCell>
                                                    ))}
                                                    {Object.keys(parsedRows[0])
                                                        .length >
                                                        previewCols.length && (
                                                        <TableCell />
                                                    )}
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    )}

                    {importing && <LinearProgress sx={{ borderRadius: 4 }} />}

                    {importResult && (
                        <Alert severity='success' icon={<CheckCircle />}>
                            Imported {importResult.imported} card
                            {importResult.imported !== 1 ? "s" : ""}{" "}
                            successfully
                            {importResult.failed > 0
                                ? ` (${importResult.failed} failed)`
                                : "."}{" "}
                            Click Close to view them.
                        </Alert>
                    )}
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        gap: 1,
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexShrink: 0,
                    }}
                >
                    <Typography sx={{ fontSize: "0.72rem", opacity: 0.4 }}>
                        Existing cards with the same name will be overwritten.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button onClick={onClose}>
                            {importResult ? "Close" : "Cancel"}
                        </Button>
                        {!importResult && (
                            <Button
                                variant='contained'
                                onClick={handleImport}
                                disabled={validRows.length === 0 || importing}
                                startIcon={
                                    importing ? (
                                        <CircularProgress size={14} />
                                    ) : (
                                        <FileUpload />
                                    )
                                }
                                sx={{
                                    bgcolor: "#8B0000",
                                    "&:hover": { bgcolor: "#a00" },
                                    fontFamily: '"Cinzel", serif',
                                    textTransform: "none",
                                }}
                            >
                                {importing
                                    ? "Importing…"
                                    : `Import ${validRows.length} Card${validRows.length !== 1 ? "s" : ""}`}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Modal>
    )
}

// ═══════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════
function AdminDashboard({ email, onLogout }) {
    const [decks, setDecks] = useState([])
    const [selectedDeck, setSelectedDeck] = useState(null)
    const [cards, setCards] = useState([])
    const [artCacheBust, setArtCacheBust] = useState(null)
    const [loading, setLoading] = useState({
        decks: true,
        cards: false,
        deleting: false,
    })
    const [error, setError] = useState("")

    // Modal state
    const [deckModal, setDeckModal] = useState({ open: false, deck: null })
    const [cardModal, setCardModal] = useState({ open: false, card: null })
    const [csvImportOpen, setCsvImportOpen] = useState(false)
    const [deleteModal, setDeleteModal] = useState({
        open: false,
        type: null,
        target: null,
    })

    // ── Load decks ────────────────────────────────────────────────────────────
    const loadDecks = useCallback(async () => {
        setLoading((l) => ({ ...l, decks: true }))
        try {
            const { decks: d } = await adminFetch("/admin/decks")
            setDecks(
                d.sort((a, b) => a.displayName.localeCompare(b.displayName)),
            )
        } catch (e) {
            setError("Failed to load decks: " + e.message)
        } finally {
            setLoading((l) => ({ ...l, decks: false }))
        }
    }, [])

    // ── Load cards for selected deck ──────────────────────────────────────────
    const loadCards = useCallback(async (deck) => {
        setLoading((l) => ({ ...l, cards: true }))
        try {
            const data = await fetch(
                `${API_URL}/cards?deck=${encodeURIComponent(deck.deck)}`,
            ).then((r) => r.json())
            const deckCards = (data.cards || []).filter(
                (c) => c.name !== "__meta__",
            )
            setCards(deckCards.sort((a, b) => a.name.localeCompare(b.name)))
        } catch (e) {
            setError("Failed to load cards: " + e.message)
        } finally {
            setLoading((l) => ({ ...l, cards: false }))
        }
    }, [])

    useEffect(() => {
        loadDecks()
    }, [loadDecks])
    useEffect(() => {
        if (selectedDeck) loadCards(selectedDeck)
    }, [selectedDeck, loadCards])

    // ── Deck CRUD ─────────────────────────────────────────────────────────────
    const saveDeck = async (data) => {
        if (deckModal.deck) {
            await adminFetch(
                `/admin/decks/${encodeURIComponent(data.deck)}`,
                "PUT",
                data,
            )
        } else {
            await adminFetch("/admin/decks", "POST", data)
        }
        await loadDecks()
        if (selectedDeck?.deck === data.deck) setSelectedDeck(data)
    }

    const deleteDeck = async () => {
        setLoading((l) => ({ ...l, deleting: true }))
        try {
            await adminFetch(
                `/admin/decks/${encodeURIComponent(deleteModal.target.deck)}`,
                "DELETE",
            )
            setDeleteModal({ open: false })
            if (selectedDeck?.deck === deleteModal.target.deck) {
                setSelectedDeck(null)
                setCards([])
            }
            await loadDecks()
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading((l) => ({ ...l, deleting: false }))
        }
    }

    // ── Card CRUD ─────────────────────────────────────────────────────────────
    const saveCard = async (cardData, isEdit) => {
        if (isEdit) {
            await adminFetch(
                `/cards/${encodeURIComponent(cardData.deck)}/${encodeURIComponent(cardData.name)}`,
                "PUT",
                cardData,
            )
        } else {
            await adminFetch("/cards", "POST", cardData)
        }
        setArtCacheBust(Date.now())
        await loadCards(selectedDeck)
    }

    const deleteCard = async () => {
        setLoading((l) => ({ ...l, deleting: true }))
        try {
            await adminFetch(
                `/cards/${encodeURIComponent(deleteModal.target.deck)}/${encodeURIComponent(deleteModal.target.name)}`,
                "DELETE",
            )
            setDeleteModal({ open: false })
            await loadCards(selectedDeck)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading((l) => ({ ...l, deleting: false }))
        }
    }

    const importCards = async (cardsToImport) => {
        const result = await adminFetch("/cards/batch", "POST", {
            cards: cardsToImport,
        })
        setArtCacheBust(Date.now())
        await loadCards(selectedDeck)
        return result
    }

    const powerDecks = decks.filter((d) => d.cardType === "power")
    const monsterDecks = decks.filter((d) => d.cardType === "monster")

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#0d0606" : "#f5f0eb",
            }}
        >
            {/* Top Bar */}
            <Box
                sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: "#1a0a0a",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Casino sx={{ color: "#8B0000", fontSize: 28 }} />
                    <Typography
                        sx={{
                            fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            letterSpacing: 1,
                        }}
                    >
                        I MUST KILL — Admin
                    </Typography>
                    <Chip
                        label='Card Manager'
                        size='small'
                        sx={{
                            bgcolor: "rgba(139,0,0,0.5)",
                            color: "#ffcdd2",
                            fontSize: "0.65rem",
                        }}
                    />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography sx={{ opacity: 0.6, fontSize: "0.8rem" }}>
                        {email}
                    </Typography>
                    <Tooltip title='Sign Out'>
                        <IconButton
                            onClick={onLogout}
                            sx={{
                                color: "#fff",
                                "&:hover": { color: "#ff6b6b" },
                            }}
                        >
                            <Logout />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert
                    severity='error'
                    onClose={() => setError("")}
                    sx={{ mx: 3, mt: 2 }}
                >
                    {error}
                </Alert>
            )}

            <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* ── Sidebar ── */}
                <Box
                    sx={{
                        width: 260,
                        flexShrink: 0,
                        borderRight: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "auto",
                        bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                                ? "rgba(0,0,0,0.4)"
                                : "rgba(255,255,255,0.6)",
                    }}
                >
                    {loading.decks ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                p: 4,
                            }}
                        >
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <>
                            {/* Power Decks */}
                            <Box sx={{ p: 2 }}>
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
                                            fontSize: "0.75rem",
                                            opacity: 0.5,
                                            textTransform: "uppercase",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        ⚡ Power Decks
                                    </Typography>
                                    <Tooltip title='New Power Deck'>
                                        <IconButton
                                            size='small'
                                            onClick={() =>
                                                setDeckModal({
                                                    open: true,
                                                    deck: null,
                                                    defaultType: "power",
                                                })
                                            }
                                            sx={{
                                                opacity: 0.6,
                                                "&:hover": {
                                                    opacity: 1,
                                                    color: "#8B0000",
                                                },
                                            }}
                                        >
                                            <Add sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                {powerDecks.length === 0 && (
                                    <Typography
                                        sx={{
                                            fontSize: "0.75rem",
                                            opacity: 0.3,
                                            pl: 1,
                                        }}
                                    >
                                        No power decks yet
                                    </Typography>
                                )}
                                {powerDecks.map((deck) => (
                                    <DeckItem
                                        key={deck.deck}
                                        deck={deck}
                                        selected={
                                            selectedDeck?.deck === deck.deck
                                        }
                                        onClick={() => setSelectedDeck(deck)}
                                        onEdit={() =>
                                            setDeckModal({ open: true, deck })
                                        }
                                        onDelete={() =>
                                            setDeleteModal({
                                                open: true,
                                                type: "deck",
                                                target: deck,
                                            })
                                        }
                                    />
                                ))}
                            </Box>

                            <Divider />

                            {/* Monster Decks */}
                            <Box sx={{ p: 2 }}>
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
                                            fontSize: "0.75rem",
                                            opacity: 0.5,
                                            textTransform: "uppercase",
                                            letterSpacing: 1,
                                        }}
                                    >
                                        💀 Monster Decks
                                    </Typography>
                                    <Tooltip title='New Monster Deck'>
                                        <IconButton
                                            size='small'
                                            onClick={() =>
                                                setDeckModal({
                                                    open: true,
                                                    deck: null,
                                                    defaultType: "monster",
                                                })
                                            }
                                            sx={{
                                                opacity: 0.6,
                                                "&:hover": {
                                                    opacity: 1,
                                                    color: "#8B0000",
                                                },
                                            }}
                                        >
                                            <Add sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                {monsterDecks.length === 0 && (
                                    <Typography
                                        sx={{
                                            fontSize: "0.75rem",
                                            opacity: 0.3,
                                            pl: 1,
                                        }}
                                    >
                                        No monster decks yet
                                    </Typography>
                                )}
                                {monsterDecks.map((deck) => (
                                    <DeckItem
                                        key={deck.deck}
                                        deck={deck}
                                        selected={
                                            selectedDeck?.deck === deck.deck
                                        }
                                        onClick={() => setSelectedDeck(deck)}
                                        onEdit={() =>
                                            setDeckModal({ open: true, deck })
                                        }
                                        onDelete={() =>
                                            setDeleteModal({
                                                open: true,
                                                type: "deck",
                                                target: deck,
                                            })
                                        }
                                    />
                                ))}
                            </Box>
                        </>
                    )}
                </Box>

                {/* ── Main Content ── */}
                <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
                    {!selectedDeck ? (
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                opacity: 0.4,
                                gap: 2,
                            }}
                        >
                            <Casino sx={{ fontSize: 56 }} />
                            <Typography
                                sx={{
                                    fontFamily: '"Cinzel", serif',
                                    fontSize: "1rem",
                                }}
                            >
                                Select a deck from the sidebar, or create a new
                                one
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {/* Deck Header */}
                            <Box
                                sx={{
                                    mb: 3,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 1,
                                }}
                            >
                                <Box>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant='h5'
                                            sx={{
                                                fontFamily: '"Cinzel", serif',
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {selectedDeck.displayName}
                                        </Typography>
                                        <Chip
                                            label={
                                                selectedDeck.cardType ===
                                                "monster"
                                                    ? "Monster"
                                                    : "Power"
                                            }
                                            size='small'
                                            icon={
                                                selectedDeck.cardType ===
                                                "monster" ? (
                                                    <BugReport
                                                        sx={{ fontSize: 12 }}
                                                    />
                                                ) : (
                                                    <AutoAwesome
                                                        sx={{ fontSize: 12 }}
                                                    />
                                                )
                                            }
                                            sx={{
                                                bgcolor:
                                                    selectedDeck.cardType ===
                                                    "monster"
                                                        ? "rgba(198,40,40,0.15)"
                                                        : "rgba(142,36,170,0.15)",
                                                color:
                                                    selectedDeck.cardType ===
                                                    "monster"
                                                        ? "#c62828"
                                                        : "#8e24aa",
                                            }}
                                        />
                                        <Chip
                                            label={`${cards.length} card${cards.length !== 1 ? "s" : ""}`}
                                            size='small'
                                            variant='outlined'
                                        />
                                    </Box>
                                    {selectedDeck.description && (
                                        <Typography
                                            sx={{
                                                opacity: 0.6,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            {selectedDeck.description}
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Button
                                        size='small'
                                        startIcon={
                                            <Edit sx={{ fontSize: 14 }} />
                                        }
                                        onClick={() =>
                                            setDeckModal({
                                                open: true,
                                                deck: selectedDeck,
                                            })
                                        }
                                        sx={{
                                            textTransform: "none",
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Edit Deck
                                    </Button>
                                    <Button
                                        size='small'
                                        startIcon={
                                            <FileDownload
                                                sx={{ fontSize: 14 }}
                                            />
                                        }
                                        disabled={cards.length === 0}
                                        onClick={() =>
                                            exportCardsAsCsv(
                                                cards,
                                                selectedDeck.cardType,
                                                selectedDeck.displayName,
                                            )
                                        }
                                        sx={{
                                            textTransform: "none",
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Export CSV
                                    </Button>
                                    <Button
                                        size='small'
                                        startIcon={
                                            <FileUpload sx={{ fontSize: 14 }} />
                                        }
                                        onClick={() => setCsvImportOpen(true)}
                                        sx={{
                                            textTransform: "none",
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Import CSV
                                    </Button>
                                    <Button
                                        size='small'
                                        color='error'
                                        startIcon={
                                            <Delete sx={{ fontSize: 14 }} />
                                        }
                                        onClick={() =>
                                            setDeleteModal({
                                                open: true,
                                                type: "deck",
                                                target: selectedDeck,
                                            })
                                        }
                                        sx={{
                                            textTransform: "none",
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        Delete Deck
                                    </Button>
                                    <Button
                                        variant='contained'
                                        size='small'
                                        startIcon={<Add />}
                                        onClick={() =>
                                            setCardModal({
                                                open: true,
                                                card: null,
                                            })
                                        }
                                        sx={{
                                            bgcolor: "#8B0000",
                                            "&:hover": { bgcolor: "#a00" },
                                            textTransform: "none",
                                            fontFamily: '"Cinzel", serif',
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        New Card
                                    </Button>
                                </Box>
                            </Box>

                            {/* Cards Grid */}
                            {loading.cards ? (
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        p: 6,
                                    }}
                                >
                                    <CircularProgress />
                                </Box>
                            ) : cards.length === 0 ? (
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 2,
                                        p: 6,
                                        border: "2px dashed",
                                        borderColor: "divider",
                                        borderRadius: "16px",
                                        cursor: "pointer",
                                        "&:hover": {
                                            borderColor: "#8B0000",
                                            bgcolor: "rgba(139,0,0,0.02)",
                                        },
                                    }}
                                    onClick={() =>
                                        setCardModal({ open: true, card: null })
                                    }
                                >
                                    <Add sx={{ fontSize: 40, opacity: 0.3 }} />
                                    <Typography
                                        sx={{
                                            opacity: 0.4,
                                            fontFamily: '"Cinzel", serif',
                                        }}
                                    >
                                        No cards yet — click to add the first
                                        one
                                    </Typography>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 2,
                                        alignItems: "flex-start",
                                    }}
                                >
                                    {cards.map((card) => (
                                        <AdminCard
                                            key={`${card.deck}/${card.name}`}
                                            card={card}
                                            deckId={selectedDeck.deck}
                                            deckType={selectedDeck.cardType}
                                            artCacheBust={artCacheBust}
                                            onEdit={() =>
                                                setCardModal({
                                                    open: true,
                                                    card,
                                                })
                                            }
                                            onDelete={() =>
                                                setDeleteModal({
                                                    open: true,
                                                    type: "card",
                                                    target: card,
                                                })
                                            }
                                        />
                                    ))}
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Modals */}
            <DeckFormModal
                open={deckModal.open}
                onClose={() => setDeckModal({ open: false, deck: null })}
                onSave={saveDeck}
                initialDeck={deckModal.deck}
            />
            <CardFormModal
                open={cardModal.open}
                onClose={() => setCardModal({ open: false, card: null })}
                onSave={saveCard}
                initialCard={cardModal.card}
                deck={selectedDeck}
            />
            <CsvImportModal
                open={csvImportOpen}
                onClose={() => setCsvImportOpen(false)}
                onImport={importCards}
                deck={selectedDeck}
            />
            <ConfirmDeleteModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false })}
                onConfirm={
                    deleteModal.type === "deck" ? deleteDeck : deleteCard
                }
                loading={loading.deleting}
                title={`Delete ${deleteModal.type === "deck" ? "Deck" : "Card"}`}
                message={
                    deleteModal.type === "deck"
                        ? `Are you sure? This will permanently delete "${deleteModal.target?.displayName}" and all ${cards.length} card${cards.length !== 1 ? "s" : ""} inside it.`
                        : `Are you sure? This will permanently delete "${deleteModal.target?.name}".`
                }
            />
        </Box>
    )
}

// ── Deck sidebar item ─────────────────────────────────────────────────────────
function DeckItem({ deck, selected, onClick, onEdit, onDelete }) {
    const [hovered, setHovered] = useState(false)
    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1.5,
                py: 1,
                borderRadius: "8px",
                cursor: "pointer",
                mb: 0.5,
                bgcolor: selected
                    ? "rgba(139,0,0,0.12)"
                    : hovered
                      ? "action.hover"
                      : "transparent",
                border: selected
                    ? "1px solid rgba(139,0,0,0.3)"
                    : "1px solid transparent",
                transition: "all 0.15s",
            }}
        >
            <Typography
                sx={{
                    fontSize: "0.85rem",
                    fontWeight: selected ? "bold" : "normal",
                    fontFamily: '"Cinzel", serif',
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {deck.displayName}
            </Typography>
            {hovered && (
                <Box sx={{ display: "flex", gap: 0, flexShrink: 0, ml: 0.5 }}>
                    <IconButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                        }}
                        sx={{ p: 0.25, "&:hover": { color: "#8B0000" } }}
                    >
                        <Edit sx={{ fontSize: 12 }} />
                    </IconButton>
                    <IconButton
                        size='small'
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        sx={{ p: 0.25, "&:hover": { color: "#c62828" } }}
                    >
                        <Delete sx={{ fontSize: 12 }} />
                    </IconButton>
                </Box>
            )}
        </Box>
    )
}

// ── Individual admin card tile ────────────────────────────────────────────────
function AdminCard({ card, deckId, deckType, onEdit, onDelete, artCacheBust }) {
    // Prefer artUrl stored on the card record; fall back to convention-based CDN URL
    const baseUrl = card.artUrl || getCardArtUrl(deckId, card.name)
    const artUrl = artCacheBust ? `${baseUrl}?t=${artCacheBust}` : baseUrl
    const rarity = card.rarity || "common"
    const rarityColor = RARITY_COLORS[rarity] || "#777"

    return (
        <Box
            sx={{
                width: 130,
                flexShrink: 0,
                "&:hover .card-actions": { opacity: 1 },
                "&:hover .card-paper": {
                    transform: "translateY(-4px) scale(1.04)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                },
            }}
        >
            <Paper
                className='card-paper'
                elevation={3}
                sx={{
                    width: 130,
                    height: 195,
                    borderRadius: "10px",
                    overflow: "hidden",
                    border:
                        deckType === "power"
                            ? `2px solid ${rarityColor}`
                            : "2px solid #8B0000",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative",
                }}
            >
                {/* Art */}
                <Box
                    sx={{
                        height: "60%",
                        bgcolor: "#f5f0e6",
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <Box
                        component='img'
                        src={artUrl}
                        alt={card.name}
                        onError={(e) => {
                            e.target.style.display = "none"
                        }}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                    {/* Action overlay */}
                    <Box
                        className='card-actions'
                        sx={{
                            position: "absolute",
                            inset: 0,
                            bgcolor: "rgba(0,0,0,0.55)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            opacity: 0,
                            transition: "opacity 0.2s",
                        }}
                    >
                        <Tooltip title='Edit'>
                            <IconButton
                                size='small'
                                onClick={onEdit}
                                sx={{
                                    bgcolor: "rgba(255,255,255,0.15)",
                                    color: "#fff",
                                    "&:hover": { bgcolor: "#1565c0" },
                                }}
                            >
                                <Edit sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete'>
                            <IconButton
                                size='small'
                                onClick={onDelete}
                                sx={{
                                    bgcolor: "rgba(255,255,255,0.15)",
                                    color: "#fff",
                                    "&:hover": { bgcolor: "#c62828" },
                                }}
                            >
                                <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                {/* Info */}
                <Box
                    sx={{
                        height: "40%",
                        p: 0.75,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                    }}
                >
                    <Typography
                        sx={{
                            fontFamily: '"Cinzel", serif',
                            fontWeight: "bold",
                            fontSize: "0.6rem",
                            lineHeight: 1.2,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                        }}
                    >
                        {card.name}
                    </Typography>
                    {deckType === "power" && (
                        <Chip
                            label={rarity}
                            size='small'
                            sx={{
                                height: 12,
                                fontSize: "0.35rem",
                                fontWeight: "bold",
                                bgcolor: rarityColor,
                                color: "#fff",
                                alignSelf: "flex-start",
                            }}
                        />
                    )}
                    {deckType === "monster" && (
                        <Typography
                            sx={{
                                fontSize: "0.5rem",
                                opacity: 0.5,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {card.Attack || "Monster"}
                        </Typography>
                    )}
                </Box>
            </Paper>
        </Box>
    )
}

// ═══════════════════════════════════════════════════════════
// Login Screen
// ═══════════════════════════════════════════════════════════
function LoginScreen({ onSuccess }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [challengeSession, setChallengeSession] = useState(null) // string
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e) => {
        e.preventDefault()
        if (!CLIENT_ID) {
            setError(
                "Admin not configured. Set REACT_APP_COGNITO_CLIENT_ID in your environment.",
            )
            return
        }
        setLoading(true)
        setError("")
        try {
            const result = await cognitoSignIn(email.trim(), password)
            if (result.type === "newPasswordRequired") {
                setChallengeSession(result.session)
            } else {
                const { IdToken, AccessToken } = result.tokens
                localStorage.setItem("imk_admin_id_token", IdToken)
                localStorage.setItem("imk_admin_access_token", AccessToken)
                localStorage.setItem("imk_admin_email", email.trim())
                onSuccess(email.trim())
            }
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSetPassword = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.")
            return
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }
        setLoading(true)
        setError("")
        try {
            const tokens = await cognitoNewPassword(
                email.trim(),
                challengeSession,
                newPassword,
            )
            const { IdToken, AccessToken } = tokens
            localStorage.setItem("imk_admin_id_token", IdToken)
            localStorage.setItem("imk_admin_access_token", AccessToken)
            localStorage.setItem("imk_admin_email", email.trim())
            onSuccess(email.trim())
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "linear-gradient(135deg, #0d0606 0%, #1a0a0a 50%, #0d0606 100%)",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background texture */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.03,
                    backgroundImage:
                        "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 50px)",
                }}
            />

            <Paper
                elevation={12}
                sx={{
                    width: 400,
                    borderRadius: "20px",
                    overflow: "hidden",
                    border: "1px solid rgba(139,0,0,0.3)",
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(139,0,0,0.15)",
                }}
            >
                {/* Header */}
                <Box sx={{ p: 3, bgcolor: "#1a0a0a", textAlign: "center" }}>
                    <Casino sx={{ fontSize: 40, color: "#8B0000", mb: 1 }} />
                    <Typography
                        sx={{
                            fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                            fontWeight: "bold",
                            fontSize: "1.3rem",
                            color: "#fff",
                            letterSpacing: 2,
                        }}
                    >
                        I MUST KILL
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "0.75rem",
                            fontFamily: '"Cinzel", serif',
                            letterSpacing: 3,
                            mt: 0.5,
                        }}
                    >
                        {challengeSession ? "SET NEW PASSWORD" : "ADMIN ACCESS"}
                    </Typography>
                </Box>

                {/* Form */}
                <Box
                    component='form'
                    onSubmit={
                        challengeSession ? handleSetPassword : handleLogin
                    }
                    sx={{
                        p: 3,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {error && (
                        <Alert severity='error' onClose={() => setError("")}>
                            {error}
                        </Alert>
                    )}

                    {!challengeSession ? (
                        <>
                            <TextField
                                label='Email'
                                type='email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        "&:hover .MuiOutlinedInput-notchedOutline":
                                            { borderColor: "#8B0000" },
                                        "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                            { borderColor: "#8B0000" },
                                    },
                                }}
                            />
                            <TextField
                                label='Password'
                                type='password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                fullWidth
                                required
                            />
                        </>
                    ) : (
                        <>
                            <Alert severity='info'>
                                Welcome! Please set a permanent password for
                                your account.
                            </Alert>
                            <TextField
                                label='New Password'
                                type='password'
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                helperText='Min. 8 characters with uppercase, lowercase, and numbers'
                            />
                            <TextField
                                label='Confirm Password'
                                type='password'
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                fullWidth
                                required
                            />
                        </>
                    )}

                    <Button
                        type='submit'
                        variant='contained'
                        fullWidth
                        disabled={loading}
                        startIcon={
                            loading ? (
                                <CircularProgress
                                    size={16}
                                    sx={{ color: "#fff" }}
                                />
                            ) : null
                        }
                        sx={{
                            mt: 1,
                            py: 1.5,
                            bgcolor: "#8B0000",
                            "&:hover": { bgcolor: "#a00" },
                            fontFamily: '"Cinzel", serif',
                            letterSpacing: 2,
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            borderRadius: "10px",
                        }}
                    >
                        {loading
                            ? "…"
                            : challengeSession
                              ? "Set Password"
                              : "Enter"}
                    </Button>
                </Box>
            </Paper>
        </Box>
    )
}

// ═══════════════════════════════════════════════════════════
// Root Admin Page
// ═══════════════════════════════════════════════════════════
export default function Admin() {
    const [authState, setAuthState] = useState("loading") // loading | unauthenticated | authenticated
    const [email, setEmail] = useState("")

    // Check for existing session on mount
    useEffect(() => {
        const idToken = localStorage.getItem("imk_admin_id_token")
        const savedEmail = localStorage.getItem("imk_admin_email")
        if (idToken && savedEmail) {
            // Basic JWT expiry check (decode without verification)
            try {
                const payload = JSON.parse(atob(idToken.split(".")[1]))
                if (payload.exp * 1000 > Date.now()) {
                    setEmail(savedEmail)
                    setAuthState("authenticated")
                    return
                }
            } catch {
                /* bad token */
            }
            localStorage.removeItem("imk_admin_id_token")
            localStorage.removeItem("imk_admin_access_token")
            localStorage.removeItem("imk_admin_email")
        }
        setAuthState("unauthenticated")
    }, [])

    const handleLoginSuccess = (userEmail) => {
        setEmail(userEmail)
        setAuthState("authenticated")
    }

    const handleLogout = async () => {
        const accessToken = localStorage.getItem("imk_admin_access_token")
        if (accessToken) await cognitoSignOut(accessToken)
        localStorage.removeItem("imk_admin_id_token")
        localStorage.removeItem("imk_admin_access_token")
        localStorage.removeItem("imk_admin_email")
        setAuthState("unauthenticated")
        setEmail("")
    }

    if (authState === "loading") {
        return (
            <Box
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#0d0606",
                }}
            >
                <CircularProgress sx={{ color: "#8B0000" }} />
            </Box>
        )
    }

    if (authState === "unauthenticated") {
        return <LoginScreen onSuccess={handleLoginSuccess} />
    }

    return <AdminDashboard email={email} onLogout={handleLogout} />
}
