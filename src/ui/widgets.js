// widgets.js — the Figma components drawn in code (texts are never baked into PNGs, so
// narration, text size and future translation work):
//   txt, panel, pxButton (component "Pixel Button": navy/white or gold), iconButton (Menu / Help),
//   mentorBar (bubble #e8eef2 + "MENTOR" in #a63711 + BIG alien portrait), card, chip, dots,
//   img/bg (with placeholder if a PNG is missing), typewriter, meterBar, slider.
// Keyboard focus: every button registers in scene.focusables; Tab / Shift+Tab move, Enter/Space press.
import { C, S, W, H, TITLE_FONT, BODY_FONT, fs } from './theme.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

// ---------- scene start ----------
// Phaser REUSES the scene object every time it starts: call fresh() first in every create().
export function fresh(scene) {
  scene.focusables = [];
  scene.focusIndex = -1;
  scene.modals = [];
  scene.onKey = null;
  scene.paused = false;
  scene.timers = [];
  const cams = scene.cameras;
  if (cams && cams.main) { cams.main.setZoom(1); cams.main.setScroll(0, 0); cams.main.removeBounds && cams.main.removeBounds(); }
}

// ---------- text ----------
export function txt(scene, x, y, str, o = {}) {
  const title = o.font === 'title';
  const t = scene.add.text(x, y, str, {
    fontFamily: title ? TITLE_FONT : BODY_FONT,
    fontSize: `${fs(o.size || (title ? 16 : 22))}px`,
    color: o.color || S.text,
    align: o.align || 'left',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: o.lineSpacing ?? (title ? 8 : 2),
    resolution: 2
  });
  if (o.origin !== undefined) t.setOrigin(...[].concat(o.origin));
  if (o.shadow) t.setShadow(o.shadow === true ? 3 : o.shadow, o.shadow === true ? 3 : o.shadow, '#000000', 0, false, true);
  if (o.depth) t.setDepth(o.depth);
  if (o.stroke) t.setStroke(o.stroke, o.strokeW || 4);
  return t;
}

// shrink a text until it fits in maxW x maxH (text size L can overflow cards)
export function fit(t, maxW, maxH, min = 12) {
  let size = parseInt(t.style.fontSize, 10);
  while ((t.width > maxW || (maxH && t.height > maxH)) && size > min) { size -= 1; t.setFontSize(size); }
  return t;
}

// ---------- boxes ----------
export function panel(scene, x, y, w, h, o = {}) {
  const g = scene.add.graphics();
  const bw = o.border === false ? 0 : (o.bw ?? 4);
  if (o.shadow) { g.fillStyle(0x000000, 0.9); g.fillRect(x + 6, y + 6, w, h); }
  g.fillStyle(o.fill ?? C.navy, o.alpha ?? 1);
  g.fillRect(x, y, w, h);
  if (bw) { g.lineStyle(bw, o.stroke ?? C.white, o.strokeAlpha ?? 1); g.strokeRect(x + bw / 2, y + bw / 2, w - bw, h - bw); }
  if (o.depth) g.setDepth(o.depth);
  return g;
}

export function dim(scene, alpha = 0.6, depth = 50) {
  const r = scene.add.rectangle(0, 0, W, H, C.dim, alpha).setOrigin(0).setDepth(depth);
  r.setInteractive();            // swallow clicks behind
  return r;
}

// ---------- images ----------
export function img(scene, x, y, key, o = {}) {
  let im;
  if (scene.textures.exists(key)) {
    im = scene.add.image(x, y, key);
    if (o.w && o.h) im.setDisplaySize(o.w, o.h);
    else if (o.scale) im.setScale(o.scale);
  } else {
    // placeholder: never crash if an asset is missing
    const w = o.w || 64, h = o.h || 64;
    im = scene.add.rectangle(x, y, w, h, o.ph ?? C.grey, 1).setStrokeStyle(2, C.white, 0.5);
  }
  if (o.origin !== undefined) im.setOrigin(...[].concat(o.origin));
  if (o.depth !== undefined) im.setDepth(o.depth);
  return im;
}

export function bg(scene, key, o = {}) {
  scene.add.rectangle(0, 0, W, H, o.fill ?? C.space).setOrigin(0);
  const b = img(scene, 0, 0, key, { origin: 0, w: W, h: H, ph: o.fill ?? C.space });
  if (o.dim) scene.add.rectangle(0, 0, W, H, 0x000000, o.dim).setOrigin(0);
  return b;
}

// ---------- focus (keyboard) ----------
function register(scene, item) {
  scene.focusables.push(item);
  return item;
}
export function moveFocus(scene, dir = 1) {
  const list = activeFocusables(scene);
  if (!list.length) return;
  const cur = list.indexOf(scene.focused);
  const next = list[(cur + dir + list.length) % list.length];
  setFocus(scene, next);
}
export function setFocus(scene, item) {
  if (scene.focused && scene.focused.blur) scene.focused.blur();
  scene.focused = item;
  if (item && item.focus) { item.focus(); if (item.label) say(item.label); }
}
export function activeFocusables(scene) {
  const top = scene.modals && scene.modals.length ? scene.modals[scene.modals.length - 1] : null;
  return scene.focusables.filter((f) => f.alive() && !f.disabled && (top ? f.modal === top : !f.modal));
}

// ---------- buttons ----------
// Pixel Button (Figma component 3:8): 4px white border, hard black shadow; primary = gold fill.
export function pxButton(scene, x, y, w, h, label, onClick, o = {}) {
  const depth = o.depth ?? 20;
  const cont = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.rectangle(6, 6, w, h, 0x000000, 0.95).setOrigin(0);
  const box = scene.add.rectangle(0, 0, w, h, o.primary ? C.gold : (o.fill ?? C.navy)).setOrigin(0);
  box.setStrokeStyle(4, o.primary ? C.white : (o.stroke ?? C.white));
  const t = txt(scene, w / 2, h / 2 + 1, label, { font: 'title', size: o.size || (h >= 56 ? 20 : 14), color: o.primary ? S.navy : (o.color || S.white), origin: 0.5 });
  fit(t, w - 20);
  cont.add([shadow, box, t]);
  const hit = scene.add.zone(x, y, w, h).setOrigin(0).setDepth(depth + 1).setInteractive({ useHandCursor: true });
  const item = {
    cont, box, text: t, label: label.replace(/[▶◀]/g, '').trim(), disabled: !!o.disabled, modal: o.modal || null,
    alive: () => !!cont.scene && cont.visible,
    focus() { box.setStrokeStyle(4, C.yellow); cont.setScale(1.02); },
    blur() { box.setStrokeStyle(4, o.primary ? C.white : (o.stroke ?? C.white)); cont.setScale(1); },
    press() { if (item.disabled || !onClick) return; sfx(scene, 'sfx-pickup'); onClick(); },
    setDisabled(d) { item.disabled = d; cont.setAlpha(d ? 0.45 : 1); },
    setLabel(s) { t.setText(s); fit(t, w - 20); item.label = s; },
    setPrimary(p) { box.setFillStyle(p ? C.gold : (o.fill ?? C.navy)); t.setColor(p ? S.navy : (o.color || S.white)); },
    setVisible(v) { cont.setVisible(v); hit.setVisible(v); if (v) hit.setInteractive(); else hit.disableInteractive(); },
    destroy() { cont.destroy(); hit.destroy(); },
    hit
  };
  hit.on('pointerover', () => { if (!item.disabled && isTop(scene, item)) item.focus(); });
  hit.on('pointerout', () => { if (scene.focused !== item) item.blur(); });
  hit.on('pointerdown', () => { if (isTop(scene, item)) item.press(); });
  item.setDisabled(item.disabled);
  return register(scene, item);
}

function isTop(scene, item) {
  const top = scene.modals && scene.modals.length ? scene.modals[scene.modals.length - 1] : null;
  return top ? item.modal === top : !item.modal;
}

// Icon Button / Menu (☰ sliders) and Icon Button / Help (?) — 64x64, Figma 3:9 and 3:17
export function iconButton(scene, x, y, kind, onClick, o = {}) {
  const depth = o.depth ?? 30;
  const cont = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.rectangle(5, 5, 64, 64, 0x000000, 0.95).setOrigin(0);
  const box = scene.add.rectangle(0, 0, 64, 64, C.navy).setOrigin(0).setStrokeStyle(4, C.white);
  const g = scene.add.graphics();
  if (kind === 'menu') {
    g.fillStyle(C.white, 1); for (let i = 0; i < 3; i++) g.fillRect(18, 21 + i * 10, 28, 4);
    g.fillStyle(C.gold, 1); g.fillRect(36, 18, 6, 10); g.fillRect(22, 28, 6, 10); g.fillRect(32, 38, 6, 10);
  }
  cont.add([shadow, box, g]);
  if (kind === 'help') cont.add(txt(scene, 33, 34, '?', { font: 'title', size: 22, origin: 0.5 }));
  const hit = scene.add.zone(x, y, 64, 64).setOrigin(0).setDepth(depth + 1).setInteractive({ useHandCursor: true });
  const item = {
    cont, label: kind === 'menu' ? 'Settings menu' : 'Help', modal: o.modal || null, disabled: false,
    alive: () => !!cont.scene && cont.visible,
    focus() { box.setStrokeStyle(4, C.yellow); }, blur() { box.setStrokeStyle(4, C.white); },
    press() { sfx(scene, 'sfx-pickup'); onClick(); }
  };
  hit.on('pointerover', () => item.focus()); hit.on('pointerout', () => { if (scene.focused !== item) item.blur(); });
  hit.on('pointerdown', () => { if (isTop(scene, item)) item.press(); });
  return register(scene, item);
}

// small text link like "(i) info" or "✎ change"
export function link(scene, x, y, label, onClick, o = {}) {
  const t = txt(scene, x, y, label, { size: o.size || 20, color: o.color || S.cyan, origin: o.origin ?? 0.5 });
  t.setDepth(o.depth ?? 25);
  const u = scene.add.rectangle(t.x - t.displayOriginX, t.y - t.displayOriginY + t.height - 2, t.width, 2, 0x56c8e8).setOrigin(0).setDepth(o.depth ?? 25);
  t.setInteractive({ useHandCursor: true });
  const item = {
    text: t, label: label, modal: o.modal || null, disabled: false,
    alive: () => !!t.scene && t.visible,
    focus() { t.setColor(S.yellow); }, blur() { t.setColor(o.color || S.cyan); },
    press() { sfx(scene, 'sfx-pickup'); onClick(); }
  };
  t.on('pointerover', () => item.focus()); t.on('pointerout', () => { if (scene.focused !== item) item.blur(); });
  t.on('pointerdown', () => { if (isTop(scene, item)) item.press(); });
  item.underline = u;
  return register(scene, item);
}

// generic clickable area (cards, planets, tabs) that joins the keyboard focus ring
export function hotspot(scene, x, y, w, h, label, onClick, o = {}) {
  const z = scene.add.zone(x, y, w, h).setOrigin(0).setDepth(o.depth ?? 22).setInteractive({ useHandCursor: true });
  const ring = scene.add.graphics().setDepth((o.depth ?? 22) + 1);
  const item = {
    zone: z, label, modal: o.modal || null, disabled: false,
    alive: () => !!z.scene && z.input && z.input.enabled,
    focus() { ring.clear(); ring.lineStyle(4, C.yellow, 1); ring.strokeRect(x - 4, y - 4, w + 8, h + 8); if (o.onFocus) o.onFocus(); },
    blur() { ring.clear(); if (o.onBlur) o.onBlur(); },
    press() { sfx(scene, 'sfx-pickup'); onClick(); },
    destroy() { z.destroy(); ring.destroy(); }
  };
  z.on('pointerover', () => { if (isTop(scene, item)) item.focus(); }); z.on('pointerout', () => { if (scene.focused !== item) item.blur(); });
  z.on('pointerdown', () => { if (isTop(scene, item)) item.press(); });
  return register(scene, item);
}

// ---------- mentor ----------
// Mentor bar (Figma "Mentor bar"): speech bubble + BIG portrait of the alien mentor.
export function mentorBar(scene, x, y, w, h, text, o = {}) {
  const depth = o.depth ?? 15;
  const portrait = o.portrait ?? Math.min(h, 150);
  const side = o.portraitSide || 'right';
  const bubbleW = w - portrait - 16;
  const bx = side === 'right' ? x : x + portrait + 16;
  const px = side === 'right' ? x + bubbleW + 16 : x;
  panel(scene, bx, y, bubbleW, h, { fill: C.bubble, stroke: C.ink, bw: 4, depth });
  const title = txt(scene, bx + 14, y + 10, o.title || 'MENTOR', { font: 'title', size: 12, color: S.mentor }).setDepth(depth + 1);
  const body = txt(scene, bx + 14, y + 30, '', { size: o.size || 24, color: S.ink, wrap: bubbleW - 28, lineSpacing: 0 }).setDepth(depth + 1);
  const py = y + h - portrait;
  panel(scene, px, py, portrait, portrait, { fill: C.portrait, stroke: C.white, bw: 4, depth });
  img(scene, px + portrait / 2, py + portrait / 2 + 2, 'mentor', { w: portrait - 12, h: portrait - 12, depth: depth + 1 });
  const api = {
    title, body,
    set(str, opts = {}) { typewriter(scene, body, str, { maxH: h - 40, onDone: opts.onDone }); if (!opts.silent) say(str, opts.lineId); },
    setTitle(s) { title.setText(s); }
  };
  if (text) api.set(text, { lineId: o.lineId, silent: o.silent });
  return api;
}

// typewriter text (instant when "Reduce motion" is on). Skips to the end if called again.
export function typewriter(scene, t, full, o = {}) {
  if (t._tw) { t._tw.remove(); t._tw = null; }
  full = String(full ?? '');
  const reduce = scene.registry && scene.registry.get && scene.registry.get('reduceMotion');
  if (reduce || o.instant) { t.setText(full); if (o.maxH) fit(t, t.style.wordWrapWidth || 9999, o.maxH); o.onDone && o.onDone(); return; }
  let i = 0;
  t.setText('');
  t._full = full;
  t._tw = scene.time.addEvent({ delay: o.speed || 18, repeat: full.length, callback: () => {
    i += 1; t.setText(full.slice(0, i));
    if (i >= full.length) { if (o.maxH) fit(t, t.style.wordWrapWidth || 9999, o.maxH); if (t._tw) t._tw.remove(); t._tw = null; o.onDone && o.onDone(); }
  } });
}
export function finishTyping(t) { if (t && t._tw) { t._tw.remove(); t._tw = null; t.setText(t._full); return true; } return false; }

// ---------- small pieces ----------
export function chip(scene, x, y, label, o = {}) {
  const t = txt(scene, 0, 0, label, { font: 'title', size: o.size || 10, color: o.color || S.navy });
  const w = t.width + 16, h = t.height + 10;
  const r = scene.add.rectangle(x, y, w, h, o.fill ?? C.gold).setOrigin(o.origin ?? 0, 0.5);
  if (o.stroke) r.setStrokeStyle(2, o.stroke);
  t.setPosition(r.x - (o.origin === 0.5 ? w / 2 : o.origin === 1 ? w : 0) + 8, y - t.height / 2 + 1);
  r.setDepth(o.depth ?? 16); t.setDepth((o.depth ?? 16) + 1);
  return { r, t, w, h, destroy() { r.destroy(); t.destroy(); } };
}

export function dots(scene, cx, y, n, i, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 16);
  const size = o.size || 14, gap = 8, total = n * size + (n - 1) * gap + (o.wideActive ? 10 : 0);
  let x = cx - total / 2;
  for (let k = 0; k < n; k++) {
    const wk = o.wideActive && k === i ? size + 10 : size;
    g.fillStyle(k === i ? C.gold : (k < i && o.past ? C.gold : 0x2a3358), k < i && o.past ? 0.6 : 1);
    g.fillRect(x, y, wk, size);
    x += wk + gap;
  }
  return g;
}

// segmented meter like "■■■□□ Medium" on the station cards (level 0..5)
export function segMeter(scene, x, y, level, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 16);
  for (let i = 0; i < 5; i++) { g.fillStyle(i < level ? C.gold : 0x2a3358, 1); g.fillRect(x + i * 19, y, 16, 10); }
  return g;
}

// horizontal bar (HUD meters, results)
export function bar(scene, x, y, w, h, frac, color, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 16);
  const draw = (f, col = color) => {
    g.clear();
    g.fillStyle(o.back ?? 0x0b0f26, 1); g.fillRect(x, y, w, h);
    g.fillStyle(col, 1); g.fillRect(x + 3, y + 3, Math.max(0, Math.min(1, f)) * (w - 6), h - 6);
    g.lineStyle(3, o.stroke ?? C.white, 1); g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  };
  draw(frac);
  return { g, set: draw };
}

// pixel slider (Orbit 12): returns { set(v), get() } ; v in [min,max]
export function slider(scene, x, y, w, min, max, value, onChange, o = {}) {
  const depth = o.depth ?? 20;
  const g = scene.add.graphics().setDepth(depth);
  const knob = scene.add.rectangle(0, y + 10, 20, 32, C.gold).setStrokeStyle(3, C.white).setDepth(depth + 1);
  let v = value;
  const toX = (val) => x + ((val - min) / (max - min)) * w;
  const draw = () => {
    g.clear();
    g.fillStyle(0x0b0f26, 1); g.fillRect(x, y + 4, w, 12);
    if (o.zone) { g.fillStyle(C.green, 0.8); g.fillRect(toX(o.zone[0]), y + 4, toX(o.zone[1]) - toX(o.zone[0]), 12); }
    g.lineStyle(3, C.white, 1); g.strokeRect(x, y + 4, w, 12);
    knob.x = toX(v);
  };
  draw();
  const zone = scene.add.zone(x - 12, y - 10, w + 24, 40).setOrigin(0).setDepth(depth + 2).setInteractive({ useHandCursor: true, draggable: true });
  const setFromPointer = (p) => { const f = Phaser.Math.Clamp((p.x - x) / w, 0, 1); api.set(min + f * (max - min), true); };
  zone.on('pointerdown', setFromPointer);
  zone.on('drag', (p) => setFromPointer(p));
  const api = {
    label: o.label || 'slider', modal: null, disabled: false,
    alive: () => !!g.scene,
    focus() { knob.setStrokeStyle(3, C.yellow); }, blur() { knob.setStrokeStyle(3, C.white); },
    press() {},
    set(val, notify = true) { v = Phaser.Math.Clamp(o.step ? Math.round(val / o.step) * o.step : val, min, max); draw(); if (notify && onChange) onChange(v); },
    get: () => v,
    nudge(dir) { api.set(v + dir * (o.step || (max - min) / 20)); }
  };
  if (o.focusable !== false) register(scene, api);
  return api;
}

export const LAYOUT = { help: [24, 632], menu: [1192, 24], back: [24, 24, 184, 60] };
