# Pick a Brick Prize Draw

A static web app for a conference stand prize draw. Attendees pick a number from 1 to 100. Once selected, the brick flips upside down and cannot be picked again on that device/browser.

## Files

- `index.html` - app structure
- `styles.css` - layout and brick styling
- `app.js` - board logic, local storage, export and draw buttons

## Run locally

Open `index.html` in a browser.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `pick-a-brick`.
2. Upload these three files to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.
6. GitHub will publish the site at your Pages URL.

## Important note

This app stores selected numbers in the browser's `localStorage`. That means it is perfect for one tablet, one laptop, or one shared screen at the stand. If several devices open the page, each device will have its own independent board.

For a multi-device shared board, you would need a small backend/database such as Firebase, Supabase, or a hosted form/database service.
