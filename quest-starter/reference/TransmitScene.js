// TransmitScene.js — send data home, then dilemma 2: open science (owner: P4).
// Packets on board are tiles: click (or Space) to load up to 4 into the antenna.
// "Sort by value" (V or button) uses insertion sort (sorts.js).
// The loaded packets go into a QUEUE (Queue.js) and fly to Earth one by one, first in first out.
// Addendum C: the antenna window closes in 20 s (countdown; off with No timers), then a
// "Fast-forward 45 min..." clock shows the light delay before "Received on Earth ✓".
// What is not sent counts as lost.
// Reads results.packets, ship. Writes results.sent, packetsSent, packetsLost, dilemmas.openData.
// Next: EndingScene.

import Queue from './Queue.js';
import { insertionSort } from './sorts.js';
import { state, logEvent } from './state.js';
import { say } from './a11y.js';
import { computeShip } from './rules.js';
import * as ui from './ui.js';

const NAMES = { storm: 'Foto de tormenta', cloud: 'Foto de nubes', waves: 'Paquete de auroras' };
const ICONS = { storm: 'art-icon-stormphoto', cloud: 'art-icon-cloudphoto', waves: 'art-waves' };
const SHIP = { x: 620, y: 150 }, EARTH = { x: 900, y: 150 };

export default class TransmitScene extends Phaser.Scene {
  constructor() { super('TransmitScene'); }

  create() {
    ui.freshScene(this, { phase: 'choose', tiles: [], buttons: [] });
    this.c = ui.content(this);
    this.helpKey = 'transmit';
    this.capacity = computeShip(this.c, state).downlink;
    this.list = state.results.packets.map((p, i) => ({ ...p, n: i + 1, chosen: false }));
    this.index = 0;

    ui.background(this, 'art-missioncontrol');
    this.add.rectangle(0, 0, 960, 540, 0x0d0c1c, 0.78).setOrigin(0);
    ui.progressBar(this, 6);
    ui.helpHint(this);
    ui.text(this, 30, 44, 'A BORDO', { size: 16, title: true, color: ui.color(this, 'accent') });
    // the signal panel: probe -> beam -> Earth, and the 4 antenna slots
    ui.panel(this, 560, 44, 380, 330);
    ui.image(this, SHIP.x, SHIP.y, 'art-ship', 64, 64, { ui: true });
    ui.image(this, EARTH.x, EARTH.y, 'art-earth', 56, 56, { ui: true });
    this.beam = ui.track(this, this.add.graphics(), 101);
    ui.text(this, 580, 214, `ANTENA · ${this.capacity} lugares${this.capacity < 4 ? ' (¡no mira a la Tierra!)' : ''}`, { size: 16, color: this.capacity < 4 ? '#F0E442' : ui.color(this, 'muted') });
    this.slotObjs = [];
    for (let i = 0; i < this.capacity; i++) {
      ui.track(this, this.add.rectangle(610 + i * 82, 280, 70, 70, 0x16152a).setStrokeStyle(3, 0x56B4E9), 101);
      this.slotObjs.push(ui.image(this, 610 + i * 82, 280, ICONS.storm, 52, 52, { ui: true, depth: 102 }).setVisible(false));
    }
    this.delayText = ui.text(this, 580, 330, '', { size: 16, wrap: 340 });
    this.windowText = ui.text(this, 30, 400, '', { size: 18, title: true, color: ui.color(this, 'warning') });

    this.drawTiles();
    this.sortBtn = ui.button(this, 120, 455, 'Ordenar ⇅ (V)', () => this.sortByValue(), { w: 180, small: true });
    this.sendBtn = ui.button(this, 330, 455, 'ENVIAR ▸', () => this.send(), { w: 180, color: '#4f9e78' });
    this.skipBtn = ui.button(this, 880, 455, 'Saltar (K)', () => this.onKey('k'), { w: 130, small: true });
    this.windowLeft = this.c.transmit.windowSeconds;
    this.me = ui.buddy(this, 500, 318, 100);
    ui.directorSays(this, this.list.length ? 'Haz clic en los paquetes para cargar la antena (¡los mejores primero!) y luego ENVIAR.' : 'No hay datos a bordo. Presiona ENVIAR para seguir.');
    ui.conceptCard(this, 'signal-delay');
    ui.onKeys(this, (k) => this.onKey(k));
  }

  chosenCount() { return this.list.filter((p) => p.chosen).length; }

  drawTiles() {
    this.tiles.forEach((t) => t.forEach((o) => o.destroy()));
    this.tiles = this.list.map((p, i) => {
      const x = 80 + (i % 5) * 96, y = 120 + Math.floor(i / 5) * 120;
      const box = ui.track(this, this.add.rectangle(x, y, 84, 100, p.chosen ? 0x2c4c8c : 0x201f38).setStrokeStyle(i === this.index ? 4 : 2, i === this.index ? 0x56B4E9 : 0x4a4778), 100);
      const ic = ui.image(this, x, y - 14, ICONS[p.type], 52, 52, { ui: true, depth: 101 }).setAlpha(p.chosen ? 0.35 : 1);
      const val = ui.text(this, x, y + 22, `+${p.value}`, { size: 18, title: true, origin: [0.5, 0], color: p.type === 'storm' ? '#ffd27a' : '#f6efe3', depth: 101 });
      box.setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => { if (this.phase === 'choose' && !this.modal) { this.index = i; this.toggle(); } });
      box.on('pointerover', () => ui.directorSays(this, `${NAMES[p.type]}: vale ${p.value} puntos de ciencia.`));
      return [box, ic, val];
    });
    // the antenna slots show what is loaded, in queue order
    const loaded = this.list.filter((p) => p.chosen);
    this.slotObjs.forEach((o, i) => { if (loaded[i]) o.setTexture(ICONS[loaded[i].type]).setDisplaySize(52, 52).setVisible(true); else o.setVisible(false); });
  }

  toggle() {
    const p = this.list[this.index];
    if (!p) return;
    if (!p.chosen && this.chosenCount() >= this.capacity) {
      ui.sfx(this, 'sfx-error'); ui.shake(this);
      ui.directorSays(this, `La antena está llena (${this.capacity}). Haz clic en un paquete cargado para sacarlo.`, 'sad');
      return;
    }
    p.chosen = !p.chosen;
    ui.sfx(this, p.chosen ? 'sfx-pickup' : 'sfx-place');
    this.drawTiles();
    say(`${NAMES[p.type]} ${p.chosen ? 'cargado' : 'descargado'}. ${this.chosenCount()} de ${this.capacity}.`);
  }

  sortByValue() {
    if (this.phase !== 'choose') return;
    const current = this.list[this.index];
    this.list = insertionSort(this.list, (a, b) => b.value - a.value);   // highest value first
    this.index = Math.max(0, this.list.indexOf(current));
    this.drawTiles();
    ui.directorSays(this, 'Ordenado por inserción: los paquetes más valiosos van primero.');
  }

  update(time, delta) {
    if (this.phase !== 'choose' || this.modal || state.settings.noTimers || !this.list.length) {
      if (this.phase === 'choose') this.windowText.setText(state.settings.noTimers ? 'Sin cronómetro: envía cuando quieras.' : '');
      return;
    }
    this.windowLeft -= delta / 1000;
    const s = Math.max(0, Math.ceil(this.windowLeft));
    this.windowText.setText(`Ventana de la antena: ${s} s`);
    this.windowText.setColor(s <= 5 ? '#ff7b8a' : '#ffd27a');
    if (this.windowLeft <= 0) { ui.directorSays(this, '¡Se cerró la ventana! Enviando lo que cargaste.', 'sad'); this.send(); }
  }

  send() {
    if (this.phase !== 'choose' || this.modal) return;
    this.phase = 'sending';
    this.windowText.setText('');
    [this.sortBtn, this.sendBtn, this.skipBtn].forEach((b) => b.destroy());
    const queue = new Queue();
    for (const p of this.list) if (p.chosen) queue.enqueue(p);       // FIFO: they leave in this order
    this.me.say(queue.isEmpty() ? 'Nada que enviar...' : 'Antena hacia la Tierra. ¡Enviando!', queue.isEmpty() ? 'sad' : 'happy');
    const total = queue.size();
    const sent = { storm: 0, cloud: 0, waves: 0 };
    let slot = 0;
    const step = () => {
      if (queue.isEmpty()) { this.fastForward(sent, total); return; }
      const p = queue.dequeue();                                        // O(1), first in first out
      const from = this.slotObjs[slot]; slot++;
      if (from) from.setVisible(false);
      // the packet flies from the probe to Earth along the beam
      const fly = ui.image(this, SHIP.x, SHIP.y, ICONS[p.type], 36, 36, { ui: true, depth: 110 });
      this.beam.clear().lineStyle(4, 0x56B4E9, 0.8).lineBetween(SHIP.x + 30, SHIP.y, EARTH.x - 26, EARTH.y);
      ui.sfx(this, 'sfx-launch');
      this.tweens.add({ targets: fly, x: EARTH.x, duration: this.c.transmit.secondsPerPacket * 1000, onComplete: () => {
        fly.destroy();
        sent[p.type]++;
        ui.burst(this, EARTH.x, EARTH.y, 0x86d8b4, 10);
        ui.sfx(this, 'sfx-place');
        step();
      } });
    };
    if (total === 0) this.finishSending(sent, 0); else step();
  }

  // the signal needs time: fast-forward the light delay, then "Received on Earth ✓"
  fastForward(sent, total) {
    this.beam.clear();
    let min = 0;
    const ev = this.time.addEvent({ delay: 50, repeat: 44, callback: () => {
      if (min >= 45) return;
      min++;
      this.delayText.setText(`» ${this.c.transmit.fastForward} ${min} min`);
      if (min === 45) {
        ev.remove();
        this.delayText.setText(`✓ ${this.c.dialogues.director.received} La luz tardó unos 45 min.`);
        ui.burst(this, EARTH.x, EARTH.y, 0x86d8b4, 30);
        this.me.say('¡La Tierra recibió nuestros datos!', 'happy');
        // stars: value sent compared with the best packets you could have sent
        const best = insertionSort(this.list.map((p) => p.value), (a, b) => b - a).slice(0, this.capacity).reduce((a, b) => a + b, 0);
        const got = this.list.filter((p) => p.chosen).reduce((a, p) => a + p.value, 0), f = best ? got / best : 1;
        const [two, three] = this.c.stars.transmitValue;
        ui.miniGameResult(this, 'TransmitScene', f >= three ? 3 : f >= two ? 2 : 1, `Enviaste ${Math.round(f * 100)}% del mejor valor posible.`);
        this.time.delayedCall(1800, () => this.finishSending(sent, total));
      }
    } });
  }

  finishSending(sent, total) {
    const r = state.results;
    r.sent = sent;
    r.packetsSent = total;
    r.packetsLost = r.packetsCollected - total;
    logEvent(`Enviados ${total} de ${r.packetsCollected} paquetes (${sent.storm} fotos de tormenta, ${sent.cloud} de nubes, ${sent.waves} de auroras).`);
    ui.conceptCard(this, 'open-data', () => this.openDataDilemma());
  }

  openDataDilemma() {
    this.phase = 'dilemma';
    const d = this.c.dilemmas.openData;
    const icons = { public: 'art-earth', later: 'art-icon-team', private: 'art-icon-lock' };
    ui.directorSays(this, this.c.dialogues.director.openData);
    this.vote = ui.dilemma(this, { id: 'openData', ...d, options: d.options.map((o) => ({ ...o, icon: icons[o.id] })) }, (i) => {
      const opt = d.options[i];
      state.results.dilemmas.openData = opt.id;
      logEvent(`Ciencia abierta: ${opt.label} (+${opt.points}).`);
      this.vote = null;
      this.phase = 'done';
      ui.directorSays(this, `${opt.label}.`, 'happy');
      ui.button(this, 800, 455, 'Terminar la misión ▸', () => this.onKey('Enter'), { w: 270, color: '#4f9e78' });
    });
  }

  onKey(k) {
    if (this.vote && this.vote.key(k)) return;
    if (this.phase === 'done') { if (k === 'Enter' || k === ' ') this.scene.start('EndingScene'); return; }
    if (this.phase !== 'choose') return;
    const n = this.list.length;
    if (!n && (k === 'Enter' || k === ' ')) { this.send(); return; }
    if ((k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ArrowUp' || k === 'w' || k === 'W') && n) { this.index = (this.index + n - 1) % n; this.drawTiles(); say(`${NAMES[this.list[this.index].type]}, ${this.list[this.index].value}`); }
    else if ((k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'ArrowDown' || k === 's' || k === 'S') && n) { this.index = (this.index + 1) % n; this.drawTiles(); say(`${NAMES[this.list[this.index].type]}, ${this.list[this.index].value}`); }
    else if (k === ' ') this.toggle();
    else if (k === 'v' || k === 'V') this.sortByValue();
    else if (k === 'Enter') this.send();
    else if (k === 'k' || k === 'K') {                 // skip: send the most valuable packets
      this.list = insertionSort(this.list, (a, b) => b.value - a.value);
      this.list.forEach((p, i) => { p.chosen = i < this.capacity; });
      this.drawTiles();
      this.send();
    }
  }
}
