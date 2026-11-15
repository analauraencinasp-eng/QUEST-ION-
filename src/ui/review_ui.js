// review_ui.js — pieces shared by the learning-review screens (17–26, 15-R):
// character portrait (original PNGs, cropped, scale 1 = no resampling), dialogue bubble with portrait,
// vermilion weakness blocks (with a number, never colour only) and the shared REVIEW BAR with format tabs.
import { C, S } from './theme.js';
import { txt, panel, pxButton } from './widgets.js';
import { content } from '../content.js';
import { conceptById } from '../review.js';

export const WHO = { systems: 'SYSTEMS · DIRECTOR', engineer: 'ENGINEER', science: 'SCIENTIST', comms: 'COMMUNICATION' };
export const FORMAT_LABEL = { visual: 'VISUAL', podcast: 'PODCAST', flashcards: 'FLASHCARDS', questions: 'QUESTIONS', text: 'TEXT' };

// head-and-shoulders crop of a 240×306 character PNG, drawn at scale 1
export function portrait(scene, x, y, size, key, o = {}) {
  const objs = [];
  objs.push(panel(scene, x, y, size, size, { fill: C.portrait, stroke: o.stroke ?? C.white, bw: o.bw ?? 4, depth: o.depth ?? 15 }));
  if (scene.textures.exists(key)) {
    const inner = size - 8;
    const im = scene.add.image(x + 4, y + 4, key).setOrigin(0).setDepth((o.depth ?? 15) + 1);
    const cx = Math.max(0, Math.round((im.width - inner) / 2));
    im.setCrop(cx, 2, Math.min(inner, im.width), Math.min(inner, im.height));
    im.x = x + 4 - cx; im.y = y + 4 - 2;
    if (o.alpha !== undefined) im.setAlpha(o.alpha);
    objs.push(im);
  }
  return objs;
}

export function charBubble(scene, x, y, w, h, who, text, o = {}) {
  const depth = o.depth ?? 15;
  const ps = o.portrait ?? Math.min(h, 120);
  const objs = [];
  objs.push(panel(scene, x, y, w - ps - 14, h, { fill: C.bubble, stroke: C.ink, bw: 4, depth }));
  objs.push(txt(scene, x + 14, y + 10, WHO[who] || who.toUpperCase(), { font: 'title', size: 9, color: S.mentor, depth: depth + 1 }));
  const body = txt(scene, x + 14, y + 30, text, { size: o.size || 22, color: S.ink, wrap: w - ps - 42, lineSpacing: 0, depth: depth + 1 });
  objs.push(body);
  objs.push(...portrait(scene, x + w - ps, y + h - ps, ps, who, { depth }));
  return { objs, body, destroy() { objs.forEach((ob) => ob.destroy()); } };
}

export function weakBlocks(scene, x, y, n, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 16);
  const s = o.size || 16;
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i < n ? (o.color ?? C.red) : 0x2a3358, 1); g.fillRect(x + i * (s + 4), y, s, s);
    g.lineStyle(2, C.white, 1); g.strokeRect(x + i * (s + 4), y, s, s);
  }
  return g;
}

// the shared review bar: concept n of N · title · category score · progress blocks · format tabs (1–5)
export function reviewBar(scene, review, format, onTab) {
  const objs = [];
  const c = conceptById(review.concepts[review.idx]);
  const cats = content.review.categories;
  objs.push(panel(scene, 24, 84, 1232, 80, { fill: C.navy2, stroke: C.cyan, bw: 3, depth: 20 }));
  objs.push(txt(scene, 44, 112, `CONCEPT ${review.idx + 1} OF ${review.concepts.length}`, { font: 'title', size: 9, color: S.cyan, origin: [0, 0.5], depth: 21 }));
  const catTxt = c.category === 'bonus' ? 'BONUS' : `${cats[c.category]} ${review.categories[c.category]}%`;
  objs.push(txt(scene, 44, 140, `${c.title} · ${catTxt}`, { size: 24, origin: [0, 0.5], depth: 21 }));
  const g = scene.add.graphics().setDepth(21); objs.push(g);
  review.concepts.forEach((id, i) => {
    const done = review.seen[id] && Object.keys(review.seen[id]).length;
    g.fillStyle(done ? C.gold : 0x2a3358, 1); g.fillRect(250 + i * 22, 104, 16, 16); g.lineStyle(2, C.white, 1); g.strokeRect(250 + i * 22, 104, 16, 16);
  });
  const tabs = ['visual', 'podcast', 'flashcards', 'questions', 'text'];
  tabs.forEach((f, i) => {
    const b = pxButton(scene, 600 + i * 128, 100, 120, 48, `${i + 1} ${FORMAT_LABEL[f]}`, () => onTab(f), { size: 8, primary: f === format, depth: 22 });
    objs.push(b);
  });
  return { objs, destroy() { objs.forEach((ob) => ob.destroy()); } };
}
