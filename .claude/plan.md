# Implementation Plan: Reactions, Profiles, Leaderboard & Confetti

## Feature 1: Emoji Reactions (floating reactions visible to all)

### Shared types
- Add `reaction:send` to `ClientToServerEvents`: `{ emoji: string }`
- Add `reaction:received` to `ServerToClientEvents`: `{ emoji: string, nickname: string, playerId: string }`
- Define `REACTION_EMOJIS = ['😂', '🔥', '👏', '🤔', '😮', '❤️']` in shared constants

### Server
- Add `reaction:send` handler in `game.gateway.ts`
  - Rate limit: 3 reactions per 5 seconds
  - Validate emoji is in allowed list
  - Broadcast `reaction:received` to entire room (players + spectators)
  - No persistence needed (ephemeral)

### Frontend
- **ReactionBar component**: Row of emoji buttons below/beside the canvas
  - Mobile: horizontal strip at bottom of canvas area, small buttons
  - Desktop: same, positioned below canvas
- **FloatingReaction component**: When `reaction:received` fires, render an animated emoji that floats upward from bottom of canvas and fades out (Framer Motion, ~2s animation)
  - Show nickname label briefly next to emoji
  - Stack multiple reactions without overlap (random x offset)
- **Integration**: Add ReactionBar to ClassicMode and TeamMode layouts
  - Available during `drawing` and `round_end` phases (everyone can react)

---

## Feature 2: Player Profiles (MongoDB-persisted stats)

### MongoDB Schema - `PlayerProfile`
New collection `playerProfiles`:
```
{
  persistentId: string (indexed, unique)
  nickname: string (latest used)
  avatar: string (latest used)
  stats: {
    totalGames: number
    totalWins: number
    totalScore: number
    correctGuesses: number
    totalDrawings: number
    gamesAsDrawer: number  // rounds where they drew
  }
  favoriteWord: string | null  // most drawn/guessed word
  wordFrequency: Record<string, number>  // track counts to compute favorite
  createdAt: Date
  updatedAt: Date
}
```

### Server - `ProfileService` (new)
- `getOrCreateProfile(persistentId, nickname, avatar)` — upsert profile
- `updateStatsAfterGame(persistentId, gameResult)` — called at game_end
  - Increment totalGames, update wins/score/guesses
  - Update wordFrequency and recompute favoriteWord
- `getProfile(persistentId)` — fetch single profile
- `getLeaderboard(type: 'allTime' | 'weekly', limit)` — aggregation query

### Server - Integration points
- On `game:end` in `game.service.ts`: call `profileService.updateStatsAfterGame()` for each non-spectator player
  - Winner gets totalWins++
  - Each player: totalGames++, totalScore += their score, correctGuesses += their count
  - Each drawer: totalDrawings += number of rounds they drew
  - Word frequency updated from playerWordHistory

### Socket Events
- `profile:get` (client→server): `{ persistentId: string }` → `profile:data` response
- `profile:data` (server→client): `{ profile: PlayerProfile }`
- `leaderboard:get` (client→server): `{ type: 'allTime' | 'weekly' }` → `leaderboard:data` response
- `leaderboard:data` (server→client): `{ players: LeaderboardEntry[], type: string }`

### Frontend - Profile display
- **ProfileModal component**: Accessible by clicking on any player's avatar/name (in PlayerList, ScoreBoard, etc.)
  - Shows: avatar, nickname, total games, wins, win rate, total score, correct guesses, favorite word
  - Mobile: bottom sheet style modal
  - Desktop: centered modal
- **Own profile**: accessible from header (small avatar button)
- Store profile data in a lightweight Zustand store or just fetch on demand

---

## Feature 3: Leaderboard

### Server
- `getLeaderboard()` in ProfileService:
  - **All-time**: Sort by totalScore desc, limit 50
  - **Weekly**: Filter by games played in last 7 days (track `lastGameAt` timestamp), sort by score in that period
  - For weekly: add `weeklyScore` and `weeklyGames` fields, reset logic via `lastWeekReset` date check
  - Return: `{ rank, persistentId, nickname, avatar, totalScore, totalWins, totalGames }`

### Frontend
- **LeaderboardPage component**: New tab on HomePage (alongside Create, Join, Available, Ongoing)
  - Tab with trophy icon
  - Toggle: "All Time" / "This Week"
  - Scrollable list with rank numbers, avatars, nicknames, scores
  - Top 3 highlighted (gold/silver/bronze styling)
  - Tap on player → opens ProfileModal
  - Mobile: full-width list, compact rows
  - Desktop: centered card with wider rows

---

## Feature 4: Confetti & Animations

### Library
- Use `canvas-confetti` (lightweight, ~6KB) — add to web dependencies

### Trigger points
1. **Correct guess**: When current player guesses correctly (`chat:correctGuess` where playerId matches own)
   - Small burst of confetti from bottom center
   - Quick, ~1 second
2. **Game win**: When `game:end` fires and current player is the winner
   - Full-screen confetti cannon (both sides, multiple bursts over 3 seconds)
   - Gold-colored confetti
3. **Round end (drawer)**: If drawer had high success rate (>50% guessed), small celebratory confetti

### Frontend Integration
- **useConfetti hook**: Wraps canvas-confetti, exposes `fireCorrectGuess()`, `fireGameWin()`, `fireDrawerSuccess()`
- Hook listens to socket events and auto-fires when conditions met
- Called in `useGameEvents.ts` where the relevant events are already handled
- No confetti on mobile battery-save concern? — keep it, canvas-confetti is lightweight and short-lived

---

## Mobile Responsiveness Notes (applies to all features)

- **ReactionBar**: Use `flex-wrap` with small 32px tap targets, positioned as overlay on canvas bottom
- **ProfileModal**: Use `max-h-[80vh] overflow-y-auto`, bottom-sheet style on mobile (slide up from bottom)
- **Leaderboard**: Single column, compact rows with 48px height, horizontal scroll prevented
- **Confetti**: Works natively on mobile canvas, no changes needed
- All new modals use the existing ConfirmModal pattern with Framer Motion AnimatePresence
- Touch-friendly: min tap target 44px, adequate spacing

---

## Implementation Order

1. **Confetti** (smallest scope, immediate impact, no server changes)
2. **Reactions** (small server change, fun social feature)
3. **Player Profiles + MongoDB schema** (foundation for leaderboard)
4. **Leaderboard** (depends on profiles being populated)

---

## Files to modify/create

### Shared package
- `packages/shared/src/socket-events.ts` — add reaction, profile, leaderboard events
- `packages/shared/src/game-types.ts` — add PlayerProfile, LeaderboardEntry types
- `packages/shared/src/constants.ts` — add REACTION_EMOJIS

### Server
- **New**: `apps/server/src/game/profile.service.ts`
- **New**: `apps/server/src/database/schemas/profile.schema.ts`
- **Modify**: `apps/server/src/game/game.gateway.ts` — add reaction, profile, leaderboard handlers
- **Modify**: `apps/server/src/game/game.service.ts` — call profile update on game end
- **Modify**: `apps/server/src/game/game.module.ts` — register ProfileService

### Frontend
- **New**: `apps/web/src/components/Game/ReactionBar.tsx`
- **New**: `apps/web/src/components/Game/FloatingReactions.tsx`
- **New**: `apps/web/src/components/Profile/ProfileModal.tsx`
- **New**: `apps/web/src/components/Lobby/Leaderboard.tsx`
- **New**: `apps/web/src/hooks/useConfetti.ts`
- **Modify**: `apps/web/src/components/Game/ClassicMode.tsx` — add ReactionBar + FloatingReactions
- **Modify**: `apps/web/src/components/Game/TeamMode.tsx` — same
- **Modify**: `apps/web/src/components/Lobby/HomePage.tsx` — add Leaderboard tab
- **Modify**: `apps/web/src/hooks/useGameEvents.ts` — add reaction listener, confetti triggers
- **Modify**: `apps/web/src/components/Game/ScoreBoard.tsx` — clickable names → ProfileModal
- **Modify**: `apps/web/src/components/Lobby/PlayerList.tsx` — clickable names → ProfileModal
- Install: `canvas-confetti` + `@types/canvas-confetti`
