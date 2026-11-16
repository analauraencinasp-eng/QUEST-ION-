// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// audio.js — background music, sound effects and NASA audio clips.
// MUSIC: two local tracks (assets/music), one HTMLAudioElement each, created once and reused:
//   ambience.mp3  → every regular screen. Loops. Pauses (keeps its position) while a mini-game is open.
//   minigame.mp3  → only while a scene from MINIGAME_SCENES is on screen. Loops. Rewinds when you leave.
// The router calls syncMusic(sceneKey) on every screen change, so the track never restarts between
// regular screens. Switching fades the old track out FIRST and only then fades the new one in:
// the two tracks are never heard at the same time.
// Volume: Settings → Music ON/OFF + Music volume (default 25 %, saved with the settings).
// While the narrator voice speaks the music ducks to DUCK × volume.
// Browsers block audio until the first click / key: a blocked play() is retried on that gesture.
// SFX: the .wav files loaded by Phaser (assets/sfx). NASA clips: assets/nasa-audio (optional).
import { state } from './state.js';
import { isSpeaking } from './voice.js';

export const SFX_ENABLED = false;     // the team turned effects off; flip to bring them back

export const MUSIC_TRACKS = { ambience: 'assets/music/ambience.mp3', minigame: 'assets/music/minigame.mp3' };
// every scene in src/minigames (team decision): these play minigame.mp3, everything else ambience.mp3
export const MINIGAME_SCENES = new Set(['WorkshopScene', 'WarehouseScene', 'AssemblyScene', 'OrbitScene',
  'MeteorScene', 'RockHunterScene', 'CommsScene', 'SignalRunScene']);
export const DEFAULT_MUSIC_VOLUME = 25;
const DUCK = 0.35;                    // music level while the narrator talks
const FADE_OUT_MS = 450, FADE_IN_MS = 900, FADE_ADJUST_MS = 250;
const isBrowser = typeof window !== 'undefined' && typeof Audio !== 'undefined';

export function trackFor(sceneKey) { return MINIGAME_SCENES.has(sceneKey) ? 'minigame' : 'ambience'; }

// target loudness 0..1 of the music right now (pure → tested)
export function musicLevel(settings, ducked) {
  if (!settings.music) return 0;
  const v = settings.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  return Math.max(0, Math.min(1, (v / 100) * (ducked ? DUCK : 1)));
}

const els = {};                      // name → HTMLAudioElement (at most one per track, ever)
const fades = new Map();             // element → interval id (one fade per element)
let wanted = null;                   // track the current screen asks for
let gen = 0;                         // bumps on every switch: callbacks of older switches are ignored
let blocked = false;                 // the browser refused play() before the first gesture
let ducked = false;

function el(name) {
  if (!els[name]) {
    const a = new Audio(MUSIC_TRACKS[name]);
    a.loop = true; a.preload = 'auto'; a.volume = 0;
    els[name] = a;
  }
  return els[name];
}

function fade(a, to, ms, done) {
  if (fades.has(a)) { clearInterval(fades.get(a)); fades.delete(a); }
  const from = a.volume, t0 = Date.now();
  if (ms <= 0 || Math.abs(from - to) < 0.005) { a.volume = to; if (done) done(); return; }
  const id = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) { clearInterval(id); fades.delete(a); if (done) done(); }
  }, 30);
  fades.set(a, id);
}

function tryPlay(a) {
  const p = a.play();
  if (p && p.catch) p.catch((err) => { if (err && err.name === 'NotAllowedError') blocked = true; });
}

function silence(a, g, after) {
  fade(a, 0, FADE_OUT_MS, () => {
    if (g !== gen) return;                                   // a newer switch took over this element
    a.pause();
    if (a === els.minigame) a.currentTime = 0;               // leaving the mini-game: next time starts fresh
    if (after) after();
  });
}

function apply() {
  if (!isBrowser || !wanted) return;
  const g = ++gen;
  const level = musicLevel(state.settings, ducked);
  const playingOthers = Object.keys(els).filter((n) => n !== wanted && !els[n].paused).map((n) => els[n]);
  if (level === 0 && !state.settings.music) {               // music OFF: fade everything out and pause
    for (const a of Object.values(els)) if (!a.paused) silence(a, g);
    return;
  }
  const start = () => {
    if (g !== gen) return;
    const a = el(wanted);
    if (a.paused) { a.volume = 0; tryPlay(a); fade(a, level, FADE_IN_MS); }
    else fade(a, level, FADE_ADJUST_MS);
  };
  if (!playingOthers.length) { start(); return; }
  let left = playingOthers.length;
  for (const a of playingOthers) silence(a, g, () => { if (--left === 0) start(); });
}

// called by the router every time a screen arrives
export function syncMusic(sceneKey) {
  if (!sceneKey || sceneKey === 'BootScene') return;
  const next = trackFor(sceneKey);
  if (next === wanted && !blocked) {
    const a = els[next];
    if (a && !a.paused) return;                              // already playing: never restart
  }
  wanted = next;
  apply();
}

// Settings changed (music ON/OFF or music volume)
export function refreshMusic() { apply(); }
export function applyVolume() {
  if (!isBrowser || !wanted) return;
  const a = els[wanted];
  if (a && !a.paused) fade(a, musicLevel(state.settings, ducked), FADE_ADJUST_MS);
}

// stop and release everything (not used during play; handy for tests / a future "quit")
export function stopMusic() {
  gen++;
  for (const a of Object.values(els)) { if (fades.has(a)) clearInterval(fades.get(a)); a.pause(); a.currentTime = 0; }
  fades.clear(); wanted = null;
}

export function currentMusic() {
  const playing = Object.keys(els).filter((n) => !els[n].paused);
  const at = {}; for (const n of Object.keys(els)) at[n] = Math.round(els[n].currentTime * 10) / 10;
  return { wanted, playing, volume: wanted && els[wanted] ? els[wanted].volume : 0, blocked, at };
}

if (isBrowser && typeof document !== 'undefined') {
  // first click / key anywhere: retry a play() the browser blocked
  const unlock = () => { if (blocked) { blocked = false; apply(); } };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, unlock, true);
  // tab hidden → pause (keeps position); visible again → resume the wanted track
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { gen++; for (const a of Object.values(els)) { if (fades.has(a)) { clearInterval(fades.get(a)); fades.delete(a); } a.pause(); } }
    else apply();
  });
  // duck under the narrator voice
  setInterval(() => {
    const now = isSpeaking();
    if (now !== ducked) { ducked = now; applyVolume(); }
  }, 250);
}

// ---------- sound effects (Phaser sound manager) ----------
export function sfx(scene, key) {
  if (!SFX_ENABLED || !state.settings.sfx) return;
  try {
    if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: (state.settings.volume / 100) * 0.6 });
  } catch (e) { /* sound is optional */ }
}

// NASA audio clips (assets/nasa-audio): play a short segment [offset, duration] of a clip
export function nasaClip(scene, key, offset = 0, duration) {
  if (!SFX_ENABLED || !state.settings.sfx) return;
  try {
    if (!scene.cache.audio.exists(key)) return;
    const snd = scene.sound.add(key, { volume: (state.settings.volume / 100) * 0.8 });
    snd.play({ seek: offset });
    if (duration) scene.time.delayedCall(duration * 1000, () => { try { snd.stop(); snd.destroy(); } catch (e) { /* ignore */ } });
  } catch (e) { /* optional */ }
}
