// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 26 · Review results: correct answers, format used, time spent, concepts with weakness
// before → after, the Director celebrating or encouraging. GO TO REPORT (15-R) · REVIEW AGAIN (18).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { t } from '../content.js';
import { state } from '../state.js';
import { go } from '../router.js';
import { say } from '../a11y.js';
import { conceptById, checkQuestions } from '../review.js';
import { charBubble, weakBlocks, FORMAT_LABEL } from '../ui/review_ui.js';
import { pixelIcon } from '../ui/icons.js';

export function mmss(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }

export default class ReviewResultsScene extends Phaser.Scene {
  constructor() { super('ReviewResultsScene'); }

  create(data) {
    fresh(this);
    const rv = state.mission.review;
    if (!rv || !rv.done) { go(this, 'ReviewIntroScene', {}, { noHistory: true }); return; }
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 40, 26, t('review.resultsTitle'), { font: 'title', size: 22, color: S.gold });
    panel(this, 40, 70, 820, 552, { fill: C.navy, stroke: C.gold, bw: 4, shadow: true });
    const stats = [[t('review.remembered'), `${rv.checkScore} of ${rv.checkTotal}`, S.gold], [t('review.formatUsed'), FORMAT_LABEL[rv.format], S.cyan], [t('review.timeSpent'), mmss(rv.spentSec), S.cyan]];
    stats.forEach(([k, v, c], i) => { panel(this, 60 + i * 264, 90, 244, 92, { fill: C.navy2, stroke: C.white, bw: 3 }); txt(this, 74 + i * 264, 104, k, { font: 'title', size: 8, color: S.muted }); txt(this, 74 + i * 264, 136, v, { font: 'title', size: 15, color: c }); });
    const bonus = rv.mode === 'bonus';
    txt(this, 60, 192, bonus ? t('review.bonusReviewed') : t('review.beforeAfter'), { size: 22, color: S.muted });
    const qs = checkQuestions(rv.concepts, rv.checkTotal);
    const rowH = Math.min(66, Math.floor(320 / rv.concepts.length));
    rv.concepts.forEach((id, i) => {
      const c = conceptById(id), y = 250 + i * rowH;
      pixelIcon(this, c.icon, 60, y, 32, 5);
      txt(this, 104, y + 4, c.title, { font: 'title', size: 9 });
      const qi = qs.findIndex((q) => q.id === id);
      if (qi >= 0) txt(this, 104, y + 22, rv.check[qi] === qs[qi].answer ? t('review.checkRight') : t('review.checkWrong'), { size: 19, color: rv.check[qi] === qs[qi].answer ? S.green : S.red });
      if (!bonus) {
        weakBlocks(this, 470, y + 4, rv.blocks[id], { size: 16 });
        txt(this, 586, y + 4, '→', { size: 26 });
        weakBlocks(this, 620, y + 4, rv.after[id] ?? rv.blocks[id], { size: 16 });
        txt(this, 740, y + 4, `${rv.blocks[id]} → ${rv.after[id] ?? rv.blocks[id]}`, { size: 20, color: S.muted });
      }
    });
    if (!bonus) { txt(this, 470, 226, t('review.before'), { font: 'title', size: 7, color: S.muted }); txt(this, 620, 226, t('review.after'), { font: 'title', size: 7, color: S.muted }); }
    const improved = !bonus && rv.concepts.filter((id) => (rv.after[id] ?? 0) < (rv.blocks[id] ?? 0)).length;
    txt(this, 60, 584, bonus ? t('review.bonusDone') : t('review.improved', { n: improved, N: rv.concepts.length }), { size: 22, color: S.green });
    const good = rv.checkScore >= Math.ceil(rv.checkTotal * 2 / 3);
    const msg = good ? t('review.celebrate', { n: rv.checkScore, N: rv.checkTotal }) : t('review.encourage', { n: rv.checkScore, N: rv.checkTotal });
    charBubble(this, 880, 70, 376, 330, 'systems', msg, { portrait: 150, size: 22 });
    pxButton(this, 560, 644, 300, 56, t('review.again'), () => this.again(), { size: 14 });
    pxButton(this, 900, 644, 356, 56, t('review.toReport'), () => go(this, 'ReviewReportScene', {}, { transition: 'fade' }), { primary: true, size: 14 });
    this.onKey = (k) => { if (k === 'Enter') { go(this, 'ReviewReportScene', {}, { transition: 'fade' }); return true; } if (k === 'r' || k === 'R') { this.again(); return true; } return false; };
    setup(this, data, { back: false, help: 'ReviewResultsScene', helpPos: [24, 640], esc: () => go(this, 'ReviewReportScene', {}, { transition: 'fade' }) });
    say(`${t('review.resultsTitle')}. You remembered ${rv.checkScore} of ${rv.checkTotal}. Format: ${FORMAT_LABEL[rv.format]}. Time: ${mmss(rv.spentSec)}. ${msg} Press Enter for the report or R to review again.`);
  }

  again() {
    const rv = state.mission.review;
    Object.assign(rv, { idx: 0, check: [], checkDone: false, startedAt: null, practice: {} });
    go(this, 'ReviewFormatScene', { choice: rv.format }, { transition: 'fade' });
  }
}
