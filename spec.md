# Color Sorting Game Specification

## Game Overview

Color Sorting is a real-time network game where players are randomly assigned one of 1-5 colors (configurable by host) and compete to form the largest connected group with others who share the same color. Players connect by scanning each other's QR codes on their mobile devices. After each round, the color with the largest connected group wins bonus points. The game supports multiple rounds, with scoring tracked across all rounds to determine the overall winner.

## Mechanics

### Color Configuration

- Host can customize the number of colors: **1-5 colors** (configurable before game starts)
- Host can customize each color's display name (e.g., Red → "Ruby", Blue → "Sapphire")
- Default is 4 colors: Ruby, Sapphire, Emerald, Gold
- Available color options: Ruby, Sapphire, Emerald, Gold, Purple
- Colors must be assigned before the game starts via the "Edit Color Names" dialog

### Color Assignment

- When the host starts a round, players are randomly assigned one of the configured colors
- Each color is distributed as equally as possible across online players
- Late-joining players during an active round are assigned to the color with the fewest players
- Assignment is permanent for the duration of a round

### Connection via QR Code

- Each player's device displays a unique QR code encoding their player information via a deep link
- QR format: `${window.location.origin}/join?playerCode=${kmClient.id}&color=${playerColor}`
- Players must find others with the **same color** and scan their QR code
- Scanning validates that both players have the same color assignment
- On successful scan, an edge connection is created between the two players' IDs in the faction graph
- **Color mismatch detection**: If colors don't match, UI shows error message and doesn't create connection
- **Self-connection prevention**: Scanning your own QR code shows informational message
- **Duplicate scan handling**: Scanning the same player twice shows "Already connected to this player"

### Faction Groups

- A faction is a **connected graph** of players who share the same color and have directly or indirectly scanned each other
- Factions are tracked via **dynamic Kokimoki stores** (one store per color)
- Each store maintains:
  - `players`: Record of all players in the faction with join timestamps
  - `edges`: Record of direct connections (edges) between players
- **Graph connectivity**: Player A is in the same faction as Player C if a path of edges connects them (transitive closure)
- **Largest faction calculation**: Performed using iterative depth-first search (DFS) to find connected components
- **Faction scoring**:
  - Connection points: 1 point per direct edge (each connection)
  - Bonus points: Awarded to players in the winning faction(s)
  - Total round points: Connection points + Bonus points (if applicable)
- **Duplicate scans**: Idempotent - scanning the same player twice doesn't create duplicate edges

### Round Duration

- Host can customize round duration: **10-600 seconds** (default 90 seconds)
- Timer is server-synchronized using `kmClient.serverTimestamp()` for fairness across all devices
- Round automatically ends when the duration expires (no manual intervention needed)
- Global controller (elected leader among connected devices) monitors elapsed time and triggers round end
- When a round ends:
  1. Largest faction for each color is calculated using DFS
  2. Faction sizes are recorded in round history
  3. Individual player scores are calculated and saved
  4. Results are displayed to all clients

### Round Reset

- At the end of a round, all faction connections are cleared (all dynamic color stores are reset)
- Players transition to a results view showing:
  - Winning color(s) (supports ties)
  - All faction sizes for the round
  - Current round number and total rounds
- Leaderboard and final results show accumulated player scores across all rounds
- Next round automatically starts (new color assignment, new faction tracking)

### Host Control

- Host controls game configuration and flow:
  - **Before game starts**:
    - Click "Edit Color Names" to set number of colors (1-5) and custom color names
    - Set round duration (seconds) and total rounds to play
    - Optionally upload logo
    - Click "Save Names & Start Game" to begin
  - **During game**:
    - Round automatically runs for configured duration
    - Can see real-time faction sizes on presenter screen
    - Can manually stop game if needed
  - **Between rounds**:
    - Round automatically transitions to results display
    - Next round automatically starts after results are shown

## User Flows

### Player (Mobile Device)

#### Pre-Game Phase

- See game lobby message
- Wait for host to start

#### Color Assignment Phase (after game starts)

- See large, bright color card (e.g., "YOU ARE RUBY")
- Color name matches host's custom configuration
- See instruction: "Scan QR codes to find other players with your color"
- Display shows player's assigned color for reference throughout round

#### Active Round Phase

- See assigned color (color card at top for reference)
- See countdown timer showing remaining time (synced to all players)
- See live group count: "Connected with X others" (updates reactively as scans succeed)
- See their own QR code with instructions to share
- See "Scan QR Code" button to open native camera
- See feedback messages for scanning:
  - On success: "✓ Connected! Your group is growing"
  - On duplicate: "Already connected to this player"
  - On color mismatch: "Wrong color! They are X, you are Y"
  - On self-scan: "That's your own QR code!"
  - On error: "Failed to connect. Try again."

#### Round Results Phase (after round ends)

- See results display showing:
  - Winning color(s) for the round (supports ties: multiple colors can have same largest size)
  - All faction sizes for each color in this round
  - Current round number and total rounds
- See leaderboard with player scores if multiple rounds complete
- Wait for next round to automatically start, or see final results if game is complete

### Host (Desktop/Tablet)

#### Pre-Game Phase

- See player count (online/offline)
- See "Edit Color Names" button
- See player and presenter links with QR codes
- See toggle for presenter QR visibility
- Click "Edit Color Names" to configure game:
  - Set number of colors (1-5 slider)
  - Set custom name for each color
  - Set round duration (seconds)
  - Set total rounds to play
  - Optionally upload logo
  - Click "Save Names & Start Game" to start

#### Active Game Phase (after game starts)

- See round timer counting down
- See real-time faction size displays (updated as players scan QR codes)
- See "Stop Game" button if needed to terminate game early
- All rounds proceed automatically without host intervention:
  - Round automatically starts with color assignments
  - Round automatically ends when timer expires
  - Results automatically displayed
  - Next round automatically starts

#### Round Results Phase

- See round winner(s) - color with largest faction (supports ties)
- See all faction sizes for each color
- See leaderboard with accumulated player scores across all rounds
- Automatically transitions to next round if more rounds remaining
- Shows final results when all rounds complete

#### Game Control Flow Transitions

- Pre-game → Configuration → Active Round → Results → Active Round (loop) → Final Results
- Configuration: Host customizes number of colors, names, duration, rounds
- Active Round: Timer counts down, players scan to join factions
- Results: Scores calculated, leaderboard displayed
- Final Results: All rounds complete, winner determined by total score

### Presenter (Large Screen/TV)

#### Pre-Game Phase

- See game lobby message
- See player QR code for joining

#### Active Round Phase

- See colored blocks for each color with live faction counts
- Colors shown: Ruby (red), Sapphire (blue), Emerald (green), Gold (yellow), Purple (if enabled)
- Blocks update reactively in real-time as players scan QR codes and join factions
- Large, bold numbers for visibility on large screens
- Display shows countdown timer
- Example display:
  ```
  💎 RUBY: 23 | 💙 SAPPHIRE: 18 | 💚 EMERALD: 31 | 💛 GOLD: 28
  ```

#### Round Results Phase

- See results display (same as players and host)

## Technical Implementation

### State Management

#### Global Store (`globalStore`)

Contains shared game state:

```typescript
started: boolean; // Game is active
playerColors: Record<clientId, colorName>; // Current color assignment for each player
roundNumber: number; // Current round (0-indexed, increments after each round)
roundActive: boolean; // Whether round timer is running
roundStartTimestamp: number; // Server time when round started
roundDurationSeconds: number; // Duration of each round (customizable)
numberOfColors: number; // Number of colors in use (1-5)
colorNames: Record<colorName, string>; // Custom display names (Ruby, Sapphire, etc.)
roundResults: Record<colorName, largestFactionSize>; // Faction sizes from current round
roundHistory: Record<roundNumber, RoundResult>; // Historical results: {winningColors, largestFactionSize, bonusPoints}
playerScores: Record<clientId, PlayerScore>; // Accumulated scores: {totalScore, roundScores{}}
totalRounds: number; // Total rounds to play
gameComplete: boolean; // Game finished (all rounds done)
winBonus: number; // Points awarded to winning faction players
```

#### Dynamic Color Stores (one per color: color-red, color-blue, etc.)

One Kokimoki store per color, initialized when game starts:

```typescript
interface ColorFactionState {
  players: Record<clientId, { joinedAt: number }>; // All players in this faction
  edges: Record<edgeKey, connectionTime>; // Direct connections: "id1:id2" -> timestamp
}
```

**Connection tracking**:

- Each scan creates an edge: `edge_key = "${playerId1}:${playerId2}"`
- Edges are directional but treated as bidirectional in graph analysis
- Duplicate scans don't create duplicate edges (idempotent)

### QR Code Format

- QR encodes a deep link: `${window.location.origin}/join?playerCode=${kmClient.id}&color=${colorName}`
- When scanned, both `playerCode` and `color` are extracted
- Color validation ensures both players have the same assigned color before creating connection
- Invalid format or missing parameters rejected with error message

### Connection Flow

1. **Scan**: Player A scans Player B's QR code
2. **Validation**:
   - Extract playerCode and color from URL
   - Verify color matches Player A's assigned color
   - Prevent self-scans and duplicate connections
3. **Create Connection**: Call `joinColorFaction(colorStore, scannedClientId)` with retry logic
4. **Retry Logic**:
   - 3 attempts with exponential backoff (300ms, 600ms, 900ms)
   - Handles "Room not joined" errors during store initialization
5. **Update Faction**: Add edge to color store's dynamic Kokimoki store
6. **Feedback**: Show success/error message to user
7. **Reactive Update**: Group count updates automatically via `useSnapshot`

### Largest Faction Calculation

Performed at round end using **iterative depth-first search (DFS)**:

1. Start with unvisited players in faction
2. For each unvisited player, run DFS to find all connected players
3. Track each connected component as a separate faction
4. Largest faction is the component with most players
5. Time complexity: O(V + E) where V = players, E = edges

**Scoring logic**:

- **Connection points**: Player gets 1 point per edge they're directly connected to
- **Winning faction bonus**: `winBonus` points per winning faction player (configurable, default 10)
- **Total round score**: Connection points + Bonus points
- **Accumulated score**: Sum across all rounds

### Global Controller

One device elected as "global controller" using connection ID sorting:

- Monitors round timer (server-synchronized)
- Automatically triggers round end when duration expires
- Calculates largest faction and updates scores
- Stores round results in global state
- Handles color reassignment for next round
- Dynamically reassigns colors to late joiners (assigns to color with fewest players)

## Configuration

All user-facing text and game parameters are configurable via schema and YAML:

### Text Configuration

- Game title
- Color names (customizable per game)
- Instructions and messages
- Button labels
- Results and leaderboard text
- Feedback messages (success, error, info)

### Game Parameters

- `numberOfColors`: 1-5 (default 4)
- `roundDurationSeconds`: 10-600 (default 90)
- `totalRounds`: Number of rounds to play (default 3)
- `winBonus`: Points for winning faction (default 10)
- `logoUrl`: Optional branding image

All configuration is managed in [src/config/schema.ts](src/config/schema.ts) and [default.config.yaml](default.config.yaml)

## Edge Cases & Handling

1. **Player joins after round starts**:
   - Assigned to color with fewest players (load balancing)
   - Can immediately start scanning
   - Counts toward final faction sizes

2. **Player disconnects mid-round**:
   - Remains in faction graph (doesn't affect edges/connections)
   - Faction size calculation includes disconnected players

3. **Duplicate QR scans**:
   - Detected and prevented with `alreadyConnected` flag
   - Shows "Already connected to this player" message
   - No duplicate edges created

4. **Color mismatch during scan**:
   - QR code includes both playerCode AND color
   - Validation ensures both players have same color
   - Color mismatch shows error with color names

5. **No connections formed**:
   - Faction size is 1 for all players of that color
   - Each gets 0 connection points
   - No bonus points

6. **Tie for largest faction**:
   - Multiple colors can have same largest faction size
   - All tied colors are listed as "winners"
   - All players in winning factions receive bonus points

7. **React.StrictMode double-invoke**:
   - QR scanner uses detection flag to prevent processing same QR twice
   - Uses iterative DFS instead of recursive to avoid stack overflow on large factions

## Known Limitations

- QR scanning requires device camera access (browser permission)
- Deep link format assumes standard web URL structure
- Player reconnection during round uses same clientId (persistent)
- Faction detection is exact graph connectivity (no fuzzy matching)
- No persistence of results across app restarts (only during active session)
