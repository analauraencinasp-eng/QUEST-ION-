// LaunchScene.js — launch with a gravity assist (owner: P4).
// Addendum C: FIRST a "Launch window" timing bar: Space inside the green zone = no penalty,
// miss = +10 fuel spent. Then the aim works as in v2. Stars: window hit + first shot = 3.
// Up/Down = angle, Left/Right = power, Space = launch. The dotted line passes Earth first
// (flyby, like Juno in 2013) and goes on to Jupiter. Green zone = success.
// Fuel: launch costs 30, each correction 20 (max 2). If you cannot reach the green zone
// any more: results.missionLost = true and the game jumps to EndingScene ("Lost in Space").
// Reads content.fuel, content.launch, ship. Writes ship.fuel, results.fuelAtArrival,
// results.launchAttempts, results.missionLost. Next: JupiterScene or EndingScene.

import { state, logEvent } from './state.js';
import { say } from './a11y.js';
import { computeShip } from './rules.js';
import * as ui from './ui.js';

const EARTH = { x: 150, y: 390 }, JUPITER = { x: 790, y: 170 };

export default class LaunchScene extends Phaser.Scene {
  constructor() { super('LaunchScene'); }

  create() {
    ui.freshScene(this, { launched: false, windowHit: false, win: null, phase: 'window', done: false, busy: false, nextScene: null, dragging: false, skipBtn: null });
    this.c = ui.content(this);
    this.L = this.c.launch;
    this.F = this.c.fuel;
    this.helpKey = 'launch';
    state.ship.fuel = computeShip(this.c, state).fuel;      // tanks full at launch
    this.angle = Math.round((this.L.angleRange[0] + this.L.angleRange[1]) / 2);
    this.power = Math.round((this.L.powerRange[0] + this.L.powerRange[1]) / 2);
    this.corrections = 0;
    this.busy = false;
    this.done = false;
    this.newTarget();

    ui.background(this);
    this.drawStars();
    ui.image(this, EARTH.x, EARTH.y, 'art-earth', 72, 72, { placeholder: '#3C8EE0' });
    ui.image(this, JUPITER.x, JUPITER.y, 'art-jupiter', 140, 140, { placeholder: '#C96A3F' });
    ui.text(this, EARTH.x, EARTH.y + 46, 'Tierra', { size: 16, origin: [0.5, 0], world: true });
    ui.text(this, JUPITER.x, JUPITER.y + 78, 'Júpiter', { size: 16, origin: [0.5, 0], world: true });
    this.zone = this.add.graphics();
    this.path = this.add.graphics();
    this.probe = ui.image(this, EARTH.x, EARTH.y, 'art-rocket', 16, 48, { placeholder: '#f6efe3' }).setVisible(false);

    ui.progressBar(this, 4);
    ui.helpHint(this);
    this.status = ui.text(this, 20, 42, '', { size: 16 });
    this.costText = ui.text(this, 20, 66, '', { size: 16, color: ui.color(this, 'muted') });
    this.band = this.add.graphics().setDepth(5);
    this.redraw();
    ui.onKeys(this, (k) => this.onKey(k));
    // mouse / touch: tap during the window; drag back from Earth like a slingshot to aim, release to launch
    this.input.on('pointerdown', (p, over) => {
      if (this.modal || over.length) return;
      if (this.phase === 'window') { this.endWindow(false); return; }
      if (this.phase === 'aim' && !this.busy && !this.done) { this.dragging = true; this.aimAt(p); }
    });
    this.input.on('pointermove', (p) => { if (this.dragging) this.aimAt(p); });
    this.input.on('pointerup', () => {
      if (!this.dragging) return;
      this.dragging = false; this.band.clear();
      if (!this.modal && !this.busy && !this.done) this.fire();
    });
    this.skipBtn = ui.button(this, 870, 455, 'Saltar (K)', () => this.onKey('k'), { w: 140, small: true });
    this.me = ui.buddy(this, 880, 350, 120);
    this.startWindow();
  }

  // slingshot: pull AWAY from where you want to go; longer pull = more power
  aimAt(p) {
    const vx = EARTH.x - p.x, vy = p.y - EARTH.y, len = Math.hypot(vx, vy);
    const L = this.L;
    const ang = Math.atan2(vy, vx) * 180 / Math.PI;
    this.angle = Math.round(Phaser.Math.Clamp(ang, L.angleRange[0], L.angleRange[1]));
    this.power = Math.round(Phaser.Math.Clamp(L.powerRange[0] + ((len - 20) / 200) * (L.powerRange[1] - L.powerRange[0]), L.powerRange[0], L.powerRange[1]));
    this.band.clear().lineStyle(3, 0xff8a6b, 1).lineBetween(EARTH.x, EARTH.y, p.x, p.y).fillStyle(0xff8a6b, 1).fillCircle(p.x, p.y, 6);
    this.redraw();
  }

  // ---------- launch window (timing bar) ----------
  startWindow() {
    this.phase = 'window';
    this.win = { t: 0, objs: [] };
    const [a, b] = this.L.windowZone, x0 = 230, w = 500;
    const o = this.win.objs;
    o.push(ui.panel(this, x0 - 30, 140, w + 60, 150, { depth: 200 }));
    o.push(ui.text(this, 480, 152, 'VENTANA DE LANZAMIENTO · Espacio en la zona verde', { size: 16, origin: [0.5, 0], color: ui.color(this, 'accent'), depth: 201 }));
    o.push(ui.track(this, this.add.rectangle(x0, 210, w, 26, 0x2b2a48).setOrigin(0, 0.5), 201));
    o.push(ui.track(this, this.add.rectangle(x0 + a * w, 210, (b - a) * w, 26, ui.hexNum(ui.color(this, 'ok'))).setOrigin(0, 0.5), 202));
    o.push(ui.text(this, x0 + ((a + b) / 2) * w, 232, '✓ YA', { size: 16, origin: [0.5, 0], color: ui.color(this, 'ok'), depth: 202 }));
    this.win.marker = ui.track(this, this.add.rectangle(x0, 210, 6, 44, 0xf6efe3), 203);
    o.push(this.win.marker);
    o.push(ui.text(this, 480, 262, `Fallar = ${this.L.windowPenalty} de combustible extra · K: saltar`, { size: 16, origin: [0.5, 0], color: ui.color(this, 'muted'), depth: 201 }));
    this.win.x0 = x0; this.win.w = w;
    ui.directorSays(this, this.c.dialogues.director.window);
  }

  windowPos() {
    const period = this.L.windowSeconds * (state.settings.noTimers ? 2 : 1);   // slower with No timers
    const ph = (this.win.t / period) % 2;
    return ph < 1 ? ph : 2 - ph;                                               // back and forth 0..1..0
  }

  endWindow(skipped) {
    const p = this.windowPos(), [a, b] = this.L.windowZone, hit = skipped || (p >= a && p <= b);
    this.windowHit = hit;
    if (!hit) state.ship.fuel -= this.L.windowPenalty;
    ui.sfx(this, hit ? 'sfx-pickup' : 'sfx-error');
    if (hit) ui.burst(this, this.win.x0 + p * this.win.w, 210, 0x86d8b4, 20);
    this.me.say(hit ? '¡Justo a tiempo!' : '¡Tarde! Quemamos combustible extra.', hit ? 'happy' : 'sad');
    this.win.objs.forEach((o) => o.destroy());
    this.phase = 'aim';
    logEvent(`Ventana de lanzamiento ${hit ? 'acertada' : `fallada (+${this.L.windowPenalty} de combustible)`}.`);
    ui.directorSays(this, `${hit ? this.c.dialogues.director.windowHit : this.c.dialogues.director.windowMiss} ${this.c.dialogues.director.launch}`, hit ? 'happy' : 'sad');
    if (!hit) ui.shake(this);
    this.redraw();
    ui.conceptCard(this, 'gravity-assist');
  }

  update(time, delta) {
    if (this.phase !== 'window' || this.modal) return;
    this.win.t += delta / 1000;
    this.win.marker.setX(this.win.x0 + this.windowPos() * this.win.w);
  }

  drawStars() {
    const g = this.add.graphics();
    const rnd = new Phaser.Math.RandomDataGenerator(['launch']);
    for (let i = 0; i < 120; i++) { g.fillStyle(i % 4 ? 0xf6efe3 : 0x8FD3FF, 1); g.fillRect(rnd.between(0, 960), rnd.between(36, 470), 2, 2); }
  }

  newTarget() {
    const r = Phaser.Math.Between;
    this.target = { angle: r(this.L.targetAngle[0], this.L.targetAngle[1]), power: r(this.L.targetPower[0], this.L.targetPower[1]) };
  }

  // where the probe would end: Jupiter + an offset that grows with the aiming error
  endPoint() {
    const dA = this.angle - this.target.angle, dP = this.power - this.target.power;
    return { x: JUPITER.x + dP * 6, y: JUPITER.y - dA * 6, error: Math.hypot(dA, dP) };
  }

  // flyby arc around Earth, then a curve toward the end point
  pathPoints() {
    const pts = [], end = this.endPoint();
    for (let t = 0; t <= 1; t += 0.05) {             // half loop around Earth (gravity assist)
      const a = Math.PI * (0.5 + t);
      pts.push({ x: EARTH.x + Math.cos(a) * 60, y: EARTH.y - Math.sin(a) * 60 });
    }
    const start = pts[pts.length - 1];
    const ctrl = { x: start.x + 200, y: start.y - 120 - this.angle * 3 };
    for (let t = 0; t <= 1; t += 0.025) {
      const u = 1 - t;
      pts.push({ x: u * u * start.x + 2 * u * t * ctrl.x + t * t * end.x, y: u * u * start.y + 2 * u * t * ctrl.y + t * t * end.y });
    }
    return pts;
  }

  redraw() {
    const ok = ui.hexNum(ui.color(this, 'ok'));
    this.zone.clear();
    this.zone.lineStyle(4, ok, 1).strokeCircle(JUPITER.x, JUPITER.y, this.L.tolerance * 6);
    this.path.clear();
    this.path.fillStyle(0xf6efe3, 1);
    this.pathPoints().forEach((p, i) => { if (i % 2 === 0) this.path.fillRect(p.x - 2, p.y - 2, 4, 4); });
    const left = this.F.maxCorrections - this.corrections;
    const next = this.corrections === 0 && !this.launched ? this.F.launch : this.F.correction;
    this.status.setText(`Ángulo ${this.angle}° · Fuerza ${this.power} · Combustible ${state.ship.fuel}`);
    this.costText.setText(`Disparo: −${next} de combustible · correcciones: ${left}`);
  }

  onKey(k) {
    if (this.done) { if (k === 'Enter' || k === ' ') this.next(); return; }
    if (this.phase === 'window') { if (k === ' ' || k === 'Enter') this.endWindow(false); else if (k === 'k' || k === 'K') this.endWindow(true); return; }
    if (this.busy) return;
    const L = this.L;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') this.angle = Math.min(L.angleRange[1], this.angle + L.angleStep);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') this.angle = Math.max(L.angleRange[0], this.angle - L.angleStep);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.power = Math.min(L.powerRange[1], this.power + L.powerStep);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.power = Math.max(L.powerRange[0], this.power - L.powerStep);
    else if (k === ' ' || k === 'Enter') { this.fire(); return; }
    else if (k === 'k' || k === 'K') { this.skip(); return; }
    else return;
    this.redraw();
    say(`Ángulo ${this.angle}, fuerza ${this.power}`);
  }

  fire() {
    const cost = this.launched ? this.F.correction : this.F.launch;
    if (state.ship.fuel < cost) { this.lose('No hay combustible para otra corrección.'); return; }
    state.ship.fuel -= cost;
    state.results.launchAttempts++;
    if (this.launched) this.corrections++;
    this.launched = true;
    this.busy = true;
    this.me.say(this.launched ? 'Encendido de corrección... ¡ya!' : '3... 2... 1... ¡DESPEGUE!', 'happy');
    this.band.clear();
    ui.sfx(this, 'sfx-launch');
    ui.shake(this);
    const pts = this.pathPoints(), hit = this.endPoint().error <= this.L.tolerance;
    this.probe.setVisible(true);
    let i = 0;
    const ev = this.time.addEvent({ delay: 25, repeat: pts.length - 1, callback: () => {
      if (i >= pts.length) return;
      const p = pts[i++]; this.probe.setPosition(p.x, p.y); this.band.fillStyle(0xffd27a, 1).fillRect(p.x - 1, p.y - 1, 3, 3);
      if (i === pts.length) { ev.remove(); this.resolve(hit); }   // own counter: resolve exactly once
    } });
    this.redraw();
  }

  resolve(hit) {
    this.busy = false;
    if (hit) { this.arrive(); return; }
    const canCorrect = this.corrections < this.F.maxCorrections && state.ship.fuel >= this.F.correction;
    if (!canCorrect) { this.lose(this.corrections >= this.F.maxCorrections ? 'No quedan correcciones.' : 'No hay combustible para corregir.'); return; }
    this.newTarget();                     // space moves on: aim again
    this.me.say('¡Casi! Corrijamos el camino.', 'sad');
    this.redraw();
    ui.directorSays(this, this.c.dialogues.director.launchMiss);
  }

  arrive() {
    state.results.fuelAtArrival = state.ship.fuel;
    const stars = this.windowHit && state.results.launchAttempts === 1 ? 3 : 2;
    ui.miniGameResult(this, 'LaunchScene', stars, `Lanzamiento: ${state.results.launchAttempts} disparo(s), ventana ${this.windowHit ? 'acertada' : 'fallada'}.`);
    logEvent(`Llegamos a Júpiter tras ${state.results.launchAttempts} disparo(s) con ${state.ship.fuel} de combustible.`);
    this.done = true;
    this.nextScene = 'JupiterScene';
    ui.burst(this, JUPITER.x, JUPITER.y, 0x86d8b4, 40);
    this.me.say('¡Llegamos a Júpiter!', 'happy');
    this.time.delayedCall(1600, () => ui.directorSays(this, `¡En la zona verde! Quedan ${state.ship.fuel} de combustible.`, 'happy'));
    this.doneButton('A Júpiter ▸');
  }

  lose(why) {
    state.results.missionLost = true;
    logEvent(`Sonda perdida camino a Júpiter: ${why}`);
    this.done = true;
    this.nextScene = 'EndingScene';
    ui.sfx(this, 'sfx-alarm');
    state.stars.LaunchScene = Math.max(state.stars.LaunchScene || 0, 1);
    ui.directorSays(this, `${why} Perdimos la sonda...`, 'sad');
    this.me.say('Nooo... se perdió la sonda.', 'sad');
    ui.shake(this);
    this.doneButton('Continuar ▸');
  }

  // K = skip with an average result: arrive after one correction
  skip() {
    if (this.launched && this.corrections >= this.F.maxCorrections) return;
    const cost = (this.launched ? 0 : this.F.launch) + this.F.correction;
    if (state.ship.fuel < cost) { this.lose('No alcanza el combustible.'); return; }
    state.ship.fuel -= cost;
    state.results.launchAttempts += this.launched ? 1 : 2;
    this.arrive();
  }

  doneButton(label) {
    if (this.skipBtn) { this.skipBtn.destroy(); this.skipBtn = null; }
    ui.button(this, 800, 455, label, () => this.next(), { w: 220, color: '#4f9e78' });
  }

  next() { this.scene.start(this.nextScene); }
}
