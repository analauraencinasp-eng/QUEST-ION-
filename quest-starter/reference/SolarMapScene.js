// SolarMapScene.js — solar system map (owner: P5). Left/Right moves between planets.
// Each planet shows real data (distance from the Sun, orbital period; NASA). Jupiter opens
// the Juno card with "Start mission"; the others say "Coming soon".
// Reads content.planets. Writes nothing. Next: MissionControlScene.

import * as ui from './ui.js';
import { say } from './a11y.js';

export default class SolarMapScene extends Phaser.Scene {
  constructor() { super('SolarMapScene'); }

  create() {
    ui.freshScene(this, {});
    const c = ui.content(this);
    this.planets = c.planets;
    this.index = this.planets.findIndex((p) => p.mission);
    ui.background(this, 'art-solarsystem');
    ui.progressBar(this, 0);
    ui.helpHint(this);
    // labels drawn by code (the image has no text)
    this.planets.forEach((p) => ui.text(this, p.x, p.y + p.r + 10, p.name, { size: 16, origin: [0.5, 0], world: true }));
    this.ring = this.add.graphics();
    // every planet can be clicked (or tapped)
    this.planets.forEach((p, i) => {
      const z = this.add.zone(p.x, p.y, p.r * 2 + 24, p.r * 2 + 40).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => { if (this.index !== i) this.select(i - this.index); });
      z.on('pointerdown', () => { if (this.index !== i) this.select(i - this.index); else if (p.mission) this.go(); });
    });
    this.startBtn = ui.button(this, 800, 452, 'EMPEZAR MISIÓN ▸', () => this.go(), { w: 250, color: '#4f9e78' });
    this.cardBg = ui.panel(this, 40, 356, 620, 114);
    this.card = ui.text(this, 60, 366, '', { size: 16, wrap: 580 });
    this.action = ui.text(this, 60, 440, '', { size: 16, color: ui.color(this, 'interactive') });
    ui.directorSays(this, c.dialogues.director.map);
    this.select(0);
    ui.onKeys(this, (k) => {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.select(-1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.select(1);
      else if (k === 'Enter' || k === ' ') this.go();
      else if (k === 'Escape') this.scene.start('TitleScene');
    });
  }

  select(d) {
    this.index = (this.index + d + this.planets.length) % this.planets.length;
    const p = this.planets[this.index], c = ui.content(this);
    this.ring.clear();
    this.ring.lineStyle(4, ui.hexNum(ui.color(this, 'interactive')), 1);
    this.ring.strokeCircle(p.x, p.y, p.r + 8);
    const facts = `${p.name} · ${p.distanceAU} UA del Sol · 1 órbita = ${p.period}`;
    if (this.startBtn) this.startBtn.setEnabled(!!p.mission, 'por ahora solo Júpiter tiene misión');
    if (p.mission) {
      this.card.setText(`${facts}\n${c.junoCard}`);
      this.action.setText('');
      this.action.setColor(ui.color(this, 'interactive'));
    } else {
      this.card.setText(`${facts}\nTodavía no hay misión aquí.`);
      this.action.setText('✕ Próximamente');
      this.action.setColor('#8a84a8');
    }
    ui.directorSays(this, p.mission ? 'Júpiter tiene nuestra misión. Presiona Enter para empezar.' : `${p.name}: próximamente. Nuestra misión está en Júpiter.`);
    say(`${this.card.text} ${this.action.text}`.replace(/\n/g, ' '));
  }

  go() {
    const p = this.planets[this.index];
    if (!p.mission) { ui.sfx(this, 'sfx-error'); ui.directorSays(this, `${p.name} llegará pronto. Usa las flechas para elegir Júpiter.`); return; }
    ui.sfx(this, 'sfx-pickup');
    this.scene.start('MissionControlScene');
  }
}
