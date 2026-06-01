# Pick a Brick Prize Draw

Static GitHub Pages app with Firebase Firestore sync, plus a MacBook board-app launcher for running the public board locally while keeping admin web-based.

## Files

- `index.html` - participant board
- `admin.html` - organiser console
- `styles.css` - all styling
- `shared.js` - shared game, Firebase, offline, CSV, and cache helpers
- `board.js` - board page logic
- `admin.js` - admin controls
- `firebase-config.js` - Firebase web app config and `GAME_ID`
- `launch-board.command` - double-clickable Mac launcher for the local board app
- `manifest.webmanifest`, `service-worker.js`, `pwa.js` - optional PWA install support for the board
- `assets/` - supplied logos and brick image variants

## Event Architecture

The intended event setup is Firebase-first:

- Hosted board: `index.html` on GitHub Pages.
- Hosted admin: `admin.html` on GitHub Pages, opened from a phone, tablet, or laptop browser.
- Local board app: `launch-board.command` on the MacBook that drives the stand display.
- Shared state: Firebase Firestore, using the same `firebase-config.js` and `window.GAME_ID`.

Both the hosted board and the local MacBook board app subscribe to the same Firebase game state. The hosted admin page controls both board displays through Firebase, so admin devices do not need to be on the same Wi-Fi or LAN as the MacBook and do not need to connect directly to the MacBook.

The MacBook board launcher opens the board with `?mode=firebase`, so it always uses the shared Firebase event state even if that browser previously used offline mode.

The hosted admin page defaults to Firebase event mode for the same reason. Admin actions in Firebase mode control every active board display through Firebase. Offline mode remains available from the admin console as a same-browser fallback for local testing or no-network use.

## MacBook Board App

On the event MacBook, double-click:

```text
launch-board.command
```

The launcher starts a small local static server on `127.0.0.1:4173` if one is not already running, then opens:

```text
http://127.0.0.1:4173/index.html?mode=firebase&surface=local-board
```

If Google Chrome is installed, it opens in an app-style window. Otherwise it opens in the default browser. The board still needs internet access to sync with Firebase and the hosted admin page.

## PWA Board Option

The board page can also be installed as a Progressive Web App from a supported browser. This is useful when you want the hosted GitHub Pages board to open without the normal browser URL bar.

Typical install paths:

- Chrome or Edge on desktop: open the hosted `index.html`, then use the browser's install app control in the address bar or menu.
- Android Chrome: open the hosted board, then choose `Add to Home screen` or `Install app`.
- iPhone or iPad Safari: open the hosted board, tap Share, then choose `Add to Home Screen`.

The installed PWA starts at:

```text
index.html?mode=firebase&surface=pwa
```

It uses Firebase event mode, so it is administered by the same hosted admin page as the MacBook board app and normal hosted board page. The service worker is intentionally light-touch; it enables installability but does not replace Firebase or the cache-busting workflow.

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

Online mode uses Firebase Firestore. It allows the hosted board, hosted admin console, and MacBook board app to run on different devices, with real-time updates when participants claim bricks or organisers draw winners.

Offline mode is selected from `admin.html`. It uses `localStorage` only, so the board and admin console must run in the same browser/device and from the same site origin to share state. For example, a GitHub Pages admin tab and a GitHub Pages board tab in the same browser can share offline state; a GitHub Pages admin tab and a `127.0.0.1` local board cannot. Offline mode still supports claiming bricks, unique email validation, winner draws, reset, CSV export, test mode, and configurable brick counts.

Do not use offline mode when you need the hosted admin page to control the MacBook board app or any other remote board display.

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
- Cross-device control requires internet access from every device that needs to sync through Firebase.
- Fullscreen mode only hides browser chrome where the browser allows it.
- Cache toggle is per browser/device.
- The Firebase config is client-visible by design for Firebase web apps.
