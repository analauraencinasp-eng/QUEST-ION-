// TitleScene.js — title, Solo or Team (2-4 players) and the Accessibility settings menu (owner: P2).
// Reads: state.settings. Writes: state.mode, state.players, state.settings. Next: SolarMapScene.

import { state, resetState } from './state.js';
import { say, applySettings } from './a11y.js';
import * as ui from './ui.js';

const SETTINGS = [
  ['narration', 'Narración (lee los textos en voz alta)'],
  ['colorblind', 'Colores seguros para daltonismo y patrones'],
  ['highContrast', 'Alto contraste'],
  ['largeText', 'Texto grande (desactiva la pantalla dividida)'],
  ['noTimers', 'Sin cronómetros'],
  ['sharedCamera', 'Cámara siempre compartida (modo equipo)']
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create() {
    ui.freshScene(this, { menuObj: null, extra: [], page: 'main' });
    this.teamSize = Math.max(2, state.players || 2);
    applySettings();
    ui.background(this, 'art-solarsystem');
    this.add.rectangle(0, 0, 960, 540, 0x0d0c1c, 0.55).setOrigin(0);
    ui.text(this, 480, 56, 'MISIÓN ESPACIAL', { size: 30, title: true, color: ui.color(this, 'accent'), origin: [0.5, 0] });
    ui.text(this, 480, 156, 'Lo que construyes en la Tierra decide lo que puedes descubrir en el espacio.', { size: 16, origin: [0.5, 0] });
    ui.image(this, 100, 300, 'art-director', 128, 128);
    ui.image(this, 840, 300, 'art-rocket', 48, 144);
    ui.helpHint(this);
    this.showMain();
    ui.directorSays(this, ui.content(this).dialogues.director.title);
    ui.onKeys(this, (k) => this.onKey(k));
  }

  clearMenu() { if (this.menuObj) { this.menuObj.destroy(); this.menuObj = null; } (this.extra || []).forEach((o) => o.destroy()); this.extra = []; }

  showMain() {
    this.clearMenu();
    this.page = 'main';
    this.menuObj = ui.menu(this, 200, 206, [
      { label: 'Jugar solo', onPick: () => this.start('solo', 1) },
      { label: `Jugar en equipo: ${this.teamSize} jugadores (Izq/Der)`, onPick: () => this.start('team', this.teamSize) },
      { label: 'Accesibilidad', onPick: () => this.showSettings() }
    ], { width: 560, numbers: true });
    this.extra = [ui.text(this, 480, 330, 'Arriba/Abajo eligen · Enter empieza · Se juega con mouse o teclado', { size: 16, color: ui.color(this, 'muted'), origin: [0.5, 0] })];
  }

  showSettings() {
    this.clearMenu();
    this.page = 'settings';
    const items = SETTINGS.map(([key, label]) => ({ label: `${state.settings[key] ? '[✓] SÍ' : '[ ] NO'}  ${label}`, onPick: (i) => this.toggle(i) }));
    items.push({ label: 'Regresar', onPick: () => this.showMain() });
    this.menuObj = ui.menu(this, 150, 186, items, { width: 720, gap: state.settings.largeText ? 38 : 30, size: 16 });
    ui.directorSays(this, 'Presiona Enter para activar o desactivar. Esc regresa.');
  }

  toggle(i) {
    const [key, label] = SETTINGS[i];
    state.settings[key] = !state.settings[key];
    if (key === 'largeText' && state.settings.largeText) state.settings.sharedCamera = true;
    applySettings();
    say(`${label}: ${state.settings[key] ? 'activado' : 'desactivado'}`);
    // redraw so colors and sizes update everywhere, then reopen this page on the same option
    TitleScene.reopenSettings = i;
    this.scene.restart();
  }

  start(mode, players) {
    resetState();
    state.mode = mode;
    state.players = players;
    ui.sfx(this, 'sfx-pickup');
    this.showAvatars();
  }

  // choose your astronaut: they will build, launch and fly the mission with you
  showAvatars() {
    this.clearMenu();
    this.page = 'avatar';
    this.avatarIndex = (state.avatar || 1) - 1;
    const av = ui.content(this).avatars;
    this.extra.push(ui.panel(this, 110, 104, 740, 366, { depth: 110 }));
    this.extra.push(ui.text(this, 480, 116, 'ELIGE TU ASTRONAUTA', { size: 18, title: true, origin: [0.5, 0], color: ui.color(this, 'accent'), depth: 111 }));
    this.avatarFrames = av.map((a, i) => {
      const x = 210 + i * 180, y = 302;
      const frame = ui.track(this, this.add.rectangle(x, y, 164, 296, 0x201f38).setStrokeStyle(3, 0x4a4778), 111);
      const key = a.art && this.textures.exists(`art-role-${a.art}`) ? `art-role-${a.art}` : `art-player${a.id}-happy`;
      const src = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : { width: 1, height: 1 };
      const H = key.startsWith('art-role') ? 176 : 110;   // big characters: same art as the workshop
      const img = ui.image(this, x, y - 44, key, Math.round(H * src.width / src.height), H, { ui: true, depth: 112 });
      const name = ui.text(this, x, y + 74, a.name, { size: 16, title: true, origin: [0.5, 0], depth: 112 });
      this.extra.push(ui.text(this, x, y + 100, a.role === 'Director' ? 'desempata' : `${a.role === 'Engineer' ? 'Energía' : a.role === 'Scientist' ? 'Ciencia' : 'Comms'} ×2`, { size: 16, origin: [0.5, 0], depth: 112, color: '#b9b2d0' }));
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerover', () => { this.avatarIndex = i; this.drawAvatars(); });
      frame.on('pointerdown', () => { this.avatarIndex = i; this.pickAvatar(); });
      this.extra.push(frame, img, name);
      return frame;
    });
    ui.directorSays(this, state.mode === 'team' ? 'Jugador 1, elige tu astronauta. Tu equipo usa los demás.' : 'Elige tu astronauta: construirá y operará la misión contigo.');
    this.drawAvatars();
  }

  drawAvatars() {
    this.avatarFrames.forEach((f, i) => f.setStrokeStyle(i === this.avatarIndex ? 5 : 3, i === this.avatarIndex ? 0x56B4E9 : 0x4a4778));
    say(ui.content(this).avatars[this.avatarIndex].name);
  }

  pickAvatar() {
    state.avatar = this.avatarIndex + 1;
    ui.sfx(this, 'sfx-pickup');
    ui.burst(this, 210 + this.avatarIndex * 180, 300, 0xffd27a, 24);
    this.time.delayedCall(350, () => this.scene.start('SolarMapScene'));
  }

  onKey(k) {
    if (this.page === 'main' && (k === 'ArrowLeft' || k === 'ArrowRight') && this.menuObj.index === 1) {
      this.teamSize = Math.min(4, Math.max(2, this.teamSize + (k === 'ArrowRight' ? 1 : -1)));
      this.menuObj.rows[1].setText(`2) Jugar en equipo: ${this.teamSize} jugadores (Izq/Der)`);
      say(`${this.teamSize} jugadores`);
      return;
    }
    if (k === 'Escape' && this.page === 'settings') { this.showMain(); return; }
    if (this.page === 'avatar') {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { this.avatarIndex = (this.avatarIndex + 3) % 4; this.drawAvatars(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { this.avatarIndex = (this.avatarIndex + 1) % 4; this.drawAvatars(); }
      else if (k === 'Enter' || k === ' ') this.pickAvatar();
      else if (k === 'Escape') this.showMain();
      return;
    }
    this.menuObj.key(k);
  }

  update() {
    // after a restart caused by a toggle, come back to the settings page on the same option
    if (TitleScene.reopenSettings !== undefined && this.page === 'main') {
      const i = TitleScene.reopenSettings;
      TitleScene.reopenSettings = undefined;
      this.showSettings();
      this.menuObj.index = i;
      this.menuObj.refresh();
    }
  }
}
