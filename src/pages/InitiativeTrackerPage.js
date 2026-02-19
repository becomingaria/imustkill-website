import React, { useState, useCallback, useRef, useEffect } from "react"
import "../components/InitiativeTracker.css" // Import custom styles for form interactions
import {
    Container,
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
    Alert,
    Snackbar,
    Tooltip,
    InputAdornment,
    CircularProgress,
} from "@mui/material"
import {
    Add as AddIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Save as SaveIcon,
    Upload as UploadIcon,
    Refresh as RefreshIcon,
    Delete as DeleteIcon,
    Share as ShareIcon,
    ContentCopy as CopyIcon,
} from "@mui/icons-material"
import { createSession, updateSession, deleteSession } from "../utils/awsClient"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    SortableContext,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { saveAs } from "file-saver"
import html2canvas from "html2canvas"
import HomeButton from "../components/HomeButton"

// Individual combatant card component
const CombatantCard = ({
    combatant,
    onUpdate,
    isActive,
    onMoveUp,
    onMoveDown,
    onDelete,
    combatantCount = 1, // Add combatantCount prop with default
}) => {
    // Helper function to safely stop event propagation
    const stopAllPropagation = (e) => {
        e.stopPropagation()
        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation()
        }
        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
            e.nativeEvent.stopImmediatePropagation()
        }
    }

    // onMoveUp now represents moving backward in initiative
    // onMoveDown now represents moving forward in initiative

    // Use a ref to access the DOM element
    const cardRef = useRef(null)

    // Disable dragging completely to prevent ResizeObserver issues
    const { setNodeRef } = useSortable({
        id: combatant.id,
        disabled: true, // Always disable dragging
    })

    // Minimal style object to prevent layout shifts
    const style = {
        opacity: 1, // Always full opacity
    }

    // Minimal effect for active cards - styling is now handled by CSS
    useEffect(() => {
        if (isActive && cardRef.current && !combatant.isDangerCard) {
            // The card now has the active-card class applied directly
            // CSS handles all the styling, so no DOM manipulation needed
        }
    }, [isActive, combatant.isDangerCard])

    // Calculate dynamic card size based on number of combatants
    // Carousel is 100vh, so cards should be much smaller to fit properly
    const maxCarouselHeight = window.innerHeight * 0.9

    // Calculate dynamic card height to ensure cards don't exceed carousel bounds
    // Start with a reasonable base size and scale down for more combatants
    let baseCardHeight
    if (combatantCount === 1) {
        baseCardHeight = maxCarouselHeight * 1 // Larger for single card
    } else {
        baseCardHeight = maxCarouselHeight * 0.65 // Smallest for 6+ cards
    }

    // Apply additional scaling for very large numbers of combatants
    const scaleFactor = 0.8

    const dynamicCardHeight = baseCardHeight * scaleFactor
    const dynamicCardWidth = dynamicCardHeight * 0.67 // Maintain 2:3 aspect ratio

    // Convert to vh units for consistent scaling across devices
    const cardHeightVh = (dynamicCardHeight / window.innerHeight) * 100
    const cardWidthVh = (dynamicCardWidth / window.innerHeight) * 100

    // Special case for Spacer card (invisible)
    if (combatant.isSpacerCard) {
        return (
            <Card
                ref={setNodeRef}
                style={style}
                sx={{
                    width: {
                        xs: `${cardWidthVh}vh`,
                        sm: `${cardWidthVh}vh`,
                    }, // Dynamic width based on combatant count
                    height: {
                        xs: `${cardHeightVh}vh`,
                        sm: `${cardHeightVh}vh`,
                    }, // Dynamic height based on combatant count
                    margin: 1,
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: 2,
                    position: "relative",
                    transition: "all 0.3s ease-in-out",
                    cursor: "default",
                    boxShadow: "none",
                    pointerEvents: "none", // Make it completely uninteractive
                    visibility: "hidden", // Make it invisible but maintain layout space
                    contain: "layout style size",
                    willChange: "auto",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                }}
            >
                {/* Empty content - invisible spacer */}
            </Card>
        )
    }

    // Special case for DANGER card
    if (combatant.isDangerCard) {
        return (
            <Card
                ref={setNodeRef}
                style={style}
                sx={{
                    width: {
                        xs: `${cardWidthVh}vh`,
                        sm: `${cardWidthVh}vh`,
                    }, // Dynamic width based on combatant count
                    height: {
                        xs: `${cardHeightVh}vh`,
                        sm: `${cardHeightVh}vh`,
                    }, // Dynamic height based on combatant count
                    margin: 1,
                    backgroundColor: "rgba(244, 67, 54, 0.9)",
                    border: "3px solid #ff0000",
                    borderRadius: 2,
                    position: "relative",
                    transition: "all 0.3s ease-in-out",
                    cursor: "default", // Always default cursor
                    boxShadow: isActive
                        ? "0 8px 24px rgba(0,0,0,0.5)"
                        : "0 2px 8px rgba(0,0,0,0.3)",
                    pointerEvents: "auto",
                    // Enhanced layout stability to prevent ResizeObserver issues
                    contain: "layout style size",
                    willChange: "background-color",
                    boxSizing: "border-box",
                    overflow: "hidden",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                    "&:hover": {
                        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    },
                }}
            >
                <CardContent sx={{ padding: 2, color: "white" }}>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            marginY: 3,
                        }}
                    >
                        <Typography variant='h4' fontWeight='bold'>
                            DANGER!
                        </Typography>
                    </Box>

                    <Typography
                        variant='body1'
                        textAlign='center'
                        sx={{ mt: 2 }}
                    >
                        GM tells players which of them are in danger (if any).
                    </Typography>
                </CardContent>
            </Card>
        )
    }

    const getBorderColor = (type) => {
        switch (type) {
            case "Monster":
                return "#f44336" // Red
            case "Player Character":
                return "#4caf50" // Green
            case "NPC":
                return "#ff9800" // Orange/Yellow
            case "Environment":
                return "#9c27b0" // Purple
            case "DANGER":
                return "#ff0000" // Bright Red for DANGER card
            default:
                return "#757575" // Gray
        }
    }

    const getImageSource = (type) => {
        switch (type) {
            case "Monster":
                return "/monster.png"
            case "Player Character":
                return "/player.png"
            case "NPC":
                return "/player.png"
            case "Environment":
                return "/environment.png"
            case "DANGER":
                return "/monster.png" // Using monster image for DANGER
            default:
                return "/player.png"
        }
    }

    const handleStatusChange = (status, checked) => {
        const newStatuses = checked
            ? [...combatant.statuses, status]
            : combatant.statuses.filter((s) => s !== status)

        onUpdate(combatant.id, { statuses: newStatuses })
    }

    const handleDeadChange = (checked) => {
        onUpdate(combatant.id, { isDead: checked })
    }

    const handleNameChange = (newName) => {
        onUpdate(combatant.id, { name: newName })
    }

    // No duplicate useEffect here - it's been moved before the conditional return

    return (
        <Card
            ref={(node) => {
                // Save to both the sortable ref and our local ref
                setNodeRef(node)
                cardRef.current = node
            }}
            style={style}
            className={isActive ? "active-card" : undefined}
            sx={{
                width: { xs: `${cardWidthVh}vh`, sm: `${cardWidthVh}vh` }, // Dynamic width based on combatant count
                height: { xs: `${cardHeightVh}vh`, sm: `${cardHeightVh}vh` }, // Dynamic height based on combatant count
                margin: 1,
                border: `3px solid ${getBorderColor(combatant.type)}`,
                borderRadius: 2,
                position: "relative",
                transition:
                    "background-color 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out", // Add smooth resize transition
                cursor: "default", // Always default cursor
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)", // Consistent shadow
                backgroundColor: (theme) =>
                    theme.palette.mode === "dark"
                        ? "#424242" // Consistent solid gray for dark theme
                        : "#ffffff", // Consistent solid white for light theme
                pointerEvents: "auto",
                // Enhanced layout stability to prevent ResizeObserver issues
                contain: "layout style size",
                willChange: "background-color",
                // Stabilize all positioning and prevent reflows
                boxSizing: "border-box",
                overflow: "hidden", // Prevent content overflow
                // Force GPU acceleration to stabilize animations
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
                // Ensure form elements are interactive
                "& input, & textarea": {
                    pointerEvents: "auto !important",
                    cursor: "text !important",
                    zIndex: 300,
                    position: "relative",
                },
                "& button, & .MuiCheckbox-root": {
                    pointerEvents: "auto !important",
                    zIndex: 280,
                },
                "& .MuiCardContent-root": {
                    pointerEvents: "auto !important",
                },
                "& .MuiTextField-root": {
                    pointerEvents: "auto !important",
                    zIndex: 250,
                    position: "relative",
                },
                "&:hover": {
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)", // Minimal hover change
                },
            }}
        >
            {/* Delete button - positioned relative to Card, not CardContent */}
            {/* Always render a button/placeholder to maintain consistent spacing */}
            <Box
                sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    zIndex: 1200,
                    // Ensure consistent positioning regardless of parent scaling
                    transformOrigin: "top left",
                    // Add transition to smooth any position changes
                    transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {isActive && !combatant.isSpacerCard ? (
                    <IconButton
                        onClick={() => onDelete(combatant.id)}
                        size='small'
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%", // Make it perfectly round
                            padding: 0,
                            backgroundColor: "rgba(244, 67, 54, 0.9)",
                            color: "white",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)", // Match carousel timing
                            "&:hover": {
                                backgroundColor: "rgba(244, 67, 54, 1)",
                                transform: "scale(1.1)",
                                transition: "all 0.3s ease",
                            },
                        }}
                        title='Delete combatant'
                    >
                        <DeleteIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                ) : (
                    /* Invisible placeholder to maintain spacing */
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            backgroundColor: "transparent",
                            pointerEvents: "none",
                            opacity: 0,
                        }}
                    />
                )}
            </Box>

            {/* Move back/forward buttons - positioned relative to Card */}
            {!combatant.isSpacerCard && (
                <Box
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        flexDirection: "row",
                        gap: "4px",
                        // Ensure consistent positioning regardless of parent scaling
                        transformOrigin: "top right",
                        // Add transition to smooth any position changes
                        transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <IconButton
                        onClick={onMoveUp}
                        size='small'
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%", // Make it round to match delete button
                            padding: 0,
                            backgroundColor: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)", // Match carousel timing
                            "&:hover": {
                                backgroundColor: "rgba(0,0,0,0.4)",
                                transform: "scale(1.1)",
                                transition: "all 0.3s ease",
                            },
                        }}
                        title='Move backward in initiative order'
                    >
                        <ArrowBackIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                    <IconButton
                        onClick={onMoveDown}
                        size='small'
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%", // Make it round to match delete button
                            padding: 0,
                            backgroundColor: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)", // Match carousel timing
                            "&:hover": {
                                backgroundColor: "rgba(0,0,0,0.4)",
                                transform: "scale(1.1)",
                                transition: "all 0.3s ease",
                            },
                        }}
                        title='Move forward in initiative order'
                    >
                        <ArrowForwardIcon sx={{ fontSize: "0.8rem" }} />
                    </IconButton>
                </Box>
            )}

            <CardContent
                sx={{
                    padding: 2,
                    position: "relative", // Ensure positioning context
                    boxSizing: "border-box", // Stable box model
                    height: "100%", // Fill the card height
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                }}
            >
                {/* Main character image */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: 2,
                        marginTop: 0, // Reduced margin since no delete button
                        position: "relative", // For positioning the X overlay
                    }}
                >
                    <img
                        src={getImageSource(combatant.type)}
                        alt={combatant.type}
                        style={{
                            width: 48,
                            height: 48,
                            objectFit: "contain",
                            transition: "filter 0.3s ease",
                        }}
                    />
                    {/* Red X overlay when dead */}
                    {combatant.isDead && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                fontSize: "36px",
                                color: "#ff0000",
                                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                                pointerEvents: "none",
                                zIndex: 10,
                            }}
                        >
                            ❌
                        </Box>
                    )}
                </Box>

                {/* Name input */}
                <TextField
                    value={combatant.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder='Combatant Name'
                    variant='outlined'
                    size='small'
                    onClick={(e) => {
                        // Fully cancel any propagation
                        stopAllPropagation(e)

                        // Ensure focus isn't lost when clicking
                        const input = e.currentTarget.querySelector("input")
                        if (input) {
                            // Stop propagation on the input too
                            input.onclick = (e) => {
                                stopAllPropagation(e)
                                return true
                            }

                            // Focus with a delay to ensure it works
                            setTimeout(() => {
                                input.focus()
                                // Make sure selection is at end - check if input and value exist
                                if (input && input.value != null) {
                                    const length = input.value.length
                                    input.setSelectionRange(length, length)
                                }
                            }, 10)
                        }
                    }}
                    onMouseDown={(e) => {
                        // Absolute prevention of event bubbling
                        stopAllPropagation(e)
                        e.preventDefault() // Only for mousedown - prevents losing focus
                    }}
                    onMouseUp={(e) => {
                        stopAllPropagation(e)
                    }}
                    onFocus={(e) => {
                        stopAllPropagation(e)
                    }}
                    onTouchStart={(e) => {
                        // Handle touch events for mobile devices
                        stopAllPropagation(e)
                    }}
                    className='editable-field name-field'
                    inputProps={{
                        style: {
                            cursor: "text",
                            pointerEvents: "auto !important",
                            position: "relative",
                            zIndex: 1100,
                            userSelect: "text",
                        },
                        onClick: (e) => {
                            stopAllPropagation(e)
                        },
                        onMouseDown: (e) => {
                            stopAllPropagation(e)
                            // Allow default behavior for the input itself
                        },
                        onMouseUp: (e) => {
                            stopAllPropagation(e)
                        },
                        onFocus: (e) => {
                            e.stopPropagation()
                            // Position cursor at end instead of selecting all text
                            setTimeout(() => {
                                if (
                                    e.currentTarget &&
                                    e.currentTarget.value != null
                                ) {
                                    const length = e.currentTarget.value.length
                                    e.currentTarget.setSelectionRange(
                                        length,
                                        length,
                                    )
                                }
                            }, 0)
                        },
                    }}
                    sx={{
                        width: "100%",
                        marginBottom: 1,
                        pointerEvents: "auto !important",
                        position: "relative",
                        "& .MuiOutlinedInput-root": {
                            fontSize: "0.9rem",
                            cursor: "text",
                            pointerEvents: "auto !important",
                            zIndex: 950,
                        },
                        cursor: "text",
                        zIndex: 900,
                        ...(isActive && {
                            zIndex: 1000,
                            position: "relative",
                        }),
                    }}
                />

                {/* Type chip */}
                <Box
                    sx={{
                        marginBottom: 1,
                    }}
                >
                    <Chip
                        label={combatant.type}
                        size='small'
                        sx={{
                            backgroundColor: getBorderColor(combatant.type),
                            color: "white",
                            fontSize: "0.75rem",
                            width: "100%",
                        }}
                    />
                </Box>

                {/* Dead checkbox - only for non-Environment combatants */}
                {combatant.type !== "Environment" && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={combatant.isDead}
                                onChange={(e) =>
                                    handleDeadChange(e.target.checked)
                                }
                                size='small'
                                sx={{ cursor: "pointer" }}
                            />
                        }
                        label='Dead'
                        sx={{
                            width: "100%",
                            marginBottom: 1,
                            "& .MuiFormControlLabel-label": {
                                fontSize: "0.8rem",
                            },
                        }}
                    />
                )}

                {/* Status checkboxes - 2x2 grid for non-Environment combatants */}
                {combatant.type !== "Environment" && (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 0.25,
                            marginBottom: 1,
                        }}
                    >
                        {[
                            "Frightened",
                            "Unconscious",
                            "Diseased",
                            "Poisoned",
                        ].map((status) => (
                            <FormControlLabel
                                key={status}
                                control={
                                    <Checkbox
                                        checked={combatant.statuses.includes(
                                            status,
                                        )}
                                        onChange={(e) =>
                                            handleStatusChange(
                                                status,
                                                e.target.checked,
                                            )
                                        }
                                        size='small'
                                        sx={{
                                            cursor: "pointer",
                                            padding: "2px",
                                        }}
                                    />
                                }
                                label={status}
                                sx={{
                                    margin: 0,
                                    "& .MuiFormControlLabel-label": {
                                        fontSize: "0.65rem",
                                    },
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Notes field */}
                <TextField
                    value={combatant.notes || ""}
                    onChange={(e) =>
                        onUpdate(combatant.id, { notes: e.target.value })
                    }
                    placeholder='Notes...'
                    variant='outlined'
                    size='small'
                    multiline
                    rows={2}
                    onClick={(e) => {
                        // Fully cancel any propagation
                        stopAllPropagation(e)

                        // Ensure focus isn't lost when clicking
                        const textarea =
                            e.currentTarget.querySelector("textarea")
                        if (textarea) {
                            // Stop propagation on the textarea too
                            textarea.onclick = (e) => {
                                stopAllPropagation(e)
                                return true
                            }

                            // Focus with a delay to ensure it works
                            setTimeout(() => {
                                textarea.focus()
                                // Leave cursor position where clicked
                            }, 10)
                        }
                    }}
                    onMouseDown={(e) => {
                        // Absolute prevention of event bubbling
                        stopAllPropagation(e)
                        // Allow default behavior to maintain selection capabilities
                    }}
                    onMouseUp={(e) => {
                        stopAllPropagation(e)
                    }}
                    onFocus={(e) => {
                        stopAllPropagation(e)
                    }}
                    onTouchStart={(e) => {
                        // Handle touch events for mobile devices
                        stopAllPropagation(e)
                    }}
                    className='editable-field notes-field'
                    inputProps={{
                        style: {
                            cursor: "text",
                            pointerEvents: "auto !important",
                            position: "relative",
                            zIndex: 600,
                            userSelect: "text",
                        },
                        onClick: (e) => {
                            stopAllPropagation(e)
                        },
                        onMouseDown: (e) => {
                            stopAllPropagation(e)
                            // Allow default behavior for the textarea itself
                        },
                        onMouseUp: (e) => {
                            stopAllPropagation(e)
                        },
                        onFocus: (e) => {
                            stopAllPropagation(e)
                            // Keep cursor where the user clicked for textarea
                        },
                    }}
                    sx={{
                        width: "100%",
                        marginTop: 1,
                        cursor: "text",
                        pointerEvents: "auto !important",
                        position: "relative",
                        "& .MuiOutlinedInput-root": {
                            cursor: "text",
                            fontSize: "0.8rem",
                            pointerEvents: "auto !important",
                            zIndex: 950,
                        },
                        zIndex: 900,
                        ...(isActive && {
                            zIndex: 1000,
                            position: "relative",
                        }),
                    }}
                />
            </CardContent>
        </Card>
    )
}

// Main Initiative Tracker page component
const InitiativeTrackerPage = () => {
    // CRITICAL: ResizeObserver suppression must be first to catch all errors
    useEffect(() => {
        // Immediate ResizeObserver override
        const originalResizeObserver = window.ResizeObserver
        if (originalResizeObserver) {
            window.ResizeObserver = class ResizeObserverPolyfill extends (
                originalResizeObserver
            ) {
                constructor(callback) {
                    const wrappedCallback = (...args) => {
                        requestAnimationFrame(() => {
                            try {
                                callback(...args)
                            } catch (e) {
                                // Silently ignore ResizeObserver errors
                            }
                        })
                    }
                    super(wrappedCallback)
                }
            }
        }

        return () => {
            if (originalResizeObserver) {
                window.ResizeObserver = originalResizeObserver
            }
        }
    }, [])
    // Enhanced ResizeObserver error suppression - multiple layers of protection
    useEffect(() => {
        const originalError = console.error
        const originalWarn = console.warn

        // Intercept all console errors and warnings
        console.error = (...args) => {
            const message = String(args[0] || "").toLowerCase()
            if (
                message.includes("resizeobserver") ||
                message.includes("resize") ||
                message.includes("observer") ||
                message.includes("loop completed") ||
                message.includes("undelivered notifications")
            ) {
                return // Completely suppress these errors
            }
            originalError.apply(console, args)
        }

        console.warn = (...args) => {
            const message = String(args[0] || "").toLowerCase()
            if (
                message.includes("resizeobserver") ||
                message.includes("resize") ||
                message.includes("observer")
            ) {
                return // Completely suppress these warnings
            }
            originalWarn.apply(console, args)
        }

        // Global error handler for window errors
        const handleWindowError = (event) => {
            const message = String(
                event.message || event.error?.message || "",
            ).toLowerCase()
            if (
                message.includes("resizeobserver") ||
                message.includes("resize") ||
                message.includes("observer") ||
                message.includes("loop completed") ||
                message.includes("undelivered notifications")
            ) {
                event.preventDefault()
                event.stopPropagation()
                if (event.stopImmediatePropagation) {
                    event.stopImmediatePropagation()
                }
                return false
            }
        }

        // Global unhandled rejection handler
        const handleUnhandledRejection = (event) => {
            const message = String(
                event.reason?.message || event.reason || "",
            ).toLowerCase()
            if (
                message.includes("resizeobserver") ||
                message.includes("resize") ||
                message.includes("observer")
            ) {
                event.preventDefault()
                return false
            }
        }

        // Override the ResizeObserver constructor to catch errors at the source
        const OriginalResizeObserver = window.ResizeObserver
        if (OriginalResizeObserver) {
            window.ResizeObserver = class extends OriginalResizeObserver {
                constructor(callback) {
                    const wrappedCallback = (entries, observer) => {
                        try {
                            callback(entries, observer)
                        } catch (error) {
                            // Silently handle ResizeObserver errors
                            return
                        }
                    }
                    super(wrappedCallback)
                }
            }
        }

        window.addEventListener("error", handleWindowError, true)
        window.addEventListener(
            "unhandledrejection",
            handleUnhandledRejection,
            true,
        )

        return () => {
            console.error = originalError
            console.warn = originalWarn
            window.removeEventListener("error", handleWindowError, true)
            window.removeEventListener(
                "unhandledrejection",
                handleUnhandledRejection,
                true,
            )
            if (OriginalResizeObserver) {
                window.ResizeObserver = OriginalResizeObserver
            }
        }
    }, [])

    // Enhanced scroll gravity effect that works even when carousel is mounted later
    useEffect(() => {
        // Set up a scroll handler that will work regardless of when the carousel appears
        const handleScroll = () => {
            // Clear any existing timeouts
            clearTimeout(scrollTimeoutRef.current)
            clearTimeout(gravityTimeoutRef.current)

            // Set a timeout to detect when scrolling has stopped
            scrollTimeoutRef.current = setTimeout(() => {
                // Check if the carousel element exists NOW (it might have been added since the effect ran)
                const carouselElement = trackerRef.current
                if (!carouselElement) return

                // Apply gravity effect - check if carousel is roughly centered
                const rect = carouselElement.getBoundingClientRect()
                const viewportHeight = window.innerHeight
                const carouselCenter = rect.top + rect.height / 1.9 // Adjusted to 1.9 for more precise centering
                const viewportCenter = viewportHeight / 2

                // Calculate distance from center
                const distanceFromCenter = Math.abs(
                    carouselCenter - viewportCenter,
                )
                const threshold = viewportHeight * 0.3 // Increased to 30% of viewport height for even stronger snap zone

                // If carousel is close to center but not perfectly aligned, apply stronger "gravity"
                if (distanceFromCenter < threshold && distanceFromCenter > 5) {
                    // Reduced minimum distance from 10 to 5
                    gravityTimeoutRef.current = setTimeout(() => {
                        const targetScroll =
                            window.pageYOffset +
                            (carouselCenter - viewportCenter) * 0.9 // Even stronger pull, 90% of the way

                        window.scrollTo({
                            top: targetScroll,
                            behavior: "smooth",
                        })
                    }, 100) // Reduced delay to 100ms for immediate response
                }
            }, 80) // Reduced detection time to 80ms for faster response
        }

        // Set up a mutation observer to detect when the carousel is added to the DOM
        const observerTarget = document.body
        const observerConfig = { childList: true, subtree: true }

        const mutationObserver = new MutationObserver(() => {
            // If the carousel ref exists after a DOM mutation, check if we need to apply gravity
            if (trackerRef.current) {
                handleScroll() // Check immediately when carousel appears
            }
        })

        // Start observing for carousel element appearing
        mutationObserver.observe(observerTarget, observerConfig)

        // Also listen for scroll events
        window.addEventListener("scroll", handleScroll, { passive: true })

        return () => {
            mutationObserver.disconnect()
            window.removeEventListener("scroll", handleScroll)
            clearTimeout(scrollTimeoutRef.current)
            clearTimeout(gravityTimeoutRef.current)
        }
    }, []) // No dependencies - this effect should only run once on component mount

    // Add debounced resize handler to prevent ResizeObserver issues
    useEffect(() => {
        let resizeTimeout
        const handleResize = () => {
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
                // Force a gentle reflow after resize completes
                if (trackerRef.current) {
                    trackerRef.current.style.transform = "translateZ(0)"
                }
            }, 250) // Debounce resize events
        }

        window.addEventListener("resize", handleResize, { passive: true })
        return () => {
            clearTimeout(resizeTimeout)
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    const [combatants, setCombatants] = useState([])
    const [currentTurn, setCurrentTurn] = useState(0)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [newCombatant, setNewCombatant] = useState({
        name: "",
        type: "Player Character",
    })

    // Alert state for user feedback
    const [alertOpen, setAlertOpen] = useState(false)
    const [alertMessage, setAlertMessage] = useState("")
    const [alertSeverity, setAlertSeverity] = useState("success")

    // Liveshare state
    const [liveshareDialogOpen, setLiveshareDialogOpen] = useState(false)
    const [createShareDialogOpen, setCreateShareDialogOpen] = useState(false)
    const [liveshareLink, setLiveshareLink] = useState("")
    const [liveshareId, setLiveshareId] = useState("")
    const [isLiveshareActive, setIsLiveshareActive] = useState(false)
    const [liveshareLoading, setLiveshareLoading] = useState(false)
    const [expirationTime, setExpirationTime] = useState(60) // Default: 60 minutes (1 hour)

    // Drag and drop state for loading
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef(null)
    const trackerRef = useRef(null)

    // Scroll gravity state for carousel
    const scrollTimeoutRef = useRef(null)
    const gravityTimeoutRef = useRef(null)

    // Completely disable drag sensors to prevent ResizeObserver issues
    const sensors = useSensors(
        useSensor(PointerSensor, {
            // Extremely high activation distance to completely disable drag
            activationConstraint: {
                distance: 10000, // Impossibly large value makes drag impossible
                delay: 10000, // Also add delay to prevent accidental activation
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: () => null, // Disable keyboard drag coordination
        }),
    )

    // Add keyboard event listener for '+' key to open add dialog
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Only handle if no input is focused and dialog is not already open
            const activeElement = document.activeElement
            const isInputFocused =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.contentEditable === "true")

            if (event.key === "+" && !addDialogOpen && !isInputFocused) {
                event.preventDefault() // Prevent the "+" from being typed
                event.stopPropagation() // Stop the event from propagating
                setAddDialogOpen(true)
            }
        }

        document.addEventListener("keydown", handleKeyPress)
        return () => {
            document.removeEventListener("keydown", handleKeyPress)
        }
    }, [addDialogOpen])

    // Get combatants in turn order
    const getCombatantsInTurnOrder = useCallback(() => {
        const monsters = combatants.filter((c) => c.type === "Monster")
        const npcs = combatants.filter((c) => c.type === "NPC")
        const environment = combatants.filter((c) => c.type === "Environment")
        const players = combatants.filter((c) => c.type === "Player Character")

        // Add a DANGER card before player characters if there are any players
        const orderedList = [...monsters, ...npcs, ...environment]

        if (players.length > 0) {
            // Add a special DANGER card that will be rendered differently
            const dangerCard = {
                id: "danger-card", // Unique ID that won't conflict
                name: "DANGER!",
                type: "DANGER", // Special type to handle differently
                statuses: [],
                isDead: false,
                notes: "GM tells players which of them are in danger (if any).",
                isDangerCard: true, // Flag to identify this special card
            }
            orderedList.push(dangerCard)
        }

        const finalList = [...orderedList, ...players]

        // Add spacer cards if we have 2 or 3 total cards to maintain proper spacing
        if (finalList.length >= 2 && finalList.length <= 3) {
            const spacersNeeded = 4 - finalList.length

            for (let i = 0; i < spacersNeeded; i++) {
                const spacerCard = {
                    id: `spacer-card-${i}`, // Unique ID for each spacer
                    name: "Spacer",
                    type: "SPACER",
                    statuses: [],
                    isDead: false,
                    notes: "",
                    isSpacerCard: true, // Flag to identify spacer cards
                }

                // Insert spacers between existing cards for better distribution
                if (finalList.length === 2) {
                    // For 2 cards, add spacers: Card1, Spacer1, Card2, Spacer2
                    if (i === 0) {
                        finalList.splice(1, 0, spacerCard) // Insert after first card
                    } else {
                        finalList.push(spacerCard) // Add at end
                    }
                } else if (finalList.length === 3) {
                    // For 3 cards, add 1 spacer: Card1, Card2, Spacer1, Card3
                    finalList.splice(2, 0, spacerCard) // Insert before last card
                }
            }
        }

        return finalList
    }, [combatants])

    // Helper function to get combatants in turn order from any combatants array
    const getCombatantsInTurnOrderFromArray = useCallback((combatantsArray) => {
        const monsters = combatantsArray.filter((c) => c.type === "Monster")
        const npcs = combatantsArray.filter((c) => c.type === "NPC")
        const environment = combatantsArray.filter(
            (c) => c.type === "Environment",
        )
        const players = combatantsArray.filter(
            (c) => c.type === "Player Character",
        )

        // Add a DANGER card before player characters if there are any players
        const orderedList = [...monsters, ...npcs, ...environment]

        if (players.length > 0) {
            // Add a special DANGER card that will be rendered differently
            const dangerCard = {
                id: "danger-card", // Unique ID that won't conflict
                name: "DANGER!",
                type: "DANGER", // Special type to handle differently
                statuses: [],
                isDead: false,
                notes: "GM tells players which of them are in danger (if any).",
                isDangerCard: true, // Flag to identify this special card
            }
            orderedList.push(dangerCard)
        }

        const finalList = [...orderedList, ...players]

        // Add spacer cards if we have 2 or 3 total cards to maintain proper spacing
        if (finalList.length >= 2 && finalList.length <= 3) {
            const spacersNeeded = 4 - finalList.length

            for (let i = 0; i < spacersNeeded; i++) {
                const spacerCard = {
                    id: `spacer-card-${i}`, // Unique ID for each spacer
                    name: "Spacer",
                    type: "SPACER",
                    statuses: [],
                    isDead: false,
                    notes: "",
                    isSpacerCard: true, // Flag to identify spacer cards
                }

                // Insert spacers between existing cards for better distribution
                if (finalList.length === 2) {
                    // For 2 cards, add spacers: Card1, Spacer1, Card2, Spacer2
                    if (i === 0) {
                        finalList.splice(1, 0, spacerCard) // Insert after first card
                    } else {
                        finalList.push(spacerCard) // Add at end
                    }
                } else if (finalList.length === 3) {
                    // For 3 cards, add 1 spacer: Card1, Card2, Spacer1, Card3
                    finalList.splice(2, 0, spacerCard) // Insert before last card
                }
            }
        }

        return finalList
    }, [])

    // Add keyboard navigation for left/right arrow keys to navigate carousel
    useEffect(() => {
        const handleArrowNavigation = (event) => {
            // Only handle arrow keys when no input/textarea is focused and no dialog is open
            const activeElement = document.activeElement
            const isInputFocused =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.contentEditable === "true")

            if (isInputFocused || addDialogOpen) {
                return // Don't interfere with text input or dialog interaction
            }

            // Use the same logic as getCombatantsInTurnOrder
            const orderedCombatants = getCombatantsInTurnOrder()

            // Helper function to find next non-spacer card (DANGER cards are OK)
            const findNextNonSpacerIndex = (startIndex, direction) => {
                let nextIndex = startIndex
                const length = orderedCombatants.length
                let attempts = 0
                const maxAttempts = length // Prevent infinite loops

                do {
                    if (direction === "left") {
                        nextIndex = nextIndex === 0 ? length - 1 : nextIndex - 1
                    } else {
                        nextIndex = nextIndex === length - 1 ? 0 : nextIndex + 1
                    }

                    attempts++

                    // If we've gone full circle or made too many attempts, break
                    if (attempts >= maxAttempts) {
                        // If all cards are spacers, return original index
                        return startIndex
                    }
                } while (orderedCombatants[nextIndex]?.isSpacerCard) // Only skip spacers, allow DANGER cards

                return nextIndex
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault()
                if (orderedCombatants.length === 0) return
                const prevIndex = findNextNonSpacerIndex(currentTurn, "left")
                setCurrentTurn(prevIndex)
            } else if (event.key === "ArrowRight") {
                event.preventDefault()
                if (orderedCombatants.length === 0) return
                const nextIndex = findNextNonSpacerIndex(currentTurn, "right")
                setCurrentTurn(nextIndex)
            }
        }

        document.addEventListener("keydown", handleArrowNavigation)
        return () => {
            document.removeEventListener("keydown", handleArrowNavigation)
        }
    }, [currentTurn, addDialogOpen, combatants, getCombatantsInTurnOrder])

    // Ensure currentTurn always points to a valid (non-spacer) card - DANGER cards are allowed
    useEffect(() => {
        const orderedCombatants = getCombatantsInTurnOrder()

        if (orderedCombatants.length === 0) {
            setCurrentTurn(0)
            return
        }

        const currentCombatant = orderedCombatants[currentTurn]

        // If current turn is pointing to a spacer card, find the next valid card (DANGER cards are OK)
        if (currentCombatant?.isSpacerCard) {
            let validIndex = 0

            // Find the first non-spacer card (allow DANGER cards)
            for (let i = 0; i < orderedCombatants.length; i++) {
                if (!orderedCombatants[i].isSpacerCard) {
                    validIndex = i
                    break
                }
            }

            setCurrentTurn(validIndex)
        } else if (currentTurn >= orderedCombatants.length) {
            // If current turn is out of bounds, reset to a valid index
            let validIndex = Math.max(0, orderedCombatants.length - 1)

            // Make sure it's not a spacer card (DANGER cards are OK)
            while (
                validIndex >= 0 &&
                orderedCombatants[validIndex]?.isSpacerCard
            ) {
                validIndex--
            }

            setCurrentTurn(Math.max(0, validIndex))
        }
    }, [combatants, getCombatantsInTurnOrder, currentTurn])

    // Add new combatant
    const addCombatant = () => {
        if (!newCombatant.name.trim()) return

        const newId = Date.now().toString()
        const combatant = {
            id: newId,
            name: newCombatant.name,
            type: newCombatant.type,
            statuses: [],
            isDead: false,
            notes: "",
        }

        setCombatants((prev) => [...prev, combatant])
        setNewCombatant({ name: "", type: newCombatant.type }) // Keep the same type, clear name
        // Don't close dialog to allow quick adding
    }

    // Update combatant
    const updateCombatant = (id, updates) => {
        setCombatants((prev) =>
            prev.map((combatant) =>
                combatant.id === id ? { ...combatant, ...updates } : combatant,
            ),
        )
    }

    // Delete combatant
    const deleteCombatant = (id) => {
        setCombatants((prev) => {
            const newCombatants = prev.filter(
                (combatant) => combatant.id !== id,
            )

            // Use helper function to get ordered combatants with spacers
            const newOrderedCombatants =
                getCombatantsInTurnOrderFromArray(newCombatants)

            // Reset turn if we're past the new length or if no combatants left
            if (newOrderedCombatants.length === 0) {
                setCurrentTurn(0)
            } else if (currentTurn >= newOrderedCombatants.length) {
                setCurrentTurn(Math.max(0, newOrderedCombatants.length - 1))
            }

            return newCombatants
        })
    }

    // Move combatant backward in initiative order (within their type)
    const moveCombatantUp = (id) => {
        // Don't allow moving spacer cards or danger cards
        const combatant = combatants.find((c) => c.id === id)
        if (!combatant) return // Spacer or danger cards aren't in the real combatants array

        const orderedList = getCombatantsInTurnOrder()
        const index = orderedList.findIndex((c) => c.id === id)

        if (index <= 0) return // Already at the beginning

        // Skip spacer cards and danger cards when finding previous combatant
        let prevIndex = index - 1
        while (
            prevIndex >= 0 &&
            (orderedList[prevIndex].isSpacerCard ||
                orderedList[prevIndex].isDangerCard)
        ) {
            prevIndex--
        }

        if (prevIndex < 0) return // No valid previous combatant
        const realPrevCombatant = orderedList[prevIndex]

        // Only allow movement within the same type
        if (combatant.type !== realPrevCombatant.type) return

        // Find positions in the real combatants array
        const combatantRealIndex = combatants.findIndex((c) => c.id === id)
        const prevCombatantRealIndex = combatants.findIndex(
            (c) => c.id === realPrevCombatant.id,
        )

        if (combatantRealIndex === -1 || prevCombatantRealIndex === -1) return

        // Swap positions in the real combatants array
        const newCombatants = [...combatants]
        newCombatants[combatantRealIndex] = realPrevCombatant
        newCombatants[prevCombatantRealIndex] = combatant

        // Update state
        setCombatants(newCombatants)

        // Update current turn if needed
        if (currentTurn === index) {
            setCurrentTurn(prevIndex)
        } else if (currentTurn === prevIndex) {
            setCurrentTurn(index)
        }
    }

    // Move combatant forward in initiative order (within their type)
    const moveCombatantDown = (id) => {
        // Don't allow moving spacer cards or danger cards
        const combatant = combatants.find((c) => c.id === id)
        if (!combatant) return // Spacer or danger cards aren't in the real combatants array

        const orderedList = getCombatantsInTurnOrder()
        const index = orderedList.findIndex((c) => c.id === id)

        if (index === -1 || index >= orderedList.length - 1) return // Already at the end

        // Skip spacer cards and danger cards when finding next combatant
        let nextIndex = index + 1
        while (
            nextIndex < orderedList.length &&
            (orderedList[nextIndex].isSpacerCard ||
                orderedList[nextIndex].isDangerCard)
        ) {
            nextIndex++
        }

        if (nextIndex >= orderedList.length) return // No valid next combatant
        const realNextCombatant = orderedList[nextIndex]

        // Only allow movement within the same type
        if (combatant.type !== realNextCombatant.type) return

        // Find positions in the real combatants array
        const combatantRealIndex = combatants.findIndex((c) => c.id === id)
        const nextCombatantRealIndex = combatants.findIndex(
            (c) => c.id === realNextCombatant.id,
        )

        if (combatantRealIndex === -1 || nextCombatantRealIndex === -1) return

        // Swap positions in the real combatants array
        const newCombatants = [...combatants]
        newCombatants[combatantRealIndex] = realNextCombatant
        newCombatants[nextCombatantRealIndex] = combatant

        // Update state
        setCombatants(newCombatants)

        // Update current turn if needed
        if (currentTurn === index) {
            setCurrentTurn(nextIndex)
        } else if (currentTurn === nextIndex) {
            setCurrentTurn(index)
        }
    }

    // We've replaced drag-and-drop reordering with forward/backward arrow buttons for better control within type groups

    // Utility functions for save/load functionality
    const showAlert = (message, severity = "success") => {
        setAlertMessage(message)
        setAlertSeverity(severity)
        setAlertOpen(true)
    }

    // Load combat data from sessionStorage if opened from Campaign Manager
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const combatParam = urlParams.get("combat")

        if (combatParam && combatants.length === 0) {
            // Only load if no current combatants
            try {
                const combatDataString = sessionStorage.getItem(combatParam)
                if (combatDataString) {
                    const combatData = JSON.parse(combatDataString)

                    // Load the character data into combatants
                    if (
                        combatData.characters &&
                        Array.isArray(combatData.characters)
                    ) {
                        const loadedCombatants = combatData.characters.map(
                            (character, index) => ({
                                id: `character-${index}-${Date.now()}`,
                                name:
                                    character.name || `Character ${index + 1}`,
                                type: "Player Character",
                                statuses: [],
                                isDead: false,
                                notes: character.gmNotes || "",
                                // Store additional character data for reference
                                characterData: character,
                            }),
                        )

                        setCombatants(loadedCombatants)
                        setCurrentTurn(0)
                        showAlert(
                            `Loaded ${loadedCombatants.length} characters from Campaign Manager!`,
                            "success",
                        )

                        // Clean up the sessionStorage data after loading
                        sessionStorage.removeItem(combatParam)
                    } else {
                        showAlert(
                            "No character data found in combat session",
                            "warning",
                        )
                    }
                } else {
                    showAlert("Combat session data not found", "error")
                }
            } catch (error) {
                console.error(
                    "Error loading combat data from sessionStorage:",
                    error,
                )
                showAlert("Error loading combat data", "error")
            }
        }
    }, [combatants.length]) // Depend on combatants.length to avoid infinite loops

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

    // Embed combat data in PNG
    const embedCombatDataInPNG = (canvas, combatData) => {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const arrayBuffer = reader.result
                    const uint8Array = new Uint8Array(arrayBuffer)

                    // Find the end of IDAT chunks (before IEND)
                    let insertPosition = uint8Array.length - 12 // Before IEND chunk

                    // Create custom tEXt chunk for combat data
                    const combatJSON = JSON.stringify(combatData)
                    const keyword = "Combat Data"
                    const textData = new TextEncoder().encode(
                        keyword + "\0" + combatJSON,
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

    // Extract combat data from PNG
    const extractCombatDataFromPNG = (file) => {
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

                                if (keyword === "Combat Data") {
                                    const combatData = JSON.parse(data)
                                    resolve(combatData)
                                    return
                                }
                            }
                        }

                        if (chunkType === "IEND") break
                        offset += 8 + chunkLength + 4 // length + type + data + crc
                    }

                    resolve(null) // No combat data found
                } catch (error) {
                    reject(error)
                }
            }
            reader.readAsArrayBuffer(file)
        })
    }

    // Save combat to PNG file
    const saveCombatState = async () => {
        try {
            if (trackerRef.current && combatants.length > 0) {
                const canvas = await html2canvas(trackerRef.current, {
                    backgroundColor: "#ffffff",
                    scale: 1,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                })

                const combatData = {
                    combatants,
                    currentTurn,
                    timestamp: new Date().toISOString(),
                }

                // Embed combat data in the PNG
                const blobWithData = await embedCombatDataInPNG(
                    canvas,
                    combatData,
                )

                const fileName = `combat_tracker_${
                    new Date().toISOString().split("T")[0]
                }.combat.png`
                saveAs(blobWithData, fileName)
                showAlert("Combat saved successfully!")
            } else {
                showAlert("No combat data to save", "warning")
            }
        } catch (error) {
            console.error("Error saving combat:", error)
            showAlert("Error saving combat", "error")
        }
    }

    // Load combat from file
    const loadCombatFromFile = async (file) => {
        try {
            if (
                file.name.endsWith(".combat.png") ||
                file.name.endsWith(".png")
            ) {
                const combatData = await extractCombatDataFromPNG(file)
                if (combatData) {
                    setCombatants(combatData.combatants || [])
                    setCurrentTurn(combatData.currentTurn || 0)
                    showAlert("Combat loaded successfully!")
                } else {
                    showAlert("No combat data found in this file", "error")
                }
            } else if (file.name.endsWith(".json")) {
                // Handle legacy JSON files
                const reader = new FileReader()
                reader.onload = (e) => {
                    try {
                        const combatData = JSON.parse(e.target.result)
                        setCombatants(combatData.combatants || [])
                        setCurrentTurn(combatData.currentTurn || 0)
                        showAlert("Combat loaded successfully!")
                    } catch (error) {
                        showAlert("Error loading combat file", "error")
                    }
                }
                reader.readAsText(file)
            } else {
                showAlert("Please select a .combat.png or .json file", "error")
            }
        } catch (error) {
            console.error("Error loading combat:", error)
            showAlert("Error loading combat", "error")
        }
    }

    // Handle file input change
    const handleFileChange = (event) => {
        const file = event.target.files[0]
        if (file) {
            loadCombatFromFile(file)
        }
        // Reset the file input
        event.target.value = null
    }

    // Reset combat
    const resetCombat = () => {
        setCombatants([])
        setCurrentTurn(0)
        showAlert("Combat reset successfully!")
    }

    // Drag and drop handlers
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
                file.name.endsWith(".combat.png") ||
                file.name.endsWith(".png") ||
                file.name.endsWith(".json")
            ) {
                loadCombatFromFile(file)
            } else {
                showAlert("Please drop a .combat.png or .json file", "error")
            }
        }
    }

    const orderedCombatants = getCombatantsInTurnOrder()

    // Create and handle Liveshare functionality
    const createLiveshare = async () => {
        try {
            setLiveshareLoading(true)
            console.log("Starting Liveshare creation process...")

            // Create data object that includes combatants and current turn
            const combatData = {
                combatants: combatants,
                currentTurn: currentTurn,
                orderedCombatants: getCombatantsInTurnOrder(),
                lastUpdated: new Date().toISOString(),
            }
            console.log("Combat data prepared:", combatData)

            // Create a new session in Supabase with optional expiration
            const useExpiration = expirationTime > 0
            console.log(
                "Using expiration:",
                useExpiration,
                "minutes:",
                useExpiration ? expirationTime : "none",
            )

            // Add detailed error handling with proper try/catch
            try {
                console.log("About to call createSession...")
                const { sessionId } = await createSession(
                    combatData,
                    useExpiration ? expirationTime : 480,
                )
                console.log("Session created with ID:", sessionId)

                // Set the liveshare link with the generated session ID
                const baseUrl = window.location.origin
                const shareLink = `${baseUrl}/live-game/${sessionId}`
                console.log("Share link generated:", shareLink)

                setLiveshareId(sessionId)
                setLiveshareLink(shareLink)
                setIsLiveshareActive(true)
                setLiveshareDialogOpen(true)

                // Show success alert with expiration info if applicable
                if (useExpiration) {
                    showAlert(
                        `Live sharing session created! It will expire in ${expirationTime} minutes.`,
                        "success",
                    )
                } else {
                    showAlert(
                        "Live sharing session created! You can share the link.",
                        "success",
                    )
                }
            } catch (innerError) {
                console.error("Detailed error in createSession:", innerError)
                if (innerError.message)
                    console.error("Error message:", innerError.message)
                if (innerError.code)
                    console.error("Error code:", innerError.code)
                if (innerError.details)
                    console.error("Error details:", innerError.details)
                throw innerError // Re-throw for outer catch
            }
        } catch (error) {
            console.error("Error creating Liveshare:", error)
            showAlert(
                `Failed to create live sharing session: ${
                    error.message || error
                }`,
                "error",
            )
        } finally {
            setLiveshareLoading(false)
        }
    }

    // Deactivate Liveshare session
    const deactivateSession = async () => {
        try {
            setLiveshareLoading(true)

            if (liveshareId) {
                await deleteSession(liveshareId)
                setLiveshareId("")
                setLiveshareLink("")
                setIsLiveshareActive(false)
                setLiveshareDialogOpen(false)
                showAlert(
                    "Liveshare session deactivated successfully.",
                    "success",
                )
            }

            setLiveshareLoading(false)
        } catch (error) {
            console.error("Error deactivating Liveshare session:", error)
            setLiveshareLoading(false)
            showAlert("Failed to deactivate Liveshare session.", "error")
        }
    }

    // Handle manual stop sharing
    const handleStopSharing = () => {
        deactivateSession()
    }

    // Update AWS when combat state changes if Liveshare is active
    useEffect(() => {
        // Use the memoized getCombatantsInTurnOrder function for dependency safety
        const orderedCombatants = getCombatantsInTurnOrder()

        const updateLiveSession = async () => {
            if (isLiveshareActive && liveshareId) {
                try {
                    const combatData = {
                        combatants: combatants,
                        currentTurn: currentTurn,
                        orderedCombatants: orderedCombatants,
                        lastUpdated: new Date().toISOString(),
                    }

                    await updateSession(liveshareId, combatData)
                } catch (error) {
                    console.error("Error updating Liveshare session:", error)
                }
            }
        }

        // Only update after the component has mounted and when it's not the initial render
        if (combatants.length > 0 || currentTurn > 0) {
            updateLiveSession()
        }
    }, [
        combatants,
        currentTurn,
        isLiveshareActive,
        liveshareId,
        getCombatantsInTurnOrder,
    ])

    // Add page refresh warning when liveshare is active
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isLiveshareActive) {
                // Standard way to show a confirmation dialog before page unload
                const message =
                    "Refreshing or closing this page will end your active live sharing session. Do you want to continue?"
                event.preventDefault()
                event.returnValue = message // Required for Chrome
                return message // Required for other browsers
            }
        }

        // Add the event listener if liveshare is active
        if (isLiveshareActive) {
            window.addEventListener("beforeunload", handleBeforeUnload)
        }

        // Clean up the event listener
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
        }
    }, [isLiveshareActive])

    // Handle actual page refresh/unload to deactivate the liveshare
    useEffect(() => {
        let isPageClosing = false

        const handleBeforeUnload = () => {
            // Mark that the page is closing so visibility change knows to deactivate
            isPageClosing = true
        }

        const handleVisibilityChange = () => {
            // Only deactivate if the page is actually closing, not just switching tabs
            if (
                document.hidden &&
                isLiveshareActive &&
                liveshareId &&
                isPageClosing
            ) {
                // Use fetch with keepalive for reliable delivery even when page is closing
                const deactivateUrl = `${process.env.REACT_APP_SESSIONS_API_URL}/sessions/${liveshareId}`

                try {
                    // Use fetch with keepalive to ensure the request completes
                    fetch(deactivateUrl, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        keepalive: true, // This ensures the request completes even if page closes
                    }).catch((error) => {
                        console.error(
                            "Error deactivating liveshare on visibility change:",
                            error,
                        )
                    })

                    console.log(
                        "Liveshare session deactivation requested on page close",
                    )
                } catch (error) {
                    console.error(
                        "Error deactivating liveshare on visibility change:",
                        error,
                    )
                }
            }
        }

        const handleUnload = () => {
            // Final attempt - this may not always work but provides a fallback
            if (isLiveshareActive && liveshareId) {
                try {
                    // Try to make a synchronous request as a last resort
                    const deactivateUrl = `${process.env.REACT_APP_SESSIONS_API_URL}/sessions/${liveshareId}`

                    // Use fetch with keepalive as a final attempt
                    fetch(deactivateUrl, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        keepalive: true,
                    }).catch(() => {
                        // Silently fail - the session will expire naturally via TTL
                    })

                    console.log("Final liveshare deactivation attempt")
                } catch (error) {
                    // Silently fail - the session will expire naturally via TTL
                    console.error("Error in final deactivation attempt:", error)
                }
            }
        }

        // Add event listeners
        window.addEventListener("beforeunload", handleBeforeUnload)
        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("unload", handleUnload)

        // Clean up
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            )
            window.removeEventListener("unload", handleUnload)
        }
    }, [isLiveshareActive, liveshareId])

    // Handle URL parameter for loading combat data from sessionStorage when opened from Campaign Manager
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session_id")

        if (sessionId) {
            // Try to load from sessionStorage first
            const storedData = sessionStorage.getItem(
                `combat_data_${sessionId}`,
            )
            if (storedData) {
                try {
                    const combatData = JSON.parse(storedData)
                    setCombatants(combatData.combatants || [])
                    setCurrentTurn(combatData.currentTurn || 0)
                    showAlert("Combat loaded from Campaign Manager!")
                } catch (error) {
                    console.error(
                        "Error parsing combat data from sessionStorage:",
                        error,
                    )
                }
            } else {
                // If not found in sessionStorage, session data will be loaded via the Liveshare functionality
            }
        }
    }, [])

    return (
        <>
            <Container
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                    color: (theme) =>
                        theme.palette.mode === "dark" ? "#e0e0e0" : "#121212",
                    padding: { xs: "10px", sm: "20px", md: 3 },
                    marginBottom: "100px",
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
                            backgroundColor: "rgba(76, 175, 80, 0.1)",
                            border: "3px dashed #4caf50",
                            borderRadius: "16px",
                            zIndex: 1000,
                            pointerEvents: "none",
                        },
                        "&::after": {
                            content:
                                '"Drop your combat file here (.combat.png or .json)"',
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            backgroundColor: "#4caf50",
                            color: "#ffffff",
                            padding: "16px 32px",
                            borderRadius: "12px",
                            fontSize: "18px",
                            fontWeight: "bold",
                            zIndex: 1001,
                            pointerEvents: "none",
                            boxShadow: "0 8px 24px rgba(76, 175, 80, 0.3)",
                        },
                    }),
                }}
            >
                <Box
                    sx={{
                        textAlign: "center",
                        marginBottom: 4,
                        marginTop: { xs: 2, sm: 4 },
                    }}
                >
                    <Typography
                        variant='h3'
                        component='h1'
                        gutterBottom
                        sx={{
                            fontWeight: "bold",
                            textShadow: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "none"
                                    : "0px 1px 2px rgba(0,0,0,0.1)",
                            fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                            marginBottom: 2,
                        }}
                    >
                        Initiative Tracker
                    </Typography>
                    <Typography
                        variant='h6'
                        sx={{
                            opacity: 0.8,
                            fontSize: { xs: "1rem", sm: "1.25rem" },
                            maxWidth: "600px",
                            margin: "0 auto",
                        }}
                    >
                        Track combat initiative with drag-and-drop support
                        following the official turn order
                    </Typography>
                </Box>

                <Box sx={{ padding: 2 }}>
                    {/* Combat management buttons */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 1.5,
                            marginBottom: 2,
                            flexWrap: "wrap",
                            justifyContent: "center",
                        }}
                    >
                        <Button
                            variant='outlined'
                            startIcon={<AddIcon />}
                            onClick={() => setAddDialogOpen(true)}
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
                            Add Combatant (Press + key)
                        </Button>

                        <Button
                            variant='outlined'
                            startIcon={<SaveIcon />}
                            onClick={saveCombatState}
                            disabled={combatants.length === 0}
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
                            Save Combat
                        </Button>

                        <Button
                            variant='outlined'
                            startIcon={<UploadIcon />}
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
                            Load Combat
                        </Button>

                        <Button
                            variant='outlined'
                            startIcon={
                                liveshareLoading ? (
                                    <CircularProgress
                                        size={20}
                                        color='inherit'
                                    />
                                ) : (
                                    <ShareIcon />
                                )
                            }
                            onClick={
                                isLiveshareActive
                                    ? () => setLiveshareDialogOpen(true)
                                    : () => setCreateShareDialogOpen(true)
                            }
                            disabled={
                                combatants.length === 0 || liveshareLoading
                            }
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
                            {liveshareLoading
                                ? "Creating..."
                                : isLiveshareActive
                                  ? "View Shared Link"
                                  : "Share Live"}
                        </Button>

                        {/* Stop Sharing button - only visible when liveshare is active */}
                        {isLiveshareActive && (
                            <Button
                                variant='outlined'
                                startIcon={<CloseIcon />}
                                onClick={handleStopSharing}
                                disabled={liveshareLoading}
                                sx={{
                                    bgcolor: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "rgba(255, 255, 255, 0.05)"
                                            : "rgba(0, 0, 0, 0.03)",
                                    border: (theme) =>
                                        theme.palette.mode === "dark"
                                            ? "1px solid rgba(255, 152, 0, 0.4)"
                                            : "1px solid rgba(255, 152, 0, 0.5)",
                                    color: "#ff9800",
                                    borderRadius: "12px",
                                    backdropFilter: "blur(10px)",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        bgcolor: "rgba(255, 152, 0, 0.1)",
                                        border: "1px solid rgba(255, 152, 0, 0.6)",
                                    },
                                }}
                            >
                                Stop Sharing
                            </Button>
                        )}

                        <Button
                            variant='outlined'
                            startIcon={<RefreshIcon />}
                            onClick={resetCombat}
                            disabled={combatants.length === 0}
                            sx={{
                                bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "rgba(255, 255, 255, 0.05)"
                                        : "rgba(0, 0, 0, 0.03)",
                                border: (theme) =>
                                    theme.palette.mode === "dark"
                                        ? "1px solid rgba(244, 67, 54, 0.4)"
                                        : "1px solid rgba(244, 67, 54, 0.5)",
                                color: "#f44336",
                                borderRadius: "12px",
                                backdropFilter: "blur(10px)",
                                transition: "all 0.3s ease",
                                "&:hover": {
                                    bgcolor: "rgba(244, 67, 54, 0.1)",
                                    border: "1px solid rgba(244, 67, 54, 0.6)",
                                },
                            }}
                        >
                            Reset Combat
                        </Button>
                    </Box>

                    {/* Hidden file input */}
                    <input
                        type='file'
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept='.combat.png,.png,.json'
                        style={{ display: "none" }}
                    />

                    {/* Initiative order display */}
                    <Paper sx={{ padding: 2, marginBottom: 2 }}>
                        <Typography variant='h6' gutterBottom>
                            Turn Order
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                            }}
                        >
                            <Chip label='1. Monsters' color='error' />
                            <Typography>→</Typography>
                            <Chip
                                label='2. NPCs'
                                sx={{
                                    backgroundColor: "#ff9800",
                                    color: "white",
                                }}
                            />
                            <Typography>→</Typography>
                            <Chip
                                label='3. Environment'
                                sx={{
                                    backgroundColor: "#9c27b0",
                                    color: "white",
                                }}
                            />
                            <Typography>→</Typography>
                            <Chip label='4. Players' color='success' />
                            <Typography>→</Typography>
                            <Chip label='Repeat' variant='outlined' />
                        </Box>
                    </Paper>

                    {/* Combat tracker carousel */}
                    {combatants.length > 0 && (
                        <Box sx={{ marginBottom: 3 }} ref={trackerRef}>
                            <Typography variant='h6' gutterBottom>
                                Initiative (Use arrows to re-order move
                                combatants within their type)
                            </Typography>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                            >
                                <Box
                                    sx={{
                                        position: "relative",
                                        height: "100vh",
                                        width: "100vw", // Increased width to allow for more spread
                                        marginLeft: "-50vw", // Adjusted to center the wider area
                                        left: "50%",
                                        border: "2px solid",
                                        borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#444"
                                                : "#ddd",
                                        borderRadius: 2,
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#1a1a1a"
                                                : "#f9f9f9",
                                        overflow: "visible", // Allow cards to extend beyond edges
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        perspective: "2000px", // Increased perspective for better 3D effect
                                    }}
                                >
                                    <SortableContext
                                        items={orderedCombatants.map(
                                            (c) => c.id,
                                        )}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {orderedCombatants.map(
                                            (combatant, index) => {
                                                const totalCombatants =
                                                    orderedCombatants.length
                                                const isActive =
                                                    index === currentTurn

                                                // Calculate relative position in the new linear layout
                                                let relativePosition =
                                                    index - currentTurn

                                                // Handle wrap-around for circular navigation
                                                if (
                                                    relativePosition <
                                                    -Math.floor(
                                                        totalCombatants / 2,
                                                    )
                                                ) {
                                                    relativePosition +=
                                                        totalCombatants
                                                } else if (
                                                    relativePosition >
                                                    Math.floor(
                                                        totalCombatants / 2,
                                                    )
                                                ) {
                                                    relativePosition -=
                                                        totalCombatants
                                                }

                                                // Calculate carousel positioning with increased radius for better spacing
                                                const angle =
                                                    (relativePosition /
                                                        totalCombatants) *
                                                    360
                                                // Increased radius calculation for more spread-out layout
                                                const baseRadius = Math.max(
                                                    350,
                                                    totalCombatants * 50,
                                                ) // Increased base radius and multiplier
                                                const maxRadius = Math.min(
                                                    600,
                                                    totalCombatants * 120,
                                                ) // Allow much larger radius
                                                const radius = Math.min(
                                                    maxRadius,
                                                    baseRadius,
                                                )
                                                const x =
                                                    Math.sin(
                                                        (angle * Math.PI) / 180,
                                                    ) * radius
                                                const z =
                                                    Math.cos(
                                                        (angle * Math.PI) / 180,
                                                    ) * radius

                                                // Scale and opacity based on position - adjusted for wider spacing
                                                const scale = Math.max(
                                                    0.5, // Increased minimum scale
                                                    1 -
                                                        Math.abs(
                                                            relativePosition,
                                                        ) *
                                                            0.08, // Reduced scale reduction rate
                                                )

                                                // Set z-index based on position
                                                const zIndex = isActive
                                                    ? 100
                                                    : 50 -
                                                      Math.abs(relativePosition)

                                                return (
                                                    <Box
                                                        key={combatant.id}
                                                        sx={{
                                                            position:
                                                                "absolute",
                                                            transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
                                                            transformStyle:
                                                                "preserve-3d",
                                                            transition:
                                                                "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)", // Slightly longer transition for smoother movement
                                                            zIndex: zIndex,
                                                            pointerEvents:
                                                                isActive
                                                                    ? "auto"
                                                                    : "none",
                                                            // Make sure form elements use appropriate cursors
                                                            "& .MuiIconButton-root":
                                                                {
                                                                    cursor: "pointer",
                                                                },
                                                            "& .MuiTextField-root, & input, & textarea":
                                                                {
                                                                    cursor: "text",
                                                                    pointerEvents:
                                                                        "auto",
                                                                },
                                                            "& .MuiCheckbox-root, & button":
                                                                {
                                                                    cursor: "pointer",
                                                                    pointerEvents:
                                                                        "auto",
                                                                },
                                                        }}
                                                    >
                                                        <CombatantCard
                                                            combatant={
                                                                combatant
                                                            }
                                                            onUpdate={
                                                                updateCombatant
                                                            }
                                                            onDelete={
                                                                deleteCombatant
                                                            }
                                                            isActive={isActive}
                                                            combatantCount={
                                                                totalCombatants
                                                            }
                                                            onMoveUp={() =>
                                                                moveCombatantUp(
                                                                    combatant.id,
                                                                )
                                                            }
                                                            onMoveDown={() =>
                                                                moveCombatantDown(
                                                                    combatant.id,
                                                                )
                                                            }
                                                        />
                                                    </Box>
                                                )
                                            },
                                        )}
                                    </SortableContext>

                                    {/* Navigation dots */}
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: 20,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            display: "flex",
                                            gap: 1,
                                            zIndex: 200,
                                        }}
                                    >
                                        {orderedCombatants.map(
                                            (combatant, index) => (
                                                <Box
                                                    key={`dot-${combatant.id}`}
                                                    onClick={() =>
                                                        setCurrentTurn(index)
                                                    }
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: "50%",
                                                        backgroundColor:
                                                            index ===
                                                            currentTurn
                                                                ? "#4caf50"
                                                                : "rgba(255,255,255,0.3)",
                                                        cursor: "pointer",
                                                        transition:
                                                            "all 0.3s ease",
                                                        border: `2px solid ${(() => {
                                                            switch (
                                                                combatant.type
                                                            ) {
                                                                case "Monster":
                                                                    return "#f44336"
                                                                case "Player Character":
                                                                    return "#4caf50"
                                                                case "NPC":
                                                                    return "#ff9800"
                                                                case "Environment":
                                                                    return "#9c27b0"
                                                                default:
                                                                    return "#757575"
                                                            }
                                                        })()}`,
                                                        "&:hover": {
                                                            transform:
                                                                "scale(1.2)",
                                                        },
                                                    }}
                                                />
                                            ),
                                        )}
                                    </Box>

                                    {/* Turn indicator */}
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 20,
                                            left: "50%",
                                            transform: "translateX(-50%)",
                                            backgroundColor: "rgba(0,0,0,0.7)",
                                            color: "white",
                                            padding: "8px 16px",
                                            borderRadius: 2,
                                            zIndex: 200,
                                        }}
                                    >
                                        <Typography
                                            variant='body1'
                                            fontWeight='bold'
                                        >
                                            Current Turn:{" "}
                                            {orderedCombatants[currentTurn]
                                                ?.name || "No one"}
                                        </Typography>
                                    </Box>

                                    {/* Navigation arrows */}
                                    <IconButton
                                        onClick={() => {
                                            if (orderedCombatants.length === 0)
                                                return

                                            // Helper function to find next non-spacer card (DANGER cards are OK)
                                            const findNextNonSpacerIndex = (
                                                startIndex,
                                                direction,
                                            ) => {
                                                let nextIndex = startIndex
                                                const length =
                                                    orderedCombatants.length
                                                let attempts = 0
                                                const maxAttempts = length

                                                do {
                                                    if (direction === "left") {
                                                        nextIndex =
                                                            nextIndex === 0
                                                                ? length - 1
                                                                : nextIndex - 1
                                                    } else {
                                                        nextIndex =
                                                            nextIndex ===
                                                            length - 1
                                                                ? 0
                                                                : nextIndex + 1
                                                    }

                                                    attempts++

                                                    if (
                                                        attempts >= maxAttempts
                                                    ) {
                                                        return startIndex
                                                    }
                                                } while (
                                                    orderedCombatants[nextIndex]
                                                        ?.isSpacerCard
                                                )

                                                return nextIndex
                                            }

                                            const prevIndex =
                                                findNextNonSpacerIndex(
                                                    currentTurn,
                                                    "left",
                                                )
                                            setCurrentTurn(prevIndex)
                                        }}
                                        disabled={
                                            orderedCombatants.length === 0
                                        }
                                        sx={{
                                            position: "absolute",
                                            left: 20,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            backgroundColor: "rgba(0,0,0,0.5)",
                                            color: "white",
                                            zIndex: 200,
                                            "&:hover": {
                                                backgroundColor:
                                                    "rgba(0,0,0,0.7)",
                                            },
                                            "&:disabled": {
                                                backgroundColor:
                                                    "rgba(0,0,0,0.2)",
                                                color: "rgba(255,255,255,0.3)",
                                            },
                                        }}
                                    >
                                        <ArrowBackIcon />
                                    </IconButton>

                                    <IconButton
                                        onClick={() => {
                                            if (orderedCombatants.length === 0)
                                                return

                                            // Helper function to find next non-spacer card (DANGER cards are OK)
                                            const findNextNonSpacerIndex = (
                                                startIndex,
                                                direction,
                                            ) => {
                                                let nextIndex = startIndex
                                                const length =
                                                    orderedCombatants.length
                                                let attempts = 0
                                                const maxAttempts = length

                                                do {
                                                    if (direction === "left") {
                                                        nextIndex =
                                                            nextIndex === 0
                                                                ? length - 1
                                                                : nextIndex - 1
                                                    } else {
                                                        nextIndex =
                                                            nextIndex ===
                                                            length - 1
                                                                ? 0
                                                                : nextIndex + 1
                                                    }

                                                    attempts++

                                                    if (
                                                        attempts >= maxAttempts
                                                    ) {
                                                        return startIndex
                                                    }
                                                } while (
                                                    orderedCombatants[nextIndex]
                                                        ?.isSpacerCard
                                                )

                                                return nextIndex
                                            }

                                            const nextIndex =
                                                findNextNonSpacerIndex(
                                                    currentTurn,
                                                    "right",
                                                )
                                            setCurrentTurn(nextIndex)
                                        }}
                                        disabled={
                                            orderedCombatants.length === 0
                                        }
                                        sx={{
                                            position: "absolute",
                                            right: 20,
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            backgroundColor: "rgba(0,0,0,0.5)",
                                            color: "white",
                                            zIndex: 200,
                                            "&:hover": {
                                                backgroundColor:
                                                    "rgba(0,0,0,0.7)",
                                            },
                                            "&:disabled": {
                                                backgroundColor:
                                                    "rgba(0,0,0,0.2)",
                                                color: "rgba(255,255,255,0.3)",
                                            },
                                        }}
                                    >
                                        <ArrowForwardIcon />
                                    </IconButton>
                                </Box>
                            </DndContext>
                        </Box>
                    )}

                    {/* Add combatant dialog */}
                    <Dialog
                        open={addDialogOpen}
                        onClose={() => setAddDialogOpen(false)}
                    >
                        <DialogTitle
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            Add New Combatant
                            <IconButton
                                onClick={() => setAddDialogOpen(false)}
                                sx={{ color: "grey.500" }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <TextField
                                margin='dense'
                                label='Name'
                                fullWidth
                                variant='outlined'
                                value={newCombatant.name}
                                onChange={(e) =>
                                    setNewCombatant((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                        addCombatant()
                                    }
                                }}
                                sx={{ marginBottom: 2 }}
                                inputRef={(input) => {
                                    // Delay focus to avoid capturing the "+" keypress
                                    if (input && addDialogOpen) {
                                        setTimeout(() => {
                                            input.focus()
                                        }, 100)
                                    }
                                }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={newCombatant.type}
                                    label='Type'
                                    onChange={(e) =>
                                        setNewCombatant((prev) => ({
                                            ...prev,
                                            type: e.target.value,
                                        }))
                                    }
                                >
                                    <MenuItem value='Player Character'>
                                        Player Character
                                    </MenuItem>
                                    <MenuItem value='NPC'>NPC</MenuItem>
                                    <MenuItem value='Monster'>Monster</MenuItem>
                                    <MenuItem value='Environment'>
                                        Environment
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAddDialogOpen(false)}>
                                Close
                            </Button>
                            <Button onClick={addCombatant} variant='contained'>
                                Add & Continue
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Create Liveshare Configuration Dialog */}
                    <Dialog
                        open={createShareDialogOpen}
                        onClose={() => setCreateShareDialogOpen(false)}
                    >
                        <DialogTitle
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            Configure Live Sharing
                            <IconButton
                                onClick={() => setCreateShareDialogOpen(false)}
                                sx={{ color: "grey.500" }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <Typography
                                variant='body1'
                                gutterBottom
                                sx={{ mt: 1 }}
                            >
                                Set sharing options before creating your live
                                session:
                            </Typography>

                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id='expiration-select-label'>
                                    Session Expiration
                                </InputLabel>
                                <Select
                                    labelId='expiration-select-label'
                                    value={expirationTime}
                                    label='Session Expiration'
                                    onChange={(e) =>
                                        setExpirationTime(e.target.value)
                                    }
                                >
                                    <MenuItem value={60}>1 hour</MenuItem>
                                    <MenuItem value={120}>2 hours</MenuItem>
                                    <MenuItem value={180}>3 hours</MenuItem>
                                    <MenuItem value={240}>4 hours</MenuItem>
                                </Select>
                            </FormControl>

                            <Typography
                                variant='body2'
                                sx={{ mt: 2, color: "text.secondary" }}
                            >
                                • Creating a session will generate a link others
                                can use to view your combat
                                <br />
                                • You can stop sharing manually at any time
                                <br />• The session will automatically expire
                                after the selected time
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => setCreateShareDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    setCreateShareDialogOpen(false)
                                    createLiveshare()
                                }}
                                variant='contained'
                                color='primary'
                                disabled={liveshareLoading}
                                startIcon={
                                    liveshareLoading ? (
                                        <CircularProgress
                                            size={20}
                                            color='inherit'
                                        />
                                    ) : null
                                }
                            >
                                Create Share Link
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Liveshare Dialog */}
                    <Dialog
                        open={liveshareDialogOpen}
                        onClose={() => setLiveshareDialogOpen(false)}
                    >
                        <DialogTitle
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            Share Initiative Tracker
                            <IconButton
                                onClick={() => setLiveshareDialogOpen(false)}
                                sx={{ color: "grey.500" }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent>
                            <Typography variant='body1' gutterBottom>
                                Share this link for others to view your combat
                                in real-time:
                            </Typography>

                            <TextField
                                fullWidth
                                variant='outlined'
                                value={liveshareLink}
                                margin='dense'
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position='end'>
                                            <Tooltip title='Copy to clipboard'>
                                                <IconButton
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(
                                                            liveshareLink,
                                                        )
                                                        showAlert(
                                                            "Link copied to clipboard!",
                                                            "success",
                                                        )
                                                    }}
                                                    edge='end'
                                                >
                                                    <CopyIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Typography
                                variant='body2'
                                sx={{ mt: 2, color: "text.secondary" }}
                            >
                                • Any changes you make will be visible to
                                viewers in real-time
                                <br />
                                • Viewers cannot make changes to your combat
                                tracker
                                <br />
                                {expirationTime > 0
                                    ? `• The link will expire automatically in ${expirationTime} minutes`
                                    : "• The link will remain active until you stop sharing manually"}
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() =>
                                    window.open(liveshareLink, "_blank")
                                }
                                variant='contained'
                                color='primary'
                            >
                                Open in new tab
                            </Button>
                            <Button
                                onClick={deactivateSession}
                                color='error'
                                disabled={liveshareLoading}
                                startIcon={
                                    liveshareLoading ? (
                                        <CircularProgress
                                            size={20}
                                            color='inherit'
                                        />
                                    ) : (
                                        <CloseIcon />
                                    )
                                }
                            >
                                {liveshareLoading
                                    ? "Stopping..."
                                    : "Stop Sharing"}
                            </Button>
                            <Button
                                onClick={() => setLiveshareDialogOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </Dialog>
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

            <HomeButton />
        </>
    )
}

export default InitiativeTrackerPage
