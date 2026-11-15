// Screen 5 · Choose objective (+ 5b selected, 5c / 5d locked). The mentor asks at the top,
// "OBJECTIVE i / 3" centred, ONE card at a time with ◀ ▶ arrows and dots. Only HUNT FOR ANCIENT
// WATER is playable; NEXT stays disabled until it is selected. MY MISSION is always available.
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, panel, img, chip, dots } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { pixelIcon } from '../ui/icons.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const ICON = { water: 'water', surface: 'volcano', survive: 'sun' };

export default class ObjectiveScene extends Phaser.Scene {
  constructor() { super('ObjectiveScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar');
    chip(this, 228, 54, t('objective.chip'), { fill: 0xc8532a, color: S.white, size: 11 });
    // mentor question at the top (Figma "Mentor question" 160,80 960x118) with portrait
    panel(this, 180, 92, 822, 94, { fill: C.bubble, stroke: C.bubble, bw: 0 });
    txt(this, 194, 100, t('objective.question'), { font: 'title', size: 18, color: S.mentor });
    txt(this, 194, 126, t('objective.questionSub'), { size: 24, color: S.ink, wrap: 796 });
    panel(this, 1024, 98, 82, 82, { fill: C.portrait, stroke: C.white, bw: 4 });
    img(this, 1065, 140, 'mentor', { w: 72, h: 72 });
    this.counter = txt(this, 640, 222, '', { font: 'title', size: 24, color: S.gold, origin: 0.5 });
    txt(this, 640, 250, t('objective.inspired'), { size: 19, color: S.muted, origin: 0.5 });
    this.i = 0;
    this.list = content.objectives.objectives;
    this.selected = state.mission.objective;
    this.card = this.add.container(0, 0);
    this.prev = pxButton(this, 228, 438, 84, 60, '◀', () => this.move(-1), { size: 18 });
    this.nextArrow = pxButton(this, 968, 438, 84, 60, '▶', () => this.move(1), { size: 18 });
    this.nextBtn = pxButton(this, 1072, 642, 184, 60, t('common.next'), () => this.done(), { primary: true });
    this.status = txt(this, 1062, 560, '', { size: 21, color: S.green, wrap: 200 });
    this.onKey = (k) => {
      if (k === 'ArrowLeft') { this.move(-1); return true; }
      if (k === 'ArrowRight') { this.move(1); return true; }
      if (k === 'Enter' || k === ' ') { if (this.selected) this.done(); else this.select(); return true; }
      return false;
    };
    setup(this, data, { back: true, help: 'ObjectiveScene', missionButton: [912, 24] });
    this.draw();
  }

  move(d) { this.i = (this.i + d + this.list.length) % this.list.length; sfx(this, 'sfx-pickup'); this.draw(); }

  draw() {
    this.card.removeAll(true);
    if (this.selBtn) { const old = this.selBtn; old.destroy(); this.focusables = this.focusables.filter((f) => f !== old); }
    const o = this.list[this.i];
    const open = state.mission.unlocked.objectives.includes(o.id) && o.playable;
    const sel = this.selected === o.id;
    this.counter.setText(t('objective.counter', { i: this.i + 1, n: this.list.length }));
    const g = this.add.graphics();
    g.fillStyle(C.navy2, 1); g.fillRect(340, 272, 600, 417);
    g.lineStyle(sel ? 6 : 4, sel ? C.yellow : 0x5d6a9a, 1); g.strokeRect(340, 272, 600, 417);
    this.card.add(g);
    this.card.add(pixelIcon(this, ICON[o.id] || 'water', 372, 292, 64));
    this.card.add(txt(this, 448, 324, o.title, { font: 'title', size: 16, color: open ? S.green : S.muted, origin: [0, 0.5], wrap: 470 }));
    this.card.add(txt(this, 372, 368, o.text, { size: 26, wrap: 540 }));
    if (open) {
      this.card.add(txt(this, 372, 460, o.real.text, { size: 22, wrap: 540, color: S.blue }));
      this.card.add(txt(this, 372, 546, o.question.text, { size: 22, wrap: 540, color: S.gold }));
    } else {
      this.card.add(txt(this, 372, 470, o.focus, { size: 22, wrap: 540, color: S.blue }));
      this.card.add(pixelIcon(this, 'lock', 372, 540, 32));
      this.card.add(txt(this, 414, 544, o.locked, { size: 22, wrap: 500, color: S.gold }));
    }
    this.card.add(dots(this, 640, 674, this.list.length, this.i));
    this.selBtn = pxButton(this, 372, 608, 484, 58, open ? (sel ? t('objective.selected') : t('objective.select')) : t('objective.lockedBtn'), () => this.select(), { size: 16, disabled: !open });
    if (sel) this.selBtn.setPrimary(true);
    this.nextBtn.setDisabled(!this.selected);
    this.status.setText(this.selected ? t('objective.chosen') : '');
    say(`${t('objective.counter', { i: this.i + 1, n: this.list.length })}. ${o.title}. ${o.text} ${open ? '' : o.locked}`);
  }

  select() {
    const o = this.list[this.i];
    if (!o.playable || !state.mission.unlocked.objectives.includes(o.id)) { sfx(this, 'sfx-error'); say(o.locked || ''); return; }
    this.selected = o.id;
    sfx(this, 'sfx-place');
    this.draw();
    say(t('objective.chosen'));
  }

  done() {
    if (!this.selected) { sfx(this, 'sfx-error'); return; }
    state.mission.objective = this.selected;
    const o = this.list.find((x) => x.id === this.selected);
    logEvent(`Objective: ${o.title}.`, 'objective');
    go(this, 'SummaryScene', {}, { transition: 'fade' });
  }
}
