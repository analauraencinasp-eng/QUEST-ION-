// Screens 16-0b / 16 · Talking to Earth. Diagram Earth — Sun — Mars with the orbiter relay and the
// 3 DSN sites; "WHY IT MATTERS" card with 3 facts (comms.json → talk.cards, each with source_url).
// The one-way light delay is computed from the REAL Earth/Mars positions (JPL Horizons ephemeris)
// on the day your rover is talking: arrival date + 30 days (or Opportunity's landing day as a fallback).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { go } from '../router.js';
import { lightMinutes } from '../orbit.js';
import { say } from '../a11y.js';

// ephemeris day the rover talks to Earth (pure → tested)
export function talkDay(mi, eph) {
  const n = eph.bodies.earth.length;
  const start = Date.parse(`${eph.start}T00:00:00Z`);
  const iso = mi.orbit && mi.orbit.arrivalDate ? mi.orbit.arrivalDate : '2004-01-25';   // Opportunity landed 25 Jan 2004
  const day = Math.round((Date.parse(`${iso}T00:00:00Z`) - start) / 86400000) + (mi.orbit && mi.orbit.arrivalDate ? 30 : 0);
  return Math.max(0, Math.min(n - 1, day));
}

export function delayMinutes(mi) {
  const eph = content.ephemeris;
  if (!eph || !eph.bodies) return null;
  return Math.round(lightMinutes(eph, talkDay(mi, eph)));
}

export default class TalkScene extends Phaser.Scene {
  constructor() { super('TalkScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    this.delay = delayMinutes(mi);
    mi.signal.delayMin = this.delay;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    const sg = this.add.graphics(); sg.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 140; i++) sg.fillRect((i * 97) % W, (i * 53 + (i % 7) * 31) % H, 2, 2);
    txt(this, 640, 40, t('talk.title'), { font: 'title', size: 26, color: S.gold, origin: 0.5, shadow: 3 });
    txt(this, 640, 82, t('talk.sub'), { size: 24, origin: 0.5 });
    // diagram
    const ey = 400;
    img(this, 240, ey, 'icon-earth', { w: 140, h: 140 });
    txt(this, 240, ey + 86, t('talk.earth'), { font: 'title', size: 10, color: S.cyan, origin: 0.5 });
    for (let i = 0; i < 3; i++) img(this, 200 + i * 40, ey + 120, 'icon-antenna', { w: 26, h: 26 });
    const dsn = txt(this, 240, ey + 140, t('talk.dsn'), { size: 20, color: S.muted, origin: [0.5, 0] });
    txt(this, 240, dsn.y + dsn.height, t('talk.dsnSites'), { size: 20, color: S.muted, origin: [0.5, 0] });
    const sun = this.add.graphics(); sun.fillStyle(0xf0c040, 1); sun.fillCircle(640, ey, 34); sun.fillStyle(0xffe08a, 1); sun.fillCircle(632, ey - 8, 14);
    txt(this, 640, ey + 50, t('talk.sun'), { font: 'title', size: 9, color: S.gold, origin: 0.5 });
    img(this, 1040, ey, 'planet-mars-big', { w: 140, h: 140 });
    txt(this, 1040, ey + 86, t('talk.mars'), { font: 'title', size: 10, color: S.red, origin: 0.5 });
    const orb = this.add.graphics(); orb.lineStyle(2, C.green, 0.7); orb.strokeEllipse(1040, ey, 220, 120);
    const ox = 1140, oy = ey - 40;
    this.add.rectangle(ox, oy, 26, 16, 0xd8d8d8).setStrokeStyle(2, C.white);
    this.add.rectangle(ox - 24, oy, 18, 8, C.blueBorder); this.add.rectangle(ox + 24, oy, 18, 8, C.blueBorder);
    txt(this, ox + 50, oy - 30, `${t('talk.relay')}\n${t('talk.orbiter')}`, { font: 'title', size: 8, color: S.green });
    // dashed signal path (it bends above the Sun: the planets are not lined up through it)
    const dl = this.add.graphics(); dl.lineStyle(3, C.cyan, 1);
    for (let x = 320; x < 960; x += 24) { const y = ey - 110 * Math.sin(((x - 320) / 640) * Math.PI); dl.lineBetween(x, y, x + 12, ey - 110 * Math.sin(((x + 12 - 320) / 640) * Math.PI)); }
    const dtext = this.delay ? t('talk.delayReal', { MIN: this.delay }) : t('talk.signal');
    const dt = txt(this, 640, ey - 136, dtext, { font: 'title', size: 10, color: S.navy, origin: 0.5, depth: 6 });
    this.add.rectangle(640, ey - 136, dt.width + 20, 28, C.cyan).setDepth(5);
    this.cardObjs = [];
    this.infoBtn = pxButton(this, 400, 640, 300, 60, t('talk.info'), () => this.toggleCard(), { size: 16 });
    pxButton(this, 900, 640, 356, 60, t('talk.next'), () => this.next(), { primary: true });
    this.mentor = mentorBar(this, 400, 524, 580, 100, '', { portrait: 96, size: 22, depth: 30 });
    this.mentor.set(t('talk.mentor'), { silent: true });
    this.onKey = (k) => { if (k === 'Enter') { this.next(); return true; } if (k === 'i' || k === 'I') { this.toggleCard(); return true; } return false; };
    setup(this, data, { back: true, help: 'TalkScene' });
    say(`${t('talk.title')}. ${t('talk.sub')} ${dtext}. ${t('talk.mentor')} Press I for how it works, Enter for Signal Run.`);
    if (data.card) this.toggleCard();
  }

  toggleCard() {
    if (this.cardObjs.length) { this.cardObjs.forEach((o) => o.destroy()); this.cardObjs = []; this.mentor.set(t('talk.mentor'), { silent: true }); return; }
    const add = (o) => { this.cardObjs.push(o); return o; };
    const cards = content.comms.talk.cards;
    const x = 340, w = 600; let y = 128;
    const texts = cards.map((c) => [txt(this, x + 20, 0, c.title, { font: 'title', size: 9, color: S.cyan, depth: 41 }), txt(this, x + 20, 0, c.text, { size: 21, wrap: w - 40, lineSpacing: 0, depth: 41 })]);
    const h = 44 + texts.reduce((s, [a, b]) => s + a.height + b.height + 14, 0);
    add(panel(this, x, y, w, h, { fill: C.navy2, stroke: C.gold, bw: 4, shadow: true, depth: 40 }));
    add(txt(this, x + 20, y + 16, t('talk.why'), { font: 'title', size: 10, color: S.gold, depth: 41 }));
    let yy = y + 42;
    for (const [a, b] of texts) { a.y = yy; b.y = yy + a.height + 4; yy = b.y + b.height + 10; add(a); add(b); }
    say(cards.map((c) => `${c.title}. ${c.text}`).join(' '));
  }

  next() { go(this, 'SignalRunScene', {}, { transition: 'iris' }); }
}
