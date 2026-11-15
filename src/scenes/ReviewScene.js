// Screens 19–24 · the review itself, in the format the player chose. One scene, five formats:
//   visual (20) comic strip · podcast (21/21b) two characters, subtitles, speeds, script fallback ·
//   flashcards (22a/22b) with 3 Leitner boxes · questions (23a/b/c) · text (24) with NASA SOURCES.
// The shared REVIEW BAR (19) on top switches format with the tabs (or keys 1–5) WITHOUT losing progress:
// the concept index and what was seen live in state.mission.review, not in the scene.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, hotspot } from '../ui/widgets.js';
import { setup, openSources } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { go, replace } from '../router.js';
import { pixelIcon } from '../ui/icons.js';
import { say, quiet } from '../a11y.js';
import { speak, isSpeaking, stopVoice, setVoiceRate } from '../voice.js';
import { sfx } from '../audio.js';
import { saveGame } from '../save.js';
import { conceptById, reasonFor, T as fillT, leitner, boxCounts, FORMATS } from '../review.js';
import { reviewBar, charBubble, portrait, WHO } from '../ui/review_ui.js';

const LET = ['A', 'B', 'C'];

export default class ReviewScene extends Phaser.Scene {
  constructor() { super('ReviewScene'); }

  create(data) {
    fresh(this);
    const rv = state.mission.review;
    if (!rv) { go(this, 'ReviewIntroScene', {}, { noHistory: true }); return; }
    this.rv = rv;
    this.format = FORMATS.includes(data.format) ? data.format : (rv.format || 'visual');
    rv.format = this.format;
    this.mi = state.mission;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 40, 26, t(`review.formatNames.${this.format}`), { font: 'title', size: 22, color: S.gold });
    this.layer = [];
    this.prevBtn = pxButton(this, 780, 644, 220, 56, t('review.previous'), () => this.prev(), { size: 14 });
    this.nextBtn = pxButton(this, 1016, 644, 240, 56, t('review.next'), () => this.next(), { primary: true, size: 14 });
    this.onKey = (k) => this.key(k);
    setup(this, data, { back: false, help: 'ReviewScene', helpPos: [24, 640], esc: () => { stopVoice(); go(this, 'ReviewFormatScene', { choice: this.format }, { noHistory: true, transition: 'fade' }); } });
    this.events.once('shutdown', () => { stopVoice(); if (this.podTimer) this.podTimer.remove(); });
    this.draw();
  }

  add2(o) { this.layer.push(o); return o; }
  clear() { for (const o of this.layer) { try { o.destroy(); } catch (e) { /* gone */ } } this.layer = []; if (this.podTimer) { this.podTimer.remove(); this.podTimer = null; } stopVoice(); }

  draw() {
    this.clear();
    const rv = this.rv;
    const id = rv.concepts[rv.idx];
    this.c = conceptById(id);
    rv.seen[id] = { ...(rv.seen[id] || {}), [this.format]: true };
    saveGame();
    const bar = reviewBar(this, rv, this.format, (f) => this.switchTo(f));
    this.add2(bar);
    this.prevBtn.setDisabled(rv.idx === 0);
    this.nextBtn.setLabel(rv.idx === rv.concepts.length - 1 ? t('review.toCheck') : t('review.next'));
    this[`draw_${this.format}`]();
  }

  // ---------- 20 · visual comic strip ----------
  draw_visual() {
    const panels = this.c.comic, n = panels.length, gap = 16, pw = Math.floor((1232 - gap * (n - 1)) / n);
    const lines = [];
    panels.forEach(([who, text], i) => {
      const x = 24 + i * (pw + gap), y = 180;
      this.add2(panel(this, x, y, pw, 440, { fill: C.navy, stroke: C.white, bw: 4, shadow: true }));
      this.add2(txt(this, x + 12, y + 12, String(i + 1), { font: 'title', size: 10, color: S.gold }));
      if (who === 'diagram') this.diagram(x + 16, y + 36, pw - 32, 190);
      else portrait(this, x + Math.round((pw - 168) / 2), y + 36, 168, who).forEach((o) => this.add2(o));
      const by = y + 240;
      this.add2(panel(this, x + 12, by, pw - 24, 188, { fill: C.bubble, stroke: C.ink, bw: 3 }));
      if (who !== 'diagram') this.add2(txt(this, x + 24, by + 10, WHO[who], { font: 'title', size: 8, color: S.mentor }));
      const body = fillT(text, this.mi);
      this.add2(txt(this, x + 24, by + (who === 'diagram' ? 12 : 30), body, { size: 21, color: S.ink, wrap: pw - 48, lineSpacing: 0 }));
      lines.push(`Panel ${i + 1}. ${who === 'diagram' ? '' : `${WHO[who]}: `}${body}`);
    });
    say(`${this.c.title}. ${lines.join(' ')}`);
  }

  diagram(x, y, w, h) {
    const g = this.add2(this.add.graphics());
    g.fillStyle(C.space, 1); g.fillRect(x, y, w, h); g.lineStyle(3, C.cyan, 1); g.strokeRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    if (this.c.id === 'window') {
      g.fillStyle(C.blueBorder, 1); for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; g.fillRect(cx + Math.cos(a) * w * 0.2 - 2, cy + Math.sin(a) * h * 0.25 - 2, 4, 4); }
      g.fillStyle(C.gold, 1); for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; g.fillRect(cx + Math.cos(a) * w * 0.38 - 2, cy + Math.sin(a) * h * 0.42 - 2, 4, 4); }
      g.fillRect(cx - 9, cy - 9, 18, 18);
      g.fillStyle(C.cyan, 1); g.fillRect(cx + w * 0.2 - 5, cy - 5, 10, 10);
      g.fillStyle(C.red, 1); g.fillRect(cx + w * 0.3 - 5, cy - h * 0.3 - 5, 10, 10);
      this.add2(txt(this, cx + w * 0.2, cy + 10, 'EARTH', { size: 16, color: S.cyan, origin: [0.5, 0] }));
      this.add2(txt(this, cx + w * 0.3, cy - h * 0.3 - 22, 'MARS', { size: 16, color: S.red, origin: 0.5 }));
      this.add2(txt(this, cx, cy + 12, 'SUN', { size: 16, color: S.gold, origin: [0.5, 0] }));
    } else {
      const pts = [[x + 30, y + h - 40, 'ROVER'], [cx, y + 40, 'ORBITER'], [x + w - 30, y + h - 40, 'DSN']];
      g.lineStyle(3, C.green, 1); g.lineBetween(pts[0][0], pts[0][1], pts[1][0], pts[1][1]); g.lineBetween(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
      for (const [px, py, l] of pts) { g.fillStyle(C.white, 1); g.fillRect(px - 8, py - 8, 16, 16); this.add2(txt(this, px, py + 12, l, { font: 'title', size: 7, color: S.text, origin: [0.5, 0] })); }
    }
  }

  // ---------- 21 / 21b · podcast ----------
  draw_podcast() {
    const [a, b, lines] = this.c.podcast;
    this.lines = lines.map(([who, text]) => [who, fillT(text, this.mi)]);
    this.pa = a; this.pb = b;
    if (this.line === undefined || this.lineFor !== this.c.id) { this.line = 0; this.lineFor = this.c.id; }
    if (this.speed === undefined) this.speed = 1;
    const canVoice = state.settings.narration && (typeof window !== 'undefined') && (!!window.speechSynthesis || typeof Audio !== 'undefined');
    if (this.script === undefined) this.script = !canVoice;
    this.drawPod();
  }

  drawPod() {
    for (const o of this.podObjs || []) { try { o.destroy(); } catch (e) { /* gone */ } }
    this.podObjs = [];
    const P = (o) => { this.podObjs.push(o); this.layer.push(o); return o; };
    const speaking = this.lines[this.line][0];
    portrait(this, 40, 184, 236, this.pa, { stroke: !this.script && speaking === this.pa ? C.gold : C.white, bw: !this.script && speaking === this.pa ? 6 : 4, alpha: !this.script && speaking !== this.pa ? 0.5 : 1 }).forEach(P);
    portrait(this, 1004, 184, 236, this.pb, { stroke: !this.script && speaking === this.pb ? C.gold : C.white, bw: !this.script && speaking === this.pb ? 6 : 4, alpha: !this.script && speaking !== this.pb ? 0.5 : 1 }).forEach(P);
    P(txt(this, 40, 428, WHO[this.pa], { font: 'title', size: 8, color: S.cyan }));
    P(txt(this, 1004, 428, WHO[this.pb], { font: 'title', size: 8, color: S.cyan }));
    if (this.script) {
      P(panel(this, 296, 184, 688, 440, { fill: C.navy2, stroke: C.cyan, bw: 4 }));
      P(txt(this, 316, 200, t('review.scriptTitle'), { font: 'title', size: 8, color: S.cyan }));
      let y = 228;
      for (const [who, text] of this.lines) {
        P(txt(this, 316, y, `${WHO[who].split(' · ').pop()}:`, { size: 20, color: who === this.pa ? S.gold : S.cyan }));
        const tt = P(txt(this, 470, y, text, { size: 20, wrap: 496, lineSpacing: 0 }));
        y += Math.max(24, tt.height) + 8;
      }
      P(pxButton(this, 296, 636 - 2, 220, 56, t('review.listen'), () => { this.script = false; this.drawPod(); }, { size: 12 }));
      say(`${t('review.scriptTitle')}. ${this.lines.map(([w, x]) => `${WHO[w]}: ${x}`).join(' ')}`);
      return;
    }
    P(panel(this, 296, 184, 688, 290, { fill: C.navy2, stroke: C.gold, bw: 4 }));
    P(txt(this, 316, 200, t('review.lineOf', { n: this.line + 1, N: this.lines.length }), { font: 'title', size: 8, color: S.muted }));
    if (this.line > 0) { const [pw, px] = this.lines[this.line - 1]; P(txt(this, 316, 222, `${WHO[pw].split(' · ').pop()}: ${px}`, { size: 20, color: S.muted, wrap: 648 })); }
    P(txt(this, 316, 290, WHO[speaking], { font: 'title', size: 9, color: S.gold }));
    P(txt(this, 316, 312, this.lines[this.line][1], { size: 30, wrap: 648, lineSpacing: 0 }));
    // controls: previous line · play/pause · next line · speeds · script
    const y = 490;
    P(panel(this, 296, y, 688, 70, { fill: C.navy2, stroke: C.gold, bw: 3 }));
    P(pxButton(this, 312, y + 10, 60, 50, '◀', () => this.podGo(-1), { size: 12 }));
    P(pxButton(this, 382, y + 10, 90, 50, this.playing ? '❚❚' : '▶', () => this.podToggle(), { size: 12, primary: true }));
    P(pxButton(this, 482, y + 10, 60, 50, '▶▶', () => this.podGo(1), { size: 10 }));
    [0.8, 1, 1.25].forEach((s, i) => P(pxButton(this, 566 + i * 96, y + 10, 88, 50, `${s}×`, () => { this.speed = s; setVoiceRate(s); this.drawPod(); }, { size: 10, primary: this.speed === s })));
    P(pxButton(this, 860, y + 10, 112, 50, t('review.script'), () => { this.podStop(); this.script = true; this.drawPod(); }, { size: 9 }));
  }

  podToggle() { if (this.playing) this.podStop(); else this.podPlay(); }
  podPlay() {
    this.playing = true; setVoiceRate(this.speed);
    const [who, text] = this.lines[this.line];
    quiet(); speak(`${WHO[who].split(' · ').pop()}. ${text}`);
    this.drawPod();
    if (this.podTimer) this.podTimer.remove();
    let started = false;
    this.podTimer = this.time.addEvent({ delay: 300, loop: true, callback: () => {
      if (isSpeaking()) { started = true; return; }
      if (!started && this.podWait++ < 20) return;               // the clip may still be loading
      this.podWait = 0;
      if (this.line < this.lines.length - 1) { this.line += 1; this.podPlay(); } else { this.podStop(); }
    } });
    this.podWait = 0;
  }
  podStop() { this.playing = false; if (this.podTimer) { this.podTimer.remove(); this.podTimer = null; } stopVoice(); this.drawPod(); }
  podGo(d) { const was = this.playing; this.podStop(); this.line = Math.max(0, Math.min(this.lines.length - 1, this.line + d)); if (was) this.podPlay(); else { this.drawPod(); say(`${WHO[this.lines[this.line][0]]}: ${this.lines[this.line][1]}`); } }

  // ---------- 22a / 22b · flashcards ----------
  draw_flashcards() {
    this.flipped = false;
    this.drawCard();
  }
  drawCard() {
    for (const o of this.cardObjs || []) { try { o.destroy(); } catch (e) { /* gone */ } }
    this.cardObjs = [];
    const P = (o) => { this.cardObjs.push(o); this.layer.push(o); return o; };
    const rv = this.rv, [q, a] = this.c.flash;
    P(txt(this, 360, 184, t('review.cardOf', { n: rv.idx + 1, N: rv.concepts.length }), { font: 'title', size: 10, color: S.muted }));
    P(panel(this, 360, 208, 560, 300, { fill: this.flipped ? C.navy : C.blueCard, stroke: this.flipped ? C.gold : C.blueBorder, bw: 6, shadow: true }));
    P(txt(this, 640, 250, this.flipped ? t('review.answer') : t('review.question'), { font: 'title', size: 10, color: this.flipped ? S.gold : S.cyan, origin: 0.5 }));
    P(txt(this, 640, 358, fillT(this.flipped ? a : q, this.mi), { size: 30, origin: 0.5, align: 'center', wrap: 500 }));
    P(hotspot(this, 360, 208, 560, 300, this.flipped ? `Answer: ${a}` : `Question: ${q}. Press Space to flip.`, () => this.flip()));
    if (!this.flipped) {
      P(pxButton(this, 470, 540, 340, 56, t('review.flip'), () => this.flip(), { primary: true, size: 14 }));
      P(txt(this, 40, 560, t('review.thinkFirst'), { size: 22, color: S.muted, wrap: 300 }));
    } else {
      P(pxButton(this, 360, 540, 270, 56, t('review.didntKnow'), () => this.know(false), { size: 12 }));
      P(pxButton(this, 650, 540, 270, 56, t('review.knew'), () => this.know(true), { primary: true, size: 12 }));
      P(txt(this, 360, 604, t('review.leitnerNote'), { size: 19, color: S.muted, wrap: 560 }));
    }
    // Leitner boxes
    const counts = boxCounts(rv);
    P(panel(this, 970, 184, 286, 420, { fill: C.navy2, stroke: C.cyan, bw: 3 }));
    P(txt(this, 986, 200, t('review.leitner'), { font: 'title', size: 9, color: S.cyan }));
    const box = rv.boxes[this.c.id] || 1;
    [t('review.box1'), t('review.box2'), t('review.box3')].forEach((l, i) => {
      P(panel(this, 986, 228 + i * 122, 254, 104, { fill: C.navy, stroke: i + 1 === box ? C.gold : C.white, bw: 3 }));
      P(txt(this, 1000, 242 + i * 122, `BOX ${i + 1}`, { font: 'title', size: 10 }));
      P(txt(this, 1000, 268 + i * 122, l, { size: 22, color: S.muted }));
      P(txt(this, 1226, 270 + i * 122, String(counts[i]), { font: 'title', size: 24, color: S.gold, origin: [1, 0.5] }));
      P(txt(this, 1226, 304 + i * 122, counts[i] === 1 ? 'card' : 'cards', { size: 18, color: S.muted, origin: [1, 0.5] }));
    });
    say(this.flipped ? `${t('review.answer')}: ${a}. Press Y if you knew it, N if you didn't.` : `${t('review.question')}: ${q}. Press Space to flip.`);
  }
  flip() { if (this.format !== 'flashcards') return; this.flipped = !this.flipped; sfx(this, 'sfx-pickup'); this.drawCard(); }
  know(k) {
    if (!this.flipped) return;
    this.rv.boxes[this.c.id] = leitner(this.rv.boxes[this.c.id], k);
    saveGame();
    if (this.rv.idx < this.rv.concepts.length - 1) this.next(); else this.drawCard();
  }

  // ---------- 23a / 23b / 23c · questions ----------
  draw_questions() {
    this.answer = this.rv.practice[this.c.id] ?? null;
    this.pick = null;
    this.drawQ();
  }
  drawQ() {
    for (const o of this.qObjs || []) { try { o.destroy(); } catch (e) { /* gone */ } }
    this.qObjs = [];
    const P = (o) => { this.qObjs.push(o); this.layer.push(o); return o; };
    const [q, opts, ans, expl] = this.c.practice;
    P(txt(this, 40, 186, t('review.practice'), { font: 'title', size: 9, color: S.muted }));
    P(txt(this, 40, 208, q, { size: 32, wrap: 1180 }));
    const done = this.answer !== null;
    opts.forEach((o, i) => {
      const y = 270 + i * 74;
      let fill = C.navy, stroke = C.white;
      if (done && i === ans) { fill = 0x16502f; stroke = C.green; } else if (done && i === this.answer) { fill = 0x5a1f12; stroke = C.red; } else if (!done && i === this.pick) stroke = C.yellow;
      const r = P(this.add.rectangle(40, y, 820, 60, fill).setOrigin(0).setStrokeStyle(4, stroke));
      P(txt(this, 60, y + 30, LET[i], { font: 'title', size: 12, color: S.gold, origin: [0, 0.5] }));
      P(txt(this, 100, y + 30, o, { size: 24, origin: [0, 0.5] }));
      if (done && (i === ans || i === this.answer)) P(txt(this, 840, y + 30, i === ans ? '✓' : '✕', { size: 34, color: i === ans ? S.green : S.red, origin: [1, 0.5] }));
      if (!done) P(hotspot(this, 40, y, 820, 60, `${LET[i]}: ${o}`, () => { this.pick = i; this.check(); }));
      void r;
    });
    if (!done) {
      P(txt(this, 40, 500, t('review.pickHint'), { size: 22, color: S.muted }));
    } else {
      const right = this.answer === ans;
      const who = this.c.podcast[0] === 'science' || this.c.podcast[1] === 'science' ? 'science' : this.c.podcast[0];
      const msg = right ? `${t('review.correct')} ${expl}` : t('review.wrong', { PICK: opts[this.answer], RIGHT: opts[ans], WHY: expl });
      charBubble(this, 40, 492, 820, 130, who, msg, { portrait: 120, size: 21 }).objs.forEach(P);
      say(msg);
    }
    if (!done) say(`${q} ${opts.map((o, i) => `${LET[i]}: ${o}`).join('. ')}. Press A, B or C.`);
  }
  check() {
    if (this.pick === null || this.answer !== null) return;
    this.answer = this.pick; this.rv.practice[this.c.id] = this.pick; saveGame();
    sfx(this, this.pick === this.c.practice[2] ? 'sfx-place' : 'sfx-error');
    this.drawQ();
  }

  // ---------- 24 · text ----------
  draw_text() {
    const w1 = 590, w2 = 618;
    this.add2(panel(this, 24, 184, w1, 440, { fill: C.navy, stroke: C.gold, bw: 4 }));
    this.add2(txt(this, 44, 202, t('review.whatHappened'), { font: 'title', size: 10, color: S.gold }));
    const reason = reasonFor(this.c, this.mi);
    this.add2(txt(this, 44, 232, reason, { size: 28, wrap: w1 - 40 }));
    const rv = this.rv;
    const cat = this.c.category === 'bonus' ? '—' : `${content.review.categories[this.c.category]} ${rv.categories[this.c.category]}%`;
    const rows = [[t('review.category'), cat], [t('review.weakness'), this.c.category === 'bonus' ? '—' : `${rv.blocks[this.c.id]} / 5`], [t('review.stageLabel'), this.c.stage ? t('review.stage', { n: this.c.stage }) : this.c.seen]];
    rows.forEach(([k, v], i) => { this.add2(txt(this, 44, 420 + i * 52, k, { font: 'title', size: 8, color: S.muted })); this.add2(txt(this, 300, 414 + i * 52, v, { size: 26, color: S.cyan, wrap: 300 })); });
    this.add2(txt(this, 44, 588, t('review.yourNumbers'), { size: 19, color: S.muted }));
    this.add2(panel(this, 638, 184, w2, 440, { fill: C.navy, stroke: C.cyan, bw: 4 }));
    this.add2(txt(this, 658, 202, t('review.whyMatters'), { font: 'title', size: 10, color: S.cyan }));
    this.add2(txt(this, 658, 232, this.c.why, { size: 26, wrap: w2 - 40 }));
    this.add2(txt(this, 658, 588, `${t('review.source')}: ${this.c.source.replace(/^https?:\/\//, '').slice(0, 60)}`, { size: 18, color: S.muted }));
    this.add2(pxButton(this, 470, 644, 290, 56, t('review.sources'), () => openSources(this), { size: 12 }));
    say(`${t('review.whatHappened')} ${reason} ${t('review.whyMatters')} ${this.c.why}`);
  }

  // ---------- navigation ----------
  key(k) {
    const lk = k.toLowerCase();
    const n = Number(k); if (n >= 1 && n <= 5) { this.switchTo(FORMATS[n - 1]); return true; }
    if (k === 'ArrowRight' || lk === 'k') { this.next(); return true; }
    if (k === 'ArrowLeft') { this.prev(); return true; }
    if (this.format === 'flashcards') { if (k === ' ') { this.flip(); return true; } if (lk === 'y') { this.know(true); return true; } if (lk === 'n') { this.know(false); return true; } }
    if (this.format === 'questions' && this.answer === null) { const i = ['a', 'b', 'c'].indexOf(lk); if (i >= 0) { this.pick = i; this.check(); return true; } }
    if (this.format === 'podcast') { if (k === ' ') { this.podToggle(); return true; } if (lk === 's') { this.podStop(); this.script = !this.script; this.drawPod(); return true; } }
    if (k === 'Enter') { this.next(); return true; }
    return false;
  }

  switchTo(f) {
    if (f === this.format) return;
    stopVoice();
    // same concept, same progress: only the format changes (no history entry)
    replace(this, 'ReviewScene', { format: f }, { transition: 'fade' });
  }

  next() {
    const rv = this.rv;
    if (rv.idx < rv.concepts.length - 1) { rv.idx += 1; this.playing = false; this.draw(); return; }
    stopVoice();
    go(this, 'ReviewCheckScene', {}, { transition: 'fade' });
  }
  prev() { if (this.rv.idx > 0) { this.rv.idx -= 1; this.playing = false; this.draw(); } }
}
