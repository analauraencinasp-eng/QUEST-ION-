// fetch_ephemeris.mjs — downloads REAL heliocentric positions of Earth (399) and Mars (499)
// from the JPL Horizons API, one per day, around the MER launch + cruise period, and saves
// data/ephemeris_mer.json. Range 2003-01-01 → 2005-12-31 (superset of May 2003 → Mar 2004) so the
// 780-day launch slider of the Figma has real data. The game reads that file (GitHub Pages is
// static and Horizons may not allow browser CORS).   Run:  node tools/fetch_ephemeris.mjs
// API docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html
import { writeFileSync } from 'node:fs';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const START = '2003-01-01', STOP = '2005-12-31';   // covers the MER window (May–Aug 2003) + the Figma slider range (780 days) + cruise

function query(body) {
  const p = new URLSearchParams({
    format: 'json', COMMAND: `'${body}'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'", START_TIME: `'${START}'`, STOP_TIME: `'${STOP}'`, STEP_SIZE: "'1 d'",
    VEC_TABLE: "'2'", REF_PLANE: 'ECLIPTIC', OUT_UNITS: "'AU-D'", CSV_FORMAT: 'YES'
  });
  return `${API}?${p.toString()}`;
}

function parse(result) {
  const s = result.indexOf('$$SOE'), e = result.indexOf('$$EOE');
  if (s < 0 || e < 0) throw new Error('no $$SOE/$$EOE block in Horizons answer');
  const rows = [];
  for (const line of result.slice(s + 5, e).trim().split('\n')) {
    const c = line.split(',').map((x) => x.trim());
    // JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ
    const date = c[1].replace('A.D. ', '').slice(0, 11);
    rows.push({ jd: +c[0], date, x: +(+c[2]).toFixed(6), y: +(+c[3]).toFixed(6), z: +(+c[4]).toFixed(6) });
  }
  return rows;
}

const out = { source: 'JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api)', docs: 'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
  fetched: new Date().toISOString(), center: 'Sun (500@10)', frame: 'ecliptic J2000', units: 'AU', step: '1 day', start: START, stop: STOP, queries: {}, bodies: {} };

for (const [name, id] of [['earth', '399'], ['mars', '499']]) {
  const url = query(id);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
  const json = await res.json();
  out.queries[name] = url;
  out.bodies[name] = parse(json.result);
  console.log(name, out.bodies[name].length, 'days');
}
writeFileSync(new URL('../data/ephemeris_mer.json', import.meta.url), JSON.stringify(out));
console.log('saved data/ephemeris_mer.json');
