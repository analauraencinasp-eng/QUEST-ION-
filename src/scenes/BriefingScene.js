// Screen 8 · Build briefing (3 slides). The panel stays visible; the mentor talks in 3 slides and
// highlights 1) the 5 numbered stations, 2) BUDGET + MASS, 3) EARTH RESPONSIBILITY.
// The button becomes START BUILDING → Screen 9.
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, panel, mentorBar, dots, finishTyping, img } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { go } from '../router.js';
import { missionPath } from './SummaryScene.js';

export default class BriefingScene extends Phaser.Scene {
  constructor() { super('BriefingScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-hangar', { dim: 0.55 });
    txt(this, 640, 40, t('briefing.title'), { font: 'title', size: 30, color: S.gold, origin: 0.5, shadow: 4 });
    txt(this, 640, 74, t('briefing.sub'), { size: 24, origin: 0.5 });
    panel(this, 90, 100, 1100, 372, { fill: C.navy2, stroke: C.blueBorder, bw: 4, alpha: 0.96 });
    txt(this, 116, 122, t('briefing.know'), { font: 'title', size: 14, color: S.cyan });
    txt(this, 116, 150, t('briefing.k1'), { size: 25 });
    this.hl = this.add.graphics().setDepth(18);
    this.stationBoxes = [];
    content.stations.stations.forEach((st, i) => {
      const x = 116 + i * 212, y = 188;
      panel(this, x, y, 196, 126, { fill: C.blueCard, stroke: C.blueBorder, bw: 3 });
      this.add.rectangle(x + 12, y + 14, 30, 30, C.gold).setOrigin(0);
      txt(this, x + 27, y + 30, String(st.n), { font: 'title', size: 14, color: S.navy, origin: 0.5 });
      txt(this, x + 52, y + 16, st.name, { font: 'title', size: 10, wrap: 136 });
      txt(this, x + 12, y + 80, st.tag, { size: 20, color: S.muted, wrap: 176, lineSpacing: -2 });
      if (i < 4) txt(this, x + 198, y + 50, '->', { size: 18, color: S.gold });
      this.stationBoxes.push([x, y, 196, 126]);
    });
    txt(this, 116, 326, t('briefing.k2'), { size: 25 });
    this.meterBoxes = [];
    [['budget', 'icon-coin'], ['mass', 'icon-weight'], ['earth', 'icon-earth']].forEach(([k, icon], i) => {
      const x = 116 + i * 354, y = 362;
      panel(this, x, y, 336, 92, { fill: C.blueCard, stroke: C.blueBorder, bw: 3 });
      img(this, x + 34, y + 48, icon, { w: 40, h: 40 });
      txt(this, x + 66, y + 16, t(`briefing.${k}`), { font: 'title', size: 12, color: S.gold });
      txt(this, x + 66, y + 40, t(`briefing.${k}D`), { size: 22, wrap: 256 });
      this.meterBoxes.push([x, y, 336, 92]);
    });
    missionPath(this, 492, 2);
    this.i = 0;
    this.mentor = mentorBar(this, 104, 524, 860, 168, '', { portrait: 168, size: 26 });
    this.btn = pxButton(this, 990, 620, 266, 60, t('common.next'), () => this.next(), { primary: true, size: 16 });
    this.onKey = (k) => { if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { this.next(); return true; } return false; };
    setup(this, data, { back: true, help: 'BriefingScene' });
    this.show();
  }

  show() {
    const lines = t('briefing.slides');
    if (this.dotG) this.dotG.destroy();
    this.dotG = dots(this, 1123, 600, 3, this.i, { past: true, size: 12 });
    this.mentor.setTitle(`MENTOR ${this.i + 1}/3`);
    this.mentor.set(lines[this.i], { lineId: `briefing${this.i + 1}` });
    this.hl.clear(); this.hl.lineStyle(5, C.yellow, 1);
    const boxes = this.i === 0 ? this.stationBoxes : this.i === 1 ? this.meterBoxes.slice(0, 2) : this.meterBoxes.slice(2);
    for (const [x, y, w, h] of boxes) this.hl.strokeRect(x - 4, y - 4, w + 8, h + 8);
    this.btn.setLabel(this.i === 2 ? t('briefing.startBuilding') : t('common.next'));
  }

  next() {
    if (finishTyping(this.mentor.body)) return;
    if (this.i < 2) { this.i++; this.show(); return; }
    go(this, 'WorkshopScene', {}, { transition: 'dither' });
  }
}
