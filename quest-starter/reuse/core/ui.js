// ui.js — the clarity rules of section 3, so every scene only has to call them (owner: P2).
//   progressBar(scene, stepIndex)   1) 9 numbered steps, current highlighted, past ones with ✓
//   directorSays(scene, text)       2) portrait + ONE sentence at the bottom (also narrated)
//   blockedReason(button, reason)   4) greys out an action and shows why
//   conceptCard(scene, conceptId)   6) concept card before a new decision (shown once)  [addendum A]
//   miniGameResult(scene, key, stars, line)  stars + sfx + particles + director reaction  [addendum B]
// Plus small helpers used by all scenes: text(), panel(), image(), menu(), dilemma(), onKeys(), help.
// Reads state.settings and content.json. Writes state.log (concept answers).

import { applyDesign } from './rules.js';
import { state } from './state.js';
import { say } from './a11y.js';

export const FONT = '"Pixelify Sans", "Press Start 2P", monospace';
export const TITLE_FONT = '"Press Start 2P", "Pixelify Sans", monospace';
export const ICON = { ok: '✓', warning: '⚠', error: '✕' };
export const WORD = { ok: 'Bien', warning: 'Aviso', error: 'Problema' };
const PAL_COLORS = { ok: '#86d8b4', warning: '#ffd27a', error: '#ff7b8a', interactive: '#93c5ff', accent: '#ff8a6b' };

// The content every scene reads = content.json + the mission the player designed (rules.applyDesign).
let designCache = { base: null, key: '', out: null };
export function content(scene) {
  const base = scene.cache.json.get('content');
  const key = JSON.stringify(state.design || null);
  if (designCache.base !== base || designCache.key !== key) designCache = { base, key, out: applyDesign(base, state.design) };
  return designCache.out;
}

// ---------- scene start ----------
// Phaser REUSES the same scene object every time the scene starts again (redesign,
// going back to the workshop...). Call this first in create() so nothing old is left over.
export function freshScene(scene, extra = {}) {
  Object.assign(scene, { uiObjects: [], directorCard: null, directorPortrait: null, modal: null, helpText: null,
    helpKey: null, vote: null, onUiObject: null }, extra);
  const cams = scene.cameras;
  if (cams && cams.cameras) cams.cameras.slice(1).forEach((c) => cams.remove(c));   // drop extra cameras
  if (cams && cams.main) { cams.main.setZoom(1); cams.main.setScroll(0, 0); cams.main.removeBounds(); }
}

// ---------- sizes and colors ----------
export function sz(px = 16) { return Math.round(Math.max(16, px) * (state.settings.largeText ? 1.4 : 1)); }
export function color(scene, name) {
  const c = content(scene).colors;
  if (state.settings.highContrast && (name === 'text' || name === 'muted')) return '#FFFFFF';
  if (state.settings.highContrast && name === 'panel') return '#000000';
  if (!state.settings.colorblind && PAL_COLORS[name]) return PAL_COLORS[name];
  return c[name] || '#FFFFFF';
}
export function hexNum(hex) { return parseInt(String(hex).replace('#', ''), 16); }

// Every UI object goes through track(): it stays fixed on screen and the workshop's
// UI camera knows about it (scene.onUiObject is an optional hook).
export function track(scene, obj, depth = 100) {
  obj.setScrollFactor(0);
  obj.setDepth(depth);
  (scene.uiObjects ||= []).push(obj);
  if (scene.onUiObject) scene.onUiObject(obj);
  return obj;
}

export function text(scene, x, y, str, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: opts.title ? TITLE_FONT : FONT,
    fontSize: `${sz(opts.size || 16)}px`,
    color: opts.color || color(scene, 'text'),
    align: opts.align || 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: 4
  });
  if (opts.origin !== undefined) t.setOrigin(...[].concat(opts.origin));
  return opts.world ? t : track(scene, t, opts.depth || 100);
}

export function panel(scene, x, y, w, h, opts = {}) {
  const r = scene.add.rectangle(x, y, w, h, hexNum(opts.fill || color(scene, 'panel')), opts.alpha ?? 0.95).setOrigin(0);
  r.setStrokeStyle(opts.stroke ?? 3, hexNum(opts.border || '#4a4778'));
  return opts.world ? r : track(scene, r, opts.depth || 90);
}

// image with a colored-rectangle placeholder if the art is missing
export function image(scene, x, y, key, w, h, opts = {}) {
  let o;
  if (scene.textures.exists(key)) {
    o = scene.add.image(x, y, key);
    if (w && h) o.setDisplaySize(w, h);
  } else {
    o = scene.add.rectangle(x, y, w || 32, h || 32, hexNum(opts.placeholder || '#6f6990'));
  }
  if (opts.origin !== undefined) o.setOrigin(...[].concat(opts.origin));
  return opts.ui ? track(scene, o, opts.depth || 100) : o;
}

export function background(scene, key) {
  scene.cameras.main.setBackgroundColor(state.settings.highContrast ? '#000000' : '#0d0c1c');
  if (key && scene.textures.exists(key) && !state.settings.highContrast) {
    return scene.add.image(480, 270, key).setDisplaySize(960, 540).setDepth(-10);
  }
  return null;
}

export function sfx(scene, key) {
  try { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume: 0.5 }); } catch (e) { /* sound is optional */ }
}

// ---------- rule 1: progress bar ----------
export function progressBar(scene, stepIndex) {
  const steps = content(scene).steps;
  track(scene, scene.add.rectangle(0, 0, 960, 34, hexNum(color(scene, 'panel')), 1).setOrigin(0), 95);
  const label = (i, short) => {
    const n = String(i + 1).padStart(2, '0');
    if (i < stepIndex) return short ? `${n}✓` : `${n} ${steps[i]} ✓`;
    if (i === stepIndex) return `${n} ${steps[i]} ▸`;
    return short ? n : `${n} ${steps[i]}`;
  };
  const build = (short) => steps.map((_, i) => text(scene, 0, 6, label(i, short), {
    size: 16, color: i === stepIndex ? color(scene, 'accent') : i < stepIndex ? color(scene, 'ok') : color(scene, 'muted'), depth: 96 }));
  let chips = build(false);
  const width = (list) => list.reduce((sum, t) => sum + t.width + 10, 0);
  if (width(chips) > 950) { chips.forEach((t) => t.destroy()); chips = build(true); }
  let x = Math.max(6, (960 - width(chips)) / 2);
  for (const t of chips) { t.setX(x); x += t.width + 10; }
  const cur = chips[stepIndex];
  if (cur) track(scene, scene.add.rectangle(cur.x - 4, 3, cur.width + 8, 28).setOrigin(0).setStrokeStyle(2, hexNum(color(scene, 'accent'))), 96);
  scene.stepIndex = stepIndex;
  return chips;
}

// ---------- rule 2: one sentence from the director ----------
// mood: 'normal' | 'happy' | 'sad' (the Director's face hops a little)
export function directorSays(scene, sentence, mood = 'normal') {
  if (!scene.directorCard) {
    const h = state.settings.largeText ? 76 : 60;
    panel(scene, 0, 540 - h, 960, h, { depth: 97 });
    const face = speaker(scene, 'Director').face;
    scene.directorPortrait = image(scene, 32, 540 - h / 2, face, 50, 50, { ui: true, depth: 98, placeholder: '#f6efe3' });
    scene.directorFace = face;
    scene.directorCard = text(scene, 66, 540 - h + 8, '', { size: 16, wrap: 880, depth: 98 });
  }
  // the face does not change; a little hop shows the mood
  const pic = scene.directorPortrait;
  if (pic.baseY === undefined) pic.baseY = pic.y;
  if (mood !== 'normal' && scene.tweens && pic.y !== undefined) {
    if (scene.tweens.killTweensOf) scene.tweens.killTweensOf(pic);
    pic.y = pic.baseY;
    scene.tweens.add({ targets: pic, y: pic.baseY + (mood === 'happy' ? -6 : 3), duration: 120, yoyo: true });
  }
  scene.directorCard.setText(sentence);
  say(sentence);
  return scene.directorCard;
}

// ---------- rule 3: a status line with icon + word (never color alone) ----------
export function statusText(level, message) { return `${ICON[level]} ${WORD[level]}: ${message}`; }

// ---------- rule 4: blocked actions stay visible, greyed, with the reason ----------
export function blockedReason(button, reason) {
  button.blocked = true;
  button.blockedReason = reason;
  const base = button.baseLabel || button.text;
  button.baseLabel = base;
  button.setText(`✕ ${base} — ${reason}`);
  button.setColor('#8a84a8');
  button.setAlpha(0.75);
  return button;
}

// ---------- keyboard: one handler per scene, paused while a modal is open ----------
export function onKeys(scene, handler) {
  scene.input.keyboard.on('keydown', (ev) => {
    const key = ev.key;
    if (scene.modal) { scene.modal(key, ev); return; }
    if (key === '?') { showHelp(scene); return; }
    handler(key, ev);
  });
}

// "?" help panel: more detail without crowding the screen (rule 5)
export function showHelp(scene, extra) {
  const c = content(scene);
  const msg = extra || scene.helpText || c.dialogues.help[scene.helpKey] || c.dialogues.help.default;
  modal(scene, 'Ayuda', msg);
}

// ---------- pixel buttons (mouse, touch AND keyboard) ----------
// opts: { w, h, icon, color, depth, small }. Returns { objs, setEnabled(on, reason), destroy(), press() }
export function button(scene, x, y, label, onClick, opts = {}) {
  const w = opts.w || 180, h = opts.h || (state.settings.largeText ? 50 : 42), depth = opts.depth || 120;
  const face = hexNum(opts.color || '#2b2a48');
  const shadow = track(scene, scene.add.rectangle(x, y + 5, w, h, 0x0d0c1c).setOrigin(0.5), depth);
  const body = track(scene, scene.add.rectangle(x, y, w, h, face).setOrigin(0.5).setStrokeStyle(3, hexNum(opts.border || '#f6efe3')), depth + 1);
  const objs = [shadow, body];
  let icon = null;
  if (opts.icon && scene.textures.exists(opts.icon)) { icon = track(scene, scene.add.image(x - w / 2 + 22, y, opts.icon).setDisplaySize(28, 28), depth + 2); objs.push(icon); }
  const t = text(scene, icon ? x + 14 : x, y, label, { size: opts.small ? 16 : 18, origin: [0.5, 0.5], depth: depth + 2, color: opts.textColor || '#f6efe3' });
  objs.push(t);
  const b = { objs, enabled: true, reason: '', label };
  const sink = (d) => objs.slice(1).forEach((o) => o.setY(o.y + d));
  body.setInteractive({ useHandCursor: true });
  body.on('pointerover', () => { if (b.enabled) body.setStrokeStyle(3, hexNum(color(scene, 'accent'))); });
  body.on('pointerout', () => body.setStrokeStyle(3, hexNum(opts.border || '#f6efe3')));
  body.on('pointerdown', () => b.press());
  b.press = () => {
    if (scene.modal && !opts.inModal) return;
    if (!b.enabled) { sfx(scene, 'sfx-error'); shake(scene); directorSays(scene, `${label}: ${b.reason}`, 'sad'); return; }
    sink(3); scene.time.delayedCall(90, () => sink(-3));
    sfx(scene, 'sfx-place');
    onClick();
  };
  b.setEnabled = (on, reason = '') => { b.enabled = on; b.reason = reason; objs.forEach((o) => o.setAlpha(on ? 1 : 0.45)); return b; };
  b.setVisible = (v) => { objs.forEach((o) => o.setVisible(v)); return b; };
  b.destroy = () => objs.forEach((o) => o.destroy());
  return b;
}

// floating "+200 W" style number that rises and fades
export function floatText(scene, x, y, str, col = '#ffd27a') {
  const t = text(scene, x, y, str, { size: 18, origin: [0.5, 0.5], color: col, depth: 970 });
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  return t;
}
export function shake(scene) { try { scene.cameras.main.shake(180, 0.006); } catch (e) { /* optional */ } }

// generic modal box; closes with Enter/Esc/Space or the OK button / a click on the dark backdrop
export function modal(scene, title, body, footer = [], onClose) {
  const objs = [];
  const backdrop = track(scene, scene.add.rectangle(0, 0, 960, 540, 0x000000, 0.6).setOrigin(0), 900);
  objs.push(backdrop);
  objs.push(panel(scene, 140, 100, 680, 320, { depth: 901, border: color(scene, 'interactive') }));
  objs.push(text(scene, 170, 120, title, { size: 18, title: true, color: color(scene, 'accent'), depth: 902 }));
  objs.push(text(scene, 170, 165, body, { size: 16, wrap: 620, depth: 902 }));
  say(`${title}. ${body}`);
  const prev = scene.modal;
  const close = () => { objs.forEach((o) => o.destroy()); ok.destroy(); scene.modal = prev || null; if (onClose) onClose(); };
  const ok = button(scene, 480, 384, 'OK', close, { w: 120, depth: 903, inModal: true });
  backdrop.setInteractive().on('pointerdown', close);
  scene.modal = (key) => { if (key === 'Enter' || key === 'Escape' || key === ' ') close(); };
}

// ---------- rule 6: concept cards (shown once, narrated, optional quick check) ----------
const SEEN_KEY = 'sma-concepts';
function loadSeen() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch (e) { return new Set(); } }
const seen = loadSeen();
function saveSeen() { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) { /* storage is optional */ } }
export function conceptsLearned() { return seen.size; }
export function findConcept(scene, id) { return (content(scene).concepts || []).find((k) => k.id === id) || null; }
export function conceptSeen(id) { return seen.has(id); }

// ---------- who is talking: one of the 4 team characters asks every question ----------
// role: 'Director' | 'Engineer' | 'Scientist' | 'Communications' -> { face, body, name }
export function speaker(scene, role = 'Director') {
  const c = content(scene);
  const av = (c.avatars || []).find((a) => a.role === role) || (c.avatars || [])[0] || { art: 'director', name: 'Directora' };
  const face = scene.textures.exists(`art-face-${av.art}`) ? `art-face-${av.art}` : 'art-director-happy';
  return { face, body: `art-role-${av.art}`, name: av.name, role: (c.roleNames || {})[role] || role };
}

// onDone runs right after the card closes (or at once if it was already seen)
export function conceptCard(scene, conceptId, onDone) {
  return new Promise((resolve) => {
    const done = () => { if (onDone) onDone(); resolve(); };
    const c = findConcept(scene, conceptId);
    if (!c || seen.has(conceptId)) { done(); return; }
    seen.add(conceptId); saveSeen();
    state.log.push({ type: 'concept', id: conceptId, text: `Aprendiste: ${c.title}` });

    const objs = [];
    const add = (o) => { objs.push(o); return o; };
    let btns = [];
    const clearBtns = () => { btns.forEach((b) => b.destroy()); btns = []; };
    add(track(scene, scene.add.rectangle(0, 0, 960, 540, 0x000000, 0.65).setOrigin(0), 900));
    add(panel(scene, 110, 70, 740, 380, { depth: 901, border: color(scene, 'accent') }));
    const who = speaker(scene, c.speaker);
    add(track(scene, scene.add.rectangle(130, 96, 150, 150, 0x8fd3c8).setOrigin(0).setStrokeStyle(4, 0x16152a), 902));
    add(image(scene, 205, 171, who.face, 146, 146, { ui: true, depth: 903 }));
    add(text(scene, 205, 252, who.name, { size: 18, title: true, origin: [0.5, 0], color: '#ffd27a', depth: 902 }));
    if (who.role !== who.name) add(text(scene, 205, 278, who.role, { size: 16, origin: [0.5, 0], color: color(scene, 'muted'), depth: 902 }));
    const head = add(text(scene, 300, 92, 'NUEVO CONCEPTO', { size: 16, color: color(scene, 'muted'), depth: 902 }));
    add(text(scene, 300, 118, c.title, { size: 20, title: true, color: color(scene, 'accent'), wrap: 530, depth: 902 }));
    const lines = c.text.split('\n').slice(0, 3);                    // max 3 lines (rule 5)
    const body = add(text(scene, 300, 165, lines.join('\n'), { size: 16, wrap: 530, depth: 902 }));
    const prev = scene.modal;
    const close = () => { clearBtns(); objs.forEach((o) => o.destroy()); scene.modal = prev || null; done(); };
    let stage = 'read';
    const B = (x, label, fn, o = {}) => btns.push(button(scene, x, 404, label, fn, { depth: 905, inModal: true, ...o }));

    const showRead = () => {
      clearBtns();
      B(c.check ? 330 : 380, '? Más', () => { body.setText(c.more); say(c.more); }, { w: 150, small: true });
      B(c.check ? 600 : 590, c.check ? 'Pregunta rápida ▸' : '¡Entendido! ▸', () => (c.check ? showCheck() : close()), { w: 220, color: '#4f9e78' });
      say(`${c.title}. ${lines.join(' ')}`);
    };
    const showCheck = () => {
      stage = 'check';
      clearBtns();
      head.setText(`${who.name.toUpperCase()} TE PREGUNTA`);
      body.setText(c.check.question);
      c.check.options.forEach((o, i) => btns.push(button(scene, 565, 262 + i * 46, `${i + 1}) ${o}`, () => answer(i), { w: 520, depth: 905, inModal: true, small: true })));
      B(780, 'Saltar', close, { w: 110, small: true });
      say(`${who.name} pregunta: ${c.check.question} ${c.check.options.map((o, i) => `${i + 1}: ${o}`).join('. ')}`);
    };
    const answer = (i) => {
      stage = 'answered';
      clearBtns();
      const ok = i === c.check.answer;
      head.setText(ok ? `${who.name.toUpperCase()}: ¡BIEN!` : `${who.name.toUpperCase()} TE EXPLICA`);
      state.log.push({ type: 'check', id: conceptId, answer: i, correct: ok, text: `${c.title}: pregunta rápida ${ok ? 'correcta' : 'fallada'}` });
      body.setText(`${ok ? '✓ ¡Correcto!' : `✕ No exactamente: ${c.check.options[c.check.answer]}.`}\n${c.check.why}`);
      if (ok) burst(scene, 205, 171, 0x86d8b4, 24); else shake(scene);
      sfx(scene, ok ? 'sfx-pickup' : 'sfx-error');
      B(565, 'Continuar ▸', close, { w: 200, color: '#4f9e78' });
      say(body.text);
    };
    scene.modal = (key) => {
      if (stage === 'read') {
        if (key === '?') { body.setText(c.more); say(c.more); return; }
        if (key === 'Enter' || key === ' ') { if (c.check) showCheck(); else close(); }
        if (key === 'Escape' || key === 'k' || key === 'K') close();
      } else if (stage === 'check') {
        if (['1', '2', '3'].includes(key)) answer(Number(key) - 1);
        if (key === 'k' || key === 'K' || key === 'Escape') close();
      } else if (key === 'Enter' || key === ' ' || key === 'Escape') close();
    };
    showRead();
  });
}

// ---------- keyboard menu (list of actions, selected one has a thick border) ----------
// items: [{ label, onPick, blocked?, reason? }]
export function menu(scene, x, y, items, opts = {}) {
  const gap = opts.gap || (state.settings.largeText ? 44 : 32);
  const width = opts.width || 520;
  const rows = items.map((it, i) => {
    const t = text(scene, x + 12, y + i * gap + 4, `${opts.numbers ? `${i + 1}) ` : ''}${it.label}`, { size: opts.size || 16, wrap: width - 24, depth: opts.depth || 101 });
    t.baseLabel = t.text;
    if (it.blocked) blockedReason(t, it.reason);
    t.setInteractive({ useHandCursor: true });
    t.on('pointerover', () => { if (m.index !== i) { m.index = i; m.refresh(); } });
    t.on('pointerdown', () => { m.index = i; m.refresh(); m.pick(); });
    return t;
  });
  const frame = track(scene, scene.add.rectangle(x, y, width, gap - 2).setOrigin(0).setStrokeStyle(4, hexNum(color(scene, 'interactive'))), (opts.depth || 101) + 1);
  const m = {
    index: opts.start || 0, rows, items,
    refresh() {
      frame.setY(y + m.index * gap);
      rows.forEach((r, i) => { if (!r.blocked) r.setColor(i === m.index ? color(scene, 'interactive') : color(scene, 'text')); });
      if (!opts.silent) say(rows[m.index].text);
    },
    move(d) { m.index = (m.index + d + rows.length) % rows.length; m.refresh(); },
    pick() {
      const it = items[m.index];
      if (rows[m.index].blocked) { sfx(scene, 'sfx-error'); directorSays(scene, `${it.label}: ${rows[m.index].blockedReason}.`); return; }
      if (it.onPick) it.onPick(m.index);
    },
    key(k) {
      if (k === 'ArrowUp' || k === 'w' || k === 'W') m.move(-1);
      else if (k === 'ArrowDown' || k === 's' || k === 'S') m.move(1);
      else if (k === 'Enter' || k === ' ') m.pick();
      else if (opts.numbers && /^[1-9]$/.test(k) && Number(k) <= rows.length) { m.index = Number(k) - 1; m.refresh(); m.pick(); }
      else return false;
      return true;
    },
    destroy() { rows.forEach((r) => r.destroy()); frame.destroy(); }
  };
  m.refresh();
  return m;
}

// ---------- dilemmas as 3 big cards, with team voting (sections 6 and 9) ----------
// options: [{ label, cost, points, icon?, blocked?, reason? }]. Click a card or press 1/2/3.
export function dilemma(scene, def, onChoose) {
  const objs = [];
  objs.push(track(scene, scene.add.rectangle(0, 0, 960, 540, 0x0d0c1c, 0.82).setOrigin(0), 149));
  const who = speaker(scene, def.speaker);
  objs.push(track(scene, scene.add.rectangle(24, 10, 104, 104, 0x8fd3c8).setOrigin(0).setStrokeStyle(3, 0x16152a), 151));
  objs.push(image(scene, 76, 62, who.face, 100, 100, { ui: true, depth: 152 }));
  objs.push(text(scene, 76, 116, who.name, { size: 16, title: true, origin: [0.5, 0], color: '#ffd27a', depth: 151 }));
  const q = text(scene, 156, 22, def.question, { size: 20, wrap: 770, color: '#16152a', depth: 152 });
  q.setBackgroundColor('#f6efe3').setPadding(14, 10, 14, 10);
  objs.push(q);
  objs.push(track(scene, scene.add.triangle(150, 52, 0, 0, 14, -10, 14, 10, 0xf6efe3), 152));
  const n = def.options.length, gap = n === 2 ? 340 : 305, left = 480 - gap * (n - 1) / 2;
  const cards = def.options.map((o, i) => {
    const x = left + i * gap, y = 278;
    const g = [];
    const card = track(scene, scene.add.rectangle(x, y, 280, 250, 0x201f38).setStrokeStyle(4, 0x4a4778), 150); g.push(card);
    g.push(text(scene, x - 126, y - 114, String(i + 1), { size: 20, title: true, color: color(scene, 'muted'), depth: 151 }));
    if (o.icon) g.push(image(scene, x, y - 70, o.icon, 64, 64, { ui: true, depth: 151 }));
    g.push(text(scene, x, y - 26, o.label, { size: 18, wrap: 250, origin: [0.5, 0], align: 'center', depth: 151 }));
    const scored = o.points !== undefined;                       // design choices have no points: just what changes
    if (scored) {
      g.push(image(scene, x - 30, y + 52, 'art-icon-heart', 28, 28, { ui: true, depth: 151 }));
      g.push(text(scene, x - 10, y + 52, `+${o.points}`, { size: 22, title: true, origin: [0, 0.5], color: '#ff7b8a', depth: 151 }));
    }
    g.push(text(scene, x, scored ? y + 74 : y + 36, o.cost, { size: 16, wrap: 250, origin: [0.5, 0], align: 'center', color: scored ? color(scene, 'muted') : '#ffd27a', depth: 151 }));
    if (o.blocked) {
      g.forEach((q) => q.setAlpha(0.4));
      g.push(text(scene, x, y - 2, `✕ ${o.reason}`, { size: 16, wrap: 250, origin: [0.5, 0.5], align: 'center', color: '#ff7b8a', depth: 152 }));
    }
    card.setInteractive({ useHandCursor: !o.blocked });
    card.on('pointerover', () => { if (!o.blocked) { card.setStrokeStyle(4, hexNum(color(scene, 'interactive'))); g.forEach((q) => q.setY(q.y - 6)); } });
    card.on('pointerout', () => { if (!o.blocked) { card.setStrokeStyle(4, 0x4a4778); g.forEach((q) => q.setY(q.y + 6)); } });
    card.on('pointerdown', () => api.key(String(i + 1)));
    objs.push(...g);
    return card;
  });
  const status = text(scene, 480, 414, '', { size: 18, wrap: 860, color: color(scene, 'interactive'), origin: [0.5, 0], align: 'center', depth: 151 });
  objs.push(status);
  objs.push(text(scene, 480, 446, '? lo que sabe cada rol · la historia real', { size: 16, color: color(scene, 'muted'), origin: [0.5, 0], depth: 151 }));
  const roleLines = Object.entries(def.roleInfo || {}).map(([role, info]) => {
    const owner = state.roles.find((r) => r.role === role);
    return `${(content(scene).roleNames || {})[role] || role}${owner ? ` (Jugador ${owner.player})` : ''}: ${info}`;
  });
  scene.helpText = `${roleLines.join('\n')}\n\nLa historia real: ${def.real}`;

  // voting order: in solo, one vote; in team, every player votes in turn
  const voters = state.mode === 'team' ? Array.from({ length: state.players }, (_, i) => i + 1) : [1];
  const votes = [];
  const marks = [];
  const directorPlayer = (state.roles.find((r) => r.role === 'Director') || { player: 1 }).player;
  const prompt = () => {
    const p = voters[votes.length];
    const roleNames = state.roles.filter((r) => r.player === p).map((r) => (content(scene).roleNames || {})[r.role] || r.role).join(' + ');
    const msg = state.mode === 'team' ? `Jugador ${p}${roleNames ? ` (${roleNames})` : ''}: ¡tu voto!` : 'Haz clic en una tarjeta (o presiona 1, 2, 3).';
    status.setText(msg);
    say(`${who.name} pregunta: ${def.question} ${def.options.map((o, i) => `${i + 1}: ${o.label}, ${o.points !== undefined ? `${o.points} puntos` : o.cost}.${o.blocked ? ' Bloqueada: ' + o.reason : ''}`).join(' ')} ${msg}`);
  };
  const finish = () => {
    const tally = def.options.map((_, i) => votes.filter((v) => v === i).length);
    const best = Math.max(...tally);
    const tied = tally.map((n, i) => (n === best ? i : -1)).filter((i) => i >= 0);
    const choice = tied.length === 1 ? tied[0] : votes[voters.indexOf(directorPlayer)];
    const record = { dilemma: def.id, votes: votes.slice(), unanimous: tally[choice] === votes.length, tieBrokenByDirector: tied.length > 1 };
    if (state.mode === 'team' && !def.noRecord) state.results.votes.push(record);
    burst(scene, left + choice * gap, 278, 0xff7b8a, 20);
    scene.time.delayedCall(350, () => {
      objs.forEach((o) => o.destroy()); marks.forEach((o) => o.destroy());
      scene.helpText = null;
      onChoose(choice, record);
    });
    api.key = () => true;
  };
  const api = {
    key(k) {
      if (!/^[1-9]$/.test(k)) return false;
      const i = Number(k) - 1;
      if (i >= def.options.length) return true;
      if (def.options[i].blocked) { sfx(scene, 'sfx-error'); shake(scene); status.setText(`✕ Bloqueada: ${def.options[i].reason}.`); say(status.text); return true; }
      votes.push(i);
      sfx(scene, 'sfx-place');
      // a little player tag drops on the card that got the vote
      marks.push(text(scene, left - 100 + i * gap + (votes.length - 1) * 34, 372, `P${voters[votes.length - 1]}`, { size: 16, title: true, color: '#ffd27a', depth: 153 }));
      if (votes.length === voters.length) finish(); else prompt();
      return true;
    }
  };
  prompt();
  return api;
}

// fixed-size "?" hint in the corner of every scene
export function helpHint(scene) {
  const t = text(scene, 952, 4, '?', { size: 18, title: true, color: color(scene, 'interactive'), origin: [1, 0], depth: 99 });
  t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!scene.modal) showHelp(scene); });
  return t;
}

// ---------- addendum B: juicy feedback for every mini-game ----------
// tiny white square texture for particles (made once, no image file needed)
function particleTexture(scene) {
  if (scene.textures.exists('px4')) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1).fillRect(0, 0, 4, 4);
  g.generateTexture('px4', 4, 4);
  g.destroy();
}
export function burst(scene, x, y, tint = 0xffd27a, count = 24) {
  try {
    particleTexture(scene);
    const p = scene.add.particles(x, y, 'px4', { speed: { min: 60, max: 220 }, lifespan: 700, scale: { start: 1.5, end: 0 }, tint, emitting: false });
    track(scene, p, 950);
    p.explode(count);
    scene.time.delayedCall(900, () => p.destroy());
  } catch (e) { /* particles are decoration only */ }
}
export function starsText(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
// stars: 1-3, saved in state.stars[key] (best result is kept)
export function miniGameResult(scene, key, stars, line) {
  stars = Math.max(1, Math.min(3, stars));
  state.stars[key] = Math.max(state.stars[key] || 0, stars);
  sfx(scene, stars >= 2 ? 'sfx-pickup' : 'sfx-error');
  burst(scene, 480, 250, stars === 3 ? 0xffd27a : stars === 2 ? 0x93c5ff : 0xb9b2d0, stars * 14);
  const t = text(scene, 480, 200, starsText(stars), { size: 40, origin: [0.5, 0.5], color: '#ffd27a', depth: 960 });
  scene.tweens.add({ targets: t, scale: { from: 0.6, to: 1.2 }, duration: 400, yoyo: true, onComplete: () => scene.time.delayedCall(900, () => t.destroy()) });
  directorSays(scene, `${starsText(stars)} ${line}`, stars >= 2 ? 'happy' : 'sad');
  return stars;
}

// ---------- your astronaut: part of the mission in every scene ----------
// buddy(scene, x, y) -> { say(text, mood), sprite }. mood: 'normal' | 'happy' | 'sad'.
// Juno has no crew, so your astronaut is the mission engineer/operator back on Earth.
export function buddy(scene, x, y, size = 64) {
  const n = state.avatar || 1;
  const av = (content(scene).avatars || []).find((a) => a.id === n) || { name: 'Tú' };
  const role = av.art && scene.textures.exists(`art-role-${av.art}`) ? `art-role-${av.art}` : null;   // the team's character art
  const base = role || `art-player${n}`;
  const w = role ? Math.round(size * 0.45) : size;
  const sprite = image(scene, x, y, base, w, size, { ui: true, depth: 125 });
  const name = av.name;
  const tag = text(scene, x, y + size / 2 + 2, name, { size: 16, origin: [0.5, 0], color: '#ffd27a', depth: 125 });
  const bubble = text(scene, 0, 0, '', { size: 16, wrap: 220, depth: 126, color: '#16152a' });
  bubble.setBackgroundColor('#f6efe3').setPadding(8, 6, 8, 6).setVisible(false);
  let hideAt = null;
  const b = {
    sprite, tag,
    say(msg, mood = 'normal') {
      const key = role || (mood === 'normal' ? `art-player${n}` : `art-player${n}-${mood}`);
      if (sprite.setTexture && scene.textures.exists(key)) sprite.setTexture(key).setDisplaySize(w, size);
      bubble.setText(msg);
      bubble.setPosition(Math.min(940 - bubble.width, x + size / 2 - 6), y - size / 2 - bubble.height - 4);
      bubble.setVisible(true);
      if (mood === 'happy') scene.tweens.add({ targets: sprite, y: y - 12, duration: 140, yoyo: true });
      if (mood === 'sad') scene.tweens.add({ targets: sprite, x: x + 4, duration: 60, yoyo: true });
      if (hideAt) hideAt.remove();
      hideAt = scene.time.delayedCall(2600, () => { bubble.setVisible(false); if (sprite.setTexture && scene.textures.exists(base)) sprite.setTexture(base).setDisplaySize(w, size); });
      return b;
    }
  };
  return b;
}
