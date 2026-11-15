# QUEST(ION) starter kit: what we kept from `space-mission-adventure` (Juno)

The old game was a Juno/Jupiter mission in Spanish with a different flow. Everything tied to Juno, Jupiter, Europa,
JunoCam, Waves, the 5 Juno endings and its screens was **deleted**. Only the parts that save work for the new MER game
(Spirit & Opportunity, "Hunt for Ancient Water", English UI) are here.

## reuse/  → copy into the new project and adapt

| File | What it gives you | What to change |
|---|---|---|
| `ds/Stack.js` | LIFO stack (push/pop/peek/remove) | nothing; update header comment with new uses |
| `ds/Queue.js` | FIFO queue on linked nodes, O(1) enqueue/dequeue | nothing |
| `ds/LinkedList.js` | singly linked list with tail pointer | nothing |
| `ds/MinHeap.js` | priority queue (push/pop O(log n), peek O(1)) | nothing |
| `ds/Graph.js` | directed graph + BFS + distance | nothing |
| `ds/sorts.js` | insertionSort (stable) + linearSearch | nothing |
| `core/index.html` | "click to play" overlay (unlocks audio + keyboard), aria-live region, Phaser global + ES module entry | English texts, title "QUEST(ION)", `lang="en"`, load `vendor/phaser.min.js` |
| `core/game.js` | Phaser config (FIT scale, pixelArt) | 1280×720, new scene list |
| `core/BootScene.js` | loads a JSON manifest, then every asset; missing file → placeholder, never crashes; waits for pixel fonts | read the new `data/manifest.json`; English text |
| `core/a11y.js` | `say()` = Web Speech + aria-live; `stopSpeech()` | `en-US`, FIXED voice (see prompt), volume/rate from settings |
| `core/ui.js` | `freshScene()` (Phaser reuses scene objects: call first in every `create()`), text/panel/button/modal/menu helpers, `burst()` particles, `shake()`, `sz()` text scaling, placeholder images | remove Juno-only parts (`applyDesign`, `progressBar` steps, concept cards, director); keep the helpers; text size S/M/L instead of largeText |
| `core/state.js` | single shared state + `resetState()` pattern | replace fields with the MER state model in the prompt; add localStorage save/load |
| `tests/tests.js`, `tests-run.mjs`, `tests.html` | 11 passing data-structure tests (normal + edge cases); browser and Node runners | add tests for the new uses (nav stack, quiz tiers, scoring tree…) |
| `tests/smoke-test.mjs` | plays the game with a fake Phaser in Node to catch JS errors | rewrite the scripted run for the new flow (keep the fake-Phaser part) |

## reference/  → read for patterns, do NOT copy as-is (Juno logic inside)

| File | Useful pattern |
|---|---|
| `WorkshopScene.js` | walking avatar + proximity to stations, drag & drop into slots, Z = undo with a Stack, calibration mini-games (cables / align / sequence) |
| `TitleScene.js` | settings menu with toggles that persist, keyboard + mouse menu |
| `SolarMapScene.js` | clickable planets, locked planets with "coming soon" |
| `LaunchScene.js` | timing bar ("launch window") + aim with a dotted predicted path |
| `TransmitScene.js` | packets → insertionSort "sort by value" → Queue sends them one by one; countdown window |
| `ReportScene.js` | multi-page report, LinkedList discovery log |
| `Hud.js` | resource bars + "domino effect": Graph + BFS lights affected bars by distance |
| `rules.js` | pure functions for formulas + a DECISION TREE (`walkTree`) that can show the path it took |
| `make-art.cjs` | Node script that writes pixel PNGs and **generates .wav sfx by code** (square waves, seeded RNG) |
| `ESTRUCTURAS.md` | rubric document template (justification, Big-O, "what if we swapped it") → rewrite for the new game |

## assets/
- `sfx/` 6 code-generated sounds (pickup, place, error, launch, photo, alarm). Free to use.
- `icons/` generic 32×32 pixel icons (coin, weight, bolt, heart, lock, wrench, team, rockets, solar, battery, antenna, storage, shield, earth, rocket) + `art-solarsystem.png` (960×540 fallback background). Made by the team; no NASA logos.

## Deleted (and why)
Juno/Jupiter scenes (Jupiter, Ending, MissionControl, Tests/shake test), `content.json` (Juno numbers and Spanish texts),
JunoCam/Europa/Jupiter/endings images, Juno component icons (waves, magnetometer, junocam, propulsion), the old character
faces and role sprites (they carry NASA logos on the suits; the new game uses the team's Figma characters),
`README.md`, `REVISION.md`, `credits.txt`, `GUION-VIDEO-Y-PITCH.md` (all about Juno).
