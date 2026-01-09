# Color Sorting Game Specification

## Game Overview

Color Sorting is a high-speed physical sorting game where 100 players are randomly assigned one of 4 colors (Red, Blue, Green, Yellow) and race against the clock to physically group with others who have the same color on their mobile device. The goal is to form the largest connected group of players with the same color within 90 seconds per round.

## Mechanics

### Color Assignment

- When the host starts a round, players are randomly assigned one of 4 colors
- Each color is distributed equally: 25 players per color (for 100-player games, proportionally for smaller groups)
- Assignment is permanent for the duration of a round
- Color assignment triggers a pre-round view showing each player their assigned color

### Connection via QR Code

- Each player's device displays a unique QR code encoding their `playerCode` (Kokimoki client ID) as a deep link
- Players physically find others with the same color displayed on their device
- To connect with another player, one player scans the other player's QR code using their device's native camera
- The app requests camera permissions on the first scan attempt (deferred permissions) for better UX
- QR scan creates a connection link between two players, adding the scanned player to the current player's faction

### Faction Groups

- A faction is a connected group of players who share the same color and have scanned each other's QR codes
- Factions are tracked in real-time via dynamic stores (one store per color)
- Connection is transitive: if Player A scans Player B, and Player B scans Player C, all three are in the same faction
- Duplicate scans are idempotent: if a player scans the same QR code twice, the UI shows "Already connected to this player" message
- Group size display shows: "Connected with X others" (reactive count from the faction store)

### Round Duration

- Each round lasts 90 seconds (configurable via config)
- Timer is server-synchronized using `kmClient.serverTimestamp()` for fairness across all devices
- Host manually controls when rounds end (no auto-transition)
- When a round ends, the largest faction size for each color is recorded

### Round Reset

- At the end of a round, all faction connections are cleared (all dynamic color stores are reset)
- Players transition to a results view showing the winning color and all faction sizes
- Host can then manually trigger the next round, which re-assigns colors and starts fresh

### Host Control

- Host controls the entire game flow:
  - Starts the game (enables color assignment)
  - Clicks "Assign Colors & Start" to begin a round (assigns random colors, initializes faction tracking)
  - Clicks "End Round" to stop the round (calculates faction sizes, transitions to results)
  - Clicks "Next Round" to assign new colors and start again
  - Can run as many rounds as desired (no fixed limit)

## User Flows

### Player (Mobile Device)

#### Pre-Game Phase

- See game lobby message
- Wait for host to start

#### Color Assignment Phase (after host clicks "Assign Colors & Start")

- See large, bright color card (e.g., "YOU ARE RED")
- See instruction: "Scan QR codes to find your color group"
- See ready/waiting message

#### Active Round Phase

- See assigned color (smaller card for reference)
- See live group count: "Connected with 5 others" (updates reactively)
- See their own QR code (encoded deep link with `playerCode`)
- See "Scan QR Code" button to open native camera
- When scanning, see feedback:
  - On success: count updates in real-time
  - On duplicate: "Already connected to this player"

#### Round Results Phase (after host clicks "End Round")

- See results display:
  - Winning color for the round
  - All 4 color faction sizes
  - Current round number
- See waiting message for next round

### Host (Desktop/Tablet)

#### Pre-Game Phase

- See player count (online/offline)
- See "Start Game" button
- See player and presenter links with QR codes
- See toggle for presenter QR visibility

#### Active Game Phase (after game started)

- See "Assign Colors & Start" button
  - Clicking: randomly assigns colors to online players, initializes round state, starts timer
- See 90-second countdown timer (server-synchronized)
- See "End Round" button
  - Clicking: calculates faction sizes, saves results, transitions UI

#### Round Results Phase

- See round winner (color with largest faction)
- See all 4 faction sizes
- See "Next Round" button
  - Clicking: resets factions, re-assigns colors, starts new timer

#### Game Control Flow Transitions

- Game not started → player/presenter links, start button
- Game started → color round control (assign/end buttons, timer)
- Round ended → results display (next round button)

### Presenter (Large Screen/TV)

#### Pre-Game Phase

- See game lobby message
- See player QR code for joining

#### Active Round Phase

- See 4 colored blocks (Red, Blue, Green, Yellow) with live faction counts
- Blocks update reactively as players scan QR codes and join factions
- Large, bold numbers for visibility on big screens
- Example display:
  ```
  🔴 RED: 23 | 🔵 BLUE: 18 | 🟢 GREEN: 31 | 🟡 YELLOW: 28
  ```

#### Round Results Phase

- See results display (same as players and host)

## Technical Implementation

### State Management

#### Global Store (`globalStore`)

```
playerColors: Record<clientId, colorName>        // Current color assignment
roundNumber: number                               // Current round (1-indexed)
roundStartTimestamp: number                       // Server time when round started
roundActive: boolean                              // Whether round is currently active
roundResults: Record<colorName, largestFactionSize>  // Results from most recent round
playerColorCodes: Record<clientId, colorCode>   // Used for QR generation
```

#### Dynamic Color Stores (4 stores: color-red-faction, color-blue-faction, etc.)

```
connections: Record<kmClientId, { joinedAt: number }>  // Players in this faction
```

### QR Code Format

- QR encodes a deep link: `${window.location.origin}/join?playerCode=${kmClient.id}`
- When scanned, the `playerCode` is extracted and used to trigger connection via `joinColorFaction()`

### Camera Permissions

- Permissions are requested only on first QR scanner button click (deferred)
- Uses `navigator.mediaDevices.getUserMedia()` with `{ video: true }` constraint
- Handles permission denial gracefully (shows error message)

### Reactive Updates

- All faction counts use `useSnapshot(colorFactionStore.proxy)` for real-time reactivity
- Presenter screen updates live as players scan (no polling)
- Group count on player screen updates instantly

## Configuration

All user-facing text is stored in config schema and YAML:

- Game title
- Color names (Red, Blue, Green, Yellow)
- Color assignment messages
- Connection feedback messages ("Connected with X others", "Already connected")
- Button labels (Assign Colors & Start, End Round, Next Round)
- Instruction text
- Results display text

## Edge Cases

1. **Player joins after round starts**: Only sees their color, can still scan to join faction
2. **Player disconnects mid-round**: Their faction connections remain (faction size decreases if tracked by name, but our implementation tracks by clientId, so disconnected players remain)
3. **Duplicate QR scans**: Show "Already connected to this player" toast, group count doesn't change
4. **No connections formed**: Faction size is 1 for all players
5. **All players same color**: Only possible if colors are manually overridden; normal distribution won't cause this
6. **Host ends round while players are mid-scan**: Scans are processed up to that moment; results reflect factions at round-end time

## Known Limitations

- QR scanning requires device camera access (browser/native permission)
- Deep link format assumes standard web URL structure
- Faction detection is simplified: connects based on QR scan, not sophisticated graph algorithms
- No persistence of results across sessions (stored only during active game session)
