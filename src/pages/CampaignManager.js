import React, { useState, useRef } from "react"
import {
    Container,
    Box,
    Typography,
    Button,
    Grid,
    Paper,
    TextField,
    Card,
    CardContent,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
} from "@mui/material"
import {
    Add,
    Save,
    Upload,
    PlayArrow,
    RestartAlt,
    Delete,
    Close,
} from "@mui/icons-material"
import html2canvas from "html2canvas"
import { saveAs } from "file-saver"
import GMToolsButton from "../components/GMToolsButton"

const CampaignManager = () => {
    const [partyName, setPartyName] = useState("")
    const [characters, setCharacters] = useState([])
    const [gmNotes, setGmNotes] = useState({})
    const [combatNotes, setCombatNotes] = useState({})
    const [alertOpen, setAlertOpen] = useState(false)
    const [alertMessage, setAlertMessage] = useState("")
    const [alertSeverity, setAlertSeverity] = useState("success")
    const [isDragOver, setIsDragOver] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [characterToDelete, setCharacterToDelete] = useState(null)

    const fileInputRef = useRef(null)
    const campaignSheetRef = useRef(null)

    // Utility functions for PNG metadata embedding (copied from DigitalCharacterSheet.js)
    const calculateCRC32 = (data) => {
        const crcTable = []
        for (let i = 0; i < 256; i++) {
            let c = i
            for (let j = 0; j < 8; j++) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
            }
            crcTable[i] = c
        }

        let crc = 0xffffffff
        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
        }
        return (crc ^ 0xffffffff) >>> 0
    }

    const embedPartyDataInPNG = (canvas, partyData) => {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    // Find the end of IDAT chunks (before IEND)
                    let insertPosition = uint8Array.length - 12 // Before IEND chunk

                    // Create custom tEXt chunk for party data
                    const partyJSON = JSON.stringify(partyData)
                    const keyword = "Party Data"
                    const textData = new TextEncoder().encode(
                        keyword + "\0" + partyJSON,
                    )

                    // Create chunk: Length (4 bytes) + Type (4 bytes) + Data + CRC (4 bytes)
                    const chunkLength = textData.length
                    const chunkType = new TextEncoder().encode("tEXt")

                    // Calculate CRC32 for chunk type + data
                    const crc32 = calculateCRC32(
                        new Uint8Array([...chunkType, ...textData]),
                    )

                    // Create the complete chunk
                    const chunk = new Uint8Array(4 + 4 + chunkLength + 4)
                    const view = new DataView(chunk.buffer)

                    // Length (big endian)
                    view.setUint32(0, chunkLength, false)
                    // Type
                    chunk.set(chunkType, 4)
                    // Data
                    chunk.set(textData, 8)
                    // CRC (big endian)
                    view.setUint32(8 + chunkLength, crc32, false)

                    // Insert the chunk before IEND
                    const newPNG = new Uint8Array(
                        uint8Array.length + chunk.length,
                    )
                    newPNG.set(uint8Array.slice(0, insertPosition), 0)
                    newPNG.set(chunk, insertPosition)
                    newPNG.set(
                        uint8Array.slice(insertPosition),
                        insertPosition + chunk.length,
                    )

                    const newBlob = new Blob([newPNG], { type: "image/png" })
                    resolve(newBlob)
                }
                reader.readAsArrayBuffer(blob)
            }, "image/png")
        })
    }

    const extractPartyDataFromPNG = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    // Look for tEXt chunks
                    let offset = 8 // Skip PNG signature

                    while (offset < uint8Array.length - 8) {
                        const view = new DataView(uint8Array.buffer, offset)
                        const chunkLength = view.getUint32(0, false) // big endian
                        const chunkType = new TextDecoder().decode(
                            uint8Array.slice(offset + 4, offset + 8),
                        )

                        if (chunkType === "tEXt") {
                            const chunkData = uint8Array.slice(
                                offset + 8,
                                offset + 8 + chunkLength,
                            )
                            const text = new TextDecoder().decode(chunkData)
                            const nullIndex = text.indexOf("\0")

                            if (nullIndex !== -1) {
                                const keyword = text.slice(0, nullIndex)
                                const data = text.slice(nullIndex + 1)

                                if (keyword === "Party Data") {
                                    const partyData = JSON.parse(data)
                                    resolve(partyData)
                                    return
                                }
                            }
                        }

                        if (chunkType === "IEND") break
                        offset += 8 + chunkLength + 4 // length + type + data + crc
                    }

                    resolve(null) // No party data found
                } catch (error) {
                    reject(error)
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }

    const extractCharacterDataFromPNG = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    // Look for tEXt chunks
                    let offset = 8 // Skip PNG signature

                    while (offset < uint8Array.length - 8) {
                        const view = new DataView(uint8Array.buffer, offset)
                        const chunkLength = view.getUint32(0, false) // big endian
                        const chunkType = new TextDecoder().decode(
                            uint8Array.slice(offset + 4, offset + 8),
                        )

                        if (chunkType === "tEXt") {
                            const chunkData = uint8Array.slice(
                                offset + 8,
                                offset + 8 + chunkLength,
                            )
                            const text = new TextDecoder().decode(chunkData)
                            const nullIndex = text.indexOf("\0")

                            if (nullIndex !== -1) {
                                const keyword = text.slice(0, nullIndex)
                                const data = text.slice(nullIndex + 1)

                                if (keyword === "Character Data") {
                                    const characterData = JSON.parse(data)
                                    resolve(characterData)
                                    return
                                }
                            }
                        }

                        if (chunkType === "IEND") break
                        offset += 8 + chunkLength + 4 // length + type + data + crc
                    }

                    resolve(null) // No character data found
                } catch (error) {
                    reject(error)
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }

    const showAlert = (message, severity = "success") => {
        setAlertMessage(message)
        setAlertSeverity(severity)
        setAlertOpen(true)
    }

    const handleAddCharacter = () => {
        fileInputRef.current?.click()
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (file) {
            try {
                if (
                    file.name.endsWith(".character.png") ||
                    file.name.endsWith(".png")
                ) {
                    // Check if it's a party file first
                    const partyData = await extractPartyDataFromPNG(file)
                    if (partyData) {
                        // Load party file
                        setPartyName(partyData.partyName || "")
                        setCharacters(partyData.characters || [])
                        setGmNotes(partyData.gmNotes || {})
                        setCombatNotes(partyData.combatNotes || {})
                        showAlert("Party loaded successfully!")
                        return
                    }

                    // Try to extract character data
                    const characterData =
                        await extractCharacterDataFromPNG(file)
                    if (characterData) {
                        const newCharacter = {
                            id: Date.now().toString(),
                            data: characterData,
                            fileName: file.name,
                        }
                        setCharacters((prev) => [...prev, newCharacter])
                        setGmNotes((prev) => ({
                            ...prev,
                            [newCharacter.id]: "",
                        }))
                        setCombatNotes((prev) => ({
                            ...prev,
                            [newCharacter.id]: "",
                        }))
                        showAlert("Character added to campaign!")
                    } else {
                        showAlert(
                            "No character data found in this PNG file",
                            "error",
                        )
                    }
                } else {
                    showAlert("Please upload a .character.png file", "error")
                }
            } catch (error) {
                showAlert("Error loading file", "error")
            }
        }
        // Reset file input
        event.target.value = null
    }

    const handleDeleteCharacter = (characterId) => {
        setCharacterToDelete(characterId)
        setConfirmDeleteOpen(true)
    }

    const confirmDelete = () => {
        if (characterToDelete) {
            setCharacters((prev) =>
                prev.filter((char) => char.id !== characterToDelete),
            )
            setGmNotes((prev) => {
                const newNotes = { ...prev }
                delete newNotes[characterToDelete]
                return newNotes
            })
            setCombatNotes((prev) => {
                const newNotes = { ...prev }
                delete newNotes[characterToDelete]
                return newNotes
            })
            showAlert("Character removed from campaign")
        }
        setConfirmDeleteOpen(false)
        setCharacterToDelete(null)
    }

    const handleGmNotesChange = (characterId, notes) => {
        setGmNotes((prev) => ({
            ...prev,
            [characterId]: notes,
        }))
    }

    const handleCombatNotesChange = (characterId, notes) => {
        setCombatNotes((prev) => ({
            ...prev,
            [characterId]: notes,
        }))
    }

    const handleCharacterDataChange = (characterId, field, value) => {
        setCharacters((prev) =>
            prev.map((char) =>
                char.id === characterId
                    ? {
                          ...char,
                          data: {
                              ...char.data,
                              [field]: value,
                          },
                      }
                    : char,
            ),
        )
    }

    const savePartyFile = async () => {
        if (!partyName.trim()) {
            showAlert("Please enter a party name before saving", "error")
            return
        }

        try {
            if (campaignSheetRef.current) {
                // Hide the action buttons temporarily for a cleaner screenshot
                const actionButtons = document.querySelector(
                    '[data-testid="action-buttons"]',
                )
                if (actionButtons) {
                    actionButtons.style.display = "none"
                }

                const canvas = await html2canvas(campaignSheetRef.current, {
                    backgroundColor: "#ffffff",
                    scale: 2, // Higher resolution
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    height: campaignSheetRef.current.scrollHeight,
                    width: campaignSheetRef.current.scrollWidth,
                })

                // Show the action buttons again
                if (actionButtons) {
                    actionButtons.style.display = "flex"
                }

                const partyData = {
                    partyName,
                    characters,
                    gmNotes,
                    combatNotes,
                    savedAt: new Date().toISOString(),
                }

                // Embed party data in the PNG
                const blobWithData = await embedPartyDataInPNG(
                    canvas,
                    partyData,
                )

                const fileName = `${partyName
                    .replace(/[^a-z0-9]/gi, "_")
                    .toLowerCase()}.party.png`

                saveAs(blobWithData, fileName)
                showAlert("Party saved successfully!")
            } else {
                showAlert(
                    "Error: Could not find campaign sheet to save",
                    "error",
                )
            }
        } catch (error) {
            console.error("Error saving party file:", error)
            showAlert("Error saving party file", "error")
        }
    }

    const startCombat = async () => {
        if (characters.length === 0) {
            showAlert("Add characters before starting combat", "error")
            return
        }

        try {
            // Create combat data with all characters - using 'characters' array as expected by InitiativeTracker
            const combatData = {
                characters: characters.map((char, index) => ({
                    id: char.id,
                    name: char.data.characterName || `Character ${index + 1}`,
                    data: char.data, // Character sheet data
                    notes: combatNotes[char.id] || "", // Combat notes for initiative tracker
                })),
                currentTurn: 0,
                savedAt: new Date().toISOString(),
                partyName: partyName,
            }

            // Store combat data in sessionStorage for the new tab
            const combatDataKey = `combat_data_${Date.now()}`
            sessionStorage.setItem(combatDataKey, JSON.stringify(combatData))

            // Open Initiative Tracker in new tab with combat data
            const newTab = window.open(
                `/initiative-tracker?combat=${combatDataKey}`,
                "_blank",
            )
            if (newTab) {
                showAlert("Combat started in new tab!")
            } else {
                showAlert(
                    "Please allow popups to open Combat Tracker",
                    "warning",
                )
            }
        } catch (error) {
            console.error("Error starting combat:", error)
            showAlert("Error starting combat", "error")
        }
    }

    const resetCampaign = () => {
        setPartyName("")
        setCharacters([])
        setGmNotes({})
        setCombatNotes({})
        showAlert("Campaign reset")
    }

    const handleDragOver = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(true)
    }

    const handleDragLeave = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(false)
    }

    const handleDrop = (event) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(false)

        const files = event.dataTransfer.files
        if (files.length > 0) {
            const file = files[0]
            if (
                file.name.endsWith(".character.png") ||
                file.name.endsWith(".party.png") ||
                file.name.endsWith(".png")
            ) {
                // Simulate file input event
                const mockEvent = {
                    target: { files: [file], value: null },
                }
                handleFileUpload(mockEvent)
            } else {
                showAlert(
                    "Please drop a .character.png or .party.png file",
                    "error",
                )
            }
        }
    }

    return (
        <>
            <Container
                maxWidth='lg'
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    py: 2,
                    pb: "100px", // Add 100px bottom padding
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    ...(isDragOver && {
                        "&::before": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(139, 0, 0, 0.1)",
                            border: "3px dashed #8B0000",
                            borderRadius: "16px",
                            zIndex: 1000,
                            pointerEvents: "none",
                        },
                        "&::after": {
                            content:
                                '"Drop character files here (.character.png or .party.png)"',
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "#8B0000",
                            color: "#ffffff",
                            padding: "16px 32px",
                            borderRadius: "12px",
                            fontFamily: '"Cinzel", serif',
                            fontSize: "18px",
                            fontWeight: "bold",
                            zIndex: 1001,
                            pointerEvents: "none",
                            boxShadow: "0 8px 24px rgba(139, 0, 0, 0.3)",
                        },
                    }),
                }}
            >
                {/* Header */}
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                        variant='h3'
                        component='h1'
                        gutterBottom
                        sx={{
                            fontWeight: "bold",
                            fontSize: {
                                xs: "1.8rem",
                                sm: "2.2rem",
                                md: "2.5rem",
                            },
                            mb: 1,
                            fontFamily:
                                '"Cinzel", "Libre Baskerville", "Crimson Text", serif',
                        }}
                    >
                        Campaign Manager
                    </Typography>
                    <Typography
                        variant='h6'
                        sx={{
                            opacity: 0.8,
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            maxWidth: "600px",
                            margin: "0 auto",
                            fontFamily: '"Cinzel", "Libre Baskerville", serif',
                        }}
                    >
                        Manage your party's character sheets with GM notes and
                        combat preparation
                    </Typography>
                    {characters.length > 0 && (
                        <Typography
                            variant='body2'
                            sx={{
                                mt: 1,
                                opacity: 0.6,
                                fontFamily: '"Cinzel", serif',
                                fontStyle: "italic",
                            }}
                        >
                            {characters.length} character
                            {characters.length !== 1 ? "s" : ""} in party
                        </Typography>
                    )}
                </Box>

                {/* Action Buttons */}
                <Box
                    data-testid='action-buttons'
                    sx={{
                        mb: 3,
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        justifyContent: "center",
                    }}
                >
                    <Button
                        variant='outlined'
                        startIcon={<Add />}
                        onClick={handleAddCharacter}
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                    : "1px solid rgba(0, 0, 0, 0.15)",
                            color: "inherit",
                            borderRadius: "12px",
                            backdropFilter: "blur(10px)",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            transition: "all 0.3s ease",
                            "&:hover": {
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.06)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.3)"
                                        : "1px solid rgba(0, 0, 0, 0.25)",
                            },
                        }}
                    >
                        Add Character
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<Save />}
                        onClick={() => {
                            if (!partyName.trim()) {
                                showAlert(
                                    "Please enter a party name before saving",
                                    "warning",
                                )
                                return
                            }
                            if (characters.length === 0) {
                                showAlert(
                                    "Please add at least one character before saving",
                                    "warning",
                                )
                                return
                            }
                            savePartyFile()
                        }}
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                    : "1px solid rgba(0, 0, 0, 0.15)",
                            color: "inherit",
                            borderRadius: "12px",
                            backdropFilter: "blur(10px)",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            transition: "all 0.3s ease",
                            opacity:
                                !partyName.trim() || characters.length === 0
                                    ? 0.6
                                    : 1,
                            "&:hover": {
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.06)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.3)"
                                        : "1px solid rgba(0, 0, 0, 0.25)",
                            },
                        }}
                    >
                        {!partyName.trim()
                            ? "Enter Party Name"
                            : characters.length === 0
                              ? "Add Characters First"
                              : "Save Party"}
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<Upload />}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                    : "1px solid rgba(0, 0, 0, 0.15)",
                            color: "inherit",
                            borderRadius: "12px",
                            backdropFilter: "blur(10px)",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            transition: "all 0.3s ease",
                            "&:hover": {
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.06)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.3)"
                                        : "1px solid rgba(0, 0, 0, 0.25)",
                            },
                        }}
                    >
                        Load Party
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<PlayArrow />}
                        onClick={startCombat}
                        disabled={characters.length === 0}
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(255, 255, 255, 0.15)"
                                    : "1px solid rgba(0, 0, 0, 0.15)",
                            color: "inherit",
                            borderRadius: "12px",
                            backdropFilter: "blur(10px)",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            transition: "all 0.3s ease",
                            "&:hover": {
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.06)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(255, 255, 255, 0.3)"
                                        : "1px solid rgba(0, 0, 0, 0.25)",
                            },
                        }}
                    >
                        Start Combat
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<RestartAlt />}
                        onClick={resetCampaign}
                        sx={{
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "1px solid rgba(139, 0, 0, 0.5)"
                                    : "1px solid rgba(139, 0, 0, 0.4)",
                            color: "#8B0000",
                            borderRadius: "12px",
                            backdropFilter: "blur(10px)",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            transition: "all 0.3s ease",
                            "&:hover": {
                                bgcolor: "rgba(139, 0, 0, 0.1)",
                                border: "1px solid rgba(139, 0, 0, 0.7)",
                            },
                        }}
                    >
                        Reset
                    </Button>
                    <input
                        type='file'
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept='.character.png,.party.png,.png'
                        style={{ display: "none" }}
                    />
                </Box>

                {/* Campaign Sheet */}
                <Paper
                    ref={campaignSheetRef}
                    sx={{
                        backgroundColor: "#ffffff",
                        color: "#000000",
                        p: 3,
                        border: "2px solid #000000",
                        borderRadius: "16px",
                        fontFamily:
                            '"Cinzel", "Libre Baskerville", "Crimson Text", serif',
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        flex: 1,
                        mb: 3,
                    }}
                >
                    {/* Party Name */}
                    <Box
                        sx={{
                            textAlign: "center",
                            mb: 3,
                            borderBottom: "2px solid #000",
                            pb: 2,
                        }}
                    >
                        <Typography
                            variant='h4'
                            sx={{
                                fontWeight: "bold",
                                fontSize: "24px",
                                color: "#000000",
                                letterSpacing: "2px",
                                fontFamily:
                                    '"Cinzel Decorative", "Cinzel", serif',
                                mb: 2,
                            }}
                        >
                            CAMPAIGN PARTY
                        </Typography>
                        <TextField
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            variant='standard'
                            placeholder='Enter Party Name'
                            required
                            sx={{
                                mt: 1,
                                width: "300px",
                                "& .MuiInput-underline:before": {
                                    borderBottomStyle: "dotted",
                                    borderBottomWidth: "2px",
                                    borderBottomColor: partyName.trim()
                                        ? "#000000"
                                        : "#ff6b6b",
                                },
                                "& .MuiInput-underline:hover:not(.Mui-disabled):before":
                                    {
                                        borderBottomColor: partyName.trim()
                                            ? "#333333"
                                            : "#ff4757",
                                    },
                                "& .MuiInput-underline:after": {
                                    borderBottomColor: partyName.trim()
                                        ? "#000000"
                                        : "#ff6b6b",
                                },
                                "& .MuiInputBase-input": {
                                    color: "#000000",
                                    textAlign: "center",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                    fontFamily: '"Cinzel", serif',
                                    padding: "8px 0",
                                },
                            }}
                        />
                        {!partyName.trim() && (
                            <Typography
                                variant='caption'
                                sx={{
                                    color: "#ff6b6b",
                                    fontSize: "12px",
                                    mt: 0.5,
                                    display: "block",
                                    textAlign: "center",
                                    fontStyle: "italic",
                                }}
                            >
                                Party name is required to save
                            </Typography>
                        )}
                    </Box>

                    {/* Characters Grid */}
                    {characters.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: "center",
                                py: 8,
                                border: "2px dashed #ccc",
                                borderRadius: "12px",
                                backgroundColor: "#f9f9f9",
                            }}
                        >
                            <Typography
                                variant='h6'
                                sx={{
                                    color: "#666",
                                    mb: 2,
                                    fontFamily: '"Cinzel", serif',
                                }}
                            >
                                No characters added yet
                            </Typography>
                            <Typography
                                variant='body2'
                                sx={{
                                    color: "#999",
                                    fontFamily: '"Cinzel", serif',
                                }}
                            >
                                Click "Add Character" or drag & drop
                                .character.png files
                            </Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {characters.map((character) => (
                                <Grid item xs={12} md={6} key={character.id}>
                                    <Card
                                        sx={{
                                            border: "2px solid #000000",
                                            borderRadius: "12px",
                                            backgroundColor: "#f9f9f9",
                                            position: "relative",
                                        }}
                                    >
                                        {/* Delete Button */}
                                        <IconButton
                                            onClick={() =>
                                                handleDeleteCharacter(
                                                    character.id,
                                                )
                                            }
                                            sx={{
                                                position: "absolute",
                                                top: 8,
                                                right: 8,
                                                backgroundColor: "#ff4444",
                                                color: "white",
                                                "&:hover": {
                                                    backgroundColor: "#cc0000",
                                                },
                                                zIndex: 1,
                                            }}
                                            size='small'
                                        >
                                            <Delete fontSize='small' />
                                        </IconButton>

                                        <CardContent sx={{ p: 3 }}>
                                            {/* Character Name */}
                                            <Typography
                                                variant='h5'
                                                sx={{
                                                    fontWeight: "bold",
                                                    textAlign: "center",
                                                    mb: 2,
                                                    pr: 4, // Space for delete button
                                                    fontFamily:
                                                        '"Cinzel", serif',
                                                    color: "#8B0000",
                                                }}
                                            >
                                                {character.data.characterName ||
                                                    "Unnamed Character"}
                                            </Typography>

                                            {/* Character Stats Summary - Now Editable */}
                                            <Grid
                                                container
                                                spacing={2}
                                                sx={{ mb: 2 }}
                                            >
                                                {[
                                                    {
                                                        label: "BODY",
                                                        field: "body",
                                                    },
                                                    {
                                                        label: "AGILITY",
                                                        field: "agility",
                                                    },
                                                    {
                                                        label: "FOCUS",
                                                        field: "focus",
                                                    },
                                                    {
                                                        label: "FATE",
                                                        field: "fate",
                                                    },
                                                ].map(({ label, field }) => (
                                                    <Grid
                                                        item
                                                        xs={3}
                                                        key={field}
                                                    >
                                                        <Box
                                                            sx={{
                                                                textAlign:
                                                                    "center",
                                                                border: "1px solid #ccc",
                                                                borderRadius:
                                                                    "8px",
                                                                p: 1,
                                                            }}
                                                        >
                                                            {" "}
                                                            <Typography
                                                                variant='caption'
                                                                sx={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize:
                                                                        "10px",
                                                                    fontFamily:
                                                                        '"Cinzel", serif',
                                                                    display:
                                                                        "block",
                                                                    mb: 0.5,
                                                                    color: "#000000", // Ensure text is always black on character sheets
                                                                }}
                                                            >
                                                                {label}
                                                            </Typography>
                                                            <TextField
                                                                size='small'
                                                                value={
                                                                    character
                                                                        .data[
                                                                        field
                                                                    ] || ""
                                                                }
                                                                onChange={(e) =>
                                                                    handleCharacterDataChange(
                                                                        character.id,
                                                                        field,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                variant='outlined'
                                                                sx={{
                                                                    width: "100%",
                                                                    "& .MuiOutlinedInput-root":
                                                                        {
                                                                            height: "32px",
                                                                            "& fieldset":
                                                                                {
                                                                                    borderColor:
                                                                                        "#ccc",
                                                                                },
                                                                            "&:hover fieldset":
                                                                                {
                                                                                    borderColor:
                                                                                        "#8B0000",
                                                                                },
                                                                            "&.Mui-focused fieldset":
                                                                                {
                                                                                    borderColor:
                                                                                        "#8B0000",
                                                                                },
                                                                        },
                                                                    "& .MuiInputBase-input":
                                                                        {
                                                                            textAlign:
                                                                                "center",
                                                                            fontWeight:
                                                                                "bold",
                                                                            fontFamily:
                                                                                '"Cinzel", serif',
                                                                            fontSize:
                                                                                "14px",
                                                                            padding:
                                                                                "6px 8px",
                                                                            color: "#000000", // Ensure input text is always black
                                                                        },
                                                                }}
                                                            />
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>

                                            {/* Health Info - Now Editable */}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    gap: 2,
                                                    mb: 2,
                                                    p: 1,
                                                    border: "1px solid #ccc",
                                                    borderRadius: "8px",
                                                    backgroundColor: "#fff",
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            fontWeight: "bold",
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "12px",
                                                            color: "#000000", // Ensure HP label is always black
                                                        }}
                                                    >
                                                        HP:
                                                    </Typography>
                                                    <TextField
                                                        size='small'
                                                        value={
                                                            character.data
                                                                .currentHP || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleCharacterDataChange(
                                                                character.id,
                                                                "currentHP",
                                                                e.target.value,
                                                            )
                                                        }
                                                        variant='outlined'
                                                        sx={{
                                                            width: "50px",
                                                            "& .MuiOutlinedInput-root":
                                                                {
                                                                    height: "28px",
                                                                    "& fieldset":
                                                                        {
                                                                            borderColor:
                                                                                "#ccc",
                                                                        },
                                                                },
                                                            "& .MuiInputBase-input":
                                                                {
                                                                    textAlign:
                                                                        "center",
                                                                    fontSize:
                                                                        "12px",
                                                                    padding:
                                                                        "4px 6px",
                                                                    color: "#000000", // Ensure HP input text is always black
                                                                },
                                                        }}
                                                    />
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "12px",
                                                            color: "#000000", // Ensure HP separator is always black
                                                        }}
                                                    >
                                                        /
                                                    </Typography>
                                                    <TextField
                                                        size='small'
                                                        value={
                                                            character.data
                                                                .maxHP || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleCharacterDataChange(
                                                                character.id,
                                                                "maxHP",
                                                                e.target.value,
                                                            )
                                                        }
                                                        variant='outlined'
                                                        sx={{
                                                            width: "50px",
                                                            "& .MuiOutlinedInput-root":
                                                                {
                                                                    height: "28px",
                                                                    "& fieldset":
                                                                        {
                                                                            borderColor:
                                                                                "#ccc",
                                                                        },
                                                                },
                                                            "& .MuiInputBase-input":
                                                                {
                                                                    textAlign:
                                                                        "center",
                                                                    fontSize:
                                                                        "12px",
                                                                    padding:
                                                                        "4px 6px",
                                                                    color: "#000000", // Ensure max HP input text is always black
                                                                },
                                                        }}
                                                    />
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        ml: "auto",
                                                    }}
                                                >
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "12px",
                                                            color: "#000000", // Ensure Shield label is always black
                                                        }}
                                                    >
                                                        Shield:
                                                    </Typography>
                                                    <Button
                                                        size='small'
                                                        variant={
                                                            character.data
                                                                .shield
                                                                ? "contained"
                                                                : "outlined"
                                                        }
                                                        onClick={() =>
                                                            handleCharacterDataChange(
                                                                character.id,
                                                                "shield",
                                                                !character.data
                                                                    .shield,
                                                            )
                                                        }
                                                        sx={{
                                                            minWidth: "40px",
                                                            height: "24px",
                                                            fontSize: "10px",
                                                            bgcolor: character
                                                                .data.shield
                                                                ? "#8B0000"
                                                                : "transparent",
                                                            color: character
                                                                .data.shield
                                                                ? "white"
                                                                : "#8B0000",
                                                            borderColor:
                                                                "#8B0000",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    character
                                                                        .data
                                                                        .shield
                                                                        ? "#660000"
                                                                        : "rgba(139, 0, 0, 0.1)",
                                                            },
                                                        }}
                                                    >
                                                        {character.data.shield
                                                            ? "Yes"
                                                            : "No"}
                                                    </Button>
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            fontFamily:
                                                                '"Cinzel", serif',
                                                            fontSize: "12px",
                                                            ml: 1,
                                                            color: "#000000", // Ensure Armor label is always black
                                                        }}
                                                    >
                                                        Armor:
                                                    </Typography>
                                                    <Button
                                                        size='small'
                                                        variant={
                                                            character.data.armor
                                                                ? "contained"
                                                                : "outlined"
                                                        }
                                                        onClick={() =>
                                                            handleCharacterDataChange(
                                                                character.id,
                                                                "armor",
                                                                !character.data
                                                                    .armor,
                                                            )
                                                        }
                                                        sx={{
                                                            minWidth: "40px",
                                                            height: "24px",
                                                            fontSize: "10px",
                                                            bgcolor: character
                                                                .data.armor
                                                                ? "#8B0000"
                                                                : "transparent",
                                                            color: character
                                                                .data.armor
                                                                ? "white"
                                                                : "#8B0000",
                                                            borderColor:
                                                                "#8B0000",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    character
                                                                        .data
                                                                        .armor
                                                                        ? "#660000"
                                                                        : "rgba(139, 0, 0, 0.1)",
                                                            },
                                                        }}
                                                    >
                                                        {character.data.armor
                                                            ? "Yes"
                                                            : "No"}
                                                    </Button>
                                                </Box>
                                            </Box>

                                            <Divider sx={{ my: 2 }} />

                                            {/* GM Notes */}
                                            <Typography
                                                variant='subtitle2'
                                                sx={{
                                                    fontWeight: "bold",
                                                    mb: 1,
                                                    fontFamily:
                                                        '"Cinzel", serif',
                                                    color: "#8B0000",
                                                }}
                                            >
                                                GM NOTES
                                            </Typography>
                                            <TextField
                                                multiline
                                                rows={3}
                                                fullWidth
                                                placeholder='Add GM notes for this character...'
                                                value={
                                                    gmNotes[character.id] || ""
                                                }
                                                onChange={(e) =>
                                                    handleGmNotesChange(
                                                        character.id,
                                                        e.target.value,
                                                    )
                                                }
                                                sx={{
                                                    mb: 2,
                                                    "& .MuiOutlinedInput-root":
                                                        {
                                                            backgroundColor:
                                                                "#ffffff",
                                                            borderRadius: "8px",
                                                            "& fieldset": {
                                                                borderColor:
                                                                    "#000000",
                                                                borderWidth:
                                                                    "1px",
                                                            },
                                                            "&:hover fieldset":
                                                                {
                                                                    borderColor:
                                                                        "#333333",
                                                                },
                                                            "&.Mui-focused fieldset":
                                                                {
                                                                    borderColor:
                                                                        "#8B0000",
                                                                },
                                                        },
                                                    "& .MuiInputBase-input": {
                                                        color: "#000000",
                                                        fontSize: "12px",
                                                        fontFamily:
                                                            '"Libre Baskerville", serif',
                                                    },
                                                }}
                                            />

                                            {/* Combat Notes */}
                                            <Typography
                                                variant='subtitle2'
                                                sx={{
                                                    fontWeight: "bold",
                                                    mb: 1,
                                                    fontFamily:
                                                        '"Cinzel", serif',
                                                    color: "#2E7D32",
                                                }}
                                            >
                                                COMBAT NOTES
                                            </Typography>
                                            <TextField
                                                multiline
                                                rows={3}
                                                fullWidth
                                                placeholder='Add combat notes (these will appear in initiative tracker)...'
                                                value={
                                                    combatNotes[character.id] ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    handleCombatNotesChange(
                                                        character.id,
                                                        e.target.value,
                                                    )
                                                }
                                                sx={{
                                                    "& .MuiOutlinedInput-root":
                                                        {
                                                            backgroundColor:
                                                                "#ffffff",
                                                            borderRadius: "8px",
                                                            "& fieldset": {
                                                                borderColor:
                                                                    "#2E7D32",
                                                                borderWidth:
                                                                    "1px",
                                                            },
                                                            "&:hover fieldset":
                                                                {
                                                                    borderColor:
                                                                        "#1B5E20",
                                                                },
                                                            "&.Mui-focused fieldset":
                                                                {
                                                                    borderColor:
                                                                        "#2E7D32",
                                                                },
                                                        },
                                                    "& .MuiInputBase-input": {
                                                        color: "#000000",
                                                        fontSize: "12px",
                                                        fontFamily:
                                                            '"Libre Baskerville", serif',
                                                    },
                                                }}
                                            />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Paper>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={confirmDeleteOpen}
                    onClose={() => setConfirmDeleteOpen(false)}
                >
                    <DialogTitle>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography variant='h6'>Confirm Delete</Typography>
                            <IconButton
                                onClick={() => setConfirmDeleteOpen(false)}
                                size='small'
                            >
                                <Close />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to remove this character from
                            the campaign?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            variant='contained'
                            color='error'
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Alert Snackbar */}
                <Snackbar
                    open={alertOpen}
                    autoHideDuration={3000}
                    onClose={() => setAlertOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setAlertOpen(false)}
                        severity={alertSeverity}
                        sx={{ width: "100%" }}
                    >
                        {alertMessage}
                    </Alert>
                </Snackbar>
            </Container>

            <GMToolsButton />
        </>
    )
}

export default CampaignManager
