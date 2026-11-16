// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// router.js — moves between screens. Navigation history is a hand-written STACK:
//   go(scene, key, data, { transition })   push the current screen, play the transition, start the next
//   back(scene)                            pop the last screen and return to it (◀ BACK / Esc)
//   replace(...)                           go without pushing (screens you must not return to, e.g. mid-game)
// The stack is copied into state.history so CONTINUE restores it after a reload.
import Stack from './ds/Stack.js';
import { state } from './state.js';
import { saveGame } from './save.js';
import { cover, reveal } from './transitions.js';
import { quiet, readScreen } from './a11y.js';
import { syncMusic } from './audio.js';

export const history = new Stack();
let pendingReveal = 'fade';
let busy = false;

export function restoreHistory() {
  history.clear();
  for (const h of state.history || []) history.push(h);
}

function persist(key, data) {
  // the title screen is never saved as "where you are": CONTINUE must take you back INTO the mission
  if (key === 'TitleScene' || key === 'BootScene') return;
  state.screen = { key, data: data || {} };
  state.history = history.toArray();
  saveGame();
}

function start(scene, key, data, transition) {
  if (busy) return;
  busy = true;
  quiet();
  pendingReveal = transition || 'fade';
  cover(scene, transition, () => {
    busy = false;
    persist(key, data);
    scene.scene.start(key, data || {});
  });
}

export function go(scene, key, data = {}, opts = {}) {
  if (busy) return;
  const here = { key: scene.sys.settings ? scene.sys.settings.key : scene.sys.key, data: scene.routeData || {} };
  if (!opts.noHistory && here.key && here.key !== 'BootScene') history.push(here);
  start(scene, key, data, opts.transition);
}

export function replace(scene, key, data = {}, opts = {}) { start(scene, key, data, opts.transition); }

export function canGoBack() { return !history.isEmpty(); }

export function back(scene, opts = {}) {
  if (busy || history.isEmpty()) return false;
  const prev = history.pop();
  start(scene, prev.key, { ...(prev.data || {}), fromBack: true }, opts.transition || 'fade');
  return true;
}

// return to the previous screen with extra data (e.g. Station card → Workshop { installed: 'power' })
export function backWith(scene, extra = {}, opts = {}) {
  if (busy) return false;
  const prev = history.isEmpty() ? { key: opts.fallback, data: {} } : history.pop();
  if (!prev.key) return false;
  start(scene, prev.key, { ...(prev.data || {}), ...extra }, opts.transition || 'fade');
  return true;
}

// clears the history (NEW GAME, or after the mission is complete)
export function resetHistory() { history.clear(); state.history = []; }

// every scene calls this at the END of create(): remembers its data and plays the reveal
export function arrived(scene, data) {
  scene.routeData = { ...(data || {}) };
  delete scene.routeData.fromBack;
  for (const k of Object.keys(scene.routeData)) if (k.startsWith('_')) delete scene.routeData[k];   // one-shot data (_installed…)
  const key = scene.sys.settings ? scene.sys.settings.key : scene.sys.key;
  if (key !== 'BootScene' && key !== 'TitleScene') { state.screen = { key, data: scene.routeData }; }
  syncMusic(key);              // ambience on regular screens, minigame.mp3 in mini-games (never restarts)
  reveal(scene, pendingReveal);
  pendingReveal = 'fade';
  // accessibility: after the mentor's line, read the whole screen (top → bottom, left → right) + its keys
  scene.time.delayedCall(200, () => { if (scene.sys.isActive() && !scene.noAutoRead) readScreen(scene); });
}

export function isBusy() { return busy; }
export function _resetBusy() { busy = false; }
