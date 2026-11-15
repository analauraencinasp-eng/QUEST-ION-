// hud.js — the 4 meters at the top of the workshop / warehouse (Figma "HUD · BUDGET / MASS / ENERGY /
// EARTH RESP."): icon box + bar + value. flash() lights a meter (used by the Graph+BFS domino effect).
import { C, S } from './theme.js';
import { txt, img, bar } from './widgets.js';
import { t, content } from '../content.js';

export function makeHud(scene, meters) {
  const caps = content.stations.caps;
  const defs = [
    { k: 'budget', label: t('workshop.budget'), icon: 'icon-coin', col: C.gold, frac: () => meters.budget / caps.budget, val: () => `$${meters.budget.toLocaleString('en-US')} / $${caps.budget.toLocaleString('en-US')}` },
    { k: 'mass', label: t('workshop.mass'), icon: 'icon-weight', col: 0xd0d4dc, frac: () => meters.mass / caps.mass, val: () => `${meters.mass.toLocaleString('en-US')}kg / ${caps.mass.toLocaleString('en-US')}kg` },
    { k: 'energy', label: t('workshop.energy'), icon: 'icon-bolt', col: C.green, frac: () => meters.energy / 100, val: () => `${meters.energy}%` },
    { k: 'earth', label: t('workshop.earth'), icon: 'icon-earth', col: C.cyan, frac: () => meters.responsibility / 100, val: () => `${meters.responsibility}%` }
  ];
  const items = {};
  defs.forEach((d, i) => {
    const x = 24 + i * 288, y = 8;
    scene.add.rectangle(x, y + 16, 48, 48, C.navy).setOrigin(0).setStrokeStyle(3, C.white).setDepth(30);
    img(scene, x + 24, y + 40, d.icon, { w: 34, h: 34, depth: 31 });
    txt(scene, x + 140, y + 4, d.label, { font: 'title', size: 11, origin: [0.5, 0], depth: 31 }).setShadow(2, 2, '#000', 0, false, true);
    const b = bar(scene, x + 56, y + 26, 164, 26, d.frac(), d.col, { depth: 30 });
    const v = txt(scene, x + 140, y + 58, d.val(), { size: 20, origin: [0.5, 0], color: S.gold, depth: 31 }).setShadow(2, 2, '#000', 0, false, true);
    const glow = scene.add.rectangle(x - 4, y + 12, 228, 72).setOrigin(0).setStrokeStyle(4, C.yellow).setDepth(32).setVisible(false);
    items[d.k] = { d, b, v, glow };
  });
  return {
    refresh(m) {
      Object.assign(meters, m);
      for (const it of Object.values(items)) { const over = it.d.frac() > 1; it.b.set(it.d.frac(), over ? C.red : it.d.col); it.v.setText(it.d.val()); }
    },
    flash(key, delay = 0) {
      const it = items[key]; if (!it) return;
      scene.time.delayedCall(delay, () => {
        it.glow.setVisible(true);
        scene.time.delayedCall(700, () => it.glow.setVisible(false));
      });
    }
  };
}
