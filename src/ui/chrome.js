// chrome.js — what EVERY screen has (team rules):
//   ? Help button bottom-left (contextual help: controls + what to do here)      key: H or ?
//   ☰ Menu top-right → Settings (Screen 1b)                                       key: Esc closes
//   ◀ BACK top-left (history Stack) — except in the middle of a mini-game          key: Esc / Backspace
//   MY MISSION panel (planet, objective, parts, instruments, orbit, results, log)  key: M
// Also the modal system and the keyboard dispatcher (only the top modal receives keys).
import { C, S, W, H } from './theme.js';
import { fresh, txt, panel, pxButton, iconButton, dim, moveFocus, activeFocusables, mentorBar } from './widgets.js';
import { content, t, allSources } from '../content.js';
import { state, STATION_IDS } from '../state.js';
import { saveSettings } from '../save.js';
import { back, canGoBack, arrived } from '../router.js';
import { refreshMusic, applyVolume, sfx } from '../audio.js';
import { say, quiet, pointerReader } from '../a11y.js';
import { stationOption, instrumentById } from '../rules.js';

// ---------------- scene setup ----------------
// opts: { help: 'helpId', back: true|false|fn, menu: true, mission: true, missionButton: [x,y], esc: fn }
export function setup(scene, data, opts = {}) {
  scene.chromeOpts = opts;
  scene.registry.set('reduceMotion', state.settings.reduceMotion);
  if (opts.menu !== false) iconButton(scene, 1192, 24, 'menu', () => openSettings(scene), { depth: 40 });
  if (opts.help !== false) iconButton(scene, opts.helpPos ? opts.helpPos[0] : 24, opts.helpPos ? opts.helpPos[1] : 632, 'help', () => openHelp(scene), { depth: 40 });
  if (opts.back) {
    const fn = typeof opts.back === 'function' ? opts.back : () => back(scene);
    const [bx, by, bw, bh] = opts.backPos || [24, 24, 184, 60];
    pxButton(scene, bx, by, bw, bh, '◀ BACK', fn, { depth: 40, size: bh < 56 ? 14 : 20 });
  }
  if (opts.missionButton) pxButton(scene, opts.missionButton[0], opts.missionButton[1], 264, 60, 'MY MISSION', () => openMission(scene), { depth: 40, size: 16 });
  scene.input.keyboard.on('keydown', (e) => dispatch(scene, e));
  pointerReader(scene);
  arrived(scene, data);
}

function dispatch(scene, e) {
  const k = e.key;
  if (k === 'Tab') { e.preventDefault && e.preventDefault(); moveFocus(scene, e.shiftKey ? -1 : 1); return; }
  const top = scene.modals.length ? scene.modals[scene.modals.length - 1] : null;
  if (top) {
    if (k === 'Escape') { top.close(); return; }
    if ((k === 'Enter' || k === ' ') && scene.focused && activeFocusables(scene).includes(scene.focused)) { scene.focused.press(); return; }
    if (top.onKey) top.onKey(k, e);
    return;
  }
  if ((k === 'Enter' || k === ' ') && scene.focused && activeFocusables(scene).includes(scene.focused) && !scene.keyFirst) { scene.focused.press(); return; }
  if (scene.onKey && scene.onKey(k, e) === true) return;      // the scene used the key
  if (k === 'Escape' || k === 'Backspace') {
    const o = scene.chromeOpts || {};
    if (o.esc) o.esc();
    else if (o.back) (typeof o.back === 'function' ? o.back() : back(scene));
    else if (k === 'Escape') openSettings(scene);
    return;
  }
  if (k === 'h' || k === 'H' || k === '?' || k === 'F1') { openHelp(scene); return; }
  if ((k === 'm' || k === 'M') && (scene.chromeOpts || {}).mission !== false && state.mission.role) { openMission(scene); return; }
}

// ---------------- modal ----------------
export function openModal(scene, title, o = {}) {
  const depth = 3000 + scene.modals.length * 100;
  const objs = [];
  const shade = dim(scene, o.dim ?? 0.72, depth); objs.push(shade);
  const w = o.w || 760, h = o.h || 520, x = o.x ?? (W - w) / 2, y = o.y ?? (H - h) / 2;
  objs.push(panel(scene, x, y, w, h, { fill: o.fill ?? C.navy, stroke: o.stroke ?? C.gold, bw: 4, depth: depth + 1, shadow: true }));
  if (title) objs.push(txt(scene, x + 28, y + 24, title, { font: 'title', size: 20, color: S.gold, depth: depth + 2 }));
  const modal = { x, y, w, h, depth: depth + 2, objs, onKey: null, onClose: o.onClose,
    add(obj) { if (obj.setDepth && !obj.cont) obj.setDepth(depth + 2); objs.push(obj); return obj; },
    close() {
      const i = scene.modals.indexOf(modal); if (i >= 0) scene.modals.splice(i, 1);
      for (const ob of objs) { try { ob.destroy(); } catch (e) { /* ignore */ } }
      scene.focusables = scene.focusables.filter((f) => f.modal !== modal);
      scene.focused = null;
      quiet();
      if (modal.onClose) modal.onClose();
    } };
  scene.modals.push(modal);
  if (o.closeButton !== false) {
    const b = pxButton(scene, x + w - 184, y + h - 80, 160, 56, o.closeLabel || '✕ CLOSE', () => modal.close(), { depth: depth + 3, modal, size: 14 });
    modal.closeBtn = b; objs.push(b);
  }
  return modal;
}

// a button that belongs to a modal
export function mButton(scene, modal, x, y, w, h, label, fn, o = {}) {
  const b = pxButton(scene, x, y, w, h, label, fn, { ...o, depth: modal.depth + 1, modal });
  modal.objs.push(b);
  return b;
}
export function mText(scene, modal, x, y, s, o = {}) { return modal.add(txt(scene, x, y, s, { ...o, depth: modal.depth })); }

// ---------------- Settings (Screen 1b) ----------------
export function openSettings(scene, o = {}) {
  if (scene.modals.find((md) => md.kind === 'settings')) return;
  const md = openModal(scene, t('settings.title'), { w: 620, h: 560, stroke: C.white });
  md.kind = 'settings';
  const s = state.settings;
  const rows = [
    { k: 'narration', label: t('settings.narration'), type: 'onoff' },
    { k: 'textSize', label: t('settings.textSize'), type: 'size' },
    { k: 'volume', label: t('settings.volume'), type: 'vol' },
    { k: 'music', label: t('settings.music'), type: 'onoff' },
    { k: 'sfx', label: t('settings.sfx'), type: 'onoff' },
    { k: 'reduceMotion', label: t('settings.reduceMotion'), type: 'onoff' }
  ];
  const changed = () => {
    saveSettings(); applyVolume(); refreshMusic();
    scene.registry.set('reduceMotion', s.reduceMotion);
  };
  rows.forEach((r, i) => {
    const y = md.y + 86 + i * 58;
    mText(scene, md, md.x + 32, y + 6, r.label, { size: 26 });
    if (r.type === 'onoff') {
      const on = mButton(scene, md, md.x + 330, y, 110, 44, 'ON', () => { s[r.k] = true; sync(); changed(); if (r.k === 'narration') say(t('settings.narrationOn')); }, { size: 12 });
      const off = mButton(scene, md, md.x + 452, y, 110, 44, 'OFF', () => { s[r.k] = false; sync(); changed(); }, { size: 12 });
      const sync = () => { on.setPrimary(!!s[r.k]); off.setPrimary(!s[r.k]); on.setLabel(s[r.k] ? '✓ ON' : 'ON'); off.setLabel(!s[r.k] ? '✓ OFF' : 'OFF'); };
      sync();
    } else if (r.type === 'size') {
      const btns = ['S', 'M', 'L'].map((z, j) => mButton(scene, md, md.x + 330 + j * 78, y, 66, 44, z, () => { s.textSize = z; sync(); changed(); scene.scene.restart(scene.routeData); }, { size: 12 }));
      const sync = () => btns.forEach((b, j) => b.setPrimary(['S', 'M', 'L'][j] === s.textSize));
      sync();
    } else {
      const minus = mButton(scene, md, md.x + 330, y, 56, 44, '-', () => { s.volume = Math.max(0, s.volume - 10); sync(); changed(); sfx(scene, 'sfx-place'); }, { size: 14 });
      const val = mText(scene, md, md.x + 430, y + 22, '', { font: 'title', size: 14, origin: 0.5 });
      const plus = mButton(scene, md, md.x + 476, y, 56, 44, '+', () => { s.volume = Math.min(100, s.volume + 10); sync(); changed(); sfx(scene, 'sfx-place'); }, { size: 14 });
      const sync = () => val.setText(`${s.volume}%`);
      sync(); void minus; void plus;
    }
  });
  mText(scene, md, md.x + 32, md.y + 444, t('settings.note'), { size: 20, color: S.muted, wrap: 380 });
  mButton(scene, md, md.x + 32, md.y + md.h - 80, 200, 56, t('settings.sources'), () => openSources(scene), { size: 12 });
  if (o.extra) o.extra(md);
  say(t('settings.title'));
  return md;
}

// ---------------- Help (contextual) ----------------
export function openHelp(scene) {
  if (scene.modals.find((md) => md.kind === 'help')) return;
  const key = (scene.chromeOpts && scene.chromeOpts.help) || scene.sys.settings.key;
  const h = (content.help && (content.help.screens[key] || content.help.screens.default)) || { title: 'HELP', what: '', controls: [] };
  const md = openModal(scene, `? ${h.title}`, { w: 820, h: 540 });
  md.kind = 'help';
  mText(scene, md, md.x + 28, md.y + 70, t('help.what'), { font: 'title', size: 12, color: S.cyan });
  mText(scene, md, md.x + 28, md.y + 92, h.what, { size: 26, wrap: md.w - 56 });
  mText(scene, md, md.x + 28, md.y + 250, t('help.controls'), { font: 'title', size: 12, color: S.cyan });
  const controls = [...(h.controls || []), ...content.help.global];
  mText(scene, md, md.x + 28, md.y + 272, controls.map((c) => '• ' + c).join('\n'), { size: 22, wrap: md.w - 56, color: S.text });
  say(`${h.title}. ${h.what}`);
  if (scene.onHelp) scene.onHelp();
  return md;
}

// ---------------- MY MISSION ----------------
export function openMission(scene) {
  if (scene.modals.find((md) => md.kind === 'mission')) return;
  const mi = state.mission;
  const md = openModal(scene, t('mission.title'), { w: 1000, h: 600 });
  md.kind = 'mission';
  const L = [];
  const roleName = mi.role ? (content.roles.roles.find((r) => r.id === mi.role) || {}).name : '—';
  L.push(`${t('mission.mode')}: ${mi.mode === '4p' ? '4 PLAYERS' : '1 PLAYER'}   ${t('mission.role')}: ${roleName || '—'}`);
  const planet = mi.planet ? (content.planets.planets.find((p) => p.id === mi.planet) || {}).name : '—';
  const obj = mi.objective ? (content.objectives.objectives.find((o) => o.id === mi.objective) || {}).title : '—';
  L.push(`${t('mission.planet')}: ${planet}   ${t('mission.objective')}: ${obj}`);
  const parts = STATION_IDS.map((id) => { const opt = stationOption(id, mi.stations[id]); return opt ? `${opt.letter}·${opt.short}` : '—'; });
  L.push(`${t('mission.parts')} (${mi.installOrder.length}/5): ${parts.join(' | ')}`);
  const kit = mi.instruments.kit.map((id) => (instrumentById(id) || {}).name || id);
  L.push(`${t('mission.instruments')} (${Object.keys(mi.instruments.inspected).length}/14 ${t('mission.inspected')}): ${kit.length ? kit.join(', ') : '—'}`);
  L.push(`${t('mission.orbit')}: ${mi.orbit.reached ? t('mission.orbitOk', { days: mi.orbit.travelDays, fuel: mi.orbit.dvTotal }) : '—'}`);
  const res = [];
  if (mi.launch.done) res.push(`hull ${mi.launch.hull}/3`);
  if (mi.rocks.done) res.push(`${mi.rocks.samples.length}/3 samples`);
  if (mi.comms.done) res.push(`${mi.comms.returnedMb}/${mi.comms.totalMb} Mb planned`);
  if (mi.signal.done) res.push(`${mi.signal.packets}/3 packets`);
  L.push(`${t('mission.results')}: ${res.length ? res.join(' · ') : '—'}`);
  L.push(`${t('mission.meters')}: $${mi.meters.budget.toLocaleString('en-US')} · ${mi.meters.mass} kg · ${t('mission.resp')} ${mi.meters.responsibility}%  (${t('common.simulated')})`);
  mText(scene, md, md.x + 28, md.y + 70, L.join('\n'), { size: 23, wrap: md.w - 56, lineSpacing: 6 });
  mText(scene, md, md.x + 28, md.y + 330, t('mission.log'), { font: 'title', size: 12, color: S.cyan });
  const log = mi.log.toArray();
  const lines = log.slice(-7).map((e) => `› ${e.text}`);
  mText(scene, md, md.x + 28, md.y + 352, lines.length ? lines.join('\n') : t('mission.logEmpty'), { size: 21, wrap: md.w - 56, color: S.text });
  say(L.join('. '));
  return md;
}

// ---------------- Sources ----------------
export function openSources(scene) {
  const list = allSources();
  const md = openModal(scene, t('sources.title'), { w: 1100, h: 640 });
  let page = 0; const per = 9;
  const body = mText(scene, md, md.x + 28, md.y + 66, '', { size: 20, wrap: md.w - 56, lineSpacing: 4 });
  const pg = mText(scene, md, md.x + 28, md.y + md.h - 64, '', { font: 'title', size: 12, color: S.muted });
  const draw = () => {
    const items = list.slice(page * per, page * per + per);
    body.setText(items.map((s) => `• ${s.title}\n  ${s.url}`).join('\n'));
    pg.setText(`${t('sources.page')} ${page + 1}/${Math.max(1, Math.ceil(list.length / per))} · ${t('sources.note')}`);
  };
  mButton(scene, md, md.x + md.w - 540, md.y + md.h - 80, 160, 56, '◀ PREV', () => { page = Math.max(0, page - 1); draw(); }, { size: 12 });
  mButton(scene, md, md.x + md.w - 364, md.y + md.h - 80, 160, 56, 'NEXT ▶', () => { page = Math.min(Math.ceil(list.length / per) - 1, page + 1); draw(); }, { size: 12 });
  md.onKey = (k) => { if (k === 'ArrowRight') { page = Math.min(Math.ceil(list.length / per) - 1, page + 1); draw(); } if (k === 'ArrowLeft') { page = Math.max(0, page - 1); draw(); } };
  draw();
  return md;
}

// ---------------- Pause (inside mini-games: no BACK, pause → quit) ----------------
export function openPause(scene, onQuit, o = {}) {
  if (scene.modals.find((md) => md.kind === 'pause')) return;
  scene.paused = true;
  if (scene.physics && scene.physics.world) scene.physics.world.pause();
  const md = openModal(scene, t('pause.title'), { w: 560, h: 470, closeButton: false, onClose: () => { scene.paused = false; } });
  md.kind = 'pause';
  mText(scene, md, md.x + 28, md.y + 70, o.note || t('pause.note'), { size: 24, wrap: md.w - 56 });
  mButton(scene, md, md.x + 28, md.y + 170, 504, 56, t('pause.resume'), () => md.close(), { primary: true, size: 16 });
  mButton(scene, md, md.x + 28, md.y + 240, 504, 56, t('pause.help'), () => openHelp(scene), { size: 16 });
  mButton(scene, md, md.x + 28, md.y + 310, 504, 56, t('pause.settings'), () => openSettings(scene), { size: 16 });
  mButton(scene, md, md.x + 28, md.y + 380, 504, 56, o.quitLabel || t('pause.quit'), () => { md.close(); onQuit(); }, { size: 16 });
  return md;
}

// ---------------- Confirm ----------------
export function confirmBox(scene, text, onYes, o = {}) {
  const md = openModal(scene, o.title || '', { w: 640, h: 300, closeButton: false });
  mText(scene, md, md.x + 28, md.y + 60, text, { size: 26, wrap: md.w - 56 });
  mButton(scene, md, md.x + 28, md.y + 210, 280, 56, o.no || 'CANCEL', () => md.close(), { size: 14 });
  mButton(scene, md, md.x + 332, md.y + 210, 280, 56, o.yes || 'YES', () => { md.close(); onYes(); }, { primary: true, size: 14 });
  say(text);
  return md;
}

// shared bits re-exported for scenes
export { fresh, mentorBar, canGoBack };
