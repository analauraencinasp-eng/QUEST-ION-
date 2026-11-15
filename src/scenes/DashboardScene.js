// Screen 15 · Mission complete dashboard. Every {placeholder} of the Figma template is filled from the state:
// score (rules.computeScore — only decisions with real mission impact), rank (decision tree, rules.walkTree),
// resources over the mission, score by category, you vs real mission, the 6 stage cards (→ 15-D1…D6),
// mentor feedback, UNLOCKED banner (score ≥ 70), RETRY / LOG / CONTINUE.
import { C, S, W, H } from '../ui/theme.js';
import { fresh, txt, pxButton, panel, mentorBar, hotspot, fit, fitBlock } from '../ui/widgets.js';
import { setup, openModal, mText, confirmBox } from '../ui/chrome.js';
import { content, t } from '../content.js';
import { state, resetMission, logEvent } from '../state.js';
import { go, resetHistory } from '../router.js';
import { computeScore, walkTree, RANK_TREE, rankFacts, playerValue, matchResult } from '../rules.js';
import { saveGame } from '../save.js';
import { pixelIcon } from '../ui/icons.js';
import { say } from '../a11y.js';

const STAGE_ICONS = ['build', 'instruments', 'orbit', 'launch', 'rock', 'data'];

// MATCH / CLOSE / DIFFERENT counts of one comparison stage (pure → tested)
export function stageMatches(stage, mi) {
  const out = { match: 0, close: 0, different: 0, sim: 0 };
  for (const row of stage.rows) {
    const r = matchResult(row, playerValue(row.player_key, mi), mi);
    if (r) out[r] += 1; else out.sim += 1;
  }
  return out;
}

// the 6 resource points of the chart (percent left), from what the player really spent
export function resourceSeries(mi) {
  const cap = (content.stations && content.stations.caps.budget) || 120000;
  const budget = Math.max(0, Math.round(100 - (mi.meters.budget / cap) * 100));
  const e0 = Math.round(mi.meters.energy || 0);
  const fuel = Math.max(0, 100 - (mi.orbit.fuelUsed ?? 0));
  return {
    budget: [budget, budget, budget, budget, budget, budget],
    energy: [e0, e0, e0, e0, mi.rocks.done ? mi.rocks.energyLeft : e0, mi.signal.done ? mi.signal.energyLeft : e0],
    fuel: [100, 100, fuel, fuel, fuel, fuel]
  };
}

export default class DashboardScene extends Phaser.Scene {
  constructor() { super('DashboardScene'); }

  create(data) {
    fresh(this);
    const mi = state.mission;
    this.score = computeScore(mi);
    this.rank = walkTree(RANK_TREE, rankFacts(mi, this.score));
    if (!mi.completed) {
      mi.completed = true;
      mi.finalScore = this.score.total;
      logEvent(`Mission complete: score ${this.score.total}/100, rank ${this.rank.rank}.`, 'report');
      saveGame();
    }
    this.add.rectangle(0, 0, W, H, C.space).setOrigin(0);
    const role = (content.roles.roles.find((r) => r.id === mi.role) || { name: 'CREW' }).name;
    const planet = (content.planets.planets || []).find((p) => p.id === mi.planet) || { name: 'MARS' };
    const obj = (content.objectives.objectives || []).find((o) => o.id === mi.objective) || { title: 'HUNT FOR ANCIENT WATER' };
    txt(this, 24, 18, t('dashboard.title'), { font: 'title', size: 24, color: S.gold, shadow: 3 });
    const sub = txt(this, 32, 58, `${t('dashboard.missionName', { ROLE: role })} · ${planet.name} · ${obj.title || obj.name}`, { size: 22, color: S.navy, depth: 3 });
    this.add.rectangle(24, 56, sub.width + 16, 28, C.white).setOrigin(0).setDepth(2);
    this.left(mi);
    this.center(mi);
    this.cards(mi);
    this.feedback(mi);
    pxButton(this, 700, 644, 170, 60, t('dashboard.retry'), () => this.retry(), { size: 16 });
    pxButton(this, 886, 644, 140, 60, t('dashboard.log'), () => this.openLog(), { size: 16 });
    pxButton(this, 1042, 644, 214, 60, t('dashboard.continue'), () => this.finish(), { primary: true, size: 16 });
    this.onKey = (k) => {
      const n = Number(k); if (n >= 1 && n <= 6) { this.detail(n); return true; }
      if (k === 'l' || k === 'L') { this.openLog(); return true; }
      return false;
    };
    setup(this, data, { back: false, help: 'DashboardScene', helpPos: [24, 656], mission: true, esc: () => {} });
    say(`${t('dashboard.title')} Score ${this.score.total} out of 100. Rank: ${this.rank.rank}. Science ${this.score.science} percent, engineering ${this.score.engineering}, resources ${this.score.resources}, Earth ${this.score.earth}. Press 1 to 6 to see each stage compared with the real mission, L for the log.`);
  }

  left(mi) {
    const x = 24, y = 94, w = 500;
    panel(this, x, y, w, 470, { fill: C.navy2, stroke: C.cyan, bw: 3 });
    txt(this, x + 14, y + 10, t('dashboard.board'), { font: 'title', size: 9, color: S.cyan });
    const last = mi.lastScore;
    const delta = last === null || last === undefined ? t('dashboard.first') : t('dashboard.delta', { d: `${this.score.total - last >= 0 ? '+' : ''}${this.score.total - last}` });
    const cap = (content.stations && content.stations.caps.budget) || 120000;
    const tiles = [
      [t('dashboard.final'), `${this.score.total}/100`, delta],
      [t('dashboard.science'), `${mi.rocks.science || 0} pts`, `${mi.rocks.samples.length}/3 samples`],
      [t('dashboard.resources'), `$${Math.max(0, cap - mi.meters.budget).toLocaleString('en-US')}`, `${mi.signal.done ? mi.signal.energyLeft : mi.meters.energy}% energy`]
    ];
    tiles.forEach(([k, v, s], i) => {
      const tx = x + 10 + i * 162;
      panel(this, tx, y + 32, 154, 78, { fill: C.space, stroke: C.white, bw: 2 });
      txt(this, tx + 8, y + 38, k, { font: 'title', size: 6, color: S.muted });
      fit(txt(this, tx + 8, y + 54, v, { size: 26, color: S.gold }), 138);
      fit(txt(this, tx + 8, y + 84, s, { size: 18, color: S.text }), 138);
    });
    // resources over the mission (line chart; each line also has its own marker shape)
    const cx = x + 10, cy = y + 122, cw = w - 20, ch = 150;
    panel(this, cx, cy, cw, ch, { fill: C.space, stroke: C.white, bw: 2 });
    const ot = txt(this, cx + 8, cy + 6, t('dashboard.overTime'), { font: 'title', size: 6, color: S.muted });
    const series = resourceSeries(mi), cols = { budget: C.gold, energy: C.green, fuel: 0xe5484d };
    const leg = t('dashboard.legend');
    // legend starts after the header and each item is spaced by its own width (no overlap at any size)
    let lx = ot.x + ot.width + 18, ly = cy + 6;
    ['budget', 'energy', 'fuel'].forEach((k, i) => {
      const lt = txt(this, 0, ly, leg[i], { font: 'title', size: 6, color: S.text });
      if (lx + 14 + lt.width > cx + cw - 8) { lx = cx + 8; ly += lt.height + 4; lt.setY(ly); }
      this.add.rectangle(lx, ly + lt.height / 2 - 5, 10, 10, cols[k]).setOrigin(0);
      lt.setX(lx + 14);
      lx += 14 + lt.width + 14;
    });
    const g = this.add.graphics();
    const px = (i) => cx + 30 + i * ((cw - 60) / 5), py = (v) => cy + ch - 26 - (v / 100) * (ch - 50);
    ['budget', 'energy', 'fuel'].forEach((k, s) => {
      g.lineStyle(3, cols[k], 1);
      series[k].forEach((v, i) => { if (i) g.lineBetween(px(i - 1), py(series[k][i - 1]) + s, px(i), py(v) + s); });
      g.fillStyle(cols[k], 1);
      series[k].forEach((v, i) => { if (s === 0) g.fillRect(px(i) - 4, py(v) - 4, 8, 8); else if (s === 1) g.fillCircle(px(i), py(v) + s, 4); else g.fillTriangle(px(i), py(v) - 5 + s, px(i) - 5, py(v) + 4 + s, px(i) + 5, py(v) + 4 + s); });
    });
    t('dashboard.chart').forEach((l, i) => txt(this, px(i), cy + ch - 14, l, { font: 'title', size: 6, color: S.muted, origin: 0.5 }));
    // score by category (bars + numbers, never colour alone)
    const by = cy + ch + 10;
    panel(this, cx, by, 236, 168, { fill: C.space, stroke: C.white, bw: 2 });
    txt(this, cx + 8, by + 6, t('dashboard.byCat'), { font: 'title', size: 6, color: S.muted });
    const cats = t('dashboard.cats');
    [['science', C.cyan], ['engineering', C.gold], ['resources', C.green], ['earth', C.blueBorder]].forEach(([k, col], i) => {
      const yy = by + 28 + i * 34;
      txt(this, cx + 10, yy, cats[k], { font: 'title', size: 6, color: S.text });
      this.add.rectangle(cx + 10, yy + 12, 150, 12, 0x2a3358).setOrigin(0);
      this.add.rectangle(cx + 10, yy + 12, 1.5 * this.score[k], 12, col).setOrigin(0);
      txt(this, cx + 170, yy + 4, `${this.score[k]}%`, { size: 22, color: S.text });
    });
    // you vs real
    const vx = cx + 246, vw = cw - 246;
    panel(this, vx, by, vw, 168, { fill: C.space, stroke: C.white, bw: 2 });
    txt(this, vx + 8, by + 6, t('dashboard.vs'), { font: 'title', size: 6, color: S.muted });
    const athena = content.instruments.athena, placed = Object.values(mi.instruments.placed || {});
    const strong = mi.rocks.samples.filter((s) => s.evidence === 'strong').length;
    const rows = [
      [t('dashboard.vsRows')[0], mi.orbit.travelDays ? `${mi.orbit.travelDays} d` : '—', '~7 mo', mi.orbit.travelDays ? Math.min(1, mi.orbit.travelDays / 300) : 0, 208 / 300],
      [t('dashboard.vsRows')[1], `${athena.filter((a) => placed.includes(a)).length}/6 Athena`, '6/6', athena.filter((a) => placed.includes(a)).length / 6, 1],
      [t('dashboard.vsRows')[2], `${strong} strong`, 'many', strong / 3, 1],
      [t('dashboard.vsRows')[3], `${mi.signal.packets || 0}/3 pk`, 'relay', (mi.signal.packets || 0) / 3, 1]
    ];
    // each row: label, then bars on the left and "YOU … REAL …" on one line beside them
    let yy = by + 26;
    rows.forEach(([k, you, real, fy, fr]) => {
      const lab = txt(this, vx + 8, yy, k, { font: 'title', size: 6, color: S.text });
      const ry = lab.y + lab.height + 1;
      const yt = txt(this, vx + 96, ry, `${t('dashboard.you')}: ${you}`, { size: 17, color: S.cyan });
      const rt = txt(this, 0, ry, `${t('dashboard.real')}: ${real}`, { size: 17, color: S.gold });
      const room = vw - 96 - 12;
      if (yt.width + 10 + rt.width > room) { fit(yt, room / 2 - 6); fit(rt, room / 2 - 6); }
      rt.setX(yt.x + yt.width + 10);
      const rowH = Math.max(yt.height, 20);
      this.add.rectangle(vx + 8, ry + rowH / 2 - 9, 80 * fy, 8, C.cyan).setOrigin(0);
      this.add.rectangle(vx + 8, ry + rowH / 2 + 1, 80 * fr, 8, C.gold).setOrigin(0);
      yy = ry + rowH + 2;
    });
  }

  center() {
    const cx = 640, cy = 300;
    const g = this.add.graphics();
    g.fillStyle(C.navy, 1); g.fillCircle(cx, cy, 110); g.lineStyle(8, C.gold, 1); g.strokeCircle(cx, cy, 110);
    txt(this, cx, cy - 66, t('dashboard.missionScore'), { font: 'title', size: 8, color: S.muted, origin: 0.5, align: 'center', wrap: 120 });
    txt(this, cx, cy - 14, String(this.score.total), { font: 'title', size: 40, color: S.gold, origin: 0.5, shadow: 3 });
    txt(this, cx, cy + 28, t('dashboard.of100'), { font: 'title', size: 10, color: S.text, origin: 0.5 });
    const stars = Math.round(this.score.total / 20);
    const sg = this.add.graphics();
    for (let i = 0; i < 5; i++) { const sx = cx - 48 + i * 24, sy = cy + 52; const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 4 : 10; pts.push(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } sg.fillStyle(i < stars ? 0xf0c040 : 0x3a4160, 1); sg.fillPoints(new Phaser.Geom.Polygon(pts).points, true); }
    txt(this, cx, cy + 84, this.rank.rank, { font: 'title', size: 8, color: S.cyan, origin: 0.5, align: 'center', wrap: 170 });
    // unlock banner: title, then the sentence under it; the box grows to hold both
    const ok = this.score.total >= 70;
    const bt = txt(this, cx, cy + 142, ok ? t('dashboard.unlocked') : t('dashboard.lockedTitle'), { font: 'title', size: 9, color: ok ? S.green : S.muted, origin: [0.5, 0], depth: 2 });
    const bx = txt(this, cx, bt.y + bt.height + 4, ok ? t('dashboard.unlockedNext') : t('dashboard.lockedText'), { size: 18, color: S.text, origin: [0.5, 0], align: 'center', wrap: 214, depth: 2 });
    const bTop = cy + 134, bBottom = bx.y + bx.height + 8;
    this.add.rectangle(cx, (bTop + bBottom) / 2, 236, bBottom - bTop, ok ? 0x16502f : 0x2a3358).setStrokeStyle(3, ok ? C.green : C.grey).setDepth(1);
  }

  cards(mi) {
    const stages = content.mission_comparison.stages;
    const names = t('dashboard.stages');
    const strong = mi.rocks.samples.filter((s) => s.evidence === 'strong').length;
    const head = [
      `${mi.installOrder.length}/5 parts`,
      `${Object.keys(mi.instruments.placed || {}).length} instruments`,
      mi.orbit.reached ? `${mi.orbit.travelDays} days · ${mi.orbit.stars || 0}★` : 'not planned',
      mi.launch.done ? `${mi.launch.hull}/3 hull (for fun)` : 'skipped',
      `${mi.rocks.samples.length}/3 samples · ${strong} strong`,
      `${mi.signal.packets || 0}/3 packets · ${(mi.comms && mi.comms.returnedMb) || 0} Mb`
    ];
    stages.forEach((st, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 790 + col * 238, y = 94 + row * 178, w = 226, h = 166;
      panel(this, x, y, w, h, { fill: C.navy2, stroke: C.gold, bw: 3 });
      this.add.rectangle(x + 10, y + 10, 24, 24, C.space).setOrigin(0).setStrokeStyle(2, C.gold);
      txt(this, x + 22, y + 22, String(i + 1), { font: 'title', size: 10, color: S.gold, origin: 0.5 });
      pixelIcon(this, STAGE_ICONS[i], x + w - 46, y + 8, 36, 20);
      // name → result → matches → note stacked; VIEW DETAILS keeps its own line at the bottom
      const m = stageMatches(st, mi);
      const det = txt(this, x + w - 10, 0, t('dashboard.details'), { font: 'title', size: 6, color: S.cyan, origin: [1, 0] });
      det.setY(y + h - det.height - 8);
      fitBlock([
        txt(this, x + 10, 0, names[i], { font: 'title', size: 7, color: S.gold, wrap: w - 64 }),
        fit(txt(this, x + 10, 0, head[i], { size: 22, color: S.white }), w - 20),
        txt(this, x + 10, 0, `✓ ${m.match}  ≈ ${m.close}  ✕ ${m.different}`, { size: 22, color: S.cyan }),
        txt(this, x + 10, 0, m.match >= m.different ? t('dashboard.cardGood') : t('dashboard.cardImprove'), { size: 18, color: S.muted, wrap: w - 20 })
      ], y + 42, det.y - 4, 2);
      hotspot(this, x, y, w, h, `${i + 1}. ${names[i]}: ${head[i]}. ${m.match} match, ${m.close} close, ${m.different} different. View details.`, () => this.detail(i + 1));
    });
  }

  feedback(mi) {
    const stages = content.mission_comparison.stages;
    const scored = stages.map((st, i) => ({ i, name: t('dashboard.stages')[i], m: stageMatches(st, mi) }));
    const best = scored.slice().sort((a, b) => (b.m.match - b.m.different) - (a.m.match - a.m.different))[0];
    const worst = scored.slice().sort((a, b) => (b.m.different - b.m.match) - (a.m.different - a.m.match))[0];
    const good = t('dashboard.goodLine', { STAGE: best.name });
    const improve = worst.m.different ? t('dashboard.improveLine', { STAGE: worst.name }) : t('dashboard.improveNone');
    const learned = t('dashboard.learnedLine');
    const text = `${t('dashboard.good')} ${good}\n${t('dashboard.improve')} ${improve}\n${t('dashboard.learned')} ${learned}`;
    this.mentor = mentorBar(this, 100, 572, 580, 140, '', { portrait: 120, size: 19, depth: 30, title: t('dashboard.feedback') });
    this.mentor.set(text, { silent: true });
    this.feedbackText = text;
  }

  detail(n) { go(this, 'StageDetailScene', { n }, { transition: 'fade' }); }

  openLog() {
    const md = openModal(this, t('dashboard.logTitle'), { w: 900, h: 600 });
    const items = state.mission.log.toArray();
    const lines = items.slice(-14).map((e, i) => `${i + 1}. ${e.text}`).join('\n');
    mText(this, md, md.x + 28, md.y + 70, lines || '—', { size: 21, wrap: md.w - 56, lineSpacing: 0 });
    say(`${t('dashboard.logTitle')}. ${items.map((e) => e.text).join(' ')}`);
  }

  retry() {
    confirmBox(this, t('dashboard.retryConfirm'), () => {
      const s = this.score.total;
      resetMission(); state.mission.lastScore = s; resetHistory(); saveGame();
      go(this, 'RoleScene', {}, { noHistory: true, transition: 'dither' });
    }, { yes: t('dashboard.retry') });
  }

  finish() {
    const md = openModal(this, t('dashboard.title'), { w: 700, h: 320, closeLabel: t('dashboard.toTitle') , onClose: () => {
      state.mission.lastScore = this.score.total; saveGame();
      go(this, 'TitleScene', {}, { noHistory: true, transition: 'stars' });
    } });
    mText(this, md, md.x + 28, md.y + 80, t('dashboard.end'), { size: 26, wrap: md.w - 56 });
    say(`${t('dashboard.end')} Press Escape to go to the title screen.`);
  }
}
