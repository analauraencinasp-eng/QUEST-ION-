// Screen 2 · Choose astronaut (+ 2b Role info). Same solar-system background (dimmed), astronauts
// from the waist up, "(i) info" under each role, yellow border + P1 ✓ on the chosen one.
// 4 PLAYERS: P1..P4 each pick a different role (visual only for now). BIG mentor portrait at the bottom.
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg, panel, img, link, hotspot, mentorBar, chip } from '../ui/widgets.js';
import { setup, openModal, mButton, mText } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const CARD = { x: 76, y: 197, w: 264, h: 300, step: 288 };

export default class RoleScene extends Phaser.Scene {
  constructor() { super('RoleScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar', { dim: 0.45 });
    txt(this, 640, 52, t('role.title'), { font: 'title', size: 30, color: S.gold, origin: 0.5, shadow: 4 });
    txt(this, 640, 86, t('role.sub'), { size: 22, origin: 0.5 });
    const mi = state.mission;
    this.four = mi.mode === '4p';
    this.picks = this.four ? { ...(mi.roles4 || {}) } : {};
    this.selected = this.four ? null : mi.role;
    this.cards = {};
    content.roles.roles.forEach((r, i) => this.drawCard(r, CARD.x + i * CARD.step, CARD.y));
    this.mentor = mentorBar(this, 236, 566, 740, 128, this.four ? t('role.mentor4') : t('role.mentor'), { portrait: 128 });
    this.confirm = pxButton(this, 998, 600, 240, 60, t('role.confirm'), () => this.done(), { primary: true });
    this.refresh();
    this.onKey = (k) => {
      const ids = content.roles.roles.map((r) => r.id);
      let i = Math.max(0, ids.indexOf(this.cursor || this.selected || ids[0]));
      if (k === 'ArrowRight' || k === 'd') { this.cursor = ids[(i + 1) % 4]; this.hover(this.cursor); return true; }
      if (k === 'ArrowLeft' || k === 'a') { this.cursor = ids[(i + 3) % 4]; this.hover(this.cursor); return true; }
      if (k === 'i' || k === 'I') { this.info(this.cursor || ids[0]); return true; }
      if ((k === 'Enter' || k === ' ') && this.cursor && !this.isPicked(this.cursor)) { this.pick(this.cursor); return true; }
      if (k === 'Enter') { this.done(); return true; }
      return false;
    };
    setup(this, data, { back: true, help: 'RoleScene', mission: false });
  }

  drawCard(r, x, y) {
    const box = this.add.graphics();
    const portrait = this.add.rectangle(x + 16, y + 16, CARD.w - 32, 196, 0x23294a).setOrigin(0);
    const im = img(this, x + CARD.w / 2, y + 16, r.art, { origin: [0.5, 0] });
    if (im.setCrop) { im.setCrop(0, 0, 240, 210); im.setScale(0.93); }
    const name = txt(this, x + CARD.w / 2, y + 236, r.short && r.name.length > 10 ? r.name : r.name, { font: 'title', size: 16, origin: 0.5 });
   /* const bonus = chip(this, x + 16, y + 30, r.bonus, { fill: C.gold, size: 9 });
    bonus.r.setVisible(false); bonus.t.setVisible(false);
    const badge = txt(this, x + CARD.w - 18, y + 30, '', { font: 'title', size: 12, color: S.navy, origin: [1, 0.5] });
    const badgeBg = this.add.rectangle(x + CARD.w - 12, y + 30, 70, 26, C.yellow).setOrigin(1, 0.5);
    badge.setDepth(5); badgeBg.setDepth(4); */
    // hover/focus covers the WHOLE card and the ring sits exactly on the card border
    hotspot(this, x, y, CARD.w, CARD.h, `r.name`, () => this.pick(r.id), { onFocus: () => { this.cursor = r.id; }, ringRect: [x + 2, y + 2, CARD.w - 4, CARD.h - 4] });
    link(this, x + CARD.w / 2, y + 270, t('role.info'), () => this.info(r.id));
    this.cards[r.id] = { box, x, y, portrait, im, name }; 
  }

  isPicked(id) { return this.four ? Object.values(this.picks).includes(id) : this.selected === id; }

  hover(id) { say(content.roles.roles.find((r) => r.id === id).name); this.refresh(); }

  pick(id) {
    if (this.four) {
      if (Object.values(this.picks).includes(id)) {           // tap again to un-pick
        for (const p of Object.keys(this.picks)) if (this.picks[p] === id) delete this.picks[p];
      } else {
        const next = ['P1', 'P2', 'P3', 'P4'].find((p) => !this.picks[p]);
        if (!next) return;
        this.picks[next] = id;
      }
    } else this.selected = id;
    sfx(this, 'sfx-place');
    const r = content.roles.roles.find((x) => x.id === id);
    say(`say(r.name)`);
    this.refresh();
  }

  refresh() {
    for (const r of content.roles.roles) {
      const c = this.cards[r.id];
      const player = this.four ? Object.keys(this.picks).find((p) => this.picks[p] === r.id) : (this.selected === r.id ? 'P1' : null);
      const sel = !!player;
      c.box.clear();
      c.box.fillStyle(C.navy2, 0.95); c.box.fillRect(c.x, c.y, CARD.w, CARD.h);
      c.box.lineStyle(sel ? 6 : 4, sel ? C.yellow : (this.cursor === r.id ? C.cyan : 0x4a5583), 1);
      c.box.strokeRect(c.x, c.y, CARD.w, CARD.h);
     /* c.badge.setText(sel ? `${player} ✓` : ''); c.badgeBg.setVisible(sel);
      c.bonus.r.setVisible(sel || this.showBonus); c.bonus.t.setVisible(sel || this.showBonus);
    */}
    const ready = this.four ? Object.keys(this.picks).length === 4 : !!this.selected;
    this.confirm.setDisabled(!ready);
  }

  info(id) {
    const r = content.roles.roles.find((x) => x.id === id);
    this.showBonus = true; this.refresh();
    const md = openModal(this, r.name, { w: 760, h: 440, x: 260, y: 120 });
    md.add(img(this, 360, 330, r.art, { w: 160, h: 204 }));
    mText(this, md, 460, 190, r.desc, { size: 26, wrap: 520 });
    mText(this, md, 460, 300, t('role.inMission'), { font: 'title', size: 12, color: S.cyan });
    mText(this, md, 460, 324, r.inMission.map((s) => '• ' + s).join('\n'), { size: 23, wrap: 520 });
    mButton(this, md, 300, 480, 340, 56, t('role.choose', { ROLE: r.name }), () => { md.close(); this.pick(r.id); }, { primary: true, size: 13 });
    say(`${r.name}. ${r.desc} ${r.inMission.join('. ')}`);
  }

  done() {
    const mi = state.mission;
    if (this.four) {
      if (Object.keys(this.picks).length < 4) { say(t('role.pickFirst')); sfx(this, 'sfx-error'); return; }
      mi.roles4 = { ...this.picks }; mi.role = this.picks.P1;
    } else {
      if (!this.selected) { say(t('role.pickFirst')); sfx(this, 'sfx-error'); return; }
      mi.role = this.selected;
    }
    const r = content.roles.roles.find((x) => x.id === mi.role);
    logEvent(`Crew: ${this.four ? Object.entries(mi.roles4).map(([p, id]) => `${p} ${id}`).join(', ') : r.name} (bonus: ${r.bonus}).`, 'crew');
    go(this, data_next(this), {}, { transition: 'fade' });
  }
}

// after the first pass the story is skipped when coming back (e.g. "change crew" from the summary)
function data_next(scene) { return scene.routeData && scene.routeData.returnTo ? scene.routeData.returnTo : 'StoryScene'; }
