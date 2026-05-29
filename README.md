# Pick a Brick Prize Draw, Firebase Edition

A static GitHub Pages web app with:

- `index.html` for the participant board
- `admin.html` for organiser controls
- Firebase Firestore online mode for multi-device real-time sync
- Offline mode using localStorage for poor connectivity
- Test mode that pre-fills email fields with generated test email addresses
- CSV export, winner history, configurable board size, reset, and closable winner banner

## Important offline caveat

Offline mode stores everything in the browser's localStorage. It is useful when the event Wi-Fi is unreliable, but it does **not** sync across different devices. Use the same device/browser for board and admin if you switch offline.

## Firebase setup

1. Create a Firebase project.
2. Create a Firestore database.
3. Register a Web App in Firebase Project Settings.
4. Copy the Firebase config into `firebase-config.js`.
5. Deploy these files to GitHub Pages.
6. Open `admin.html` first and use Reset Board to initialise the game.
7. Open `index.html` on the participant display.

## Suggested Firestore rules for a prototype

For a closed event prototype, you can start permissive and then tighten later:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write: if true;
    }
  }
}
```

This is intentionally not strong security. For a production draw, add authentication or a server-side admin endpoint.

## Files

- `index.html`: participant board only
- `admin.html`: organiser controls
- `shared.js`: state, Firebase/localStorage storage layer, helpers
- `board.js`: participant board logic
- `admin.js`: organiser controls
- `firebase-config.js`: paste your Firebase project config here
- `assets/`: brick images

## Quick test without Firebase

1. Open `admin.html`.
2. Turn on Offline mode.
3. Turn on Test mode.
4. Open `index.html` in the same browser.
5. Click bricks. Email fields will be pre-filled with generated test addresses.
