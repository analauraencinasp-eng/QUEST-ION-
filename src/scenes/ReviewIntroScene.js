// Screens 17 / 17b · Review your mission. The game shows the player's real scores by category and the
// 3–5 concepts it picked from them (src/review.js), each with its icon, weakness blocks and the reason.
// 17b: every category is good → bonus concepts the player saw but never reviewed.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { pixelIcon } from '../ui/icons.js';
import { say } from '../a11y.js';
import { selectConcepts, freshReview, conceptById, reasonFor, categoryLevel, stageResult } from '../review.js';
import { charBubble, weakBlocks } from '../ui/review_ui.js';
import { saveGame } from '../save.js';

export default class ReviewIntroScene extends Phaser.Scene {
  constructor() { super('ReviewIntroScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    if (!mi.review || !mi.review.concepts.length || data.recompute) {
      const sel = selectConcepts(mi);
      mi.review = { ...freshReview(), ...sel, runs: (mi.review && mi.review.runs) || 0 };
      logEvent(`Learning review: ${sel.mode === 'bonus' ? 'all categories good, bonus concepts' : `concepts picked from the results: ${sel.concepts.join(', ')}`}.`, 'review');
      saveGame();
    }
    const rv = mi.review, R = content.review;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 40, 26, t('review.title'), { font: 'title', size: 22, color: S.gold });
    charBubble(this, 40, 62, 760, 120, 'systems', rv.mode === 'bonus' ? t('review.introGood') : t('review.introWeak'), { portrait: 120, size: 22 });
    // categories (real scores)
    panel(this, 40, 196, 400, 432, { fill: C.navy2, stroke: C.cyan, bw: 3 });
    txt(this, 56, 210, t('review.byCategory'), { font: 'title', size: 9, color: S.cyan });
    const keys = ['science', 'engineering', 'resources', 'earth', 'data'];
    keys.forEach((k, i) => {
      const v = rv.categories[k], lvl = categoryLevel(v, R.rules), y = 240 + i * 74;
      const col = lvl === 'good' ? C.green : lvl === 'reinforce' ? C.gold : C.red;
      txt(this, 56, y, R.categories[k], { font: 'title', size: 8 });
      txt(this, 424, y - 2, `${v}%`, { font: 'title', size: 12, color: lvl === 'good' ? S.green : lvl === 'reinforce' ? S.gold : S.red, origin: [1, 0] });
      this.add.rectangle(56, y + 18, 270, 10, 0x2a3358).setOrigin(0);
      this.add.rectangle(56, y + 18, 270 * v / 100, 10, col).setOrigin(0);
      txt(this, 56, y + 32, t(`review.level.${lvl}`), { size: 19, color: S.muted });
    });
    txt(this, 56, 604, t('review.dataNote'), { size: 17, color: S.muted, wrap: 380 });
    // concepts
    const bonus = rv.mode === 'bonus';
    panel(this, 452, 196, 804, 432, { fill: C.navy2, stroke: bonus ? C.green : C.gold, bw: 3 });
    txt(this, 468, 210, bonus ? t('review.bonusTitle') : t('review.conceptsTitle', { n: rv.concepts.length }), { font: 'title', size: 9, color: bonus ? S.green : S.gold });
    const rowH = Math.min(96, Math.floor(390 / rv.concepts.length));
    const speech = [];
    rv.concepts.forEach((id, i) => {
      const c = conceptById(id), y = 232 + i * rowH;
      panel(this, 468, y, 772, rowH - 6, { fill: C.navy, stroke: C.white, bw: 2 });
      pixelIcon(this, c.icon, 478, y + (rowH - 6 - 48) / 2, 48, 20);
      txt(this, 540, y + 8, c.title, { font: 'title', size: 10 });
      let why;
      if (bonus) why = t('review.seenIn', { WHERE: c.seen });
      else {
        const r = stageResult(c.stage, mi);
        why = `${R.categories[c.category]} ${rv.categories[c.category]}% · ${t('review.stage', { n: c.stage })}: ✕ ${r.different}  ≈ ${r.close}`;
      }
      txt(this, 540, y + 26, why, { size: 18, color: S.cyan });
      const reason = reasonFor(c, mi);
      txt(this, 540, y + 44, reason, { size: 19, wrap: bonus ? 680 : 560, lineSpacing: 0 });
      if (!bonus) { txt(this, 1124, y + 8, t('review.needs'), { font: 'title', size: 6, color: S.muted }); weakBlocks(this, 1124, y + 22, rv.blocks[id], { size: 14, depth: 21 }); txt(this, 1124, y + 42, `${rv.blocks[id]}/5`, { size: 18, color: S.muted }); }
      speech.push(`${c.title}. ${why.replace('✕', 'different').replace('≈', 'close')}. ${reason}`);
    });
    pxButton(this, 620, 644, 200, 56, t('review.skip'), () => this.skip(), { size: 14 });
    pxButton(this, 836, 644, 420, 56, t('review.choose'), () => this.next(), { primary: true, size: 14 });
    this.onKey = (k) => { if (k === 'Enter') { this.next(); return true; } if (k === 'k' || k === 'K') { this.skip(); return true; } return false; };
    setup(this, data, { back: true, backPos: [104, 644, 150, 56], help: 'ReviewIntroScene', helpPos: [24, 640] });
    say(`${t('review.title')}. ${bonus ? t('review.introGood') : t('review.introWeak')} ${keys.map((k) => `${R.categories[k]} ${rv.categories[k]} percent`).join(', ')}. ${speech.join(' ')} Press Enter to choose how to review, or K to skip.`);
  }

  next() { go(this, 'ReviewFormatScene', {}, { transition: 'fade' }); }
  skip() { go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }); }
}
