// a11y.js — accessibility helpers (owner: P2).
//   say(text): reads text aloud if Narration is on (Web Speech API, free) and always
//              writes it to a hidden aria-live region so screen readers hear it too.
//   applySettings(game): applies highContrast to the page.
// Reads state.settings. Writes nothing.

import { state } from './state.js';

let live = null;
function liveRegion() {
  if (live || typeof document === 'undefined') return live;
  live = document.getElementById('sr-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'sr-live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('role', 'status');
    live.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(live);
  }
  return live;
}

export function say(text) {
  if (!text) return;
  const clean = String(text).replace(/[✓⚠✕▸]/g, '').trim();
  const region = liveRegion();
  if (region) region.textContent = clean;
  if (!state.settings.narration) return;
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();               // newest sentence wins
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'es-MX';
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* narration is optional: never crash the game */ }
}

export function stopSpeech() {
  try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

export function applySettings() {
  if (typeof document === 'undefined') return;
  document.body.style.background = state.settings.highContrast ? '#000000' : '#0d0c1c';
}
