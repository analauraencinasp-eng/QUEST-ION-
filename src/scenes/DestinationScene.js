// Screen 4 · Choose destination (+ 4b Planet info). Same solar-system row with planet names.
// Hover: dashed ring + tooltip. Only Mars (level 1) is open; the others show a padlock and
// "Complete the Mars mission to unlock". Click → info panel with the screen behind dimmed.
import { C, S } from '../ui/theme.js';
import { fresh, txt, bg, img, hotspot, mentorBar, panel, chip } from '../ui/widgets.js';
import { setup, openModal, mButton, mText } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

export default class DestinationScene extends Phaser.Scene {
  constructor() { super('DestinationScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar');
    txt(this, 640, 60, t('destination.title'), { font: 'title', size: 30, color: S.gold, origin: 0.5, shadow: 4 });
    txt(this, 640, 94, t('destination.sub'), { size: 24, origin: 0.5 });
    this.ring = this.add.graphics().setDepth(12);
    this.tip = txt(this, 0, 0, '', { font: 'title', size: 11, color: S.navy, origin: 0.5 }).setDepth(14);
    this.tipBg = this.add.rectangle(0, 0, 10, 24, C.gold).setDepth(13).setVisible(false);
    const unlocked = state.mission.unlocked.planets;
    for (const p of content.planets.planets) {
      const cx = p.x + p.size / 2, cy = p.y + p.size / 2;
      const open = unlocked.includes(p.id);
      txt(this, cx, 452 + (p.size > 100 ? 0 : 0), p.name, { font: 'title', size: 11, color: open ? S.gold : S.muted, origin: 0.5 });
      if (!open) img(this, cx, cy, 'icon-lock', { w: 24, h: 28, depth: 11 });
      hotspot(this, p.x, p.y, p.size, p.size, `${p.name}. ${open ? t('destination.hover') : t('destination.locked')}`, () => this.open(p), {
        onFocus: () => this.hover(p, open), onBlur: () => this.unhover()
      });
    }
    this.mentor = mentorBar(this, 216, 556, 1040, 136, t('destination.mentor'), { portrait: 136 });
    this.onKey = (k) => {
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        const list = content.planets.planets; const i = Math.max(0, list.indexOf(this.cur));
        this.cur = list[(i + (k === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
        this.hover(this.cur, unlocked.includes(this.cur.id)); return true;
      }
      if ((k === 'Enter' || k === ' ') && this.cur) { this.open(this.cur); return true; }
      return false;
    };
    this.cur = content.planets.planets.find((p) => p.id === 'mars');
    setup(this, data, { back: true, help: 'DestinationScene' });
  }

  hover(p, open) {
    this.cur = p;
    const cx = p.x + p.size / 2, cy = p.y + p.size / 2, r = p.size / 2 + 14;
    this.ring.clear(); this.ring.lineStyle(3, open ? C.gold : C.grey, 1);
    for (let a = 0; a < 360; a += 20) { const a0 = a * Math.PI / 180, a1 = (a + 10) * Math.PI / 180; this.ring.beginPath(); this.ring.arc(cx, cy, r, a0, a1); this.ring.strokePath(); }
    const label = open ? t('destination.hover') : t('destination.locked');
    this.tip.setText(label).setPosition(cx, p.y - 30);
    this.tipBg.setPosition(cx, p.y - 30).setSize(this.tip.width + 20, 26).setFillStyle(open ? C.gold : C.grey).setVisible(true);
    this.tipBg.setOrigin(0.5);
  }

  unhover() { this.ring.clear(); this.tip.setText(''); this.tipBg.setVisible(false); }

  open(p) {
    sfx(this, 'sfx-pickup');
    const open = state.mission.unlocked.planets.includes(p.id);
    const md = openModal(this, '', { x: 126, y: 124, w: 1028, h: 472, stroke: C.white, fill: C.navy2 });
    if (!open || !p.facts) {
      mText(this, md, 640, 230, p.name, { font: 'title', size: 30, color: S.gold, origin: 0.5 });
      md.add(img(this, 640, 330, 'icon-lock', { w: 48, h: 56 }));
      mText(this, md, 640, 420, t('destination.lockedLong'), { size: 28, origin: 0.5 });
      say(`${p.name}. ${t('destination.lockedLong')}`);
      return;
    }
    md.add(img(this, 126 + 40 + 110, 124 + 126 + 110, 'planet-mars-big', { w: 220, h: 220 }));
    const X = 126 + 288, Y = 124 + 34;
    mText(this, md, X, Y, p.name, { font: 'title', size: 30, color: S.gold });
    let cx = X;
    for (const f of p.facts) { const c = chip(this, cx, Y + 62, f.text, { fill: C.blueCard, color: S.white, size: 10, stroke: C.blueBorder, depth: md.depth }); md.objs.push(c); cx += c.w + 10; }
    mText(this, md, X, Y + 92, p.desc.text, { size: 25, wrap: 700 });
    mText(this, md, X, Y + 190, t('destination.questions'), { font: 'title', size: 12, color: S.cyan });
    mText(this, md, X, Y + 212, p.questions.map((q) => '• ' + q).join('\n'), { size: 24, wrap: 700 });
    mText(this, md, X, Y + 300, p.real.text, { size: 22, wrap: 700, color: S.muted });
    mButton(this, md, 126 + 1028 - 360 - 196, 124 + 472 - 80, 340, 56, t('destination.design'), () => {
      state.mission.planet = p.id;
      logEvent(`Destination: ${p.name} (level ${p.level}).`, 'destination');
      md.close();
      if (this.routeData && this.routeData.returnTo) go(this, this.routeData.returnTo);
      else go(this, 'NextUpScene', { id: '4c', next: 'ObjectiveScene' }, { transition: 'dither' });
    }, { primary: true, size: 14 });
    say(`${p.name}. ${p.facts.map((f) => f.text).join('. ')}. ${p.desc.text}`);
  }
}
