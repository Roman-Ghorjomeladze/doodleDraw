# DoodleDraw

A real-time multiplayer drawing and guessing game built with React, NestJS, and Socket.IO. Players take turns drawing words while others try to guess them — similar to Pictionary or Skribbl.io.

## Features

- **Classic Mode** — One player draws, everyone else guesses
- **Team Mode** — Two teams compete with alternating drawers, handicap system for balance
- **Real-time Canvas** — Stroke, fill, undo, clear with configurable brush sizes and 20 colors
- **Chat & Guessing** — Integrated chat with automatic guess detection and scoring
- **Hints** — Progressive letter reveals on a configurable interval
- **Bot Players** — AI opponents with vision-based drawing for always-on lobbies
- **Leaderboard** — All-time, weekly, by country, and by age group rankings
- **Multi-language** — Word packs in English, Russian, Turkish, and Georgian
- **Admin Panel** — Room management, word stats, broadcast messaging
- **Dark Mode** — Full theme toggle support
- **Responsive** — Works on desktop and mobile
- **Emoji Reactions** — 18 reaction emojis during gameplay
- **Reconnection** — Persistent player IDs allow seamless reconnection
- **Spectator Mode** — Watch ongoing games without participating

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Frontend | React 19, Vite 6, Tailwind v4, Zustand 5     |
| Backend  | NestJS 11, Socket.IO, Mongoose                |
| Database | MongoDB 7                                     |
| Shared   | TypeScript types & constants (monorepo)       |
| Avatars  | DiceBear Adventurer collection                |

## Project Structure

```
draw-battle/
├── apps/
│   ├── server/           # NestJS backend
│   │   └── src/
│   │       ├── game/     # Gateway, services, bot system
│   │       ├── words/    # Word fetching & management
│   │       ├── auth/     # Authentication
│   │       ├── admin/    # Admin panel API
│   │       └── database/ # MongoDB schemas & seeds
│   └── web/              # React frontend
│       └── src/
│           ├── components/  # Lobby, Game, Canvas, Admin, UI
│           ├── hooks/       # useSocket, useGame, useGameEvents
│           ├── stores/      # Zustand stores (game, player, drawing, settings)
│           └── utils/       # Avatars, sounds, auth API
├── packages/
│   └── shared/           # Shared types, events, constants
├── package.json          # Workspace root
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** (package manager)
- **MongoDB** 7+ (local or Atlas)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp apps/server/.env.example apps/server/.env
```

Required variables:

```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/doodledraw
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
ANTHROPIC_API_KEY=sk-...   # For bot vision features
```

### 3. Start MongoDB

Using Docker Compose:

```bash
docker compose up -d
```

Or connect to your own MongoDB instance via `MONGODB_URI`.

### 4. Seed the database

```bash
pnpm db:seed
```

This populates word collections in all supported languages.

### 5. Run in development

```bash
pnpm dev
```

This starts both servers concurrently:
- **Web**: http://localhost:5173
- **Server**: http://localhost:3001

Or run them individually:

```bash
pnpm dev:server   # NestJS with hot reload
pnpm dev:web      # Vite dev server
```

## Production Build

```bash
pnpm build
pnpm start:prod
```

The production server serves the built frontend as static files on port 3001.

## Game Flow

```
lobby → selecting_word → drawing → round_end → ... → game_end
```

1. **Lobby** — Host creates a room, players join via room code or public lobby list
2. **Word Selection** — The current drawer picks from 3 random words
3. **Drawing** — Drawer has a configurable time limit (default 80s) to draw; others guess in chat
4. **Round End** — Scores are revealed, correct word is shown
5. **Game End** — After all rounds complete, final leaderboard is displayed with rematch option

## Game Settings

| Setting       | Default | Range     |
| ------------- | ------- | --------- |
| Round Time    | 80s     | -         |
| Total Rounds  | 2       | -         |
| Max Players   | 16      | 2–16      |
| Min Players   | 2 (classic), 4 (team) | - |
| Hint Interval | 20s     | -         |
| Word Options  | 3       | -         |
| Difficulty    | Configurable | easy/medium/hard |

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start server + web concurrently    |
| `pnpm dev:server`  | Start NestJS dev server            |
| `pnpm dev:web`     | Start Vite dev server              |
| `pnpm build`       | Build all packages                 |
| `pnpm start:prod`  | Run production server              |
| `pnpm db:migrate`  | Run database migrations            |
| `pnpm db:seed`     | Seed word collections              |

## Architecture Notes

- **Socket.IO** runs on the `/game` namespace with typed events from the shared package
- **Game state** is held in-memory (`Map<roomId, Room>`) with MongoDB persistence for crash recovery
- **Webpack custom config** bundles `@doodledraw/shared` inline for the NestJS server
- **Socket client** is a module-level singleton shared across all React components
- **Player reconnection** uses a `persistentId` stored in localStorage
- **Rate limiting** protects high-frequency socket events from abuse
- **Graceful shutdown** handles SIGTERM/SIGINT for clean deployments

## License

Private
