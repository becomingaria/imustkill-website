# KeywordLinker Component

The KeywordLinker component automatically detects and links game-related keywords and phrases in text content, providing users with quick access to rule definitions and navigation to full rule pages.

## How to Use

Simply wrap any text content with the KeywordLinker component:

```jsx
import KeywordLinker from "../components/RulesSearch/KeywordLinker"

// Basic usage
<KeywordLinker>
    When you attack, roll 1d10 against your Attack Stat.
    If your Insight is too low, the monster takes -1 damage.
</KeywordLinker>

// With Typography components
<Typography paragraph>
    <KeywordLinker>
        You can use Grit Teeth once per Night's Rest to regain 1 hit point.
        This requires Focus to gather a power from your power deck.
    </KeywordLinker>
</Typography>

// Disable linking for specific content
<KeywordLinker disabled={true}>
    This text won't have any keyword linking.
</KeywordLinker>
```

## Supported Keywords

The component automatically recognizes and links the following types of keywords:

### Core Stats

-   **Body**, **Agility**, **Focus**, **Fate** - Links to Character Creation stats section
-   **Insight** - Links to Progression section
-   **Attack Stat**, **Hit Points** - Links to Character Creation

### Combat Actions

-   **Attack**, **Dodge**, **Brace** - Links to Combat Mechanics sections
-   **Draw a Power**, **Flee**, **Negotiate** - Links to Combat Mechanics
-   **Crit**, **Crit Fail** - Links to combat rules

### Damage Types

-   **Physical Damage**, **Spiritual Damage**, **Hybrid Damage** - Links to Combat Mechanics
-   **Incorporeal**, **Corporeal**, **Undead**, **Demons** - Links to damage type sections

### Equipment & Weapons

-   **Weapons**, **Two-weapons**, **Polearms**, **Ranged Weapons** - Links to Weapons section
-   **Shield**, **Armor**, **No Armor** - Links to equipment sections
-   **Silver Weapons**, **Enchanted Weapons**, **Alchemical Compounds** - Links to Hybrid Damage

### Status Effects

-   **Frightened**, **Unconscious** - Links to Combat Mechanics statuses

### Recovery & Death

-   **Grit Teeth**, **Night's Rest**, **Death** - Links to Death and Resting sections

### Character Progression

-   **Leveling Up**, **Ascendant** - Links to Progression sections

### Casting

-   **Casting**, **Drawing Powers**, **Using Powers**, **Power Deck** - Links to Casting sections

### Game Master Content

-   **Hidden Creatures**, **Monster Tables**, **Hunt Outline** - Links to Running the Game
-   **Rumor Phase**, **Research Phase** - Links to game structure sections

### Character Creation

-   **Stat Arrays**, **Rolling Stats**, **Random Start**, **Fixed Start** - Links to Character Creation

### Spiritual/Religious Terms

-   **Prayers**, **Holy Water**, **Consecrated Rituals**, **Divine Magic**, **Exorcism**, **Curses** - Links to Spiritual Damage

### Dynamic Content

The component also automatically links:

-   **Power names** (loaded from powers.json) - Links to Powers page
-   **Equipment names** (loaded from equipment.json) - Links to Equipment page
-   **Monster names** (loaded from monsters.json) - Links to individual Monster pages

## Features

### Interactive Tooltips

-   Hover over any linked keyword to see a tooltip with:
    -   Rule description
    -   Source page information
    -   Chip indicating content type (rule, power, equipment, monster)
    -   Click icon to navigate to full rule page

### Multi-word Phrase Detection

-   Supports phrases like "Draw a Power", "Night's Rest", "Physical Damage"
-   Intelligently matches longest phrases first

### Theme-Aware Styling

-   Linked keywords have dotted underlines and primary color
-   Tooltips adapt to dark/light theme
-   Hover effects provide visual feedback

### Navigation Integration

-   Clicking the navigation icon in tooltips takes users to the full rule page
-   Seamless integration with React Router

## Implementation Notes

-   Keywords are case-insensitive
-   Punctuation is handled gracefully
-   Component recursively processes nested React elements
-   Disable prop allows selective disabling of linking
-   Optimized for performance with useMemo and intelligent caching

## Example Usage in Pages

```jsx
// In Combat Mechanics page
<ListItem>
    <KeywordLinker>
        If your Insight is too low to perceive a monster as it is,
        they take -1 damage from your attacks.
    </KeywordLinker>
</ListItem>

// In multiple sections
<Typography paragraph>
    <KeywordLinker>
        Standard damage from conventional weapons such as swords, guns,
        clubs, and other mundane armaments. Most creatures can be harmed
        by Physical Damage, though some may have resistance or immunity
        to certain types of physical attacks.
    </KeywordLinker>
</Typography>
```

This creates an interconnected reference system where players can quickly understand game terms and navigate between related rules.
