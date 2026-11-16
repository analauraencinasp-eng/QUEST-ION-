// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 11c · Build your rover (assembly mini-game). Drag instruments from the kit tray onto the rover:
// MAST (1), BODY (1), ARM TURRET (4), DECK (2). A tool only fits where it really mounts (instruments.json).
// Team decision: NO time limit (the Figma's 45 s timer was removed).
// Z = undo the last placement: a hand-written STACK of placements. Enter / FINISH ▶ = results (11d).
// Keyboard / no-drag option: click a tool in the tray, then click a free spot.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, fit } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go, back } from '../router.js';
import { instrumentById, slotAccepts, assemblyScore } from '../rules.js';
import Stack from '../ds/Stack.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const MOUNT_NAME = { mast: 'MAST', body: 'BODY', arm: 'ARM TURRET', deck: 'DECK' };

export default class AssemblyScene extends Phaser.Scene {
  constructor() { super('AssemblyScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    this.slots = content.instruments.slots;
    this.undoStack = new Stack();
    // a placement of an instrument that is no longer in the kit is dropped
    for (const [slot, id] of Object.entries(mi.instruments.placed)) if (!mi.instruments.kit.includes(id)) delete mi.instruments.placed[slot];
    this.selected = null;
    this.add.rectangle(0, 0, W, H, 0x1b2233).setOrigin(0);
    img(this, 0, 0, 'bg-bench', { origin: 0, w: W, h: H });
    txt(this, 24, 30, t('assembly.title'), { font: 'title', size: 26, color: S.gold, origin: [0, 0.5], shadow: 3 });
    txt(this, 24, 62, t('assembly.sub'), { size: 22, origin: [0, 0.5] });
    // requirements panel (left)
    panel(this, 26, 92, 318, 340, { fill: 0x0b0f26, stroke: 0xc8a24a, bw: 4 });
    txt(this, 42, 108, t('assembly.reqs'), { font: 'title', size: 9, color: S.gold });
    this.reqTexts = content.instruments.requirements.map((r, i) => txt(this, 42, 134 + i * 50, '', { size: 21, wrap: 290, lineSpacing: 0 }));
    txt(this, 42, 382, t('assembly.tip'), { size: 18, color: S.cyan, wrap: 290, lineSpacing: 0 });
    this.mentor = mentorBar(this, 26, 446, 344, 100, t('assembly.mentor'), { portrait: 76, size: 20, silent: true });
    // rover + slots
    img(this, 341, 80, 'rover-base', { origin: 0 });
    txt(this, 796, 102, t('assembly.mast'), { font: 'title', size: 8, color: S.cyan, origin: [0, 0.5] });
    txt(this, 608, 318, t('assembly.body'), { font: 'title', size: 8, color: S.cyan, origin: 0.5 });
    txt(this, 900, 236, t('assembly.arm'), { font: 'title', size: 8, color: S.cyan });
    txt(this, 380, 242, t('assembly.deck'), { font: 'title', size: 8, color: S.cyan });
    txt(this, 640, 556, t('assembly.simpl'), { size: 19, color: S.muted, origin: 0.5 });
    this.slotGfx = this.add.graphics().setDepth(5);
    this.slotObjs = [];
    this.slotZones = this.slots.map((s) => {
      const z = this.add.zone(s.x, s.y, s.w, s.h).setOrigin(0)
        .setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, s.w, s.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, dropZone: true, useHandCursor: true });
      z._a11yInteractive = true;
      z.slotId = s.id;
      z.on('pointerdown', () => this.clickSlot(s));
      return z;
    });
    // tray
    panel(this, 18, 574, 1244, 80, { fill: 0x10173a, stroke: 0xc8a24a, bw: 4 });
    this.trayObjs = [];
    // buttons
    pxButton(this, 104, 664, 240, 48, t('assembly.backWh'), () => back(this), { size: 12 });
    pxButton(this, 360, 664, 200, 48, 'Z · UNDO', () => this.undo(), { size: 12 });
    this.finishBtn = pxButton(this, 1040, 664, 216, 48, t('assembly.finish'), () => this.finish(), { primary: true, size: 14 });
    this.hint = txt(this, 580, 688, t('assembly.undo'), { size: 19, color: S.muted, origin: [0, 0.5] });
    // drag & drop (a short click without moving = select, so drag starts only after 8 px)
    this.input.dragDistanceThreshold = 8;
    this.input.on('dragstart', (p, obj) => { obj.setDepth(60); this.selected = null; });
    this.input.on('drag', (p, obj, x, y) => { obj.x = x; obj.y = y; });
    this.input.on('drop', (p, obj, zone) => { obj._dropped = true; this.place(obj.instId, this.slots.find((s) => s.id === zone.slotId)); });
    this.input.on('dragend', (p, obj) => { if (!obj._dropped) this.drawTray(); obj._dropped = false; });
    this.onKey = (k) => {
      if (k === 'z' || k === 'Z') { this.undo(); return true; }
      if (k === 'Enter') { this.finish(); return true; }
      return false;
    };
    setup(this, data, { back: false, help: 'AssemblyScene', helpPos: [24, 656], esc: () => back(this) });
    this.redraw();
    if (!mi.instruments.kit.length) { this.mentor.set(t('assembly.empty')); this.finishBtn.setDisabled(true); }
    else say(`${t('assembly.title')}. ${t('assembly.sub')} ${t('assembly.mentor')} Drag each tool from the tray to a spot on the rover, or click a tool and then click a spot. Press Z to undo and Enter to finish.`);
  }

  redraw() { this.drawSlots(); this.drawTray(); this.drawReqs(); }

  drawSlots() {
    const placed = state.mission.instruments.placed;
    this.slotObjs.forEach((o) => o.destroy()); this.slotObjs = [];
    const g = this.slotGfx; g.clear();
    for (const s of this.slots) {
      const id = placed[s.id];
      const ok = this.selected && slotAccepts(s, instrumentById(this.selected)) && !id;
      g.fillStyle(id ? 0x10173a : 0x0b0f26, 0.85); g.fillRect(s.x, s.y, s.w, s.h);
      g.lineStyle(3, id ? C.green : ok ? C.yellow : C.cyan, 1);
      if (id) g.strokeRect(s.x, s.y, s.w, s.h);
      else for (let i = 0; i < s.w; i += 12) { g.lineBetween(s.x + i, s.y, s.x + Math.min(i + 6, s.w), s.y); g.lineBetween(s.x + i, s.y + s.h, s.x + Math.min(i + 6, s.w), s.y + s.h); }
      if (!id) for (let j = 0; j < s.h; j += 12) { g.lineBetween(s.x, s.y + j, s.x, s.y + Math.min(j + 6, s.h)); g.lineBetween(s.x + s.w, s.y + j, s.x + s.w, s.y + Math.min(j + 6, s.h)); }
      if (id) {
        const ins = instrumentById(id);
        this.slotObjs.push(img(this, s.x + s.w / 2, s.y + s.h / 2 - 6, ins.table, { w: 52, h: 40, depth: 6 }));
        this.slotObjs.push(fit(txt(this, s.x + s.w / 2, s.y + s.h - 8, ins.short, { font: 'title', size: 6, origin: 0.5, depth: 7 }), s.w - 6));
      } else this.slotObjs.push(txt(this, s.x + s.w / 2, s.y + s.h / 2, '+', { font: 'title', size: 14, color: S.cyan, origin: 0.5, depth: 6 }));
    }
  }

  drawTray() {
    const mi = state.mission;
    this.trayObjs.forEach((o) => { if (o.item) this.focusables = this.focusables.filter((f) => f !== o.item); o.destroy(); });
    this.trayObjs = [];
    const placedIds = Object.values(mi.instruments.placed);
    const items = mi.instruments.kit.filter((id) => !placedIds.includes(id));
    const n = Math.max(1, items.length), w = Math.min(112, Math.floor(1210 / n) - 8);
    items.forEach((id, i) => {
      const ins = instrumentById(id);
      const x = 30 + i * (w + 8) + w / 2, y = 614;
      const c = this.add.container(x, y).setDepth(20).setSize(w, 64);
      const sel = this.selected === id;
      const box = this.add.rectangle(0, 0, w, 64, sel ? 0x3a3110 : 0x0b0f26).setStrokeStyle(3, sel ? C.yellow : 0x8a93c8);
      const art = img(this, 0, -8, ins.table, { w: Math.min(56, w - 10), h: 38 });
      const lb = fit(txt(this, 0, 22, ins.short, { font: 'title', size: 6, origin: 0.5 }), w - 6);
      c.add([box, art, lb]);
      c.setInteractive({ draggable: true, useHandCursor: true });
      c._a11yInteractive = true;
      c.instId = id;
      c.on('pointerup', (p) => { if (p.getDistance() < 6) this.select(id); });
      c.on('pointerover', () => box.setStrokeStyle(3, C.yellow));
      c.on('pointerout', () => { if (this.selected !== id) box.setStrokeStyle(3, 0x8a93c8); });
      this.input.setDraggable(c);
      // keyboard focus ring: Tab to a tool, Enter selects it
      c.item = { label: `${ins.name}, mounts on the ${MOUNT_NAME[ins.mount]}`, kind: 'option', modal: null, disabled: false,
        alive: () => !!c.scene, focus: () => box.setStrokeStyle(3, C.yellow), blur: () => box.setStrokeStyle(3, sel ? C.yellow : 0x8a93c8), press: () => this.select(id) };
      this.focusables.push(c.item);
      this.trayObjs.push(c);
    });
    if (!items.length && mi.instruments.kit.length) this.trayObjs.push(txt(this, 640, 614, 'All your tools are installed. Press FINISH ▶ (or Z to undo).', { size: 22, color: S.green, origin: 0.5, depth: 20 }));
  }

  drawReqs() {
    const res = assemblyScore(state.mission.instruments.placed);
    content.instruments.requirements.forEach((r, i) => {
      const ok = res.reqs[i];
      this.reqTexts[i].setText(`${ok ? '[x]' : '[ ]'} ${r.n}. ${r.text}`).setColor(ok ? S.green : S.text);
      fit(this.reqTexts[i], 290, 48, 14);
    });
  }

  select(id) {
    this.selected = this.selected === id ? null : id;
    sfx(this, 'sfx-pickup');
    this.drawSlots(); this.drawTray();
    if (this.selected) { const ins = instrumentById(id); say(`${ins.name} selected. It mounts on the ${MOUNT_NAME[ins.mount]}. Click a free spot there.`); }
  }

  clickSlot(s) {
    const placed = state.mission.instruments.placed;
    if (this.selected) { this.place(this.selected, s); return; }
    if (placed[s.id]) { const ins = instrumentById(placed[s.id]); say(`${s.label}: ${ins.name}. Press Z to undo the last placement.`); }
    else say(`${s.label}: free spot for a tool that mounts on the ${MOUNT_NAME[s.mount]}.`);
  }

  place(instId, slot) {
    const mi = state.mission, ins = instrumentById(instId);
    if (!ins || !slot) { this.drawTray(); return; }
    if (mi.instruments.placed[slot.id]) { sfx(this, 'sfx-error'); this.mentor.set(t('assembly.full')); this.drawTray(); return; }
    if (!slotAccepts(slot, ins)) {
      sfx(this, 'sfx-error');
      this.mentor.set(t('assembly.wrongSlot', { NAME: ins.name, MOUNT: MOUNT_NAME[ins.mount] }));
      this.drawTray();
      return;
    }
    mi.instruments.placed[slot.id] = instId;
    this.undoStack.push({ slot: slot.id, inst: instId });
    this.selected = null;
    sfx(this, 'sfx-place');
    this.mentor.set(t('assembly.placed', { NAME: ins.name, SLOT: slot.label }));
    this.redraw();
  }

  undo() {
    if (this.undoStack.isEmpty()) { sfx(this, 'sfx-error'); say('Nothing to undo.'); return; }
    const last = this.undoStack.pop();
    delete state.mission.instruments.placed[last.slot];
    state.mission.instruments.undoCount += 1;
    sfx(this, 'sfx-pickup');
    const ins = instrumentById(last.inst);
    this.mentor.set(`Undo: ${ins.name} is back in the tray.`);
    this.redraw();
  }

  finish() {
    const mi = state.mission;
    const res = assemblyScore(mi.instruments.placed);
    mi.instruments.results = res;
    logEvent(`Built the rover: ${res.count} tools, ${res.reqs.filter(Boolean).length}/5 requirements, capability ${res.capability}%.`, 'instruments');
    go(this, 'AssemblyResultsScene', {}, { transition: 'fade' });
  }
}
