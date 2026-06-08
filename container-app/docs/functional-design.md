# Pick a Brick Container App - Functional Design

## Goal

Rebuild the Pick a Brick prize draw as a self-contained container application for a MacBook Pro M1 running Podman or Podman Desktop. The app must keep the event board and organiser admin pages web based, replace Firebase/localStorage persistence with PostgreSQL, and run entirely on open source software.

## Target Runtime

- App container: Node.js HTTP server serving static pages and JSON/SSE APIs.
- Database container: PostgreSQL.
- Orchestration: `compose.yaml`, compatible with `podman compose`.
- Primary target: Apple Silicon MacBook Pro M1.
- Default local URL: `http://localhost:8080`.

## User Surfaces

- Board: `/`
  - Shows the branded prize draw board.
  - Displays remaining bricks and winners drawn.
  - Lets participants select one available brick.
  - Prompts for an email address before claiming.
  - Prevents already claimed bricks from being selected.
  - Receives live state updates without reload.

- Admin: `/admin.html`
  - Shows current totals, entries, remaining bricks, and winners.
  - Enables test email auto-fill on the board.
  - Changes total brick count while retaining existing entries and winners.
  - Draws random winners from undrawn entries.
  - Exports entries as CSV.
  - Resets the board for a new day or run.
  - Opens the board in a second tab/window.

## Data Rules

- A brick number can be claimed once per reset.
- An email address can be used once per reset, case-insensitively.
- Winner draws only include entries that have not already won.
- Winner draw order is sequential.
- Reset clears entries, winners, and the last winner banner.
- Increasing the brick count retains all existing game state.
- Decreasing the brick count retains all existing game state and is allowed when no picked brick would fall outside the resized board.

## Live Updates

The app uses Server-Sent Events at `/api/events`. Every successful state change broadcasts the latest game state to connected board and admin pages. Clients reconnect automatically if the connection drops.

## API

- `GET /api/health`
  - Returns app/database health.
- `GET /api/state`
  - Returns the full current game state.
- `GET /api/events`
  - Streams game state updates using Server-Sent Events.
- `POST /api/claim`
  - Body: `{ "number": 12, "email": "person@example.com" }`
  - Claims a brick.
- `POST /api/admin/draw`
  - Draws one random winner from undrawn entries.
- `POST /api/admin/reset`
  - Body: `{ "totalBricks": 100 }`
  - Clears the game and sets the board size.
- `POST /api/admin/brick-count`
  - Body: `{ "totalBricks": 100 }`
  - Changes the board size without clearing entries or winners.
- `POST /api/admin/test-mode`
  - Body: `{ "enabled": true }`
  - Toggles board test mode.
- `GET /api/admin/export.csv`
  - Downloads the entries and winner data.

## Persistence Model

PostgreSQL stores:

- Singleton `game_settings` row for board size, test mode, and last winner.
- `entries` rows for selected brick numbers, entrant emails, and draw history.

Database constraints enforce unique brick numbers and unique normalized emails. Winner draw mutations run inside transactions.

## Open Source Components

- Node.js runtime.
- `pg` PostgreSQL client for Node.js.
- PostgreSQL database.
- Alpine Linux based container images.
- Podman and Podman Desktop for local container execution.

No Firebase, proprietary database service, or closed-source application dependency is required.
