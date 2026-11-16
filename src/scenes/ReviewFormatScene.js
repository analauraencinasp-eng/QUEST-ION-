// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 18 · Choose your review format. The player chooses HOW; the concepts never change.
// "YOUR LAST CHOICE" marks the format used last time (state.settings.lastReviewFormat, saved with the settings).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { t } from '../content.js';
import { state } from '../state.js';
import { saveSettings } from '../save.js';
import { go } from '../router.js';
import { pixelIcon } from '../ui/icons.js';
import { say } from '../a11y.js';
import { FORMATS } from '../review.js';
import { charBubble, FORMAT_LABEL } from '../ui/review_ui.js';

const ICON = { visual: 'camera', podcast: 'antenna', flashcards: 'lens', questions: 'gamepad', text: 'layers' };

export default class ReviewFormatScene extends Phaser.Scene {
  constructor() { super('ReviewFormatScene'); }

  create(data) {
    fresh(this);
    const rv = state.mission.review;
    if (!rv) { go(this, 'ReviewIntroScene', {}, { noHistory: true }); return; }
    const last = state.settings.lastReviewFormat;
    this.choice = data.choice || last || 'visual';
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 40, 26, t('review.formatTitle'), { font: 'title', size: 22, color: S.gold });
    txt(this, 40, 64, t('review.formatSub', { n: rv.concepts.length }), { size: 24, wrap: 1100 });
    this.cards = FORMATS.map((f, i) => {
      const x = 40 + i * 244, y = 140;
      const g = this.add.graphics();
      pixelIcon(this, ICON[f], x + 75, y + 30, 64, 5);
      txt(this, x + 107, y + 120, FORMAT_LABEL[f], { font: 'title', size: 11, origin: 0.5 });
      txt(this, x + 107, y + 150, t(`review.formats.${f}`), { size: 22, origin: [0.5, 0], align: 'center', wrap: 190 });
      if (f === last) { const b = txt(this, x + 107, y + 238, t('review.lastChoice'), { font: 'title', size: 7, color: S.cyan, origin: 0.5, depth: 6 }); this.add.rectangle(x + 107, y + 238, b.width + 14, 22, 0x1d3a6e).setDepth(5); }
      hotspot(this, x, y, 214, 280, `${FORMAT_LABEL[f]}: ${t(`review.formats.${f}`)}${f === last ? '. Your last choice.' : ''}`, () => { this.choose(f); this.start(); });
      return { f, g, x, y };
    });
    this.draw();
    charBubble(this, 40, 446, 760, 120, 'comms', t('review.formatTip'), { portrait: 120, size: 22 });
    pxButton(this, 620, 644, 200, 56, t('review.back'), () => go(this, 'ReviewIntroScene', {}, { noHistory: true, transition: 'fade' }), { size: 14 });
    pxButton(this, 836, 644, 420, 56, t('review.start'), () => this.start(), { primary: true, size: 14 });
    this.onKey = (k) => {
      const n = Number(k); if (n >= 1 && n <= 5) { this.choose(FORMATS[n - 1]); return true; }
      if (k === 'ArrowRight') { this.choose(FORMATS[(FORMATS.indexOf(this.choice) + 1) % 5]); return true; }
      if (k === 'ArrowLeft') { this.choose(FORMATS[(FORMATS.indexOf(this.choice) + 4) % 5]); return true; }
      if (k === 'Enter') { this.start(); return true; }
      return false;
    };
    setup(this, data, { back: false, help: 'ReviewFormatScene', helpPos: [24, 640], esc: () => go(this, 'ReviewIntroScene', {}, { noHistory: true, transition: 'fade' }) });
    say(`${t('review.formatTitle')} ${t('review.formatSub', { n: rv.concepts.length })} ${FORMATS.map((f, i) => `${i + 1}: ${FORMAT_LABEL[f]}, ${t(`review.formats.${f}`)}${f === last ? ', your last choice' : ''}`).join('. ')}. Press 1 to 5 to choose and Enter to start.`);
  }

  draw() {
    for (const c of this.cards) {
      const on = c.f === this.choice;
      c.g.clear(); c.g.fillStyle(0x000000, 0.95); c.g.fillRect(c.x + 6, c.y + 6, 214, 280);
      c.g.fillStyle(on ? 0x1d3a6e : C.navy2, 1); c.g.fillRect(c.x, c.y, 214, 280);
      c.g.lineStyle(on ? 6 : 4, on ? C.gold : C.blueBorder, 1); c.g.strokeRect(c.x + 2, c.y + 2, 210, 276);
    }
  }

  choose(f) { this.choice = f; this.draw(); }

  start() {
    const rv = state.mission.review;
    rv.format = this.choice;
    state.settings.lastReviewFormat = this.choice;
    saveSettings();
    if (!rv.startedAt) rv.startedAt = Date.now();
    go(this, 'ReviewScene', { format: this.choice }, { transition: 'fade' });
  }
}
