import React from "react"
import { Routes, Route, Outlet } from "react-router-dom"
import { Box } from "@mui/material"
import HomePage from "./pages/HomePage.js"
import About from "./pages/About.js"
import GettingStarted from "./pages/GettingStarted.js"
import RulesPage from "./pages/RulesPage.js"
import Equipment from "./pages/Equipment.js"
import PowerCards from "./pages/PowerCards.js"
import Monsters from "./pages/Monsters.js"
import MonsterDetail from "./components/MonsterDetail.js"
import DarkwatchGame from "./pages/DarkwatchGame.js"
import QuickReference from "./pages/QuickReference.js"
import SourceRegistry from "./components/RulesSearch/SourceRegistry.js"
import RuleCategorizer from "./components/RulesSearch/RuleCategorizer.js"
import DigitalTools from "./pages/DigitalTools.js"
import GMTools from "./pages/GMTools.js"
import DigitalCharacterSheet from "./pages/DigitalCharacterSheet.js"
import DeckBuilder from "./pages/DeckBuilder.js"
import InitiativeTracker from "./pages/InitiativeTrackerPage.js"
import CampaignManager from "./pages/CampaignManager.js"
import LiveGameView from "./pages/LiveGameView.js"
import Admin from "./pages/Admin.js"
import StyleGuide from "./pages/StyleGuide.js"
import EquipmentBrowser from "./pages/EquipmentBrowser.js"
import Sparks from "./components/Sparks/Sparks.jsx"
import BackButton from "./components/BackButton/BackButton.js"
import ThemeToggle from "./components/ThemeToggle/ThemeToggle.js"

function App() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                color: "text.primary",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <Sparks />
            <BackButton />
            <ThemeToggle />
            <Routes>
                <Route path='/' element={<Outlet />}>
                    <Route path='about' element={<About />} />
                    <Route
                        path='getting-started'
                        element={<GettingStarted />}
                    />
                    <Route
                        path='character-creation'
                        element={<RulesPage categoryKey='character-creation' />}
                    />
                    <Route path='equipment' element={<Equipment />} />
                    <Route
                        path='combat-mechanics'
                        element={<RulesPage categoryKey='combat-mechanics' />}
                    />
                    <Route
                        path='death-and-resting'
                        element={<RulesPage categoryKey='death-and-resting' />}
                    />
                    <Route
                        path='powers'
                        element={<RulesPage categoryKey='spellcasting' />}
                    />
                    <Route path='power-cards' element={<PowerCards />} />
                    <Route
                        path='progression'
                        element={<RulesPage categoryKey='progression' />}
                    />
                    <Route
                        path='running-the-game'
                        element={<RulesPage categoryKey='running-the-game' />}
                    />
                    <Route path='monsters' element={<Monsters />} />
                    <Route path='monsters/:name' element={<MonsterDetail />} />
                    <Route path='darkwatch' element={<DarkwatchGame />} />
                    <Route
                        path='quick-reference'
                        element={<QuickReference />}
                    />
                    <Route
                        path='source-registry'
                        element={<SourceRegistry />}
                    />
                    <Route
                        path='rule-categorizer'
                        element={<RuleCategorizer />}
                    />
                    <Route path='player-tools' element={<DigitalTools />} />
                    <Route path='gm-tools' element={<GMTools />} />
                    <Route
                        path='initiative-tracker'
                        element={<InitiativeTracker />}
                    />
                    <Route
                        path='campaign-manager'
                        element={<CampaignManager />}
                    />
                    <Route
                        path='live-game/:sessionId'
                        element={<LiveGameView />}
                    />
                    <Route
                        path='digital-character-sheet'
                        element={<DigitalCharacterSheet />}
                    />
                    <Route path='deck-builder' element={<DeckBuilder />} />
                    <Route
                        path='equipment-browser'
                        element={<EquipmentBrowser />}
                    />
                    <Route path='deck/:deckName' element={<DeckBuilder />} />
                    <Route path='style-guide' element={<StyleGuide />} />
                    <Route path='admin' element={<Admin />} />
                    <Route path='admin/:deckName' element={<Admin />} />
                    <Route path='/' element={<HomePage />} />
                </Route>
            </Routes>
        </Box>
    )
}

export default App
