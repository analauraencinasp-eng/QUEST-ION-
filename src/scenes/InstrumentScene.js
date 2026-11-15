// Screens 11 / 11b · Instrument card (Pancam = MER part, PIXL = real alternative, same layout for all 14):
// name, ◀ n/14 ▶, chips of the 14 tables, origin mission, what it does / role / where it mounts,
// requirements it helps with, compatibility, SIMULATED cost/mass/energy, and the quick question
// (post-it "11a warehouse flow": 3 options, wrong → right answer + explanation and retry).
// Buttons (Figma): ◀ WAREHOUSE · ADD TO KIT ▶ · ASSEMBLE ▶ (opens when every requirement has an inspected tool).
import { C, S, W, H, minSize } from '../ui/theme.js';
import { fresh, txt, pxButton, img, panel, mentorBar, chip, hotspot, fit } from '../ui/widgets.js';
import { setup, openModal, mButton, mText } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { back, go } from '../router.js';
import { instrumentById, questionFor, computeMeters, requirementsCovered, kitWouldExceedBudget } from '../rules.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const COMPAT_COL = { yes: C.green, redesign: C.gold, offgoal: C.red };

export default class InstrumentScene extends Phaser.Scene {
  constructor() { super('InstrumentScene'); }

  create(data) {
    fresh(this);
    this.noAutoRead = true;          // the card speaks its own description + keys
    this.list = content.instruments.instruments;
    this.idx = Math.max(0, this.list.findIndex((i) => i.id === (data.inst || 'pancam')));
    this.add.rectangle(0, 0, W, H, 0x1b2233).setOrigin(0);
    img(this, 0, 0, 'bg-warehouse', { origin: 0, w: W, h: H });
    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);
    panel(this, 40, 24, 240, 36, { fill: 0x0b0f26, stroke: C.gold, bw: 3 });
    txt(this, 160, 42, t('card.title'), { font: 'title', size: 13, color: S.gold, origin: 0.5 });
    this.kitBox = this.add.graphics();
    this.kitText = txt(this, 52, 89, '', { size: 20, color: S.green, origin: [0, 0.5], wrap: 520 });
    this.mentor = mentorBar(this, 586, 14, 654, 116, '', { portrait: 116, size: 23 });
    panel(this, 80, 140, 1120, 512, { fill: 0x10173a, stroke: 0xc8a24a, bw: 4 });
    this.cont = this.add.container(0, 0);
    this.body = null;              // right-column boxes (rebuilt by buildBody)
    this.chips = [];
    pxButton(this, 190, 662, 284, 48, t('card.back'), () => back(this));
    this.packBtn = pxButton(this, 498, 662, 304, 48, t('card.pack'), () => this.togglePack(), { primary: true });
    this.asmBtn = pxButton(this, 826, 662, 264, 48, t('card.assemble'), () => this.assemble());
    this.onKey = (k) => {
      if (k === 'ArrowLeft') { this.show(this.idx - 1); return true; }
      if (k === 'ArrowRight') { this.show(this.idx + 1); return true; }
      if (k === 'p' || k === 'P') { this.togglePack(); return true; }
      if (k === 'q' || k === 'Q') { this.quiz(); return true; }
      return false;
    };
    setup(this, data, { back: false, menu: false, help: 'InstrumentScene', esc: () => back(this) });
    this.show(this.idx, true);
  }

  show(i, first = false) {
    this.idx = (i + this.list.length) % this.list.length;
    const ins = this.list[this.idx];
    this.routeData.inst = ins.id;                       // CONTINUE reopens this card
    if (!first) sfx(this, 'sfx-pickup');
    this.draw();
    const mi = state.mission.instruments;
    const helps = ins.helps.length ? `It helps with requirement ${ins.helps.join(' and ')}.` : 'It does not help with any of the 5 requirements.';
    say(`${ins.name}, from ${ins.origin}. ${ins.what} Where it mounts: ${ins.mountText}. ${helps} Compatibility: ${ins.compatText} `
      + `${mi.inspected[ins.id] ? 'Already inspected.' : 'Press Q to answer its quick question.'} Press P to ${mi.kit.includes(ins.id) ? 'remove it from' : 'add it to'} your kit. Left and right arrows: other instruments. Escape: back to the warehouse.`);
  }

  draw() {
    const ins = this.list[this.idx];
    const mi = state.mission, kit = mi.instruments.kit;
    this.cont.removeAll(true);
    this.chips.forEach((h) => { h.destroy(); this.focusables = this.focusables.filter((f) => f !== h); });
    this.chips = [];
    const add = (o) => { this.cont.add(o); return o; };
    // ---- YOUR KIT (top-left): never wider than the space before the mentor bubble ----
    add(txt(this, 52, 89, t('card.kit'), { font: 'title', size: 9, origin: [0, 0.5] }));
    const names = kit.map((id) => (instrumentById(id) || {}).short).filter(Boolean);
    let shown = names.length ? names.join(' · ') : '—';
    this.kitText.setText(shown).setX(156);
    for (let n = names.length - 1; this.kitText.width > 400 && n > 0; n--) {
      shown = `${names.slice(0, n).join(' · ')} +${names.length - n}`;
      this.kitText.setText(shown);
    }
    fit(this.kitText, 400, 30, 14);
    this.kitBox.clear(); this.kitBox.fillStyle(0x0b0f26, 1); this.kitBox.fillRect(40, 70, this.kitText.width + 130, 38);
    this.kitBox.lineStyle(3, C.white, 1); this.kitBox.strokeRect(40, 70, this.kitText.width + 130, 38);
    // ---- blueprint (left box 96..436): narrower than the Figma so the text column is wider and readable ----
    const g = add(this.add.graphics());
    g.fillStyle(0x0b2a5c, 1); g.fillRect(96, 156, 340, 480);
    g.lineStyle(1, 0x2f5f9e, 0.7);
    for (let x = 96; x <= 436; x += 20) g.lineBetween(x, 156, x, 636);
    for (let y = 156; y <= 636; y += 20) g.lineBetween(96, y, 436, y);
    g.lineStyle(4, C.cyan, 1); g.strokeRect(98, 158, 336, 476);
    add(fit(txt(this, 110, 174, ins.name, { font: 'title', size: 9, color: S.cyan, origin: [0, 0.5] }), 316));
    const [top, bottom] = ins.blueprint || ['', ''];
    add(fit(txt(this, 266, 206, top, { size: 22, color: S.cyan, origin: 0.5 }), 316));
    add(fit(txt(this, 266, 486, bottom, { size: 22, color: S.cyan, origin: 0.5 }), 316));
    add(img(this, 266, 352, ins.table, { w: 250, h: 194 }));
    g.lineStyle(2, C.cyan, 1); g.lineBetween(266, 220, 266, 255); g.lineBetween(266, 449, 266, 472);
    // ---- header (452..1184) ----
    const hg = add(this.add.graphics()); hg.lineStyle(3, 0x8a93c8, 1); hg.strokeRect(452, 156, 732, 40);
    const counter = add(txt(this, 1170, 180, `◀ ${this.idx + 1}/14 ▶`, { font: 'title', size: 10, color: S.gold, origin: [1, 0.5] }));
    counter.setY(176);
    add(fit(txt(this, 466, 176, ins.name, { font: 'title', size: 16, origin: [0, 0.5] }), 700 - counter.width - 30, 30));
    // ---- chips of the 14 tables (readable size; chip height follows the text) ----
    let cx = 452, cy = 202, chipH = 16;
    this.list.forEach((it, j) => {
      const done = !!mi.instruments.inspected[it.id];
      const tt = add(txt(this, 0, 0, `${done ? '[x] ' : ''}${it.short}`, { font: 'title', size: 6, color: j === this.idx ? S.navy : S.muted }));
      fit(tt, 150);
      chipH = Math.max(chipH, tt.height + 6);
      const w = tt.width + 10;
      if (cx + w > 1184) { cx = 452; cy += chipH + 4; }
      add(this.add.rectangle(cx, cy, w, chipH, j === this.idx ? C.gold : 0x0b0f26).setOrigin(0).setStrokeStyle(2, j === this.idx ? C.white : 0x8a93c8));
      tt.setPosition(cx + 5, cy + chipH / 2).setOrigin(0, 0.5); this.cont.bringToTop(tt);
      this.chips.push(hotspot(this, cx, cy, w, chipH, it.name, () => this.show(j)));
      cx += w + 5;
    });
    // ---- body: origin, info, requirements, compatibility. Built at one font size; if it does not fit
    //      between the chips and the footer, everything is rebuilt one size smaller (text size L too). ----
    const TOP = cy + chipH + 6, BOTTOM = 640;           // the right column now uses the full card height
    this.body = this.body || this.add.container(0, 0);
    for (let shrink = 0; this.buildBody(ins, TOP, 20, shrink) > BOTTOM && shrink < 8; shrink++);
    // ---- footer, at the bottom of the blueprint column: simulated values + question button ----
    const energy = ins.energy < 0 ? `draws ${-ins.energy}% energy` : 'no energy';
    const vl = add(txt(this, 110, 532, t('card.values'), { font: 'title', size: 7, color: S.muted }));
    add(fit(txt(this, 110, vl.y + vl.height + 2, `${ins.cost.toLocaleString('en-US')} · ${ins.mass} kg · ${energy}`, { size: 20, color: S.text }), 316));
    const done = !!mi.instruments.inspected[ins.id];
    this.chips.push(pxButton(this, 156, 586, 220, 40, done ? t('card.done') : t('card.quiz'), () => this.quiz(), { size: 10, depth: 20, fill: done ? 0x0f5a3f : C.navy }));
    // ---- bottom buttons + mentor ----
    const inKit = kit.includes(ins.id);
    this.packBtn.setLabel(inKit ? t('card.unpack') : t('card.pack'));
    this.packBtn.setPrimary(!inKit);
    const cov = requirementsCovered(mi.instruments.inspected);
    this.asmBtn.setDisabled(!cov.ok);
    this.mentor.set(inKit ? `${t('card.inKit')}. ${t('card.mentor')}` : (cov.ok ? t('warehouse.allDone') : t('card.mentor')), { silent: true });
  }

  // right column body; returns the y where it ends
  buildBody(ins, top, size, shrink = 0) {
    const b = this.body;
    // body texts are drawn `shrink` px smaller than normal (never below the readable floor) when the column is too tall
    const T = (...args) => { const o = txt(...args); if (shrink && !/Press Start/.test(o.style.fontFamily)) o.setFontSize(Math.max(minSize('body'), parseInt(o.style.fontSize, 10) - shrink)); return o; };
    b.removeAll(true);
    const add = (o) => { b.add(o); return o; };
    const W_ = 732, X = 452, PAD = 8;
    let y = top;
    // origin mission
    const ol = add(T(this, X, 0, t('card.origin'), { font: 'title', size: 7, color: S.muted, origin: [0, 0.5] }));
    const oc = chip(this, X + ol.width + 12, 0, ins.origin, { fill: ins.mer ? C.cyan : C.blueBorder, color: S.navy, size: 7 });
    const rowH = Math.max(ol.height, oc.h);
    ol.setY(y + rowH / 2); oc.r.setY(y + rowH / 2); oc.t.setY(y + rowH / 2 - oc.t.height / 2 + 1);
    add(oc.r); add(oc.t);
    y += rowH + 6;
    // what it does / role / where it mounts: label column 112 px, value column the rest
    const infoTop = y;
    const bg1 = add(this.add.graphics());
    let ry = y + PAD;
    for (const [label, value] of [[t('card.what'), ins.what], [t('card.role'), ins.role], [t('card.mount'), ins.mountText]]) {
      const l = add(T(this, X + 10, ry + 2, label, { font: 'title', size: 6, color: S.muted, wrap: 150, lineSpacing: 2 }));
      const v = add(T(this, X + 168, ry, value, { size, wrap: W_ - 178, lineSpacing: 0 }));
      ry += Math.max(v.height, l.height) + 6;
    }
    y = ry + PAD - 6;
    bg1.fillStyle(0x0b0f26, 1); bg1.fillRect(X, infoTop, W_, y - infoTop);
    y += 6;
    // helps with requirements
    const reqTop = y;
    const bg2 = add(this.add.graphics());
    const hl = add(T(this, X + 10, y + PAD, t('card.helps'), { font: 'title', size: 6, color: S.muted }));
    let qx = X + 10, qy = hl.y + hl.height + 4;
    let chipH = 0;
    t('card.reqShort').forEach((label, k) => {
      const on = ins.helps.includes(k + 1);
      const tt = add(T(this, 0, 0, label, { size: size - 2, color: on ? S.navy : S.muted }));
      chipH = Math.max(chipH, tt.height + 4);
      const w = tt.width + 12;
      if (qx + w > X + W_ - 10) { qx = X + 10; qy += chipH + 4; }
      add(this.add.rectangle(qx, qy, w, chipH, on ? C.green : 0x2a3358).setOrigin(0));
      tt.setPosition(qx + 6, qy + chipH / 2).setOrigin(0, 0.5);
      b.bringToTop(tt);
      qx += w + 6;
    });
    y = qy + chipH + PAD;
    bg2.fillStyle(0x0b0f26, 1); bg2.fillRect(X, reqTop, W_, y - reqTop);
    y += 6;
    // compatibility
    const col = COMPAT_COL[ins.compat] || C.grey;
    const cTop = y;
    const bg3 = add(this.add.graphics());
    const cl = add(T(this, X + 12, y + PAD, t('card.compat', { C: t('card.compatNames')[ins.compat] || ins.compat }), { font: 'title', size: 7, color: Phaser.Display.Color.IntegerToColor(col).rgba, wrap: W_ - 24 }));
    const ct = add(T(this, X + 12, cl.y + cl.height + 4, ins.compatText, { size, wrap: W_ - 24, lineSpacing: 0 }));
    y = ct.y + ct.height + PAD;
    bg3.fillStyle(0x0f2a2a, 1); bg3.fillRect(X, cTop, W_, y - cTop); bg3.lineStyle(3, col, 1); bg3.strokeRect(X + 1.5, cTop + 1.5, W_ - 3, y - cTop - 3);
    return y;
  }

  quiz(onCorrect) {
    const ins = this.list[this.idx];
    const q = questionFor(ins.id);
    if (!q) { if (onCorrect) onCorrect(); return; }
    const mi = state.mission.instruments;
    const md = openModal(this, t('card.quizTitle', { NAME: ins.name }), { w: 900, h: 520, closeLabel: t('card.later') });
    mText(this, md, md.x + 28, md.y + 64, t('card.quizIntro'), { size: 20, color: S.muted });
    fit(mText(this, md, md.x + 28, md.y + 92, q.question, { size: 28, wrap: md.w - 56 }), md.w - 56, 54, 16);
    const fb = mText(this, md, md.x + 28, md.y + 330, '', { size: 21, wrap: md.w - 56 });
    let answered = false;
    const btns = q.options.map((opt, k) => mButton(this, md, md.x + 28, md.y + 150 + k * 60, md.w - 56, 50, `${'ABC'[k]}. ${opt}`, () => pick(k), { size: 10 }));
    btns.forEach((b) => { b.text.setFontFamily('"VT323", monospace').setFontSize(26); b.text.setX(16).setOrigin(0, 0.5); fit(b.text, md.w - 92, 44, 15); });
    const pick = (k) => {
      if (answered) return;
      mi.quiz[ins.id] = { tries: ((mi.quiz[ins.id] || {}).tries || 0) + 1 };
      btns[q.answer_index].box.setFillStyle(C.green);
      if (k === q.answer_index) {
        answered = true;
        sfx(this, 'sfx-place');
        const first = !mi.inspected[ins.id];
        mi.inspected[ins.id] = true;
        if (first) logEvent(`Inspected ${ins.name} (quick question ${mi.quiz[ins.id].tries === 1 ? 'right on the first try' : 'answered'}).`, 'instruments');
        fb.setText(`${t('card.correct')} ${q.explanation}\nSource: ${q.source_url}`).setColor(S.green);
        fit(fb, md.w - 56, 120, 14);
        md.closeBtn.setLabel(t('card.done'));
        say(`${t('card.correct')} ${q.explanation}`);
        md.onClose = () => { this.draw(); this.refreshMeters(); if (onCorrect) onCorrect(); };
      } else {
        sfx(this, 'sfx-error');
        btns[k].box.setFillStyle(C.red);
        fb.setText(`${t('card.wrong')}\n${q.explanation}`).setColor(S.red);
        fit(fb, md.w - 56, 120, 14);
        say(`${t('card.wrong')} The right answer is ${'ABC'[q.answer_index]}: ${q.options[q.answer_index]}. ${q.explanation}`);
        // retry: reset the colors after a moment (the right answer stays marked)
        this.time.delayedCall(900, () => { if (md.objs.length) btns.forEach((b, j) => { if (j !== q.answer_index) b.box.setFillStyle(C.navy); }); });
      }
    };
    say(`Quick question about ${ins.name}. ${q.question} A: ${q.options[0]}. B: ${q.options[1]}. C: ${q.options[2]}.`);
    md.onKey = (k) => { const i = 'abc'.indexOf(String(k).toLowerCase()); if (i >= 0) pick(i); };
  }

  togglePack() {
    const ins = this.list[this.idx];
    const mi = state.mission;
    const kit = mi.instruments.kit;
    if (kit.includes(ins.id)) {
      mi.instruments.kit = kit.filter((id) => id !== ins.id);
      for (const [slot, id] of Object.entries(mi.instruments.placed)) if (id === ins.id) delete mi.instruments.placed[slot];
      logEvent(`Removed ${ins.name} from the kit.`, 'instruments');
      sfx(this, 'sfx-pickup');
      this.refreshMeters(); this.draw();
      say(`${ins.name} removed from your kit.`);
      return;
    }
    if (!mi.instruments.inspected[ins.id]) { this.quiz(() => this.togglePack()); return; }
    if (kitWouldExceedBudget(mi, ins.id)) { sfx(this, 'sfx-error'); this.mentor.set(t('card.over')); return; }
    mi.instruments.kit = [...kit, ins.id];
    logEvent(`Packed ${ins.name} in the kit.`, 'instruments');
    sfx(this, 'sfx-place');
    this.refreshMeters(); this.draw();
    say(`${ins.name} added to your kit.`);
  }

  refreshMeters() { state.mission.meters = computeMeters(state.mission); }

  assemble() {
    const cov = requirementsCovered(state.mission.instruments.inspected);
    if (!cov.ok) { sfx(this, 'sfx-error'); this.mentor.set(t('card.locked', { n: cov.count })); return; }
    logEvent(`Left the warehouse with ${state.mission.instruments.kit.length} instruments in the kit.`, 'instruments');
    go(this, 'NextUpScene', { id: '11a2', next: 'AssemblyScene' }, { transition: 'dither' });
  }
}
