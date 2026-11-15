// Screen 7 · Mission summary: ONLY what the player chose so far (mode, crew, destination, objective),
// each tile with a visual and "✎ change" back to that screen. Mission path: done (green), current
// (gold), next (grey). CONTINUE → 7b transition → Screen 8.
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, img, link, mentorBar, chip, flow, fitBlock } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { pixelIcon } from '../ui/icons.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { go } from '../router.js';

export function missionPath(scene, y, current) {
  const steps = t('summary.path');
  // build the chips first, then space them so the whole row fits between x=100 and x=1180 (text size L too)
  const chips = steps.map((s, i) => {
    const done = i < current, cur = i === current;
    const label = done ? `[x] ${s}` : cur ? `> ${s}` : s;
    return chip(scene, 0, y, label, { fill: done ? 0x0f8a5f : cur ? C.gold : 0x2a3358, color: done ? S.white : cur ? S.navy : S.muted, size: 10, stroke: done || cur ? C.white : 0x5d6680 });
  });
  const total = chips.reduce((sum, c) => sum + c.w, 0);
  const gap = Math.max(14, Math.min(40, (1080 - total) / (steps.length - 1)));
  let x = Math.max(100, 640 - (total + gap * (steps.length - 1)) / 2);
  chips.forEach((c, i) => {
    c.r.setX(x); c.t.setX(x + 8);
    x += c.w;
    if (i < steps.length - 1) {
      if (gap >= 30) txt(scene, x + gap / 2, y, '->', { size: 20, color: S.muted, origin: 0.5, noRead: true });
      x += gap;
    }
  });
}

export default class SummaryScene extends Phaser.Scene {
  constructor() { super('SummaryScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar');
    txt(this, 640, 42, t('summary.title'), { font: 'title', size: 32, color: S.gold, origin: 0.5, shadow: 4 });
    txt(this, 640, 78, t('summary.sub'), { size: 24, origin: 0.5 });
    const mi = state.mission;
    const role = content.roles.roles.find((r) => r.id === mi.role) || content.roles.roles[1];
    const planet = content.planets.planets.find((p) => p.id === mi.planet) || { name: 'MARS' };
    const obj = content.objectives.objectives.find((o) => o.id === mi.objective) || content.objectives.objectives[0];
    const tiles = [
      { tag: t('summary.mode'), col: 0xd16fa0, name: mi.mode === '4p' ? '4 PLAYERS' : '1 PLAYER', sub: t('summary.sameKeyboard'), icon: mi.mode === '4p' ? 'team' : 'gamepad', back: 'TitleScene' },
      { tag: t('summary.crew'), col: 0x56a8e8, name: role.name, sub: '', art: role.art, back: 'RoleScene' },
      { tag: t('summary.destination'), col: 0xe0662a, name: planet.name, sub: 'Level 1 · 1.5 AU from the Sun', art: 'planet-mars-big', back: 'DestinationScene' },
      { tag: t('summary.objective'), col: 0x3fae5a, name: obj.title, sub: 'Inspired by Spirit & Opportunity', icon: 'water', back: 'ObjectiveScene' }
    ];
    tiles.forEach((tl, i) => {
      const x = 90 + i * 280, y = 110, w = 260, h = 357;
      const g = this.add.graphics();
      g.fillStyle(C.navy2, 0.96); g.fillRect(x, y, w, h); g.lineStyle(4, tl.col, 1); g.strokeRect(x + 2, y + 2, w - 4, h - 4);
      chip(this, x + w / 2, y + 30, tl.tag, { fill: tl.col, color: S.navy, size: 10, origin: 0.5 });
      this.add.rectangle(x + 55, y + 51, 150, 150, 0x2a2440).setOrigin(0);
      if (tl.icon) pixelIcon(this, tl.icon, x + 75, y + 70, 110);
      else {
        const im = img(this, x + w / 2, y + 51, tl.art, { origin: [0.5, 0] });
        if (tl.art === 'planet-mars-big') im.setDisplaySize(140, 140).setY(y + 56);
        else if (im.setCrop) { im.setCrop(0, 0, 240, 240); im.setScale(150 / 240); im.setY(y + 51); }   // head to waist, fills the 150×150 frame like the Figma
      }
      // name + description + change link: stacked, then centred in the space under the picture
      const name = txt(this, x + w / 2, 0, tl.name, { font: 'title', size: 15, origin: [0.5, 0], align: 'center', wrap: w - 20 });
      const sub = txt(this, x + w / 2, 0, tl.sub, { size: 21, origin: [0.5, 0], align: 'center', wrap: w - 30, color: S.muted });
      const ch = link(this, x + w / 2, 0, t('summary.change'), () => go(this, tl.back, { returnTo: 'SummaryScene' }), { origin: [0.5, 0] });
      const top = y + 212, bottom = y + h - 14;
      const used = fitBlock([name, sub, ch.text], top, bottom, 8) - top;
      const end = flow([name, sub, ch.text], top + Math.max(0, (bottom - top - used) / 2), 8);
      if (ch.underline) ch.underline.setY(end - 2);
    });
    missionPath(this, 497, 2);
    mentorBar(this, 223, 548, 600, 132, t('summary.mentor'), { portrait: 104 });
    pxButton(this, 830, 588, 264, 60, t('summary.continue'), () => this.next(), { primary: true });
    this.onKey = (k) => { if (k === 'Enter') { this.next(); return true; } return false; };
    setup(this, data, { back: true, help: 'SummaryScene' });
  }

  next() { go(this, 'NextUpScene', { id: '7b', next: 'BriefingScene' }, { transition: 'dither' }); }
}
