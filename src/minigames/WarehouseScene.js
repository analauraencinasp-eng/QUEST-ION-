// Screen 11a · Warehouse storage (walkable, 14 instrument tables) — post-it "11a warehouse flow":
// walk to a table → [E] INSPECT → instrument card (11 / 11b) → quick question → table marked [x].
// Team decision: the EXIT opens when, for EACH of the 5 science requirements, at least one instrument that
// helps with it has been inspected (= its question answered). Then 11a2 → assembly (11c).
// The HUD meters change with the kit: every packed instrument adds cost + mass and draws energy (simulated).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, img, panel, mentorBar } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { makeHud } from '../ui/hud.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { computeMeters, requirementsCovered } from '../rules.js';
import { sfx } from '../audio.js';
import { say, sayHover } from '../a11y.js';

const START = { x: 96, y: 404 };                    // entry door, left end of the pink corridor
const SPEED = 240;
const AREA = { x0: 40, x1: 1240, y0: 330, y1: 478 }; // walkable band: the corridor and the floor next to the tables
const EXIT = { x: 1196, y0: 370, y1: 440 };

export default class WarehouseScene extends Phaser.Scene {
  constructor() { super('WarehouseScene'); }

  create(data) {
    fresh(this);
    this.leaving = false; this.target = null; this.lastPrompt = null; this.hoverT = null;
    const mi = state.mission;
    mi.meters = computeMeters(mi);
    this.add.rectangle(0, 0, W, H, 0x1b2233).setOrigin(0);
    img(this, 0, 0, 'bg-warehouse', { origin: 0, w: W, h: H });
    // title chip (Figma 415,114)
    panel(this, 412, 108, 456, 40, { fill: 0x0b0f26, stroke: C.cyan, bw: 3, depth: 20 });
    txt(this, 432, 128, t('warehouse.title'), { font: 'title', size: 12, origin: [0, 0.5], depth: 21 });
    txt(this, 852, 128, t('warehouse.sub'), { font: 'title', size: 8, color: S.gold, origin: [1, 0.5], depth: 21 });
    // progress (inspected + requirements covered + kit)
    panel(this, 24, 108, 372, 40, { fill: 0x0b0f26, stroke: C.white, bw: 3, depth: 20 });
    this.progress = txt(this, 40, 128, '', { font: 'title', size: 9, origin: [0, 0.5], depth: 21 });
    this.reqBoxes = this.add.graphics().setDepth(21);
    // tables: 7 on top, 7 below (Figma order = instruments.json order)
    this.tables = content.instruments.instruments.map((ins, i) => this.drawTable(ins, i));
    // exit door (right end of the corridor)
    this.door = this.add.rectangle(1244, 372, 36, 72, 0x1a1f3a).setOrigin(0).setDepth(3);
    this.doorLabel = txt(this, 1180, 352, '', { font: 'title', size: 9, color: S.navy, origin: [0.5, 0.5], depth: 31 });
    this.doorBg = this.add.rectangle(1180, 352, 10, 24, C.gold).setDepth(30);
    // player
    const pos = mi.warehousePos || START;
    this.player = this.add.container(pos.x, pos.y).setDepth(12);
    const sprite = mi.role === 'engineer' || !mi.role ? img(this, 0, 0, 'player-engineer', {}) : img(this, 0, 0, mi.role, { w: 104, h: 133 });
    this.sprite = sprite;
    this.player.add(sprite);
    this.player.add(txt(this, 0, -84, `P1 · ${(content.roles.roles.find((r) => r.id === mi.role) || { name: 'ENGINEER' }).name}`, { font: 'title', size: 9, color: S.gold, origin: 0.5 }));
    // HUD + mentor
    this.hud = makeHud(this, { ...mi.meters });
    this.mentor = mentorBar(this, 660, 606, 596, 106, '', { portrait: 100, size: 22, depth: 40 });
    this.prompt = txt(this, 0, 0, '', { font: 'title', size: 10, color: S.navy, origin: 0.5, depth: 41 });
    this.promptBg = this.add.rectangle(0, 0, 10, 24, C.white).setStrokeStyle(2, 0x1a1f3a).setDepth(40).setVisible(false);
    // keys
    this.held = {};
    this.input.keyboard.on('keyup', (e) => { this.held[e.key.toLowerCase()] = false; });
    this.onKey = (k) => {
      const lk = k.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(lk)) { this.held[lk] = true; return true; }
      if (lk === 'e' || k === 'Enter' || k === ' ') { this.interact(); return true; }
      return false;
    };
    // click a table = walk there and open it; click the floor = walk there
    this.input.on('pointerdown', (p) => {
      if (this.modals.length || this.leaving) return;
      if ((this.input.hitTestPointer(p) || []).some((g) => g._a11yInteractive)) return;
      const tb = this.tableAt(p.x, p.y);
      if (tb) { this.target = { x: tb.stand.x, y: tb.stand.y, use: tb }; return; }
      this.target = { x: Phaser.Math.Clamp(p.x, AREA.x0, AREA.x1), y: Phaser.Math.Clamp(p.y, AREA.y0, AREA.y1) };
    });
    this.input.on('pointermove', (p) => {
      if (this.modals.length) return;
      const tb = this.tableAt(p.x, p.y);
      if (tb && tb !== this.hoverT) sayHover(this.tableSpeech(tb));
      this.hoverT = tb || null;
    });
    this.refresh();
    setup(this, data, { back: true, backPos: [104, 648, 148, 52], help: 'WarehouseScene', helpPos: [24, 640] });
    const cov = requirementsCovered(mi.instruments.inspected);
    this.mentor.set(cov.ok ? t('warehouse.allDone') : (cov.inspectedCount ? t('warehouse.need', { n: cov.count }) : t('warehouse.mentor')));
  }

  drawTable(ins, i) {
    const row = i < 7 ? 0 : 1, col = i % 7;
    const cx = 104 + col * 179;
    const cy = row === 0 ? 262 : 528;
    const art = img(this, cx, cy, ins.table, { w: 150, h: 116, depth: row === 0 ? 4 : 14 });
    const ly = row === 0 ? 196 : 460;
    const label = txt(this, cx, ly, ins.name, { font: 'title', size: 7, color: S.navy, origin: 0.5, depth: 16, wrap: 150, align: 'center' });
    const lbg = this.add.rectangle(cx, ly, Math.min(160, label.width + 12), label.height + 8, C.white).setStrokeStyle(2, 0x1a1f3a).setDepth(15);
    const badge = txt(this, cx, cy + 46, '', { font: 'title', size: 8, color: S.navy, origin: 0.5, depth: 17 });
    const badgeBg = this.add.rectangle(cx, cy + 46, 10, 20, C.green).setStrokeStyle(2, C.white).setDepth(16).setVisible(false);
    const ring = this.add.graphics().setDepth(16);
    return { ins, art, label, lbg, badge, badgeBg, ring, cx, cy, row, box: [cx - 80, cy - 70, 160, 130], stand: { x: cx, y: row === 0 ? 352 : 456 } };
  }

  tableAt(x, y) { return this.tables.find((tb) => x >= tb.box[0] && x <= tb.box[0] + tb.box[2] && y >= tb.box[1] && y <= tb.box[1] + tb.box[3]); }

  tableSpeech(tb) {
    const ins = state.mission.instruments;
    const st = ins.inspected[tb.ins.id] ? 'inspected' : 'not inspected yet';
    const kit = ins.kit.includes(tb.ins.id) ? ', in your kit' : '';
    return `${tb.ins.name} table, ${st}${kit}. Click it to walk there and open its card, or walk to it and press E.`;
  }

  refresh() {
    const mi = state.mission, ins = mi.instruments;
    const cov = requirementsCovered(ins.inspected);
    this.progress.setText(`${t('warehouse.inspected', { n: cov.inspectedCount })} · ${t('warehouse.kit', { n: ins.kit.length })} · REQ`);
    this.reqBoxes.clear();
    const bx = this.progress.x + this.progress.width + 8;
    cov.covered.forEach((ok, i) => {
      this.reqBoxes.fillStyle(ok ? C.green : 0x2a3358, 1); this.reqBoxes.fillRect(bx + i * 14, 121, 11, 14);
      this.reqBoxes.lineStyle(2, C.white, 1); this.reqBoxes.strokeRect(bx + i * 14, 121, 11, 14);
    });
    for (const tb of this.tables) {
      const done = !!ins.inspected[tb.ins.id], packed = ins.kit.includes(tb.ins.id);
      const label = packed ? t('warehouse.packed') : done ? '✓ INSPECTED' : '';
      tb.badge.setText(label);
      tb.badgeBg.setVisible(!!label).setSize(tb.badge.width + 12, 20).setFillStyle(packed ? C.gold : C.green);
      tb.badgeBg.setOrigin(0.5);
    }
    const open = cov.ok;
    this.doorLabel.setText(open ? t('warehouse.exit') : t('warehouse.exitLocked', { n: cov.count }));
    this.doorBg.setSize(this.doorLabel.width + 14, 24).setOrigin(0.5).setFillStyle(open ? C.gold : 0x8a93c8);
    this.door.setStrokeStyle(3, open ? C.gold : 0x5d6680);
    this.hud.refresh(mi.meters);
  }

  update(time, delta) {
    if (this.modals.length || this.leaving) return;
    const dt = delta / 1000, h = this.held;
    let vx = 0, vy = 0;
    if (h.arrowleft || h.a) vx -= 1; if (h.arrowright || h.d) vx += 1;
    if (h.arrowup || h.w) vy -= 1; if (h.arrowdown || h.s) vy += 1;
    if (!vx && !vy && this.target) {
      const dx = this.target.x - this.player.x, dy = this.target.y - this.player.y, d = Math.hypot(dx, dy);
      if (d > 8) { vx = dx / d; vy = dy / d; } else this.arrive();
    } else if (vx || vy) this.target = null;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      this.player.x = Phaser.Math.Clamp(this.player.x + (vx / len) * SPEED * dt, AREA.x0, AREA.x1);
      this.player.y = Phaser.Math.Clamp(this.player.y + (vy / len) * SPEED * dt, AREA.y0, AREA.y1);
      state.mission.warehousePos = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      this.sprite.y = Math.sin(time / 70) * 3;
      if (vx && this.sprite.setFlipX) this.sprite.setFlipX(vx < 0);
    }
    this.checkProximity();
  }

  nearest() {
    let best = null, bd = 1e9;
    for (const tb of this.tables) { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, tb.stand.x, tb.stand.y); if (d < bd) { bd = d; best = tb; } }
    return bd < 95 ? best : null;
  }

  checkProximity() {
    const cov = requirementsCovered(state.mission.instruments.inspected);
    if (cov.ok && this.player.x >= EXIT.x && this.player.y >= EXIT.y0 && this.player.y <= EXIT.y1) { this.leave(); return; }
    const tb = this.nearest();
    for (const x of this.tables) { x.ring.clear(); }
    if (tb) {
      tb.ring.lineStyle(4, C.yellow, 1); tb.ring.strokeRect(tb.box[0], tb.box[1], tb.box[2], tb.box[3]);
      const label = t('warehouse.inspect', { NAME: tb.ins.name });
      const py = this.player.y - 118;
      this.prompt.setText(label);
      const px = Phaser.Math.Clamp(this.player.x, this.prompt.width / 2 + 14, W - this.prompt.width / 2 - 14);
      this.prompt.setPosition(px, py);
      this.promptBg.setPosition(px, py).setSize(this.prompt.width + 16, 26).setOrigin(0.5).setVisible(true);
      if (this.lastPrompt !== label) { this.lastPrompt = label; say(`You are at the ${tb.ins.name} table. Press E, or Enter, to inspect it.`); }
    } else { this.prompt.setText(''); this.promptBg.setVisible(false); this.lastPrompt = null; }
  }

  arrive() {
    const tg = this.target; this.target = null;
    if (tg && tg.use) this.open(tg.use);
  }

  interact() { const tb = this.nearest(); if (tb) this.open(tb); }

  open(tb) {
    sfx(this, 'sfx-pickup');
    go(this, 'InstrumentScene', { inst: tb.ins.id });
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    logEvent(`Left the warehouse with ${state.mission.instruments.kit.length} instruments in the kit.`, 'instruments');
    go(this, 'NextUpScene', { id: '11a2', next: 'AssemblyScene' }, { transition: 'dither' });
  }
}
