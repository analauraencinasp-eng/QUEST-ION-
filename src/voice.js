// voice.js — the narration voice, always the SAME in every game.
// Web Speech API, en-US. The voice is chosen deterministically from a preference list;
// if none exists, the first en-US voice sorted by name. Its voiceURI is stored and reused.
// Rate and pitch are fixed. Ready for pre-recorded files: if assets/voice/<lineId>.mp3
// exists (listed in manifest "voice"), it is played instead of text-to-speech.
import { state } from './state.js';

const PREFERRED = ['Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Microsoft Zira', 'Alex'];
const KEY = 'questionv1.voiceURI';
const RATE = 0.95, PITCH = 1.05;
let chosen = null, recorded = new Set(), audioEl = null;

export function registerRecordedLines(ids = []) { recorded = new Set(ids); }

// pure choice function (tested): voices = [{ name, lang, voiceURI }]
export function pickVoice(voices, savedURI) {
  if (!voices || !voices.length) return null;
  if (savedURI) { const v = voices.find((x) => x.voiceURI === savedURI); if (v) return v; }
  for (const pref of PREFERRED) {
    const v = voices.find((x) => x.name && x.name.startsWith(pref) && /^en[-_]US/i.test(x.lang || 'en-US'));
    if (v) return v;
  }
  const en = voices.filter((x) => /^en[-_]US/i.test(x.lang || '')).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return en[0] || null;
}

function synth() { return typeof window !== 'undefined' ? window.speechSynthesis : null; }

function choose() {
  const s = synth();
  if (!s) return null;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  chosen = pickVoice(s.getVoices(), saved);
  if (chosen) { try { localStorage.setItem(KEY, chosen.voiceURI); } catch (e) { /* ignore */ } }
  return chosen;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  choose();
  window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('voiceschanged', choose);
}

export function stopVoice() {
  try { const s = synth(); if (s) s.cancel(); } catch (e) { /* ignore */ }
  if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } audioEl = null; }
}

// speak(text, lineId?) — newest line wins
export function speak(text, lineId) {
  if (!state.settings.narration || !text) return;
  stopVoice();
  if (lineId && recorded.has(lineId) && typeof Audio !== 'undefined') {
    try { audioEl = new Audio(`assets/voice/${lineId}.mp3`); audioEl.volume = state.settings.volume / 100; audioEl.play(); return; } catch (e) { /* fall back to TTS */ }
  }
  const s = synth();
  if (!s) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (!chosen) choose();
    if (chosen) u.voice = chosen;
    u.lang = 'en-US'; u.rate = RATE; u.pitch = PITCH; u.volume = state.settings.volume / 100;
    s.speak(u);
  } catch (e) { /* narration is optional */ }
}
