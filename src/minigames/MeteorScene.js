// Screen 13 · Launch mini-game (13 briefing → 13b playing → 13c hit → 13d orbit reached / so close).
// The rocket climbs on its own to 200 km; the player moves the blue SHIELD (mouse or WASD/arrows) to push
// falling rocks away from the nose. "INTERACTIVE GAME — not a real event" is always on screen.
// Team decision: this game is JUST FOR FUN. It never changes the mission score. With 3 hits the player
// sees "SO CLOSE!" and can RETRY or CONTINUE anyway.
// Rock arrivals are timed events kept in a hand-written MIN-HEAP keyed by the second they happen
// (the next rock is always heap.peek(); push/pop O(log n)).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar } from '../ui/widgets.js';
import { setup, openPause } from '../ui/chrome.js';
import { t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';
import { rng } from '../rng.js';
import MinHeap from '../ds/MinHeap.js';

export const DURATION = 60;          // seconds from the pad to 200 km (game value)
export const ORBIT_KM = 200;
export const HULL = 3;
const ROCKET = { x: 640, top: 360, w: 64, bottom: 572 };
const AREA = { x0: 250, x1: 1010, y0: 96, y1: 560 };
const SHIELD_R = 46, ROCK_R = 24, SHIELD_SPEED = 560;

// the timed rock events of one game: [{ t, x, speed }] (pure + seeded → same game every time, tested)
export function rockSchedule(seed = 13, duration = DURATION) {
  const r = rng(seed);
  const out = [];
  let tt = 1.2;
  while (tt < duration - 2) {
    out.push({ t: Math.round(tt * 100) / 100, x: Math.round(AREA.x0 + 20 + r() * (AREA.x1 - AREA.x0 - 40)), speed: Math.round(170 + r() * 90 + tt * 1.2) });
    const gap = 1.5 - (tt / duration) * 0.75;         // rocks come faster as you climb: 1.5 s → 0.75 s
    tt += gap * (0.75 + r() * 0.5);
  }
  return out;
}

// stars on the results card (purely visual: no effect on the mission score)
export function launchStars(lost, reached) { return reached ? Math.max(1, 5 - lost) : 0; }

export default class MeteorScene extends Phaser.Scene {
  constructor() { super('MeteorScene'); }

  create(data) {
    fresh(this);
    this.step = 'brief';
    this.hull = HULL; this.pushed = 0; this.time0 = 0; this.elapsed = 0; this.rocks = [];
    this.held = {}; this.aim = null;
    // sky that turns into space as the rocket climbs
    img(this, 0, 0, 'bg-sky', { origin: 0, w: W, h: H });
    this.space = this.add.rectangle(0, 0, W, H, C.space).setOrigin(0).setAlpha(0);
    this.starsG = this.add.graphics().setAlpha(0);
    const r = rng(7);
    this.starsG.fillStyle(0xffffff, 1);
    for (let i = 0; i < 120; i++) this.starsG.fillRect(Math.floor(r() * W), Math.floor(r() * H), 2, 2);
    this.ground = this.add.container(0, 0);
    this.ground.add(this.add.rectangle(0, 640, W, 80, 0x3d8a3d).setOrigin(0));
    this.ground.add(img(this, 470, 640, 'launch-tower', { origin: [0.5, 1], h: 300 }));
    // rocket + flame
    this.flame = img(this, ROCKET.x, ROCKET.bottom - 6, 'flame', { origin: [0.5, 0], w: 52, h: 66, depth: 4 });
    this.rocket = img(this, ROCKET.x, ROCKET.top, 'rocket', { origin: [0.5, 0], depth: 5 });
    this.tweens.add({ targets: this.flame, scaleY: { from: this.flame.scaleY * 0.85, to: this.flame.scaleY * 1.1 }, yoyo: true, repeat: -1, duration: 120 });
    // shield
    this.shield = this.add.container(640, 260).setDepth(8);
    const sg = this.add.graphics();
    sg.lineStyle(6, C.cyan, 1); sg.strokeCircle(0, 0, SHIELD_R - 4);
    sg.fillStyle(C.cyan, 0.18); sg.fillCircle(0, 0, SHIELD_R - 6);
    sg.fillStyle(0xe8f6ff, 1); sg.fillRect(-6, -6, 12, 12);
    this.shield.add(sg);
    this.rockLayer = this.add.container(0, 0).setDepth(7);
    this.fx = this.add.container(0, 0).setDepth(20);
    // always-visible badge
    const bx = 640, by = 24;
    const b1 = txt(this, 0, 0, t('common.interactive'), { font: 'title', size: 9, color: S.gold, depth: 51 });
    const b2 = txt(this, 0, 0, t('common.notReal'), { size: 20, color: S.text, depth: 51 });
    const bw = b1.width + b2.width + 40;
    this.add.rectangle(bx, by, bw, 34, C.space, 0.92).setStrokeStyle(2, C.gold).setDepth(50);
    b1.setPosition(bx - bw / 2 + 14, by - b1.height / 2);
    b2.setPosition(b1.x + b1.width + 12, by - b2.height / 2 - 1);
    this.flash = this.add.rectangle(0, 0, W, H, C.red).setOrigin(0).setAlpha(0).setDepth(45);

    this.onKey = (k) => {
      const lk = k.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(lk)) { this.held[lk] = true; this.aim = null; return true; }
      if (this.step === 'brief' && (k === 'Enter' || k === ' ')) { this.start(); return true; }
      if (this.step === 'result') {
        if (k === 'Enter') { this.next(); return true; }
        if (lk === 'r') { this.retry(); return true; }
      }
      return false;
    };
    this.input.keyboard.on('keyup', (e) => { this.held[e.key.toLowerCase()] = false; });
    this.input.on('pointermove', (p) => { if (this.step === 'play') this.aim = { x: p.x, y: p.y }; });
    this.input.on('pointerdown', (p) => { if (this.step === 'play') this.aim = { x: p.x, y: p.y }; });

    setup(this, data, { back: false, help: 'MeteorScene', helpPos: [24, 656], esc: () => this.pause() });
    if (data && data.retry) this.start();
    else this.brief();
  }

  // ---------- 13 · briefing ----------
  brief() {
    this.briefObjs = [];
    const add = (o) => { this.briefObjs.push(o); return o; };
    add(txt(this, 40, 56, t('meteor.title'), { font: 'title', size: 30, color: S.gold, shadow: 3 }));
    add(txt(this, 40, 98, t('meteor.sub'), { size: 26 }));
    add(panel(this, 900, 110, 350, 300, { fill: C.navy2, stroke: C.gold, bw: 4, shadow: true }));
    add(txt(this, 920, 128, t('meteor.how'), { font: 'title', size: 10, color: S.gold }));
    let y = 156;
    for (const s of t('meteor.steps')) { const o = add(txt(this, 920, y, s, { size: 21, wrap: 314, lineSpacing: 0 })); y += o.height + 8; }
    this.mentor = mentorBar(this, 24, 520, 520, 120, t('meteor.mentor'), { portrait: 104, size: 21, depth: 30 });
    this.startBtn = pxButton(this, 1010, 640, 240, 60, t('meteor.go'), () => this.start(), { primary: true, depth: 30 });
    add(this.startBtn);
  }

  // ---------- 13b · playing ----------
  start() {
    if (this.step === 'play') return;
    for (const o of this.briefObjs || []) o.destroy();
    this.briefObjs = [];
    if (this.mentor) { this.mentor.destroy(); this.mentor = null; }
    this.step = 'play';
    this.hull = HULL; this.pushed = 0; this.elapsed = 0;
    this.heap = new MinHeap((e) => e.t);
    for (const e of rockSchedule()) this.heap.push(e);
    this.ground.setVisible(false);
    this.buildHud();
    sfx(this, 'sfx-launch');
    say(`${t('meteor.title')} ${t('meteor.controls')}`);
  }

  buildHud() {
    // altitude (left)
    panel(this, 40, 100, 170, 540, { fill: C.space, alpha: 0.88, stroke: C.white, bw: 4, depth: 30 });
    txt(this, 52, 112, t('meteor.altitude'), { font: 'title', size: 8, color: S.muted, depth: 31 });
    this.altBar = { x: 64, y: 140, w: 30, h: 470 };
    this.add.rectangle(this.altBar.x, this.altBar.y, this.altBar.w, this.altBar.h, 0x2a3358).setOrigin(0).setDepth(31);
    this.altFill = this.add.rectangle(this.altBar.x, this.altBar.y + this.altBar.h, this.altBar.w, 0, C.cyan).setOrigin(0, 1).setDepth(32);
    const mark = (km, label, color) => {
      const yy = this.altBar.y + this.altBar.h - (km / ORBIT_KM) * this.altBar.h;
      this.add.rectangle(this.altBar.x + this.altBar.w, yy, 10, 2, 0xffffff).setOrigin(0, 0.5).setDepth(31);
      txt(this, this.altBar.x + this.altBar.w + 12, yy, label, { size: 18, color, origin: [0, 0.5], depth: 31 });
    };
    mark(ORBIT_KM, t('meteor.orbit'), S.green); mark(100, t('meteor.space'), S.cyan); mark(12, t('meteor.clouds'), S.text); mark(0, t('meteor.launchL'), S.text);
    this.altMarker = this.add.rectangle(this.altBar.x - 6, 0, this.altBar.w + 12, 6, C.gold).setOrigin(0, 0.5).setDepth(33);
    this.altText = txt(this, 198, 112, '0 km', { font: 'title', size: 9, color: S.gold, origin: [1, 0], depth: 31 });
    // hull / rocks / time (right)
    panel(this, 1040, 100, 216, 220, { fill: C.space, alpha: 0.88, stroke: C.white, bw: 4, depth: 30 });
    txt(this, 1056, 114, t('meteor.hull'), { font: 'title', size: 8, color: S.muted, depth: 31 });
    this.hearts = this.add.graphics().setDepth(31);
    txt(this, 1056, 176, t('meteor.pushed'), { font: 'title', size: 8, color: S.muted, depth: 31 });
    this.pushedText = txt(this, 1056, 196, '0', { font: 'title', size: 18, color: S.gold, depth: 31 });
    txt(this, 1056, 240, t('meteor.time'), { font: 'title', size: 8, color: S.muted, depth: 31 });
    this.timeText = txt(this, 1056, 260, '0:00', { font: 'title', size: 16, color: S.text, depth: 31 });
    txt(this, 1256, 690, t('meteor.controls'), { size: 20, color: S.muted, origin: [1, 0.5], depth: 31 });
    this.drawHearts();
  }

  drawHearts() {
    const g = this.hearts; g.clear();
    const shape = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    for (let i = 0; i < HULL; i++) {
      const full = i < this.hull, ox = 1056 + i * 52, oy = 136, p = 5;
      shape.forEach((row, ry) => [...row].forEach((ch, rx) => {
        if (ch !== 'X') return;
        g.fillStyle(full ? 0xe5484d : 0x3a4160, 1); g.fillRect(ox + rx * p, oy + ry * p, p, p);
      }));
      if (!full) { g.lineStyle(2, 0x8a93c8, 1); g.strokeRect(ox - 2, oy - 2, 7 * p + 4, 6 * p + 4); }   // not only colour: empty hearts get a frame
    }
  }

  spawn(e) {
    const s = img(this, e.x, -30, 'meteor', { w: ROCK_R * 2 + 12, h: ROCK_R * 2 + 12 });
    this.rockLayer.add(s);
    const tx = ROCKET.x + (e.x % 2 ? 20 : -20), ty = ROCKET.top + 40;
    const dx = tx - e.x, dy = ty + 30, d = Math.hypot(dx, dy) || 1;
    this.rocks.push({ s, x: e.x, y: -30, vx: (dx / d) * e.speed, vy: (dy / d) * e.speed, pushed: false });
  }

  update(time, delta) {
    if (this.step !== 'play' || this.paused || this.modals.length) return;
    const dt = Math.min(0.05, delta / 1000);
    this.elapsed += dt;
    // altitude
    const alt = Math.min(ORBIT_KM, (this.elapsed / DURATION) * ORBIT_KM);
    const k = alt / ORBIT_KM;
    this.altFill.setSize(this.altBar.w, Math.max(0.001, k * this.altBar.h));
    this.altMarker.y = this.altBar.y + this.altBar.h - k * this.altBar.h;
    this.altText.setText(`${Math.round(alt)} km`);
    this.space.setAlpha(Math.min(1, k * 1.6));
    this.starsG.setAlpha(Math.max(0, (k - 0.3) * 1.6));
    const sec = Math.floor(this.elapsed);
    this.timeText.setText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    // shield
    const h = this.held;
    let vx = 0, vy = 0;
    if (h.arrowleft || h.a) vx -= 1; if (h.arrowright || h.d) vx += 1;
    if (h.arrowup || h.w) vy -= 1; if (h.arrowdown || h.s) vy += 1;
    if (vx || vy) { const n = Math.hypot(vx, vy); this.shield.x += (vx / n) * SHIELD_SPEED * dt; this.shield.y += (vy / n) * SHIELD_SPEED * dt; }
    else if (this.aim) { const f = Math.min(1, dt * 14); this.shield.x += (this.aim.x - this.shield.x) * f; this.shield.y += (this.aim.y - this.shield.y) * f; }
    this.shield.x = Phaser.Math.Clamp(this.shield.x, AREA.x0, AREA.x1);
    this.shield.y = Phaser.Math.Clamp(this.shield.y, AREA.y0, AREA.y1);
    // rock events due now (min-heap ordered by time)
    while (!this.heap.isEmpty() && this.heap.peek().t <= this.elapsed) this.spawn(this.heap.pop());
    // move rocks, push / hit
    for (const r of this.rocks) {
      r.x += r.vx * dt; r.y += r.vy * dt;
      r.s.setPosition(r.x, r.y); r.s.rotation += dt * 2;
      if (!r.pushed && Math.hypot(r.x - this.shield.x, r.y - this.shield.y) < SHIELD_R + ROCK_R) {
        r.pushed = true;
        const dx = r.x - this.shield.x, dy = r.y - this.shield.y, d = Math.hypot(dx, dy) || 1;
        r.vx = (dx / d) * 460; r.vy = (dy / d) * 460 - 60;
        this.pushed += 1; this.pushedText.setText(String(this.pushed));
        this.popText(r.x, r.y - 30, t('meteor.push'), S.cyan);
        sfx(this, 'sfx-place');
      }
      if (!r.pushed && r.y > ROCKET.top + 10 && r.y < ROCKET.bottom && Math.abs(r.x - ROCKET.x) < ROCKET.w / 2 + ROCK_R * 0.6) {
        r.dead = true; this.hit();
      }
      if (r.y > H + 60 || r.y < -120 || r.x < -80 || r.x > W + 80) r.dead = true;
    }
    this.rocks = this.rocks.filter((r) => { if (r.dead) r.s.destroy(); return !r.dead; });
    if (this.step !== 'play') return;
    if (alt >= ORBIT_KM) this.finish(true);
  }

  popText(x, y, s, color) {
    const o = txt(this, x, y, s, { font: 'title', size: 12, color, origin: 0.5, depth: 21, shadow: 2 });
    this.tweens.add({ targets: o, y: y - 40, alpha: 0, duration: 800, onComplete: () => o.destroy() });
  }

  // ---------- 13c · rock hit ----------
  hit() {
    this.hull -= 1;
    this.drawHearts();
    sfx(this, 'sfx-error');
    this.popText(ROCKET.x + 110, ROCKET.top + 40, t('meteor.hit'), S.red);
    if (!state.settings.reduceMotion) {
      this.flash.setAlpha(0.45); this.tweens.add({ targets: this.flash, alpha: 0, duration: 380 });
      this.cameras.main.shake(220, 0.006);
    }
    this.rocket.setTint(0xff9a6a); this.time.delayedCall(300, () => this.rocket && this.rocket.clearTint());
    if (this.hull <= 0) { this.finish(false); return; }
    const msg = t('meteor.hitMsg', { n: this.hull });
    if (this.hitBar) this.hitBar.destroy();
    this.hitBar = mentorBar(this, 700, 560, 460, 120, '', { portrait: 100, size: 20, depth: 35, title: t('meteor.watch') });
    this.hitBar.set(msg);
    const bar = this.hitBar;
    this.time.delayedCall(3200, () => { if (this.hitBar === bar) { bar.destroy(); this.hitBar = null; } });
  }

  // ---------- 13d · results (or "so close") ----------
  finish(reached) {
    this.step = 'result';
    if (this.hitBar) { this.hitBar.destroy(); this.hitBar = null; }
    for (const r of this.rocks) r.s.destroy();
    this.rocks = [];
    const lost = HULL - this.hull, sec = Math.round(this.elapsed);
    const mi = state.mission;
    // just for fun: recorded for the log / MY MISSION only, never used by the mission score
    mi.launch = { hull: this.hull, rocksPushed: this.pushed, timeSec: sec, lost, done: reached, reached };
    if (reached) logEvent(`Launch mini-game: orbit reached, ${this.hull}/3 hull, ${this.pushed} rocks pushed.`, 'launch');
    this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(39);
    const x = 330, y = 150, w = 620, h = 330;
    panel(this, x, y, w, h, { fill: C.navy, stroke: C.gold, bw: 4, shadow: true, depth: 40 });
    txt(this, 640, y + 36, reached ? t('meteor.reached') : t('meteor.lostTitle'), { font: 'title', size: 24, color: reached ? S.gold : S.red, origin: 0.5, depth: 41, shadow: 3 });
    txt(this, 640, y + 76, reached ? t('meteor.reachedSub') : t('meteor.lostSub'), { size: 24, origin: 0.5, depth: 41 });
    const cols = [[t('meteor.hull'), `${this.hull} / ${HULL}`, S.gold], [t('meteor.pushed'), String(this.pushed), S.cyan], [t('meteor.time'), `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, S.text]];
    panel(this, 440, y + 100, 400, 70, { fill: C.space, border: false, depth: 40 });
    cols.forEach(([k, v, c], i) => {
      txt(this, 506 + i * 134, y + 116, k, { font: 'title', size: 7, color: S.muted, origin: 0.5, depth: 41 });
      txt(this, 506 + i * 134, y + 146, v, { font: 'title', size: 14, color: c, origin: 0.5, depth: 41 });
    });
    const stars = launchStars(lost, reached);
    if (reached) {
      const g = this.add.graphics().setDepth(41);
      for (let i = 0; i < 5; i++) this.star(g, 556 + i * 42, y + 204, i < stars);
    } else {
      txt(this, 640, y + 204, t('meteor.noScore'), { size: 22, color: S.cyan, origin: 0.5, depth: 41 });
    }
    pxButton(this, x + 30, y + h - 86, 200, 60, t('meteor.retry'), () => this.retry(), { depth: 42 });
    pxButton(this, x + 250, y + h - 86, 340, 60, reached ? t('meteor.next') : t('meteor.continue'), () => this.next(), { primary: true, depth: 42 });
    const ment = reached ? t('meteor.resultMentor', { lost }) : t('meteor.lostMentor');
    this.mentor = mentorBar(this, 310, 500, 660, 120, ment, { portrait: 104, size: 21, depth: 42 });
    say(`${reached ? t('meteor.reached') : t('meteor.lostTitle')}. Hull ${this.hull} of 3, ${this.pushed} rocks pushed. ${reached ? `${stars} stars.` : t('meteor.noScore')} Press Enter to continue or R to retry.`);
  }

  star(g, cx, cy, on) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 7 : 17; pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.fillStyle(on ? 0xf0c040 : 0x3a4160, 1); const poly = new Phaser.Geom.Polygon(pts).points;
    g.fillPoints(poly, true);
    g.lineStyle(2, on ? 0x7a5200 : 0x8a93c8, 1); g.strokePoints(poly, true);
  }

  retry() { this.scene.restart({ retry: true }); }

  next() {
    const mi = state.mission;
    if (!mi.launch.done) { mi.launch.done = true; logEvent('Launch mini-game: continued without reaching orbit (just for fun, no score change).', 'launch'); }
    go(this, 'NextUpScene', { id: '13e-1.0', next: 'SlidesScene', nextData: { set: 'rockstudy' } }, { transition: 'dither' });
  }

  pause() {
    if (this.step !== 'play') return;
    openPause(this, () => { this.finish(false); }, { note: t('meteor.pauseNote'), quitLabel: t('meteor.pauseQuit') });
  }
}
