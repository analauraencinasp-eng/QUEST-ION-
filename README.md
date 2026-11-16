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

## Use of Super Intelligence (SI)

SI tools were used in QUEST(ION). Below is where and how. No SI-generated content uses, contains or modifies NASA branding, logos, flags or mission identifiers.

| Area | SI tool | How it was used | Human role |
|---|---|---|---|
| **Code** | Claude Code (Anthropic) | Generated most of the game code (Phaser scenes, mini-games, game state, orbit calculation, local server) from a detailed specification written by the team (`PROMPT_CLAUDE_CODE.md`). | The team wrote the specification and the Figma design, tested the game, made later edits and bug fixes, and made the final design decisions (`DECISIONS.md`). |
| **Educational content** | Claude Code (Anthropic) | Helped look up and draft educational text and quiz questions based on official NASA/JPL pages. Each fact carries a `source_url` (see `SOURCES.md`). | The team reviewed content against the sources. |
| **Narrator audio** | Google Gemini TTS (`gemini-3.8-flash-tts`, voice "Sulafat") | All narrator speech and the "Podcast" review format are SI-generated audio. Files are in `assets/voice-cache/`. | The team wrote or approved the narrated text.  |
| **Images / art** | **[None — all art was designed by the team in Figma.]** | **[If any image was SI-generated, list it here and add a visible "SI-generated" watermark.]** | — |
| **Music** | **[None — Pixabay tracks; confirm they are not AI-generated and fill in author and track names in `CREDITS.md`.]** | — | — |
| **Documentation** | Claude (Anthropic) | Helped draft the project summary and this README. | Reviewed by the team. |

**Where to find SI-generated elements:** code files carry an SI acknowledgment in their header comments; narrator audio is listed in `assets/voice-cache/index.json` and noted in the audio files' metadata.
