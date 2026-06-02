# Pick a Brick Container App

Containerized rebuild of the Pick a Brick prize draw for Podman on a MacBook Pro M1.

## Quick Start

Start Podman Desktop and make sure the Podman machine is running. Then run Compose from the Mac terminal, not from inside the Podman machine terminal.

From this folder on the Mac:

```sh
cd /Users/dthie/Documents/GitHub/lego-game/container-app
podman-compose up --build
```

Then open:

```text
Board: http://localhost:8080/
Admin: http://localhost:8080/admin.html
```

Stop the app:

```sh
podman-compose down
```

Remove the database volume and start fresh:

```sh
podman-compose down -v
```

## What Runs

- `pick-a-brick-app`: Node.js web/API container.
- `pick-a-brick-db`: PostgreSQL database container.
- `pick-a-brick-data`: persistent database volume.

The app serves the board, admin page, static assets, JSON API, and live Server-Sent Events stream from one container. PostgreSQL stores all game state.

## Files

- `compose.yaml` - Podman Compose stack.
- `Containerfile` - app image build.
- `src/` - Node.js API and database code.
- `sql/001_init.sql` - PostgreSQL schema.
- `public/` - board/admin frontend and assets.
- `docs/functional-design.md` - extracted target design and specification.

## Configuration

Defaults are suitable for local Podman use. Override through environment variables if needed:

- `PORT` - app HTTP port inside the container, default `8080`.
- `DATABASE_URL` - PostgreSQL connection string.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - database container settings.
- `DEFAULT_TOTAL_BRICKS` - initial board size, default `100`.

## Notes For Podman Desktop

Podman Desktop provides the Podman machine and shows the running containers, pods, images, and volumes. The Compose command should be run from the Mac terminal with `podman-compose`; it will connect to the Podman Desktop machine.

Check that `podman-compose` is available on the Mac:

```sh
which podman-compose
podman-compose version
```

Check that the Podman machine is reachable:

```sh
podman machine list
podman info
```

If `podman info` cannot connect, start the machine from Podman Desktop. You can also start it from the Mac terminal:

```sh
podman machine start podman-machine-default
```

If `podman compose up` fails with `looking up compose provider failed`, use `podman-compose` directly:

```sh
podman-compose up --build
```

## Development

The app intentionally uses a small dependency set:

- Node.js built-in HTTP/static serving.
- `pg` for PostgreSQL access.

Run syntax checks locally when Node.js is available:

```sh
npm run check
```
