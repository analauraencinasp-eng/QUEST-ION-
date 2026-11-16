// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// a11y.js — everything the narrator says goes through here. It ALWAYS writes to the hidden aria-live
// region (for screen readers) and speaks with the fixed narrator voice when Narration = ON.
//
//   say(text)            interrupt and say now (mentor lines, results, the thing under the cursor…)
//   sayAfter(text)       say after the current line
//   sayHover(text)       say what the pointer / keyboard focus is on (short delay so sweeping the mouse
//                        over many buttons doesn't fire a line for each one)
//   readScreen(scene)    read the WHOLE screen top → bottom, left → right, then how to play it (keys)
//   pointerReader(scene) hovering any phrase on screen reads it aloud
import { speak, stopVoice } from './voice.js';
import { cleanForSpeech } from './voicekey.js';
import { content } from './content.js';

let live = null;
function region() {
  if (live || typeof document === 'undefined') return live;
  live = document.getElementById('sr-live');
  return live;
}
function toRegion(clean) { const r = region(); if (r) r.textContent = clean; }

export function say(text, lineId) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  clearTimeout(hoverTimer);
  lastHover = '';
  toRegion(clean);
  speak(clean, { lineId });
}

export function sayAfter(text) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  toRegion(clean);
  speak(clean, { queue: true });
}

let hoverTimer = null, lastHover = '';
export function sayHover(text) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => { lastHover = clean; toRegion(clean); speak(clean); }, 220);
}

export function quiet() { clearTimeout(hoverTimer); stopVoice(); }

// ---------- what a focusable item says ----------
// kind: 'button' | 'link' | 'option' ; keys: extra key hint
export function describeItem(label, kind = 'button', keys = '') {
  const what = kind === 'link' ? 'link' : kind === 'option' ? 'option' : 'button';
  const how = kind === 'option' ? 'Click it, or press Enter, to select it.' : 'Click it, or press Enter, to use it.';
  return `${label}, ${what}. ${how}${keys ? ' ' + keys : ''}`;
}

// ---------- reading the screen ----------
function textOf(o) {
  const s = o._tw ? (o._full || '') : o.text;     // a typewriter text: read the full line, not half of it
  return cleanForSpeech(s);
}

function visibleTexts(scene) {
  const out = [];
  const walk = (list) => {
    for (const o of list) {
      if (!o || !o.visible || o.alpha === 0) continue;
      if (o.list && o.type === 'Container') { walk(o.list); continue; }
      if (o.type !== 'Text' || o._a11yIgnore) continue;
      const s = textOf(o);
      if (!s) continue;
      let b;
      try { b = o.getBounds(); } catch (e) { continue; }
      if (b.width < 2 || b.x > 1280 || b.y > 720 || b.right < 0 || b.bottom < 0) continue;
      out.push({ o, s, x: b.x, y: b.y, w: b.width, h: b.height, depth: o.depth || (o.parentContainer ? o.parentContainer.depth : 0) });
    }
  };
  walk(scene.children.list);
  return out;
}

// top → bottom, left → right (texts whose tops are within 18 px are the same row)
export function readingOrder(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const it of sorted) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < 18);
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

export function screenText(scene) {
  const top = scene.modals && scene.modals.length ? scene.modals[scene.modals.length - 1] : null;
  let items = visibleTexts(scene).filter((it) => !it.o._a11yMentor);
  if (top) items = items.filter((it) => it.depth >= top.depth - 2);
  const seen = new Set(), parts = [];
  for (const it of readingOrder(items)) {
    let s = it.s;
    if (it.o._a11yRole === 'button') s = `${s}, button`;
    else if (it.o._a11yRole === 'link') s = `${s}, link`;
    if (seen.has(s)) continue;
    seen.add(s);
    parts.push(/[.!?:]$/.test(s) ? s : `${s}.`);
  }
  return parts.join(' ');
}

export function controlsText(scene) {
  const key = (scene.chromeOpts && scene.chromeOpts.help) || (scene.sys && scene.sys.settings && scene.sys.settings.key);
  const help = content.help && content.help.screens ? (content.help.screens[key] || content.help.screens.default) : null;
  const ctrls = help && help.controls && help.controls.length ? `Keys on this screen: ${help.controls.join('. ')}.` : '';
  return `${ctrls} You can click any button with the mouse, or press Tab to move between buttons and Enter to press one. Press H for help.`;
}

// Called by the router a moment after every screen appears: queued AFTER the mentor's line.
export function readScreen(scene, o = {}) {
  const body = screenText(scene);
  if (!body) return;
  const full = `${o.intro || 'On screen:'} ${body} ${controlsText(scene)}`.slice(0, 2800);
  if (o.now) say(full); else sayAfter(full);
}

// Hovering any phrase reads it (buttons, links and cards announce themselves in widgets.js).
export function pointerReader(scene) {
  let last = null;
  scene.input.on('pointermove', (p) => {
    if (p.isDown) return;
    const over = scene.input.hitTestPointer(p) || [];
    if (over.some((g) => g._a11yInteractive)) { last = null; return; }
    const top = scene.modals && scene.modals.length ? scene.modals[scene.modals.length - 1] : null;
    let hits = visibleTexts(scene).filter((it) => p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h);
    if (top) hits = hits.filter((it) => it.depth >= top.depth - 2);
    hits.sort((a, b) => b.depth - a.depth || a.w * a.h - b.w * b.h);
    const hit = hits[0] ? hits[0].o : null;
    if (hit === last) return;
    last = hit;
    if (hit) { const s = textOf(hit); if (s && s !== lastHover) sayHover(s); }
  });
}
