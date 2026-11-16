// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// "NEXT UP" transition screens (Figma 4c, 7b, 9f, 11a2, 11e, 12.4, 13e-1.0, 13e, 14f-1.0, 15b, 16-0):
// dimmed background of the stage, cyan kicker, big gold title, one sentence and NEXT.
// Same pattern for all of them (post-it "How to implement"): data = { id, next, nextData, transition }.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, fitBlock } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { t, content } from '../content.js';
import { go } from '../router.js';
import { say } from '../a11y.js';

const BG = { solar: 'bg-solar', hangar: 'bg-hangar', bench: 'bg-bench', space: 'bg-space', sky: 'bg-sky', mars: 'bg-meridiani', warehouse: 'bg-warehouse' };

export default class NextUpScene extends Phaser.Scene {
  constructor() { super('NextUpScene'); }

  create(data) {
    fresh(this);
    const tr = (content.ui.transitions || {})[data.id] || { kicker: 'NEXT UP', title: '', text: '', bg: 'solar' };
    bg(this, BG[tr.bg] || 'bg-solar', { dim: 0.7 });
    // thin pixel grid like the Figma transition frames
    const g = this.add.graphics(); g.lineStyle(1, 0x1f3a6e, 0.35);
    for (let x = 0; x <= W; x += 16) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 16) g.lineBetween(0, y, W, y);
    // kicker → title → sentence, stacked (a 2-line title pushes the sentence down instead of overlapping)
    const kicker = txt(this, 640, 0, tr.kicker, { font: 'title', size: 16, color: S.cyan, origin: [0.5, 0] });
    const title = txt(this, 640, 0, tr.title, { font: 'title', size: 40, color: S.gold, origin: [0.5, 0], shadow: 4, align: 'center', wrap: 1100 });
    const text = txt(this, 640, 0, tr.text, { size: 26, origin: [0.5, 0], align: 'center', wrap: 820 });
    fitBlock([kicker, 14, title, 10, text], 200, 452, 0);
    pxButton(this, 548, 470, 184, 60, t('common.next'), () => this.next(data), { primary: true });
    this.onKey = (k) => { if (k === 'Enter' || k === ' ') { this.next(data); return true; } return false; };
    setup(this, data, { back: true, help: 'NextUpScene' });
    say(`${tr.kicker}. ${tr.title}. ${tr.text}`);
  }

  next(data) { go(this, data.next, data.nextData || {}, { transition: data.transition || 'dither' }); }
}
