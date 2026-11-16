// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// Screens 15-D1 … 15-D6 · Stage detail: YOU vs the real mission (Spirit & Opportunity).
// Table ASPECT / YOUR DECISION / REAL MER MISSION / RESULT (✓ MATCH · ≈ CLOSE · ✕ DIFFERENT, never colour only),
// "WHY THE REAL TEAM CHOSE THIS" with its source, tabs 1–6, ◀ DASHBOARD / ◀ PREV / NEXT STAGE ▶.
// Rows, real values and rules live in data/content/mission_comparison.json (rules.matchResult).
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, mentorBar, hotspot } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state } from '../state.js';
import { go } from '../router.js';
import { playerValue, matchResult, displayValue } from '../rules.js';
import { stageMatches } from './DashboardScene.js';
import { say } from '../a11y.js';

const BADGE = { match: ['detail.match', C.green, S.green], close: ['detail.close', C.gold, S.gold], different: ['detail.different', C.red, S.red] };

export default class StageDetailScene extends Phaser.Scene {
  constructor() { super('StageDetailScene'); }

  create(data) {
    fresh(this);
    const stages = content.mission_comparison.stages;
    this.n = Math.max(1, Math.min(stages.length, data.n || 1));
    const st = stages[this.n - 1], mi = state.mission;
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    txt(this, 24, 22, t('detail.title', { n: this.n, NAME: st.name }), { font: 'title', size: 22, color: S.gold, shadow: 3 });
    const sub = txt(this, 32, 62, t('detail.sub'), { size: 22, color: S.navy, depth: 3 });
    this.add.rectangle(24, 60, sub.width + 16, 28, C.white).setOrigin(0).setDepth(2);
    // tabs 1–6
    stages.forEach((s, i) => {
      const x = 880 + i * 44, on = i + 1 === this.n;
      this.add.rectangle(x, 24, 32, 32, on ? C.gold : C.navy).setOrigin(0).setStrokeStyle(3, C.white);
      txt(this, x + 16, 40, String(i + 1), { font: 'title', size: 10, color: on ? S.navy : S.white, origin: 0.5 });
      hotspot(this, x, 24, 32, 32, `Stage ${i + 1}: ${s.name}`, () => this.open(i + 1));
    });
    { // tab R → report page "Your review"
      const x = 880 + stages.length * 44;
      this.add.rectangle(x, 24, 32, 32, C.navy).setOrigin(0).setStrokeStyle(3, C.cyan);
      txt(this, x + 16, 40, 'R', { font: 'title', size: 10, color: S.cyan, origin: 0.5 });
      hotspot(this, x, 24, 32, 32, 'Your review', () => go(this, 'ReviewReportScene', {}, { noHistory: true, transition: 'fade' }));
    }
    // table
    const x = 24, w = 1232, cols = [x + 20, x + 280, x + 640, x + 1080];
    let y = 104;
    const heads = [t('detail.aspect'), t('detail.yours'), t('detail.real'), t('detail.result')];
    const rowsT = st.rows.map((row) => {
      const v = playerValue(row.player_key, mi);
      const res = matchResult(row, v, mi);
      return { row, res, a: txt(this, cols[0], 0, row.aspect, { size: 22, color: S.gold, wrap: 240 }), you: txt(this, cols[1], 0, displayValue(row.player_key, v, mi, true), { size: 22, wrap: 340 }), real: txt(this, cols[2], 0, row.real_value, { size: 21, wrap: 420 }) };
    });
    const rowH = rowsT.map((r) => Math.max(40, r.a.height, r.you.height, r.real.height) + 14);
    const tableH = 44 + rowH.reduce((s, h) => s + h, 0);
    panel(this, x, y, w, tableH, { fill: C.navy2, stroke: C.gold, bw: 4 });
    heads.forEach((h, i) => txt(this, cols[i], y + 16, h, { font: 'title', size: 8, color: S.gold }));
    let ry = y + 40;
    rowsT.forEach((r, i) => {
      if (i % 2 === 0) this.add.rectangle(x + 6, ry, w - 12, rowH[i], 0x1a2350).setOrigin(0).setDepth(1);
      [r.a, r.you, r.real].forEach((o) => { o.y = ry + 7; o.setDepth(2); });
      if (r.res) {
        const [key, col, scol] = BADGE[r.res];
        const bt = txt(this, cols[3] + 8, ry + rowH[i] / 2, t(key), { font: 'title', size: 8, color: S.navy, origin: [0, 0.5], depth: 3 });
        this.add.rectangle(cols[3], ry + rowH[i] / 2, bt.width + 16, 24, col).setOrigin(0, 0.5).setDepth(2);
        void scol;
      } else txt(this, cols[3], ry + 7, t('detail.simShort'), { size: 19, color: S.muted, wrap: 140, depth: 2 });
      ry += rowH[i];
    });
    y += tableH + 14;
    // why
    const why = txt(this, x + 20, y + 32, st.why, { size: 22, wrap: w - 40 });
    panel(this, x, y, w, why.height + 46, { fill: C.blueCard, stroke: C.blueBorder, bw: 3 });
    txt(this, x + 20, y + 12, t('detail.why'), { font: 'title', size: 8, color: S.cyan });
    why.setDepth(2);
    y += why.height + 60;
    const m = stageMatches(st, mi);
    const line = t('detail.mentorLine', { M: m.match, C: m.close, D: m.different });
    this.mentor = mentorBar(this, 24, Math.min(y, 540), 620, 90, '', { portrait: 86, size: 21, depth: 30 });
    this.mentor.set(line, { silent: true });
    // buttons
    pxButton(this, 560, 644, 260, 60, t('detail.dash'), () => go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }), { size: 14 });
    pxButton(this, 836, 644, 180, 60, t('detail.prev'), () => this.open(this.n - 1), { size: 14, disabled: this.n === 1 });
    const last = this.n === stages.length;
    pxButton(this, 1032, 644, 224, 60, last ? t('detail.done') : t('detail.nextStage'), () => (last ? go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }) : this.open(this.n + 1)), { primary: true, size: 14 });
    this.onKey = (k) => {
      const d = Number(k); if (d >= 1 && d <= stages.length) { this.open(d); return true; }
      if (k === 'ArrowRight') { if (this.n < stages.length) this.open(this.n + 1); return true; }
      if (k === 'ArrowLeft') { if (this.n > 1) this.open(this.n - 1); return true; }
      if (k === 'r' || k === 'R') { go(this, 'ReviewReportScene', {}, { noHistory: true, transition: 'fade' }); return true; }
      return false;
    };
    setup(this, data, { back: false, esc: () => go(this, 'DashboardScene', {}, { noHistory: true, transition: 'fade' }), help: 'StageDetailScene', helpPos: [24, 644] });
    say(`Stage ${this.n}: ${st.name}. ${rowsT.map((r) => `${r.row.aspect}: you ${r.you.text}; real mission ${r.real.text}; ${r.res ? t(BADGE[r.res][0]) : 'simulated'}`).join('. ')}. ${t('detail.why')}: ${st.why}. Use left and right arrows to change stage.`);
  }

  open(n) { if (n >= 1 && n <= content.mission_comparison.stages.length && n !== this.n) this.scene.restart({ n }); }
}

