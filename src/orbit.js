// orbit.js — the science of Screen 12 (pure math, no Phaser, unit-tested in Node).
//
// Planet positions and velocities: JPL Horizons (heliocentric, ecliptic J2000, AU and AU/day), either fetched live by
// server.mjs (/api/horizons) or from the saved copy data/ephemeris_mer.json. If the saved copy has no velocities,
// they are taken from the positions one day before and after (central difference).
//
// Trajectory: a LAMBERT problem. Given where Earth is on the launch day (r1), where Mars is on the arrival day (r2)
// and the time of flight, find the transfer orbit around the Sun that joins them (universal-variable method,
// H. Curtis, "Orbital Mechanics for Engineering Students", algorithm 5.2; prograde = same direction as the planets).
//   Δv departure = |v_transfer(at Earth) − v_Earth|   (hyperbolic excess speed leaving Earth)
//   Δv arrival   = |v_Mars − v_transfer(at Mars)|     (excess speed when reaching Mars)
//   Δv total     = departure + arrival
// Δv measures the propulsion effort. It is not fuel: fuel also depends on the engine and the spacecraft's mass.
// Simplifications (said in the game): Sun gravity only, the planets' own gravity is ignored, launch from Earth's centre.

export const MU_SUN = 0.00029591220828559;       // AU^3 / day^2 (Sun's GM, same value JPL uses)
export const AU_PER_DAY_TO_KMS = 1731.45683681;  // 1 AU/day in km/s (149,597,870.7 km / 86,400 s)

// ---------------- ephemeris ----------------
export function ephDays(eph) { return eph.bodies.earth.length; }

function rowAt(eph, body, day) {
  const rows = eph.bodies[body];
  const d = Math.max(0, Math.min(rows.length - 1.000001, day));
  const i = Math.floor(d), f = d - i, a = rows[i], b = rows[i + 1] || a;
  const lerp = (k) => a[k] + (b[k] - a[k]) * f;
  return { a, b, i, f, lerp };
}

export function stateAt(eph, body, day) {
  const { lerp, a } = rowAt(eph, body, day);
  const r = [lerp('x'), lerp('y'), lerp('z') || 0];
  let v;
  if (typeof a.vx === 'number') v = [lerp('vx'), lerp('vy'), lerp('vz') || 0];
  else {                                                      // central difference of the real positions
    const p = rowAt(eph, body, day - 1).lerp, n = rowAt(eph, body, day + 1).lerp;
    v = [(n('x') - p('x')) / 2, (n('y') - p('y')) / 2, ((n('z') || 0) - (p('z') || 0)) / 2];
  }
  return { r, v };
}

// ---------------- vectors ----------------
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.sqrt(dot(a, a));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Stumpff functions
function stumpC(z) {
  if (z > 1e-8) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-8) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 0.5;
}
function stumpS(z) {
  if (z > 1e-8) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); }
  if (z < -1e-8) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); }
  return 1 / 6;
}

// ---------------- Lambert (prograde) ----------------
// returns { v1, v2 } (AU/day) or null when there is no solution
export function lambert(r1v, r2v, tof, mu = MU_SUN) {
  const r1 = norm(r1v), r2 = norm(r2v);
  const c12 = cross(r1v, r2v);
  let dtheta = Math.acos(Math.max(-1, Math.min(1, dot(r1v, r2v) / (r1 * r2))));
  if (c12[2] < 0) dtheta = 2 * Math.PI - dtheta;              // prograde: planets go counter-clockwise seen from ecliptic north
  const A = Math.sin(dtheta) * Math.sqrt(r1 * r2 / (1 - Math.cos(dtheta)));
  if (!isFinite(A) || Math.abs(A) < 1e-12) return null;
  const y = (z) => r1 + r2 + A * (z * stumpS(z) - 1) / Math.sqrt(stumpC(z));
  const F = (z) => { const yz = y(z); return Math.pow(yz / stumpC(z), 1.5) * stumpS(z) + A * Math.sqrt(yz) - Math.sqrt(mu) * tof; };
  // bracket the root: y(z) must be positive; F grows with z
  let lo = -4 * Math.PI * Math.PI, hi = 4 * Math.PI * Math.PI - 1e-6;
  while (y(lo) < 0 && lo < hi) lo += 0.1;
  if (!(F(lo) < 0 && F(hi) > 0)) { if (!(F(lo) < 0)) return null; if (!(F(hi) > 0)) return null; }
  let z = 0;
  for (let k = 0; k < 200; k++) {                             // bisection: slow but never diverges
    z = (lo + hi) / 2;
    const f = F(z);
    if (Math.abs(f) < 1e-11) break;
    if (f > 0) hi = z; else lo = z;
  }
  const yz = y(z);
  const f = 1 - yz / r1, g = A * Math.sqrt(yz / mu), gdot = 1 - yz / r2;
  const v1 = [(r2v[0] - f * r1v[0]) / g, (r2v[1] - f * r1v[1]) / g, (r2v[2] - f * r1v[2]) / g];
  const v2 = [(gdot * r2v[0] - r1v[0]) / g, (gdot * r2v[1] - r1v[1]) / g, (gdot * r2v[2] - r1v[2]) / g];
  return { v1, v2 };
}

// ---------------- one trajectory ----------------
// launchDay = days since eph.start ; tof = time of flight in days
export function transfer(eph, launchDay, tof) {
  const last = ephDays(eph) - 2;
  if (launchDay < 1 || launchDay + tof > last) return { ok: false, reason: 'range' };
  const E = stateAt(eph, 'earth', launchDay), M = stateAt(eph, 'mars', launchDay + tof);
  const sol = lambert(E.r, M.r, tof);
  if (!sol) return { ok: false, reason: 'nosolution' };
  const dvDep = norm(sub(sol.v1, E.v)) * AU_PER_DAY_TO_KMS;
  const dvArr = norm(sub(M.v, sol.v2)) * AU_PER_DAY_TO_KMS;
  return { ok: true, launchDay, tof, arrivalDay: launchDay + tof, dvDep, dvArr, dvTotal: dvDep + dvArr,
    r1: E.r, v1: sol.v1, r2: M.r, earthV: E.v, marsV: M.v };
}

// points of the transfer path (for drawing): integrate the Sun's gravity from (r1, v1) for tof days (RK4)
export function pathPoints(tr, n = 90) {
  if (!tr || !tr.ok) return [];
  const acc = (p) => { const r = norm(p); const k = -MU_SUN / (r * r * r); return [k * p[0], k * p[1], k * p[2]]; };
  let p = tr.r1.slice(), v = tr.v1.slice();
  const steps = Math.max(n, Math.ceil(tr.tof * 2)), h = tr.tof / steps, every = Math.max(1, Math.floor(steps / n));
  const out = [{ x: p[0], y: p[1] }];
  const add = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
  for (let i = 1; i <= steps; i++) {
    const k1v = acc(p), k1p = v;
    const k2v = acc(add(p, k1p, h / 2)), k2p = add(v, k1v, h / 2);
    const k3v = acc(add(p, k2p, h / 2)), k3p = add(v, k2v, h / 2);
    const k4v = acc(add(p, k3p, h)), k4p = add(v, k3v, h);
    p = [p[0] + h / 6 * (k1p[0] + 2 * k2p[0] + 2 * k3p[0] + k4p[0]), p[1] + h / 6 * (k1p[1] + 2 * k2p[1] + 2 * k3p[1] + k4p[1]), p[2] + h / 6 * (k1p[2] + 2 * k2p[2] + 2 * k3p[2] + k4p[2])];
    v = [v[0] + h / 6 * (k1v[0] + 2 * k2v[0] + 2 * k3v[0] + k4v[0]), v[1] + h / 6 * (k1v[1] + 2 * k2v[1] + 2 * k3v[1] + k4v[1]), v[2] + h / 6 * (k1v[2] + 2 * k2v[2] + 2 * k3v[2] + k4v[2])];
    if (i % every === 0 || i === steps) out.push({ x: p[0], y: p[1] });
  }
  return out;
}

// ---------------- comparing trajectories ----------------
// All (launch day, travel time) pairs on a grid: the "porkchop" table. cfg = orbit.json "lambert" block.
export function grid(eph, cfg) {
  const rows = [];
  const maxLaunch = ephDays(eph) - 2 - cfg.tofMin;
  for (let d = 1; d <= maxLaunch; d += cfg.gridStepDays) {
    for (let tof = cfg.tofMin; tof <= cfg.tofMax; tof += cfg.gridStepTof) {
      if (d + tof > ephDays(eph) - 2) continue;
      const tr = transfer(eph, d, tof);
      if (tr.ok) rows.push({ launchDay: d, tof, dvDep: tr.dvDep, dvArr: tr.dvArr, dvTotal: tr.dvTotal });
    }
  }
  return rows;
}

export function feasible(tr, cfg) { return !!tr && tr.ok && tr.dvDep <= cfg.maxDepartureKms && tr.dvTotal <= cfg.maxTotalKms; }

// score: lower is better. fuel = Δv total ; fast = travel time ; balance = both, each compared with the best possible
export function score(tr, criterion, ref) {
  if (criterion === 'fuel') return tr.dvTotal;
  if (criterion === 'fast') return tr.tof;
  return 0.5 * (tr.dvTotal / ref.minDv) + 0.5 * (tr.tof / ref.minTof);
}

// the best option for a criterion among the feasible ones of the grid
export function bestFor(rows, criterion, cfg) {
  const ok = rows.filter((r) => feasible({ ok: true, ...r }, cfg));
  if (!ok.length) return null;
  const ref = { minDv: Math.min(...ok.map((r) => r.dvTotal)), minTof: Math.min(...ok.map((r) => r.tof)) };
  let best = null, bs = Infinity;
  for (const r of ok) {
    const s = score(r, criterion, ref);
    if (s < bs - 1e-9 || (Math.abs(s - bs) < 1e-9 && r.dvTotal < best.dvTotal)) { bs = s; best = r; }
  }
  return { ...best, score: bs, ref };
}

// how good is the player's trajectory for their criterion? 0..5 stars (game rating, explained on screen)
export function rate(tr, criterion, best, cfg) {
  if (!tr || !tr.ok) return { stars: 0, label: 'none' };
  if (!feasible(tr, cfg)) return { stars: 0, label: 'tooMuch' };
  const s = score(tr, criterion, best.ref), b = best.score;
  const ratio = b / s;                                        // 1 = as good as the best
  const stars = ratio >= 0.98 ? 5 : ratio >= 0.9 ? 4 : ratio >= 0.8 ? 3 : ratio >= 0.65 ? 2 : 1;
  return { stars, ratio, label: stars === 5 ? 'best' : stars >= 3 ? 'good' : 'weak' };
}
