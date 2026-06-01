#!/bin/zsh
set -euo pipefail

APP_DIR="${0:A:h}"
PORT="${PICK_A_BRICK_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/index.html?mode=firebase&surface=local-board"
LOG_FILE="${TMPDIR:-/tmp}/pick-a-brick-board.log"

cd "$APP_DIR"

if ! /usr/sbin/lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  /usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1 >"$LOG_FILE" 2>&1 &
  sleep 1
fi

if /usr/bin/open -Ra "Google Chrome"; then
  /usr/bin/open -na "Google Chrome" --args --app="$URL" --start-fullscreen
else
  /usr/bin/open "$URL"
fi

echo "Pick a Brick board is running at $URL"
echo "Server log: $LOG_FILE"
