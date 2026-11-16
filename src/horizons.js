// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// horizons.js — talks to the JPL Horizons API (https://ssd-api.jpl.nasa.gov/doc/horizons.html).
// Used by server.mjs (live, /api/horizons) and tools/fetch_ephemeris.mjs (saves data/ephemeris_mer.json).
// Same request for both: heliocentric (CENTER 500@10) state VECTORS of Earth (399) and Mars (499), ecliptic J2000,
// one per day, AU and AU/day, with positions AND velocities (VEC_TABLE 2).
// No API key is needed. Nothing is invented: if Horizons does not answer, the caller uses the saved copy.

export const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
export const HORIZONS_DOCS = 'https://ssd-api.jpl.nasa.gov/doc/horizons.html';
export const RANGE = { start: '2003-01-01', stop: '2005-12-31' };   // MER 2003 window, the 2005 window and the cruise in between

export function horizonsUrl(bodyId, start = RANGE.start, stop = RANGE.stop) {
  const p = new URLSearchParams({
    format: 'json', COMMAND: `'${bodyId}'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'", START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: "'1 d'",
    VEC_TABLE: "'2'", REF_PLANE: 'ECLIPTIC', OUT_UNITS: "'AU-D'", CSV_FORMAT: 'YES'
  });
  return `${HORIZONS_API}?${p.toString()}`;
}

// rows between $$SOE and $$EOE: JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ
export function parseVectors(result) {
  const s = result.indexOf('$$SOE'), e = result.indexOf('$$EOE');
  if (s < 0 || e < 0) throw new Error('no $$SOE/$$EOE block in the Horizons answer');
  const rows = [];
  for (const line of result.slice(s + 5, e).trim().split('\n')) {
    const c = line.split(',').map((x) => x.trim());
    if (c.length < 8) continue;
    const r = (v, d = 7) => +(+v).toFixed(d);
    rows.push({ jd: +c[0], date: c[1].replace('A.D. ', '').slice(0, 11), x: r(c[2]), y: r(c[3]), z: r(c[4]), vx: r(c[5], 9), vy: r(c[6], 9), vz: r(c[7], 9) });
  }
  if (!rows.length) throw new Error('Horizons answer has no rows');
  return rows;
}

// fetchFn = global fetch (Node 18+). Returns the same shape as data/ephemeris_mer.json.
export async function fetchEphemeris(fetchFn = fetch, { start = RANGE.start, stop = RANGE.stop, timeoutMs = 20000 } = {}) {
  const out = { source: `JPL Horizons API (${HORIZONS_API})`, docs: HORIZONS_DOCS, fetched: new Date().toISOString(),
    center: 'Sun (500@10)', frame: 'ecliptic J2000', units: 'AU, AU/day', step: '1 day', start, stop, queries: {}, bodies: {} };
  for (const [name, id] of [['earth', '399'], ['mars', '499']]) {
    const url = horizonsUrl(id, start, stop);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
      const res = await fetchFn(url, ctl ? { signal: ctl.signal } : undefined);
      if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(`Horizons error: ${json.error}`);
      out.queries[name] = url;
      out.bodies[name] = parseVectors(json.result);
    } finally { if (timer) clearTimeout(timer); }
  }
  if (out.bodies.earth.length !== out.bodies.mars.length) throw new Error('Earth and Mars tables have different lengths');
  return out;
}
