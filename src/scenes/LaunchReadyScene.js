// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 12.5 · Ready for launch (how a launch works) + the liftoff transition to Screen 13.
// Card on a dimmed launch pad: HOW A LAUNCH WORKS (3 facts from launch_facts.json, each with its official source),
// REAL MISSION box, mentor line, ◀ ORBIT / START LAUNCH ▶.
// Liftoff (prompt §11): countdown, camera shake, pixel smoke, the rocket leaves the frame → Screen 13 (meteors).
// With "Reduce motion & flashes": no shake and no smoke, just a fade.
import { C, S, W, H, minSize } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, fit } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { back, replace } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const ICON = { window: 'icon-rocket', maxq: 'icon-bolt', escape: 'icon-earth' };

export default class LaunchReadyScene extends Phaser.Scene {
  constructor() { super('LaunchReadyScene'); }

  create(data) {
    fresh(this);
    this.launching = false;
    const lf = content.launch_facts;
    this.add.rectangle(0, 0, W, H, 0x10173a).setOrigin(0);
    img(this, 0, 0, 'bg-sky', { origin: 0, w: W, h: H });
    // ground + pad (Figma 12.5: green ground, dark pad under the rocket)
    this.add.rectangle(0, 652, W, 68, 0x2f6b3a).setOrigin(0).setDepth(1);
    this.add.rectangle(0, 652, W, 6, 0x3f8a4a).setOrigin(0).setDepth(1);
    [[40, 624], [190, 630], [1010, 626], [1160, 630]].forEach(([bx, by]) => this.add.rectangle(bx, by, 74, 28, 0x1f4d2a).setOrigin(0).setDepth(1));
    this.add.rectangle(150, 648, 260, 14, 0x3a4152).setOrigin(0).setDepth(2);
    this.tower = img(this, 120, 172, 'launch-tower', { origin: 0, depth: 2 });
    this.rocket = this.add.container(300, 540).setDepth(4);
    this.rocket.add(img(this, 0, 0, 'rocket', {}));
    this.flame = img(this, 0, 150, 'flame', { depth: 3 }).setVisible(false);
    this.rocket.add(this.flame);
    this.dimmer = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(5);
    // T-10 box + title
    this.countBox = panel(this, 24, 22, 116, 46, { fill: 0x0b0f26, stroke: C.red, bw: 3, depth: 20 });
    this.count = txt(this, 82, 46, 'T-10', { font: 'title', size: 18, color: S.red, origin: 0.5, depth: 21 });
    this.ui = [];
    const u = (o) => { this.ui.push(o); return o; };
    u(txt(this, 640, 38, t('launchReady.title'), { font: 'title', size: 26, color: S.gold, origin: 0.5, shadow: 3, depth: 20 }));
    u(txt(this, 640, 76, t('launchReady.sub'), { size: 23, origin: 0.5, depth: 20 }));
    // card
    const cx = 318, cy = 104, cw = 644;
    const card = u(this.add.graphics().setDepth(20));
    u(txt(this, cx + 18, cy + 22, t('launchReady.how'), { font: 'title', size: 11, color: S.gold, origin: [0, 0.5], depth: 21 }));
    // facts: build every text first, then shrink them TOGETHER (1 px at a time, never below the readable
    // floor) until the card leaves room for the mentor above the buttons. Same size for every fact.
    const rows = lf.facts.map((f) => ({
      f,
      title: u(txt(this, cx + 82, 0, f.title, { font: 'title', size: 8, color: S.cyan, depth: 21 })),
      body: u(txt(this, cx + 82, 0, f.text, { size: 21, wrap: cw - 100, depth: 21, lineSpacing: 0 }))
    }));
    const realT = txt(this, cx + 28, 0, lf.real.text, { size: 21, wrap: cw - 64, depth: 22, lineSpacing: 0 });
    const bodies = [...rows.map((r) => r.body), realT];
    const MAX_BOTTOM = 646 - 8 - 96 - 12;         // buttons top − gap − mentor height − gap
    const layout = () => {
      let yy = cy + 40;
      for (const r of rows) { r.top = yy; r.title.setY(yy + 4); r.body.setY(yy + 4 + r.title.height + 4); yy += Math.max(58, r.title.height + 8 + r.body.height) + 6; }
      return yy + 2 + realT.height + 34 + 14;
    };
    for (let guard = 0; layout() > MAX_BOTTOM && guard < 24; guard++) {
      let shrunk = false;
      for (const b2 of bodies) { const size = parseInt(b2.style.fontSize, 10); if (size > minSize('body')) { b2.setFontSize(size - 1); shrunk = true; } }
      if (!shrunk) break;
    }
    layout();
    for (const r of rows) {
      u(this.add.rectangle(cx + 18, r.top + 4, 50, 50, 0x1d3a6e).setOrigin(0).setStrokeStyle(3, C.blueBorder).setDepth(21));
      u(img(this, cx + 43, r.top + 29, ICON[r.f.id] || 'icon-rocket', { w: 32, h: 32, depth: 22 }));
    }
    const last = rows[rows.length - 1];
    const y = last.top + Math.max(58, last.title.height + 8 + last.body.height) + 6;
    // real mission box
    const ry = y + 2, rh = realT.height + 34;
    u(this.add.rectangle(cx + 16, ry, cw - 32, rh, 0x0b0f26).setOrigin(0).setStrokeStyle(2, C.gold).setDepth(21));
    u(txt(this, cx + 28, ry + 12, t('launchReady.real'), { font: 'title', size: 8, color: S.gold, origin: [0, 0.5], depth: 22 }));
    u(realT.setY(ry + 26));
    const ch = ry + rh + 14 - cy;
    card.fillStyle(0x000000, 0.9); card.fillRect(cx + 6, cy + 6, cw, ch);
    card.fillStyle(0x10173a, 1); card.fillRect(cx, cy, cw, ch); card.lineStyle(4, C.gold, 1); card.strokeRect(cx + 2, cy + 2, cw - 4, ch - 4);
    this.cardBottom = cy + ch;
    // mentor + buttons
    const o = state.mission.orbit;
    const orbitLine = o.reached ? ` Your trajectory: launch ${o.launchDate}, ${o.travelDays} days to Mars.` : '';
    u(mentorBar(this, 368, Math.min(Math.max(480, this.cardBottom + 12), 646 - 8 - 96), 544, 96, t('launchReady.mentor'), { portrait: 86, size: 21, depth: 20, silent: true }));
    this.backBtn = pxButton(this, 690, 646, 220, 60, t('launchReady.orbit'), () => back(this), { size: 14, depth: 30 });
    this.goBtn = pxButton(this, 926, 646, 330, 60, t('launchReady.launch'), () => this.liftoff(), { primary: true, size: 16, depth: 30 });
    this.onKey = (k) => { if (k === 'Enter' || k === ' ') { this.liftoff(); return true; } return false; };
    setup(this, data, { back: false, help: 'LaunchReadyScene', esc: () => back(this) });
    say(`${t('launchReady.title')}. ${t('launchReady.sub')} ${lf.facts.map((f) => `${f.title}. ${f.text}`).join(' ')} ${t('launchReady.real')}: ${lf.real.text} ${t('launchReady.mentor')}${orbitLine} Press Enter to launch.`);
  }

  liftoff() {
    if (this.launching) return;
    this.launching = true;
    const reduce = state.settings.reduceMotion;
    logEvent('Liftoff!', 'launch');
    // hide the card and buttons, show the pad
    this.ui.forEach((o) => { try { o.destroy(); } catch (e) { /* ignore */ } });
    [this.backBtn, this.goBtn].forEach((b) => b.destroy());
    this.focusables = []; this.focused = null;
    this.tweens.add({ targets: this.dimmer, alpha: 0, duration: 300 });
    sfx(this, 'sfx-launch');
    const done = () => replace(this, 'MeteorScene', {}, { transition: 'fade' });   // no way back to the pad mid-launch
    if (reduce) {
      this.count.setText('T-0'); say('Liftoff!');
      this.time.delayedCall(700, done);
      return;
    }
    let n = 5;
    this.count.setText(`T-${n}`);
    say('5, 4, 3, 2, 1. Liftoff!');
    this.time.addEvent({ delay: 260, repeat: 4, callback: () => { n -= 1; this.count.setText(`T-${n}`); } });
    this.time.delayedCall(1400, () => {
      this.flame.setVisible(true);
      this.cameras.main.shake(1400, 0.008);
      // pixel smoke puffs
      for (let i = 0; i < 26; i++) {
        const puff = this.add.rectangle(300 + (Math.random() - 0.5) * 60, 650, 18 + (i % 3) * 8, 18 + (i % 3) * 8, 0xdfe6ee, 0.9).setDepth(3);
        this.tweens.add({ targets: puff, x: puff.x + (i % 2 ? 1 : -1) * (60 + i * 9), y: 640 - (i % 5) * 14, alpha: 0, scale: 2.2, duration: 1300, delay: i * 30 });
      }
      this.tweens.add({ targets: this.rocket, y: -260, duration: 1700, ease: 'Quad.easeIn', onComplete: done });
      this.tweens.add({ targets: this.flame, scaleY: { from: 0.8, to: 1.3 }, duration: 90, yoyo: true, repeat: 16 });
    });
  }
}
