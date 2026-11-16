// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Quiz gate 13e-2 / 13e-3 (before Rock Hunter) and 14f-2 / 14f-3 (before Communications): same code, other data.
// data = { quiz: 'rockhunter' | 'discoveries' } → data/content/quiz_<quiz>.json
// Tier 1 question → wrong: the explanation + an EASIER question (tier 2) → wrong again: tier 3, and inside
// tier 3 the questions rotate until one is answered right. The player must answer correctly to continue.
// Team rule: only decisions with real mission impact change the score, so the quiz only records
// { tier, firstTry, answeredTier, tries } for the log / report and gives NO points.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

// next question after a wrong answer (pure → tested): tier 1 → 2 → 3, then rotate inside tier 3
export function nextQuestion(questions, current) {
  const byTier = (tier) => questions.filter((q) => q.tier === tier);
  if (!current) return byTier(1)[0] || questions[0];
  if (current.tier < 3) {
    for (let tier = current.tier + 1; tier <= 3; tier++) if (byTier(tier).length) return byTier(tier)[0];
  }
  const t3 = byTier(3);
  if (!t3.length) return current;
  const i = t3.findIndex((q) => q.id === current.id);
  return t3[(i + 1) % t3.length];
}

const LETTERS = ['A', 'B', 'C'];

export default class QuizGateScene extends Phaser.Scene {
  constructor() { super('QuizGateScene'); }

  create(data) {
    fresh(this);
    this.quizId = data.quiz === 'discoveries' ? 'discoveries' : 'rockhunter';
    this.quiz = content[`quiz_${this.quizId}`];
    const mi = state.mission;
    this.record = mi.quizzes[this.quizId] || { tier: 1, firstTry: null, answeredTier: null, tries: 0 };
    mi.quizzes[this.quizId] = this.record;
    img(this, 0, 0, 'bg-meridiani', { origin: 0, w: W, h: H });
    this.add.rectangle(0, 0, W, H, C.space, 0.3).setOrigin(0);
    this.layer = this.add.container(0, 0);
    this.checkBtn = pxButton(this, 1016, 640, 240, 60, t('quiz.check'), () => this.check(), { primary: true });
    this.onKey = (k) => {
      const lk = k.toLowerCase();
      if (this.done) { if (k === 'Enter') { this.next(); return true; } return false; }
      const idx = ['a', 'b', 'c'].indexOf(lk) >= 0 ? ['a', 'b', 'c'].indexOf(lk) : ['1', '2', '3'].indexOf(lk);
      if (idx >= 0) { this.choose(idx); return true; }
      if (k === 'ArrowDown') { this.choose(this.choice === null ? 0 : (this.choice + 1) % 3); return true; }
      if (k === 'ArrowUp') { this.choose(this.choice === null ? 2 : (this.choice + 2) % 3); return true; }
      if (k === 'Enter') { this.check(); return true; }
      return false;
    };
    setup(this, data, { back: true, backPos: [24, 640, 184, 60], help: 'QuizGateScene', helpPos: [224, 640] });
    this.ask(nextQuestion(this.quiz.questions, null), null);
  }

  ask(q, intro) {
    this.q = q; this.choice = null; this.done = false;
    this.layer.removeAll(true);
    (this.optItems || []).forEach((o) => o.destroy());
    this.optItems = [];
    if (this.mentor) { this.mentor.destroy(); this.mentor = null; }
    const add = (o) => { this.layer.add(o); return o; };
    const x = 204, w = 872;
    let y = 60;
    if (intro) {
      const it = txt(this, x + 46, 0, intro, { size: 22, wrap: w - 66, lineSpacing: 0 });
      const hh = it.height + 20;
      add(panel(this, x - 24, 10, w + 48, hh, { fill: 0x5a1f12, stroke: C.red, bw: 3 }));
      add(txt(this, x - 12, 14, '✕', { size: 30, color: S.red }));
      it.y = 20; add(it);
      y = 10 + hh + 18;
    }
    const qText = txt(this, x + 24, 0, q.question, { font: 'title', size: 14, color: S.white, wrap: w - 48, lineSpacing: 8 });
    const optTexts = q.options.map((o) => txt(this, 0, 0, o, { size: 24, wrap: w - 120, lineSpacing: 0 }));
    const gate = txt(this, x + 66, 0, this.quiz.gate, { size: 21, color: S.gold, wrap: w - 120 });
    const rowsH = optTexts.reduce((s, o) => s + Math.max(48, o.height + 18) + 12, 0);
    const h = 44 + qText.height + 20 + rowsH + gate.height + 40;
    add(panel(this, x, y, w, h, { fill: C.blueCard, stroke: C.blueBorder, bw: 4, shadow: true }));
    add(txt(this, x + 24, y + 22, t('quiz.title'), { font: 'title', size: 10, color: S.cyan }));
    const tierLabel = this.record.tries === 0 ? t('quiz.q1') : t('quiz.easier');
    const tl = txt(this, x + 160, y + 22, tierLabel, { font: 'title', size: 8, color: S.navy });
    add(this.add.rectangle(tl.x - 6, y + 18, tl.width + 12, 18, this.record.tries === 0 ? C.gold : C.green).setOrigin(0));
    add(tl);
    qText.y = y + 50; add(qText);
    let oy = qText.y + qText.height + 20;
    this.rows = optTexts.map((ot, i) => {
      const rh = Math.max(48, ot.height + 18);
      const box = add(this.add.rectangle(x + 24, oy, w - 48, rh, C.space).setOrigin(0).setStrokeStyle(3, C.white));
      const letter = add(txt(this, x + 46, oy + rh / 2, LETTERS[i], { font: 'title', size: 12, color: S.gold, origin: [0, 0.5] }));
      ot.setPosition(x + 84, oy + rh / 2 - ot.height / 2); add(ot);
      const mark = add(txt(this, x + w - 40, oy + rh / 2, '', { size: 34, origin: [1, 0.5] }));
      const item = hotspot(this, x + 24, oy, w - 48, rh, `${LETTERS[i]}: ${q.options[i]}`, () => this.choose(i));
      this.optItems.push(item);
      const row = { box, letter, text: ot, mark, y: oy, h: rh };
      oy += rh + 12;
      return row;
    });
    const gy = oy + 4;
    add(this.add.rectangle(x + 24, gy, w - 48, gate.height + 14, 0x000000, 0).setOrigin(0).setStrokeStyle(2, C.gold));
    add(txt(this, x + 34, gy + 7, '(!)', { font: 'title', size: 8, color: S.gold }));
    gate.y = gy + 7; add(gate);
    this.cardBottom = y + h;
    this.mentor = mentorBar(this, 24, Math.min(520, this.cardBottom + 16), 720, 104, '', { portrait: 96, size: 21, depth: 30 });
    this.mentor.set(q.hint, { silent: true });
    this.checkBtn.setLabel(t('quiz.check'));
    this.checkBtn.setDisabled(true);
    say(`${intro ? `${intro} ` : ''}${t('quiz.title')}. ${q.question} ${q.options.map((o, i) => `${LETTERS[i]}: ${o}.`).join(' ')} ${this.quiz.gate} Hint: ${q.hint} Press A, B or C, then Enter to check.`);
  }

  choose(i) {
    if (this.done) return;
    this.choice = i;
    this.rows.forEach((r, k) => r.box.setStrokeStyle(k === i ? 5 : 3, k === i ? C.yellow : C.white).setFillStyle(k === i ? 0x1d2a55 : C.space));
    this.checkBtn.setDisabled(false);
  }

  check() {
    if (this.done) { this.next(); return; }
    if (this.choice === null) { say('Choose an answer first: A, B or C.'); return; }
    const q = this.q, rec = this.record;
    rec.tries += 1;
    if (this.choice === q.answer_index) {
      this.done = true;
      rec.answeredTier = q.tier;
      if (rec.firstTry === null) rec.firstTry = rec.tries === 1;
      logEvent(`Quick check (${this.quizId}): correct ${rec.tries === 1 ? 'on the first try' : `after ${rec.tries} tries`}.`, 'quiz');
      const r = this.rows[this.choice];
      r.box.setFillStyle(0x16502f).setStrokeStyle(5, C.green); r.mark.setText('✓').setColor(S.green);
      sfx(this, 'sfx-place');
      this.mentor.setTitle(t('quiz.correct'));
      this.mentor.set(q.explanation, { silent: true });
      this.checkBtn.setLabel(t('quiz.next'));
      say(`${t('quiz.correct')} ${q.explanation} Press Enter to continue.`);
      return;
    }
    if (rec.firstTry === null) rec.firstTry = false;
    sfx(this, 'sfx-error');
    const nq = nextQuestion(this.quiz.questions, q);
    rec.tier = nq.tier;
    const intro = nq.wrongIntro || `${t('quiz.wrong')} ${q.explanation}`;
    this.ask(nq, intro);
  }

  next() {
    const n = this.quiz.next;
    go(this, n.scene, n.data || {}, { transition: 'dither' });
  }
}

