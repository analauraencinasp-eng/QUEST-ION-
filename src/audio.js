// audio.js — music, sound effects and NASA audio clips.
// MUSIC: 8-bit chiptune generated with WebAudio from a FIXED SEED per stage, so every game
// sounds exactly the same (same notes, same order). Short loops, crossfade between stages.
// SFX: the .wav files loaded by Phaser (assets/sfx). NASA clips: assets/nasa-audio (optional).
import { state } from './state.js';

// The team did not like the generated chiptune nor the effects playing on top of it, and is choosing another
// audio API. Until then music and sound effects are OFF; flip these two flags to bring them back.
// The narrator voice (voice.js) is separate and is not affected.
export const MUSIC_ENABLED = false;
export const SFX_ENABLED = false;

let ctx = null, master = null, current = null;
const STAGES = {
  // seed, tempo (BPM), scale (semitones from root), root MIDI note, wave of the lead
  title: { seed: 11, bpm: 96, scale: [0, 2, 4, 7, 9], root: 57, lead: 'square' },
  workshop: { seed: 23, bpm: 112, scale: [0, 2, 3, 5, 7, 10], root: 55, lead: 'square' },
  orbit: { seed: 37, bpm: 88, scale: [0, 2, 4, 6, 7, 11], root: 60, lead: 'triangle' },
  launch: { seed: 41, bpm: 132, scale: [0, 3, 5, 7, 10], root: 52, lead: 'sawtooth' },
  mars: { seed: 53, bpm: 100, scale: [0, 2, 3, 7, 8], root: 50, lead: 'square' },
  comms: { seed: 67, bpm: 104, scale: [0, 2, 5, 7, 9], root: 62, lead: 'triangle' },
  ending: { seed: 79, bpm: 92, scale: [0, 4, 7, 9, 11], root: 60, lead: 'square' }
};

// small deterministic PRNG (mulberry32): same seed → same sequence
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds the note pattern of a stage (pure function → tested in tests.js)
export function composeLoop(stage) {
  const def = STAGES[stage] || STAGES.title;
  const r = rng(def.seed);
  const steps = 32;
  const lead = [], bass = [];
  let idx = 2;
  for (let i = 0; i < steps; i++) {
    if (r() < 0.72) {
      idx = Math.max(0, Math.min(def.scale.length * 2 - 1, idx + Math.floor(r() * 5) - 2));
      const oct = Math.floor(idx / def.scale.length);
      lead.push(def.root + 12 + def.scale[idx % def.scale.length] + 12 * oct);
    } else lead.push(null);
    bass.push(i % 4 === 0 ? def.root - 12 + def.scale[Math.floor(r() * 3) % def.scale.length] : null);
  }
  return { bpm: def.bpm, lead, bass, wave: def.lead };
}

function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyVolume();
  } catch (e) { ctx = null; }
  return ctx;
}

export function applyVolume() {
  if (!master) return;
  master.gain.value = (state.settings.volume / 100) * 0.5;
}

function blip(time, hz, dur, wave, gainNode, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = wave; o.frequency.value = hz;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
  o.connect(g); g.connect(gainNode);
  o.start(time); o.stop(time + dur + 0.02);
}

// Starts (or crossfades to) the loop of a stage. Calling it again with the same stage does nothing.
export function playMusic(stage) {
  if (!MUSIC_ENABLED) return;
  if (current && current.stage === stage) return;
  stopMusic(true);
  if (!state.settings.music || typeof window === 'undefined' || !window.__questUnlocked) { current = { stage, pending: true }; return; }
  if (!ensureCtx()) return;
  if (ctx.state === 'suspended') ctx.resume();
  const loop = composeLoop(stage);
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);       // crossfade in
  bus.connect(master);
  const stepDur = 60 / loop.bpm / 2;                                    // eighth notes
  let step = 0, nextTime = ctx.currentTime + 0.1;
  const timer = setInterval(() => {
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % loop.lead.length;
      if (loop.lead[i] !== null) blip(nextTime, midiHz(loop.lead[i]), stepDur * 0.9, loop.wave, bus, 0.07);
      if (loop.bass[i] !== null) blip(nextTime, midiHz(loop.bass[i]), stepDur * 3.5, 'triangle', bus, 0.12);
      nextTime += stepDur; step++;
    }
  }, 60);
  current = { stage, bus, timer };
}

export function stopMusic(fade = false) {
  if (!current) return;
  const c = current; current = null;
  if (c.timer) clearInterval(c.timer);
  if (c.bus && ctx) {
    try {
      c.bus.gain.cancelScheduledValues(ctx.currentTime);
      c.bus.gain.setValueAtTime(c.bus.gain.value, ctx.currentTime);
      c.bus.gain.linearRampToValueAtTime(0, ctx.currentTime + (fade ? 1.2 : 0.05));
      setTimeout(() => { try { c.bus.disconnect(); } catch (e) { /* gone */ } }, 1400);
    } catch (e) { /* ignore */ }
  }
}

// re-apply after Settings changes (music on/off)
export function refreshMusic() {
  applyVolume();
  const stage = current && current.stage;
  if (!state.settings.music) { stopMusic(true); current = stage ? { stage, pending: true } : null; return; }
  if (stage && (current.pending || !current.timer)) { current = null; playMusic(stage); }
}

// browsers only allow sound after the first click / key: unlock on the first gesture anywhere
if (typeof window !== 'undefined') {
  window.__questUnlocked = true;
  window.__questUnlock = () => {
    if (!MUSIC_ENABLED) return;
    ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (current && current.pending) { const s = current.stage; current = null; playMusic(s); }
  };
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
