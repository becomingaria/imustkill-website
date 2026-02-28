import React, { useEffect, useState, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "./BackButton.css"

function BackButton() {
    const navigate = useNavigate()
    const location = useLocation()
    const [opacity, setOpacity] = useState(0.5)
    const [isVisible, setIsVisible] = useState(false)

    // Check if the screen width is greater than 1100px and not on the homepage
    const checkVisibility = useCallback(() => {
        const isDesktop = window.innerWidth > 1100
        const isNotHomePage = location.pathname !== "/"
        const isNotAdminPage = !location.pathname.startsWith("/admin")
        setIsVisible(isDesktop && isNotHomePage && isNotAdminPage)
    }, [location.pathname])

    // Adjust opacity based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY
            const maxScroll = window.innerHeight
            const newOpacity = Math.max(
                0.2,
                0.5 - (scrollTop / maxScroll) * 0.3,
            )
            setOpacity(newOpacity)
        }

        const handleResize = () => checkVisibility()

        window.addEventListener("scroll", handleScroll)
        window.addEventListener("resize", handleResize)
        checkVisibility()

        return () => {
            window.removeEventListener("scroll", handleScroll)
            window.removeEventListener("resize", handleResize)
        }
    }, [location, checkVisibility])

    if (!isVisible) return null

    return (
        <button
            className='back-button'
            style={{
                opacity,
                color: document.body.classList.contains("light-theme")
                    ? "#121212"
                    : "lightgrey",
                textShadow: document.body.classList.contains("light-theme")
                    ? "0px 1px 1px rgba(0,0,0,0.2)"
                    : "none",
            }}
            onClick={() => navigate("/")}
            disabled={!isVisible} // Disable the button if not visible
        >
            ← Return Home
        </button>
    )
}

export default BackButton
