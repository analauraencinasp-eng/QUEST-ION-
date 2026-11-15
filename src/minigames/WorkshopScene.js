// Screen 9 · Workshop (walkable VAB, 0/5 → 5/5) + 9b locked hint, 9c "assembled" message,
// 9d pink path to the door, 9e ask the mentor, 9f transition to the warehouse.
// The ship starts as a skeleton and is built LAYER BY LAYER (Figma "Ship · 1 structure" … "5 attitude").
// 5 numbered stations IN ORDER: station n is locked until n-1 is done.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel } from '../ui/widgets.js';
import { setup, openModal, mButton, mText } from '../ui/chrome.js';
import { makeHud } from '../ui/hud.js';
import { content, t } from '../content.js';
import { state, STATION_IDS, logEvent } from '../state.js';
import { go } from '../router.js';
import { canUseStation, nextStation, computeMeters, stationById, stationOption, affectedMeters } from '../rules.js';
import { playMusic, sfx } from '../audio.js';
import { say } from '../a11y.js';

const DOOR = { x: 1180, y: 560, w: 100, h: 100 };
const BLOCKERS = [[312, 262, 656, 270]];          // the ship pad (players walk around it)
const SPEED = 230;

export default class WorkshopScene extends Phaser.Scene {
  constructor() { super('WorkshopScene'); }

  create(data) {
    fresh(this);
    playMusic('workshop');
    const mi = state.mission;
    this.add.rectangle(0, 0, W, H, C.hangar).setOrigin(0);
    img(this, 0, 0, 'bg-hangar', { origin: 0, w: W, h: H });
    img(this, 448, 24, 'window-mty', { origin: 0 });
    img(this, 224, 160, 'crane', { origin: 0 });
    // ship layers
    this.layers = [img(this, 360, 246, 'ship-0', { origin: 0 })];
    STATION_IDS.forEach((id, i) => { this.layers.push(img(this, 360, 246, `ship-${i + 1}`, { origin: 0 }).setVisible(!!mi.stations[id])); });
    // parts progress (Figma 487,174)
    this.parts = txt(this, 640, 187, '', { font: 'title', size: 11, color: S.gold, origin: 0.5, depth: 20 });
    this.add.rectangle(487, 174, 307, 26, 0x0b0f26).setOrigin(0).setStrokeStyle(3, C.gold).setDepth(19);
    // stations
    this.stations = content.stations.stations.map((st) => this.drawStation(st));
    // pink path (9d) — drawn only when all 5 are done
    this.path = this.add.graphics().setDepth(2);
    // mentor NPC
    this.npc = img(this, 462, 561, 'mentor-npc', { origin: [0.5, 0.5], depth: 8 });
    const nameTag = txt(this, 462, 457, 'MENTOR', { font: 'title', size: 9, color: S.navy, origin: 0.5, depth: 10 });
    this.add.rectangle(462, 457, nameTag.width + 12, 22, C.bubble).setStrokeStyle(2, 0x1a1f3a).setDepth(9);
    this.ask = txt(this, 462, 483, t('workshop.ask'), { font: 'title', size: 9, color: S.navy, origin: 0.5, depth: 10 });
    this.askBg = this.add.rectangle(462, 483, this.ask.width + 14, 22, C.gold).setDepth(9);
    // player
    const pos = mi.workshopPos || { x: 336, y: 330 };
    this.player = this.add.container(pos.x, pos.y).setDepth(10);
    const sprite = mi.role === 'engineer' || !mi.role ? img(this, 0, 0, 'player-engineer', {}) : img(this, 0, 0, mi.role, { w: 104, h: 133 });
    this.player.add(sprite);
    this.player.add(txt(this, 0, -84, `P1 · ${(content.roles.roles.find((r) => r.id === mi.role) || { name: 'ENGINEER' }).name}`, { font: 'title', size: 9, color: S.gold, origin: 0.5 }));
    this.bang = txt(this, 0, -106, '!', { font: 'title', size: 14, color: S.navy, origin: 0.5 });
    this.bangBg = this.add.rectangle(0, -106, 26, 26, 0xffffff).setStrokeStyle(2, 0x1a1f3a);
    this.player.add([this.bangBg, this.bang]);
    this.sprite = sprite;
    // HUD + hint bar
    this.meters = { ...mi.meters };
    this.hud = makeHud(this, this.meters);
    panel(this, 104, 640, 976, 68, { fill: 0x0b0f26, stroke: C.white, bw: 4, depth: 25 });
    this.hint = txt(this, 130, 674, '', { size: 26, origin: [0, 0.5], depth: 26 });
    this.prompt = txt(this, 0, 0, '', { font: 'title', size: 11, color: S.navy, origin: 0.5, depth: 40 });
    this.promptBg = this.add.rectangle(0, 0, 10, 24, C.gold).setDepth(39).setVisible(false);
    this.lockPanel = null;
    this.held = {};
    this.input.keyboard.on('keyup', (e) => { this.held[e.key.toLowerCase()] = false; });
    this.onKey = (k) => {
      const lk = k.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(lk)) { this.held[lk] = true; return true; }
      if (lk === 'e' || k === 'Enter' || k === ' ') { this.interact(); return true; }
      if (lk === 'q') { this.askMentor(); return true; }
      return false;
    };
    // click on a station / the mentor = walk there and use it
    this.input.on('pointerdown', (p) => { if (!this.modals.length) this.target = { x: p.x, y: Math.max(300, p.y) }; });
    this.refresh();
    setup(this, data, { back: true, backPos: [1096, 648, 148, 52], help: 'WorkshopScene', helpPos: [24, 640] });
    if (data && data._installed) this.domino(data._installed);
    if (data && data._justFinished) this.assembled();
    else say(this.hint.text);
  }

  drawStation(st) {
    const [x, y, w, h] = st.pos;
    const art = img(this, x, y, st.art, { origin: 0, depth: 4 });
    const state_ = this.add.graphics().setDepth(5);
    const lock = img(this, x + w / 2, y + h / 2, 'icon-lock', { w: 36, h: 42, depth: 6 });
    const done = txt(this, x + w - 4, y + h - 6, t('workshop.done'), { font: 'title', size: 9, color: S.white, origin: [1, 1], depth: 7 });
    const doneBg = this.add.rectangle(x + w, y + h, done.width + 12, 22, 0x0f8a5f).setOrigin(1, 1).setStrokeStyle(2, C.white).setDepth(6);
    // tag "n NAME" (Figma Tag · n)
    const tag = txt(this, st.tagPos[0] + 34, st.tagPos[1] + 15, st.name, { font: 'title', size: 9, color: S.navy, origin: [0, 0.5], depth: 8, wrap: 170 });
    this.add.rectangle(st.tagPos[0], st.tagPos[1], tag.width + 44, 30, C.bubble).setOrigin(0).setStrokeStyle(3, 0x1a1f3a).setDepth(7);
    this.add.rectangle(st.tagPos[0] + 6, st.tagPos[1] + 5, 20, 20, [0x56a8e8, C.gold, 0x56c8e8, 0x0f8a5f, 0xd16fa0][st.n - 1]).setOrigin(0).setDepth(8);
    txt(this, st.tagPos[0] + 16, st.tagPos[1] + 15, String(st.n), { font: 'title', size: 10, color: S.navy, origin: 0.5, depth: 9 });
    return { st, art, g: state_, lock, done, doneBg, cx: x + w / 2, cy: y + h + 10, x, y, w, h };
  }

  refresh() {
    const mi = state.mission;
    const n = mi.installOrder.length;
    this.parts.setText(`${t('workshop.parts', { n })}  ${'■'.repeat(n)}${'□'.repeat(5 - n)}`);
    for (const s of this.stations) {
      const done = !!mi.stations[s.st.id], usable = canUseStation(mi, s.st.id);
      s.g.clear();
      if (!done && !usable) { s.g.fillStyle(0x000000, 0.45); s.g.fillRect(s.x, s.y, s.w, s.h); }
      if (!done && usable) {                                   // active: dashed gold border
        s.g.lineStyle(4, C.gold, 1);
        for (let i = 0; i < s.w; i += 16) { s.g.lineBetween(s.x + i, s.y, s.x + Math.min(i + 8, s.w), s.y); s.g.lineBetween(s.x + i, s.y + s.h, s.x + Math.min(i + 8, s.w), s.y + s.h); }
        for (let j = 0; j < s.h; j += 16) { s.g.lineBetween(s.x, s.y + j, s.x, s.y + Math.min(j + 8, s.h)); s.g.lineBetween(s.x + s.w, s.y + j, s.x + s.w, s.y + Math.min(j + 8, s.h)); }
      }
      s.lock.setVisible(!done && !usable);
      s.done.setVisible(done); s.doneBg.setVisible(done);
    }
    STATION_IDS.forEach((id, i) => this.layers[i + 1].setVisible(!!mi.stations[id]));
    const nxt = nextStation(mi);
    this.path.clear();
    if (!nxt) {
      this.path.fillStyle(0xff6fb5, 0.85);
      for (let x = 980; x < 1200; x += 28) this.path.fillRect(x, 572, 18, 12);
      for (let y = 470; y < 572; y += 28) this.path.fillRect(980, y, 12, 18);
      if (!this.doorLabel) {
        this.doorLabel = txt(this, 1230, 540, t('workshop.warehouse'), { font: 'title', size: 11, color: S.navy, origin: 0.5, depth: 30 });
        this.add.rectangle(1230, 540, this.doorLabel.width + 14, 26, 0xff6fb5).setDepth(29);
        this.add.rectangle(1244, 560, 36, 80, 0x1a1f3a).setOrigin(0).setStrokeStyle(3, 0xff6fb5).setDepth(3);
      }
    }
    const st = nxt ? stationById(nxt) : null;
    this.hint.setText(!nxt ? t('workshop.hintDone') : nxt === 'structure' ? t('workshop.hintStart') : t('workshop.hintNext', { n: st.n, NAME: st.name }));
    this.bang.setVisible(!!nxt); this.bangBg.setVisible(!!nxt);
  }

  domino(id) {
    // Graph + BFS: the meters affected by the new part light up in order of distance
    const map = { budget: 'budget', mass: 'mass', energy: 'energy', fuel: 'mass' };
    for (const v of affectedMeters(id)) if (map[v.vertex]) this.hud.flash(map[v.vertex], v.depth * 220);
  }

  update(time, delta) {
    if (this.modals.length || this.leaving) return;
    const dt = delta / 1000;
    let vx = 0, vy = 0;
    const h = this.held;
    if (h.arrowleft || h.a) vx -= 1; if (h.arrowright || h.d) vx += 1;
    if (h.arrowup || h.w) vy -= 1; if (h.arrowdown || h.s) vy += 1;
    if (!vx && !vy && this.target) {
      const dx = this.target.x - this.player.x, dy = this.target.y - this.player.y;
      if (Math.hypot(dx, dy) > 8) { vx = dx / Math.hypot(dx, dy); vy = dy / Math.hypot(dx, dy); } else this.target = null;
    } else if (vx || vy) this.target = null;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      this.moveTo(this.player.x + (vx / len) * SPEED * dt, this.player.y + (vy / len) * SPEED * dt);
      this.sprite.y = Math.sin(time / 70) * 3;
      if (vx) this.sprite.setFlipX && this.sprite.setFlipX(vx < 0);
    }
    this.checkProximity();
  }

  moveTo(x, y) {
    x = Phaser.Math.Clamp(x, 40, 1240); y = Phaser.Math.Clamp(y, 300, 620);
    const inside = (px, py) => BLOCKERS.some(([bx, by, bw, bh]) => px > bx && px < bx + bw && py > by && py < by + bh);
    if (!inside(x, this.player.y)) this.player.x = x;
    if (!inside(this.player.x, y)) this.player.y = y;
    state.mission.workshopPos = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
  }

  nearest() {
    let best = null, bd = 1e9;
    for (const s of this.stations) { const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.cx, Math.min(s.cy, 600)); if (d < bd) { bd = d; best = s; } }
    return bd < 150 ? best : null;
  }

  checkProximity() {
    const mi = state.mission;
    const s = this.nearest();
    const nearMentor = Phaser.Math.Distance.Between(this.player.x, this.player.y, 462, 561) < 130;
    const nearDoor = !nextStation(mi) && this.player.x > DOOR.x - 40 && this.player.y > DOOR.y - 40;
    if (nearDoor) { this.leave(); return; }
    let label = null;
    if (s) {
      const done = !!mi.stations[s.st.id], usable = canUseStation(mi, s.st.id);
      label = usable ? t('workshop.pressE', { NAME: s.st.name }) : `🔒 ${s.st.name}`;
      if (!usable && !done) this.showLock(s); else this.hideLock();
    } else { this.hideLock(); if (nearMentor) label = t('workshop.ask'); }
    if (label) {
      this.prompt.setText(label).setPosition(this.player.x, this.player.y - 150);
      this.promptBg.setPosition(this.player.x, this.player.y - 150).setSize(this.prompt.width + 16, 26).setOrigin(0.5).setVisible(true);
      if (this.lastPrompt !== label) { say(label); this.lastPrompt = label; }
    } else { this.prompt.setText(''); this.promptBg.setVisible(false); this.lastPrompt = null; }
  }

  // 9b · locked station hint: what the component is for
  showLock(s) {
    if (this.lockPanel && this.lockPanel.id === s.st.id) return;
    this.hideLock();
    const prev = STATION_IDS[STATION_IDS.indexOf(s.st.id) - 1];
    const prevN = prev ? stationById(prev).n : 1;
    const x = Phaser.Math.Clamp(s.x + s.w / 2 - 230, 20, 800), y = s.y > 400 ? s.y - 190 : s.y + s.h + 12;
    const objs = [
      panel(this, x, y, 460, 170, { fill: C.navy, stroke: C.gold, bw: 4, depth: 45, shadow: true }),
      txt(this, x + 16, y + 14, t('workshop.lockedTitle', { n: s.st.n, NAME: s.st.name }), { font: 'title', size: 11, color: S.gold, depth: 46, wrap: 430 }),
      txt(this, x + 16, y + 42, s.st.hint.text, { size: 21, depth: 46, wrap: 430 }),
      txt(this, x + 16, y + 140, t('workshop.hintLocked', { n: prevN }), { size: 22, color: S.red, depth: 46 })
    ];
    this.lockPanel = { id: s.st.id, objs };
    say(`${t('workshop.lockedTitle', { n: s.st.n, NAME: s.st.name })}. ${s.st.hint.text} ${t('workshop.hintLocked', { n: prevN })}`);
  }
  hideLock() { if (this.lockPanel) { this.lockPanel.objs.forEach((o) => o.destroy()); this.lockPanel = null; } }

  interact() {
    const s = this.nearest();
    if (s) {
      if (!canUseStation(state.mission, s.st.id)) { sfx(this, 'sfx-error'); return; }
      go(this, 'StationScene', { station: s.st.id });
      return;
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 462, 561) < 150) this.askMentor();
  }

  // 9e · ask the mentor (review choices)
  askMentor() {
    const mi = state.mission;
    const md = openModal(this, 'MENTOR', { w: 760, h: 470, x: 420, y: 120, fill: C.bubble, stroke: 0x1a1f3a });
    md.objs[2] && md.objs[2].setColor && md.objs[2].setColor(S.mentor);
    const nxt = nextStation(mi);
    const lines = [t('workshop.reviewIntro')];
    for (const id of mi.installOrder) { const o = stationOption(id, mi.stations[id]); const st = stationById(id); lines.push(`[x] ${st.n} ${st.name} - ${o.letter}: ${o.short} · $${o.cost.toLocaleString('en-US')} · ${o.mass} kg`); }
    if (!mi.installOrder.length) lines.push('(nothing installed yet)');
    const tip = content.stations.mentorTips[nxt || 'done'];
    const body = mText(this, md, 448, 176, '', { size: 24, color: S.ink, wrap: 700 });
    const show = (s) => { body.setText(s); say(s); };
    show(`${lines.join('\n')}\n\n${tip}`);
    mButton(this, md, 448, 420, 220, 48, t('workshop.review'), () => show(`${lines.join('\n')}\n\n${tip}`), { size: 10 });
    mButton(this, md, 680, 420, 220, 48, t('workshop.whatDoes'), () => { const st = stationById(nxt || 'attitude'); show(`${st.n}. ${st.name}: ${st.hint.text}`); }, { size: 10 });
    mButton(this, md, 912, 420, 220, 48, t('workshop.changePart'), () => {
      if (!mi.installOrder.length) { show('Install a part first.'); return; }
      md.close();
      this.changePart();
    }, { size: 10 });
    mButton(this, md, 448, 520, 180, 48, t('workshop.bye'), () => md.close(), { size: 10 });
  }

  changePart() {
    const mi = state.mission;
    const md = openModal(this, t('workshop.changePart'), { w: 640, h: 120 + mi.installOrder.length * 64 });
    mi.installOrder.forEach((id, i) => {
      const st = stationById(id);
      mButton(this, md, md.x + 28, md.y + 70 + i * 64, 400, 52, `${st.n}. ${st.name}`, () => { md.close(); go(this, 'StationScene', { station: id }); }, { size: 10 });
    });
  }

  // 9c · big message
  assembled() {
    sfx(this, 'sfx-launch');
    const md = openModal(this, '', { w: 760, h: 300, closeLabel: 'OK ▶', stroke: C.gold });
    mText(this, md, 640, md.y + 60, t('workshop.readyTitle'), { font: 'title', size: 18, color: S.green, origin: 0.5 });
    mText(this, md, 640, md.y + 110, t('workshop.assembled'), { font: 'title', size: 22, color: S.gold, origin: 0.5, align: 'center', wrap: 700 });
    mText(this, md, 640, md.y + 170, t('workshop.assembledSub'), { size: 26, origin: 0.5, align: 'center', wrap: 680 });
    say(`${t('workshop.assembled')}. ${t('workshop.assembledSub')}`);
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    logEvent('Walked to the warehouse.', 'build');
    go(this, 'NextUpScene', { id: '9f', next: 'WarehouseScene' }, { transition: 'dither' });
  }
}

// called by StationScene after INSTALL: recompute meters + log
export function installPart(stationId, letter) {
  const mi = state.mission;
  const first = !mi.stations[stationId];
  mi.stations[stationId] = letter;
  if (first) mi.installOrder.push(stationId);
  mi.meters = computeMeters(mi);
  const o = stationOption(stationId, letter), st = stationById(stationId);
  logEvent(`${first ? 'Installed' : 'Swapped'} station ${st.n} ${st.name}: option ${letter} (${o.short})${o.kind === 'mer' ? ' = MER historical' : ''}.`, 'build');
  return { first, done: mi.installOrder.length === 5 };
}
