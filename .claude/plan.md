# Bot System Implementation Plan

## Overview
Add bot players that can draw (Quick Draw dataset) and guess (Claude Haiku 4.5 vision), enabling permanent public lobbies, bot backfill on disconnect, and solo play.

---

## Part 1: Shared Types & Bot Player Abstraction

**Modify:** `packages/shared/src/game-types.ts`
- Add to `Player`: `isBot?: boolean`, `botDifficulty?: 'easy' | 'medium' | 'hard'`

**Create:** `apps/server/src/game/bot/bot-player.ts`
- Factory function `createBotPlayer(options)` returning a Player with:
  - `id: 'bot-' + uuid`
  - `persistentId: 'bot-' + uuid`
  - Random name from `['DoodleBot', 'SketchMaster', 'PicassoBot', 'DrawBot3000', 'ArtWizard', 'InkMaster', 'ScribbleKing', 'BrushBot']`
  - `isBot: true`, `isConnected: true`
  - Bot-specific avatar (robot emoji or distinct seed)

**Difficulty config:**
```
easy:   { guessDelayMs: 20000, strokeSpeedMultiplier: 2.0 }
medium: { guessDelayMs: 10000, strokeSpeedMultiplier: 1.0 }
hard:   { guessDelayMs: 5000,  strokeSpeedMultiplier: 0.5 }
```

---

## Part 2: Drawing Bot (Quick Draw Dataset)

**Create:** `apps/server/src/game/bot/bot-drawing.service.ts`

**Flow when bot draws:**
1. Wait 2-3 seconds (simulates thinking)
2. Map game word → Quick Draw category via `word-mapping.ts`
3. Fetch random drawing from `https://storage.googleapis.com/quickdraw_dataset/full/simplified/{word}.ndjson`
   - NDJSON format: each line is `{ drawing: [[x[], y[]], ...] }` — array of strokes
   - Pick a random line (stream the file, pick random offset)
4. Scale coordinates: Quick Draw uses 256x256 → normalize to 0-1 range, then scale to canvas dimensions
5. Replay strokes:
   - For each stroke: build DrawAction with points, emit via `server.to(roomId).emit('draw:action', action)` and push to `room.drawingHistory`
   - Add ±2px jitter to coordinates
   - 300-800ms pause between strokes (adjusted by difficulty strokeSpeedMultiplier)
6. Check `bot.drawingAborted` before each stroke for cancellation

**Create:** `apps/server/src/game/bot/word-mapping.ts`
- Map game words (all languages) → Quick Draw English categories
- Start with common words, expand over time
- Fallback: draw a simple "?" shape if no mapping found

---

## Part 3: Guessing Bot (Claude Vision API)

**Create:** `apps/server/src/game/bot/bot-vision.service.ts`

**Canvas snapshot approach (from spec):**
- Frontend emits `canvas_snapshot` (base64 PNG at 400x300) every 5 seconds during drawing phase when bots are in game
- Server stores `room.currentCanvasSnapshot`

**Guessing flow:**
1. 6-second initial delay before first guess attempt
2. Every 5 seconds: check if snapshot exists
3. Call Claude Haiku 4.5 vision:
   - Send canvas base64 + word list
   - Prompt: "This is a Pictionary-style drawing. The possible words are: {list}. Reply with ONLY one word from the list, or 'unsure'."
4. If confident → submit guess through existing `handleGuess()` flow
5. Stop when `bot.stopGuessing = true` or correct guess made

**Add socket event:**
- `canvas_snapshot` to `ClientToServerEvents`: `{ data: string }` (base64 PNG)
- Server handler stores on room: `room.currentCanvasSnapshot = data`

---

## Part 4: Bot Scheduler Service

**Create:** `apps/server/src/game/bot/bot-scheduler.service.ts`

- Uses `@nestjs/schedule` `@Interval(5000)`
- Loops through active games with bots
- For each bot guesser: check snapshot, call vision API, submit guess
- Manages drawing bot tasks: when bot becomes drawer, starts stroke replay

**Install:** `@nestjs/schedule` in server

---

## Part 5: Permanent Public Lobbies

**Create:** `apps/server/src/game/bot/permanent-lobbies.service.ts`

**3 lobbies (created on bootstrap):**
| ID | Max Players | Mode | Name |
|---|---|---|---|
| `lobby-2p` | 2 | classic | 2 Player |
| `lobby-3p` | 3 | classic | 3 Player |
| `lobby-4p` | 4 | team | Teams (2v2) |

**Lifecycle:**
1. On `OnApplicationBootstrap`: create rooms, fill with bots, auto-start game
2. On game end: auto-rematch (no vote needed), reset scores, restart
3. Never close/delete these rooms
4. Real player joins → evict one bot
5. Real player leaves → bot backfills with same score

**Lobby state broadcast:**
- Every 3 seconds via `@Interval(3000)`, emit to `lobby_browser` socket room
- Payload: `{ id, name, maxPlayers, realPlayers, totalPlayers, status }`

---

## Part 6: Bot Backfill for Regular Games

**Modify:** `apps/server/src/game/game.gateway.ts` — `handleDisconnect()`

**New behavior (after existing grace period):**
- If player hasn't reconnected after grace period:
  - Create bot with player's score
  - Swap into their slot in the game
  - If was drawing → skip to next round with system message
- When real player reconnects to a room with a bot placeholder → swap bot out

---

## Part 7: Round Lifecycle Hooks

**Modify:** `apps/server/src/game/game.service.ts`

**On round start:**
- `room.currentCanvasSnapshot = null`
- All bots: `stopGuessing = false`, `drawingAborted = false`

**On round end:**
- All bots: `stopGuessing = true`, `drawingAborted = true`

---

## Part 8: Frontend Changes

### Canvas Snapshot Emission
**Modify:** `apps/web/src/components/Canvas/DrawingCanvas.tsx`
- If any player in room has `isBot: true` AND phase is `drawing` AND user is NOT drawer:
  - Every 5 seconds, export canvas as base64 PNG (scale to 400x300)
  - Emit `canvas_snapshot` socket event

### Lobby Browser
**Modify:** `apps/web/src/components/Lobby/HomePage.tsx`
- Add "Public Lobbies" section (or new tab)
- Show 3 permanent lobbies with live player counts
- Join button for each

### Bot Indicators
**Modify:** `apps/web/src/components/Lobby/PlayerList.tsx`
- Show robot icon next to bot names
- Style bot entries slightly differently

---

## Implementation Order

1. Install `@nestjs/schedule`, add `ScheduleModule` to AppModule
2. Shared types — add `isBot` to Player
3. Bot player factory
4. Word mapping file
5. Drawing bot service (Quick Draw fetch + replay)
6. Vision service (Claude API)
7. Bot scheduler service
8. Game service hooks (round start/end bot resets)
9. Gateway: canvas_snapshot handler, disconnect backfill
10. Permanent lobbies service + bootstrap
11. Frontend: canvas snapshot, lobby browser, bot indicators

---

## Files Summary

| File | Action |
|---|---|
| `packages/shared/src/game-types.ts` | Modify — add isBot to Player |
| `packages/shared/src/socket-events.ts` | Modify — add canvas_snapshot event |
| `apps/server/src/game/bot/bot-player.ts` | Create |
| `apps/server/src/game/bot/bot-drawing.service.ts` | Create |
| `apps/server/src/game/bot/bot-vision.service.ts` | Create |
| `apps/server/src/game/bot/bot-scheduler.service.ts` | Create |
| `apps/server/src/game/bot/word-mapping.ts` | Create |
| `apps/server/src/game/bot/permanent-lobbies.service.ts` | Create |
| `apps/server/src/game/game.service.ts` | Modify — round hooks |
| `apps/server/src/game/game.gateway.ts` | Modify — snapshot handler, backfill |
| `apps/server/src/game/game.module.ts` | Modify — register new services |
| `apps/server/src/app.module.ts` | Modify — add ScheduleModule |
| `apps/web/src/components/Canvas/DrawingCanvas.tsx` | Modify — snapshot emission |
| `apps/web/src/components/Lobby/HomePage.tsx` | Modify — lobby browser |
| `apps/web/src/components/Lobby/PlayerList.tsx` | Modify — bot indicators |

## Environment Variables
```
ANTHROPIC_API_KEY=<already available>
BOT_DIFFICULTY=medium
BOT_GUESS_INTERVAL_MS=5000
QUICKDRAW_FALLBACK=true
```
