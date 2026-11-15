// review.js — the learning review after the mission (Screens 17–26 + report page 15-R).
// WHAT to review comes from the player's real results; HOW (the format) is the player's choice.
//   1. Category scores: the existing final score (rules.computeScore → science, engineering, resources, earth)
//      plus the communications part of the score (rules.commsScore → "DATA SENT").
//   2. Each concept in review.json belongs to one category and one stage table (15-D1…D6).
//      Weakness blocks (0–5) = category level (<50 % → 3, <70 % → 2, else 0)
//                              + 1 per ✕ DIFFERENT row and +0.5 per ≈ CLOSE row of its stage table.
//   3. Concepts with 2+ blocks are weak. Keep the weakest (max 5); if there are 1–2, fill up to 3 with the
//      next ones that still have blocks. If none is weak → "everything went great": bonus concepts the player
//      saw (12.5, 16a) but never reviewed.
// Pure functions (tested in tests/tests-run.mjs). Scenes keep their progress in state.mission.review.
import { content, fill } from './content.js';
import { computeScore, commsScore, playerValue, matchResult, instrumentById } from './rules.js';

export const FORMATS = ['visual', 'podcast', 'flashcards', 'questions', 'text'];

export function freshReview() {
  return { mode: null, concepts: [], blocks: {}, categories: null, format: null, idx: 0, seen: {}, boxes: {},
    practice: {}, check: [], checkDone: false, startedAt: null, spentSec: 0, after: {}, done: false, runs: 0 };
}

// category scores 0–100 (real game data)
export function categoryScores(mi) {
  const s = computeScore(mi);
  return { science: s.science, engineering: s.engineering, resources: s.resources, earth: s.earth, data: Math.round(commsScore(mi) * 100) };
}

export function categoryLevel(score, rules) {
  if (score < rules.priority) return 'priority';
  if (score < rules.good) return 'reinforce';
  return 'good';
}

// MATCH / CLOSE / DIFFERENT rows of one stage table
export function stageResult(stageN, mi) {
  const st = content.mission_comparison.stages[stageN - 1];
  const out = { match: 0, close: 0, different: 0 };
  if (!st) return out;
  for (const row of st.rows) { const r = matchResult(row, playerValue(row.player_key, mi), mi); if (r) out[r] += 1; }
  return out;
}

export function conceptBlocks(concept, cats, mi, rules) {
  const sc = cats[concept.category] ?? 100;
  const base = sc < rules.priority ? 3 : sc < rules.good ? 2 : 0;
  const r = concept.stage ? stageResult(concept.stage, mi) : { different: 0, close: 0 };
  return Math.max(0, Math.min(5, Math.round(base + r.different + r.close * 0.5)));
}

// the explainable selection (traceable to the results)
export function selectConcepts(mi) {
  const R = content.review;
  const rules = R.rules;
  const cats = categoryScores(mi);
  const ranked = R.concepts.map((c) => ({ c, blocks: conceptBlocks(c, cats, mi, rules) }))
    .sort((a, b) => b.blocks - a.blocks || R.concepts.indexOf(a.c) - R.concepts.indexOf(b.c));
  let pick = ranked.filter((x) => x.blocks >= 2).slice(0, rules.maxConcepts);
  if (!pick.length) {
    return { mode: 'bonus', categories: cats, concepts: R.bonus.map((b) => b.id), blocks: Object.fromEntries(R.bonus.map((b) => [b.id, 0])) };
  }
  if (pick.length < rules.minConcepts) pick = pick.concat(ranked.filter((x) => x.blocks > 0 && !pick.includes(x)).slice(0, rules.minConcepts - pick.length));
  return { mode: 'weak', categories: cats, concepts: pick.map((x) => x.c.id), blocks: Object.fromEntries(pick.map((x) => [x.c.id, x.blocks])) };
}

export function conceptById(id) {
  const R = content.review;
  return R.concepts.find((c) => c.id === id) || R.bonus.find((c) => c.id === id) || null;
}

// {PLACEHOLDERS} from the mission
export function missionVars(mi) {
  const athena = content.instruments.athena;
  const placed = Object.values(mi.instruments.placed || {});
  const kit = mi.instruments.kit || [];
  const have = athena.filter((a) => placed.includes(a) || kit.includes(a));
  const missing = athena.filter((a) => !have.includes(a)).map((a) => (instrumentById(a) || { short: a }).short);
  const b = content.mission_comparison.stages[0];
  const matches = b ? b.rows.filter((row) => matchResult(row, playerValue(row.player_key, mi), mi) === 'match').length : 0;
  const q = { good: 'health and key science first', ok: 'partly prioritized', poor: 'big files first' }[mi.comms && mi.comms.quality] || 'not planned';
  return {
    LAUNCH: mi.orbit.launchDate ? fmt(mi.orbit.launchDate) : 'not planned', DV: mi.orbit.dvTotal ?? '—', FUEL: mi.orbit.fuelUsed ?? '—',
    SAMPLES: (mi.rocks.samples || []).length, STRONG: (mi.rocks.samples || []).filter((s) => s.evidence === 'strong').length,
    ATHENA: have.length, MISSING: missing.length ? `; missing: ${missing.join(', ')}` : '',
    PACKETS: (mi.signal && mi.signal.packets) || 0, QUALITY: q, MATCHES: matches
  };
}
function fmt(iso) { const d = new Date(`${iso}T00:00:00Z`); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }

export function reasonFor(concept, mi) {
  const v = missionVars(mi);
  if (concept.id === 'window' && !mi.orbit.reached && concept.reason.none) return concept.reason.none;
  return fill(concept.reason.ok, v);
}
export function T(str, mi) { return fill(str, missionVars(mi)); }

// the same 3 questions for every format: the check question of the first 3 selected concepts
export function checkQuestions(conceptIds, n = 3) {
  return conceptIds.slice(0, n).map((id) => { const c = conceptById(id); return { id, q: c.check[0], options: c.check[1], answer: c.check[2] }; });
}
export function scoreCheck(questions, answers) { return questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0); }

// weakness after the review: −1 if the concept was reviewed in any format, −2 if its check question was right
export function blocksAfter(review) {
  const out = {};
  const qs = checkQuestions(review.concepts);
  for (const id of review.concepts) {
    let b = review.blocks[id] || 0;
    if (review.seen[id] && Object.keys(review.seen[id]).length) b -= 1;
    const qi = qs.findIndex((q) => q.id === id);
    if (qi >= 0 && review.check[qi] === qs[qi].answer) b -= 2;
    out[id] = Math.max(0, b);
  }
  return out;
}

// Leitner: "I knew it" moves the card up one box (max 3), "I didn't know it" sends it back to box 1
export function leitner(box, knew) { return knew ? Math.min(3, (box || 1) + 1) : 1; }
export function boxCounts(review) {
  const c = [0, 0, 0];
  for (const id of review.concepts) c[(review.boxes[id] || 1) - 1] += 1;
  return c;
}

