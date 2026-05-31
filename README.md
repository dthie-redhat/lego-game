# Pick a Brick Prize Draw

Static GitHub Pages app with Firebase Firestore sync and an explicit offline localStorage fallback for event use.

## Files

- `index.html` - participant board
- `admin.html` - organiser console
- `styles.css` - all styling
- `shared.js` - shared game, Firebase, offline, CSV, and cache helpers
- `board.js` - board page logic
- `admin.js` - admin controls
- `firebase-config.js` - Firebase web app config and `GAME_ID`
- `assets/` - supplied logos and brick image variants

## GitHub Pages Deployment

Upload the contents of this folder directly to the repository root, or to the folder you publish from GitHub Pages.

`index.html`, `admin.html`, `styles.css`, `shared.js`, `board.js`, `admin.js`, `firebase-config.js`, and the `assets` folder must sit together at the same level. Do not publish the files inside an extra nested folder.

## Firebase Setup

1. Create a Firebase project.
2. Add a Web App in Firebase Console.
3. Enable Firestore Database.
4. Paste the Firebase web config into `firebase-config.js`.
5. Set `window.GAME_ID` to the event/game identifier you want to use.
6. Create Firestore rules suitable for the event before going live.

The current app stores game state in one Firestore document at `games/{GAME_ID}`. Claims and winner draws are written through Firestore transactions so brick numbers and email addresses are checked against the latest shared state.

Prototype-only rules example:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write: if true;
    }
  }
}
```

These rules are permissive for testing only. For production or a public event, lock down admin actions with authentication, an admin token, or a stricter backend-controlled workflow.

## Online And Offline Modes

Online mode uses Firebase Firestore. It allows the participant board and admin console to run on different devices, with real-time updates when participants claim bricks or organisers draw winners.

Offline mode is selected from `admin.html`. It uses `localStorage` only, so the board and admin console must run in the same browser/device to share state. Offline mode still supports claiming bricks, unique email validation, winner draws, reset, CSV export, test mode, and configurable brick counts.

## Cache Toggle

The admin console includes `Disable browser caching while testing`.

When enabled, the app adds a fresh cache-bust query string to:

- `.js` files
- `.css` files
- `firebase-config.js`
- logo and brick assets under `assets/`

The setting is stored per browser/device in `localStorage`. Turn it off for the live event if you want normal browser caching for performance and resilience.

## Test Mode

Enable `Enable test email auto-fill` in `admin.html` to pre-fill the participant email modal with visible test data such as `nova-brick-4821-abcd@test.local`. The participant still confirms the entry manually.

## Reset For Day 2

Use `Reset board` in `admin.html` to clear claimed bricks, entries, winner history, the drawn-winner pool, and the used-email list. This lets the same person/email enter again on a later event day.

Changing `Total bricks` and clicking `Apply brick count and reset` also resets the game and renders a fresh board.

## Export Entries

Use `Export CSV` in `admin.html`. The CSV includes:

- brick number
- email address
- timestamp claimed
- winner status
- draw order
- winner timestamp

## Known Limitations

- This is a public static app, so obscurity is not strong security.
- Firestore rules must be improved before production use.
- Offline mode is local to one browser/device.
- Fullscreen mode only hides browser chrome where the browser allows it.
- Cache toggle is per browser/device.
- The Firebase config is client-visible by design for Firebase web apps.
