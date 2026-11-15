// Screens 13e-1.1 … 13e-1.6 (how the real rovers studied rocks) and 14f-1.1 … 14f-1.6 (what they discovered).
// One card per slide: STEP n + title, text, WHY IT MATTERS box, optional REAL box, progress dots, mentor line.
// data = { set: 'rockstudy' | 'discoveries', i }. NEXT on the last slide → QuizGateScene with the matching quiz.
// Every text and source_url lives in data/content/context_<set>.json.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, dots, fit } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { go, back } from '../router.js';
import { pixelIcon } from '../ui/icons.js';
import { say } from '../a11y.js';

const SETS = { rockstudy: 'context_rockstudy', discoveries: 'context_discoveries' };

export default class SlidesScene extends Phaser.Scene {
  constructor() { super('SlidesScene'); }

  create(data) {
    fresh(this);
    this.set = SETS[data.set] ? data.set : 'rockstudy';
    this.deck = content[SETS[this.set]];
    this.i = Math.max(0, Math.min(this.deck.slides.length - 1, data.i || 0));
    img(this, 0, 0, 'bg-meridiani', { origin: 0, w: W, h: H });
    this.add.rectangle(0, 0, W, H, C.space, 0.35).setOrigin(0);
    const dt = txt(this, 640, 18, this.deck.title, { font: 'title', size: 20, color: S.gold, origin: [0.5, 0], shadow: 3 });
    txt(this, 640, dt.y + dt.height + 6, this.deck.sub.text, { size: 23, color: S.cyan, origin: [0.5, 0], align: 'center', wrap: 1180 });
    this.layer = this.add.container(0, 0);
    this.backBtn = pxButton(this, 24, 640, 200, 60, t('slides.back'), () => this.prev(), { size: 16 });
    this.nextBtn = pxButton(this, 1016, 640, 240, 60, '', () => this.next(), { primary: true });
    this.onKey = (k) => {
      if (k === 'ArrowRight' || k === 'Enter') { this.next(); return true; }
      if (k === 'ArrowLeft') { this.prev(); return true; }
      return false;
    };
    setup(this, { ...data, i: this.i }, { back: false, help: 'SlidesScene', helpPos: [240, 640], esc: () => this.prev() });
    this.draw();
  }

  draw() {
    this.layer.removeAll(true);
    if (this.mentor) this.mentor.destroy();
    const s = this.deck.slides[this.i], n = this.deck.slides.length;
    const add = (o) => { this.layer.add(o); return o; };
    const x = 130, y = 116, w = 1020, tx = x + 200, tw = w - 230;
    // measure the texts first, so the card grows to fit them (text size L)
    const body = fit(txt(this, tx, y + 70, s.text, { size: 24, wrap: tw, lineSpacing: 2 }), tw, 210, 16);
    const why = txt(this, tx + 16, 0, s.why, { size: 22, wrap: tw - 32, lineSpacing: 0 });
    const real = s.real ? txt(this, tx + 16, 0, s.real.text, { size: 22, wrap: tw - 32, lineSpacing: 0 }) : null;
    let yy = Math.max(body.y + body.height, y + 70) + 14;
    const whyBox = { y: yy, h: why.height + 44 }; why.y = yy + 32; yy += whyBox.h + 10;
    let realBox = null;
    if (real) { realBox = { y: yy, h: real.height + 44 }; real.y = yy + 32; yy += realBox.h + 10; }
    const h = Math.max(250, Math.min(470, yy - y + 6));
    add(panel(this, x, y, w, h, { fill: C.blueCard, stroke: C.blueBorder, bw: 4, shadow: true }));
    add(panel(this, x + 24, y + 70, 150, 150, { fill: C.space, stroke: C.cyan, bw: 4 }));
    add(pixelIcon(this, s.icon, x + 43, y + 89, 112, 18));
    const step = txt(this, tx + 8, y + 30, `${this.deck.stepLabel} ${this.i + 1}`, { font: 'title', size: 10, color: S.navy, origin: [0, 0.5] });
    add(this.add.rectangle(tx, y + 30, step.width + 16, 26, C.cyan).setOrigin(0, 0.5));
    add(step);
    add(txt(this, step.x + step.width + 22, y + 30, s.title, { font: 'title', size: 16, color: S.white, origin: [0, 0.5] }));
    add(body);
    const box = (b, label, color, textObj) => {
      add(panel(this, tx, b.y, tw, b.h, { fill: C.space, stroke: color, bw: 3 }));
      add(txt(this, tx + 16, b.y + 10, label, { font: 'title', size: 8, color: color === C.gold ? S.gold : S.green }));
      add(textObj);
    };
    box(whyBox, t('slides.why'), C.gold, why);
    if (realBox) box(realBox, s.real.title, C.green, real);
    add(dots(this, 620, y + h + 22, n, this.i, { past: true, wideActive: true }));
    add(txt(this, 640 + (n * 22) / 2 + 20, y + h + 29, `${this.i + 1} / ${n}`, { font: 'title', size: 10, color: S.text, origin: [0, 0.5] }));
    this.mentor = mentorBar(this, 24, 540, 560, 90, '', { portrait: 86, size: 21, depth: 30 });
    this.mentor.set(s.mentor, { silent: true });
    this.nextBtn.setLabel(this.i === n - 1 ? t('slides.toQuestion') : t('slides.next'));
    this.routeData = { set: this.set, i: this.i };
    say(`${this.deck.stepLabel} ${this.i + 1} of ${n}. ${s.title}. ${s.text} ${t('slides.why')}: ${s.why}${s.real ? ` ${s.real.title}: ${s.real.text}` : ''} ${s.mentor}`);
  }

  next() {
    if (this.i < this.deck.slides.length - 1) { this.i += 1; this.draw(); return; }
    go(this, 'QuizGateScene', { quiz: this.deck.quizScene }, { transition: 'fade' });
  }

  prev() {
    if (this.i > 0) { this.i -= 1; this.draw(); return; }
    back(this);
  }
}
