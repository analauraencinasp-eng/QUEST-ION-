// tests-run.mjs — `node tests/tests-run.mjs`. Checks the pure game logic of the later screens (13–16, music)
// with normal cases and edge cases. No browser needed: Phaser is stubbed, content is read from data/content.
import { readFileSync } from 'node:fs';
globalThis.Phaser = { Scene: class {} };
const { setContent, content } = await import('../src/content.js');
for (const f of ['review', 'launch_facts', 'ui', 'rocks', 'quiz_rockhunter', 'quiz_discoveries', 'comms', 'instruments', 'stations', 'mission_comparison', 'orbit']) setContent(f, JSON.parse(readFileSync(`data/content/${f}.json`, 'utf8')));
setContent('ephemeris', JSON.parse(readFileSync('data/ephemeris_mer.json', 'utf8')));

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.log('FAIL', name); } };

// ---- music ----
const A = await import('../src/audio.js');
ok(A.trackFor('OrbitScene') === 'minigame' && A.trackFor('SignalRunScene') === 'minigame', 'mini-games use minigame.mp3');
ok(A.trackFor('DashboardScene') === 'ambience' && A.trackFor('NextUpScene') === 'ambience', 'regular screens use ambience.mp3');
ok(A.MINIGAME_SCENES.size === 8, '8 mini-games (team decision)');
ok(A.musicLevel({ music: true, musicVolume: 25 }, false) === 0.25, 'default music volume 25 %');
ok(Math.abs(A.musicLevel({ music: true, musicVolume: 25 }, true) - 0.0875) < 1e-9, 'ducks under the narrator');
ok(A.musicLevel({ music: false, musicVolume: 80 }, false) === 0, 'music OFF = silent');
ok(A.musicLevel({ music: true }, false) === 0.25, 'old saves without musicVolume get 25 %');
ok(A.musicLevel({ music: true, musicVolume: 140 }, false) === 1, 'volume clamped to 100 %');

// ---- 13 meteors (just for fun) ----
const M = await import('../src/minigames/MeteorScene.js');
const sch = M.rockSchedule();
ok(sch.length > 20 && sch.every((e, i) => !i || e.t > sch[i - 1].t), 'rock schedule is long and ordered in time');
ok(JSON.stringify(sch) === JSON.stringify(M.rockSchedule()), 'same seed → same game');
ok(sch.every((e) => e.t < M.DURATION), 'no rock after reaching orbit');
ok(M.launchStars(0, true) === 5 && M.launchStars(2, true) === 3, 'stars = 5 − hull lost');
ok(M.launchStars(3, false) === 0, 'no stars when the hull is gone');
const MinHeap = (await import('../src/ds/MinHeap.js')).default;
const h = new MinHeap((e) => e.t); [...sch].reverse().forEach((e) => h.push(e));
ok(h.pop().t === sch[0].t, 'min-heap gives the earliest rock first even when pushed in reverse');

// ---- 13e / 14f quiz gate ----
const Q = await import('../src/scenes/QuizGateScene.js');
const qs = content.quiz_rockhunter.questions;
const q1 = Q.nextQuestion(qs, null), q2 = Q.nextQuestion(qs, q1), q3 = Q.nextQuestion(qs, q2), q4 = Q.nextQuestion(qs, q3), q5 = Q.nextQuestion(qs, q4);
ok(q1.tier === 1 && q2.tier === 2 && q3.tier === 3, 'tiers 1 → 2 → 3 after wrong answers');
ok(q4.tier === 3 && q4.id !== q3.id && q5.id === q3.id, 'tier 3 rotates');
ok(Q.nextQuestion([{ id: 'only', tier: 1 }], { id: 'only', tier: 1 }).id === 'only', 'edge: a quiz with one question keeps it');
for (const quiz of [content.quiz_rockhunter, content.quiz_discoveries]) ok(quiz.questions.every((q) => q.options.length === 3 && q.answer_index >= 0 && q.answer_index < 3 && q.source_url), `${quiz.id}: 3 options, valid answer, source`);

// ---- 14 Rock Hunter ----
const RH = await import('../src/minigames/RockHunterScene.js');
const hem = content.rocks.rocks.find((r) => r.id === 'hematite');
ok(RH.scanRock(hem, ['mossbauer']).readable && RH.scanRock(hem, ['mossbauer']).evidence === 'strong', 'Mössbauer reads hematite');
ok(!RH.scanRock(hem, ['moxie']).readable, 'wrong kit → inconclusive');
ok(!RH.scanRock(hem, []).readable, 'edge: empty kit');
const pts = content.rocks.game.points;
ok(RH.rockScience([{ evidence: 'strong' }, { evidence: 'weak' }, { evidence: null }], pts) === 50, 'science = strong 40 + weak 10 + inconclusive 0');
ok(RH.rockStars(0, 0) === 0 && RH.rockStars(0, 1) === 1 && RH.rockStars(200, 3) === 5, 'rock stars limits');

// ---- 15 comms planner ----
const R = await import('../src/rules.js');
const CS = await import('../src/minigames/CommsScene.js');
const mi = { rocks: { samples: [{ name: 'HEMATITE SPHERES', evidence: 'strong' }] } };
const items = CS.commsItems(mi);
ok(items.find((i) => i.id === 'spectra').name.includes('hematite'), '{CLUES} filled with the real clues');
ok(CS.commsItems({ rocks: { samples: [] } }).find((i) => i.id === 'spectra').name.includes('no strong clue'), 'edge: no clues');
ok(CS.windowsFor('dte').every((w) => w.route === 'dte') && CS.windowsFor('uhf').every((w) => !w.route), 'windows follow the route');
const best = R.judgePlan(R.bestOrder(items), items, 60);
ok(best.scienceSent && best.returnedMb <= 60, 'best order sends the key science first');
const bad = R.judgePlan(content.comms.startOrder, items, 60);
ok(!bad.scienceSent && bad.quality === 'poor', 'big pictures first → poor plan');
ok(R.judgePlan(R.bestOrder(items), items, 0).sent.length === 0, 'edge: zero capacity sends nothing');
ok(R.commsScore({ comms: { quality: 'good' }, signal: { packets: 3 } }) === 1, 'comms score max');
ok(R.commsScore({ comms: {}, signal: {} }) === 0, 'edge: nothing planned or sent');

// ---- 16 Talk + Signal Run ----
const TK = await import('../src/scenes/TalkScene.js');
const O = await import('../src/orbit.js');
const eph = content.ephemeris;
const min = O.lightMinutes(eph, TK.talkDay({ orbit: {} }, eph));
ok(min > 3 && min < 23, `light delay on 25 Jan 2004 is inside the real 3–22 min range (${min.toFixed(1)})`);
ok(TK.talkDay({ orbit: { arrivalDate: '2099-01-01' } }, eph) === eph.bodies.earth.length - 1, 'edge: dates after the ephemeris are clamped');
const SR = await import('../src/minigames/SignalRunScene.js');
const pp = SR.packetPlan({ done: true, returnedMb: 60, totalMb: 83 }, 3);
ok(pp.perPacket === 20 && pp.inMemory === 83, 'packets carry the planned data');
ok(SR.packetPlan(null, 3).planned === 60, 'edge: no comms plan → default pass');
ok(!SR.inWindow(SR.orbiterX(0)) && SR.inWindow(SR.orbiterX(10)) && !SR.inWindow(SR.orbiterX(19.9)), 'orbiter enters and leaves the link window');
const Queue = (await import('../src/ds/Queue.js')).default;
const q = new Queue(); q.enqueue(1); q.enqueue(2); const first = q.dequeue(); q.enqueue(first);
ok(q.dequeue() === 2 && q.dequeue() === 1 && q.isEmpty(), 'missed packet goes back to the end of the memory queue (FIFO)');
ok(content.comms.signal.memory.realFlashMB === 256, 'real MER flash memory (source in SOURCES.md)');

// ---- 15 dashboard ----
const D = await import('../src/scenes/DashboardScene.js');
const full = { stations: { structure: 'B', power: 'B', comms: 'B', computer: 'B', attitude: 'B' }, installOrder: [1, 2, 3, 4, 5], meters: { budget: 70000, energy: 80, responsibility: 60 },
  instruments: { placed: { a: 'pancam', b: 'minites', c: 'mi', d: 'apxs', e: 'mossbauer', f: 'rat' }, results: { capability: 90, compatibility: 100 } },
  orbit: { reached: true, travelDays: 205, launchDay: 157, stars: 4, fuelUsed: 60 }, launch: { hull: 0, done: true }, rocks: { samples: [], science: 0, energyLeft: 50, done: true },
  comms: { route: 'uhf', window: 'w1', quality: 'good' }, signal: { packets: 3, energyLeft: 40, done: true } };
const st3 = content.mission_comparison.stages[2];
ok(D.stageMatches(st3, full).match === 3, 'orbit stage: 3 matches for a Spirit-like trip');
const s1 = R.computeScore(full), s2 = R.computeScore({ ...full, launch: { hull: 3, done: true } });
ok(s1.total === s2.total, 'the meteor mini-game never changes the score (team decision)');
const rs = D.resourceSeries(full);
ok(rs.fuel[0] === 100 && rs.fuel[2] === 40 && rs.energy[5] === 40, 'resource chart uses the real spent values');


// ---- learning review (17–26, 15-R) ----
const RV = await import('../src/review.js');
const weak = JSON.parse(JSON.stringify(full));
Object.assign(weak, { orbit: { reached: true, travelDays: 245, launchDay: 100, stars: 2, fuelUsed: 86, dvTotal: 7.72, launchDate: '2003-04-11' },
  rocks: { samples: [{ id: 'hematite', evidence: 'strong' }, { id: 'basalt', evidence: 'weak' }], science: 50, energyLeft: 30, done: true },
  comms: { route: 'uhf', window: 'w1', quality: 'poor' }, signal: { packets: 1 } });
weak.instruments.placed = { a: 'pancam', b: 'minites', c: 'mi', d: 'pixl', e: 'mossbauer', f: 'rat' };
const sel = RV.selectConcepts(weak);
ok(sel.mode === 'weak' && sel.concepts.length >= 3 && sel.concepts.length <= 5, `weak game → 3–5 concepts (${sel.concepts})`);
ok(sel.concepts.every((id, i) => !i || sel.blocks[sel.concepts[i - 1]] >= sel.blocks[id]), 'weakest concepts first');
ok(sel.concepts.includes('window') && sel.concepts.includes('data'), 'low RESOURCES and DATA SENT bring their concepts');
const cats = RV.categoryScores(weak);
ok(['science', 'engineering', 'resources', 'earth', 'data'].every((k) => typeof cats[k] === 'number'), 'categories = the existing score categories + comms part');
ok(RV.reasonFor(RV.conceptById('window'), weak).includes('7.72'), 'reason uses the real mission numbers');
ok(RV.reasonFor(RV.conceptById('instruments'), weak).includes('APXS'), 'reason names the missing Athena instrument');
const great = JSON.parse(JSON.stringify(full)); great.rocks = { samples: [{ evidence: 'strong' }, { evidence: 'strong' }, { evidence: 'strong' }], science: 120, energyLeft: 80, done: true };
great.meters.budget = 20000; great.meters.responsibility = 90; great.orbit.fuelUsed = 20; great.instruments.results = { capability: 100, compatibility: 100 };
const gs = RV.selectConcepts(great);
ok(gs.mode === 'bonus' && gs.concepts.join() === 'maxq,escape,flash', `all good → bonus concepts (${gs.mode}, cats ${JSON.stringify(gs.categories)})`);
const qsA = RV.checkQuestions(sel.concepts), qsB = RV.checkQuestions(sel.concepts);
ok(qsA.length === 3 && JSON.stringify(qsA) === JSON.stringify(qsB), 'same 3 check questions whatever the format');
ok(RV.scoreCheck(qsA, qsA.map((q) => q.answer)) === 3 && RV.scoreCheck(qsA, [null, null, null]) === 0, 'check score 0–3');
const rvs = { ...RV.freshReview(), ...sel, seen: { [sel.concepts[0]]: { visual: true } }, check: qsA.map((q) => q.answer) };
const aft = RV.blocksAfter(rvs);
ok(aft[sel.concepts[0]] === Math.max(0, sel.blocks[sel.concepts[0]] - 3), 'reviewed + right in the check = 3 blocks less');
ok(sel.concepts.slice(3).every((id) => aft[id] === sel.blocks[id]), 'concepts not reviewed and not checked keep their blocks');
ok(RV.leitner(1, true) === 2 && RV.leitner(3, true) === 3 && RV.leitner(2, false) === 1, 'Leitner boxes 1 → 2 → 3, miss → 1');
for (const c of [...content.review.concepts, ...content.review.bonus]) ok(c.comic.length >= 3 && c.podcast[2].length >= 4 && c.flash.length === 2 && c.practice[1].length === 3 && c.check[1].length === 3 && c.source, `${c.id}: every format has content and a source`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
