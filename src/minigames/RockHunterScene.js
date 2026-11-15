// Screen 14 · Rock Hunter (14 briefing → 14b scanning → 14c strong clue / 14d inconclusive → 14e results).
// Drive the rover along Meridiani Planum (A/D or ←/→), stop next to a rock, SPACE = scan with the
// instruments YOU packed in the warehouse, E = collect, Q = skip. 3 samples before energy or time runs out.
// Real-impact link: a rock can only be read well if your kit has one of the instruments that really
// detect its clue (rocks.json → instruments). Without one, the scan is inconclusive ("HMM...").
// Team decision: when energy or time runs out you go to the results with the samples you have.
// Timed gameplay events (dust on the panels, low Sun) live in a hand-written MIN-HEAP keyed by second.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, bar } from '../ui/widgets.js';
import { setup, openPause } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';
import { instrumentById } from '../rules.js';
import MinHeap from '../ds/MinHeap.js';

const GROUND_Y = 520, NEAR = 110, SPEED = 230, MAX_SAMPLES = 3;
const EVID_LEVEL = { weak: 1, medium: 3, strong: 5 };

// what a scan of this rock shows with this kit (pure → tested)
export function scanRock(rock, kit) {
  const used = rock.instruments.filter((id) => kit.includes(id));
  if (!used.length) return { readable: false, used: [], evidence: null };
  return { readable: true, used, evidence: rock.evidence };
}

// science points of the collected samples (simulated game values from rocks.json)
export function rockScience(samples, points) {
  return samples.reduce((s, x) => s + (x.evidence ? points[x.evidence] || 0 : 0), 0);
}

// stars on the results card: one per 25 science points, at least 1 if you collected anything
export function rockStars(science, samples) { return samples ? Math.max(1, Math.min(5, Math.round(science / 25))) : 0; }

export default class RockHunterScene extends Phaser.Scene {
  constructor() { super('RockHunterScene'); }

  create(data) {
    fresh(this);
    const g = content.rocks.game;
    this.cfg = g;
    this.step = 'brief';
    this.kit = state.mission.instruments.kit || [];
    this.energy = g.energy; this.timeLeft = g.timeSec; this.elapsed = 0;
    this.samples = []; this.handled = {}; this.held = {};
    img(this, 0, 0, 'bg-meridiani', { origin: 0, w: W, h: H }).setScrollFactor(0);
    // world: pebbles + rocks along a 2560 px strip; the camera follows the rover
    this.cameras.main.setBounds(0, 0, g.worldWidth, H);
    const pg = this.add.graphics();
    const rnd = new Phaser.Math.RandomDataGenerator(['meridiani']);
    for (let i = 0; i < 160; i++) { pg.fillStyle(rnd.pick([0x8a4a2a, 0x6b3a22, 0xa65a34]), 1); pg.fillRect(rnd.between(0, g.worldWidth), rnd.between(GROUND_Y - 20, 700), rnd.between(4, 10), rnd.between(3, 6)); }
    this.rocks = content.rocks.rocks.map((r) => this.drawRock(r));
    this.rover = img(this, 180, GROUND_Y + 30, 'rover-mer', { origin: [0.5, 1], depth: 10 });
    this.beam = this.add.graphics().setDepth(9);
    this.cameras.main.startFollow(this.rover, true, 0.12, 0.12, 0, 0);
    this.onKey = (k) => this.key(k);
    this.input.keyboard.on('keyup', (e) => { this.held[e.key.toLowerCase()] = false; });
    setup(this, data, { back: false, help: 'RockHunterScene', helpPos: [24, 656], esc: () => this.pause() });
    // chrome buttons (menu, help) stay on screen while the camera follows the rover
    for (const f of this.focusables) { if (f.cont) f.cont.setScrollFactor(0); if (f.hit) f.hit.setScrollFactor(0); }
    if (data && data.retry) this.start(); else this.brief();
  }

  drawRock(r) {
    const gr = this.add.graphics().setDepth(6);
    const x = r.x, y = GROUND_Y + 24, p = 8;
    const px = (cx, cy, w, h, col) => { gr.fillStyle(col, 1); gr.fillRect(x + cx * p, y + cy * p, w * p, h * p); };
    switch (r.art) {
      case 'dark': px(-5, -7, 10, 7, 0x3a3a44); px(-4, -9, 7, 2, 0x4a4a55); px(-2, -6, 2, 1, 0x5c5c68); px(2, -4, 2, 1, 0x26262e); break;
      case 'berries': px(-6, -4, 12, 4, 0x5a3420); px(-5, -6, 9, 2, 0x6e4128); for (let i = -5; i < 6; i += 2) px(i, -5 + (i % 4 ? 0 : 1), 1, 1, 0x2a2a3a); break;
      case 'soil': px(-7, -2, 14, 2, 0xc28a5c); px(-5, -3, 10, 1, 0xd8a678); break;
      case 'vein': px(-6, -7, 12, 7, 0xc9a77a); px(-1, -7, 1, 7, 0xffffff); px(1, -4, 3, 1, 0xffffff); px(-5, -2, 3, 1, 0xe8dcc8); break;
      case 'clay': px(-5, -6, 10, 6, 0x9a8a6a); px(-4, -7, 8, 1, 0xb0a07c); px(-3, -4, 6, 1, 0x7a6c52); break;
      default: px(-7, -6, 14, 6, 0xe0d0b0); px(-7, -4, 14, 1, 0xc8b490); px(-7, -2, 14, 1, 0xb09c78); px(-6, -7, 12, 1, 0xf0e4cc);
    }
    const tag = txt(this, x, y - 96, '?', { font: 'title', size: 10, color: S.white, origin: 0.5, depth: 8 });
    const tagBg = this.add.rectangle(x, y - 96, 26, 24, 0x1a1f3a).setStrokeStyle(2, C.white).setDepth(7);
    const mark = txt(this, x, y + 14, '', { font: 'title', size: 8, color: S.navy, origin: 0.5, depth: 8 });
    const markBg = this.add.rectangle(x, y + 14, 10, 18, C.gold).setDepth(7).setVisible(false);
    return { r, gr, tag, tagBg, mark, markBg, x };
  }

  // ---------- 14 · briefing ----------
  brief() {
    this.briefObjs = [];
    const add = (o) => { o.setScrollFactor && o.setScrollFactor(0); this.briefObjs.push(o); return o; };
    add(panel(this, 300, 60, 680, 400, { fill: C.navy2, stroke: C.gold, bw: 4, shadow: true, depth: 40 }));
    add(txt(this, 640, 96, t('rock.title'), { font: 'title', size: 26, color: S.gold, origin: 0.5, depth: 41, shadow: 3 }));
    add(txt(this, 640, 134, t('rock.sub'), { size: 22, origin: 0.5, depth: 41, align: 'center', wrap: 640 }));
    add(txt(this, 330, 166, t('rock.how'), { font: 'title', size: 10, color: S.gold, depth: 41 }));
    let y = 192;
    for (const s of t('rock.steps')) { const o = add(txt(this, 330, y, s, { size: 22, wrap: 620, lineSpacing: 0, depth: 41 })); y += o.height + 6; }
    const kitNames = this.kit.map((id) => (instrumentById(id) || { name: id }).name).join(', ') || '—';
    add(txt(this, 330, y + 8, t('rock.kit', { LIST: kitNames }), { size: 20, color: S.cyan, wrap: 620, depth: 41 }));
    this.mentor = mentorBar(this, 24, 520, 600, 110, t('rock.mentor'), { portrait: 104, size: 21, depth: 42 });
    add(pxButton(this, 1016, 640, 240, 60, t('rock.go'), () => this.start(), { primary: true, depth: 42 }).cont);
  }

  start() {
    if (this.step === 'play') return;
    for (const o of this.briefObjs || []) o.destroy();
    for (const f of this.focusables || []) if (f.cont && !f.cont.scene) f.destroy && f.destroy();
    if (this.mentor) { this.mentor.destroy(); this.mentor = null; }
    this.step = 'play';
    this.heap = new MinHeap((e) => e.t);
    for (const e of content.rocks.events) this.heap.push({ ...e });
    this.buildHud();
    say(`${t('rock.title')}. ${t('rock.controls')}`);
  }

  buildHud() {
    const fix = (o) => { o.setScrollFactor(0); return o; };
    fix(panel(this, 24, 10, 800, 52, { fill: C.space, alpha: 0.92, stroke: C.white, bw: 3, depth: 30 }));
    fix(txt(this, 40, 36, t('rock.energy'), { font: 'title', size: 8, color: S.muted, origin: [0, 0.5], depth: 31 }));
    this.energyBar = bar(this, 110, 26, 150, 20, 1, C.green, { depth: 31 });
    this.energyBar.g.setScrollFactor(0);
    this.energyText = fix(txt(this, 268, 36, '', { font: 'title', size: 10, color: S.gold, origin: [0, 0.5], depth: 31 }));
    fix(txt(this, 350, 36, t('rock.samples'), { font: 'title', size: 8, color: S.muted, origin: [0, 0.5], depth: 31 }));
    this.sampleBoxes = fix(this.add.graphics().setDepth(31));
    this.samplesText = fix(txt(this, 520, 36, '', { font: 'title', size: 10, color: S.gold, origin: [0, 0.5], depth: 31 }));
    fix(txt(this, 586, 36, t('rock.science'), { font: 'title', size: 8, color: S.muted, origin: [0, 0.5], depth: 31 }));
    this.scienceText = fix(txt(this, 668, 36, '0', { font: 'title', size: 10, color: S.cyan, origin: [0, 0.5], depth: 31 }));
    fix(txt(this, 712, 36, t('rock.time'), { font: 'title', size: 8, color: S.muted, origin: [0, 0.5], depth: 31 }));
    this.timeText = fix(txt(this, 760, 36, '', { font: 'title', size: 10, color: S.text, origin: [0, 0.5], depth: 31 }));
    fix(txt(this, 100, 690, t('rock.controls'), { size: 20, color: S.text, origin: [0, 0.5], depth: 31, shadow: 2 }));
    this.refreshHud();
  }

  refreshHud() {
    const e = Math.max(0, Math.round(this.energy));
    this.energyBar.set(e / 100, e < 25 ? C.red : C.green);
    this.energyText.setText(`${e}%`);
    const g = this.sampleBoxes; g.clear();
    for (let i = 0; i < MAX_SAMPLES; i++) { g.fillStyle(i < this.samples.length ? C.gold : 0x2a3358, 1); g.fillRect(434 + i * 26, 27, 20, 20); g.lineStyle(2, C.white, 1); g.strokeRect(434 + i * 26, 27, 20, 20); }
    this.samplesText.setText(`${this.samples.length}/${MAX_SAMPLES}`);
    this.scienceText.setText(String(rockScience(this.samples, this.cfg.points)));
    const s = Math.max(0, Math.ceil(this.timeLeft));
    this.timeText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  }

  key(k) {
    const lk = k.toLowerCase();
    if (this.step === 'brief') { if (k === 'Enter' || k === ' ') { this.start(); return true; } return false; }
    if (this.step === 'result') { if (k === 'Enter') { this.next(); return true; } if (lk === 'r') { this.scene.restart({ retry: true }); return true; } return false; }
    if (this.scan) {
      if (lk === 'e') { this.collect(); return true; }
      if (lk === 'q') { this.skip(); return true; }
      return true;
    }
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(lk)) { this.held[lk] = true; return true; }
    if (k === ' ') { this.tryScan(); return true; }
    return false;
  }

  nearRock() {
    const rx = this.rover.x + (this.rover.flipX ? -110 : 110);
    return this.rocks.find((o) => !this.handled[o.r.id] && Math.abs(o.x - rx) < NEAR);
  }

  update(time, delta) {
    if (this.step !== 'play' || this.paused || this.modals.length || this.scan) return;
    const dt = Math.min(0.05, delta / 1000);
    this.elapsed += dt; this.timeLeft -= dt;
    const h = this.held;
    let vx = 0;
    if (h.arrowleft || h.a) vx -= 1; if (h.arrowright || h.d) vx += 1;
    if (vx) {
      this.rover.x = Phaser.Math.Clamp(this.rover.x + vx * SPEED * dt, 100, this.cfg.worldWidth - 160);
      this.rover.setFlipX(vx < 0);
      this.energy -= this.cfg.driveCostPerSec * dt;
    }
    while (!this.heap.isEmpty() && this.heap.peek().t <= this.elapsed) this.event(this.heap.pop());
    // "near a rock" hint
    const nr = this.nearRock();
    for (const o of this.rocks) if (!this.handled[o.r.id]) o.tagBg.setStrokeStyle(2, o === nr ? C.yellow : C.white);
    this.refreshHud();
    if (this.energy <= 0 || this.timeLeft <= 0) this.finish(true);
  }

  event(e) {
    this.energy += e.energy;
    this.toast(e.text);
  }

  toast(text, color = C.navy) {
    if (this.toastObjs) this.toastObjs.forEach((o) => o.destroy());
    const tt = txt(this, 640, 98, text, { size: 22, origin: 0.5, depth: 36, align: 'center', wrap: 760 }).setScrollFactor(0);
    const bgR = this.add.rectangle(640, 98, tt.width + 30, tt.height + 14, color, 0.95).setStrokeStyle(3, C.gold).setDepth(35).setScrollFactor(0);
    this.toastObjs = [bgR, tt];
    say(text);
    this.time.delayedCall(3200, () => { if (this.toastObjs && this.toastObjs[1] === tt) { bgR.destroy(); tt.destroy(); this.toastObjs = null; } });
  }

  // ---------- 14b · scan ----------
  tryScan() {
    const o = this.nearRock();
    if (!o) { this.toast(t('rock.noRock')); return; }
    if (this.toastObjs) { this.toastObjs.forEach((ob) => ob.destroy()); this.toastObjs = null; }
    this.energy -= this.cfg.scanCost;
    sfx(this, 'sfx-photo');
    const res = scanRock(o.r, this.kit);
    this.beam.clear(); this.beam.lineStyle(3, C.cyan, 1);
    const sx = this.rover.flipX ? this.rover.x - 70 : this.rover.x + 70;
    for (let i = 0; i < 6; i++) this.beam.lineBetween(sx + ((o.x - sx) * i) / 6, GROUND_Y - 40 + i * 3, sx + ((o.x - sx) * (i + 0.5)) / 6, GROUND_Y - 38 + i * 3);
    const objs = [];
    const fix = (ob) => { ob.setScrollFactor(0); objs.push(ob); return ob; };
    const x = 640, y = 110, w = 600;
    const inst = res.used.map((id) => (instrumentById(id) || { name: id.toUpperCase() }).name);
    const body = res.readable ? o.r.clue : t('rock.noInstrument');
    const bodyT = txt(this, x + 20, 0, body, { size: 21, wrap: w - 40, lineSpacing: 0, depth: 46 });
    const hh = 200 + bodyT.height;
    fix(panel(this, x, y, w, hh, { fill: C.navy2, stroke: C.cyan, bw: 4, shadow: true, depth: 45 }));
    fix(txt(this, x + 20, y + 16, t('rock.scan'), { font: 'title', size: 10, color: S.cyan, depth: 46 }));
    let cx = x + 20;
    for (const n of (inst.length ? inst : [t('rock.none')])) {
      const ct = fix(txt(this, cx + 6, y + 44, n, { font: 'title', size: 7, color: inst.length ? S.white : S.red, depth: 47 }));
      fix(this.add.rectangle(cx, y + 38, ct.width + 12, 20, 0x000000, 0).setOrigin(0).setStrokeStyle(2, C.white).setDepth(46));
      cx += ct.width + 20;
    }
    fix(txt(this, x + 20, y + 72, res.readable ? o.r.name : `${o.r.name}?`, { font: 'title', size: 14, color: S.white, depth: 46 }));
    fix(txt(this, x + 20, y + 106, t('rock.evidence'), { font: 'title', size: 8, color: S.muted, depth: 46 }));
    const lvl = res.readable ? EVID_LEVEL[res.evidence] : 0;
    const eg = fix(this.add.graphics().setDepth(46));
    for (let i = 0; i < 5; i++) { eg.fillStyle(i < lvl ? C.green : 0x2a3358, 1); eg.fillRect(x + 160 + i * 22, y + 102, 18, 16); }
    const evLabel = res.readable ? t(`rock.${res.evidence}`) : t('rock.hmm');
    fix(txt(this, x + 280, y + 110, evLabel, { font: 'title', size: 10, color: res.readable && res.evidence === 'strong' ? S.green : S.yellow, origin: [0, 0.5], depth: 46 }));
    bodyT.setPosition(x + 20, y + 132); fix(bodyT);
    const full = this.samples.length >= MAX_SAMPLES;
    const cb = pxButton(this, x + 20, y + hh - 62, 250, 48, t('rock.collect'), () => this.collect(), { primary: true, size: 12, depth: 47, disabled: full });
    const sb = pxButton(this, x + 290, y + hh - 62, 200, 48, t('rock.skip'), () => this.skip(), { size: 12, depth: 47 });
    [cb, sb].forEach((b) => { b.cont.setScrollFactor(0); b.hit.setScrollFactor(0); });
    this.scan = { o, res, objs, btns: [cb, sb] };
    say(`${t('rock.scan')}. ${inst.length ? `Read with ${inst.join(', ')}.` : 'None of your instruments can read this rock well.'} ${o.r.name}. ${t('rock.evidence')}: ${evLabel}. ${body} Press E to collect or Q to skip.`);
  }

  closeScan() {
    if (!this.scan) return;
    this.scan.objs.forEach((ob) => ob.destroy());
    this.scan.btns.forEach((b) => b.destroy());
    this.beam.clear();
    this.scan = null;
  }

  // ---------- 14c / 14d ----------
  collect() {
    if (!this.scan || this.samples.length >= MAX_SAMPLES) return;
    const { o, res } = this.scan;
    this.closeScan();
    this.handled[o.r.id] = 'collected';
    const sample = { id: o.r.id, name: o.r.name, evidence: res.readable ? res.evidence : null, result: o.r.result, source_url: o.r.source_url };
    this.samples.push(sample);
    o.tag.setText(res.readable ? o.r.name : '?'); o.tag.setFontSize(8).setColor(S.navy);
    o.tagBg.setSize(o.tag.width + 12, 20).setFillStyle(res.readable && res.evidence === 'strong' ? C.green : C.gold);
    o.mark.setText(t('rock.sample')); o.markBg.setVisible(true).setSize(o.mark.width + 10, 18);
    const pts = sample.evidence ? this.cfg.points[sample.evidence] : 0;
    sfx(this, 'sfx-place');
    if (pts) {
      const pt = txt(this, o.x, GROUND_Y - 120, `+${pts} ${t('rock.science')}`, { font: 'title', size: 12, color: S.green, origin: 0.5, depth: 20, shadow: 2 });
      this.tweens.add({ targets: pt, y: pt.y - 40, alpha: 0, duration: 1200, onComplete: () => pt.destroy() });
    }
    if (res.readable && res.evidence === 'strong') this.toast(`${t('rock.strongClue')} ${o.r.clue}`, 0x16502f);
    else this.toast(res.readable ? `${t('rock.hmm')} ${o.r.result}` : `${t('rock.hmm')} ${t('rock.noInstrumentShort')}`);
    this.refreshHud();
    if (this.samples.length >= MAX_SAMPLES) this.time.delayedCall(900, () => this.finish(false));
    else this.checkAllHandled();
  }

  skip() {
    if (!this.scan) return;
    const { o } = this.scan;
    this.closeScan();
    this.handled[o.r.id] = 'skipped';
    o.tagBg.setStrokeStyle(2, 0x5d6680); o.tag.setColor(S.muted);
    this.checkAllHandled();
  }

  checkAllHandled() {
    if (this.rocks.every((o) => this.handled[o.r.id])) this.time.delayedCall(600, () => this.finish(false));
  }

  // ---------- 14e · results ----------
  finish(outOfResources) {
    if (this.step === 'result') return;
    this.closeScan();
    this.step = 'result';
    // the results card and the mentor are drawn in screen space: park the camera at the start
    this.cameras.main.stopFollow(); this.cameras.main.setScroll(0, 0);
    const mi = state.mission;
    const science = rockScience(this.samples, this.cfg.points);
    const energyLeft = Math.max(0, Math.round(this.energy));
    mi.rocks = { samples: this.samples, scanned: Object.keys(this.handled), science, energyLeft, done: true, outOfResources: !!outOfResources };
    logEvent(`Rock Hunter: ${this.samples.length} sample(s), ${this.samples.filter((s) => s.evidence === 'strong').length} strong clue(s), ${science} science.`, 'rocks');
    const fix = (o) => { o.setScrollFactor && o.setScrollFactor(0); return o; };
    fix(this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(39));
    const x = 240, y = 30, w = 800;
    const rows = this.samples.length || 1;
    const missedRock = content.rocks.rocks.find((r) => r.evidence === 'strong' && !this.samples.find((s) => s.id === r.id));
    const h = 300 + rows * 46 + (missedRock ? 40 : 0) + (outOfResources ? 30 : 0);
    fix(panel(this, x, y, w, h, { fill: C.navy, stroke: C.gold, bw: 4, shadow: true, depth: 40 }));
    fix(txt(this, 640, y + 34, t('rock.results'), { font: 'title', size: 22, color: S.gold, origin: 0.5, depth: 41, shadow: 3 }));
    let yy = y + 66;
    if (outOfResources) { fix(txt(this, 640, yy + 4, t('rock.out'), { size: 22, color: S.red, origin: 0.5, depth: 41 })); yy += 30; }
    fix(panel(this, x + 24, yy, w - 48, rows * 46 + 16, { fill: C.space, border: false, depth: 40 }));
    if (!this.samples.length) fix(txt(this, x + 40, yy + 16, t('rock.noSamples'), { size: 22, color: S.muted, depth: 41 }));
    this.samples.forEach((s, i) => {
      const ry = yy + 14 + i * 46;
      fix(txt(this, x + 40, ry + 6, s.name, { font: 'title', size: 8, color: S.white, depth: 41 }));
      const ev = s.evidence ? t(`rock.${s.evidence}`) : t('rock.hmm');
      fix(txt(this, x + 300, ry + 6, ev, { font: 'title', size: 8, color: s.evidence === 'strong' ? S.green : S.yellow, depth: 41 }));
      fix(txt(this, x + 420, ry, s.evidence ? s.result : t('rock.inconclusive'), { size: 20, color: S.muted, depth: 41, wrap: 360, lineSpacing: 0 }));
    });
    yy += rows * 46 + 24;
    if (missedRock) { fix(txt(this, 640, yy, t('rock.missed', { NAME: missedRock.name, WHY: missedRock.result }), { size: 21, color: S.cyan, origin: [0.5, 0], depth: 41, align: 'center', wrap: w - 60 })); yy += 40; }
    fix(txt(this, 560, yy + 4, t('rock.science'), { font: 'title', size: 8, color: S.muted, origin: 0.5, depth: 41 }));
    fix(txt(this, 560, yy + 30, String(science), { font: 'title', size: 16, color: S.cyan, origin: 0.5, depth: 41 }));
    fix(txt(this, 720, yy + 4, t('rock.energyLeft'), { font: 'title', size: 8, color: S.muted, origin: 0.5, depth: 41 }));
    fix(txt(this, 720, yy + 30, `${energyLeft}%`, { font: 'title', size: 16, color: S.gold, origin: 0.5, depth: 41 }));
    const sg = fix(this.add.graphics().setDepth(41));
    const stars = rockStars(science, this.samples.length);
    for (let i = 0; i < 5; i++) this.star(sg, 556 + i * 42, yy + 76, i < stars);
    const by = y + h - 80;
    const rb = pxButton(this, x + 120, by, 200, 60, t('rock.retry'), () => this.scene.restart({ retry: true }), { depth: 42 });
    const nb = pxButton(this, x + 340, by, 340, 60, t('rock.transmit'), () => this.next(), { primary: true, depth: 42 });
    [rb, nb].forEach((b) => { b.cont.setScrollFactor(0); b.hit.setScrollFactor(0); });
    const strong = this.samples.filter((s) => s.evidence === 'strong').length;
    const ment = strong >= 2 ? t('rock.mentorGood', { n: strong }) : strong === 1 ? t('rock.mentorOne') : t('rock.mentorNone');
    this.mentor = mentorBar(this, 330, Math.min(600, y + h + 14), 620, 104, '', { portrait: 100, size: 20, depth: 42 });
    this.mentor.set(ment, { silent: true });
    say(`${t('rock.results')}: ${this.samples.map((s) => `${s.name}, ${s.evidence || 'inconclusive'}`).join('; ') || 'none'}. Science ${science}. Energy left ${energyLeft} percent. ${ment} Press Enter to transmit your data or R to retry.`);
  }

  star(g, cx, cy, on) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 7 : 17; pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    const poly = new Phaser.Geom.Polygon(pts).points;
    g.fillStyle(on ? 0xf0c040 : 0x3a4160, 1); g.fillPoints(poly, true);
    g.lineStyle(2, on ? 0x7a5200 : 0x8a93c8, 1); g.strokePoints(poly, true);
  }

  next() { go(this, 'NextUpScene', { id: '14f-1.0', next: 'SlidesScene', nextData: { set: 'discoveries' } }, { transition: 'dither' }); }

  pause() {
    if (this.step !== 'play') return;
    openPause(this, () => this.finish(true), { quitLabel: t('rock.pauseQuit') });
  }
}
