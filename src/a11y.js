// a11y.js — say(text): ALWAYS writes to the hidden aria-live region (screen readers),
// and reads it aloud with the fixed voice when Narration = ON.
import { speak, stopVoice } from './voice.js';

let live = null;
function region() {
  if (live || typeof document === 'undefined') return live;
  live = document.getElementById('sr-live');
  return live;
}

export function say(text, lineId) {
  if (!text) return;
  const clean = String(text).replace(/[✓✕▶◀☰▸]/g, '').replace(/\s+/g, ' ').trim();
  const r = region();
  if (r) r.textContent = clean;
  speak(clean, lineId);
}

export function quiet() { stopVoice(); }
