# Credits · QUEST(ION)

## Music
| File | Use in the game | Source | License |
|---|---|---|---|
| `assets/music/ambience.mp3` | Background music for the whole game | Pixabay Music | Pixabay Content License |
| `assets/music/minigame.mp3` | Inside the mini-games | Pixabay Music | Pixabay Content License |

## Fonts
- Press Start 2P and VT323 — SIL Open Font License (see `assets/fonts/OFL-*.txt`).

## Data
- Real Earth and Mars positions: NASA/JPL Horizons (`data/ephemeris_mer.json`, `/api/horizons`).
- Educational data: official NASA/JPL pages, listed in `SOURCES.md` and on the game's SOURCES screen.

## Use of Super Intelligence (SI)

SI tools were used in QUEST(ION). No SI-generated content uses, contains or modifies NASA branding, logos, flags or mission identifiers.

| Area | SI tool | How it was used | Human role |
|---|---|---|---|
| Code | Claude Code (Anthropic) | Generated most of the game code (Phaser scenes, mini-games, game state, orbit calculation, local server) from a detailed specification written by the team (`PROMPT_CLAUDE_CODE.md`). | The team wrote the specification and the Figma design, tested the game, made later edits and bug fixes, and made the final design decisions (`DECISIONS.md`). |
| Educational content | Claude Code (Anthropic) | Helped look up and draft educational text and quiz questions based on official NASA/JPL pages. Each fact carries a `source_url` (see `SOURCES.md`). | The team reviewed content against the sources.|
| Narrator audio | Google Gemini TTS (`gemini-3.8-flash-tts`, voice "Sulafat") | All narrator speech and the "Podcast" review format are SI-generated audio. Files are in `assets/voice-cache/`. | The team wrote or approved the narrated text. |
| Images / art | None |
| Music | None | None |