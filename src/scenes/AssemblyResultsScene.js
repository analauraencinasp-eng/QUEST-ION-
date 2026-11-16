// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screen 11d · Assembly results: RESULT label (MISSION READY / SCIENCE CAPABILITY LIMITED / INCOMPLETE ASSEMBLY),
// 3 bars (capability / historical accuracy / compatibility, all game values), YOUR PICKS with the historical
// MER parts revealed and why each pick works or not, missing requirements, ↺ REBUILD and NEXT ▶ (→ 11e orbit).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, mentorBar, bar, chip, fit } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, logEvent } from '../state.js';
import { go } from '../router.js';
import { instrumentById, assemblyScore } from '../rules.js';
import { sfx } from '../audio.js';
import { say } from '../a11y.js';

const LABEL_COL = { ready: C.green, limited: C.gold, incomplete: C.red };

export default class AssemblyResultsScene extends Phaser.Scene {
  constructor() { super('AssemblyResultsScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    const res = mi.instruments.results || assemblyScore(mi.instruments.placed);
    mi.instruments.results = res;
    this.add.rectangle(0, 0, W, H, 0x1b2233).setOrigin(0);
    const g = this.add.graphics(); g.lineStyle(2, 0x2a3348, 1);
    for (let x = 0; x <= W; x += 64) g.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 64) g.lineBetween(0, y, W, y);
    panel(this, 106, 20, 1068, 464, { fill: 0x141a3a, stroke: C.gold, bw: 6 });
    const rl = txt(this, 138, 58, t('assemblyResults.result'), { font: 'title', size: 13, color: S.muted, origin: [0, 0.5] });
    chip(this, rl.x + rl.width + 14, 58, t(`assemblyResults.${res.label}`), { fill: LABEL_COL[res.label], color: S.navy, size: 12 });
    // legend: each item placed after the previous one's real width
    let lx = 138;
    ['ready', 'limited', 'incomplete'].forEach((k) => {
      this.add.rectangle(lx, 86, 10, 10, LABEL_COL[k]).setOrigin(0, 0.5);
      const lt = txt(this, lx + 16, 86, t(`assemblyResults.${k}`), { font: 'title', size: 6, color: S.muted, origin: [0, 0.5] });
      lx += 16 + lt.width + 24;
    });
    // 3 bars
    const metrics = [['cap', res.capability, C.cyan, S.cyan], ['acc', res.accuracy, C.gold, S.gold], ['comp', res.compatibility, C.green, S.green]];
    metrics.forEach(([k, v, col, scol], i) => {
      const x = 138 + i * 296;
      this.add.rectangle(x, 104, 264, 98, 0x0b0f26).setOrigin(0);
      txt(this, x + 12, 118, t(`assemblyResults.${k}`), { font: 'title', size: 8, color: scol, origin: [0, 0.5] });
      bar(this, x + 12, 128, 240, 16, v / 100, col, { stroke: 0x2a3358, back: 0x2a3358 });
      txt(this, x + 12, 158, `${v}%  (${t('common.simulatedShort')})`, { size: 21, origin: [0, 0.5] });
      txt(this, x + 12, 183, t(`assemblyResults.${k}D`), { size: 19, color: S.muted, origin: [0, 0.5] });
    });
    // your picks
    this.add.rectangle(138, 214, 1004, 172, 0x0b0f26).setOrigin(0);
    txt(this, 150, 228, t('assemblyResults.picks'), { font: 'title', size: 8, color: S.gold, origin: [0, 0.5] });
    const rows = this.pickRows(res);
    const rowH = Math.min(24, Math.floor(140 / Math.max(1, rows.length)));
    rows.forEach((r, i) => {
      const y = 248 + i * rowH;
      txt(this, 150, y, r.name, { font: 'title', size: 7, origin: [0, 0.5] });
      txt(this, 350, y, r.origin, { font: 'title', size: 7, color: r.mer ? S.green : S.cyan, origin: [0, 0.5] });
      fit(txt(this, 490, y, r.text, { size: rowH < 20 ? 17 : 21, color: r.col, origin: [0, 0.5] }), 640, rowH + 2, 12);
    });
    pxButton(this, 138, 398, 164, 60, t('assemblyResults.retry'), () => this.retry(), { size: 14 });
    pxButton(this, 318, 398, 324, 60, t('assemblyResults.next'), () => this.next(), { primary: true });
    const allGood = res.label === 'ready' && rows.every((r) => r.col === S.green);
    const line = allGood ? t('assemblyResults.mentorReady') : t('assemblyResults.mentor');
    this.mentor = mentorBar(this, 310, 496, 600, 90, line, { portrait: 66, size: 21, silent: true });
    this.onKey = (k) => { if (k === 'Enter') { this.next(); return true; } if (k === 'r' || k === 'R') { this.retry(); return true; } return false; };
    setup(this, data, { back: false, help: 'AssemblyResultsScene', esc: () => this.retry() });
    sfx(this, res.label === 'ready' ? 'sfx-place' : 'sfx-error');
    say(`Result: ${t(`assemblyResults.${res.label}`)}. Science capability ${res.capability} percent, historical accuracy ${res.accuracy} percent, compatibility ${res.compatibility} percent. These are game values. `
      + `${rows.map((r) => `${r.name}: ${r.text}`).join(' ')} ${line} Press Enter for NEXT, or R to rebuild.`);
  }

  // one row per placed tool + one row per requirement nobody covers
  pickRows(res) {
    const mi = state.mission;
    const ids = Object.values(mi.instruments.placed).filter(Boolean);
    const rows = ids.map((id) => {
      const ins = instrumentById(id);
      const reqs = ins.helps.length ? ` ${ins.helps.map((n) => t('assemblyResults.reqN', { n })).join(' ')}` : '';
      if (ins.compat === 'yes') return { name: ins.short, origin: t('assemblyResults.mer'), mer: true, text: `${ins.role}${reqs}`, col: S.green };
      if (ins.compat === 'redesign') return { name: ins.short, origin: ins.origin, mer: false, text: `${ins.compatText}`, col: S.gold };
      return { name: ins.short, origin: ins.origin, mer: false, text: ins.compatText, col: S.red };
    });
    const reqs = content.instruments.requirements;
    res.reqs.forEach((ok, i) => {
      if (ok) return;
      const n = i + 1;
      const real = content.instruments.instruments.find((x) => x.mer && x.helps.includes(n));
      rows.push({ name: t('assemblyResults.missing'), origin: '—', mer: false, col: S.red,
        text: t('assemblyResults.tryTool', { n, REQ: reqs[i].text.replace(/\.$/, '').toLowerCase(), NAME: real ? real.name : '?' }) });
    });
    return rows;
  }

  retry() { logEvent('Rebuilt the rover.', 'instruments'); go(this, 'AssemblyScene', {}, { transition: 'fade' }); }

  next() {
    const r = state.mission.instruments.results;
    logEvent(`Assembly result: ${t(`assemblyResults.${r.label}`)} (capability ${r.capability}%, accuracy ${r.accuracy}%, compatibility ${r.compatibility}% · game values).`, 'instruments');
    go(this, 'NextUpScene', { id: '11e', next: 'OrbitScene' }, { transition: 'dither' });
  }
}
