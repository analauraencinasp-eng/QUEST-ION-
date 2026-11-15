// Screens 25a–c · Retention check. Every format leads here and gets the SAME 3 questions
// (the check question of the first 3 selected concepts, review.checkQuestions). It measures what the
// player remembers, not the format they used. No feedback until the results screen.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { say } from '../a11y.js';
import { checkQuestions, scoreCheck, blocksAfter } from '../review.js';
import { charBubble } from '../ui/review_ui.js';
import { saveGame } from '../save.js';

const LET = ['A', 'B', 'C'];

export default class ReviewCheckScene extends Phaser.Scene {
  constructor() { super('ReviewCheckScene'); }

  create(data) {
    fresh(this);
    const rv = state.mission.review;
    if (!rv) { go(this, 'ReviewIntroScene', {}, { noHistory: true }); return; }
    this.rv = rv;
    this.qs = checkQuestions(rv.concepts, Math.min(3, rv.concepts.length));
    this.i = data.i || 0;
    if (!this.i) rv.check = [];
    this.pick = null;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 40, 26, t('review.checkTitle'), { font: 'title', size: 22, color: S.gold });
    txt(this, 40, 64, t('review.checkSub'), { size: 24 });
    this.layer = [];
    this.btn = pxButton(this, 960, 644, 296, 56, '', () => this.answer(), { primary: true, size: 14 });
    this.onKey = (k) => {
      const lk = k.toLowerCase(); const j = ['a', 'b', 'c'].indexOf(lk);
      if (j >= 0) { this.choose(j); return true; }
      if (k === 'ArrowDown') { this.choose(this.pick === null ? 0 : (this.pick + 1) % 3); return true; }
      if (k === 'ArrowUp') { this.choose(this.pick === null ? 2 : (this.pick + 2) % 3); return true; }
      if (k === 'Enter') { this.answer(); return true; }
      return false;
    };
    setup(this, data, { back: false, help: 'ReviewCheckScene', helpPos: [24, 640], esc: () => go(this, 'ReviewScene', { format: rv.format }, { noHistory: true, transition: 'fade' }) });
    this.draw();
  }

  draw() {
    for (const o of this.layer) { try { o.destroy(); } catch (e) { /* gone */ } }
    this.layer = [];
    const P = (o) => { this.layer.push(o); return o; };
    const q = this.qs[this.i], n = this.qs.length;
    P(txt(this, 40, 124, t('review.qOf', { n: this.i + 1, N: n }), { font: 'title', size: 11, color: S.cyan }));
    const g = P(this.add.graphics());
    for (let k = 0; k < n; k++) { g.fillStyle(k <= this.i ? C.gold : C.navy, 1); g.fillRect(250 + k * 30, 118, 24, 24); g.lineStyle(3, C.white, 1); g.strokeRect(250 + k * 30, 118, 24, 24); }
    P(txt(this, 40, 166, q.q, { size: 34, wrap: 1180 }));
    q.options.forEach((o, i) => {
      const y = 236 + i * 76;
      P(this.add.rectangle(40, y, 1000, 60, i === this.pick ? 0x1d2a55 : C.navy).setOrigin(0).setStrokeStyle(i === this.pick ? 5 : 4, i === this.pick ? C.yellow : C.white));
      P(txt(this, 60, y + 30, LET[i], { font: 'title', size: 12, color: S.gold, origin: [0, 0.5] }));
      P(txt(this, 100, y + 30, o, { size: 24, origin: [0, 0.5] }));
      P(hotspot(this, 40, y, 1000, 60, `${LET[i]}: ${o}`, () => this.choose(i)));
    });
    if (this.i === 0) charBubble(this, 40, 480, 760, 120, 'comms', t('review.checkTip'), { portrait: 120, size: 22 }).objs.forEach(P);
    this.btn.setLabel(this.i < n - 1 ? t('review.answerBtn') : t('review.seeResults'));
    this.btn.setDisabled(this.pick === null);
    say(`${t('review.qOf', { n: this.i + 1, N: n })}. ${q.q} ${q.options.map((o, i) => `${LET[i]}: ${o}`).join('. ')}. Press A, B or C, then Enter.`);
  }

  choose(i) { this.pick = i; this.draw(); }

  answer() {
    if (this.pick === null) return;
    const rv = this.rv;
    rv.check[this.i] = this.pick;
    if (this.i < this.qs.length - 1) { this.i += 1; this.pick = null; this.draw(); return; }
    // finish: score, time spent, weakness after (see review.js)
    rv.checkScore = scoreCheck(this.qs, rv.check);
    rv.checkTotal = this.qs.length;
    rv.spentSec = rv.startedAt ? Math.round((Date.now() - rv.startedAt) / 1000) : 0;
    rv.after = blocksAfter(rv);
    rv.checkDone = true; rv.done = true; rv.runs = (rv.runs || 0) + 1;
    logEvent(`Learning review (${rv.format}): remembered ${rv.checkScore} of ${rv.checkTotal} in ${Math.floor(rv.spentSec / 60)}:${String(rv.spentSec % 60).padStart(2, '0')}.`, 'review');
    saveGame();
    go(this, 'ReviewResultsScene', {}, { transition: 'stars' });
  }
}
