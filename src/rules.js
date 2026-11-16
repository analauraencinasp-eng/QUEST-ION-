// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// rules.js — PURE game logic (no Phaser), so it can be unit-tested in Node (tests/tests.js).
// Every number produced here is a SIMULATED GAME VALUE unless it comes from the ephemeris.
import { content } from './content.js';
import { STATION_IDS } from './state.js';
import Graph from './ds/Graph.js';
import { linearSearch, insertionSort } from './ds/sorts.js';

// ======================= stations (Screen 9 / 10) =======================
export function stationById(id) {
  const list = (content.stations && content.stations.stations) || [];
  const i = linearSearch(list, (s) => s.id === id);
  return i >= 0 ? list[i] : null;
}

export function stationOption(id, letter) {
  const st = stationById(id);
  if (!st || !letter) return null;
  const i = linearSearch(st.options, (o) => o.letter === letter);
  return i >= 0 ? st.options[i] : null;
}

// station n can be used only when stations 1..n-1 are installed
export function canUseStation(mission, id) {
  const idx = STATION_IDS.indexOf(id);
  for (let i = 0; i < idx; i++) if (!mission.stations[STATION_IDS[i]]) return false;
  return idx >= 0;
}

export function nextStation(mission) {
  for (const id of STATION_IDS) if (!mission.stations[id]) return id;
  return null;
}

// recompute BUDGET / MASS / ENERGY / RESPONSIBILITY from the installed parts
export function computeMeters(mission) {
  let budget = 0, mass = 0, supply = 0, draw = 0, resp = 60;
  for (const id of STATION_IDS) {
    const o = stationOption(id, mission.stations[id]);
    if (!o) continue;
    budget += o.cost; mass += o.mass;
    if (o.energy > 0) supply += o.energy * (mission.role === 'engineer' && id === 'power' ? 2 : 1);
    else draw += -o.energy;
    if (o.earth_effect && typeof o.earth_effect.delta === 'number') resp += o.earth_effect.delta;   // only when sourced
  }
  // Screen 11: every instrument packed in the kit adds its cost and mass and draws energy (simulated values)
  for (const instId of (mission.instruments && mission.instruments.kit) || []) {
    const ins = instrumentById(instId);
    if (!ins) continue;
    budget += ins.cost || 0; mass += ins.mass || 0; draw += -(ins.energy || 0);
  }
  const energy = Math.max(0, Math.min(100, Math.round(supply - draw)));
  return { budget, mass, energy, responsibility: Math.max(0, Math.min(100, resp)) };
}

// cost of a hypothetical swap (to warn "over the budget cap")
export function wouldExceedBudget(mission, id, letter) {
  const tmp = { ...mission, stations: { ...mission.stations, [id]: letter } };
  return computeMeters(tmp).budget > ((content.stations && content.stations.caps.budget) || Infinity);
}

// Graph + BFS "domino effect": which HUD meters a component affects (and how many steps away)
export function dominoGraph() {
  const g = new Graph();
  g.addEdge('structure', 'mass').addEdge('mass', 'fuel').addEdge('fuel', 'budget');
  g.addEdge('power', 'energy').addEdge('power', 'mass');
  g.addEdge('comms', 'energy').addEdge('comms', 'data');
  g.addEdge('computer', 'energy').addEdge('computer', 'reliability');
  g.addEdge('attitude', 'mass').addEdge('attitude', 'energy').addEdge('energy', 'budget');
  for (const id of STATION_IDS) g.addEdge(id, 'budget');
  return g;
}
export function affectedMeters(componentId) {
  return dominoGraph().bfs(componentId).filter((v) => v.depth > 0);
}

// ======================= stage graph (flow) =======================
export const STAGES = ['title', 'crew', 'destination', 'objective', 'build', 'instruments', 'orbit', 'launch', 'explore', 'comms', 'signal', 'report'];
export function stageGraph() {
  const g = new Graph();
  for (let i = 0; i < STAGES.length - 1; i++) g.addEdge(STAGES[i], STAGES[i + 1]);
  return g;
}
// "how many steps are you from the mission report?"
export function stepsToGo(stage) { return stageGraph().distance(stage, 'report'); }

// ======================= instruments (Screen 11) =======================
export function instrumentById(id) {
  const list = (content.instruments && content.instruments.instruments) || [];
  const i = linearSearch(list, (x) => x.id === id);
  return i >= 0 ? list[i] : null;
}
export function questionFor(instId) {
  const list = (content.questions_instruments && content.questions_instruments.questions) || [];
  const i = linearSearch(list, (q) => q.instrument === instId);
  return i >= 0 ? list[i] : null;
}

export function slotAccepts(slot, inst) { return !!slot && !!inst && slot.mount === inst.mount; }

// Warehouse gate (team decision): the exit opens when, for EACH of the 5 science requirements, the player has
// inspected (= answered the quick question of) at least one instrument that helps with it. Minimum 5 tables.
export function requirementsCovered(inspected) {
  const list = (content.instruments && content.instruments.instruments) || [];
  const done = Object.keys(inspected || {}).filter((id) => inspected[id]);
  const covered = [1, 2, 3, 4, 5].map((n) => list.some((i) => done.includes(i.id) && (i.helps || []).includes(n)));
  return { covered, count: covered.filter(Boolean).length, inspectedCount: done.length, ok: covered.every(Boolean) && done.length >= 5 };
}

// would packing this instrument go over the budget cap? (same rule as the station cards)
export function kitWouldExceedBudget(mission, instId) {
  const kit = mission.instruments.kit.includes(instId) ? mission.instruments.kit : [...mission.instruments.kit, instId];
  const tmp = { ...mission, instruments: { ...mission.instruments, kit } };
  return computeMeters(tmp).budget > ((content.stations && content.stations.caps.budget) || Infinity);
}

// placed: { slotId: instrumentId }
export function assemblyScore(placed) {
  const ids = Object.values(placed || {}).filter(Boolean);
  const insts = ids.map(instrumentById).filter(Boolean);
  const reqs = [false, false, false, false, false];
  for (const ins of insts) if (ins.compat === 'yes') for (const n of ins.helps) reqs[n - 1] = true;
  const capability = Math.round((reqs.filter(Boolean).length / 5) * 100);
  const athena = (content.instruments && content.instruments.athena) || [];
  const accuracy = Math.round((athena.filter((a) => ids.includes(a)).length / Math.max(1, athena.length)) * 100);
  const compatPts = insts.reduce((s, i) => s + (i.compat === 'yes' ? 1 : i.compat === 'redesign' ? 0.5 : 0), 0);
  const compatibility = insts.length ? Math.round((compatPts / insts.length) * 100) : 0;
  let label = 'ready';
  if (insts.length < 3) label = 'incomplete';
  else if (capability < 100) label = 'limited';
  return { capability, accuracy, compatibility, reqs, label, count: insts.length };
}

// ======================= quiz gate (13e / 14f) =======================
// Wrong → next tier (1 → 2 → 3, stays on 3 and rotates). Returns the next question.
export function nextQuestion(questions, tier, usedIds = []) {
  const t = Math.min(3, Math.max(1, tier));
  const pool = questions.filter((q) => q.tier === t);
  if (!pool.length) return questions[0] || null;
  const fresh = pool.filter((q) => !usedIds.includes(q.id));
  if (fresh.length) return fresh[0];
  // rotate: the one used longest ago
  for (const id of usedIds) { const q = pool.find((p) => p.id === id); if (q) return q; }
  return pool[0];
}
export function tierAfterWrong(tier) { return Math.min(3, tier + 1); }

// ======================= orbit (Screen 12) =======================
// eph = data/ephemeris_mer.json ; day = days since eph.start (fractional allowed)
export function posAt(eph, body, day) {
  const rows = eph.bodies[body];
  const d = Math.max(0, Math.min(rows.length - 1.0001, day));
  const i = Math.floor(d), f = d - i, a = rows[i], b = rows[i + 1] || a;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
export function velAt(eph, body, day) {
  const a = posAt(eph, body, day - 0.5), b = posAt(eph, body, day + 0.5);
  return { x: b.x - a.x, y: b.y - a.y };         // AU per day
}
export function angleOf(p) { return Math.atan2(p.y, p.x); }
// how many degrees Mars is ahead of Earth (0..360)
export function phaseAngle(eph, day) {
  const e = angleOf(posAt(eph, 'earth', day)), m = angleOf(posAt(eph, 'mars', day));
  let d = (m - e) * 180 / Math.PI;
  while (d < 0) d += 360; while (d >= 360) d -= 360;
  return d;
}
export function inWindow(eph, day, win = [36, 52]) { const p = phaseAngle(eph, day); return p >= win[0] && p <= win[1]; }

// green WINDOW zone: launch days where a medium burn near 0° reaches Mars (computed from the real ephemeris)
export function hitWindow(eph, cfg, powers, maxDay) {
  let lo = null, hi = null;
  for (let d = 0; d <= maxDay; d++) {
    let ok = false;
    for (const p of powers) { for (const dir of [0, -5, 5]) { if (simulateTransfer(eph, { launchDay: d, burnPower: p, burnDirection: dir }, cfg).reached) { ok = true; break; } } if (ok) break; }
    if (ok) { if (lo === null) lo = d; hi = d; }
  }
  return lo === null ? null : [lo, hi];
}

// windows inside [0, maxDay] by phase angle: list of [startDay, endDay]
export function launchWindows(eph, maxDay, win) {
  const out = []; let start = null;
  for (let d = 0; d <= maxDay; d++) {
    const ok = inWindow(eph, d, win);
    if (ok && start === null) start = d;
    if (!ok && start !== null) { out.push([start, d - 1]); start = null; }
  }
  if (start !== null) out.push([start, maxDay]);
  return out;
}

// Simulates the trajectory (Sun gravity only, leapfrog, 0.5-day steps).
// params: { launchDay, burnPower, burnDirection (deg, + = away from Sun) }
export function simulateTransfer(eph, params, cfg) {
  const gm = cfg.gmSun, dt = 0.5, maxDays = cfg.maxDays || 420;
  const launch = params.launchDay;
  const r0 = posAt(eph, 'earth', launch), v0 = velAt(eph, 'earth', launch);
  const sp = Math.hypot(v0.x, v0.y);
  const ux = v0.x / sp, uy = v0.y / sp;                       // prograde unit
  const ox = -uy, oy = ux;                                     // 90° left of prograde
  // outward (away from Sun) side: pick the perpendicular that points away from the Sun
  const outSign = (ox * r0.x + oy * r0.y) > 0 ? 1 : -1;
  const a = (params.burnDirection || 0) * Math.PI / 180;
  const dv = params.burnPower * cfg.dvPerPower;
  const dirx = ux * Math.cos(a) + ox * outSign * Math.sin(a), diry = uy * Math.cos(a) + oy * outSign * Math.sin(a);
  let x = r0.x, y = r0.y, vx = v0.x + dirx * dv, vy = v0.y + diry * dv;
  const path = [{ x, y }];
  let best = { d: Infinity, day: null }, maxR = Math.hypot(x, y);
  const acc = (px, py) => { const r = Math.hypot(px, py); const k = -gm / (r * r * r); return { x: k * px, y: k * py }; };
  let ac = acc(x, y);
  for (let t = dt; t <= maxDays; t += dt) {
    vx += ac.x * dt / 2; vy += ac.y * dt / 2;
    x += vx * dt; y += vy * dt;
    ac = acc(x, y);
    vx += ac.x * dt / 2; vy += ac.y * dt / 2;
    const r = Math.hypot(x, y); if (r > maxR) maxR = r;
    if (Math.round(t * 2) % 4 === 0) path.push({ x, y });
    const m = posAt(eph, 'mars', launch + t);
    const d = Math.hypot(x - m.x, y - m.y);
    if (d < best.d) best = { d, day: t };
    if (d < cfg.hitAU) { best = { d, day: t }; path.push({ x, y }); break; }
    if (r < 0.6 || r > 2.2) break;
  }
  const reached = best.d < cfg.hitAU;
  const fuelUsed = Math.min(100, Math.round(params.burnPower * 10 + Math.abs(params.burnDirection || 0) / 9));
  let reason = 'good';
  if (!reached) {
    if (Math.abs(params.burnDirection || 0) > 30) reason = 'dir';
    else if (maxR < 1.45) reason = 'weak';
    else reason = 'late';
  } else if (params.burnPower > (cfg.sweetSpot ? cfg.sweetSpot[1] + 1 : 8)) reason = 'hog';
  return { path, reached, travelDays: reached ? Math.round(best.day) : null, arrivalDay: reached ? launch + best.day : null,
    minDist: best.d, maxR, fuelUsed, reason };
}

// 0..5 stars for an orbit (simulated)
export function orbitStars(res, params, cfg, windowDays) {
  if (!res.reached) return 0;
  let s = 2;
  if (windowDays && params.launchDay >= windowDays[0] && params.launchDay <= windowDays[1]) s++;
  if (params.burnPower >= cfg.sweetSpot[0] && params.burnPower <= cfg.sweetSpot[1]) s++;
  if (Math.abs(params.burnDirection) <= 10) s++;
  return Math.min(5, s);
}

// was the player's drawn guess curving the right way (counter-clockwise around the Sun, outward)?
export function judgeDrawing(points, sun) {
  if (!points || points.length < 5) return null;
  let turn = 0;
  for (let i = 1; i < points.length; i++) {
    const a = Math.atan2(points[i - 1].y - sun.y, points[i - 1].x - sun.x), b = Math.atan2(points[i].y - sun.y, points[i].x - sun.x);
    let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    turn += d;
  }
  const r0 = Math.hypot(points[0].x - sun.x, points[0].y - sun.y), r1 = Math.hypot(points.at(-1).x - sun.x, points.at(-1).y - sun.y);
  // screen y grows downward: counter-clockwise on screen = negative angle change
  return { curves: Math.abs(turn) > 0.6, prograde: turn < 0, outward: r1 > r0 * 1.15 };
}

export function dateFromDay(startISO, day) {
  const d = new Date(startISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Math.round(day));
  return d;
}
export function fmtDate(d) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${M[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
// one-way light time Earth→Mars in minutes at a given day (from the real ephemeris)
export function lightMinutes(eph, day) {
  const e = posAt(eph, 'earth', day), m = posAt(eph, 'mars', day);
  const au = Math.hypot(e.x - m.x, e.y - m.y);
  return Math.round((au * 149597870.7) / 299792.458 / 60);
}

// ======================= Rock Hunter (Screen 14) =======================
// which of the player's instruments can read this rock, and how strong the evidence looks
export function scanRock(rock, kit) {
  const can = rock.instruments.filter((id) => kit.includes(id));
  let evidence = rock.evidence;
  if (!can.length) evidence = rock.evidence === 'strong' ? 'medium' : 'weak';
  return { instruments: can.map((id) => (instrumentById(id) || { short: id }).short), evidence, readable: can.length > 0 };
}

// ======================= comms planner (15b–15i) =======================
// order = array of data ids (first goes first) ; capacity in Mb
export function planTransmission(order, items, capacity) {
  let left = capacity; const sent = [], partial = [], waiting = [];
  for (const id of order) {
    const it = items.find((x) => x.id === id); if (!it) continue;
    if (it.mb <= left) { sent.push(it); left -= it.mb; }
    else if (left > 0) { partial.push({ ...it, sentMb: left }); left = 0; }
    else waiting.push(it);
  }
  const total = items.reduce((s, i) => s + i.mb, 0);
  return { sent, partial, waiting, returnedMb: capacity - left, totalMb: total };
}
// sort by "value per Mb" (best plan): insertionSort, stable
export function bestOrder(items) {
  return insertionSort(items, (a, b) => (b.value / b.mb) - (a.value / a.mb)).map((i) => i.id);
}
export function judgePlan(order, items, capacity) {
  const res = planTransmission(order, items, capacity);
  const sentIds = res.sent.map((s) => s.id);
  const telemetryFirst = order[0] === 'telemetry';
  const scienceSent = sentIds.includes('spectra');
  const quality = telemetryFirst && scienceSent ? 'good' : (scienceSent || telemetryFirst ? 'ok' : 'poor');
  return { ...res, telemetryFirst, scienceSent, quality };
}

// ======================= final score + rank decision tree =======================
export function computeScore(mi) {
  const insts = mi.instruments.results || { capability: 0, accuracy: 0, compatibility: 0 };
  const science = Math.min(100, Math.round((mi.rocks.science / 120) * 70 + (insts.capability || 0) * 0.3));
  const builtB = STATION_IDS.filter((id) => mi.stations[id]).length;
  const engineering = Math.min(100, Math.round(builtB * 8 + (insts.compatibility || 0) * 0.3 + (mi.orbit.stars || 0) * 6));
  const budgetCap = (content.stations && content.stations.caps.budget) || 120000;
  const budgetLeft = Math.max(0, 1 - mi.meters.budget / budgetCap);
  const resources = Math.min(100, Math.round(budgetLeft * 40 + (mi.rocks.energyLeft || 0) * 0.3 + (100 - (mi.orbit.fuelUsed || 100)) * 0.3));
  const earth = Math.round(mi.meters.responsibility);
  // data that reached Earth (team decision: the comms plan and Signal Run change the points). The launch
  // mini-game and the quick-check quizzes are just for fun / learning and never enter the score.
  const commsPart = commsScore(mi);
  const total = Math.round(science * 0.35 + engineering * 0.25 + resources * 0.2 + earth * 0.1 + commsPart * 10);
  return { science, engineering, resources, earth, total: Math.min(100, total) };
}

// 0..1: half from the comms plan quality, half from the packets that reached the orbiter in Signal Run
export function commsScore(mi) {
  const q = { good: 1, ok: 0.6, poor: 0.2 }[mi.comms && mi.comms.quality] || 0;
  const p = Math.min(1, ((mi.signal && mi.signal.packets) || 0) / 3);
  return Math.round((q * 0.5 + p * 0.5) * 100) / 100;
}

// Decision tree for {RANK_TITLE}. Each node asks one question about the facts.
export const RANK_TREE = {
  q: 'Reached Mars and sent data?', test: (f) => f.reached && f.packets >= 1,
  yes: { q: 'Found 2+ strong water clues?', test: (f) => f.strongClues >= 2,
    yes: { q: 'Score 85 or more?', test: (f) => f.score >= 85, yes: { rank: 'MISSION LEGEND' }, no: { rank: 'WATER DETECTIVE' } },
    no: { q: 'Orbit with 4+ stars?', test: (f) => f.orbitStars >= 4, yes: { rank: 'ORBIT ACE' }, no: { rank: 'ROOKIE EXPLORER' } } },
  no: { q: 'Built the full spacecraft?', test: (f) => f.parts >= 5, yes: { rank: 'SPACECRAFT BUILDER' }, no: { rank: 'CADET' } }
};
export function walkTree(tree, facts) {
  const path = [];
  let node = tree;
  while (node && !node.rank) {
    const ans = !!node.test(facts);
    path.push(`${node.q} ${ans ? 'YES' : 'NO'}`);
    node = ans ? node.yes : node.no;
  }
  return { rank: node ? node.rank : 'CADET', path };
}
export function rankFacts(mi, score) {
  return {
    reached: !!mi.orbit.reached, packets: mi.signal.packets || 0,
    strongClues: mi.rocks.samples.filter((s) => s.evidence === 'strong').length,
    score: score.total, orbitStars: mi.orbit.stars || 0, parts: mi.installOrder.length
  };
}

// ======================= you vs real mission =======================
export function playerValue(key, mi) {
  const opt = (id) => stationOption(id, mi.stations[id]);
  const res = mi.instruments.results || {};
  switch (key) {
    case 'build.parts': return opt('structure') ? opt('structure').name : '—';
    case 'build.power': return opt('power') ? opt('power').name : '—';
    case 'build.comms': return opt('comms') ? opt('comms').name : '—';
    case 'build.attitude': return opt('attitude') ? opt('attitude').name : '—';
    case 'inst.list': return Object.values(mi.instruments.placed).map((id) => (instrumentById(id) || {}).short).filter(Boolean).join(', ') || '—';
    case 'inst.req': return Math.round((res.capability || 0) / 20);
    case 'inst.compat': return res.compatibility || 0;
    case 'inst.budget': return `${Object.keys(mi.instruments.placed).length} tools placed`;
    case 'orbit.window': return mi.orbit.launchDay;
    case 'orbit.transfer': return mi.orbit.reached ? 'transfer' : 'missed';
    case 'orbit.travel': return mi.orbit.travelDays || 0;
    case 'orbit.fuel': return `${mi.orbit.fuelUsed ?? '—'}%`;
    case 'launch.hull': return `${mi.launch.hull}/3`;
    case 'launch.tcm': return 'Not modeled in the game';
    case 'launch.rocket': return 'Delta II';
    case 'rock.samples': return mi.rocks.samples.length;
    case 'rock.clues': return mi.rocks.samples.filter((s) => s.evidence === 'strong').length;
    case 'rock.energy': return `${mi.rocks.energyLeft}%`;
    case 'comms.route': return mi.comms.route;
    case 'comms.window': return mi.comms.window;
    case 'comms.priority': return mi.comms.quality || '—';
    case 'signal.packets': return `${mi.signal.packets}/3`;
    default: return '—';
  }
}
export function matchResult(row, value, mi) {
  switch (row.match_rule) {
    case 'sim': return null;
    case 'stationB': return mi.stations[row.station] === 'B' ? 'match' : (mi.stations[row.station] ? 'different' : 'different');
    case 'athena': {
      const athena = content.instruments.athena; const placed = Object.values(mi.instruments.placed);
      const n = athena.filter((a) => placed.includes(a)).length;
      return n === athena.length ? 'match' : n >= 3 ? 'close' : 'different';
    }
    case 'range': {
      const v = Number(value);
      if (v >= row.min && v <= row.max) return 'match';
      if (v >= row.cmin && v <= row.cmax) return 'close';
      return 'different';
    }
    case 'eq': return value === row.value ? 'match' : (row.close && value === row.close ? 'close' : 'different');
    default: return null;
  }
}
// pretty value for the table
export function displayValue(key, value, mi, eph) {
  if (key === 'orbit.window' && eph) return fmtDate(dateFromDay(content.orbit.ephemerisStart, value));
  if (key === 'orbit.travel') return value ? `${value} days (~${Math.round(value / 30.4)} months)` : 'did not arrive';
  if (key === 'orbit.transfer') return value === 'transfer' ? 'Transfer trajectory' : 'Missed Mars';
  if (key === 'inst.req') return `${value}/5`;
  if (key === 'inst.compat') return `${value}% (game value)`;
  if (key === 'rock.samples') return `${value}/3`;
  if (key === 'rock.clues') return `${value} strong`;
  if (key === 'comms.route') return value === 'uhf' ? 'UHF relay via orbiter' : value === 'dte' ? 'Direct-to-Earth X-band' : '—';
  if (key === 'comms.window') { const w = (content.comms.windows || []).find((x) => x.id === value); return w ? w.name : '—'; }
  if (key === 'comms.priority') return value === 'good' ? 'Health + key science first' : value === 'ok' ? 'Partly prioritized' : 'Big files first';
  return String(value);
}
