// Screen 10 · Station card: component name as title, alternatives A/B/C top-right (B = MER HISTORICAL),
// blueprint image on the left, description in the centre, parts, SIMULATED GAME VALUES, advantage /
// limitation, and the effect on Earth ONLY if an official NASA source backs it (none for these parts).
import { C, S, W, H, fs } from '../ui/theme.js';
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
    panel(this, 40, 40, 194, 44, { fill: 0x0b0f26, stroke: C.gold, bw: 3 });
    this.add.rectangle(54, 50, 26, 24, C.gold).setOrigin(0);
    txt(this, 67, 62, String(this.st.n), { font: 'title', size: 13, color: S.navy, origin: 0.5 });
    txt(this, 92, 62, t('station.title', { n: this.st.n }), { font: 'title', size: 15, color: S.gold, origin: [0, 0.5] });
    this.mentor = mentorBar(this, 584, 14, 656, 116, '', { portrait: 116, size: 24 });
    panel(this, 80, 144, 1120, 472, { fill: 0x10173a, stroke: 0xc8a24a, bw: 4 });
    this.cont = this.add.container(0, 0);
    this.backBtn = pxButton(this, 370, 630, 264, 60, t('station.workshop'), () => back(this));
    this.installBtn = pxButton(this, 666, 630, 244, 60, t('station.install'), () => this.install(), { primary: true });
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
    g.fillStyle(0x0b2a5c, 1); g.fillRect(96, 160, 440, 440);
    g.lineStyle(1, 0x2f5f9e, 0.7);
    for (let x = 96; x <= 536; x += 20) g.lineBetween(x, 160, x, 600);
    for (let y = 160; y <= 600; y += 20) g.lineBetween(96, y, 536, y);
    g.lineStyle(4, C.cyan, 1); g.strokeRect(98, 162, 436, 436);
    add(txt(this, 108, 172, o.name, { font: 'title', size: 9, color: S.cyan, wrap: 400 }));
    const layer = add(img(this, 316, 390, `ship-${this.st.n}`, { scale: 1 }));
    if (layer.setCrop) { layer.setScale(0.78); }
    add(img(this, 316, 390, 'ship-0', { scale: 0.78 })).setAlpha(0.35);
    this.st.blueprint.forEach((label, i) => {
      const y = i % 2 === 0 ? 214 + i * 20 : 540 - (i - 1) * 20;
      add(txt(this, i % 2 === 0 ? 180 : 520, y, label, { size: 20, color: S.cyan, origin: i % 2 === 0 ? [0, 0.5] : [1, 0.5] }));
    });
    // header
    const hg = add(this.add.graphics()); hg.lineStyle(3, 0x8a93c8, 1); hg.strokeRect(552, 160, 632, 38);
    add(txt(this, 566, 179, this.st.name, { font: 'title', size: 17, origin: [0, 0.5] }));
    add(txt(this, 1170, 179, `◀ ${t('station.option', { L: o.letter })} ▶`, { font: 'title', size: 11, color: S.gold, origin: [1, 0.5] }));
    // tabs A / B / C
    this.tabs = [];
    let tx = 552, ty = 208;
    this.st.options.forEach((op, i) => {
      const label = `${op.letter} · ${op.name}`;
      const tt = add(txt(this, 0, 0, label, { font: 'title', size: 9, color: i === this.idx ? S.navy : S.muted }));
      const w = tt.width + 18;
      if (tx + w > 1184) { tx = 552; ty += 28; }
      add(this.add.rectangle(tx, ty, w, 22, i === this.idx ? C.gold : 0x0b0f26).setOrigin(0).setStrokeStyle(2, i === this.idx ? C.white : 0x8a93c8));
      tt.setPosition(tx + 9, ty + 5); this.cont.bringToTop(tt);
      this.tabs.push(hotspot(this, tx, ty, w, 22, label, () => this.pick(i)));
      tx += w + 8;
    });
    let y = ty + 34;
    const name = add(txt(this, 552, y, o.name, { font: 'title', size: 13, color: S.gold }));
    const kind = o.kind === 'mer' ? t('station.mer') : o.kind === 'alt' ? t('station.alt') : t('station.game');
    const ch = chip(this, 552 + name.width + 12, y + 7, kind, { fill: o.kind === 'mer' ? C.green : o.kind === 'alt' ? C.blueBorder : 0x5d6680, color: S.navy, size: 8 });
    add(ch.r); add(ch.t);
    y += 28;
    const desc = add(txt(this, 552, y, o.desc, { size: 22, wrap: 630 }));
    fit(desc, 630, 92);
    y += Math.min(desc.height, 92) + 8;
    add(this.add.rectangle(552, y, 632, 58, 0x0b0f26).setOrigin(0));
    add(txt(this, 560, y + 4, t('station.parts'), { font: 'title', size: 8, color: S.muted }));
    add(fit(txt(this, 560, y + 18, o.parts, { size: 20, color: S.cyan, wrap: 616 }), 616, 38));
    y += 66;
    add(this.add.rectangle(552, y, 632, 84, 0x0b0f26).setOrigin(0));
    add(txt(this, 560, y + 4, `${t('station.values')}  ·  $${o.cost.toLocaleString('en-US')} · ${o.mass} kg · ${o.energy >= 0 ? '+' : ''}${o.energy}% energy`, { font: 'title', size: 8, color: S.muted }));
    o.stats.forEach(([label, level, word], i) => {
      add(txt(this, 560, y + 20 + i * 20, label, { font: 'title', size: 9 }));
      add(segMeter(this, 690, y + 22 + i * 20, level));
      add(txt(this, 792, y + 18 + i * 20, word, { size: 20, color: S.gold }));
    });
    y += 92;
    // advantage / limitation / Earth effect: each line sits under the previous one, and the box fits them all
    const ag = add(this.add.graphics());
    const adv = add(txt(this, 668, 0, o.advantage, { size: 20, wrap: 506 }));
    const advL = add(txt(this, 564, 0, t('station.advantage'), { font: 'title', size: 8, color: S.green }));
    const lim = add(txt(this, 668, 0, o.limitation, { size: 20, wrap: 506 }));
    const limL = add(txt(this, 564, 0, t('station.limitation'), { font: 'title', size: 8, color: S.red }));
    const earth = add(txt(this, 564, 0, `${t('station.earth')}: ${o.earth_effect ? o.earth_effect.text : t('station.noEarth')}`, { size: 16, color: S.muted, wrap: 610 }));
    const BOTTOM = 612;                                    // the card's inner bottom edge
    const layout = () => {
      adv.setY(y + 6); advL.setY(adv.y + 4);
      lim.setY(adv.y + adv.height + 2); limL.setY(lim.y + 4);
      earth.setY(lim.y + lim.height + 4);
      return earth.y + earth.height + 6;
    };
    // the box grows with the text; if it would leave the card, shrink the font one step at a time
    let size = 20;
    while (layout() > BOTTOM && size > 15) {
      size -= 1;
      adv.setFontSize(fs(size)); lim.setFontSize(fs(size)); earth.setFontSize(fs(Math.max(14, size - 4)));
    }
    const boxH = Math.min(BOTTOM, Math.max(600, layout())) - y;
    ag.fillStyle(0x23294a, 1); ag.fillRect(552, y, 632, boxH); ag.lineStyle(3, 0x8a93c8, 1); ag.strokeRect(552, y, 632, boxH);
    this.cont.sendToBack(ag);
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
