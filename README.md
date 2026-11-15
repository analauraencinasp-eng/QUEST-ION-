# QUEST(ION)

Educational pixel-art game (Phaser 3, no build step) for NASA Space Apps 2026: design a mission to Mars inspired by Spirit & Opportunity.

## Run it

```bash
npm install      # once (installs the Google Gen AI SDK for the narrator)
npm start        # → http://localhost:8080
```

`npm start` runs `server.mjs`. It serves the game and the narrator endpoint (`POST /api/tts`).

Live Server still works, but it has no backend: the narrator then uses lines already in `assets/voice-cache/`, or the browser's built-in voice.

## Narrator (Gemini TTS)

- One fixed voice: Gemini `gemini-3.8-flash-tts`, voice **Sulafat**, `en-US`, with the mission-control delivery style set in `server.mjs`.
- The API key is read **only by the backend**, from `GEMINI_API_KEY` in `.env.local` (git-ignored). It never goes to the browser or GitHub:

  ```
  GEMINI_API_KEY=your-key
  GEMINI_TTS_MODEL=gemini-3.8-flash-tts   # optional
  ```

- Each line is generated only once. It is saved to `assets/voice-cache/<key>.wav` and listed in `index.json`. If you commit that folder, GitHub Pages plays the same voice for every cached line.
- Code: `src/voice.js` (`speak(text)`, `stopVoice()`, a queue so lines never overlap, a loading badge, and a retry on the first click when the browser blocks audio), `src/a11y.js` (`say`, screen reading, hover reading), `server.mjs` (endpoint + cache).

## Accessibility

- When a screen opens, the narrator says the mentor's line first. Then it reads the whole screen from top to bottom and left to right, and ends with the keys you can use there.
- Hovering a button, link, card, station or any phrase reads it aloud and says how to use it. Moving between buttons with Tab does the same.
- Settings (☰): narration on/off, text size, volume, reduce motion.

## Audio

Music: two local tracks in `assets/music/` — `ambience.mp3` on every regular screen and `minigame.mp3` inside the mini-games (`MINIGAME_SCENES` in `src/audio.js`). The router switches them on every screen change with a fade (never both at once); Settings has Music ON/OFF and Music volume (25 % by default). Sound effects are still **off** (`SFX_ENABLED` in `src/audio.js`). The narrator does not depend on them.
