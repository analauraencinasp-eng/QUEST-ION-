// server.mjs — local web server for QUEST(ION) + the Gemini text-to-speech narrator.
//
//   npm install      (once)
//   npm start        → http://localhost:8080
//
// It serves the game files (same as Live Server) and adds two endpoints:
//   GET  /api/horizons        → real Earth/Mars positions + velocities from JPL Horizons (orbit planner, Screen 12)
//   POST /api/tts  { text }  → audio/wav spoken by the fixed narrator (Gemini TTS, voice "Sulafat", en-US)
//   GET  /api/tts/health     → { ok, model, voice }
// The API key is read ONLY here, from the environment or .env.local (git-ignored). It never reaches the browser.
//
// Cache: every generated clip is saved to assets/voice-cache/<key>.wav and listed in assets/voice-cache/index.json,
// so the same line is never generated twice. If you commit that folder, GitHub Pages (no backend) can still play
// every cached line with the same voice.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { voiceKey, cleanForSpeech } from './src/voicekey.js';
import { fetchEphemeris } from './src/horizons.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ---------- config ----------
function loadEnvFile(file) {
  try {
    for (const line of fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* file is optional */ }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

const PORT = Number(process.env.PORT) || 8080;
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
// ONE fixed narrator: never change per request.
const VOICE = 'Sulafat';
const LANGUAGE = 'en-US';
const STYLE = 'Speak as a warm, confident female American mission-control specialist guiding a space exploration mission. '
  + 'Clear articulation, natural American English accent, calm and reassuring delivery, moderate speaking pace, '
  + 'subtle excitement when announcing discoveries. Professional but approachable.';
const MAX_CHARS = 3000;

const CACHE_DIR = path.join(ROOT, 'assets', 'voice-cache');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
fs.mkdirSync(CACHE_DIR, { recursive: true });
let index = {};
try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')).clips || {}; } catch (e) { index = {}; }
function saveIndex() {
  fs.writeFileSync(INDEX_FILE, JSON.stringify({ voice: VOICE, language: LANGUAGE, clips: index }, null, 1));
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY, apiVersion: 'v1beta' }) : null;
const inflight = new Map();     // key → Promise<Buffer> (two requests for the same line share one generation)

async function generate(text) {
  const key = voiceKey(text);
  const file = path.join(CACHE_DIR, `${key}.wav`);
  if (index[key] && fs.existsSync(file)) return { key, buf: fs.readFileSync(file), cached: true };
  if (inflight.has(key)) return { key, buf: await inflight.get(key), cached: true };
  if (!ai) throw Object.assign(new Error('GEMINI_API_KEY is not set (add it to .env.local)'), { status: 503 });
  const job = (async () => {
    const res = await ai.interactions.create({
      model: MODEL,
      store: false,
      input: [{ type: 'user_input', content: [{ type: 'text', text,
        annotations: [{ type: 'speech_metadata', style: STYLE, start_index: 0, end_index: Buffer.byteLength(text) }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: VOICE, language: LANGUAGE }] }
    });
    const audio = res && res.output_audio;
    if (!audio || !audio.data) throw Object.assign(new Error('Gemini returned no audio'), { status: 502 });
    let buf = Buffer.from(audio.data, 'base64');
    if (buf.subarray(0, 4).toString() !== 'RIFF') buf = pcmToWav(buf, audio.sample_rate || 24000);   // raw PCM → WAV
    fs.writeFileSync(file, buf);
    index[key] = { chars: text.length, text: text.slice(0, 80) };
    saveIndex();
    return buf;
  })();
  inflight.set(key, job);
  try { return { key, buf: await job, cached: false }; } finally { inflight.delete(key); }
}

function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// ---------- JPL Horizons (Screen 12 orbit planner) ----------
// GET /api/horizons → real Earth + Mars state vectors (positions + velocities) from JPL Horizons, asked live once and
// kept in memory and in .horizons-cache.json (git-ignored) for 24 h. If Horizons does not answer: 502, and the game
// uses its saved copy data/ephemeris_mer.json (also real Horizons data). No API key is needed.
const HZ_CACHE = path.join(ROOT, '.horizons-cache.json');
const HZ_MAX_AGE = 24 * 3600 * 1000;
let hz = null, hzJob = null;
try { hz = JSON.parse(fs.readFileSync(HZ_CACHE, 'utf8')); } catch (e) { hz = null; }
async function horizons() {
  if (hz && Date.now() - Date.parse(hz.fetched) < HZ_MAX_AGE) return hz;
  if (!hzJob) hzJob = fetchEphemeris(fetch).then((d) => { hz = d; try { fs.writeFileSync(HZ_CACHE, JSON.stringify(d)); } catch (e) { /* ignore */ } return d; })
    .finally(() => { hzJob = null; });
  return hzJob;
}

// ---------- static files ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  const parts = path.relative(ROOT, file).split(path.sep);
  // never serve anything outside the project, dotfiles (.env.local!), node_modules or the server itself
  if (!file.startsWith(ROOT) || parts.some((p) => p.startsWith('.')) || parts[0] === 'node_modules' || parts[0] === 'server.mjs') {
    res.writeHead(404); res.end('Not found'); return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 64 * 1024) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/tts/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: !!ai, model: MODEL, voice: VOICE, language: LANGUAGE }));
    return;
  }
  if (url.pathname === '/api/horizons') {
    try {
      const d = await horizons();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(d));
    } catch (e) {
      console.warn('[horizons]', String(e.message).slice(0, 200));
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'JPL Horizons did not answer. The game will use its saved copy.' }));
    }
    return;
  }
  if (url.pathname === '/api/tts') {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      const text = cleanForSpeech(body.text || '');
      if (!text) throw Object.assign(new Error('Empty text'), { status: 400 });
      if (text.length > MAX_CHARS) throw Object.assign(new Error(`Text longer than ${MAX_CHARS} characters`), { status: 413 });
      const { key, buf, cached } = await generate(text);
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': buf.length, 'X-Voice-Key': key, 'X-Voice-Cached': String(cached) });
      res.end(buf);
    } catch (e) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
      console.warn('[tts]', status, String(e.message).slice(0, 300));
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: status === 429 ? 'Narrator rate limit reached, try again in a moment.' : 'Narration failed.' }));
    }
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`QUEST(ION) running at http://localhost:${PORT}`);
  console.log(ai ? `Narrator: Gemini ${MODEL}, voice ${VOICE} (${LANGUAGE})` : 'Narrator: GEMINI_API_KEY missing → the game falls back to the browser voice.');
});
