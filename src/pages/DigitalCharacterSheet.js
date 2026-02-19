import React, { useState, useRef } from "react"
import {
    Container,
    Box,
    Typography,
    TextField,
    Grid,
    Paper,
    Button,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
} from "@mui/material"
import { Upload, Save, RestartAlt, PictureAsPdf } from "@mui/icons-material"
import { saveAs } from "file-saver"
import html2canvas from "html2canvas"
import { PDFDocument, rgb } from "pdf-lib"
import * as fontkit from "fontkit"
import InsightToken from "../components/InsightToken"
import PlayerToolsButton from "../components/PlayerToolsButton"

const DigitalCharacterSheet = () => {
    // Character data state matching the original sheet
    const [characterData, setCharacterData] = useState({
        // Basic Info
        characterName: "",

        // Core Stats
        body: "",
        agility: "",
        focus: "",
        fate: "",
        bodyAtkChecked: false,
        agilityAtkChecked: false,
        focusAtkChecked: false,

        // Action Rolls
        brace: "",
        dodge: "",
        drawPower: "",
        dying: "",

        // Equipment
        shield: false,
        armor: false,

        // Health
        maxHP: "",
        currentHP: "",

        // Notes
        notes: "",
    })

    // Insight Tokens state management
    const [tokenCount, setTokenCount] = useState(1)
    const [tokenStates, setTokenStates] = useState({})

    // Load insight tokens from localStorage on component mount
    React.useEffect(() => {
        const savedTokenCount = localStorage.getItem("insightTokenCount")
        const savedTokenStates = localStorage.getItem("insightTokenStates")

        if (savedTokenCount) {
            setTokenCount(parseInt(savedTokenCount, 10))
        }

        if (savedTokenStates) {
            try {
                setTokenStates(JSON.parse(savedTokenStates))
            } catch (error) {
                console.error(
                    "Error parsing token states from localStorage:",
                    error,
                )
            }
        }
    }, [])

    // Save insight tokens to localStorage whenever tokenCount changes
    React.useEffect(() => {
        localStorage.setItem("insightTokenCount", tokenCount.toString())
    }, [tokenCount])

    // Save insight tokens to localStorage whenever tokenStates changes
    React.useEffect(() => {
        localStorage.setItem("insightTokenStates", JSON.stringify(tokenStates))
    }, [tokenStates])

    const handleTokenCountChange = (event) => {
        const newCount = event.target.value
        setTokenCount(newCount)

        // Clear token states that are beyond the new count
        setTokenStates((prevStates) => {
            const newStates = { ...prevStates }
            Object.keys(newStates).forEach((tokenId) => {
                if (parseInt(tokenId, 10) >= newCount) {
                    delete newStates[tokenId]
                }
            })
            return newStates
        })
    }

    const handleTokenFlip = (tokenId) => {
        setTokenStates((prevStates) => ({
            ...prevStates,
            [tokenId]: !prevStates[tokenId],
        }))
    }

    const handleResetTokens = () => {
        // Reset all tokens to front (false state) while keeping the current count
        setTokenStates({})
    }

    // Utility functions for PNG metadata embedding
    const embedCharacterDataInPNG = (canvas, characterData) => {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    // Find the end of IDAT chunks (before IEND)
                    let insertPosition = uint8Array.length - 12 // Before IEND chunk

                    // Create custom tEXt chunk for character data
                    const characterJSON = JSON.stringify(characterData)
                    const keyword = "Character Data"
                    const textData = new TextEncoder().encode(
                        keyword + "\0" + characterJSON,
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

    // Simple CRC32 implementation for PNG chunks
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

    const [alertOpen, setAlertOpen] = useState(false)
    const [alertMessage, setAlertMessage] = useState("")
    const [alertSeverity, setAlertSeverity] = useState("success")
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef(null)
    const characterSheetRef = useRef(null)

    const handleInputChange = (field) => (event) => {
        const value =
            event.target.type === "checkbox"
                ? event.target.checked
                : event.target.value
        setCharacterData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const showAlert = (message, severity = "success") => {
        setAlertMessage(message)
        setAlertSeverity(severity)
        setAlertOpen(true)
    }

    const saveToFormFillablePDF = async () => {
        try {
            // Debug: Log the character data to see what's being passed
            console.log("Character data when generating PDF:", characterData)

            const pdfDoc = await PDFDocument.create()

            // Register fontkit for custom font embedding
            pdfDoc.registerFontkit(fontkit)

            const page = pdfDoc.addPage([612, 792])
            const form = pdfDoc.getForm()

            // PDF-lib doesn't use setNeedAppearances - forms are automatically interactive

            // Embed Cinzel fonts
            const cinzelFontBytes = await fetch(
                "/fonts/cinzel/Cinzel-Regular.otf",
            ).then((res) => res.arrayBuffer())
            const cinzelDecorativeFontBytes = await fetch(
                "/fonts/cinzel/CinzelDecorative-Regular.otf",
            ).then((res) => res.arrayBuffer())
            const cinzelFont = await pdfDoc.embedFont(cinzelFontBytes)
            const cinzelDecorativeFont = await pdfDoc.embedFont(
                cinzelDecorativeFontBytes,
            )

            // Colors
            const black = rgb(0, 0, 0)
            const darkRed = rgb(0.545, 0, 0)
            const lightGray = rgb(0.976, 0.976, 0.976)

            const white = rgb(1, 1, 1)

            // Margins and layout
            const margin = 40
            const pageWidth = 612 - margin * 2
            let yPos = 752

            // Header: My Name Is...
            page.drawText("My Name Is...", {
                x: margin + pageWidth / 2 - 110,
                y: yPos,
                size: 28,
                font: cinzelFont,
                color: black,
            })
            yPos -= 38

            // Character Name Field (dotted underline)
            page.drawRectangle({
                x: margin + 100,
                y: yPos - 10,
                width: 300,
                height: 30,
                borderColor: black,
                borderWidth: 1.5,
                borderRadius: 8,
                color: white,
            })
            const nameField = form.createTextField("characterName")
            nameField.setText(characterData.characterName || "")
            nameField.addToPage(page, {
                x: margin + 105,
                y: yPos - 5,
                width: 290,
                height: 20,
                borderColor: black,
                borderWidth: 0,
                backgroundColor: white,
            })
            page.drawText("and", {
                x: margin + 420,
                y: yPos + 2,
                size: 16,
                font: cinzelDecorativeFont,
                color: black,
            })
            yPos -= 45

            // I MUST KILL title
            page.drawText("I MUST KILL", {
                x: margin + pageWidth / 2 - 110,
                y: yPos,
                size: 32,
                font: cinzelDecorativeFont,
                color: darkRed,
            })
            yPos -= 40

            // Draw a thick line
            page.drawLine({
                start: { x: margin, y: yPos },
                end: { x: margin + pageWidth, y: yPos },
                thickness: 2.5,
                color: black,
            })
            yPos -= 30

            // Core Stats Section
            const statLabels = ["BODY", "AGILITY", "FOCUS", "FATE"]
            const statFields = ["body", "agility", "focus", "fate"]

            const statWidth = pageWidth / 4
            for (let i = 0; i < statLabels.length; i++) {
                const x = margin + i * statWidth
                // Rounded stat box
                page.drawRectangle({
                    x: x + 8,
                    y: yPos - 60,
                    width: statWidth - 16,
                    height: 60,
                    borderColor: black,
                    borderWidth: 2,
                    borderRadius: 12,
                    color: lightGray,
                })
                page.drawText(statLabels[i], {
                    x: x + 20,
                    y: yPos - 30,
                    size: 18,
                    font: cinzelFont,
                    color: black,
                })

                // Add ATK bubbles for BODY, AGILITY, and FOCUS (positioned to the right)
                if (i < 3) {
                    // Only for BODY, AGILITY, FOCUS (not FATE)
                    const atkField = statFields[i]
                    const isChecked = characterData[`${atkField}AtkChecked`]

                    // ATK bubble positioned to the right
                    const bubbleX = x + statWidth - 24
                    const bubbleY = yPos - 20

                    // Draw ATK circle - always white background, checkbox will indicate state
                    page.drawCircle({
                        x: bubbleX,
                        y: bubbleY,
                        size: 12,
                        borderColor: black,
                        borderWidth: 1,
                        color: white, // Always white background
                    })

                    // Draw "atk" text - always black
                    page.drawText("atk", {
                        x: bubbleX - 8,
                        y: bubbleY - 3,
                        size: 8,
                        font: cinzelFont,
                        color: black, // Always black text
                    })

                    // Add checkbox centered over the ATK bubble - this shows the state
                    const atkCheckbox = form.createCheckBox(
                        `${atkField}AtkChecked`,
                    )
                    console.log(
                        `ATK Debug - Field: ${atkField}, IsChecked: ${isChecked}, Character Data:`,
                        characterData[`${atkField}AtkChecked`],
                    )

                    // Configure ATK checkbox appearance
                    atkCheckbox.enableReadOnly(false)

                    // Set default appearance for ATK checkbox
                    try {
                        atkCheckbox.defaultUpdateAppearances()
                    } catch (e) {
                        console.log(
                            `Could not set default appearance for ${atkField} checkbox:`,
                            e,
                        )
                    }

                    atkCheckbox.addToPage(page, {
                        x: bubbleX - 6,
                        y: bubbleY - 6,
                        width: 12,
                        height: 12,
                        borderColor: black,
                        borderWidth: 1,
                    })
                    // Check ATK state after adding to page
                    if (isChecked) {
                        console.log(`Checking ${atkField}AtkChecked checkbox`)
                        atkCheckbox.check()
                    }
                }

                // Stat value input field
                const statField = form.createTextField(statFields[i])
                statField.setText(characterData[statFields[i]] || "")

                // Draw rounded background for stat input field
                page.drawRectangle({
                    x: x + 18,
                    y: yPos - 52,
                    width: 44,
                    height: 19,
                    borderColor: black,
                    borderWidth: 1,
                    borderRadius: 4,
                    color: white,
                })

                statField.addToPage(page, {
                    x: x + 20,
                    y: yPos - 50,
                    width: 40,
                    height: 15,
                    borderColor: black,
                    borderWidth: 0,
                    backgroundColor: white,
                })
            }
            yPos -= 75

            // Action Rolls Section
            const actionLabels = ["BRACE", "DODGE", "DRAW POWER", "DYING"]
            for (let i = 0; i < actionLabels.length; i++) {
                const x = margin + i * statWidth
                page.drawRectangle({
                    x: x + 8,
                    y: yPos - 38,
                    width: statWidth - 16,
                    height: 38,
                    borderColor: black,
                    borderWidth: 2,
                    borderRadius: 12,
                    color: lightGray,
                })
                page.drawText(actionLabels[i], {
                    x: x + statWidth / 2 - 25,
                    y: yPos - 18,
                    size: 11,
                    font: cinzelFont,
                    color: black,
                })
            }
            yPos -= 55

            // Equipment and Health Section
            const halfWidth = pageWidth / 2
            // Equipment
            page.drawRectangle({
                x: margin,
                y: yPos - 90,
                width: halfWidth - 8,
                height: 90,
                borderColor: black,
                borderWidth: 2,
                borderRadius: 16,
                color: lightGray,
            })
            page.drawText("EQUIPMENT", {
                x: margin + halfWidth / 2 - 38,
                y: yPos - 18,
                size: 13,
                font: cinzelFont,
                color: black,
            })
            // Shield
            page.drawText("SHIELD?", {
                x: margin + 12,
                y: yPos - 38,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            const shieldYes = form.createCheckBox("shieldYes")
            const shieldNo = form.createCheckBox("shieldNo")
            console.log(
                "Shield Debug - Value:",
                characterData.shield,
                "Type:",
                typeof characterData.shield,
            )

            // Configure shield checkbox appearance
            shieldYes.enableReadOnly(false)
            shieldNo.enableReadOnly(false)

            // Set default appearances for checkboxes
            try {
                shieldYes.defaultUpdateAppearances()
                shieldNo.defaultUpdateAppearances()
            } catch (e) {
                console.log(
                    "Could not set default appearances for shield checkboxes:",
                    e,
                )
            }

            // Rounded background for shield yes checkbox
            page.drawRectangle({
                x: margin + 69,
                y: yPos - 43,
                width: 15,
                height: 15,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 3,
                color: white,
            })
            shieldYes.addToPage(page, {
                x: margin + 70,
                y: yPos - 42,
                width: 13,
                height: 13,
                borderColor: black,
                borderWidth: 1,
            })
            // Check shield state after adding to page
            if (characterData.shield === true) {
                console.log("Checking shieldYes checkbox")
                shieldYes.check()
            }
            page.drawText("Y", {
                x: margin + 88,
                y: yPos - 39,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            // Rounded background for shield no checkbox
            page.drawRectangle({
                x: margin + 109,
                y: yPos - 43,
                width: 15,
                height: 15,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 3,
                color: white,
            })
            shieldNo.addToPage(page, {
                x: margin + 110,
                y: yPos - 42,
                width: 13,
                height: 13,
                borderColor: black,
                borderWidth: 1,
            })
            // Check shield state after adding to page
            if (characterData.shield === false) {
                console.log("Checking shieldNo checkbox")
                shieldNo.check()
            }
            page.drawText("N", {
                x: margin + 128,
                y: yPos - 39,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            // Armor
            page.drawText("ARMOR?", {
                x: margin + 12,
                y: yPos - 62,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            const armorYes = form.createCheckBox("armorYes")
            const armorNo = form.createCheckBox("armorNo")
            console.log(
                "Armor Debug - Value:",
                characterData.armor,
                "Type:",
                typeof characterData.armor,
            )

            // Configure armor checkbox appearance
            armorYes.enableReadOnly(false)
            armorNo.enableReadOnly(false)

            // Set default appearances for checkboxes
            try {
                armorYes.defaultUpdateAppearances()
                armorNo.defaultUpdateAppearances()
            } catch (e) {
                console.log(
                    "Could not set default appearances for armor checkboxes:",
                    e,
                )
            }

            // Rounded background for armor yes checkbox
            page.drawRectangle({
                x: margin + 69,
                y: yPos - 67,
                width: 15,
                height: 15,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 3,
                color: white,
            })
            armorYes.addToPage(page, {
                x: margin + 70,
                y: yPos - 66,
                width: 13,
                height: 13,
                borderColor: black,
                borderWidth: 1,
            })
            // Check armor state after adding to page
            if (characterData.armor === true) {
                console.log("Checking armorYes checkbox")
                armorYes.check()
            }
            page.drawText("Y", {
                x: margin + 88,
                y: yPos - 63,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            // Rounded background for armor no checkbox
            page.drawRectangle({
                x: margin + 109,
                y: yPos - 67,
                width: 15,
                height: 15,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 3,
                color: white,
            })
            armorNo.addToPage(page, {
                x: margin + 110,
                y: yPos - 66,
                width: 13,
                height: 13,
                borderColor: black,
                borderWidth: 1,
            })
            // Check armor state after adding to page
            if (characterData.armor === false) {
                console.log("Checking armorNo checkbox")
                armorNo.check()
            }
            page.drawText("N", {
                x: margin + 128,
                y: yPos - 63,
                size: 11,
                font: cinzelFont,
                color: black,
            })

            // Health
            page.drawRectangle({
                x: margin + halfWidth + 8,
                y: yPos - 90,
                width: halfWidth - 8,
                height: 90,
                borderColor: black,
                borderWidth: 2,
                borderRadius: 16,
                color: lightGray,
            })
            page.drawText("HEALTH", {
                x: margin + halfWidth + halfWidth / 2 - 30,
                y: yPos - 18,
                size: 13,
                font: cinzelFont,
                color: black,
            })
            // Max HP
            page.drawText("MAX HP:", {
                x: margin + halfWidth + 20,
                y: yPos - 38,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            const maxHPField = form.createTextField("maxHP")
            maxHPField.setText(characterData.maxHP || "")

            // Rounded background for max HP input
            page.drawRectangle({
                x: margin + halfWidth + 113,
                y: yPos - 45,
                width: 54,
                height: 22,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 4,
                color: white,
            })

            maxHPField.addToPage(page, {
                x: margin + halfWidth + 115, // Moved further to the right for better spacing
                y: yPos - 43,
                width: 50,
                height: 18,
                borderColor: black,
                borderWidth: 0,
                backgroundColor: white,
            })
            // Current HP
            page.drawText("CURRENT HP:", {
                x: margin + halfWidth + 20,
                y: yPos - 62,
                size: 11,
                font: cinzelFont,
                color: black,
            })
            const currentHPField = form.createTextField("currentHP")
            currentHPField.setText(characterData.currentHP || "")

            // Rounded background for current HP input
            page.drawRectangle({
                x: margin + halfWidth + 113,
                y: yPos - 69,
                width: 54,
                height: 22,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 4,
                color: white,
            })

            currentHPField.addToPage(page, {
                x: margin + halfWidth + 115, // Moved further to the right for better spacing
                y: yPos - 67,
                width: 50,
                height: 18,
                borderColor: black,
                borderWidth: 0,
                backgroundColor: white,
            })
            yPos -= 110

            // Notes Section
            page.drawRectangle({
                x: margin,
                y: margin + 60,
                width: pageWidth,
                height: yPos - margin - 40,
                borderColor: black,
                borderWidth: 2,
                borderRadius: 16,
                color: lightGray,
            })
            page.drawText("NOTES", {
                x: margin + pageWidth / 2 - 28,
                y: yPos - 18,
                size: 13,
                font: cinzelFont,
                color: black,
            })
            // Notes field (multiline)
            const notesField = form.createTextField("notes")
            notesField.setText(characterData.notes || "")
            notesField.enableMultiline()

            // Rounded background for notes field
            page.drawRectangle({
                x: margin + 10,
                y: margin + 68,
                width: pageWidth - 20,
                height: yPos - margin - 66,
                borderColor: black,
                borderWidth: 1,
                borderRadius: 8,
                color: white,
            })

            notesField.addToPage(page, {
                x: margin + 12,
                y: margin + 70,
                width: pageWidth - 24,
                height: yPos - margin - 70,
                borderColor: black,
                borderWidth: 0,
                backgroundColor: white,
            })
            // Placeholder text (drawn, not part of field)
            if (!characterData.notes) {
                page.drawText(
                    "Character notes, backstory, equipment details, powers, etc...",
                    {
                        x: margin + 18,
                        y: margin + 80 + (yPos - margin - 70) - 24,
                        size: 10,
                        font: cinzelFont,
                        color: rgb(0.6, 0.6, 0.6),
                    },
                )
            }

            // Save the PDF
            const pdfBytes = await pdfDoc.save()
            const blob = new Blob([pdfBytes], { type: "application/pdf" })
            const fileName = characterData.characterName
                ? `${characterData.characterName
                      .replace(/[^a-z0-9]/gi, "_")
                      .toLowerCase()}_form_fillable.pdf`
                : "character_sheet_form_fillable.pdf"
            saveAs(blob, fileName)
            showAlert("Form-fillable PDF saved successfully!")
        } catch (error) {
            console.error("Error creating form-fillable PDF:", error)
            showAlert(`Error creating PDF: ${error.message}", "error`)
        }
    }

    const saveToCharacterFile = async () => {
        try {
            if (characterSheetRef.current) {
                // Hide the action buttons temporarily for a cleaner screenshot
                const actionButtons = document.querySelector(
                    '[data-testid="action-buttons"]',
                )
                if (actionButtons) {
                    actionButtons.style.display = "none"
                }

                const canvas = await html2canvas(characterSheetRef.current, {
                    backgroundColor: "#ffffff",
                    scale: 2, // Higher resolution
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    height: characterSheetRef.current.scrollHeight,
                    width: characterSheetRef.current.scrollWidth,
                })

                // Show the action buttons again
                if (actionButtons) {
                    actionButtons.style.display = "flex"
                }

                // Embed character data in the PNG
                const blobWithData = await embedCharacterDataInPNG(
                    canvas,
                    characterData,
                )

                const fileName = characterData.characterName
                    ? `${characterData.characterName
                          .replace(/[^a-z0-9]/gi, "_")
                          .toLowerCase()}.character.png`
                    : "character_sheet.character.png"
                saveAs(blobWithData, fileName)
                showAlert(
                    "Character saved as .character.png with embedded data!",
                )
            }
        } catch (error) {
            console.error("Error saving character file:", error)
            showAlert("Error saving character sheet", "error")
        }
    }

    const loadFromCharacterFile = async (event) => {
        const file = event.target.files[0]
        if (file) {
            try {
                if (
                    file.name.endsWith(".character.png") ||
                    file.name.endsWith(".png")
                ) {
                    // Try to extract character data from PNG
                    const characterData =
                        await extractCharacterDataFromPNG(file)
                    if (characterData) {
                        setCharacterData((prev) => ({
                            ...prev,
                            ...characterData,
                        }))
                        showAlert("Character sheet loaded from .character.png!")
                    } else {
                        showAlert(
                            "No character data found in this PNG file",
                            "error",
                        )
                    }
                } else {
                    // Handle legacy .character and .json files
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        try {
                            const loadedData = JSON.parse(e.target.result)
                            setCharacterData((prev) => ({
                                ...prev,
                                ...loadedData,
                            }))
                            showAlert("Character sheet loaded successfully!")
                        } catch (error) {
                            showAlert("Error loading character sheet", "error")
                        }
                    }
                    reader.readAsText(file)
                }
            } catch (error) {
                showAlert("Error loading character sheet", "error")
            }
        }
        // Reset the file input
        event.target.value = null
    }

    const loadCharacterFromFile = async (file) => {
        try {
            if (
                file.name.endsWith(".character.png") ||
                file.name.endsWith(".png")
            ) {
                // Try to extract character data from PNG
                const characterData = await extractCharacterDataFromPNG(file)
                if (characterData) {
                    setCharacterData((prev) => ({ ...prev, ...characterData }))
                    showAlert("Character sheet loaded from .character.png!")
                } else {
                    showAlert(
                        "No character data found in this PNG file",
                        "error",
                    )
                }
            } else {
                // Handle legacy .character and .json files
                const reader = new FileReader()
                reader.onload = (e) => {
                    try {
                        const loadedData = JSON.parse(e.target.result)
                        setCharacterData((prev) => ({ ...prev, ...loadedData }))
                        showAlert("Character sheet loaded successfully!")
                    } catch (error) {
                        showAlert("Error loading character sheet", "error")
                    }
                }
                reader.readAsText(file)
            }
        } catch (error) {
            showAlert("Error loading character sheet", "error")
        }
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
            // Check if it's a character file (.character.png) or legacy formats
            if (
                file.name.endsWith(".character.png") ||
                file.name.endsWith(".png") ||
                file.name.endsWith(".character") ||
                file.name.endsWith(".json")
            ) {
                loadCharacterFromFile(file)
            } else {
                showAlert(
                    "Please drop a .character.png file (or legacy .character/.json file)",
                    "error",
                )
            }
        }
    }

    const resetSheet = () => {
        setCharacterData({
            characterName: "",
            body: "",
            agility: "",
            focus: "",
            fate: "",
            bodyAtkChecked: false,
            agilityAtkChecked: false,
            focusAtkChecked: false,
            brace: "",
            dodge: "",
            gatherPower: "",
            dying: "",
            shield: false,
            armor: false,
            maxHP: "",
            currentHP: "",
            notes: "",
        })
        showAlert("Character sheet reset successfully!")
    }

    return (
        <>
            <Container
                maxWidth='md'
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    py: 2,
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    // Add visual feedback for drag over
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
                                '"Drop your character file here (.character.png)"',
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
                <Box sx={{ textAlign: "center", mb: 2 }}>
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
                        Character Sheet
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
                        Create, edit, and manage your I Must Kill character
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{
                            opacity: 0.6,
                            fontSize: { xs: "0.75rem", sm: "0.85rem" },
                            maxWidth: "600px",
                            margin: "8px auto 0",
                            fontFamily: '"Cinzel", serif',
                            fontStyle: "italic",
                        }}
                    ></Typography>
                </Box>

                {/* Action Buttons */}
                <Box
                    data-testid='action-buttons'
                    sx={{
                        mb: 2,
                        display: "flex",
                        gap: 1.5,
                        flexWrap: "wrap",
                        justifyContent: "center",
                    }}
                >
                    <Button
                        variant='outlined'
                        startIcon={<Save />}
                        onClick={saveToCharacterFile}
                        sx={{
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid rgba(255, 255, 255, 0.3)"
                                    : "2px solid rgba(0, 0, 0, 0.2)",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            backdropFilter: "blur(10px)",
                            "&:hover": {
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "2px solid rgba(255, 255, 255, 0.6)"
                                        : "2px solid rgba(0, 0, 0, 0.4)",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.08)",
                            },
                            borderRadius: "12px",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            textTransform: "none",
                            fontWeight: "bold",
                        }}
                    >
                        Save Character
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<Upload />}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid rgba(255, 255, 255, 0.3)"
                                    : "2px solid rgba(0, 0, 0, 0.2)",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            backdropFilter: "blur(10px)",
                            "&:hover": {
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "2px solid rgba(255, 255, 255, 0.6)"
                                        : "2px solid rgba(0, 0, 0, 0.4)",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.08)",
                            },
                            borderRadius: "12px",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            textTransform: "none",
                            fontWeight: "bold",
                        }}
                    >
                        Load Character
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<PictureAsPdf />}
                        onClick={() => {
                            console.log("=== PDF GENERATION STARTED ===")
                            console.log(
                                "Current character data at PDF generation:",
                            )
                            console.log(
                                "- bodyAtkChecked:",
                                characterData.bodyAtkChecked,
                            )
                            console.log(
                                "- agilityAtkChecked:",
                                characterData.agilityAtkChecked,
                            )
                            console.log(
                                "- focusAtkChecked:",
                                characterData.focusAtkChecked,
                            )
                            console.log(
                                "- shield:",
                                characterData.shield,
                                "(type:",
                                typeof characterData.shield,
                                ")",
                            )
                            console.log(
                                "- armor:",
                                characterData.armor,
                                "(type:",
                                typeof characterData.armor,
                                ")",
                            )
                            console.log("Complete data object:", characterData)
                            console.log(
                                "=== CALLING PDF GENERATION FUNCTION ===",
                            )
                            saveToFormFillablePDF()
                        }}
                        sx={{
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid rgba(255, 255, 255, 0.3)"
                                    : "2px solid rgba(0, 0, 0, 0.2)",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            backdropFilter: "blur(10px)",
                            "&:hover": {
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "2px solid rgba(255, 255, 255, 0.6)"
                                        : "2px solid rgba(0, 0, 0, 0.4)",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.08)",
                            },
                            borderRadius: "12px",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            textTransform: "none",
                            fontWeight: "bold",
                        }}
                    >
                        Form Fillable PDF
                    </Button>
                    <Button
                        variant='outlined'
                        startIcon={<RestartAlt />}
                        onClick={resetSheet}
                        sx={{
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid rgba(255, 255, 255, 0.3)"
                                    : "2px solid rgba(0, 0, 0, 0.2)",
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#121212",
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                            backdropFilter: "blur(10px)",
                            "&:hover": {
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "2px solid rgba(255, 255, 255, 0.6)"
                                        : "2px solid rgba(0, 0, 0, 0.4)",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "rgba(0, 0, 0, 0.08)",
                            },
                            borderRadius: "12px",
                            fontSize: "0.9rem",
                            fontFamily: '"Cinzel", serif',
                            textTransform: "none",
                            fontWeight: "bold",
                        }}
                    >
                        Reset
                    </Button>
                    <input
                        type='file'
                        ref={fileInputRef}
                        onChange={loadFromCharacterFile}
                        accept='.character.png,.png,.character,.json'
                        style={{ display: "none" }}
                    />
                </Box>

                {/* Character Sheet - PDF-faithful layout */}
                <Paper
                    id='character-sheet-container'
                    ref={characterSheetRef}
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
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                    }}
                >
                    {/* Header */}
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
                            }}
                        >
                            My Name Is...
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <TextField
                                value={characterData.characterName}
                                onChange={handleInputChange("characterName")}
                                variant='standard'
                                placeholder='Character Name'
                                sx={{
                                    mt: 2,
                                    width: "300px",
                                    "& .MuiInput-underline:before": {
                                        borderBottomStyle: "dotted",
                                        borderBottomWidth: "2px",
                                        borderBottomColor: "#000000",
                                    },
                                    "& .MuiInput-underline:hover:not(.Mui-disabled):before":
                                        {
                                            borderBottomColor: "#333333",
                                        },
                                    "& .MuiInput-underline:after": {
                                        borderBottomColor: "#000000",
                                    },
                                    "& .MuiInputBase-input": {
                                        color: "#000000",
                                        textAlign: "center",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        fontFamily: '"Cinzel", serif',
                                        padding: "4px 0",
                                    },
                                }}
                            />
                            <Typography
                                sx={{
                                    mt: 2,
                                    ml: 2,
                                    fontWeight: "bold",
                                    fontSize: "18px",
                                    fontFamily: '"Cinzel", serif',
                                }}
                            >
                                and
                            </Typography>
                        </Box>
                        <Typography
                            variant='h3'
                            sx={{
                                fontWeight: "bold",
                                fontSize: "28px",
                                color: "#8B0000",
                                mt: 2,
                                letterSpacing: "3px",
                                fontFamily:
                                    '"Cinzel Decorative", "Cinzel", serif',
                            }}
                        >
                            I MUST KILL
                        </Typography>
                    </Box>

                    {/* Core Stats Grid */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {[
                            { label: "BODY", field: "body" },
                            { label: "AGILITY", field: "agility" },
                            { label: "FOCUS", field: "focus" },
                            { label: "FATE", field: "fate" },
                        ].map(({ label, field }) => (
                            <Grid item xs={6} sm={3} key={field}>
                                <Box
                                    sx={{
                                        border: "2px solid #000000",
                                        p: 1.5,
                                        textAlign: "center",
                                        backgroundColor: "#f9f9f9",
                                        borderRadius: "12px",
                                    }}
                                >
                                    <Box sx={{ position: "relative" }}>
                                        <Typography
                                            variant='h6'
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 1,
                                                color: "#000000",
                                                fontSize: "12px",
                                                fontFamily: '"Cinzel", serif',
                                            }}
                                        >
                                            {label}
                                        </Typography>
                                        {(field === "body" ||
                                            field === "agility" ||
                                            field === "focus") && (
                                            <Box
                                                onClick={() => {
                                                    // Toggle an 'atkChecked' property for this stat
                                                    const currentValue =
                                                        characterData[
                                                            `${field}AtkChecked`
                                                        ]
                                                    const newValue =
                                                        !currentValue
                                                    console.log(
                                                        `ATK Bubble Clicked - Field: ${field}, Current Value: ${currentValue}, New Value: ${newValue}`,
                                                    )

                                                    setCharacterData((prev) => {
                                                        const updatedData = {
                                                            ...prev,
                                                            [`${field}AtkChecked`]:
                                                                newValue,
                                                        }
                                                        console.log(
                                                            `ATK State Updated - ${field}AtkChecked:`,
                                                            updatedData[
                                                                `${field}AtkChecked`
                                                            ],
                                                        )
                                                        console.log(
                                                            "Complete character data after ATK update:",
                                                            updatedData,
                                                        )
                                                        return updatedData
                                                    })
                                                }}
                                                sx={{
                                                    position: "absolute",
                                                    top: "-14px",
                                                    right: "-14px",
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "50%",
                                                    border: "1px dotted #000",
                                                    backgroundColor: "#f9f9f9",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "12px",
                                                    fontWeight: "bold",
                                                    fontFamily:
                                                        '"Cinzel", serif',
                                                    cursor: "pointer",
                                                    overflow: "visible",
                                                    zIndex: 5,
                                                }}
                                            >
                                                {characterData[
                                                    `${field}AtkChecked`
                                                ] ? (
                                                    <>
                                                        <Box
                                                            sx={{
                                                                position:
                                                                    "absolute",
                                                                top: 0,
                                                                left: 0,
                                                                width: "32px",
                                                                height: "32px",
                                                                borderRadius:
                                                                    "50%",
                                                                backgroundColor:
                                                                    "#8B0000",
                                                                zIndex: 10,
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                position:
                                                                    "relative",
                                                                zIndex: 15,
                                                                color: "#ffffff",
                                                            }}
                                                        >
                                                            atk
                                                        </span>
                                                    </>
                                                ) : (
                                                    "atk"
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                    <TextField
                                        value={characterData[field]}
                                        onChange={handleInputChange(field)}
                                        variant='standard'
                                        size='small'
                                        sx={{
                                            width: "50px",
                                            "& .MuiInput-underline:before": {
                                                borderBottomStyle: "dotted",
                                                borderBottomWidth: "2px",
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInput-underline:hover:not(.Mui-disabled):before":
                                                {
                                                    borderBottomColor:
                                                        "#333333",
                                                },
                                            "& .MuiInput-underline:after": {
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInputBase-input": {
                                                color: "#000000",
                                                textAlign: "center",
                                                fontSize: "16px",
                                                fontWeight: "bold",
                                                fontFamily: '"Cinzel", serif',
                                                padding: "4px 0",
                                            },
                                        }}
                                    />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Action Rolls */}
                    <Box sx={{ mb: 3 }}>
                        <Grid container spacing={2}>
                            {[
                                { label: "BRACE" },
                                { label: "DODGE" },
                                { label: "DRAW POWER" },
                                { label: "DYING" },
                            ].map(({ label }) => (
                                <Grid item xs={6} sm={3} key={label}>
                                    <Box
                                        sx={{
                                            border: "2px solid #000000",
                                            p: 2,
                                            textAlign: "center",
                                            backgroundColor: "#f9f9f9",
                                            borderRadius: "12px",
                                            minHeight: "60px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography
                                            variant='body1'
                                            sx={{
                                                fontWeight: "bold",
                                                color: "#000000",
                                                fontSize: "12px",
                                                fontFamily: '"Cinzel", serif',
                                                textAlign: "center",
                                            }}
                                        >
                                            {label}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Equipment and Health */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        {/* Equipment */}
                        <Grid item xs={12} sm={6}>
                            <Box
                                sx={{
                                    border: "2px solid #000000",
                                    p: 2,
                                    backgroundColor: "#f9f9f9",
                                    borderRadius: "12px",
                                }}
                            >
                                <Typography
                                    variant='h6'
                                    sx={{
                                        fontWeight: "bold",
                                        mb: 2,
                                        textAlign: "center",
                                        color: "#000000",
                                        fontSize: "14px",
                                        fontFamily: '"Cinzel", serif',
                                    }}
                                >
                                    EQUIPMENT
                                </Typography>

                                {/* Shield Y/N */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        mb: 2,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#000000",
                                            fontWeight: "bold",
                                            fontSize: "12px",
                                            fontFamily: '"Cinzel", serif',
                                            mr: 2,
                                        }}
                                    >
                                        SHIELD?
                                    </Typography>
                                    <Button
                                        variant={
                                            characterData.shield === true
                                                ? "outlined"
                                                : "contained"
                                        }
                                        size='small'
                                        onClick={() => {
                                            console.log(
                                                "Shield Y button clicked - Current shield value:",
                                                characterData.shield,
                                            )
                                            setCharacterData((prev) => {
                                                const updatedData = {
                                                    ...prev,
                                                    shield: true,
                                                }
                                                console.log(
                                                    "Shield updated to TRUE, complete data:",
                                                    updatedData,
                                                )
                                                return updatedData
                                            })
                                        }}
                                        sx={{
                                            minWidth: "30px",
                                            width: "30px",
                                            height: "30px",
                                            borderRadius: "50%",
                                            mr: 1,
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            bgcolor:
                                                characterData.shield === true
                                                    ? "transparent"
                                                    : "#8B0000",
                                            color:
                                                characterData.shield === true
                                                    ? "#000000"
                                                    : "#ffffff",
                                            borderColor: "#000000",
                                            "&:hover": {
                                                bgcolor:
                                                    characterData.shield ===
                                                    true
                                                        ? "#f0f0f0"
                                                        : "#660000",
                                            },
                                        }}
                                    >
                                        Y
                                    </Button>
                                    <Button
                                        variant={
                                            characterData.shield === false
                                                ? "outlined"
                                                : "contained"
                                        }
                                        size='small'
                                        onClick={() => {
                                            console.log(
                                                "Shield N button clicked - Current shield value:",
                                                characterData.shield,
                                            )
                                            setCharacterData((prev) => {
                                                const updatedData = {
                                                    ...prev,
                                                    shield: false,
                                                }
                                                console.log(
                                                    "Shield updated to FALSE, complete data:",
                                                    updatedData,
                                                )
                                                return updatedData
                                            })
                                        }}
                                        sx={{
                                            minWidth: "30px",
                                            width: "30px",
                                            height: "30px",
                                            borderRadius: "50%",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            bgcolor:
                                                characterData.shield === false
                                                    ? "transparent"
                                                    : "#8B0000",
                                            color:
                                                characterData.shield === false
                                                    ? "#000000"
                                                    : "#ffffff",
                                            borderColor: "#000000",
                                            "&:hover": {
                                                bgcolor:
                                                    characterData.shield ===
                                                    false
                                                        ? "#f0f0f0"
                                                        : "#660000",
                                            },
                                        }}
                                    >
                                        N
                                    </Button>
                                </Box>

                                {/* Armor Y/N */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#000000",
                                            fontWeight: "bold",
                                            fontSize: "12px",
                                            fontFamily: '"Cinzel", serif',
                                            mr: 2,
                                        }}
                                    >
                                        ARMOR?
                                    </Typography>
                                    <Button
                                        variant={
                                            characterData.armor === true
                                                ? "outlined"
                                                : "contained"
                                        }
                                        size='small'
                                        onClick={() => {
                                            console.log(
                                                "Armor Y button clicked - Current armor value:",
                                                characterData.armor,
                                            )
                                            setCharacterData((prev) => {
                                                const updatedData = {
                                                    ...prev,
                                                    armor: true,
                                                }
                                                console.log(
                                                    "Armor updated to TRUE, complete data:",
                                                    updatedData,
                                                )
                                                return updatedData
                                            })
                                        }}
                                        sx={{
                                            minWidth: "30px",
                                            width: "30px",
                                            height: "30px",
                                            borderRadius: "50%",
                                            mr: 1,
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            bgcolor:
                                                characterData.armor === true
                                                    ? "transparent"
                                                    : "#8B0000",
                                            color:
                                                characterData.armor === true
                                                    ? "#000000"
                                                    : "#ffffff",
                                            borderColor: "#000000",
                                            "&:hover": {
                                                bgcolor:
                                                    characterData.armor === true
                                                        ? "#f0f0f0"
                                                        : "#660000",
                                            },
                                        }}
                                    >
                                        Y
                                    </Button>
                                    <Button
                                        variant={
                                            characterData.armor === false
                                                ? "outlined"
                                                : "contained"
                                        }
                                        size='small'
                                        onClick={() => {
                                            console.log(
                                                "Armor N button clicked - Current armor value:",
                                                characterData.armor,
                                            )
                                            setCharacterData((prev) => {
                                                const updatedData = {
                                                    ...prev,
                                                    armor: false,
                                                }
                                                console.log(
                                                    "Armor updated to FALSE, complete data:",
                                                    updatedData,
                                                )
                                                return updatedData
                                            })
                                        }}
                                        sx={{
                                            minWidth: "30px",
                                            width: "30px",
                                            height: "30px",
                                            borderRadius: "50%",
                                            fontSize: "12px",
                                            fontWeight: "bold",
                                            bgcolor:
                                                characterData.armor === false
                                                    ? "transparent"
                                                    : "#8B0000",
                                            color:
                                                characterData.armor === false
                                                    ? "#000000"
                                                    : "#ffffff",
                                            borderColor: "#000000",
                                            "&:hover": {
                                                bgcolor:
                                                    characterData.armor ===
                                                    false
                                                        ? "#f0f0f0"
                                                        : "#660000",
                                            },
                                        }}
                                    >
                                        N
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Health */}
                        <Grid item xs={12} sm={6}>
                            <Box
                                sx={{
                                    border: "2px solid #000000",
                                    p: 2,
                                    backgroundColor: "#f9f9f9",
                                    borderRadius: "12px",
                                }}
                            >
                                <Typography
                                    variant='h6'
                                    sx={{
                                        fontWeight: "bold",
                                        mb: 2,
                                        textAlign: "center",
                                        color: "#000000",
                                        fontSize: "14px",
                                        fontFamily: '"Cinzel", serif',
                                    }}
                                >
                                    HEALTH
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        mb: 2,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#000000",
                                            fontWeight: "bold",
                                            mr: 1,
                                            fontSize: "11px",
                                            fontFamily: '"Cinzel", serif',
                                        }}
                                    >
                                        MAX HP:
                                    </Typography>
                                    <TextField
                                        value={characterData.maxHP}
                                        onChange={handleInputChange("maxHP")}
                                        variant='standard'
                                        size='small'
                                        sx={{
                                            width: "70px",
                                            "& .MuiInput-underline:before": {
                                                borderBottomStyle: "dotted",
                                                borderBottomWidth: "2px",
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInput-underline:hover:not(.Mui-disabled):before":
                                                {
                                                    borderBottomColor:
                                                        "#333333",
                                                },
                                            "& .MuiInput-underline:after": {
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInputBase-input": {
                                                color: "#000000",
                                                textAlign: "center",
                                                fontSize: "14px",
                                                fontWeight: "bold",
                                                fontFamily: '"Cinzel", serif',
                                                padding: "4px 0",
                                            },
                                        }}
                                    />
                                </Box>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#000000",
                                            fontWeight: "bold",
                                            mr: 1,
                                            fontSize: "11px",
                                            fontFamily: '"Cinzel", serif',
                                        }}
                                    >
                                        CURRENT HP:
                                    </Typography>
                                    <TextField
                                        value={characterData.currentHP}
                                        onChange={handleInputChange(
                                            "currentHP",
                                        )}
                                        variant='standard'
                                        size='small'
                                        sx={{
                                            width: "70px",
                                            "& .MuiInput-underline:before": {
                                                borderBottomStyle: "dotted",
                                                borderBottomWidth: "2px",
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInput-underline:hover:not(.Mui-disabled):before":
                                                {
                                                    borderBottomColor:
                                                        "#333333",
                                                },
                                            "& .MuiInput-underline:after": {
                                                borderBottomColor: "#000000",
                                            },
                                            "& .MuiInputBase-input": {
                                                color: "#000000",
                                                textAlign: "center",
                                                fontSize: "14px",
                                                fontWeight: "bold",
                                                fontFamily: '"Cinzel", serif',
                                                padding: "4px 0",
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Notes Section */}
                    <Box
                        sx={{
                            border: "2px solid #000000",
                            p: 2,
                            backgroundColor: "#f9f9f9",
                            borderRadius: "12px",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Typography
                            variant='h6'
                            sx={{
                                fontWeight: "bold",
                                mb: 2,
                                textAlign: "center",
                                color: "#000000",
                                fontSize: "14px",
                                fontFamily: '"Cinzel", serif',
                            }}
                        >
                            NOTES
                        </Typography>
                        <TextField
                            value={characterData.notes}
                            onChange={handleInputChange("notes")}
                            variant='outlined'
                            multiline
                            fullWidth
                            placeholder='Character notes, backstory, equipment details, powers, etc...'
                            sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "#ffffff",
                                    borderRadius: "8px",
                                    height: "100%",
                                    "& fieldset": {
                                        borderColor: "#000000",
                                        borderWidth: "2px",
                                        borderRadius: "8px",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: "#333333",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "#000000",
                                    },
                                },
                                "& .MuiInputBase-input": {
                                    color: "#000000",
                                    fontSize: "12px",
                                    fontFamily: '"Libre Baskerville", serif',
                                },
                                "& .MuiInputBase-root": {
                                    height: "100%",
                                    alignItems: "flex-start",
                                },
                            }}
                        />
                    </Box>
                </Paper>

                {/* Insight Tokens Section */}
                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: "100px" }}>
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
                            mb: 2,
                            fontFamily: '"Cinzel Decorative", "Cinzel", serif',
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#000000",
                        }}
                    >
                        Insight Tokens
                    </Typography>
                    <Typography
                        variant='h6'
                        sx={{
                            opacity: 0.8,
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            maxWidth: "600px",
                            margin: "0 auto 3rem",
                            textAlign: "center",
                            fontFamily: '"Cinzel", serif',
                            color: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "#e0e0e0"
                                    : "#000000",
                        }}
                    >
                        Manage your insight tokens - click to flip between front
                        and back
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: "center",
                            gap: 3,
                            marginBottom: 3,
                            justifyContent: "center",
                        }}
                    >
                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel
                                id='token-count-label'
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#000000",
                                    fontFamily: '"Cinzel", serif',
                                }}
                            >
                                Token Count
                            </InputLabel>
                            <Select
                                labelId='token-count-label'
                                value={tokenCount}
                                label='Token Count'
                                onChange={handleTokenCountChange}
                                sx={{
                                    color: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "#e0e0e0"
                                            : "#000000",
                                    fontFamily: '"Cinzel", serif',
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#ffffff"
                                                : "#000000",
                                        borderWidth: "2px",
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                        {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#ffffff"
                                                    : "#333333",
                                        },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                        {
                                            borderColor: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#ffffff"
                                                    : "#000000",
                                        },
                                }}
                            >
                                {[...Array(10)].map((_, index) => (
                                    <MenuItem
                                        key={index + 1}
                                        value={index + 1}
                                        sx={{
                                            color: (theme) =>
                                                theme.palette.mode === "dark"
                                                    ? "#e0e0e0"
                                                    : "#000000",
                                            fontFamily: '"Cinzel", serif',
                                        }}
                                    >
                                        {index + 1}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button
                            variant='outlined'
                            startIcon={<RestartAlt />}
                            onClick={handleResetTokens}
                            sx={{
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "2px solid rgba(255, 255, 255, 0.3)"
                                        : "2px solid rgba(0, 0, 0, 0.2)",
                                color: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "#e0e0e0"
                                        : "#121212",
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(0, 0, 0, 0.03)",
                                backdropFilter: "blur(10px)",
                                "&:hover": {
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "2px solid rgba(255, 255, 255, 0.6)"
                                            : "2px solid rgba(0, 0, 0, 0.4)",
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.1)"
                                            : "rgba(0, 0, 0, 0.08)",
                                },
                                borderRadius: "12px",
                                fontSize: "0.9rem",
                                fontFamily: '"Cinzel", serif',
                                textTransform: "none",
                                fontWeight: "bold",
                            }}
                        >
                            Reset Tokens
                        </Button>
                    </Box>

                    <Paper
                        sx={{
                            padding: 3,
                            backgroundColor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "#f9f9f9",
                            border: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "2px solid #ffffff"
                                    : "2px solid #000000",
                            borderRadius: "12px",
                            minHeight: "200px",
                        }}
                    >
                        <Grid
                            container
                            spacing={2}
                            justifyContent='center'
                            alignItems='center'
                        >
                            {[...Array(tokenCount)].map((_, index) => (
                                <Grid item key={index}>
                                    <InsightToken
                                        id={index}
                                        isFlipped={tokenStates[index] || false}
                                        onFlip={handleTokenFlip}
                                        size={100}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                        {tokenCount === 0 && (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "150px",
                                }}
                            >
                                <Typography
                                    variant='h6'
                                    sx={{
                                        opacity: 0.6,
                                        textAlign: "center",
                                        fontFamily: '"Cinzel", serif',
                                        color: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#e0e0e0"
                                                : "#000000",
                                    }}
                                >
                                    Select a token count to get started
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Box>

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

            <PlayerToolsButton />
        </>
    )
}

export default DigitalCharacterSheet
