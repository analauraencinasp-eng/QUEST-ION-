// Screens 15c–15i · MER COMMS PLANNER (a CRT monitor). Three decisions, each with a short real-context page first:
//   1 ROUTE (direct X-band vs UHF relay) → 2 WINDOW (when to talk) → 3 PRIORITY (what goes first) → results.
// Team decision: the choices change the data that reaches Earth, the energy used and the points.
// Data that does not fit stays in the rover's memory (it waits for the next pass / Signal Run).
// Priority uses the hand-written insertionSort (rules.bestOrder) to know the best plan for the feedback.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, mentorBar, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t, fill } from '../content.js';
import { state, logEvent } from '../state.js';
import { go, back } from '../router.js';
import { judgePlan, bestOrder } from '../rules.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const SCR = { x: 150, y: 36, w: 980, h: 500 };          // the green CRT screen
const G = { fg: '#7dffb0', dim: '#3fae74', amber: '#f2c14e', red: '#ff7a45', cyan: '#7fe3ff', bg: 0x06140c, line: 0x2e8a57 };
const STEPS = ['ctxRoute', 'route', 'ctxWindow', 'window', 'ctxPriority', 'priority', 'result'];

// the data list of this game: {CLUES} = the strong clues the player really collected
export function commsItems(mi) {
  const clues = (mi.rocks.samples || []).filter((s) => s.evidence === 'strong').map((s) => s.name.toLowerCase().split(' ')[0]);
  return content.comms.data.map((d) => ({ ...d, name: fill(d.name, { CLUES: clues.length ? clues.join(', ') : 'no strong clue yet' }) }));
}

export function windowsFor(route) {
  return content.comms.windows.filter((w) => (route === 'dte' ? w.route === 'dte' : !w.route));
}

export default class CommsScene extends Phaser.Scene {
  constructor() { super('CommsScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    this.items = commsItems(mi);
    this.plan = { route: mi.comms.route || 'uhf', window: mi.comms.window || null, order: (mi.comms.priority && mi.comms.priority.length ? mi.comms.priority : content.comms.startOrder).slice() };
    this.stepI = Math.max(0, STEPS.indexOf(data.step || 'ctxRoute'));
    if (!this.plan.window || !windowsFor(this.plan.route).find((w) => w.id === this.plan.window)) this.plan.window = windowsFor(this.plan.route)[0].id;
    // room + monitor
    this.add.rectangle(0, 0, W, H, 0x1b2233).setOrigin(0);
    this.add.rectangle(0, 560, W, 160, 0x3a2f28).setOrigin(0);
    this.add.rectangle(110, 0, 1060, 610, 0xd9d2bf).setOrigin(0).setStrokeStyle(4, 0x8a8270);
    this.add.rectangle(SCR.x - 8, SCR.y - 8, SCR.w + 16, SCR.h + 16, 0x2a2a2a).setOrigin(0);
    this.add.rectangle(SCR.x, SCR.y, SCR.w, SCR.h, G.bg).setOrigin(0);
    const scan = this.add.graphics().setDepth(40);
    scan.fillStyle(0x000000, 0.18); for (let y = SCR.y; y < SCR.y + SCR.h; y += 4) scan.fillRect(SCR.x, y, SCR.w, 1);
    this.add.rectangle(520, 610, 240, 40, 0xbdb6a2).setOrigin(0);
    this.add.rectangle(1030, 568, 14, 14, 0x2fbf71); this.add.rectangle(1060, 568, 14, 14, 0xe69f00);
    this.layer = this.add.container(0, 0).setDepth(10);
    this.btns = [];
    this.onKey = (k) => this.key(k);
    setup(this, data, { back: false, help: 'CommsScene', helpPos: [24, 640], esc: () => this.prev() });
    this.draw();
  }

  T(x, y, s, o = {}) { const tt = txt(this, x, y, s, { size: o.size || 22, color: o.color || G.fg, wrap: o.wrap, lineSpacing: 0, font: o.font, origin: o.origin }); this.layer.add(tt); return tt; }
  R(x, y, w, h, o = {}) { const r = this.add.rectangle(x, y, w, h, o.fill ?? G.bg, o.alpha ?? 1).setOrigin(0); if (o.stroke !== false) r.setStrokeStyle(o.sw || 2, o.stroke ?? G.line); this.layer.add(r); return r; }
  B(x, y, w, label, fn, o = {}) {
    const b = pxButton(this, x, y, w, 40, label, fn, { size: 10, primary: !!o.primary, fill: G.bg, stroke: 0x7dffb0, color: G.fg, depth: 20 });
    this.btns.push(b); return b;
  }

  clear() {
    this.layer.removeAll(true);
    this.btns.forEach((b) => b.destroy()); this.btns = [];
    (this.hots || []).forEach((h) => h.destroy()); this.hots = [];
    if (this.mentor) { this.mentor.destroy(); this.mentor = null; }
    this.drag = null;
  }

  header() {
    const x = SCR.x, y = SCR.y;
    this.R(x, y, SCR.w, 30, { fill: 0x0f2a1a, stroke: false });
    this.T(x + 14, y + 6, fill(t('comms.planner'), { N: content.comms.sol }), { font: 'title', size: 9 });
    const labels = t('comms.steps');
    const done = Math.floor(this.stepI / 2);
    let bx = x + SCR.w - 12;
    for (let i = labels.length - 1; i >= 0; i--) {
      const s = (i < done ? '[x] ' : '') + labels[i];
      const tt = txt(this, 0, y + 15, s, { font: 'title', size: 7, color: i === done ? '#06140c' : G.fg, origin: [1, 0.5] });
      const w = tt.width + 14; tt.x = bx - 7;
      this.R(bx - w, y + 5, w, 20, { fill: i === done ? 0x7dffb0 : G.bg, stroke: 0x7dffb0 });
      this.layer.add(tt); bx -= w + 6;
    }
    this.T(x + 14, y + SCR.h - 24, t('comms.assumptions'), { size: 18, color: G.dim });
  }

  draw() {
    this.clear();
    this.header();
    const st = STEPS[this.stepI];
    this.routeData = { step: st };
    if (st.startsWith('ctx')) this.drawContext(st);
    else if (st === 'route') this.drawRoute();
    else if (st === 'window') this.drawWindow();
    else if (st === 'priority') this.drawPriority();
    else this.drawResult();
  }

  // ---------- 15c / 15e / 15g · real context ----------
  drawContext(st) {
    const c = content.comms.context[{ ctxRoute: 'routes', ctxWindow: 'windows', ctxPriority: 'priority' }[st]];
    const x = SCR.x + 28; let y = SCR.y + 50;
    this.T(x, y, c.title, { font: 'title', size: 13, color: G.amber }); y += 36;
    y += this.T(x, y, c.intro, { wrap: SCR.w - 56 }).height + 12;
    for (const l of c.lines) y += this.T(x, y, l.text, { wrap: SCR.w - 56, size: 21 }).height + 10;
    const extra = c.fact ? c.fact.text : c.formula || c.rule;
    if (extra) { this.R(x - 8, y, SCR.w - 40, 0, { stroke: false }); const e = this.T(x, y + 6, `FACT: ${extra}`, { color: G.cyan, wrap: SCR.w - 56, size: 21 }); y += e.height + 16; }
    this.B(SCR.x + SCR.w - 190, SCR.y + SCR.h - 74, 170, t('comms.next'), () => this.next(), { primary: true });
    if (this.stepI > 0) this.B(SCR.x + SCR.w - 370, SCR.y + SCR.h - 74, 160, t('comms.back'), () => this.prev());
    this.mentor = mentorBar(this, 150, 600, 760, 104, '', { portrait: 100, size: 21, depth: 30 });
    this.mentor.set(c.mentor, { silent: true });
    say(`${c.title}. ${c.intro} ${c.lines.map((l) => l.text.replace(/^> /, '')).join(' ')} ${extra || ''} ${c.mentor}`);
  }

  // ---------- 15d · route ----------
  drawRoute() {
    const x = SCR.x + 28; const y = SCR.y + 50;
    this.T(x, y, t('comms.routeTitle'), { font: 'title', size: 13, color: G.amber });
    this.T(x, y + 32, t('comms.installed'), { size: 20, color: G.cyan });
    const routes = content.comms.routes;
    this.hots = [];
    routes.forEach((r, i) => {
      const bx = x + i * 470, by = y + 66, bw = 450, bh = 190;
      const on = this.plan.route === r.id;
      this.R(bx, by, bw, bh, { stroke: on ? 0x7dffb0 : G.line, sw: on ? 4 : 2, fill: on ? 0x0f2a1a : G.bg });
      this.T(bx + 14, by + 12, `${on ? '> ' : '  '}${r.name}`, { font: 'title', size: 9, color: on ? G.fg : G.dim });
      const rows = [[t('comms.speed'), r.speed], [t('comms.contact'), r.contact], [t('comms.energyCost'), r.energy], [t('comms.needs'), r.needs]];
      let yy = by + 44;
      for (const [k, v] of rows) { this.T(bx + 14, yy, k, { size: 20, color: G.dim }); const vt = this.T(bx + 170, yy, v, { size: 20, wrap: bw - 184 }); yy += Math.max(28, vt.height + 6); }
      this.hots.push(hotspot(this, bx, by, bw, bh, `${r.name}. ${rows.map((q) => `${q[0]} ${q[1]}`).join('. ')}`, () => { this.plan.route = r.id; this.plan.window = null; sfx(this, 'sfx-pickup'); this.draw(); }, { depth: 15 }));
    });
    this.T(x, y + 276, fill(t('comms.oneSession'), { A: routes[0].capacityMb, B: routes[1].capacityMb }), { color: G.amber, size: 21 });
    const sel = routes.find((r) => r.id === this.plan.route);
    this.T(x, y + 306, fill(t('comms.selectedRoute'), { NAME: sel.short }), { size: 21 });
    this.B(SCR.x + SCR.w - 190, SCR.y + SCR.h - 74, 170, t('comms.confirm'), () => this.next(), { primary: true });
    this.B(SCR.x + SCR.w - 370, SCR.y + SCR.h - 74, 160, t('comms.back'), () => this.prev());
    this.onListKey = (k) => { const i = routes.findIndex((r) => r.id === this.plan.route); if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') { this.plan.route = routes[(i + 1) % 2].id; this.plan.window = null; this.draw(); return true; } return false; };
    say(`${t('comms.routeTitle')}. ${routes.map((r) => `${r.name}: speed ${r.speed}, contact ${r.contact}, energy ${r.energy}, needs ${r.needs}.`).join(' ')} Selected: ${sel.short}. Use the arrows to change and Enter to confirm.`);
  }

  // ---------- 15f · window ----------
  drawWindow() {
    const wins = windowsFor(this.plan.route);
    if (!this.plan.window || !wins.find((w) => w.id === this.plan.window)) this.plan.window = wins[0].id;
    const x = SCR.x + 28; const y = SCR.y + 50;
    const route = content.comms.routes.find((r) => r.id === this.plan.route);
    this.T(x, y, `${t('comms.windowTitle')}  (${route.short})`, { font: 'title', size: 13, color: G.amber });
    // sol timeline 00:00 → 24:00
    const tx = x + 10, tw = SCR.w - 76, ty = y + 56;
    this.R(tx + (6 / 24) * tw, ty - 18, (12 / 24) * tw, 4, { fill: 0xe69f00, stroke: false });
    this.T(tx + (12 / 24) * tw, ty - 34, t('comms.daytime'), { size: 18, color: G.amber, origin: [0.5, 0] });
    this.T(tx + (1.5 / 24) * tw, ty - 34, t('comms.night'), { size: 18, color: G.cyan, origin: [0.5, 0] });
    this.R(tx, ty, tw, 2, { fill: 0x7dffb0, stroke: false });
    for (let h = 0; h <= 24; h += 6) { this.R(tx + (h / 24) * tw, ty - 6, 2, 14, { fill: 0x7dffb0, stroke: false }); this.T(tx + (h / 24) * tw, ty + 12, `${String(h).padStart(2, '0')}:00`, { size: 17, color: G.dim, origin: [0.5, 0] }); }
    for (const w of wins) this.R(tx + (w.start / 24) * tw - 5, ty - 5, 10, 12, { fill: w.id === this.plan.window ? 0xffffff : 0x2fbf71, stroke: false });
    // table
    const cols = [[t('comms.colWindow'), 0], [t('comms.colTime'), 280], [t('comms.colLength'), 370], [t('comms.colElev'), 460], [t('comms.colCap'), 590], [t('comms.colEnergy'), 720]];
    const by = ty + 52;
    this.R(x, by, SCR.w - 56, 34 + wins.length * 38, {});
    cols.forEach(([c, cx]) => this.T(x + 24 + cx, by + 8, c, { font: 'title', size: 7, color: G.dim }));
    this.hots = [];
    wins.forEach((w, i) => {
      const ry = by + 32 + i * 38, on = w.id === this.plan.window;
      if (on) this.R(x + 6, ry, SCR.w - 68, 34, { fill: 0x0f2a1a, stroke: 0x7dffb0, sw: 3 });
      const v = [w.name, w.time, w.len, w.elev, `about ${w.capacityMb} Mb*`, w.energy];
      v.forEach((s, k) => this.T(x + 24 + cols[k][1], ry + 6, (k === 0 && on ? '> ' : '') + s, { size: 20, color: k === 5 && w.energyCost >= 30 ? G.red : G.fg }));
      this.hots.push(hotspot(this, x + 6, ry, SCR.w - 68, 34, `${w.name}, ${w.time}, ${w.len}, ${w.elev}, about ${w.capacityMb} megabits, energy ${w.energy}`, () => { this.plan.window = w.id; this.draw(); }, { depth: 15 }));
    });
    const sel = wins.find((w) => w.id === this.plan.window);
    const ny = by + 50 + wins.length * 38;
    this.T(x, ny, fill(t('comms.selectedWindow'), { NAME: sel.name, CAP: sel.capacityMb }), { color: G.fg, size: 21, wrap: SCR.w - 56 });
    this.T(x, ny + 30, fill(t('comms.fitNext'), { CAP: sel.capacityMb }), { color: G.amber, size: 21 });
    this.B(SCR.x + SCR.w - 190, SCR.y + SCR.h - 74, 170, t('comms.confirm'), () => this.next(), { primary: true });
    this.B(SCR.x + SCR.w - 370, SCR.y + SCR.h - 74, 160, t('comms.back'), () => this.prev());
    this.onListKey = (k) => {
      const i = wins.findIndex((w) => w.id === this.plan.window);
      if (k === 'ArrowDown') { this.plan.window = wins[(i + 1) % wins.length].id; this.draw(); return true; }
      if (k === 'ArrowUp') { this.plan.window = wins[(i + wins.length - 1) % wins.length].id; this.draw(); return true; }
      return false;
    };
    say(`${t('comms.windowTitle')}. ${wins.map((w) => `${w.name} at ${w.time}, ${w.len}, ${w.elev}, about ${w.capacityMb} megabits, energy ${w.energy}.`).join(' ')} Selected ${sel.name}. Up and down arrows change it, Enter confirms.`);
  }

  capacity() { const w = content.comms.windows.find((x) => x.id === this.plan.window); return w ? w.capacityMb : 0; }

  // ---------- 15h · priority (drag to reorder) ----------
  drawPriority() {
    const x = SCR.x + 28; const y = SCR.y + 50;
    this.T(x, y, t('comms.priorityTitle'), { font: 'title', size: 13, color: G.amber });
    const cap = this.capacity();
    const res = judgePlan(this.plan.order, this.items, cap);
    const status = (id) => res.sent.find((s) => s.id === id) ? ['SENT', G.fg] : res.partial.find((s) => s.id === id) ? [`PARTIAL ${res.partial[0].sentMb}/${this.items.find((i) => i.id === id).mb}`, G.amber] : ['WAITS', G.red];
    if (this.sel === undefined) this.sel = 0;
    this.rowY = (i) => y + 40 + i * 50;
    this.hots = [];
    this.rowObjs = this.plan.order.map((id, i) => {
      const it = this.items.find((d) => d.id === id);
      const ry = this.rowY(i), on = i === this.sel;
      const box = this.R(x, ry, 900, 42, { fill: on ? 0x0f2a1a : G.bg, stroke: on ? 0xffffff : G.line, sw: on ? 3 : 2 });
      const grip = this.T(x + 12, ry + 9, '::', { size: 22, color: G.dim });
      const num = this.T(x + 44, ry + 9, String(i + 1), { size: 22, color: G.amber });
      const nm = this.T(x + 74, ry + 9, it.name, { size: 21 });
      const mb = this.T(x + 560, ry + 9, `${it.mb} Mb*`, { size: 21 });
      const [sl, sc] = status(id);
      const stt = this.T(x + 700, ry + 13, sl, { font: 'title', size: 7, color: sc });
      const objs = [box, grip, num, nm, mb, stt];
      box.setInteractive({ draggable: true, useHandCursor: true });
      box.on('pointerdown', () => { this.sel = i; });
      box._row = i;
      return { objs, id, ry };
    });
    this.input.setDraggable(this.rowObjs.map((r) => r.objs[0]));
    this.input.off('drag'); this.input.off('dragend');
    this.input.on('drag', (p, obj) => {
      const i = obj._row; if (i === undefined) return;
      const dy = p.y - (this.rowY(i) + 21);
      this.rowObjs[i].objs.forEach((o) => { o.y = (o._baseY ?? (o._baseY = o.y)) + dy; });
    });
    this.input.on('dragend', (p, obj) => {
      const i = obj._row; if (i === undefined) return;
      let j = Math.round((p.y - 21 - this.rowY(0)) / 50);
      j = Math.max(0, Math.min(this.plan.order.length - 1, j));
      const [id] = this.plan.order.splice(i, 1); this.plan.order.splice(j, 0, id);
      this.sel = j; sfx(this, 'sfx-place'); this.draw();
    });
    // capacity bar
    const by = y + 40 + this.plan.order.length * 50 + 14, bw = SCR.w - 56;
    this.R(x, by, bw, 22, { fill: 0x0f2a1a, stroke: G.line });
    let px = x; const total = res.totalMb, cols = [0x56c8e8, 0x2fbf71, 0xf0c040, 0xc98f2a, 0x8a93c8];
    this.plan.order.forEach((id, k) => { const it = this.items.find((d) => d.id === id); const wpx = (it.mb / total) * bw; this.R(px, by + 2, wpx, 18, { fill: cols[k % 5], stroke: false }); px += wpx; });
    this.R(x + (cap / total) * bw, by - 4, 3, 30, { fill: 0xff7a45, stroke: false });
    this.T(x, by + 30, t('comms.grab'), { size: 19, color: G.dim });
    this.T(x + bw, by + 30, fill(t('comms.fits'), { R: res.returnedMb, T: total, W: (content.comms.windows.find((w) => w.id === this.plan.window) || {}).short || '' }), { size: 19, color: G.red, origin: [1, 0] });
    this.B(SCR.x + SCR.w - 190, SCR.y + SCR.h - 74, 170, t('comms.send'), () => this.next(), { primary: true });
    this.B(SCR.x + SCR.w - 370, SCR.y + SCR.h - 74, 160, t('comms.back'), () => this.prev());
    this.onListKey = (k) => {
      const n = this.plan.order.length, lk = k.toLowerCase();
      if (k === 'ArrowDown') { this.sel = (this.sel + 1) % n; this.draw(); return true; }
      if (k === 'ArrowUp') { this.sel = (this.sel + n - 1) % n; this.draw(); return true; }
      if (lk === 'w' || lk === 's') {
        const j = lk === 'w' ? this.sel - 1 : this.sel + 1; if (j < 0 || j >= n) return true;
        const o = this.plan.order; [o[this.sel], o[j]] = [o[j], o[this.sel]]; this.sel = j; sfx(this, 'sfx-place'); this.draw(); return true;
      }
      return false;
    };
    if (!this.spokePriority) { this.spokePriority = true; say(`${t('comms.priorityTitle')}. ${this.plan.order.map((id, i) => `${i + 1}: ${this.items.find((d) => d.id === id).name}, ${status(id)[0]}`).join('. ')}. ${res.returnedMb} of ${total} megabits fit. ${t('comms.grab')}`); }
  }

  // ---------- 15i · results ----------
  drawResult() {
    const mi = state.mission;
    const cap = this.capacity();
    const res = judgePlan(this.plan.order, this.items, cap);
    const win = content.comms.windows.find((w) => w.id === this.plan.window);
    const route = content.comms.routes.find((r) => r.id === this.plan.route);
    const x = SCR.x + 28; let y = SCR.y + 50;
    this.T(x, y, t('comms.resultTitle'), { font: 'title', size: 13, color: G.amber }); y += 34;
    const boxes = [[t('comms.returned'), `${res.returnedMb} / ${res.totalMb} Mb*`], [t('comms.route'), route.short], [t('comms.window'), win.short], [t('comms.energyUsed'), win.energy]];
    let bx = x;
    for (const [k, v] of boxes) { const vt = txt(this, 0, 0, v, { font: 'title', size: 10, color: G.fg }); const w = Math.max(150, vt.width + 24); this.R(bx, y, w, 58, { stroke: 0x7dffb0 }); this.T(bx + 10, y + 8, k, { font: 'title', size: 6, color: G.dim }); vt.setPosition(bx + 10, y + 28); this.layer.add(vt); bx += w + 12; }
    y += 72;
    const strong = (mi.rocks.samples || []).filter((s) => s.evidence === 'strong');
    const sciSent = res.sent.find((s) => s.id === 'spectra');
    this.T(x, y, sciSent ? fill(t('comms.sciYes'), { LIST: strong.map((s) => s.name.toLowerCase()).join(', ') || '—' }) : t('comms.sciNo'), { size: 20, color: sciSent ? G.fg : G.red, wrap: SCR.w - 56 }); y += 30;
    const names = (a) => a.map((s) => s.name.replace(/ \(.*\)/, '')).join(', ') || '—';
    y += this.T(x, y, `SENT: ${names(res.sent)}.   PARTIAL: ${res.partial.length ? `${names(res.partial)} (${res.partial[0].sentMb}/${res.partial[0].mb} Mb*)` : '—'}.   ${t('comms.waitingMem')}: ${names(res.waiting)}.`, { size: 20, wrap: SCR.w - 56 }).height + 10;
    // feedback lines
    const fb = content.comms.feedback, lines = [];
    lines.push(sciSent ? fb.smallFirst : fb.scienceLate);
    lines.push(res.telemetryFirst ? fb.telemetryFirst : fb.telemetryLate);
    if (res.partial.length) lines.push(fill(fb.partial, { NAME: res.partial[0].name.replace(/ \(.*\)/, '') }));
    else if (!res.waiting.length) lines.push(fb.allFit);
    if (win.night) lines.push(fb.night);
    lines.push(this.plan.route === 'uhf' ? fb.dteNote : fb.uhfNote);
    const fbBox = this.R(x, y, SCR.w - 56, 10, { stroke: 0xe69f00 });
    this.T(x + 12, y + 6, 'FEEDBACK', { font: 'title', size: 7, color: G.amber });
    let fy = y + 22;
    for (const l of lines) fy += this.T(x + 12, fy, l, { size: 20, color: l[0] === '+' ? G.fg : l[0] === '-' ? G.red : G.cyan, wrap: SCR.w - 80 }).height + 4;
    fbBox.setSize(SCR.w - 56, fy - y + 6);
    // save (team decision: data, energy and points come from these choices)
    const best = judgePlan(bestOrder(this.items), this.items, cap);
    mi.comms = { route: this.plan.route, window: this.plan.window, priority: this.plan.order.slice(), quality: res.quality,
      returnedMb: res.returnedMb, totalMb: res.totalMb, energy: win.energyCost, bestReturnedMb: best.returnedMb,
      sent: res.sent.map((s) => s.id), partial: res.partial.map((s) => ({ id: s.id, sentMb: s.sentMb })), waiting: res.waiting.map((s) => s.id), done: true };
    logEvent(`Comms plan: ${route.short}, ${win.short}, ${res.returnedMb}/${res.totalMb} Mb, quality ${res.quality}.`, 'comms');
    this.B(SCR.x + SCR.w - 300, SCR.y + SCR.h - 74, 280, t('comms.execute'), () => this.execute(), { primary: true });
    this.B(SCR.x + SCR.w - 480, SCR.y + SCR.h - 74, 160, t('comms.replan'), () => { this.stepI = 1; this.draw(); });
    const good = res.quality === 'good' && this.plan.route === 'uhf';
    this.mentor = mentorBar(this, 150, 600, 760, 104, '', { portrait: 100, size: 21, depth: 30 });
    const ment = good ? fb.good : res.quality === 'poor' ? t('comms.poor') : fb.ok;
    this.mentor.set(ment, { silent: true });
    say(`${t('comms.resultTitle')}. ${res.returnedMb} of ${res.totalMb} megabits returned with ${route.short}, ${win.name}. ${lines.join(' ')} ${ment} Press Enter to execute the plan in Signal Run.`);
  }

  key(k) {
    if (this.onListKey && ['route', 'window', 'priority'].includes(STEPS[this.stepI]) && this.onListKey(k)) return true;
    if (k === 'Enter') { if (STEPS[this.stepI] === 'result') this.execute(); else this.next(); return true; }
    if (k === 'Backspace') { this.prev(); return true; }
    return false;
  }

  next() { if (this.stepI < STEPS.length - 1) { this.stepI += 1; this.sel = 0; this.spokePriority = false; sfx(this, 'sfx-pickup'); this.draw(); } }
  prev() { if (this.stepI > 0) { this.stepI -= 1; this.draw(); } else back(this); }
  execute() { go(this, 'NextUpScene', { id: '16-0', next: 'TalkScene' }, { transition: 'dither' }); }
}
