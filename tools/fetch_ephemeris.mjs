// fetch_ephemeris.mjs — downloads REAL heliocentric positions AND velocities of Earth (399) and Mars (499) from the
// JPL Horizons API, one per day, 2003-01-01 → 2005-12-31 (MER 2003 window, cruise, and the 2005 window), and saves
// data/ephemeris_mer.json. GitHub Pages has no server, so the game uses this saved copy there; with `npm start`
// server.mjs asks Horizons live (/api/horizons) and only falls back to this file if Horizons does not answer.
//   Run:  node tools/fetch_ephemeris.mjs        API docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html
import { writeFileSync } from 'node:fs';
import { fetchEphemeris } from '../src/horizons.js';

const out = await fetchEphemeris(fetch);
writeFileSync(new URL('../data/ephemeris_mer.json', import.meta.url), JSON.stringify(out));
console.log(`saved data/ephemeris_mer.json · ${out.bodies.earth.length} days · ${out.start} → ${out.stop}`);
