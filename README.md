# I Must Kill - Game Reference Website

This website serves as a digital reference for the "I Must Kill" tabletop role-playing game, providing players and Game Masters (GMs) with easy access to game rules, mechanics, and resources.

## About I Must Kill

"I Must Kill" is a dark fantasy tabletop role-playing game where players take on the role of Hunters tasked with tracking down and eliminating supernatural threats in a world shrouded in mystery. The game features:

-   **Simple but deadly combat mechanics** where every decision matters
-   **Stat-based character creation** focusing on Body, Agility, Focus, and Fate
-   **Equipment and power decks** that provide players with tools and abilities
-   **Monster hunting adventures** that test players' skills and strategy
-   **Insight mechanics** where greater perception reveals the true nature of threats

## Website Features

This website includes comprehensive references for:

-   **Character Creation** - Guide to creating your Hunter
-   **Character Sheet** - Digital reference sheet for your character
-   **Equipment Deck** - Browse and randomly generate equipment for your character
-   **Initiative Tracker** - Track combat initiative with real-time sharing capability (Liveshare)
-   **Combat Mechanics** - Rules for attacks, dodges, bracing, and more
-   **Death and Resting** - How recovery and death work in the game
-   **Progression** - Character advancement rules
-   **Casting** - Magic system rules and mechanics
-   **Powers** - Searchable database of powers by name, deck, and rarity
-   **Running the Game** - Resources for Game Masters
-   **Monsters** - Bestiary with detailed monster information (GM access only)

## Liveshare Feature

The Initiative Tracker includes a Liveshare feature that allows Game Masters to create a real-time view-only link to share with players:

-   **Real-time Updates**: All changes made by the GM are instantly visible to viewers via WebSocket
-   **View-Only Access**: Shared links provide read-only access to prevent unwanted changes
-   **Expiration Controls**: Set automatic expiration times for shared links (30 minutes to 8 hours)
-   **Manual Controls**: Stop sharing at any time with a single click
-   **Easily Sharable**: Copy links to clipboard or open in a new tab directly from the interface
-   **Auto-Cleanup**: Sessions automatically expire via DynamoDB TTL - no database maintenance required

The Liveshare feature is powered by AWS (DynamoDB, Lambda, API Gateway). For infrastructure setup, see [infrastructure/README.md](./infrastructure/README.md).

## Getting Started with Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Game Mechanics Overview

### Core Game Concepts

1. **Stats System**:

    - **Body** - Strength, endurance, and physical prowess (lift, push, climb, drag, grapple, jump, swim)
    - **Agility** - Dexterity and nimbleness (catch, squeeze, pick locks, escape manacles)
    - **Focus** - Mental acuity and perception (perceive, listen, conjure magic, track prey, control will, resist enchantment)
    - **Fate** - Luck and life force (determines hit points)

2. **Combat System**:

    - Players choose one of several actions each turn: Attack, Dodge, Brace, gather a Power, Flee, or Negotiate
    - Roll 1d10 against your relevant stat; if the roll is lower, your action succeeds
    - Combat is deadly and strategic, with minimal hit points

3. **Magic System**:

    - Hunters can gather and cast powers through testing Focus
    - Powers are organized in decks and by rarity
    - Players can hold up to 3 powers at a time

4. **Equipment**:

    - Hunters begin with 10 random items
    - Equipment provides tactical advantages in combat

5. **Monsters**:
    - Creatures with unique abilities and weaknesses
    - Monsters require specific Insight levels to be perceived properly
    - Each creature has a full stat block and special abilities

### The Hunt Structure

1. **The Hook** - Introduction to the scenario
2. **Negotiate Pay** - Determine compensation
3. **The Rumor Phase** - Gather information about the monster
4. **The Research Phase** - Learn more details and possibly discover a weakness
5. **Prepare** - Gather necessary equipment
6. **Tracking the Monster** - Find or be ambushed by the creature
7. **The Fight** - Battle the monster
8. **Denouement** - Collect bounty, replenish equipment, rest, and level up

## Technical Implementation

### Technologies Used

-   **React** - Frontend library for building the user interface
-   **Material UI** - Component library for consistent design
-   **React Router** - Navigation between different sections of the game
-   **Local Storage** - Saving user preferences and selections

### Data Architecture

-   Game data (monsters, powers, equipment) stored in JSON format
-   Responsive design for mobile and desktop access
-   Dark/light theme toggle for accessibility

### Key Components

-   **Search & Filter System** for powers and equipment
-   **Interactive Character Sheet**
-   **Downloadable Game Resources**
-   **Random Equipment Generator**

## Contributing

Contributions to improve the website are welcome. Please feel free to submit issues or pull requests.

## License

© 2024 I Must Kill. All rights reserved.

---

### Additional Development Information

#### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.
