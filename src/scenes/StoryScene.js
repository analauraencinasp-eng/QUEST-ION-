// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 3 · Story (4 slides, Storyboard · Screen 3). Typewriter text + narration, NEXT / ENTER advances,
// SKIP jumps to Screen 4. BIG mentor portrait next to the text box.
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, panel, img, mentorBar, dots, finishTyping } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { go } from '../router.js';

export default class StoryScene extends Phaser.Scene {
  constructor() { super('StoryScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar', { dim: 0.55 });
    this.i = 0;
    this.slides = content.story.slides;
    panel(this, 196, 110, 888, 338, { fill: 0x060914, stroke: C.white, bw: 4 });
    this.art = this.add.container(0, 0).setDepth(5);
    this.dots = null;
    this.mentor = mentorBar(this, 200, 498, 1056, 186, '', { portrait: 186, size: 30 });
    pxButton(this, 978, 24, 204, 60, t('story.skip'), () => this.finish(), { size: 12 });
    this.nextBtn = pxButton(this, 1064, 420, 184, 56, t('story.next'), () => this.next(), { primary: true, depth: 30, size: 16 });
    this.onKey = (k) => {
      if (k === 'Enter' || k === ' ' || k === 'ArrowRight') { this.next(); return true; }
      if (k === 'ArrowLeft' && this.i > 0) { this.i--; this.show(); return true; }
      if (k === 's' || k === 'S') { this.finish(); return true; }
      return false;
    };
    setup(this, data, { back: true, help: 'StoryScene', mission: false });
    this.show();
  }

  show() {
    const s = this.slides[this.i];
    if (this.dots) this.dots.destroy();
    this.dots = dots(this, 640, 52, this.slides.length, this.i, { past: true });
    this.art.removeAll(true);
    drawStoryArt(this, this.art, s.art, 200, 114, 880, 330);
    this.mentor.set(s.text, { lineId: s.id });
    this.nextBtn.setLabel(this.i === this.slides.length - 1 ? t('story.start') : t('story.next'));
  }

  next() {
    if (finishTyping(this.mentor.body)) return;
    if (this.i < this.slides.length - 1) { this.i++; this.show(); } else this.finish();
  }

  finish() { go(this, 'DestinationScene', {}, { transition: 'dither' }); }
}

// Simple pixel illustrations drawn in code (Figma: "Illustration (art TBD)").
export function drawStoryArt(scene, cont, kind, x, y, w, h) {
  const g = scene.add.graphics();
  cont.add(g);
  const px = (cx, cy, s, col) => { g.fillStyle(col, 1); g.fillRect(Math.round(cx), Math.round(cy), s, s); };
  g.fillStyle(0x0a0f2a, 1); g.fillRect(x, y, w, h);
  for (let i = 0; i < 70; i++) px(x + ((i * 97) % w), y + ((i * 53) % (h - 20)), (i % 5 === 0) ? 4 : 2, 0xcfd8ff);
  if (kind === 'rooftop') {
    g.fillStyle(0x161c38, 1); g.fillRect(x, y + h - 80, w, 80);                     // rooftops
    for (let i = 0; i < 9; i++) { g.fillRect(x + i * 100, y + h - 110 - (i % 3) * 18, 70, 40 + (i % 3) * 18); }
    g.fillStyle(0xf6d77a, 1); for (let i = 0; i < 12; i++) g.fillRect(x + 20 + i * 70, y + h - 90 + (i % 2) * 12, 8, 8);
    // teen silhouette
    g.fillStyle(0x05070f, 1); g.fillRect(x + 300, y + h - 160, 24, 26); g.fillRect(x + 292, y + h - 134, 40, 54);
    // Jupiter shining
    g.fillStyle(0xffe9b0, 0.25); g.fillCircle(x + 640, y + 90, 34);
    g.fillStyle(0xe9c9a0, 1); g.fillCircle(x + 640, y + 90, 16);
    g.fillStyle(0xc0896a, 1); g.fillRect(x + 626, y + 84, 28, 3); g.fillRect(x + 626, y + 94, 28, 3);
  } else if (kind === 'questions') {
    const planets = [[x + 190, 0xd9a877, 70, 'JUPITER'], [x + 440, 0xe8eef2, 46, 'EUROPA'], [x + 690, 0xc1440e, 56, 'MARS']];
    for (const [cx, col, r, name] of planets) {
      g.fillStyle(col, 1); g.fillCircle(cx, y + 190, r);
      if (name === 'JUPITER') { g.fillStyle(0xa0623f, 1); g.fillRect(cx - r, y + 170, r * 2, 8); g.fillRect(cx - r, y + 200, r * 2, 8); g.fillStyle(0xc0392b, 1); g.fillCircle(cx + 20, y + 210, 10); }
      if (name === 'EUROPA') { g.lineStyle(2, 0xa0846a, 1); g.lineBetween(cx - 30, y + 170, cx + 25, y + 205); g.lineBetween(cx - 10, y + 160, cx + 30, y + 185); }
      g.fillStyle(0xffffff, 1); g.fillRect(cx + r - 10, y + 60, 64, 52); g.fillTriangle(cx + r, y + 112, cx + r + 16, y + 112, cx + r - 6, y + 128);
      cont.add(txt(scene, cx + r + 22, y + 86, '?', { font: 'title', size: 30, color: S.navy, origin: 0.5 }));
      cont.add(txt(scene, cx, y + 190 + r + 22, name, { font: 'title', size: 12, color: S.cyan, origin: 0.5 }));
    }
  } else if (kind === 'blueprint') {
    g.fillStyle(0x0b2a5c, 1); g.fillRect(x + 140, y + 30, 600, 230);
    g.lineStyle(1, 0x3c6fb5, 0.6);
    for (let i = 0; i <= 600; i += 20) g.lineBetween(x + 140 + i, y + 30, x + 140 + i, y + 260);
    for (let j = 0; j <= 230; j += 20) g.lineBetween(x + 140, y + 30 + j, x + 740, y + 30 + j);
    for (let k = 0; k <= 5; k++) { const im = img(scene, x + 440, y + 145, `ship-${k}`, { scale: 1 }); cont.add(im); }
    g.fillStyle(0x05070f, 1);
    for (let i = 0; i < 5; i++) { g.fillRect(x + 160 + i * 130, y + h - 70, 26, 26); g.fillRect(x + 152 + i * 130, y + h - 44, 42, 44); }
  } else if (kind === 'pad') {
    g.fillStyle(0x2e6fd8, 1); g.fillCircle(x + w / 2, y + h + 520, 600);           // Earth behind
    g.fillStyle(0x3fae5a, 1); g.fillRect(x + 120, y + h - 60, 120, 14); g.fillRect(x + 560, y + h - 70, 160, 16);
    g.fillStyle(0x6b7280, 1); g.fillRect(x + 330, y + h - 26, 220, 14);
    cont.add(img(scene, x + 400, y + h - 26, 'launch-tower', { origin: [0.5, 1], scale: 0.62 }));
    cont.add(img(scene, x + 470, y + h - 26, 'rocket', { origin: [0.5, 1], scale: 1.05 }));
  }
}
