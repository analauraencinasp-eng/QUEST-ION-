// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 15-R · Report page "YOUR REVIEW" (after 15-D1…D6, tab R). Same report, one more page:
// mission performance by category, the concepts picked and why, format used, time spent,
// retention check answers and learning progress (weakness before → after).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { go } from '../router.js';
import { say } from '../a11y.js';
import { conceptById, reasonFor, checkQuestions, categoryLevel, selectConcepts } from '../review.js';
import { weakBlocks, FORMAT_LABEL } from '../ui/review_ui.js';
import { pixelIcon } from '../ui/icons.js';
import { mmss } from './ReviewResultsScene.js';

export default class ReviewReportScene extends Phaser.Scene {
  constructor() { super('ReviewReportScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission, R = content.review;
    const rv = mi.review;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 24, 22, t('review.reportTitle'), { font: 'title', size: 22, color: S.gold, shadow: 3 });
    const sub = txt(this, 32, 62, t('review.reportSub'), { size: 22, color: S.navy, depth: 3 });
    this.add.rectangle(24, 60, sub.width + 16, 28, C.white).setOrigin(0).setDepth(2);
    // tabs 1–6 + R (R = this page)
    ['1', '2', '3', '4', '5', '6', 'R'].forEach((l, i) => {
      const x = 860 + i * 44, on = l === 'R';
      this.add.rectangle(x, 24, 32, 32, on ? C.gold : C.navy).setOrigin(0).setStrokeStyle(3, C.white);
      txt(this, x + 16, 40, l, { font: 'title', size: 10, color: on ? S.navy : S.white, origin: 0.5 });
      if (!on) hotspot(this, x, 24, 32, 32, `Stage ${l}`, () => go(this, 'StageDetailScene', { n: Number(l) }, { noHistory: true, transition: 'fade' }));
    });
    const cats = (rv && rv.categories) || selectConcepts(mi).categories;
    // categories
    panel(this, 24, 104, 380, 520, { fill: C.navy2, stroke: C.cyan, bw: 3 });
    txt(this, 38, 118, t('review.byCategory'), { font: 'title', size: 8, color: S.cyan });
    ['science', 'engineering', 'resources', 'earth', 'data'].forEach((k, i) => {
      const v = cats[k], lvl = categoryLevel(v, R.rules), y = 150 + i * 88;
      const col = lvl === 'good' ? C.green : lvl === 'reinforce' ? C.gold : C.red;
      txt(this, 38, y, R.categories[k], { font: 'title', size: 8 });
      txt(this, 388, y - 2, `${v}%`, { font: 'title', size: 12, color: lvl === 'good' ? S.green : lvl === 'reinforce' ? S.gold : S.red, origin: [1, 0] });
      this.add.rectangle(38, y + 20, 270, 10, 0x2a3358).setOrigin(0); this.add.rectangle(38, y + 20, 270 * v / 100, 10, col).setOrigin(0);
      txt(this, 38, y + 36, t(`review.level.${lvl}`), { size: 19, color: S.muted });
    });
    if (!rv || !rv.done) {
      panel(this, 416, 104, 840, 520, { fill: C.navy2, stroke: C.gold, bw: 3 });
      txt(this, 440, 140, t('review.notYet'), { size: 28, wrap: 780 });
      pxButton(this, 440, 240, 360, 56, t('review.startReview'), () => go(this, 'ReviewIntroScene', {}, { transition: 'fade' }), { primary: true, size: 14 });
      this.buttons(false);
      this.onKey = (k) => { if (k === 'Enter') { go(this, 'ReviewIntroScene', {}, { transition: 'fade' }); return true; } const n = Number(k); if (n >= 1 && n <= 6) { go(this, 'StageDetailScene', { n }, { noHistory: true, transition: 'fade' }); return true; } return false; };
      setup(this, data, { back: false, help: 'ReviewReportScene', helpPos: [24, 640], esc: () => go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }) });
      say(`${t('review.reportTitle')}. ${t('review.notYet')}`);
      return;
    }
    // concepts + why
    panel(this, 416, 104, 450, 520, { fill: C.navy2, stroke: C.gold, bw: 3 });
    txt(this, 430, 118, rv.mode === 'bonus' ? t('review.bonusTitleShort') : t('review.selectedWhy'), { font: 'title', size: 8, color: S.gold });
    const rowH = Math.min(100, Math.floor(480 / rv.concepts.length));
    const lines = [];
    rv.concepts.forEach((id, i) => {
      const c = conceptById(id), y = 144 + i * rowH;
      pixelIcon(this, c.icon, 430, y + 2, 32, 5);
      txt(this, 472, y, c.title, { font: 'title', size: 9 });
      const why = c.category === 'bonus' ? t('review.seenIn', { WHERE: c.seen }) : `${R.categories[c.category]} ${cats[c.category]}% · ${reasonFor(c, mi)}`;
      txt(this, 472, y + 18, why, { size: 19, wrap: 380, lineSpacing: 0 });
      lines.push(`${c.title}: ${why}`);
    });
    // review
    panel(this, 878, 104, 378, 520, { fill: C.navy2, stroke: C.white, bw: 3 });
    txt(this, 892, 118, t('review.reviewBox'), { font: 'title', size: 8 });
    [[t('review.formatUsed'), FORMAT_LABEL[rv.format]], [t('review.timeSpent'), mmss(rv.spentSec)], [t('review.checkLabel'), `${rv.checkScore} of ${rv.checkTotal}`]].forEach(([k, v], i) => {
      txt(this, 892, 148 + i * 44, k, { font: 'title', size: 7, color: S.muted }); txt(this, 1240, 144 + i * 44, v, { font: 'title', size: 11, color: S.cyan, origin: [1, 0] });
    });
    const qs = checkQuestions(rv.concepts, rv.checkTotal);
    qs.forEach((q, i) => {
      const ok = rv.check[i] === q.answer, y = 290 + i * 46;
      txt(this, 892, y, ok ? '✓' : '✕', { size: 30, color: ok ? S.green : S.red });
      txt(this, 920, y + 4, `${conceptById(q.id).title}: ${q.options[q.answer]}`, { size: 19, wrap: 320, lineSpacing: 0 });
    });
    if (rv.mode !== 'bonus') {
      const avg = (o) => Math.round(rv.concepts.reduce((s, id) => s + (o[id] ?? 0), 0) / rv.concepts.length);
      const b = avg(rv.blocks), a = avg(rv.after);
      txt(this, 892, 446, t('review.progress'), { font: 'title', size: 7, color: S.muted });
      txt(this, 892, 464, t('review.progressNote'), { size: 18, color: S.muted, wrap: 350 });
      weakBlocks(this, 892, 512, b, { size: 16 }); txt(this, 1004, 506, '→', { size: 28 }); weakBlocks(this, 1036, 512, a, { size: 16 });
      txt(this, 892, 544, t('review.avgLine', { B: b, A: a }), { size: 19, color: S.muted });
      lines.push(`Average weakness ${b} before, ${a} after.`);
    }
    this.buttons();
    setup(this, data, { back: false, help: 'ReviewReportScene', helpPos: [24, 640], esc: () => go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }) });
    say(`${t('review.reportTitle')}. ${lines.join(' ')} Format ${FORMAT_LABEL[rv.format]}, time ${mmss(rv.spentSec)}, retention check ${rv.checkScore} of ${rv.checkTotal}.`);
  }

  buttons(again = true) {
    pxButton(this, 560, 644, 260, 56, t('review.dashboard'), () => go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }), { size: 14 });
    if (again) pxButton(this, 836, 644, 260, 56, t('review.again'), () => {
      const rv = state.mission.review;
      if (rv) Object.assign(rv, { idx: 0, check: [], checkDone: false, startedAt: null, practice: {} });
      go(this, rv ? 'ReviewFormatScene' : 'ReviewIntroScene', {}, { transition: 'fade' });
    }, { size: 14 });
    if (!again) return;
    this.onKey = (k) => { const n = Number(k); if (n >= 1 && n <= 6) { go(this, 'StageDetailScene', { n }, { noHistory: true, transition: 'fade' }); return true; } return false; };
  }
}
