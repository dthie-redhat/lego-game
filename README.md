# Pick a Brick Prize Draw

Static GitHub Pages app with Firebase Firestore sync and offline localStorage fallback.

## Files

- `index.html` - participant board
- `admin.html` - organiser console
- `styles.css` - all styling
- `shared.js` - shared game/Firebase/offline logic
- `board.js` - board page logic
- `admin.js` - admin controls
- `firebase-config.js` - paste your Firebase web app config here
- `assets/` - brick images generated from the supplied sample brick

## GitHub Pages deployment

Upload the contents of this folder directly to the repository root or to the folder you publish from GitHub Pages.

Important: `index.html`, `styles.css`, `shared.js`, `board.js`, `admin.html`, and the `assets` folder must sit together at the same level. Do not upload only the HTML files.

## Firebase setup

1. Create a Firebase project.
2. Add a Web App.
3. Enable Firestore Database.
4. Paste the Firebase web config into `firebase-config.js`.
5. In Firestore rules, for a short prototype you can start with open test rules, then tighten them before a real event.

Prototype-only rules example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      allow read, write: if true;
    }
  }
}
```

For a public event, use a simple admin token or authentication before exposing admin actions.

## Offline mode

Offline mode is selected from `admin.html`.

Caveat: offline mode uses `localStorage`, so it only shares state within the same browser/device. It is useful for poor connectivity, but it cannot sync a separate admin device with a separate display device.

## Test mode

Enable test mode in `admin.html` to auto-generate short fake email addresses such as `novahawk42@test.local` when clicking bricks.


## Latest changes
- The public winner banner now shows the winning brick number and matching email address.
- The public board no longer references the admin page.
- The header uses the supplied Red Hat and NTT logo image assets from `assets/`.

## Fix notes
- Logo display is constrained with CSS (`max-height`) so the supplied logo images do not dominate the banner.
- The public winner splash displays both the winning brick number and the winner email.
- The public page no longer mentions `admin.html`.


## Entry uniqueness

The board now checks submitted email addresses against the current game state before accepting a brick. Email comparison is case-insensitive and trimmed. Resetting the board clears all entries, winners, and the used-email list so the same person can enter again on a second event day.
