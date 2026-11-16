// SI-assisted: generated with Claude Code (Anthropic); reviewed and edited by Team Thrusters.
// ephemeris.js — where Screen 12 gets the real Earth/Mars data.
//   1. With `npm start` (server.mjs): GET api/horizons → the server asks JPL Horizons live (positions + velocities).
//   2. If there is no server (GitHub Pages, Live Server) or Horizons does not answer: the saved copy
//      data/ephemeris_mer.json (also real Horizons data, downloaded with tools/fetch_ephemeris.mjs).
// The game never invents planet positions: one of these two is always real Horizons output.
import { content } from './content.js';

let cached = null;

function noBackend() {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return window.location.protocol === 'file:' || /github\.io$/i.test(h);
}

export async function loadEphemeris(timeoutMs = 9000) {
  if (cached) return cached;
  const saved = { eph: content.ephemeris, live: false, fetched: content.ephemeris && content.ephemeris.fetched };
  if (noBackend()) { cached = saved; return cached; }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const r = await fetch('api/horizons', { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const eph = await r.json();
    if (!eph.bodies || !eph.bodies.earth || !eph.bodies.mars) throw new Error('bad answer');
    cached = { eph, live: true, fetched: eph.fetched };
  } catch (e) {
    cached = saved;                                         // no server / Horizons down → saved real copy
  }
  return cached;
}
