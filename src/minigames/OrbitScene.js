// Screen 12 · Plan your orbit (team design, Nov 2026).
//   12   briefing: 3 rules of the road + an example path (Spirit's real dates)
//   12-0 STEP 0 · draw your guess of the path with the mouse (kept on the map to compare)
//   12b-T1..T4 tutorial, mandatory the first time: launch date → travel time → criterion → engage
//   12b  free play: LAUNCH DATE + TRAVEL TIME sliders + CRITERION (save fuel / arrive faster / balance)
//   12c  ENGAGE: the trajectory on screen is launched; rating for the criterion + comparison with Spirit & Opportunity
// Science (src/orbit.js): real Earth/Mars positions + velocities from JPL Horizons (live via server.mjs, or the saved
// copy) and Lambert's problem → Δv departure, Δv arrival, Δv total. Rocket limits and stars are simulated game values.
import { C, S, W, H, fs } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, mentorBar, slider, link, fit, chip } from '../ui/widgets.js';
import { setup, openModal, mText, mButton } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go, back } from '../router.js';
import { loadEphemeris } from '../ephemeris.js';
import { transfer, pathPoints, grid, bestFor, rate, feasible, ephDays, stateAt } from '../orbit.js';
import { judgeDrawing, dateFromDay, fmtDate } from '../rules.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const MAP = { x: 24, y: 96, w: 620, h: 540, cx: 334, cy: 360, scale: 150 };
const P = { x: 664, y: 96, w: 592, h: 540 };          // right panel
const SUN = { x: MAP.cx, y: MAP.cy };
const fs23 = () => `${fs(23)}px`, fs19 = () => `${fs(19)}px`;

export default class OrbitScene extends Phaser.Scene {
  constructor() { super('OrbitScene'); }

  create(data) {
    fresh(this);
    this.L = content.orbit.lambert;
    this.mi = state.mission;
    const o = this.mi.orbit;
    if (o.criterion == null) o.criterion = this.L.default.criterion;
    this.add.rectangle(0, 0, W, H, 0x050816).setOrigin(0);
    this.stars();
    this.title = txt(this, 24, 30, t('orbit.title'), { font: 'title', size: 24, color: S.gold, origin: [0, 0.5], shadow: 3 });
    this.sub = txt(this, 24, 66, t('orbit.sub'), { size: 22, origin: [0, 0.5] });
    panel(this, MAP.x, MAP.y, MAP.w, MAP.h, { fill: 0x050816, stroke: C.cyan, bw: 3 });
    this.mapG = this.add.graphics().setDepth(5);
    this.drawG = this.add.graphics().setDepth(6);
    this.mapLabels = [];
    this.dataLabel = txt(this, 24, 654, t('orbit.loading'), { size: 19, color: S.muted, origin: [0, 0.5] });
    this.ui = [];                                     // objects of the right panel (rebuilt per step)
    this.showBest = false;
    setup(this, data, { back: false, help: 'OrbitScene', helpPos: [24, 640], esc: () => back(this) });
    this.dataLabel.setX(104);
    this.onKey = (k) => this.key(k);
    // map drawing input (step 0)
    this.input.on('pointerdown', (p) => { if (this.step === 'draw' && this.inMap(p)) { this.drawing = true; this.mi.orbit.drawnPath = [{ x: p.x, y: p.y }]; this.renderMap(); } });
    this.input.on('pointermove', (p) => {
      if (this.step !== 'draw' || !this.drawing || !this.inMap(p)) return;
      const pts = this.mi.orbit.drawnPath, l = pts[pts.length - 1];
      if (!l || Math.hypot(p.x - l.x, p.y - l.y) > 6) { pts.push({ x: Math.round(p.x), y: Math.round(p.y) }); this.renderMap(); }
    });
    this.input.on('pointerup', () => { if (this.drawing) { this.drawing = false; this.buildPanel(); } });
    // real data first (live Horizons or saved copy), then the comparison grid
    loadEphemeris().then((src) => {
      if (!this.sys || !this.sys.isActive()) return;
      this.eph = src.eph;
      this.dataLabel.setText(src.live ? t('orbit.live') : t('orbit.saved', { DATE: (src.fetched || '').slice(0, 10) }));
      this.maxLaunch = ephDays(this.eph) - 2 - this.L.tofMin;
      if (!o.launchDay || o.launchDay > this.maxLaunch) o.launchDay = this.dayOf(this.L.default.launch);
      if (!o.tof) o.tof = this.L.default.tof;
      this.rows = grid(this.eph, this.L);
      this.windows = this.windowZones();
      this.start(data);
    });
  }

  // ---------------- helpers ----------------
  stars() {
    const g = this.add.graphics();
    for (let i = 0; i < 140; i++) { g.fillStyle(0xffffff, (i % 5) / 6 + 0.2); g.fillRect((i * 389) % W, (i * 197 + (i % 7) * 31) % H, 2, 2); }
  }
  inMap(p) { return p.x > MAP.x + 6 && p.x < MAP.x + MAP.w - 6 && p.y > MAP.y + 6 && p.y < MAP.y + MAP.h - 6; }
  toScreen(pt) { const x = Array.isArray(pt) ? pt[0] : pt.x, y = Array.isArray(pt) ? pt[1] : pt.y; return { x: MAP.cx + x * MAP.scale, y: MAP.cy - y * MAP.scale }; }
  dayOf(iso) { return Math.round((Date.parse(iso) - Date.parse(this.eph.start || '2003-01-01')) / 864e5); }
  dateOf(day) { return fmtDate(dateFromDay(this.eph.start || '2003-01-01', day)); }
  critLabel(c = this.mi.orbit.criterion) { return this.L.criteria[c].label; }
  months(d) { return Math.round(d / 30.44 * 10) / 10; }

  // green zones of the date bar: launch days with at least one trajectory inside the rocket limits
  windowZones() {
    const okDays = new Set(this.rows.filter((r) => feasible({ ok: true, ...r }, this.L)).map((r) => r.launchDay));
    const zones = []; let s = null, prev = null;
    for (const d of [...okDays].sort((a, b) => a - b)) {
      if (s === null) s = d;
      else if (d - prev > this.L.gridStepDays) { zones.push([s, prev]); s = d; }
      prev = d;
    }
    if (s !== null) zones.push([s, prev]);
    return zones;
  }
  inWindow(day) { return this.windows.some(([a, b]) => day >= a - 1 && day <= b + 1); }

  start(data) {
    const o = this.mi.orbit;
    if (!o.drawnPath || o.drawnPath.length < 5) this.setStep('brief');
    else if (!o.tutorialDone) this.setStep('tut', 0);
    else this.setStep('free');
    if (data && data.fromBack && o.reached) this.setStep('free');
  }

  setStep(step, tut = 0) {
    this.step = step; this.tut = tut;
    const titles = { brief: ['title', 'sub'], draw: ['title', 'sub'], tut: ['titleFree', 'subFree'], free: ['titleFree', 'subFree'] };
    this.title.setText(t(`orbit.${titles[step][0]}`));
    this.sub.setText(step === 'draw' ? t('orbit.drawFirst') : step === 'free' || step === 'tut' ? 'Choose the launch date, the travel time and what matters most' : t(`orbit.${titles[step][1]}`));
    this.recalc();
    this.buildPanel();
  }

  recalc() {
    const o = this.mi.orbit;
    if (!this.eph) return;
    this.tr = transfer(this.eph, o.launchDay, o.tof);
    this.path = this.tr.ok ? pathPoints(this.tr) : [];
    this.best = bestFor(this.rows, o.criterion, this.L);
    this.rating = this.best ? rate(this.tr, o.criterion, this.best, this.L) : { stars: 0, label: 'none' };
    this.bestTr = this.best ? transfer(this.eph, this.best.launchDay, this.best.tof) : null;
    this.renderMap();
  }

  // ---------------- map ----------------
  renderMap() {
    const g = this.mapG; g.clear();
    this.mapLabels.forEach((l) => l.destroy()); this.mapLabels = [];
    if (!this.eph) return;
    const o = this.mi.orbit;
    const lab = (x, y, s, col, o2 = {}) => { const tt = txt(this, x, y, s, { size: 19, color: col, origin: o2.origin ?? [0, 0.5], depth: 9 }); this.mapLabels.push(tt); return tt; };
    const dots = (body, days, every, col) => {
      g.fillStyle(col, 0.85);
      for (let d = 0; d < days; d += every) { const p = this.toScreen(stateAt(this.eph, body, d).r); g.fillRect(p.x - 2, p.y - 2, 4, 4); }
    };
    dots('earth', 366, 4, 0x3b7be8);
    dots('mars', 687, 6, 0xd5582f);
    // sun
    g.fillStyle(0xffb300, 1); g.fillCircle(SUN.x, SUN.y, 20); g.fillStyle(0xffe066, 1); g.fillCircle(SUN.x, SUN.y, 13);
    lab(SUN.x, SUN.y + 34, t('orbit.sun'), S.gold, { origin: 0.5 });
    const day = this.step === 'brief' ? this.dayOf(content.orbit.real.spiritLaunch) : o.launchDay;
    const tof = this.step === 'brief' ? this.dayOf(content.orbit.real.spiritArrival) - day : o.tof;
    const e = this.toScreen(stateAt(this.eph, 'earth', day).r);
    const mNow = this.toScreen(stateAt(this.eph, 'mars', day).r);
    const mArr = this.toScreen(stateAt(this.eph, 'mars', day + tof).r);
    // best path (ghost)
    if (this.showBest && this.bestTr && this.bestTr.ok && this.step !== 'brief') {
      const bp = pathPoints(this.bestTr, 60).map((p) => this.toScreen(p));
      g.fillStyle(0x2fbf71, 0.9); bp.forEach((p, i) => { if (i % 2 === 0) g.fillRect(p.x - 2, p.y - 2, 4, 4); });
      const end = bp[bp.length - 1]; lab(end.x + 8, end.y + 14, t('orbit.bestPath'), S.green);
    }
    // the transfer path
    const tr = this.step === 'brief' ? transfer(this.eph, day, tof) : this.tr;
    const pts = (this.step === 'brief' ? pathPoints(tr) : this.path).map((p) => this.toScreen(p));
    const okPath = tr && tr.ok && (this.step === 'brief' || feasible(tr, this.L));
    if (this.step !== 'draw') {
      g.fillStyle(okPath ? C.gold : C.red, 1);
      pts.forEach((p, i) => { if (i % 2 === 0) g.fillRect(p.x - 3, p.y - 3, 6, 6); });
    }
    // planets
    g.fillStyle(0x3b7be8, 1); g.fillRect(e.x - 9, e.y - 9, 18, 18); g.lineStyle(2, 0xffffff, 1); g.strokeRect(e.x - 9, e.y - 9, 18, 18);
    lab(e.x - 14, e.y - 22, `${t('orbit.earth')} (launch)`, S.blue, { origin: [1, 0.5] });
    g.fillStyle(0xd5582f, 0.8); g.fillRect(mNow.x - 7, mNow.y - 7, 14, 14);
    lab(mNow.x + 12, mNow.y, t('orbit.marsNow'), S.red);
    if (this.step !== 'draw') {
      g.fillStyle(0xd5582f, 1); g.fillRect(mArr.x - 9, mArr.y - 9, 18, 18);
      g.lineStyle(2, okPath ? C.green : 0xffffff, 1); g.strokeRect(mArr.x - 14, mArr.y - 14, 28, 28);
      lab(mArr.x + 18, mArr.y - 14, t('orbit.marsArr'), okPath ? S.green : S.red);
    }
    // the player's drawn guess
    const d = this.drawG; d.clear();
    const dp = o.drawnPath || [];
    if (dp.length > 1) {
      d.lineStyle(3, 0xffffff, this.step === 'draw' ? 0.95 : 0.45);
      for (let i = 1; i < dp.length; i++) if (i % 2 === 1 || this.step === 'draw') d.lineBetween(dp[i - 1].x, dp[i - 1].y, dp[i].x, dp[i].y);
      if (this.step !== 'draw') lab(dp[dp.length - 1].x + 6, dp[dp.length - 1].y + 14, t('orbit.yourGuess'), S.muted);
    }
    // legend
    const ly = MAP.y + MAP.h - 22;
    const leg = [[0x3b7be8, t('orbit.earthOrbit')], [0xd5582f, t('orbit.marsOrbit')], [C.gold, t('orbit.yourPath')]];
    let lx = MAP.x + 14;
    leg.forEach(([col, s]) => { g.fillStyle(col, 1); g.fillRect(lx, ly - 4, 9, 9); lx += 16; const tt = txt(this, lx, ly, s, { font: 'title', size: 6, origin: [0, 0.5], depth: 9 }); this.mapLabels.push(tt); lx += tt.width + 16; });
  }

  // ---------------- right panel ----------------
  clearPanel() {
    const gone = new Set(this.ui);
    this.ui.forEach((o) => { try { if (o && o.destroy) o.destroy(); } catch (e) { /* already gone */ } });
    this.focusables = this.focusables.filter((f) => !gone.has(f));
    if (gone.has(this.focused)) this.focused = null;
    this.ui = []; this.dyn = null;
  }
  u(o) { this.ui.push(o); return o; }

  buildPanel() {
    this.clearPanel();
    if (!this.eph) return;
    this.u(panel(this, P.x, P.y, P.w, P.h, { fill: 0x0b0f26, stroke: C.gold, bw: 4, depth: 10 }));
    if (this.step === 'brief') return this.panelBrief();
    if (this.step === 'draw') return this.panelDraw();
    return this.panelPlay();
  }

  panelBrief() {
    const x = P.x + 18;
    this.u(txt(this, x, P.y + 20, t('orbit.rules'), { font: 'title', size: 9, color: S.muted, depth: 11 }));
    let y = P.y + 44;
    for (const r of content.orbit.rules) {
      this.u(txt(this, x, y, r.title, { font: 'title', size: 9, color: S.gold, depth: 11 }));
      const b = this.u(txt(this, x, y + 18, r.text, { size: 21, wrap: P.w - 40, depth: 11, lineSpacing: 0 }));
      y += 26 + b.height;
    }
    this.u(txt(this, x, y + 4, `Example on the map: Spirit's real dates, ${fmtDate(new Date(content.orbit.real.spiritLaunch))} → ${fmtDate(new Date(content.orbit.real.spiritArrival))}.`, { size: 19, color: S.cyan, wrap: P.w - 40, depth: 11 }));
    this.u(mentorBar(this, x, P.y + P.h - 130, P.w - 36, 112, content.orbit.briefingMentor, { portrait: 90, size: 21, depth: 12, silent: true }));
    this.u(pxButton(this, 828, 646, 196, 56, t('common.back'), () => back(this), { size: 14 }));
    this.u(pxButton(this, 1040, 646, 216, 56, t('orbit.tryIt'), () => this.setStep('draw'), { primary: true, size: 14 }));
    say(`${t('orbit.title')}. ${content.orbit.rules.map((r) => `${r.title}. ${r.text}`).join(' ')} ${content.orbit.briefingMentor} Press TRY IT.`);
  }

  panelDraw() {
    const x = P.x + 18, o = this.mi.orbit;
    this.u(txt(this, x, P.y + 22, t('orbit.drawFirst'), { font: 'title', size: 12, color: S.gold, depth: 11 }));
    this.u(txt(this, x, P.y + 56, t('orbit.drawHint'), { size: 23, wrap: P.w - 40, depth: 11 }));
    const n = (o.drawnPath || []).length;
    this.u(txt(this, x, P.y + 200, n >= 5 ? t('orbit.drawn') : `Start on EARTH (launch, blue square) and drag the mouse to where you think you will meet MARS.`, { size: 21, color: n >= 5 ? S.green : S.cyan, wrap: P.w - 40, depth: 11 }));
    this.u(pxButton(this, 828, 646, 196, 56, t('orbit.clear'), () => { o.drawnPath = []; this.renderMap(); this.buildPanel(); }, { size: 14 }));
    const nx = this.u(pxButton(this, 1040, 646, 216, 56, t('orbit.next'), () => this.afterDraw(), { primary: true, size: 14 }));
    nx.setDisabled(n < 5);
    if (n < 5) say(`${t('orbit.drawFirst')}. ${t('orbit.drawHint')}`);
  }

  afterDraw() {
    const o = this.mi.orbit;
    if ((o.drawnPath || []).length < 5) return;
    o.drawJudge = judgeDrawing(o.drawnPath, SUN);
    logEvent('Drew a first guess of the path to Mars.', 'orbit');
    this.setStep(o.tutorialDone ? 'free' : 'tut', 0);
  }

  panelPlay() {
    const o = this.mi.orbit, x = P.x + 18, R = P.x + P.w - 18, sw = P.w - 36;
    const tut = this.step === 'tut' ? this.L.tutorial[this.tut] : null;
    const D = this.dyn = {};
    // mode tag
    const tag = chip(this, x, P.y + 20, tut ? tut.tag : t('orbit.freePlay'), { fill: tut ? C.cyan : C.green, color: S.navy, size: 8, depth: 12 });
    this.u(tag.r); this.u(tag.t);
    if (!tut) this.u(link(this, x + tag.w + 14, P.y + 20, 'RESTART TUTORIAL', () => this.setStep('tut', 0), { size: 18, origin: [0, 0.5], depth: 12 }));
    // LAUNCH DATE
    let y = P.y + 46;
    this.u(txt(this, x, y, t('orbit.launchDate'), { font: 'title', size: 9, depth: 11 }));
    this.helpBtn(x + 150, y - 4, 'date');
    D.date = this.u(txt(this, R, y + 4, '', { font: 'title', size: 10, origin: [1, 0.5], depth: 11 }));
    y += 24;
    const zg = this.u(this.add.graphics().setDepth(20.5));
    this.dateSlider = this.u(slider(this, x, y, sw, 1, this.maxLaunch, o.launchDay, (v) => { o.launchDay = Math.round(v); this.changed(); }, { step: 1, label: 'Launch date slider', depth: 20 }));
    zg.fillStyle(C.green, 0.85);
    for (const [a, b] of this.windows) { const xa = x + ((a - 1) / (this.maxLaunch - 1)) * sw, xb = x + ((Math.min(b, this.maxLaunch) - 1) / (this.maxLaunch - 1)) * sw; zg.fillRect(xa, y + 7, Math.max(3, xb - xa), 6); }
    this.u(txt(this, x, y + 30, this.dateOf(1), { size: 17, color: S.muted, origin: [0, 0.5], depth: 11 }));
    this.u(txt(this, R, y + 30, this.dateOf(this.maxLaunch), { size: 17, color: S.muted, origin: [1, 0.5], depth: 11 }));
    // TRAVEL TIME
    y += 52;
    this.u(txt(this, x, y, t('orbit.travelTime'), { font: 'title', size: 9, depth: 11 }));
    this.helpBtn(x + 150, y - 4, 'tof');
    D.tof = this.u(txt(this, R, y + 4, '', { font: 'title', size: 10, color: S.gold, origin: [1, 0.5], depth: 11 }));
    y += 24;
    this.tofSlider = this.u(slider(this, x, y, sw, this.L.tofMin, this.L.tofMax, o.tof, (v) => { o.tof = Math.round(v); this.changed(); }, { step: 1, label: 'Travel time slider', depth: 20 }));
    this.u(txt(this, x, y + 30, `${t('orbit.faster')} · ${this.L.tofMin} d`, { size: 17, color: S.muted, origin: [0, 0.5], depth: 11 }));
    this.u(txt(this, R, y + 30, `${this.L.tofMax} d · ${t('orbit.slower')}`, { size: 17, color: S.muted, origin: [1, 0.5], depth: 11 }));
    // CRITERION
    y += 52;
    this.u(txt(this, x, y, t('orbit.criterion'), { font: 'title', size: 9, depth: 11 }));
    this.helpBtn(x + 150, y - 4, 'crit');
    y += 18;
    const bw = Math.floor((sw - 16) / 3);
    ['fuel', 'fast', 'balance'].forEach((c, i) => this.u(pxButton(this, x + i * (bw + 8), y, bw, 40, `${i + 1}·${this.L.criteria[c].label}`, () => this.setCrit(c), { size: 9, depth: 20, primary: o.criterion === c })));
    // RESULTS: Δv departure / arrival / total / arrival date
    y += 56;
    const cw = Math.floor((sw - 18) / 4);
    D.cells = [t('orbit.dvDep'), t('orbit.dvArr'), t('orbit.dvTot'), t('orbit.arrival')].map((label, i) => {
      const cx = x + i * (cw + 6);
      const box = this.u(this.add.rectangle(cx, y, cw, 58, 0x141a3a).setOrigin(0).setStrokeStyle(2, 0x2a3358).setDepth(11));
      this.u(fit(txt(this, cx + 8, y + 12, label, { font: 'title', size: 7, color: S.muted, origin: [0, 0.5], depth: 12 }), cw - 14));
      const v = this.u(txt(this, cx + 8, y + 38, '', { size: 23, origin: [0, 0.5], depth: 12 }));
      return { box, v, w: cw - 14 };
    });
    // EVALUATION
    y += 70;
    D.stars = this.u(txt(this, x, y, '', { size: 24, origin: [0, 0.5], depth: 11 }));
    this.helpBtn(R - 192, y - 12, 'dv');
    this.u(pxButton(this, R - 150, y - 16, 150, 32, this.showBest ? t('orbit.hideBest') : t('orbit.showBest'), () => { this.showBest = !this.showBest; this.renderMap(); this.buildPanel(); }, { size: 8, depth: 20 }));
    D.best = this.u(txt(this, x, y + 26, '', { size: 19, color: S.green, origin: [0, 0.5], depth: 11 }));
    D.bestW = sw;
    // mentor
    D.mentor = this.u(mentorBar(this, x, P.y + P.h - 118, sw, 106, tut ? tut.text : '', { portrait: 80, size: 20, depth: 12, silent: true }));
    // tutorial focus ring
    if (tut) {
      const focusY = { date: [P.y + 40, 76], tof: [P.y + 116, 76], crit: [P.y + 192, 66], go: null }[tut.focus];
      const ring = this.u(this.add.graphics().setDepth(25));
      ring.lineStyle(4, C.yellow, 1);
      if (focusY) ring.strokeRect(x - 8, focusY[0], sw + 16, focusY[1]); else ring.strokeRect(1000, 640, 260, 70);
    }
    // bottom buttons
    this.u(pxButton(this, 820, 646, 170, 56, 'RESET', () => this.reset(), { size: 14 }));
    const last = tut && this.tut === 3;
    this.goBtn = this.u(pxButton(this, 1006, 646, 250, 56, tut && !last ? t('orbit.next') : t('orbit.launch'), () => this.engage(), { primary: true, size: 16 }));
    this.u(txt(this, 104, 690, '← → adjust · Tab next · 1/2/3 criterion · B best · SPACE engage', { size: 17, color: S.muted, origin: [0, 0.5], depth: 11 }));
    this.updateValues();
    if (!this.quietPanel) say(tut ? `${tut.tag}. ${tut.text}` : this.speech());
    this.quietPanel = false;
  }

  // only the numbers change while a slider moves (rebuilding the panel would stop the drag)
  updateValues() {
    const D = this.dyn, o = this.mi.orbit;
    if (!D || !D.date || !D.date.scene) return;
    const win = this.inWindow(o.launchDay);
    D.date.setText(`${this.dateOf(o.launchDay)}  ${win ? t('orbit.inWindow') : t('orbit.outWindow')}`).setColor(win ? S.green : S.red);
    D.tof.setText(`${o.tof} days (~${this.months(o.tof)} months)`);
    const tr = this.tr, ok = tr && tr.ok;
    const vals = [
      [ok ? `${tr.dvDep.toFixed(2)} km/s` : '—', ok && tr.dvDep > this.L.maxDepartureKms],
      [ok ? `${tr.dvArr.toFixed(2)} km/s` : '—', false],
      [ok ? `${tr.dvTotal.toFixed(2)} km/s` : '—', ok && tr.dvTotal > this.L.maxTotalKms],
      [ok ? this.dateOf(o.launchDay + o.tof) : '—', false]
    ];
    D.cells.forEach((c, i) => { c.v.setFontSize(fs23(this)).setText(vals[i][0]).setColor(vals[i][1] ? S.red : S.white); fit(c.v, c.w); c.box.setStrokeStyle(2, vals[i][1] ? C.red : 0x2a3358); });
    const st = this.rating.stars;
    D.stars.setText(`${'★'.repeat(st)}${'☆'.repeat(5 - st)}  ${t('orbit.rating', { CRIT: this.critLabel() })}`).setColor(st >= 4 ? S.green : st >= 2 ? S.gold : S.red);
    if (this.best) { D.best.setFontSize(fs19(this)).setText(t('orbit.bestLine', { CRIT: this.critLabel(), DATE: this.dateOf(this.best.launchDay), D: this.best.tof, DV: this.best.dvTotal.toFixed(2) })); fit(D.best, D.bestW); }
    if (this.step === 'free') D.mentor.set(this.feedback(), { silent: true });
  }

  helpBtn(x, y, k) {
    const b = this.u(pxButton(this, x, y, 30, 24, '?', () => this.openFieldHelp(k), { size: 9, depth: 20 }));
    b.label = `Help: ${this.L.help[k].title}`;
  }

  openFieldHelp(k) {
    const h = this.L.help[k];
    const md = openModal(this, h.title, { w: 760, h: 360 });
    mText(this, md, md.x + 28, md.y + 70, h.lines.join('\n'), { size: 24, wrap: md.w - 56 });
    say(`${h.title.replace('[?] ', '')}. ${h.lines.join(' ')}`);
  }

  speech() {
    const tr = this.tr, o = this.mi.orbit;
    if (!tr || !tr.ok) return this.feedback();
    return `Launch ${this.dateOf(o.launchDay)}, ${o.tof} days, arrive ${this.dateOf(o.launchDay + o.tof)}. Delta-v departure ${tr.dvDep.toFixed(1)}, arrival ${tr.dvArr.toFixed(1)}, total ${tr.dvTotal.toFixed(1)} kilometers per second. ${this.rating.stars} of 5 stars for ${this.critLabel()}. ${this.feedback()}`;
  }

  feedback() {
    const f = this.L.feedback, tr = this.tr;
    if (!tr || !tr.ok) return tr && tr.reason === 'range' ? f.range : f.nosolution;
    if (tr.dvDep > this.L.maxDepartureKms) return f.tooMuchDep.replace('{dv}', tr.dvDep.toFixed(1));
    if (tr.dvTotal > this.L.maxTotalKms) return f.tooMuchTotal.replace('{dv}', tr.dvTotal.toFixed(1));
    return f[this.rating.label] || f.good;
  }

  // a slider moved: recalc + redraw the panel (without re-reading everything aloud)
  changed() {
    this.recalc();
    this.updateValues();
    if (this._s) this._s.remove();
    this._s = this.time.delayedCall(700, () => say(this.speech()));
  }

  setCrit(c) { this.mi.orbit.criterion = c; sfx(this, 'sfx-pickup'); this.recalc(); this.buildPanel(); }

  reset() {
    const o = this.mi.orbit;
    o.launchDay = this.dayOf(this.L.default.launch); o.tof = this.L.default.tof;
    this.showBest = false; this.recalc(); this.buildPanel();
  }

  key(k) {
    if (!this.eph) return false;
    if (this.step === 'free' || this.step === 'tut') {
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const s = this.focused && this.focused.nudge ? this.focused : this.dateSlider;
        s.set(s.get() + (k === 'ArrowLeft' ? -1 : 1) * (s === this.dateSlider ? 1 : 1));
        return true;
      }
      if (k === '1' || k === '2' || k === '3') { this.setCrit(['fuel', 'fast', 'balance'][+k - 1]); return true; }
      if (k === 'b' || k === 'B') { this.showBest = !this.showBest; this.renderMap(); this.buildPanel(); return true; }
      if (k === ' ') { this.engage(); return true; }
    }
    if (this.step === 'brief' && (k === 'Enter' || k === ' ')) { this.setStep('draw'); return true; }
    if (this.step === 'draw' && (k === 'Enter')) { this.afterDraw(); return true; }
    return false;
  }

  // ---------------- ENGAGE ----------------
  engage() {
    if (this.step === 'tut' && this.tut < 3) { this.setStep('tut', this.tut + 1); return; }
    if (this.step === 'tut') { this.mi.orbit.tutorialDone = true; this.step = 'free'; }
    const o = this.mi.orbit, tr = this.tr;
    o.attempts = [...(o.attempts || []), { launchDay: o.launchDay, tof: o.tof, criterion: o.criterion, dv: tr && tr.ok ? +tr.dvTotal.toFixed(2) : null, ok: !!(tr && feasible(tr, this.L)) }].slice(-10);
    if (!tr || !tr.ok || !feasible(tr, this.L)) {
      sfx(this, 'sfx-error');
      this.buildPanel();
      say(this.feedback());
      return;
    }
    sfx(this, 'sfx-launch');
    Object.assign(o, {
      reached: true, travelDays: o.tof, dvDep: +tr.dvDep.toFixed(2), dvArr: +tr.dvArr.toFixed(2), dvTotal: +tr.dvTotal.toFixed(2),
      stars: this.rating.stars, launchDate: dateFromDay(this.eph.start, o.launchDay).toISOString().slice(0, 10),
      arrivalDate: dateFromDay(this.eph.start, o.launchDay + o.tof).toISOString().slice(0, 10),
      fuelUsed: Math.round((tr.dvTotal / this.L.maxTotalKms) * 100),      // propulsion effort, % of the rocket limit (game value)
      best: this.best ? { launchDay: this.best.launchDay, tof: this.best.tof, dvTotal: +this.best.dvTotal.toFixed(2) } : null
    });
    logEvent(`Trajectory: launch ${this.dateOf(o.launchDay)}, ${o.tof} days, Δv ${tr.dvTotal.toFixed(2)} km/s (${this.rating.stars}/5 stars for ${this.critLabel()}).`, 'orbit');
    this.lockedModal();
  }

  // 12c · result + comparison with Spirit & Opportunity (their Δv calculated by the game from their real dates)
  lockedModal() {
    const o = this.mi.orbit, f = this.L.feedback, real = content.orbit.real;
    const md = openModal(this, t('orbit.lockedTitle', { s: o.stars, CRIT: this.critLabel() }), { w: 1000, h: 600, closeButton: false });
    const sp = transfer(this.eph, this.dayOf(real.spiritLaunch), this.dayOf(real.spiritArrival) - this.dayOf(real.spiritLaunch));
    const op = transfer(this.eph, this.dayOf(real.opportunityLaunch), this.dayOf(real.opportunityArrival) - this.dayOf(real.opportunityLaunch));
    const col = [md.x + 28, md.x + 250, md.x + 500, md.x + 750];
    const head = ['', t('orbit.you'), t('orbit.spirit'), t('orbit.opp')];
    head.forEach((h, i) => mText(this, md, col[i], md.y + 70, h, { font: 'title', size: 10, color: i === 1 ? S.gold : S.cyan }));
    const rowsT = [
      [t('orbit.rowLaunch'), this.dateOf(o.launchDay), fmtDate(new Date(real.spiritLaunch)), fmtDate(new Date(real.opportunityLaunch))],
      [t('orbit.rowArrival'), this.dateOf(o.launchDay + o.tof), fmtDate(new Date(real.spiritArrival)), fmtDate(new Date(real.opportunityArrival))],
      [t('orbit.rowTravel'), `${o.tof} days`, `${sp.tof} days`, `${op.tof} days`],
      [t('orbit.dvDep'), `${o.dvDep.toFixed(2)} km/s`, `${sp.dvDep.toFixed(2)} km/s`, `${op.dvDep.toFixed(2)} km/s`],
      [t('orbit.dvArr'), `${o.dvArr.toFixed(2)} km/s`, `${sp.dvArr.toFixed(2)} km/s`, `${op.dvArr.toFixed(2)} km/s`],
      [t('orbit.dvTot'), `${o.dvTotal.toFixed(2)} km/s`, `${sp.dvTotal.toFixed(2)} km/s`, `${op.dvTotal.toFixed(2)} km/s`]
    ];
    rowsT.forEach((r, j) => r.forEach((c, i) => mText(this, md, col[i], md.y + 100 + j * 30, c, { size: 22, color: i === 0 ? S.muted : S.white })));
    mText(this, md, md.x + 28, md.y + 290, this.L.realCompare, { size: 18, color: S.muted, wrap: md.w - 56 });
    const dj = o.drawJudge;
    const draw = dj && dj.curves && dj.prograde ? f.drawGood : f.drawBad;
    mText(this, md, md.x + 28, md.y + 330, `${f[this.rating.label] || f.good}\n${draw}\n${f.transfer}`, { size: 21, wrap: md.w - 56 });
    mText(this, md, md.x + 28, md.y + 470, `${real.text}\nSource: ${real.source_url}`, { size: 17, color: S.cyan, wrap: md.w - 56 });
    mButton(this, md, md.x + 28, md.y + md.h - 76, 220, 52, t('orbit.adjust'), () => { md.close(); this.setStep('free'); }, { size: 12 });
    mButton(this, md, md.x + md.w - 288, md.y + md.h - 76, 260, 52, t('orbit.continue'), () => { md.close(); go(this, 'NextUpScene', { id: '12.4', next: 'LaunchReadyScene' }, { transition: 'dither' }); }, { primary: true, size: 12 });
    say(`${t('orbit.lockedTitle', { s: o.stars, CRIT: this.critLabel() })}. Your trip: ${o.tof} days, delta-v ${o.dvTotal} kilometers per second. Spirit: ${sp.tof} days, ${sp.dvTotal.toFixed(1)}. Opportunity: ${op.tof} days, ${op.dvTotal.toFixed(1)}. ${draw} ${f.transfer}`);
  }
}
