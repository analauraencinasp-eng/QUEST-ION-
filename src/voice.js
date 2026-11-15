// voice.js — the ONE narrator of the game: Gemini TTS, voice "Sulafat", en-US (fixed, see server.mjs).
//
//   speak(text)                 interrupt whatever is being said and say this (newest wins, never overlaps)
//   speak(text, { queue:true }) say it after the current line (used to read the whole screen after the mentor)
//   stopVoice()                 stop the current line and empty the queue
//
// Where the audio comes from, in order:
//   1. memory cache (same line already played in this session)
//   2. assets/voice-cache/<key>.wav listed in assets/voice-cache/index.json (pre-generated, works on GitHub Pages)
//   3. POST /api/tts on our backend (server.mjs) → Gemini. The API key lives only on the backend.
//   4. if there is no backend or it fails: the browser's Web Speech voice, so narration is never silent.
// Audio is fetched in the background (the game never waits for it). A small "narrator" indicator shows while
// a line is being generated. Browsers block audio before the first click/key: the line is kept and played
// on the first user gesture.
import { state } from './state.js';
import { voiceKey, cleanForSpeech } from './voicekey.js';

const PREFERRED = ['Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Microsoft Zira', 'Alex'];
const KEY = 'questionv1.voiceURI';
const RATE = 0.95, PITCH = 1.05;
let rateMul = 1;   // playback speed set by the review podcast (0.8× / 1× / 1.25×)
export function setVoiceRate(r) { rateMul = r || 1; if (current && current.audio) current.audio.playbackRate = rateMul; }
export function voiceAvailable() { return isBrowser && (typeof Audio !== 'undefined' || !!synth()); }
const isBrowser = typeof window !== 'undefined';

let recorded = new Set();
export function registerRecordedLines(ids = []) { recorded = new Set(ids); }

// ---------- Web Speech fallback (deterministic voice, tested) ----------
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
let chosen = null;
function synth() { return isBrowser ? window.speechSynthesis : null; }
function choose() {
  const s = synth(); if (!s) return null;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  chosen = pickVoice(s.getVoices(), saved);
  if (chosen) { try { localStorage.setItem(KEY, chosen.voiceURI); } catch (e) { /* ignore */ } }
  return chosen;
}
if (isBrowser && window.speechSynthesis && window.speechSynthesis.addEventListener) {
  choose();
  window.speechSynthesis.addEventListener('voiceschanged', choose);
}

// ---------- sources ----------
const memory = new Map();          // key → object URL
let staticIndex = null;            // { key: {...} } from assets/voice-cache/index.json
let backend = null;                // null = unknown, true / false after the health check
let backendDownUntil = 0;
let failures = 0;

function hostHasNoBackend() {
  if (!isBrowser) return true;
  const h = window.location.hostname;
  return window.location.protocol === 'file:' || /github\.io$/i.test(h);
}

const ready = isBrowser ? (async () => {
  try {
    const r = await fetch('assets/voice-cache/index.json', { cache: 'no-cache' });
    if (r.ok) staticIndex = (await r.json()).clips || {};
  } catch (e) { staticIndex = {}; }
  if (hostHasNoBackend()) { backend = false; return; }
  try {
    const r = await fetch('api/tts/health', { cache: 'no-store' });
    backend = r.ok && (await r.json()).ok === true;
  } catch (e) { backend = false; }
})() : Promise.resolve();

async function fetchClip(text, key) {
  if (memory.has(key)) return memory.get(key);
  await ready;
  if (staticIndex && staticIndex[key]) return `assets/voice-cache/${key}.wav`;
  if (!backend || Date.now() < backendDownUntil) return null;
  loading(+1);
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 30000);
    const r = await fetch('api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: ctrl && ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`tts ${r.status}`);
    const url = URL.createObjectURL(await r.blob());
    memory.set(key, url);
    if (memory.size > 300) { const [k, u] = memory.entries().next().value; URL.revokeObjectURL(u); memory.delete(k); }
    failures = 0;
    return url;
  } catch (e) {
    failures += 1;
    if (failures >= 3) { backendDownUntil = Date.now() + 60000; failures = 0; }   // rate limit / offline: rest a minute
    return null;
  } finally { loading(-1); }
}

// ---------- loading indicator (DOM, outside the canvas) ----------
let pendingLoads = 0, badge = null;
function loading(d) {
  pendingLoads = Math.max(0, pendingLoads + d);
  if (!isBrowser || typeof document === 'undefined') return;
  if (!badge) {
    badge = document.createElement('div');
    badge.setAttribute('aria-hidden', 'true');
    badge.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:20;padding:4px 10px;opacity:.92;'
      + 'background:#141a3a;border:3px solid #56c8e8;color:#f4f1e6;font:18px "VT323",monospace;pointer-events:none;display:none';
    badge.textContent = '🔊 Narrator is preparing audio…';
    document.body.appendChild(badge);
  }
  badge.style.display = pendingLoads > 0 ? 'block' : 'none';
}

// ---------- playback queue (never two lines at the same time) ----------
let queue = [];
let current = null;        // { audio } or { utter }
let gen = 0;               // bumps on every interrupt: stale async work is ignored
let waitingGesture = null; // a play() the browser blocked until the first click / key

export function stopVoice() {
  gen += 1;
  queue = [];
  if (current && current.audio) { try { current.audio.pause(); current.audio.src = ''; } catch (e) { /* ignore */ } }
  try { const s = synth(); if (s) s.cancel(); } catch (e) { /* ignore */ }
  current = null;
  waitingGesture = null;
}

export function isSpeaking() { return !!current || queue.length > 0; }

export function speak(text, opts = {}) {
  if (!state.settings.narration) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  if (!opts.queue) stopVoice();
  const key = voiceKey(clean);
  const item = { text: clean, key, gen, lineId: opts.lineId };
  item.src = item.lineId && recorded.has(item.lineId) ? Promise.resolve(`assets/voice/${item.lineId}.mp3`) : fetchClip(clean, key);
  queue.push(item);
  if (!current) playNext();
}

async function playNext() {
  const item = queue.shift();
  if (!item) { current = null; return; }
  const myGen = gen;
  current = { item };
  const url = await item.src;
  if (myGen !== gen) return;                       // interrupted while loading
  const done = () => { if (myGen === gen) { current = null; playNext(); } };
  if (url && typeof Audio !== 'undefined') {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, state.settings.volume / 100));
    audio.playbackRate = rateMul;
    current = { item, audio };
    audio.onended = done;
    audio.onerror = () => { if (myGen === gen) webSpeech(item.text, done, myGen); };
    const p = audio.play();
    if (p && p.catch) p.catch((err) => {
      if (myGen !== gen) return;
      if (err && err.name === 'NotAllowedError') waitingGesture = () => audio.play().catch(() => done());
      else webSpeech(item.text, done, myGen);
    });
    return;
  }
  webSpeech(item.text, done, myGen);
}

function webSpeech(text, done, myGen) {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') { done(); return; }
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (!chosen) choose();
    if (chosen) u.voice = chosen;
    u.lang = 'en-US'; u.rate = RATE * rateMul; u.pitch = PITCH; u.volume = state.settings.volume / 100;
    u.onend = done; u.onerror = done;
    current = { utter: u };
    s.speak(u);
  } catch (e) { if (myGen === gen) done(); }
}

// Browsers only allow sound after a click or key press: replay the blocked line on the first gesture.
export function unlockVoice() {
  if (waitingGesture) { const f = waitingGesture; waitingGesture = null; f(); }
}
if (isBrowser && typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, unlockVoice, true);
}
