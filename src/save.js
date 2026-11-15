// save.js — localStorage: settings and progress are stored separately, so NEW GAME
// can wipe the progress and keep the settings. Every access is wrapped in try/catch
// (private windows can block storage; the game must still run).
import { state, defaultSettings, hydrate, serialize } from './state.js';

const KEY_SETTINGS = 'questionv1.settings';
const KEY_GAME = 'questionv1.save';

function store() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }

export function loadSettings() {
  try {
    const raw = store() && store().getItem(KEY_SETTINGS);
    if (raw) state.settings = { ...defaultSettings(), ...JSON.parse(raw) };
  } catch (e) { /* keep defaults */ }
  return state.settings;
}

export function saveSettings() {
  try { store() && store().setItem(KEY_SETTINGS, JSON.stringify(state.settings)); } catch (e) { /* ignore */ }
}

export function hasSave() {
  try {
    const raw = store() && store().getItem(KEY_GAME);
    const scr = raw && JSON.parse(raw).screen;
    return !!(scr && scr.key && scr.key !== 'TitleScene' && scr.key !== 'BootScene');
  } catch (e) { return false; }
}

export function saveGame() {
  try { store() && store().setItem(KEY_GAME, JSON.stringify(serialize())); } catch (e) { /* ignore */ }
}

export function loadGame() {
  try {
    const raw = store() && store().getItem(KEY_GAME);
    if (!raw) return false;
    hydrate(JSON.parse(raw));
    return true;
  } catch (e) { return false; }
}

export function clearGame() {
  try { store() && store().removeItem(KEY_GAME); } catch (e) { /* ignore */ }
}
