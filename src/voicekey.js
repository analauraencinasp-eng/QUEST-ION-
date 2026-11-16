// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// voicekey.js — shared by the browser (voice.js) and the backend (server.mjs) so both compute the SAME
// cache key for a line of narration. Pure functions, no dependencies.

// Strip decorative symbols that a voice would read badly, collapse spaces.
export function cleanForSpeech(text) {
  return String(text ?? '')
    .replace(/[✓✔]/g, ' done ').replace(/[✕✗]/g, ' ')
    .replace(/[▶◀☰▸►◄■□•›→←↑↓🔒🔊🔠🎚🎵🔔✨📋✎⏸]/gu, ' ')
    .replace(/\[x\]/gi, 'done:').replace(/\[ \]/g, '')
    .replace(/\s*->\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 64-bit FNV-1a style hash as 16 hex chars (two 32-bit lanes). Same result in Node and every browser.
export function voiceKey(text) {
  const s = cleanForSpeech(text);
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193 + 0x200) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
