#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
CONFIG_FILE="$REPO_DIR/firebase-config.js"
EXECUTE=false

usage() {
  cat <<'EOF'
Usage: scripts/purge-raffle-data.sh [--execute]

Deletes only the raffle's Firestore document at games/{GAME_ID}.

Without --execute, prints the target and exits without deleting anything.
With --execute, requires an exact typed confirmation before running Firebase CLI.

Browser-local data must be cleared separately by opening cleanup-local-data.html
from every origin/browser profile/device used for the raffle.
EOF
}

case "${1:-}" in
  "")
    ;;
  --execute)
    EXECUTE=true
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Firebase config not found: $CONFIG_FILE" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required to read firebase-config.js safely." >&2
  exit 1
fi

CONFIG=$(
  node - "$CONFIG_FILE" <<'NODE'
const fs = require("fs");
const vm = require("vm");
const file = process.argv[2];
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
const projectId = sandbox.window.FIREBASE_CONFIG?.projectId;
const gameId = sandbox.window.GAME_ID || "ntt-redhat-lego-game";
if (!projectId || !gameId || !/^[A-Za-z0-9._-]+$/.test(projectId) || !/^[A-Za-z0-9._-]+$/.test(gameId)) {
  process.exit(1);
}
process.stdout.write(`${projectId}\n${gameId}\n`);
NODE
) || {
  echo "Error: Could not read a safe projectId and GAME_ID from firebase-config.js." >&2
  exit 1
}

PROJECT_ID=$(printf '%s\n' "$CONFIG" | sed -n '1p')
GAME_ID=$(printf '%s\n' "$CONFIG" | sed -n '2p')
DOCUMENT_PATH="games/$GAME_ID"
CONFIRMATION="$PROJECT_ID"

echo "Firestore project:  $PROJECT_ID"
echo "Document to delete: $DOCUMENT_PATH"
echo
echo "This does not delete the Firebase project, other game documents, Authentication users,"
echo "or Cloud Storage objects. The raffle app stores its Firebase state only in this document."

if [ "$EXECUTE" != "true" ]; then
  echo
  echo "Dry run only. Re-run with --execute to perform the deletion:"
  echo "  $0 --execute"
  exit 0
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "Error: Firebase CLI is required. Install firebase-tools and run 'firebase login' first." >&2
  exit 1
fi

echo
printf 'Type exactly "%s" to continue: ' "$CONFIRMATION"
IFS= read -r ANSWER
if [ "$ANSWER" != "$CONFIRMATION" ]; then
  echo "Confirmation did not match. Nothing was deleted." >&2
  exit 1
fi

firebase firestore:delete "$DOCUMENT_PATH" --project "$PROJECT_ID" --force

echo
echo "Firestore raffle document deleted."
echo "Now open cleanup-local-data.html on every raffle origin/browser profile/device used."
