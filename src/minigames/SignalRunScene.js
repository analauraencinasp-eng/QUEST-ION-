// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screens 16a–16c · Signal Run. Team decision: it works LIKE THE REAL MISSION and that is taught before playing:
//   · a packet that misses the orbiter is NOT lost — it stays in the rover's flash memory and can be sent again;
//   · there is no time limit, the real limit is memory space (MER: 256 MB flash, 128 MB RAM — comms.json + SOURCES.md);
//   · when the orbiter leaves, the data waits for the NEXT PASS.
// Gameplay (simplified, marked on screen): an orbiter crosses the sky; aim the antenna (A/D or ←/→) and press SPACE
// while the orbiter is inside the green LINK WINDOW. Dust clouds block packets. Every shot costs energy (game value).
// The data in memory is what your comms plan (15h) put in this pass; 3 packets carry it.
// Outgoing packets wait in a hand-written QUEUE (first in, first out), like a real downlink buffer.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, bar } from '../ui/widgets.js';
import { setup, openPause } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';
import Queue from '../ds/Queue.js';
import { delayMinutes } from '../scenes/TalkScene.js';

const SKY_Y = 150, WIN = { x0: 420, x1: 860 }, ANT = { x: 640, y: 548 };
const PASS_SEC = 20, GAP_SEC = 3;            // one orbiter pass across the screen + pause before the next (game values)
const PACKET_SPEED = 620;

// how much data each packet carries (pure → tested): the planned data of this pass split in N packets
export function packetPlan(comms, n) {
  const mb = comms && comms.done ? (comms.returnedMb || 0) : 60;
  const total = comms && comms.done ? (comms.totalMb || mb) : 83;
  const each = Math.round((mb / n) * 10) / 10;
  return { perPacket: each, planned: mb, inMemory: total };
}

// orbiter x on screen at time tt inside a pass (pure → tested)
export function orbiterX(tt) { return -80 + (tt / PASS_SEC) * (W + 160); }
export function inWindow(x) { return x >= WIN.x0 && x <= WIN.x1; }

export default class SignalRunScene extends Phaser.Scene {
  constructor() { super('SignalRunScene'); }

  create(data) {
    fresh(this);
    const cfg = content.comms.signal;
    this.cfg = cfg;
    this.mem = cfg.memory;
    this.step = 'brief';
    this.need = cfg.packetsNeeded;
    this.plan = packetPlan(state.mission.comms, this.need);
    this.delay = delayMinutes(state.mission) || state.mission.signal.delayMin || 14;
    this.energy = cfg.energy; this.linked = 0; this.shots = 0; this.missed = 0; this.blocked = 0;
    this.queue = new Queue();
    for (let i = 0; i < this.need; i++) this.queue.enqueue({ n: i + 1, mb: this.plan.perPacket });
    this.memUsed = this.plan.inMemory;
    this.aim = 0; this.held = {}; this.passT = 0; this.waitT = 0; this.packets = []; this.passes = 1;
    // sky
    this.add.rectangle(0, 0, W, H, 0x1a1530).setOrigin(0);
    const bands = [0x231a3a, 0x3a2440, 0x5a2e3a, 0x7a3a2e, 0x9a4a2a];
    bands.forEach((c, i) => this.add.rectangle(0, 240 + i * 60, W, 60, c).setOrigin(0));
    this.add.rectangle(0, 540, W, 180, 0xa65a34).setOrigin(0);
    const st = this.add.graphics(); st.fillStyle(0xffffff, 0.8); for (let i = 0; i < 80; i++) st.fillRect((i * 131) % W, (i * 37) % 230, 2, 2);
    // link window + orbit track
    const tr = this.add.graphics(); tr.lineStyle(2, 0xffffff, 0.35);
    for (let x = 0; x < W; x += 16) tr.lineBetween(x, SKY_Y, x + 8, SKY_Y);
    this.winBox = this.add.rectangle(WIN.x0, SKY_Y - 46, WIN.x1 - WIN.x0, 92, C.green, 0.12).setOrigin(0).setStrokeStyle(3, C.green);
    txt(this, WIN.x0 + 8, SKY_Y - 42, t('signal.window'), { font: 'title', size: 8, color: S.green });
    this.orbiter = this.add.container(-200, SKY_Y).setDepth(8);
    this.orbiter.add([this.add.rectangle(0, 0, 36, 24, 0xd8d8d8).setStrokeStyle(2, C.white), this.add.rectangle(-32, 0, 26, 12, C.blueBorder), this.add.rectangle(32, 0, 26, 12, C.blueBorder), this.add.rectangle(0, 16, 6, 10, 0xe69f00)]);
    this.orbLabel = txt(this, 0, 28, t('signal.orbiter'), { font: 'title', size: 7, color: S.muted, origin: [0.5, 0] });
    this.orbiter.add(this.orbLabel);
    // dust clouds (drift slowly)
    this.clouds = [0, 1, 2].map((i) => {
      const cx = 220 + i * 420, cy = 300 + (i % 2) * 70;
      const g = this.add.graphics().setDepth(6);
      g.fillStyle(0xd0a070, 0.95); g.fillRect(-50, -12, 100, 24); g.fillRect(-30, -24, 60, 12); g.fillStyle(0xb88a5a, 1); g.fillRect(-40, 8, 80, 8);
      g.setPosition(cx, cy);
      return { g, x: cx, y: cy, vx: (i % 2 ? -1 : 1) * 28 };
    });
    // rover + antenna
    img(this, ANT.x, 640, 'rover-mer', { origin: [0.5, 1], depth: 7 });
    this.dish = this.add.graphics().setDepth(9);
    this.aimLine = this.add.graphics().setDepth(5);
    // badge
    const b1 = txt(this, 0, 0, t('common.interactive'), { font: 'title', size: 9, color: S.gold, depth: 51 });
    const b2 = txt(this, 0, 0, t('common.simplified'), { size: 20, depth: 51 });
    const bw = b1.width + b2.width + 40;
    this.add.rectangle(640, 22, bw, 32, C.space, 0.92).setStrokeStyle(2, C.gold).setDepth(50);
    b1.setPosition(640 - bw / 2 + 14, 22 - b1.height / 2); b2.setPosition(b1.x + b1.width + 12, 22 - b2.height / 2 - 1);
    this.fx = this.add.container(0, 0).setDepth(30);
    this.onKey = (k) => this.key(k);
    this.input.keyboard.on('keyup', (e) => { this.held[e.key.toLowerCase()] = false; });
    this.input.on('pointermove', (p) => { if (this.step === 'play' && !this.modals.length) this.aimAt(p.x, p.y); });
    this.input.on('pointerdown', (p) => { if (this.step === 'play' && !this.modals.length && p.y < 520 && !(this.input.hitTestPointer(p) || []).some((g) => g._a11yInteractive)) { this.aimAt(p.x, p.y); this.fire(); } });
    setup(this, data, { back: false, help: 'SignalRunScene', helpPos: [24, 656], esc: () => this.pause() });
    this.drawDish();
    if (data.retry) this.start(); else this.brief();
  }

  aimAt(x, y) { this.aim = Phaser.Math.Clamp(Math.atan2(x - ANT.x, ANT.y - y), -1.2, 1.2); this.drawDish(); }

  drawDish() {
    const g = this.dish; g.clear();
    const dx = Math.sin(this.aim), dy = -Math.cos(this.aim);
    g.lineStyle(6, 0xdddddd, 1); g.lineBetween(ANT.x, ANT.y + 20, ANT.x + dx * 30, ANT.y + 20 + dy * 30);
    g.fillStyle(0xffffff, 1); g.fillCircle(ANT.x + dx * 34, ANT.y + 20 + dy * 34, 9);
    const a = this.aimLine; a.clear();
    if (this.step !== 'play') return;
    a.lineStyle(2, C.cyan, 0.5);
    for (let k = 2; k < 22; k += 2) a.lineBetween(ANT.x + dx * k * 22, ANT.y + dy * k * 22, ANT.x + dx * (k + 1) * 22, ANT.y + dy * (k + 1) * 22);
  }

  // ---------- 16a · learn + briefing ----------
  brief() {
    this.briefObjs = [];
    const add = (o) => { this.briefObjs.push(o); return o; };
    add(this.add.rectangle(0, 0, W, H, C.space, 0.82).setOrigin(0).setDepth(39));
    add(txt(this, 640, 64, t('signal.title'), { font: 'title', size: 26, color: S.gold, origin: 0.5, shadow: 3, depth: 41 }));
    // what really happened (learning card, before playing)
    const lx = 40, lw = 600;
    const lt = this.mem.learn.map((l) => txt(this, lx + 20, 0, `• ${l.text}`, { size: 20, wrap: lw - 40, lineSpacing: 0, depth: 41 }));
    const lh = 70 + lt.reduce((s, o) => s + o.height + 8, 0);
    add(panel(this, lx, 100, lw, lh, { fill: C.blueCard, stroke: C.blueBorder, bw: 4, shadow: true, depth: 40 }));
    add(txt(this, lx + 20, 116, t('signal.learnTitle'), { font: 'title', size: 10, color: S.cyan, depth: 41 }));
    add(txt(this, lx + 20, 138, t('signal.learnNote'), { size: 19, color: S.muted, depth: 41 }));
    let y = 166; for (const o of lt) { o.y = y; add(o); y += o.height + 8; }
    // how to play
    const hx = 660, hw = 580;
    add(panel(this, hx, 100, hw, 330, { fill: C.navy2, stroke: C.gold, bw: 4, shadow: true, depth: 40 }));
    add(txt(this, hx + 20, 116, t('signal.how'), { font: 'title', size: 10, color: S.gold, depth: 41 }));
    y = 144; for (const s of t('signal.steps')) { const o = add(txt(this, hx + 20, y, s, { size: 21, wrap: hw - 40, lineSpacing: 0, depth: 41 })); y += o.height + 6; }
    add(txt(this, hx + 20, y + 6, t('signal.memInfo', { MB: this.plan.inMemory, PLAN: this.plan.planned, N: this.need }), { size: 20, color: S.cyan, wrap: hw - 40, depth: 41 }));
    this.mentor = mentorBar(this, 40, Math.max(450, 100 + lh + 16), 760, 110, '', { portrait: 104, size: 21, depth: 42 });
    this.mentor.set(t('signal.mentor'), { silent: true });
    add(pxButton(this, 1016, 640, 240, 60, t('signal.go'), () => this.start(), { primary: true, depth: 42 }));
    say(`${t('signal.title')}. ${t('signal.learnTitle')}. ${this.mem.learn.map((l) => l.text).join(' ')} ${t('signal.how')}: ${t('signal.steps').join(' ')} ${t('signal.mentor')} Press Enter to start.`);
  }

  start() {
    if (this.step === 'play') return;
    for (const o of this.briefObjs || []) o.destroy();
    this.briefObjs = [];
    if (this.mentor) { this.mentor.destroy(); this.mentor = null; }
    this.step = 'play'; this.passT = 0; this.waitT = 0;
    this.buildHud();
    this.drawDish();
    say(t('signal.controls'));
  }

  buildHud() {
    panel(this, 24, 50, 760, 50, { fill: C.space, alpha: 0.92, stroke: C.white, bw: 3, depth: 30 });
    txt(this, 40, 75, t('signal.packets'), { font: 'title', size: 7, color: S.muted, origin: [0, 0.5], depth: 31 });
    this.pkG = this.add.graphics().setDepth(31);
    this.pkText = txt(this, 236, 75, '', { font: 'title', size: 10, color: S.gold, origin: [0, 0.5], depth: 31 });
    txt(this, 296, 75, t('signal.energy'), { font: 'title', size: 7, color: S.muted, origin: [0, 0.5], depth: 31 });
    this.enBar = bar(this, 360, 64, 130, 22, 1, C.green, { depth: 31 });
    this.enText = txt(this, 496, 75, '', { font: 'title', size: 10, color: S.gold, origin: [0, 0.5], depth: 31 });
    txt(this, 566, 75, t('signal.closes'), { font: 'title', size: 7, color: S.muted, origin: [0, 0.5], depth: 31 });
    this.winText = txt(this, 700, 75, '', { font: 'title', size: 10, color: S.green, origin: [0, 0.5], depth: 31 });
    panel(this, 916, 50, 256, 50, { fill: C.space, alpha: 0.92, stroke: C.cyan, bw: 3, depth: 30 });
    txt(this, 928, 75, t('signal.delay'), { font: 'title', size: 7, color: S.cyan, origin: [0, 0.5], depth: 31 });
    txt(this, 1160, 75, `${this.delay} min`, { size: 24, origin: [1, 0.5], depth: 31 });
    // memory (real rule: unsent data stays saved)
    panel(this, 916, 108, 256, 74, { fill: C.space, alpha: 0.92, stroke: C.white, bw: 3, depth: 30 });
    txt(this, 928, 118, t('signal.memory'), { font: 'title', size: 7, color: S.muted, depth: 31 });
    this.memBar = bar(this, 928, 136, 232, 18, 0, C.gold, { depth: 31 });
    this.memText = txt(this, 928, 158, '', { size: 18, color: S.text, depth: 31 });
    this.status = txt(this, 640, 230, '', { font: 'title', size: 10, color: S.gold, origin: 0.5, depth: 31, shadow: 2 });
    txt(this, 100, 690, t('signal.controls'), { size: 20, origin: [0, 0.5], depth: 31, shadow: 2 });
    this.refreshHud();
  }

  refreshHud() {
    const g = this.pkG; g.clear();
    for (let i = 0; i < this.need; i++) { g.fillStyle(i < this.linked ? C.cyan : 0x2a3358, 1); g.fillRect(150 + i * 26, 65, 20, 20); g.lineStyle(2, C.white, 1); g.strokeRect(150 + i * 26, 65, 20, 20); }
    this.pkText.setText(`${this.linked}/${this.need}`);
    const e = Math.max(0, Math.round(this.energy));
    this.enBar.set(e / 100, e < 25 ? C.red : C.green); this.enText.setText(`${e}%`);
    const x = this.orbiter.x;
    if (this.waitT > 0) this.winText.setText('—');
    else if (inWindow(x)) this.winText.setText(`0:${String(Math.max(0, Math.ceil(((WIN.x1 - x) / (W + 160)) * PASS_SEC))).padStart(2, '0')}`);
    else this.winText.setText(x < WIN.x0 ? 'SOON' : 'CLOSED');
    this.memBar.set(this.memUsed / this.mem.gameMemoryMb);
    this.memText.setText(t('signal.memLine', { USED: Math.round(this.memUsed * 10) / 10, CAP: this.mem.gameMemoryMb }));
  }

  key(k) {
    const lk = k.toLowerCase();
    if (this.step === 'brief') { if (k === 'Enter' || k === ' ') { this.start(); return true; } return false; }
    if (this.step === 'result') { if (k === 'Enter') { this.next(); return true; } if (lk === 'r') { this.scene.restart({ retry: true }); return true; } return false; }
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(lk)) { this.held[lk] = true; return true; }
    if (k === ' ') { this.fire(); return true; }
    return false;
  }

  fire() {
    if (this.step !== 'play' || this.paused) return;
    if (this.energy < this.cfg.shotCost) { this.finish(); return; }
    if (this.queue.isEmpty()) return;
    const pk = this.queue.dequeue();                       // the oldest packet in memory goes first (FIFO)
    this.energy -= this.cfg.shotCost; this.shots += 1;
    const dx = Math.sin(this.aim), dy = -Math.cos(this.aim);
    const dot = this.add.rectangle(ANT.x + dx * 40, ANT.y + dy * 40, 12, 12, C.cyan).setDepth(10);
    this.packets.push({ pk, dot, vx: dx * PACKET_SPEED, vy: dy * PACKET_SPEED });
    sfx(this, 'sfx-pickup');
    this.refreshHud();
  }

  pop(x, y, s, color) {
    const o = txt(this, x, y, s, { font: 'title', size: 10, color, origin: 0.5, depth: 32, shadow: 2 });
    this.tweens.add({ targets: o, y: y - 36, alpha: 0, duration: 1300, onComplete: () => o.destroy() });
  }

  // a packet that did not reach the orbiter goes BACK into memory (real rule)
  saveBack(p, why) {
    this.queue.enqueue(p.pk);
    if (why === 'dust') { this.blocked += 1; this.pop(p.dot.x, p.dot.y, t('signal.blocked'), S.yellow); }
    else { this.missed += 1; this.pop(Phaser.Math.Clamp(p.dot.x, 140, 1140), Math.max(120, p.dot.y + 30), t('signal.lost'), S.red); }
    this.status.setText(t('signal.saved')); this.time.delayedCall(1500, () => this.status && this.status.setText(''));
    p.dead = true;
  }

  update(time, delta) {
    if (this.step !== 'play' || this.paused || this.modals.length) return;
    const dt = Math.min(0.05, delta / 1000);
    const h = this.held;
    if (h.a || h.arrowleft) { this.aim = Math.max(-1.2, this.aim - 1.6 * dt); this.drawDish(); }
    if (h.d || h.arrowright) { this.aim = Math.min(1.2, this.aim + 1.6 * dt); this.drawDish(); }
    // orbiter passes: when it leaves, data waits for the NEXT PASS (no time limit: the limit is memory)
    if (this.waitT > 0) {
      this.waitT -= dt;
      if (this.waitT <= 0) { this.passT = 0; this.passes += 1; this.status.setText(''); }
    } else {
      this.passT += dt;
      this.orbiter.x = orbiterX(this.passT);
      if (this.passT >= PASS_SEC) { this.waitT = GAP_SEC; this.orbiter.x = -200; this.status.setText(t('signal.waiting')); say(t('signal.waiting')); }
    }
    const inWin = this.waitT <= 0 && inWindow(this.orbiter.x);
    this.winBox.setFillStyle(C.green, inWin ? 0.28 : 0.1);
    for (const c of this.clouds) { c.x += c.vx * dt; if (c.x < 60 || c.x > W - 60) c.vx *= -1; c.g.x = c.x; }
    for (const p of this.packets) {
      p.dot.x += p.vx * dt; p.dot.y += p.vy * dt;
      if (this.clouds.some((c) => Math.abs(p.dot.x - c.x) < 52 && Math.abs(p.dot.y - c.y) < 24)) { this.saveBack(p, 'dust'); continue; }
      if (Math.abs(p.dot.y - SKY_Y) < 22 && Math.abs(p.dot.x - this.orbiter.x) < 46 && this.waitT <= 0) {
        if (inWindow(this.orbiter.x)) {
          p.dead = true; this.linked += 1; this.memUsed = Math.max(0, this.memUsed - p.pk.mb);
          this.pop(this.orbiter.x, SKY_Y + 50, t('signal.linked'), S.cyan); sfx(this, 'sfx-place');
          if (this.linked >= this.need) { this.time.delayedCall(500, () => this.finish()); }
        } else this.saveBack(p, 'window');
        continue;
      }
      if (p.dot.y < 40 || p.dot.x < -20 || p.dot.x > W + 20) this.saveBack(p, 'miss');
    }
    this.packets = this.packets.filter((p) => { if (p.dead) p.dot.destroy(); return !p.dead; });
    this.refreshHud();
    if (this.energy < this.cfg.shotCost && !this.packets.length && this.linked < this.need) this.finish();
  }

  // ---------- 16c · results ----------
  finish() {
    if (this.step === 'result') return;
    this.step = 'result';
    this.packets.forEach((p) => p.dot.destroy()); this.packets = [];
    this.aimLine.clear();
    const mi = state.mission;
    const all = this.linked >= this.need;
    mi.signal = { packets: this.linked, shots: this.shots, energyLeft: Math.max(0, Math.round(this.energy)), done: true,
      missed: this.missed, blocked: this.blocked, passes: this.passes, delayMin: this.delay,
      sentMb: Math.round(this.linked * this.plan.perPacket * 10) / 10, waitingMb: Math.round(this.memUsed * 10) / 10 };
    logEvent(`Signal Run: ${this.linked}/${this.need} packets linked in ${this.passes} pass(es); ${mi.signal.waitingMb} Mb still saved in memory.`, 'signal');
    this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(39);
    const x = 320, y = 110, w = 640, h = 330;
    panel(this, x, y, w, h, { fill: C.navy, stroke: C.gold, bw: 4, shadow: true, depth: 40 });
    txt(this, 640, y + 36, all ? t('signal.sent') : t('signal.partTitle'), { font: 'title', size: 22, color: all ? S.gold : S.cyan, origin: 0.5, depth: 41, shadow: 3 });
    txt(this, 640, y + 72, `${t('signal.rover')}  ->  ${t('signal.orbiter')}  ->  ${t('signal.dsn')}`, { font: 'title', size: 9, color: S.text, origin: 0.5, depth: 41 });
    panel(this, 470, y + 94, 340, 50, { fill: C.space, border: false, depth: 40 });
    txt(this, 486, y + 119, t('signal.arrives'), { font: 'title', size: 7, color: S.muted, origin: [0, 0.5], depth: 41 });
    txt(this, 796, y + 119, this.linked ? `${this.delay} MIN` : t('signal.nextPassShort'), { font: 'title', size: this.linked ? 14 : 9, color: S.cyan, origin: [1, 0.5], depth: 41 });
    const cols = [[t('signal.packets'), `${this.linked} / ${this.need}`, S.cyan], [t('signal.shots'), String(this.shots), S.text], [t('signal.energyLeft'), `${mi.signal.energyLeft}%`, S.gold], [t('signal.inMemory'), `${mi.signal.waitingMb} Mb`, S.text]];
    cols.forEach(([k, v, c], i) => { txt(this, 412 + i * 152, y + 170, k, { font: 'title', size: 6, color: S.muted, origin: 0.5, depth: 41 }); txt(this, 412 + i * 152, y + 198, v, { font: 'title', size: 12, color: c, origin: 0.5, depth: 41 }); });
    pxButton(this, x + 30, y + h - 86, 200, 60, t('signal.retry'), () => this.scene.restart({ retry: true }), { depth: 42 });
    pxButton(this, x + 250, y + h - 86, 360, 60, t('signal.continue'), () => this.next(), { primary: true, depth: 42 });
    const clues = (mi.rocks.samples || []).filter((s) => s.evidence === 'strong').map((s) => s.name.toLowerCase());
    const ment = all ? t('signal.resultMentor', { min: this.delay, CLUES: clues.length ? clues.join(' and ') : 'science' }) : t('signal.outMentor');
    this.mentor = mentorBar(this, 300, 460, 680, 120, '', { portrait: 110, size: 21, depth: 42 });
    this.mentor.set(ment, { silent: true });
    say(`${all ? t('signal.sent') : t('signal.partTitle')}. ${this.linked} of ${this.need} packets. Arrives on Earth in ${this.delay} minutes. ${mi.signal.waitingMb} megabits still saved in memory. ${ment} Press Enter for the mission report.`);
  }

  next() { go(this, 'DashboardScene', {}, { transition: 'stars' }); }

  pause() { if (this.step === 'play') openPause(this, () => this.finish(), { quitLabel: t('signal.pauseQuit') }); }
}
