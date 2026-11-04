# Playball

Playball is an original, arcade-style football game for browsers, with a Capacitor setup for building an Android app. It uses its own name, artwork, and game presentation; it is inspired by the broad genre of modern football games and does not use eFootball branding or assets.

## Run the web game

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use **WASD** or the arrow keys to move, **Space** to shoot, and **R** to restart. On touch screens, use the on-screen direction buttons and SHOOT button.

Create a production web build with:

```bash
npm run build
```

## Build for Android

Install dependencies, create the Android platform project once, then build and sync the web game into it:

```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```

The final Android app bundle must be signed and tested in Android Studio before you can publish it. Publishing to Google Play requires Play Console access and is not performed by this repository setup.

## Project layout

- `index.html` — game page and HUD
- `src/game.js` — match logic, input, and canvas rendering
- `src/style.css` — responsive visual design and touch controls
- `assets/app-icon.svg` — original Playball icon artwork
- `capacitor.config.json` — Capacitor app identity and web build directory
