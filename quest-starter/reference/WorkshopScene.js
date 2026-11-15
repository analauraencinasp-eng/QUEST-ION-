// WorkshopScene.js — build the probe, Overcooked style (owner: P1).
//
// WHAT HAPPENS HERE
//   A 1920×1080 workshop with 4 stations (Power, Comms, Science, Engines) and the unfinished
//   probe in the middle. Players run to a station, pick up a part, carry it to the probe,
//   install it in a ZONE of the probe and then do a short CALIBRATION mini-game.
//   WHERE you install a part matters (green zone = best, yellow = works but weaker).
//
// THE 3 ACTIVITIES OF EVERY PART
//   1) pick up + carry   2) install in a zone of the probe   3) calibrate (3 reusable mini-games:
//   "cables" = match the plug, "align" = stop the needle in the green, "sequence" = repeat the arrows)
//
// CONTROLS
//   Solo: WASD or arrows to move, Space to interact.  Team: P1 = WASD + E, P2 = arrows + Enter.
//   Mouse/touch: drag a crate onto a zone (your astronaut walks and does it), tap a part on the
//   probe to take it off. Z = undo (Stack.js). F = finish and test. C = cards mode (Stage 1).
//   K = skip a calibration with an average result. ? = help.
//
// DATA: reads content.json (components, zones, placement, concepts, workshop) and uses
//   rules.js (canAdd, canPlace, runTests). Writes state.ship.components, state.ship.placement,
//   state.stars.WorkshopScene. Next: TestsScene.

import Stack from './Stack.js';
import Hud from './Hud.js';
import { state, logEvent } from './state.js';
import { say } from './a11y.js';
import { canAdd, canPlace, runTests, findComponent, zoneOf } from './rules.js';
import * as ui from './ui.js';

// ---------- layout of the 1920×1080 world ----------
const WORLD_W = 1920, WORLD_H = 1080;
const SHIP = { x: 960, y: 560 };
const STATIONS = {                       // station centers (the colored floors of art-workshop-world)
  Power: { x: 330, y: 280 }, Comms: { x: 1590, y: 280 }, Science: { x: 330, y: 800 }, Engines: { x: 1590, y: 800 }
};
const FLOOR = [60, 200, 1860, 900];     // where people can walk
const CONCEPT_FOR_STATION = { Power: ['power'], Comms: ['data-chain'], Science: ['instruments'], Engines: ['radiation', 'fuel'] };
// which calibration mini-game each part uses (only 3 mechanics, reused)
const CALIBRATION = { solar: 'cables', battery: 'cables', storage: 'cables', magnetometer: 'cables',
  antenna: 'align', waves: 'align', junocam: 'align', propulsion: 'sequence', shield: 'sequence' };
const CAL_TITLE = { cables: 'Conecta los cables', align: 'Alinea la señal', sequence: 'Secuencia de encendido del motor' };
const KEYS = {
  solo: [{ up: ['arrowup', 'w'], down: ['arrowdown', 's'], left: ['arrowleft', 'a'], right: ['arrowright', 'd'], act: [' ', 'enter', 'e'] }],
  team: [{ up: ['w'], down: ['s'], left: ['a'], right: ['d'], act: ['e', ' '] },
    { up: ['arrowup'], down: ['arrowdown'], left: ['arrowleft'], right: ['arrowright'], act: ['enter'] }]
};
const Q_COLOR = { best: 0x009E73, ok: 0xF0E442, no: 0xD55E00 };

export default class WorkshopScene extends Phaser.Scene {
  constructor() { super('WorkshopScene'); }

  // =====================================================================
  // STEP 1 — a working workshop: stations, crates, the probe, one player
  // =====================================================================
  create() {
    ui.freshScene(this, { workers: [], crates: {}, zones: {}, placed: {}, finished: false, active: 0, visited: new Set(),
      held: new Set(), t: 0, selected: null, ghost: null, cal: null, calStars: [], cards: null });
    this.c = ui.content(this);
    this.W = this.c.workshop;
    this.helpKey = 'workshop';
    state.ship.placement ||= {};

    // two cameras: "main" moves around the big world, "uiCam" draws the HUD and panels on top
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.uiCam = this.cameras.add(0, 0, 960, 540);
    this.onUiObject = (o) => this.cameras.main.ignore(o);   // ui.js calls this for every UI object
    this.world = (o) => { this.uiCam.ignore(o); return o; };

    this.cameras.main.setBackgroundColor('#0d0c1c');
    if (this.textures.exists('art-workshop-world')) this.world(this.add.image(0, 0, 'art-workshop-world').setOrigin(0).setDisplaySize(WORLD_W, WORLD_H));
    else this.world(this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x201f38).setOrigin(0));   // placeholder floor
    this.drawStations();
    this.drawProbe();
    this.makeWorkers();
    this.sparks = this.world(this.add.graphics().setDepth(40));

    // ---------- UI on top ----------
    ui.progressBar(this, 2);
    ui.helpHint(this);
    this.hud = new Hud(this);
    this.timerText = ui.text(this, 16, 96, '', { size: 18, title: true, color: '#ffd27a' });
    this.goalText = ui.text(this, 480, 94, '', { size: 16, origin: [0.5, 0] });
    this.goalText.setBackgroundColor('#16152acc').setPadding(6, 4, 6, 4);
    this.undoBtn = ui.button(this, 100, 455, 'Deshacer (Z)', () => this.undo(), { w: 160, small: true });
    this.testBtn = ui.button(this, 852, 455, 'PROBAR ▸', () => this.finish(), { w: 190, color: '#4f9e78' });
    this.tip = ui.text(this, 0, 0, '', { size: 16, wrap: 300, depth: 140 });
    this.tip.setBackgroundColor('#16152a').setPadding(8, 6, 8, 6).setVisible(false);

    this.history = new Stack();
    for (const id of state.ship.components) this.history.push(id);   // a redesign keeps what was built
    this.timeLeft = this.c.mission.buildSeconds;

    // ---------- input ----------
    this.input.dragDistanceThreshold = 8;
    this.input.keyboard.on('keyup', (ev) => this.held.delete(ev.key.toLowerCase()));
    ui.onKeys(this, (k) => this.onKey(k));
    this.input.on('pointerdown', (p, over) => {          // tap the floor: the selected astronaut walks there
      if (this.modal || this.finished || over.length) return;
      this.select(null);
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.goTo(this.workers[this.active], wp.x, wp.y);
    });

    this.refreshAll();
    this.updateCamera();
    ui.directorSays(this, 'Corre a una estación, toma una pieza y llévala a la sonda. ¡Empieza por ENERGÍA (arriba a la izquierda)!');
    ui.conceptCard(this, 'budget-mass');
  }

  // A bench with crates for each station. Crates are the parts you can pick up.
  drawStations() {
    for (const st of this.W.stations) {
      const c = STATIONS[st.id], col = ui.hexNum(st.color);
      const parts = this.c.components.filter((x) => x.station === st.id);
      const benchW = 120 * parts.length + 40, bx = c.x - benchW / 2, by = c.y - 150;
      this.world(this.add.rectangle(bx + 6, by + 8, benchW, 130, 0x0d0c1c).setOrigin(0).setDepth(5));
      this.world(this.add.rectangle(bx, by, benchW, 130, 0x33315a).setOrigin(0).setStrokeStyle(4, col).setDepth(6));
      this.world(this.add.rectangle(bx, by, benchW, 30, col).setOrigin(0).setDepth(7));
      this.world(this.add.text(bx + 10, by + 5, `${(this.c.stationNames[st.id] || st.id).toUpperCase()}`, { fontFamily: ui.TITLE_FONT, fontSize: '24px', color: '#16152a' }).setDepth(8));
      parts.forEach((comp, i) => {
        const x = bx + 80 + i * 120, y = by + 82;
        const box = this.world(this.add.rectangle(x, y, 84, 84, 0x9a6a22).setStrokeStyle(4, 0x16152a).setDepth(9));
        const icon = this.world(ui.image(this, x, y - 2, `art-${comp.id}`, 60, 60, { placeholder: '#b9b2d0' }).setDepth(10));
        const badge = this.world(this.add.text(x + 32, y - 44, '', { fontFamily: ui.FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setDepth(11));
        const name = this.world(this.add.text(x, y + 44, this.W.short[comp.id], { fontFamily: ui.TITLE_FONT, fontSize: '24px', color: '#f6efe3' }).setOrigin(0.5, 0).setDepth(11));
        box.setInteractive({ useHandCursor: true, draggable: true });
        this.wireDrag(box, comp.id, 'bench');
        box.on('pointerover', () => this.showTip(comp));
        box.on('pointerout', () => this.tip.setVisible(false));
        this.crates[comp.id] = { box, icon, badge, name, x, y, st, standX: x, standY: by + 200 };
      });
    }
  }

  // The probe in the middle and its zones (content.json "zones" were drawn for a 960 screen:
  // here they are scaled ×1.6 around the probe so they fit the big world)
  drawProbe() {
    this.world(ui.image(this, SHIP.x, SHIP.y, 'art-ship', 176, 176, { placeholder: '#e0a84a' }).setDepth(12));
    const S = 1.6;
    for (const z of this.c.zones) {
      const r = { x: SHIP.x + (z.x - 480) * S, y: SHIP.y + (z.y - 295) * S, w: z.w * S, h: z.h * S };
      const rect = this.world(this.add.rectangle(r.x, r.y, r.w, r.h, 0x16152a, 0.35).setOrigin(0).setStrokeStyle(3, 0x6f6990).setDepth(13));
      const label = this.world(this.add.text(r.x + r.w / 2, r.y - 4, `${z.name.toUpperCase()}`, { fontFamily: ui.FONT, fontSize: '20px', color: '#b9b2d0', backgroundColor: '#16152acc', padding: { x: 4, y: 1 } }).setOrigin(0.5, 1).setDepth(16));
      rect.setInteractive();
      rect.on('pointerdown', () => { if (this.selected) this.order(this.selected, z.id); });
      rect.on('pointerover', () => { if (!this.selected && !this.ghost) this.hint(`${z.name}: ${z.hint}. Caben ${z.cap}.`); });
      this.zones[z.id] = { rect, label, z, r };
    }
    for (const comp of this.c.components) {
      const icon = this.world(ui.image(this, 0, 0, `art-${comp.id}`, 56, 56).setDepth(17).setVisible(false));
      const mark = this.world(this.add.text(0, 0, '', { fontFamily: ui.FONT, fontSize: '24px', color: '#16152a', padding: { x: 3, y: 0 } }).setOrigin(0.5).setDepth(18).setVisible(false));
      icon.setInteractive({ useHandCursor: true, draggable: true });
      this.wireDrag(icon, comp.id, 'ship');
      icon.on('pointerover', () => this.showTip(comp));
      icon.on('pointerout', () => this.tip.setVisible(false));
      this.placed[comp.id] = { icon, mark };
    }
  }

  // position of slot i inside a zone
  slotPos(zone, i) {
    const { r, z } = this.zones[zone];
    if (z.cap === 1) return [r.x + r.w / 2, r.y + r.h / 2 + 4];
    return [r.x + r.w * (i === 0 ? 0.28 : 0.72), r.y + r.h / 2 + 4];
  }

  // =====================================================================
  // STEP 3 (built in from the start) — one or two astronauts
  // =====================================================================
  makeWorkers() {
    const count = state.mode === 'team' ? 2 : 1;
    const av = this.c.avatars || [];
    for (let i = 0; i < count; i++) {
      const look = ((state.avatar || 1) - 1 + i) % 4 + 1;               // P1 is the astronaut chosen at the start
      const a = av.find((q) => q.id === look) || { name: `P${i + 1}`, art: null, role: null };
      const key = a.art && this.textures.exists(`art-role-${a.art}`) ? `art-role-${a.art}` : `art-player${look}`;
      const w = { n: i + 1, x: SHIP.x - 60 + i * 120, y: SHIP.y + 330, carrying: null, installing: null, target: null, face: 1,
        keys: KEYS[count > 1 ? 'team' : 'solo'][i], role: a.role, name: a.name };
      w.shadow = this.world(this.add.ellipse(w.x, w.y + 84, 80, 22, 0x0d0c1c, 0.6).setDepth(19));
      w.ring = this.world(this.add.ellipse(w.x, w.y + 84, 104, 30).setStrokeStyle(3, 0xffd27a).setDepth(19).setVisible(count > 1 && i === 0));
      w.sprite = this.world(ui.image(this, w.x, w.y, key, key.startsWith('art-role') ? 78 : 128, key.startsWith('art-role') ? 172 : 128).setDepth(20));
      w.sprite.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectWorker(i));
      w.tag = this.world(this.add.text(w.x, w.y - 104, count > 1 ? `P${w.n} ${a.name}` : a.name, { fontFamily: ui.TITLE_FONT, fontSize: '30px', stroke: '#16152a', strokeThickness: 6, color: '#ffd27a' }).setOrigin(0.5).setDepth(21));
      w.bubble = this.world(this.add.rectangle(w.x, w.y - 160, 84, 84, 0xf6efe3).setStrokeStyle(4, 0x16152a).setDepth(21).setVisible(false));
      w.bubbleIcon = this.world(this.add.image(w.x, w.y - 160, '__DEFAULT').setDepth(22).setVisible(false));
      w.bar = this.world(this.add.graphics().setDepth(23));
      this.workers.push(w);
    }
  }

  selectWorker(i) {
    this.active = i;
    this.workers.forEach((w, j) => w.ring.setVisible(this.workers.length > 1 && j === i));
    say(`Jugador ${i + 1} seleccionado`);
  }

  // short description of a part (rule: max 3 lines + the best spot)
  showTip(comp) {
    const p = comp.power > 0 ? `+${comp.power}` : `${comp.power}`;
    const best = this.c.placement[comp.id].best.map((b) => this.zones[b].z.name).join(' or ');
    this.tip.setText(`${comp.name}\n${comp.mass} kg · ${comp.cost} M$ · ${p} W\n${comp.card}\nMejor lugar: ${best}`);
    this.tip.setPosition(480 - this.tip.width / 2, 108);
    this.tip.setVisible(true);
    say(`${comp.name}. ${comp.card} Mejor lugar: ${best}.`);
  }

  hint(msg, mood) { ui.directorSays(this, msg, mood); }

  // ---------- drag & drop / tap-select (mouse and touch) ----------
  wireDrag(obj, id, from) {
    obj.on('dragstart', (p) => {
      if (this.modal || this.finished) return;
      this.tip.setVisible(false);
      this.ghost = this.world(this.add.image(0, 0, this.textures.exists(`art-${id}`) ? `art-${id}` : '__DEFAULT').setDisplaySize(64, 64).setDepth(200).setAlpha(0.9));
      this.highlightZones(id);
      ui.sfx(this, 'sfx-pickup');
    });
    obj.on('drag', (p) => { if (this.ghost) { const wp = this.cameras.main.getWorldPoint(p.x, p.y); this.ghost.setPosition(wp.x, wp.y); } });
    obj.on('dragend', (p) => {
      if (!this.ghost) return;
      this.ghost.destroy(); this.ghost = null;
      this.highlightZones(null);
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      const zone = this.zoneAt(wp.x, wp.y);
      if (zone) this.order(id, zone);
    });
    obj.on('pointerup', (p) => {                          // a tap, not a drag
      if (this.modal || this.finished || p.getDistance() > 8) return;
      if (from === 'ship') { this.orderRemove(id); return; }
      this.select(this.selected === id ? null : id);
    });
  }

  select(id) {
    this.selected = id;
    this.highlightZones(id);
    for (const [cid, k] of Object.entries(this.crates)) k.box.setStrokeStyle(cid === id ? 6 : 4, cid === id ? 0x56B4E9 : 0x16152a);
    if (id) this.hint(`${findComponent(this.c, id).name}: ahora toca una zona de la sonda. Verde = mejor lugar.`);
  }

  // zone colors: green = best, yellow = works but weaker, red = not allowed (icon + word in the label too)
  highlightZones(id) {
    for (const { rect, label, z } of Object.values(this.zones)) {
      if (!id) { rect.setStrokeStyle(3, 0x6f6990).setFillStyle(0x16152a, 0.35); label.setText(z.name.toUpperCase()); continue; }
      const r = canPlace(this.c, state, id, z.id);
      const q = !r.ok ? 'no' : r.quality;
      rect.setStrokeStyle(5, Q_COLOR[q]).setFillStyle(Q_COLOR[q], 0.22);
      label.setText(`${q === 'best' ? '★ MEJOR' : q === 'ok' ? '⚠ SIRVE' : '✕ NO'} · ${z.name.toUpperCase()}`);
    }
  }
  zoneAt(x, y) { const hit = Object.values(this.zones).find(({ r }) => x >= r.x - 8 && x <= r.x + r.w + 8 && y >= r.y - 8 && y <= r.y + r.h + 8); return hit ? hit.z.id : null; }

  // ---------- orders: the astronaut walks and does the job ----------
  goTo(w, x, y, cb) { w.target = { x: Phaser.Math.Clamp(x, FLOOR[0], FLOOR[2]), y: Phaser.Math.Clamp(y, FLOOR[1], FLOOR[3]), cb }; }
  zonePoint(zone) { const { r } = this.zones[zone]; return [r.x + r.w / 2, r.y + r.h + 50]; }

  order(id, zone) {
    if (this.modal || this.finished) return;
    const w = this.workers[this.active];
    if (w.installing) return;
    this.select(null);
    const comp = findComponent(this.c, id), moving = state.ship.components.includes(id);
    if (moving && zoneOf(state, id) === zone) return;
    if (!moving) { const chk = canAdd(this.c, state, id); if (!chk.ok) { this.reject(chk.reason, this.crates[id]); return; } }
    const pl = canPlace(this.c, state, id, zone);
    if (!pl.ok) { this.reject(`${comp.name}: ${pl.reason}`); return; }
    const toZone = () => { const [zx, zy] = this.zonePoint(zone); this.goTo(w, zx, zy, () => this.startInstall(w, zone)); };
    if (moving) { w.carrying = id; this.showBubble(w, id); toZone(); return; }
    const k = this.crates[id];
    this.goTo(w, k.standX, k.standY, () => this.pick(w, id, toZone));
  }

  orderRemove(id) {
    if (this.modal || this.finished) return;
    const w = this.workers[this.active];
    if (w.installing) return;
    const [zx, zy] = this.zonePoint(zoneOf(state, id) || 'vault');
    this.goTo(w, zx, zy, () => this.uninstall(id, true));
  }

  showBubble(w, id) {
    w.bubble.setVisible(true);
    if (this.textures.exists(`art-${id}`)) w.bubbleIcon.setTexture(`art-${id}`).setDisplaySize(66, 66).setVisible(true);
    this.tweens.add({ targets: w.bubble, scale: { from: 0.4, to: 1 }, duration: 160 });
  }

  // ACTIVITY 1: pick up. The first visit to a station shows its concept card(s) first.
  pick(w, id, then) {
    const st = this.crates[id].st;
    const go = () => {
      w.carrying = id;
      this.showBubble(w, id);
      ui.sfx(this, 'sfx-pickup');
      this.hint(`${w.name} tiene: ${findComponent(this.c, id).name}. Llévalo a una zona VERDE de la sonda.`);
      if (then) then();
    };
    if (!this.visited.has(st.id)) {
      this.visited.add(st.id);
      const ids = CONCEPT_FOR_STATION[st.id] || [];
      const chain = (i) => (i < ids.length ? ui.conceptCard(this, ids[i], () => chain(i + 1)) : go());
      chain(0);
    } else go();
  }

  // ACTIVITY 2: install (takes time; a specialist of that station's role is twice as fast)
  startInstall(w, zone) {
    if (!w.carrying) return;
    const comp = findComponent(this.c, w.carrying);
    const station = this.W.stations.find((s) => s.id === comp.station);
    const specialist = state.roles.some((r) => r.player === w.n && r.role === station.role);
    const secs = this.W.installSeconds * (specialist ? this.W.specialtyFactor : 1);
    w.installing = { id: comp.id, zone, total: secs, left: secs, spark: 0 };
    if (specialist && this.workers.length > 1) ui.floatText(this, 480, 150, `${w.name}: ¡especialista, velocidad ×2!`, '#86d8b4');
  }

  finishInstall(w) {
    const { id, zone } = w.installing;
    w.installing = null;
    w.bar.clear();
    if (this.tryInstall(id, zone, w)) {
      w.carrying = null; w.bubble.setVisible(false); w.bubbleIcon.setVisible(false);
      this.startCalibration(id);                            // ACTIVITY 3
    }
  }

  // ---------- shared install logic (mouse, keyboard and cards all use it) ----------
  tryInstall(id, zone, w) {
    const comp = findComponent(this.c, id), moving = state.ship.components.includes(id);
    if (!moving) { const chk = canAdd(this.c, state, id); if (!chk.ok) { this.reject(chk.reason); return false; } }
    const pl = canPlace(this.c, state, id, zone);
    if (!pl.ok) { this.reject(`${comp.name}: ${pl.reason}`); return false; }
    if (!moving) { state.ship.components.push(id); this.history.push(id); }   // Stack: remember the order
    state.ship.placement[id] = zone;
    this.refreshAll();
    const icon = this.placed[id].icon;
    ui.sfx(this, 'sfx-place');
    this.worldBurst(icon.x, icon.y, pl.quality === 'best' ? 0x86d8b4 : 0xF0E442);
    this.tweens.add({ targets: icon, scale: { from: icon.scaleX * 1.8, to: icon.scaleX }, duration: 260 });
    this.hud.refresh(id);                                     // BFS: the affected bars light up
    logEvent(`${moving ? 'Moviste' : 'Instalaste'} ${comp.name} en ${this.zones[zone].z.name} (${pl.quality === 'best' ? 'mejor lugar' : 'lugar más débil'}).`);
    this.hint(`${pl.quality === 'best' ? '★' : '⚠'} ${comp.name}: ${pl.reason}`, pl.quality === 'best' ? 'happy' : 'sad');
    this.fact(`JUNO: ${comp.real}`);
    return true;
  }

  uninstall(id, walked) {
    const i = state.ship.components.indexOf(id);
    if (i === -1) return false;
    state.ship.components.splice(i, 1);
    delete state.ship.placement[id];
    this.history.remove(id);
    ui.sfx(this, 'sfx-pickup');
    this.refreshAll();
    this.hud.refresh(id);
    if (walked) say(`${findComponent(this.c, id).name} retirado.`);
    return true;
  }

  // Z: the LAST part installed comes off first (Stack.js)
  undo() {
    if (this.cal) return;
    const id = this.history.peek();
    if (!id) { this.hint('Nada que deshacer: la sonda está vacía.'); return; }
    this.uninstall(id);
    this.hint(`Deshacer: ${findComponent(this.c, id).name} fue la última pieza, así que sale primero.`);
  }

  // too heavy / too expensive / wrong place: shake, error sound, a red ✕ and the reason
  reject(reason, where) {
    ui.sfx(this, 'sfx-error');
    ui.shake(this);
    if (where) this.worldFloat(where.x, where.y - 50, '✕', '#ff7b8a');
    this.hint(`Control de Misión: ${reason}`, 'sad');
  }

  worldBurst(x, y, tint) {
    const s = this.cameras.main.worldView, z = this.cameras.main.zoom;
    ui.burst(this, (x - s.x) * z, (y - s.y) * z + 0, tint, 22);
  }
  worldFloat(x, y, str, col) {
    const s = this.cameras.main.worldView, z = this.cameras.main.zoom;
    ui.floatText(this, (x - s.x) * z, (y - s.y) * z, str, col);
  }

  // a yellow "real Juno" note for a few seconds
  fact(str) {
    if (this.factText) this.factText.destroy();
    const t = ui.text(this, 480, 404, str, { size: 16, wrap: 560, depth: 141, color: '#16152a', origin: [0.5, 1] });
    t.setBackgroundColor('#ffd27a').setPadding(8, 6, 8, 6);
    this.factText = t;
    this.time.delayedCall(4500, () => { if (this.factText === t) { t.destroy(); this.factText = null; } });
  }

  refreshAll() {
    this.hud.refresh();
    const installed = new Set(state.ship.components);
    for (const comp of this.c.components) {
      const k = this.crates[comp.id];
      const on = installed.has(comp.id), blocked = !on && !canAdd(this.c, state, comp.id).ok;
      k.icon.setAlpha(on ? 0.3 : blocked ? 0.45 : 1);
      k.badge.setText(on ? '✓' : blocked ? '✕' : '');
      k.badge.setColor(on ? '#86d8b4' : '#ff7b8a');
    }
    const count = {};
    for (const comp of this.c.components) {
      const pl = this.placed[comp.id];
      const zone = installed.has(comp.id) ? (zoneOf(state, comp.id) || this.c.placement[comp.id].best[0]) : null;
      if (!zone) { pl.icon.setVisible(false); pl.mark.setVisible(false); continue; }
      state.ship.placement[comp.id] = zone;
      const i = count[zone] || 0; count[zone] = i + 1;
      const [x, y] = this.slotPos(zone, i);
      const best = this.c.placement[comp.id].best.includes(zone);
      pl.icon.setPosition(x, y).setVisible(true);
      pl.mark.setPosition(x + 26, y - 28).setText(best ? '★' : '⚠').setBackgroundColor(best ? '#86d8b4' : '#F0E442').setVisible(true);
    }
    const required = this.c.components.filter((x) => x.required && !installed.has(x.id)).map((x) => this.W.short[x.id]);
    this.goalText.setText(required.length ? `✕ Faltan: ${required.join(' · ')}` : '✓ ¡La sonda puede volar! Agrega instrumentos o PROBAR');
    this.goalText.setColor(required.length ? '#ff7b8a' : '#86d8b4');
    const pending = runTests(this.c, state).filter((t) => t.level !== 'ok');
    this.helpText = `${this.c.dialogues.help.workshop}\n\n${pending.map((t) => `${ui.ICON[t.level]} ${t.message}`).join('\n') || '✓ Todas las revisiones pasan.'}`;
    this.undoBtn.setEnabled(!this.history.isEmpty(), 'nada que deshacer');
    if (this.cards) this.drawCards();
  }

  // =====================================================================
  // STEP 2 — calibration mini-games (3 reusable mechanics)
  // =====================================================================
  startCalibration(id) {
    const kind = CALIBRATION[id] || 'cables', comp = findComponent(this.c, id);
    const objs = [];
    const add = (o) => { objs.push(o); return o; };
    const backdrop = add(ui.track(this, this.add.rectangle(0, 0, 960, 540, 0x000000, 0.55).setOrigin(0), 880));
    backdrop.setInteractive().on('pointerdown', () => { if (this.cal && this.cal.kind === 'align') this.calKey('click'); });
    add(ui.panel(this, 230, 110, 500, 320, { depth: 881, border: '#56B4E9' }));
    add(ui.image(this, 270, 150, `art-${id}`, 48, 48, { ui: true, depth: 882 }));
    add(ui.text(this, 304, 128, `CALIBRAR: ${comp.name}`, { size: 18, title: true, color: '#ffd27a', depth: 882 }));
    add(ui.text(this, 304, 156, CAL_TITLE[kind], { size: 16, depth: 882, color: '#b9b2d0' }));
    const info = add(ui.text(this, 450, 350, '', { size: 16, depth: 882, origin: [0.5, 0], align: 'center', wrap: 400 }));
    const skip = ui.button(this, 668, 404, 'Saltar (K)', () => this.calKey('k'), { w: 110, small: true, depth: 885, inModal: true });
    this.cal = { id, kind, objs, info, skip, mistakes: 0, round: 0, gfx: add(ui.track(this, this.add.graphics(), 882)), t: 0, extra: [] };
    this.modal = (k) => this.calKey(k);
    if (kind === 'cables') this.calCablesRound();
    if (kind === 'align') { this.cal.hits = 0; this.cal.dir = 1; this.cal.pos = 0; this.calAlignTarget(); info.setText('Presiona Espacio (o haz clic) cuando la aguja esté en lo VERDE. ¡3 aciertos!'); }
    if (kind === 'sequence') this.calSequenceShow();
    say(`Calibra: ${comp.name}. ${info.text}`);
  }

  // --- mechanic 1: CABLES — match the plug to the socket with the same color AND symbol ---
  calCablesRound() {
    const cal = this.cal;
    cal.extra.forEach((o) => o.destroy()); cal.extra = [];
    const PLUGS = [['●', '#E69F00'], ['▲', '#56B4E9'], ['■', '#009E73'], ['◆', '#CC79A7']];
    const order = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]).slice(0, 3);
    cal.answer = Phaser.Math.Between(0, 2);
    const plug = PLUGS[order[cal.answer]];
    cal.extra.push(ui.text(this, 300, 230, `cable ${plug[0]}`, { size: 22, title: true, color: plug[1], depth: 883 }));
    order.forEach((p, i) => {
      const y = 210 + i * 56;
      const b = ui.button(this, 600, y - 20, `${i + 1}) ${PLUGS[p][0]}`, () => this.calKey(String(i + 1)), { w: 120, depth: 884, inModal: true, textColor: PLUGS[p][1] });
      cal.extra.push(...b.objs);
    });
    cal.gfx.clear().lineStyle(4, ui.hexNum(plug[1]), 1).lineBetween(420, 242, 530, 242);
    cal.info.setText(`Cable ${cal.round + 1} de 3: conéctalo al enchufe con el MISMO símbolo (1, 2, 3 o clic).`);
  }

  // --- mechanic 2: ALIGN — a needle sweeps; stop it inside the green band ---
  calAlignTarget() { this.cal.band = [0.25 + Math.random() * 0.45]; this.cal.band.push(this.cal.band[0] + 0.16); }
  drawAlign() {
    const cal = this.cal, x0 = 290, w = 380, y = 220;
    cal.gfx.clear().fillStyle(0x2b2a48, 1).fillRect(x0, y, w, 40)
      .fillStyle(0x009E73, 1).fillRect(x0 + cal.band[0] * w, y, (cal.band[1] - cal.band[0]) * w, 40)
      .fillStyle(0xf6efe3, 1).fillRect(x0 + cal.pos * w - 3, y - 12, 6, 64);
    for (let i = 0; i < 3; i++) cal.gfx.fillStyle(i < cal.hits ? 0x86d8b4 : 0x33315a, 1).fillRect(430 + i * 36, 290, 26, 26);
  }

  // --- mechanic 3: SEQUENCE — remember the arrows, then repeat them ---
  calSequenceShow() {
    const cal = this.cal;
    cal.extra.forEach((o) => o.destroy()); cal.extra = [];
    const ARROWS = ['←', '↑', '→', '↓'];
    cal.seq = Array.from({ length: 4 }, () => Phaser.Math.Between(0, 3));
    cal.typed = [];
    cal.showing = true;
    cal.extra.push(ui.text(this, 480, 230, cal.seq.map((a) => ARROWS[a]).join('  '), { size: 32, title: true, origin: [0.5, 0], color: '#ffd27a', depth: 883 }));
    cal.info.setText(state.settings.noTimers ? 'Memoriza las flechas y presiona Espacio para empezar a repetirlas.' : '¡Memoriza las flechas!');
    if (!state.settings.noTimers) this.time.delayedCall(2200, () => { if (this.cal && this.cal.kind === 'sequence') this.calSequenceAsk(); });
  }
  calSequenceAsk() {
    const cal = this.cal;
    cal.showing = false;
    cal.extra.forEach((o) => o.destroy()); cal.extra = [];
    const ARROWS = ['←', '↑', '→', '↓'];
    cal.progress = ui.text(this, 480, 214, '_ _ _ _', { size: 28, title: true, origin: [0.5, 0], depth: 883 });
    cal.extra.push(cal.progress);
    ARROWS.forEach((a, i) => { const b = ui.button(this, 330 + i * 100, 290, a, () => this.calKey(['arrowleft', 'arrowup', 'arrowright', 'arrowdown'][i]), { w: 80, depth: 884, inModal: true }); cal.extra.push(...b.objs); });
    cal.info.setText('Ahora repítelas: flechas, WASD o clic.');
  }

  // every key during a calibration comes here (from ui.onKeys via scene.modal)
  calKey(k) {
    const cal = this.cal;
    if (!cal) return;
    const key = k.toLowerCase();
    if (key === 'k') { this.endCalibration(2, true); return; }          // skip = average result
    if (cal.kind === 'cables' && ['1', '2', '3'].includes(key)) {
      const right = Number(key) - 1 === cal.answer;
      if (!right) { cal.mistakes++; ui.sfx(this, 'sfx-error'); ui.shake(this); cal.info.setText('✕ ¡Enchufe equivocado! Mira el símbolo y vuelve a intentar.'); return; }
      ui.sfx(this, 'sfx-place'); ui.burst(this, 600, 262, 0x86d8b4, 10);
      cal.round++;
      if (cal.round >= 3) this.endCalibration(3 - Math.min(2, cal.mistakes)); else this.calCablesRound();
    } else if (cal.kind === 'align' && (key === ' ' || key === 'enter' || key === 'e' || key === 'click')) {
      if (cal.pos >= cal.band[0] && cal.pos <= cal.band[1]) { cal.hits++; ui.sfx(this, 'sfx-place'); ui.burst(this, 290 + cal.pos * 380, 260, 0x86d8b4, 10); this.calAlignTarget(); }
      else { cal.mistakes++; ui.sfx(this, 'sfx-error'); cal.info.setText('✕ Fallaste lo verde. Espera...'); }
      if (cal.hits >= 3) this.endCalibration(cal.mistakes === 0 ? 3 : cal.mistakes <= 2 ? 2 : 1);
    } else if (cal.kind === 'sequence') {
      if (cal.showing) { if (state.settings.noTimers && (key === ' ' || key === 'enter')) this.calSequenceAsk(); return; }
      const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 };
      if (!(key in map)) return;
      if (map[key] !== cal.seq[cal.typed.length]) {
        cal.mistakes++; ui.sfx(this, 'sfx-error'); ui.shake(this);
        if (cal.mistakes >= 3) { this.endCalibration(1); return; }
        this.calSequenceShow(); return;
      }
      cal.typed.push(map[key]); ui.sfx(this, 'sfx-place');
      cal.progress.setText(cal.seq.map((a, i) => (i < cal.typed.length ? ['←', '↑', '→', '↓'][a] : '_')).join(' '));
      if (cal.typed.length === cal.seq.length) this.endCalibration(cal.mistakes === 0 ? 3 : 2);
    }
  }

  endCalibration(stars, skipped) {
    const cal = this.cal;
    cal.extra.forEach((o) => o.destroy());
    cal.objs.forEach((o) => o.destroy());
    cal.skip.destroy();
    this.cal = null;
    this.modal = null;
    this.calStars.push(stars);
    const avg = Math.round(this.calStars.reduce((a, b) => a + b, 0) / this.calStars.length);
    state.stars.WorkshopScene = avg;                          // addendum B: stars per mini-game
    const comp = findComponent(this.c, cal.id);
    logEvent(`Calibrado ${comp.name}: ${stars} estrellas${skipped ? ' (saltado)' : ''}.`);
    ui.miniGameResult(this, 'WorkshopScene', stars, `¡${comp.name} calibrado! ${this.nextStep()}`);
    state.stars.WorkshopScene = avg;
  }

  // always tell the player what to do next
  nextStep() {
    const need = this.c.components.filter((x) => x.required && !state.ship.components.includes(x.id));
    if (need.length) return `Siguiente: ${need[0].name} en la estación de ${this.c.stationNames[need[0].station] || need[0].station}.`;
    if (!state.ship.components.includes('junocam')) return 'Siguiente: JunoCam (Ciencia) para fotografiar tormentas.';
    if (!state.ship.components.includes('waves')) return 'Siguiente: Waves (Ciencia) para escuchar las auroras.';
    return '¡Se ve bien! Presiona PROBAR cuando estés listo.';
  }

  // =====================================================================
  // Stage 1 (kept): cards mode with the same install functions — press C
  // =====================================================================
  toggleCards() {
    if (this.cards) { this.cards.objs.forEach((o) => o.destroy()); this.cards = null; this.hint('Modo caminar: ¡corre a las estaciones!'); return; }
    const objs = [ui.panel(this, 150, 96, 660, 340, { depth: 300 })];
    objs.push(ui.text(this, 170, 104, 'TARJETAS · Arriba/Abajo eligen · Enter instala/quita · C cierra', { size: 16, color: '#ffd27a', depth: 301 }));
    const rows = this.c.components.map((comp, i) => { const t = ui.text(this, 190, 134 + i * 32, '', { size: 16, depth: 301 }); t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.cards.index = i; this.cardToggle(); }); objs.push(t); return t; });
    this.cards = { objs, rows, index: 0 };
    this.drawCards();
  }
  drawCards() {
    this.c.components.forEach((comp, i) => {
      const on = state.ship.components.includes(comp.id), chk = canAdd(this.c, state, comp.id);
      const zone = on ? this.zones[zoneOf(state, comp.id)].z.name : '';
      this.cards.rows[i].setText(`${i === this.cards.index ? '▸' : ' '} ${on ? '✓' : chk.ok ? '○' : '✕'} ${comp.name} · ${comp.mass} kg · ${comp.cost} M$${zone ? ` · ${zone}` : ''}`);
      this.cards.rows[i].setColor(i === this.cards.index ? '#56B4E9' : on ? '#86d8b4' : chk.ok ? '#f6efe3' : '#8a84a8');
    });
  }
  cardToggle() {
    const comp = this.c.components[this.cards.index];
    if (state.ship.components.includes(comp.id)) { this.uninstall(comp.id, true); return; }
    const zone = [...this.c.placement[comp.id].best, ...this.c.zones.map((z) => z.id)].find((z) => canPlace(this.c, state, comp.id, z).ok);
    if (!zone) { this.reject(`${comp.name}: no hay zona libre donde quepa.`); return; }
    this.tryInstall(comp.id, zone, null);
  }

  // =====================================================================
  // keyboard
  // =====================================================================
  crateInFront(w) {
    let best = null, bd = 90;
    for (const [id, k] of Object.entries(this.crates)) { const d = Math.hypot(k.standX - w.x, k.standY - w.y); if (d < bd) { bd = d; best = id; } }
    return best;
  }
  zoneHere(w) { const hit = Object.values(this.zones).find(({ r }) => w.x >= r.x - 10 && w.x <= r.x + r.w + 10 && w.y >= r.y - 10 && w.y <= r.y + r.h + 70); return hit ? hit.z.id : null; }

  keyAct(w) {
    if (w.installing) return;
    const zone = this.zoneHere(w);
    if (w.carrying && zone) {
      const pl = canPlace(this.c, state, w.carrying, zone);
      if (!pl.ok) { this.reject(`${findComponent(this.c, w.carrying).name}: ${pl.reason}`); return; }
      this.startInstall(w, zone);
      return;
    }
    const id = this.crateInFront(w);
    if (id && !w.carrying) {
      if (state.ship.components.includes(id)) { this.hint(`${findComponent(this.c, id).name} ya está en la sonda.`); return; }
      const chk = canAdd(this.c, state, id);
      if (!chk.ok) { this.reject(chk.reason, this.crates[id]); return; }
      this.pick(w, id);
      return;
    }
    this.hint(w.carrying ? 'Entra a una zona de la sonda (verde = mejor) y presiona tu tecla de acción.' : 'Acércate a una caja en una estación y presiona tu tecla de acción.');
  }

  onKey(k) {
    const key = k.toLowerCase();
    this.held.add(key);
    if (this.finished) return;
    if (this.cards) {
      const n = this.c.components.length;
      if (key === 'arrowup' || key === 'w') { this.cards.index = (this.cards.index + n - 1) % n; this.drawCards(); return; }
      if (key === 'arrowdown' || key === 's') { this.cards.index = (this.cards.index + 1) % n; this.drawCards(); return; }
      if (key === 'enter' || key === ' ') { this.cardToggle(); return; }
    }
    if (key === 'c') { this.toggleCards(); return; }
    if (key === 'f') { this.finish(); return; }
    if (key === 'z') { this.undo(); return; }
    if (key === 'escape') { this.select(null); return; }
    if (this.cards) return;
    for (const w of this.workers) if (w.keys.act.includes(key)) { w.target = null; this.keyAct(w); }
  }

  finish() {
    if (this.finished || this.modal) return;
    this.finished = true;
    logEvent(`Taller terminado con ${state.ship.components.length} piezas.`);
    this.scene.start('TestsScene');
  }

  // =====================================================================
  // the game loop: timer, movement, install progress, camera
  // =====================================================================
  update(time, delta) {
    if (this.finished) return;
    const dt = delta / 1000;
    this.t += dt;
    this.hud.tick(delta);
    // calibration needle moves even though the world is paused
    if (this.cal && this.cal.kind === 'align') {
      const speed = state.settings.noTimers ? 0.45 : 0.9;
      this.cal.pos += this.cal.dir * speed * dt;
      if (this.cal.pos > 1) { this.cal.pos = 1; this.cal.dir = -1; } else if (this.cal.pos < 0) { this.cal.pos = 0; this.cal.dir = 1; }
      this.drawAlign();
    }
    if (!state.settings.noTimers && !this.modal) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.hint('¡Se acabó el tiempo! Probemos lo que construiste.'); this.finish(); return; }
    }
    this.timerText.setText(state.settings.noTimers ? 'Sin cronómetro' : `Tiempo ${Math.ceil(this.timeLeft)}`);
    this.timerText.setColor(!state.settings.noTimers && this.timeLeft < 30 ? '#ff7b8a' : '#ffd27a');
    if (this.modal || this.cards) return;

    this.sparks.clear();
    for (const w of this.workers) this.moveWorker(w, dt);
    // keyboard players carrying a part: color the zones for them
    const carrier = this.workers.find((w) => w.carrying && !w.target && !w.installing);
    if (!this.ghost && !this.selected) this.highlightZones(carrier ? carrier.carrying : null);
    this.updateCamera();
  }

  moveWorker(w, dt) {
    const speed = this.W.speed * 1.5;
    let dx = 0, dy = 0;
    if (w.installing) {
      w.installing.left -= dt;
      w.installing.spark += dt;
      const [sx, sy] = this.slotPos(w.installing.zone, 0);
      if (w.installing.spark > 0.3) { w.installing.spark = 0; ui.sfx(this, 'sfx-photo'); }
      for (let i = 0; i < 8; i++) this.sparks.fillStyle(i % 2 ? 0xffd27a : 0xf6efe3, 1).fillRect(sx - 20 + Math.random() * 40, sy - 20 + Math.random() * 40, 4, 4);
      const p = 1 - w.installing.left / w.installing.total;
      w.bar.clear().fillStyle(0x16152a, 1).fillRect(w.x - 52, w.y + 96, 104, 16).fillStyle(0x56B4E9, 1).fillRect(w.x - 49, w.y + 99, 98 * p, 10);
      if (w.installing.left <= 0) this.finishInstall(w);
    } else if (w.target) {
      const ddx = w.target.x - w.x, ddy = w.target.y - w.y, d = Math.hypot(ddx, ddy);
      if (d <= speed * dt + 1) { w.x = w.target.x; w.y = w.target.y; const cb = w.target.cb; w.target = null; if (cb) cb(); }
      else { dx = ddx / d; dy = ddy / d; }
    } else {
      dx = (w.keys.right.some((k) => this.held.has(k)) ? 1 : 0) - (w.keys.left.some((k) => this.held.has(k)) ? 1 : 0);
      dy = (w.keys.down.some((k) => this.held.has(k)) ? 1 : 0) - (w.keys.up.some((k) => this.held.has(k)) ? 1 : 0);
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    }
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      w.x = Phaser.Math.Clamp(w.x + dx * speed * dt, FLOOR[0], FLOOR[2]);
      w.y = Phaser.Math.Clamp(w.y + dy * speed * dt, FLOOR[1], FLOOR[3]);
      if (dx) w.face = dx > 0 ? 1 : -1;
    }
    const bob = moving ? Math.abs(Math.sin(this.t * 14)) * 5 : 0;
    w.sprite.setPosition(w.x, w.y - bob).setFlipX(w.face < 0).setDepth(20 + w.y / 2000);
    w.shadow.setPosition(w.x, w.y + 84); w.ring.setPosition(w.x, w.y + 84);
    w.tag.setPosition(w.x, w.y - 106 - bob);
    w.bubble.setPosition(w.x, w.y - 160 - bob); w.bubbleIcon.setPosition(w.x, w.y - 160 - bob);
    // highlight the crate in front of a keyboard player
    const front = !w.target && !w.carrying && this.crateInFront(w);
    for (const [id, k] of Object.entries(this.crates)) if (k.hl === w.n && id !== front && id !== this.selected) { k.box.setStrokeStyle(4, 0x16152a); k.hl = 0; }
    if (front && !this.crates[front].hl) { this.crates[front].box.setStrokeStyle(6, 0x56B4E9); this.crates[front].hl = w.n; }
  }

  // solo: follow the astronaut. Team: follow the group and zoom out so both stay visible.
  updateCamera() {
    // The whole workshop fits on the screen: stations, ship and both players are always visible.
    const cam = this.cameras.main;
    // visible strip: below the HUD (y 92) and above the director bar (y 480); world content spans y 130..1000
    const fit = 0.45;
    if (cam.zoom !== fit) { cam.removeBounds(); cam.setZoom(fit); }
    cam.centerOn(WORLD_W / 2, 525);
  }

}
