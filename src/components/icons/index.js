// Custom SVG Icon Library for I Must Kill
// These icons are designed to match the dark fantasy aesthetic of the game

import React from "react"

// Common wrapper for consistent styling
const IconWrapper = ({
    children,
    size = 48,
    color = "currentColor",
    ...props
}) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 64 64'
        width={size}
        height={size}
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        {...props}
    >
        {children}
    </svg>
)

// ⚔️ Crossed Swords - "Hunt. Fight. Survive."
export const CrossedSwordsIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Left sword blade */}
        <path d='M12 52L42 12' strokeWidth='3' />
        {/* Left sword hilt */}
        <path d='M8 48L16 56' strokeWidth='2' />
        <path d='M6 44L10 48' strokeWidth='2' />
        <line x1='14' y1='40' x2='24' y2='50' strokeWidth='2' />

        {/* Right sword blade */}
        <path d='M52 52L22 12' strokeWidth='3' />
        {/* Right sword hilt */}
        <path d='M48 56L56 48' strokeWidth='2' />
        <path d='M54 44L58 48' strokeWidth='2' />
        <line x1='40' y1='50' x2='50' y2='40' strokeWidth='2' />

        {/* Sword tips detail */}
        <circle cx='42' cy='12' r='2' fill='currentColor' />
        <circle cx='22' cy='12' r='2' fill='currentColor' />
    </IconWrapper>
)

// 🌑 Dark Moon - "A World of Darkness"
export const DarkMoonIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Outer moon circle */}
        <circle cx='32' cy='32' r='22' strokeWidth='2' />
        {/* Inner shadow crescent */}
        <path
            d='M38 14C28 18 24 28 24 32C24 40 30 48 38 50C30 52 20 46 16 36C12 24 20 12 32 10C35 10 37 12 38 14Z'
            fill='currentColor'
            fillOpacity='0.3'
            strokeWidth='0'
        />
        {/* Crater details */}
        <circle cx='26' cy='28' r='3' strokeWidth='1.5' opacity='0.6' />
        <circle cx='38' cy='38' r='4' strokeWidth='1.5' opacity='0.6' />
        <circle cx='30' cy='42' r='2' strokeWidth='1.5' opacity='0.6' />
        {/* Stars around */}
        <circle cx='8' cy='12' r='1' fill='currentColor' />
        <circle cx='56' cy='18' r='1' fill='currentColor' />
        <circle cx='52' cy='52' r='1' fill='currentColor' />
        <circle cx='10' cy='48' r='1' fill='currentColor' />
    </IconWrapper>
)

// 📜 Scroll - "Prepare for the Hunt"
export const ScrollIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Main scroll body */}
        <path d='M16 12L16 52L48 52L48 12' strokeWidth='2' />
        {/* Top roll */}
        <ellipse cx='32' cy='12' rx='16' ry='4' strokeWidth='2' />
        <path d='M16 12C16 14 20 16 24 16' strokeWidth='1.5' />
        {/* Bottom roll */}
        <ellipse cx='32' cy='52' rx='16' ry='4' strokeWidth='2' />
        <path d='M48 52C48 54 44 56 40 56' strokeWidth='1.5' />
        {/* Text lines */}
        <line x1='22' y1='24' x2='42' y2='24' strokeWidth='1.5' opacity='0.7' />
        <line x1='22' y1='30' x2='38' y2='30' strokeWidth='1.5' opacity='0.7' />
        <line x1='22' y1='36' x2='40' y2='36' strokeWidth='1.5' opacity='0.7' />
        <line x1='22' y1='42' x2='34' y2='42' strokeWidth='1.5' opacity='0.7' />
        {/* Decorative seal */}
        <circle
            cx='44'
            cy='44'
            r='4'
            fill='currentColor'
            fillOpacity='0.3'
            strokeWidth='1.5'
        />
    </IconWrapper>
)

// 🎯 Target/Crosshair - "Fast, Tactical Combat"
export const TargetIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Outer ring */}
        <circle cx='32' cy='32' r='24' strokeWidth='2' />
        {/* Middle ring */}
        <circle cx='32' cy='32' r='16' strokeWidth='2' />
        {/* Inner ring */}
        <circle cx='32' cy='32' r='8' strokeWidth='2' />
        {/* Center dot */}
        <circle cx='32' cy='32' r='3' fill='currentColor' />
        {/* Crosshair lines */}
        <line x1='32' y1='4' x2='32' y2='16' strokeWidth='2' />
        <line x1='32' y1='48' x2='32' y2='60' strokeWidth='2' />
        <line x1='4' y1='32' x2='16' y2='32' strokeWidth='2' />
        <line x1='48' y1='32' x2='60' y2='32' strokeWidth='2' />
        {/* Arrow indicator */}
        <path d='M32 4L28 10L32 8L36 10Z' fill='currentColor' strokeWidth='0' />
    </IconWrapper>
)

// 💀 Skull - "Grow Stronger"
export const SkullIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Skull outline */}
        <path
            d='M32 8C18 8 10 20 10 32C10 40 14 46 20 50L20 56L26 56L28 52L36 52L38 56L44 56L44 50C50 46 54 40 54 32C54 20 46 8 32 8Z'
            strokeWidth='2'
        />
        {/* Left eye socket */}
        <ellipse cx='24' cy='30' rx='6' ry='7' strokeWidth='2' />
        <circle cx='24' cy='31' r='2' fill='currentColor' />
        {/* Right eye socket */}
        <ellipse cx='40' cy='30' rx='6' ry='7' strokeWidth='2' />
        <circle cx='40' cy='31' r='2' fill='currentColor' />
        {/* Nose */}
        <path d='M32 36L29 44L35 44Z' strokeWidth='1.5' />
        {/* Teeth */}
        <line x1='26' y1='52' x2='26' y2='56' strokeWidth='1.5' />
        <line x1='32' y1='52' x2='32' y2='56' strokeWidth='1.5' />
        <line x1='38' y1='52' x2='38' y2='56' strokeWidth='1.5' />
        {/* Jaw line */}
        <path d='M20 50C24 48 40 48 44 50' strokeWidth='1.5' />
    </IconWrapper>
)

// 📖 Open Book - "Your Story Awaits"
export const OpenBookIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Book spine */}
        <line x1='32' y1='12' x2='32' y2='54' strokeWidth='2' />
        {/* Left page */}
        <path
            d='M32 12C28 10 20 8 10 10L10 50C20 48 28 50 32 54'
            strokeWidth='2'
        />
        {/* Right page */}
        <path
            d='M32 12C36 10 44 8 54 10L54 50C44 48 36 50 32 54'
            strokeWidth='2'
        />
        {/* Left page text lines */}
        <line x1='14' y1='18' x2='28' y2='20' strokeWidth='1.5' opacity='0.6' />
        <line x1='14' y1='24' x2='28' y2='26' strokeWidth='1.5' opacity='0.6' />
        <line x1='14' y1='30' x2='26' y2='32' strokeWidth='1.5' opacity='0.6' />
        <line x1='14' y1='36' x2='28' y2='38' strokeWidth='1.5' opacity='0.6' />
        {/* Right page text lines */}
        <line x1='36' y1='20' x2='50' y2='18' strokeWidth='1.5' opacity='0.6' />
        <line x1='36' y1='26' x2='50' y2='24' strokeWidth='1.5' opacity='0.6' />
        <line x1='38' y1='32' x2='50' y2='30' strokeWidth='1.5' opacity='0.6' />
        <line x1='36' y1='38' x2='50' y2='36' strokeWidth='1.5' opacity='0.6' />
        {/* Decorative bookmark */}
        <path d='M32 12L32 4L36 8L32 12' fill='currentColor' strokeWidth='0' />
    </IconWrapper>
)

// ↓ Chevron Down - Scroll indicator
export const ChevronDownIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        <path d='M16 24L32 44L48 24' strokeWidth='3' />
        <path d='M20 16L32 32L44 16' strokeWidth='2' opacity='0.5' />
    </IconWrapper>
)

// Additional utility icons that may be useful

// Monster Claw - Generic monster/creature indicator
export const MonsterClawIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        <path d='M12 56L20 32L16 28L24 8' strokeWidth='2.5' />
        <path d='M24 56L28 36L24 32L32 12' strokeWidth='2.5' />
        <path d='M36 56L36 38L32 34L40 14' strokeWidth='2.5' />
        <path d='M48 56L44 40L40 36L48 18' strokeWidth='2.5' />
        {/* Claw tips */}
        <circle cx='24' cy='8' r='2' fill='currentColor' />
        <circle cx='32' cy='12' r='2' fill='currentColor' />
        <circle cx='40' cy='14' r='2' fill='currentColor' />
        <circle cx='48' cy='18' r='2' fill='currentColor' />
    </IconWrapper>
)

// Shield with damage - Defense/survival
export const BatteredShieldIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Shield outline */}
        <path
            d='M32 8L10 16L10 32C10 44 20 54 32 58C44 54 54 44 54 32L54 16Z'
            strokeWidth='2'
        />
        {/* Damage marks */}
        <line x1='18' y1='22' x2='24' y2='28' strokeWidth='1.5' />
        <line x1='42' y1='36' x2='48' y2='42' strokeWidth='1.5' />
        <line x1='20' y1='40' x2='26' y2='44' strokeWidth='1.5' />
        {/* Center emblem */}
        <circle cx='32' cy='32' r='8' strokeWidth='2' />
        <circle cx='32' cy='32' r='3' fill='currentColor' />
    </IconWrapper>
)

// Potion bottle - Crafting/preparation
export const PotionIcon = ({ size, color, ...props }) => (
    <IconWrapper size={size} color={color} {...props}>
        {/* Bottle neck */}
        <rect x='26' y='8' width='12' height='10' strokeWidth='2' />
        {/* Cork */}
        <rect
            x='28'
            y='4'
            width='8'
            height='6'
            strokeWidth='1.5'
            fill='currentColor'
            fillOpacity='0.3'
        />
        {/* Bottle body */}
        <path
            d='M26 18L18 28L18 50C18 54 22 58 32 58C42 58 46 54 46 50L46 28L38 18'
            strokeWidth='2'
        />
        {/* Liquid level */}
        <path
            d='M20 36L44 36L44 50C44 52 40 56 32 56C24 56 20 52 20 50Z'
            fill='currentColor'
            fillOpacity='0.2'
            strokeWidth='0'
        />
        {/* Bubbles */}
        <circle cx='28' cy='44' r='2' strokeWidth='1' />
        <circle cx='36' cy='48' r='1.5' strokeWidth='1' />
        <circle cx='32' cy='40' r='1' fill='currentColor' />
    </IconWrapper>
)

const Icons = {
    CrossedSwordsIcon,
    DarkMoonIcon,
    ScrollIcon,
    TargetIcon,
    SkullIcon,
    OpenBookIcon,
    ChevronDownIcon,
    MonsterClawIcon,
    BatteredShieldIcon,
    PotionIcon,
}

export default Icons
