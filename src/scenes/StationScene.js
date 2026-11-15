// Screen 10 · Station card: component name as title, alternatives A/B/C top-right (B = MER HISTORICAL),
// blueprint image on the left, description in the centre, parts, SIMULATED GAME VALUES, advantage /
// limitation, and the effect on Earth ONLY if an official NASA source backs it (none for these parts).
import { C, S, W, H, minSize } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, chip, segMeter, hotspot, fit } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { back, backWith } from '../router.js';
import { stationById, wouldExceedBudget } from '../rules.js';
import { installPart } from '../minigames/WorkshopScene.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

export default class StationScene extends Phaser.Scene {
  constructor() { super('StationScene'); }

  create(data) {
    fresh(this);
    this.noAutoRead = true;          // this card speaks its own full description + keys (draw())
    this.st = stationById(data.station || 'structure');
    const cur = state.mission.stations[this.st.id];
    this.idx = Math.max(0, this.st.options.findIndex((o) => o.letter === (cur || 'B')));
    this.add.rectangle(0, 0, W, H, C.hangar).setOrigin(0);
    img(this, 0, 0, 'bg-hangar', { origin: 0, w: W, h: H });
    this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0);
    // "n STATION n"
    // 'n STATION n' label: the box is as wide as its text
    const stLabel = txt(this, 92, 62, t('station.title', { n: this.st.n }), { font: 'title', size: 15, color: S.gold, origin: [0, 0.5], depth: 2 });
    panel(this, 40, 40, stLabel.width + 66, 44, { fill: 0x0b0f26, stroke: C.gold, bw: 3 });
    this.add.rectangle(54, 50, 26, 24, C.gold).setOrigin(0).setDepth(1);
    txt(this, 67, 62, String(this.st.n), { font: 'title', size: 13, color: S.navy, origin: 0.5, depth: 2 });
    this.mentor = mentorBar(this, 584, 14, 592, 116, '', { portrait: 116, size: 24 });   // ends at x 1176, left of the menu button
    panel(this, 80, 144, 1120, 508, { fill: 0x10173a, stroke: 0xc8a24a, bw: 4 });
    this.cont = this.add.container(0, 0);
    this.backBtn = pxButton(this, 370, 662, 264, 48, t('station.workshop'), () => back(this));
    this.installBtn = pxButton(this, 666, 662, 244, 48, t('station.install'), () => this.install(), { primary: true });
    this.onKey = (k) => {
      if (k === 'ArrowLeft') { this.pick(this.idx - 1); return true; }
      if (k === 'ArrowRight') { this.pick(this.idx + 1); return true; }
      if (k === 'a' || k === 'b' || k === 'c' || k === 'A' || k === 'B' || k === 'C') { this.pick('abc'.indexOf(k.toLowerCase())); return true; }
      if (k === 'Enter') { this.install(); return true; }
      return false;
    };
    setup(this, data, { back: false, help: 'StationScene', esc: () => back(this) });   // ◀ WORKSHOP is the back button here
    this.draw();
  }

  pick(i) { this.idx = (i + 3) % 3; sfx(this, 'sfx-pickup'); this.draw(); }

  draw() {
    this.cont.removeAll(true);
    if (this.tabs) this.tabs.forEach((h) => { h.destroy(); this.focusables = this.focusables.filter((f) => f !== h); });
    const o = this.st.options[this.idx];
    const add = (obj) => { this.cont.add(obj); return obj; };
    // blueprint (left)
    const g = add(this.add.graphics());
    g.fillStyle(0x0b2a5c, 1); g.fillRect(96, 160, 340, 476);
    g.lineStyle(1, 0x2f5f9e, 0.7);
    for (let x = 96; x <= 436; x += 20) g.lineBetween(x, 160, x, 636);
    for (let y = 160; y <= 636; y += 20) g.lineBetween(96, y, 436, y);
    g.lineStyle(4, C.cyan, 1); g.strokeRect(98, 162, 336, 472);
    const bpTitle = add(txt(this, 108, 172, o.name, { font: 'title', size: 9, color: S.cyan, wrap: 316 }));
    const bpTop = Math.max(214, bpTitle.y + bpTitle.height + 16);   // labels start under the blueprint title
    const layer = add(img(this, 266, 390, `ship-${this.st.n}`, { scale: 1 }));
    if (layer.setCrop) { layer.setScale(0.56); }
    add(img(this, 266, 390, 'ship-0', { scale: 0.56 })).setAlpha(0.35);
    this.bpBottomLabels = [];
    this.st.blueprint.forEach((label, i) => {
      const y = i % 2 === 0 ? bpTop + i * 20 : 556 - (i - 1) * 20;
      const lb = add(txt(this, i % 2 === 0 ? 116 : 424, y, label, { size: 20, wrap: 300, color: S.cyan, origin: i % 2 === 0 ? [0, 0.5] : [1, 0.5] }));
      if (i % 2) this.bpBottomLabels.push(lb);
    });
    // header
    const hg = add(this.add.graphics()); hg.lineStyle(3, 0x8a93c8, 1); hg.strokeRect(452, 160, 732, 38);
    const optL = add(txt(this, 1170, 179, `◀ ${t('station.option', { L: o.letter })} ▶`, { font: 'title', size: 11, color: S.gold, origin: [1, 0.5] }));
    add(fit(txt(this, 466, 179, this.st.name, { font: 'title', size: 17, origin: [0, 0.5] }), 1170 - optL.width - 16 - 466));
    // tabs A / B / C (height follows the label, so larger text never spills out)
    this.tabs = [];
    let tx = 452, ty = 208, tabH = 22;
    this.st.options.forEach((op, i) => {
      const label = `${op.letter} · ${op.name}`;
      const tt = add(txt(this, 0, 0, label, { font: 'title', size: 9, color: i === this.idx ? S.navy : S.muted }));
      fit(tt, 600);
      const w = tt.width + 18; tabH = Math.max(tabH, tt.height + 8);
      if (tx + w > 1184) { tx = 452; ty += tabH + 6; }
      add(this.add.rectangle(tx, ty, w, tt.height + 8, i === this.idx ? C.gold : 0x0b0f26).setOrigin(0).setStrokeStyle(2, i === this.idx ? C.white : 0x8a93c8));
      tt.setPosition(tx + 9, ty + 4); this.cont.bringToTop(tt);
      this.tabs.push(hotspot(this, tx, ty, w, tt.height + 8, label, () => this.pick(i)));
      tx += w + 8;
    });
    // right column: every block starts under the previous one; boxes wrap their text
    const top = ty + tabH + 10, BOTTOM = 642;
    const name = add(txt(this, 452, 0, o.name, { font: 'title', size: 13, color: S.gold, wrap: 520 }));
    const kind = o.kind === 'mer' ? t('station.mer') : o.kind === 'alt' ? t('station.alt') : t('station.game');
    const ch = chip(this, 0, 0, kind, { fill: o.kind === 'mer' ? C.green : o.kind === 'alt' ? C.blueBorder : 0x5d6680, color: S.navy, size: 8 });
    add(ch.r); add(ch.t);
    const desc = add(txt(this, 452, 0, o.desc, { size: 22, wrap: 730 }));
    const partsBox = add(this.add.rectangle(452, 0, 732, 10, 0x0b0f26).setOrigin(0));
    const partsL = add(txt(this, 460, 0, t('station.parts'), { font: 'title', size: 8, color: S.muted }));
    const parts = add(txt(this, 460, 0, o.parts, { size: 20, color: S.cyan, wrap: 716 }));
    const valBox = add(this.add.rectangle(452, 0, 732, 10, 0x0b0f26).setOrigin(0));
    const valL = add(txt(this, 460, 0, `${t('station.values')}  ·  $${o.cost.toLocaleString('en-US')} · ${o.mass} kg · ${o.energy >= 0 ? '+' : ''}${o.energy}% energy`, { font: 'title', size: 8, color: S.muted, wrap: 716 }));
    const stats = o.stats.map(([label, level, word]) => ({
      l: add(txt(this, 460, 0, label, { font: 'title', size: 9 })),
      m: add(segMeter(this, 0, 0, level)),
      w: add(txt(this, 0, 0, word, { size: 20, color: S.gold }))
    }));
    const ag = add(this.add.graphics());
    const advL = add(txt(this, 464, 0, t('station.advantage'), { font: 'title', size: 8, color: S.green }));
    const adv = add(txt(this, 0, 0, o.advantage, { size: 20, wrap: 480 }));
    const limL = add(txt(this, 464, 0, t('station.limitation'), { font: 'title', size: 8, color: S.red }));
    const lim = add(txt(this, 0, 0, o.limitation, { size: 20, wrap: 480 }));
    // the Earth note sits in the free space at the bottom of the blueprint column (bottom-aligned)
    const earth = add(fit(txt(this, 110, 0, `${t('station.earth')}: ${o.earth_effect ? o.earth_effect.text : t('station.noEarth')}`, { size: 18, color: S.text, wrap: 312 }), 312, 120));
    earth.setY(628 - earth.height);
    this.bpBottomLabels.forEach((lb, k) => lb.setY(earth.y - 16 - k * 26));
    const layout = () => {
      let y = top;
      name.setY(y);
      ch.r.setPosition(Math.min(452 + name.width + 12, 1184 - ch.w), y + name.height / 2);
      ch.t.setPosition(ch.r.x + 8, ch.r.y - ch.t.height / 2 + 1);
      y += name.height + 6;
      desc.setY(y); y += desc.height + 8;
      partsBox.setY(y); partsL.setY(y + 4); parts.setY(partsL.y + partsL.height + 2);
      partsBox.setSize(732, parts.y + parts.height + 4 - y); y += partsBox.height + 8;
      valBox.setY(y); valL.setY(y + 4);
      let sy = valL.y + valL.height + 4;
      const labW = Math.max(...stats.map((r) => r.l.width)) + 16;
      for (const r of stats) {
        const rowH = Math.max(r.l.height, r.w.height, 12);
        r.l.setY(sy + (rowH - r.l.height) / 2);
        r.m.setPosition(460 + labW, sy + rowH / 2 - 5);
        r.w.setPosition(460 + labW + 104, sy + (rowH - r.w.height) / 2);
        sy += rowH + 2;
      }
      valBox.setSize(732, sy + 2 - y); y = sy + 10;
      const labCol = 464 + Math.max(advL.width, limL.width) + 14;
      adv.setX(labCol); lim.setX(labCol);
      adv.setWordWrapWidth(1176 - labCol); lim.setWordWrapWidth(1176 - labCol);
      const boxTop = y;
      adv.setY(y + 6); advL.setY(adv.y + 3);
      lim.setY(adv.y + adv.height + 4); limL.setY(lim.y + 3);
      const end = lim.y + lim.height + 8;
      ag.clear(); ag.fillStyle(0x23294a, 1); ag.fillRect(452, boxTop, 732, end - boxTop);
      ag.lineStyle(3, 0x8a93c8, 1); ag.strokeRect(452, boxTop, 732, end - boxTop);
      return end;
    };
    // if the column would pass the card's bottom, every body text shrinks one step (never under the floor)
    const bodies = [desc, parts, adv, lim, ...stats.map((r) => r.w)];
    for (let guard = 0; layout() > BOTTOM && guard < 20; guard++) {
      let shrunk = false;
      for (const b of bodies) { const sz = parseInt(b.style.fontSize, 10); if (sz > minSize('body')) { b.setFontSize(sz - 1); shrunk = true; } }
      if (!shrunk) break;
    }
    this.cont.sendToBack(ag); this.cont.sendToBack(valBox); this.cont.sendToBack(partsBox);
    // mentor + install state
    const line = o.kind === 'mer' ? t('station.mentorB') : o.kind === 'alt' ? t('station.mentorC') : t('station.mentorA');
    this.mentor.set(line, { silent: true });
    const installed = state.mission.stations[this.st.id];
    this.installBtn.setLabel(installed && installed !== o.letter ? t('station.reinstall') : installed === o.letter ? '✓ INSTALLED' : t('station.install'));
    say(`${this.st.name}. Option ${o.letter}: ${o.name}. ${kind}. ${o.desc} Advantage: ${o.advantage} Limitation: ${o.limitation}. ${line} Press A, B or C, or the left and right arrows, to compare the options. Press Enter, or click INSTALL, to install this part. Press Escape to go back to the workshop.`);
  }

  install() {
    const o = this.st.options[this.idx];
    if (wouldExceedBudget(state.mission, this.st.id, o.letter)) { sfx(this, 'sfx-error'); this.mentor.set(t('station.over')); return; }
    sfx(this, 'sfx-place');
    const res = installPart(this.st.id, o.letter);
    backWith(this, { _installed: this.st.id, _justFinished: res.done && res.first }, { fallback: 'WorkshopScene' });
  }
}
