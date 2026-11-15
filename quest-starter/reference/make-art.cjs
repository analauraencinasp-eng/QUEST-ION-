// make-art.cjs — builds every art-*.png and sfx-*.wav of the game from the
// pixel sprites we already made for "Órbita Compartida" (same PAL palette,
// same letter-grid sprites, same gold-cube ship and same 3D pixel planet).
// Run once:  node make-art.cjs   (needs the "sharp" package only for PNG output)
// Owner: P3. It does not change any game code.

const fs = require('fs');
let sharp;
try { sharp = require('sharp'); } catch (e) { sharp = require('/opt/npm-tools/node_modules/sharp'); }

// ---------- palettes from the previous game ----------
const PAL = { o: '#16152a', w: '#f6efe3', g: '#b9b2d0', v: '#93c5ff', h: '#ffffff', e: '#16152a', c: '#ff8a6b',
  y: '#ffd27a', m: '#86d8b4', l: '#c3a6ff', b: '#4a78c9', d: '#e0a84a', p: '#ffb3c7', r: '#ff7b8a', k: '#2b2a48', s: '#6f6990' };
const C = { void: '#0d0c1c', night: '#16152a', deep: '#201f38', mid: '#2b2a48', dim: '#33315a', line: '#4a4778', soft: '#6f6990',
  ice: '#b9b2d0', cream: '#f6efe3', sky: '#93c5ff', ocean: '#4a78c9', mint: '#86d8b4', leaf: '#4f9e78',
  sand: '#e0a84a', gold: '#ffd27a', goldD: '#c98f3a', goldDD: '#9a6a22', coral: '#ff8a6b', red: '#ff7b8a', lilac: '#c3a6ff' };
const ROLE_ACCENT = ['#ffd27a', '#93c5ff', '#c3a6ff', '#86d8b4']; // Director, Engineer, Scientist, Communications

// ---------- sprites from the previous game (copied as they were) ----------
const SPR = {
  astro: ['.....oooooo.....', '...oowwwwwwoo...', '..owwwwwwwwwwo..', '.owwoooooooowwo.', '.owovvvvvvvvowo.',
    '.owovhhvvvvvowo.', '.owovvevvevvowo.', '.owovpvvvvpvowo.', '.owwoooooooowwo.', '..owwwwwwwwwwo..',
    '..oocwwwwwwcoo..', '.owwowwyywwowwo.', '.owwowwccwwowwo.', '.oggowwwwwwoggo.', '..ooowwoowwooo..', '....occoocco....'],
  cheer: ['.....oooooo.....', '...oowwwwwwoo...', '..owwwwwwwwwwo..', '.owwoooooooowwo.', '.owovvvvvvvvowo.',
    '.owovhhvvvvvowo.', '.owovvevvevvowo.', '.owovpvoovpvowo.', '.owwoooooooowwo.', 'og.owwwwwwwwo.go',
    'ow.oocwwwwcoo.wo', '.ow.owwyywwo.wo.', '..o.owwccwwo.o..', '....owwwwwwo....', '....owwoowwo....', '....occoocco....'],
  sad: ['................', '.....oooooo.....', '...oowwwwwwoo...', '..owwwwwwwwwwo..', '.owwoooooooowwo.',
    '.owovvvvvvvvowo.', '.owovvvvvvvvowo.', '.owovveevveeowo.', '.owovvhvvvvvowo.', '.owwoooooooowwo.',
    '..owwwwwwwwwwo..', '..oocwwwwwwcoo..', '.owwowwyywwowwo.', '.oggowwccwwoggo.', '..ooowwoowwooo..', '....occoocco....'],
  sat: ['.......yy.......', '........o.......', 'oooo.oooooo.oooo', 'obbo.oddddo.obbo', 'obboodddddddobbo',
    'obbo.oeddeo.obbo', 'obbo.opddpo.obbo', 'obbo.odoodo.obbo', 'oooo.oooooo.oooo', '......o..o......'],
  alien: ['..l......l..', '...o....o...', '..oooooooo..', '.ommmmmmmmo.', 'ommemmmmemmo', 'ommemmmmemmo',
    'ompmmmmmmpmo', 'ommmmoommmmo', '.ommmmmmmmo.', '..oommmmoo..', '..om.oo.mo..', '..oo....oo..'],
  rocket: ['...oo...', '..owwo..', '.owwwwo.', '.owvvwo.', '.owvvwo.', '.owwwwo.', '.occcco.',
    'ocowwoco', 'oc.oo.co', 'o..yy..o', '...yy...', '...y....'],
  ufo: ['.....oooo.....', '....oemmeo....', '..oooooooooo..', '.ogggggggggggo', 'ogyggyggyggygo', '.oooooooooooo.'],
  box: ['ooooo', 'oddyo', 'odddo', 'oyddo', 'ooooo'],
  nut: ['.ooo.', 'oggro', 'og.go', 'oggo.', '.oo..'],
  paper: ['oooo', 'owwo', 'oggo', 'owwo', 'oooo'],
  wrench: ['oo..o', 'ogoog', '.ogo.', '..og.', '...oo'],
  star: ['..y..', '..y..', 'yyyyy', '..y..', '..y..'],
  // hand-made 16×16 icons of the previous game
  si: ['................', '................', '...ooooooooooo..', '..obbvbbvbbvbo..', '..obbvbbvbbvbo..', '..ovvvvvvvvvvo..', '..obbvbbvbbvbo..', '..obbvbbvbbvbo..', '..ovvvvvvvvvvo..', '..obbvbbvbbvbo..', '..ooooooooooooo.', '.......gg.......', '.......gg.......', '.....gggggg.....', '................', '................'],
  rocketH: ['.......o........', '......owo.......', '.....owwwo......', '.....owvwo......', '.....owwwo......', '..o..owwwo..o...', '.ogo.occco.ogo..', '.ogo.owwwo.ogo..', '.ogo.owwwo.ogo..', '.ogo.owwwo.ogo..', '.ogooowwwooogo..', '.ogocowocoocgo..', '.oyo.oyyyo.oyo..', '..y..yyyyy..y...', '.......c........', '................'],
  rocketS: ['.......o........', '......owo.......', '.....owwwo......', '.....owvwo......', '.....owwwo......', '.....owwwo......', '.....occco......', '.....owwwo......', '....oowwwoo.....', '...occowocco....', '...oc.oyo.co....', '.......y........', '......yyy.......', '.......c........', '................', '................'],
  rocketM: ['.......o........', '......owo.......', '.....owwwo......', '.....owvwo......', '.....owwwo......', '.....owwwo......', '.....occco......', '.....owwwo......', '.....owwwo......', '.....owwwo......', '....oowwwoo.....', '...occowocco....', '...oc.oyo.co....', '......yyy.......', '.......c........', '................'],

  // ---- HUD and UI icons (new, same 16×16 grid and PAL palette) ----
  coin: ['................', '.....oooooo.....', '...ooyyyyyyoo...', '..oyyyyddyyyyo..', '..oyyyddddyyyo..', '.oyyydyddyyyyyo.', '.oyyydyddyyyyyo.', '.oyyyyddddyyyyo.', '.oyyyyyddydyyyo.', '.oyyyyyddydyyyo.', '..oyyyddddyyyo..', '..oyyyyddyyyyo..', '...ooyyyyyyoo...', '.....oooooo.....', '................', '................'],
  weight: ['................', '......oooo......', '.....o....o.....', '.....o....o.....', '...oooooooooo...', '...okkkkkkkko...', '..okkkkkkkkkko..', '..okwkkwkwwwko..', '..okwkwkkwkkko..', '.okkwwkkkwkwkko.', '.okkwkwkkwwwkko.', '.okkkkkkkkkkkko.', 'oooooooooooooooo', '................', '................', '................'],
  bolt: ['................', '........ooo.....', '.......oyyo.....', '......oyyo......', '.....oyyo.......', '....oyyyoooo....', '...oyyyyyyyo....', '...ooooyyyo.....', '......oyyo......', '.....oyyo.......', '....oyyo........', '....oyo.........', '....oo..........', '................', '................', '................'],
  heart: ['................', '................', '..ooo....ooo....', '.orrro..orrro...', 'orrhrroorrrrro..', 'orhrrrrrrrrrro..', 'orrrrrrrrrrrro..', '.orrrrrrrrrro...', '..orrrrrrrro....', '...orrrrrro.....', '....orrrro......', '.....orro.......', '......oo........', '................', '................', '................'],
  stormphoto: ['oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'owddddddddddddwo', 'owyyyyyyyyyyyywo', 'owyyyrrrryyyyywo', 'owdddrrrrrrdddwo', 'owdddrrrrrrdddwo', 'owyyyyrrrryyyywo', 'owyyyyyyyyyyyywo', 'owddddddddddddwo', 'owyyyyyyyyyyyywo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo', '................', '................', '................'],
  cloudphoto: ['oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'owddddddddddddwo', 'owyyyyyyyyyyyywo', 'owyyyyyyyyyyyywo', 'owddddddddddddwo', 'owddddddddddddwo', 'owyyyyyyyyyyyywo', 'owyyyyyyyyyyyywo', 'owddddddddddddwo', 'owyyyyyyyyyyyywo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo', '................', '................', '................'],
  lock: ['................', '.....oooooo.....', '....oggggggo....', '...ogo....ogo...', '...ogo....ogo...', '...ogo....ogo...', '..oooooooooooo..', '..oyyyyyyyyyyo..', '..oyyyyooyyyyo..', '..oyyyyooyyyyo..', '..oyyyyyoyyyyo..', '..oyyyyyyyyyyo..', '..oooooooooooo..', '................', '................', '................'],
  team: ['................', '..ooo......ooo..', '.owwwo....owwwo.', '.owvwo....owvwo.', '.owwwo....owwwo.', '..ooo......ooo..', '.occco....olllo.', 'occccco..olllllo', 'occccco..olllllo', '.occco....olllo.', '..o.o......o.o..', '................', '................', '................', '................', '................'],
  wrench2: ['................', '..oo......oo....', '.oggo....oggo...', '.oggooooooggo...', '..ogggggggggo...', '...oooggoooo....', '.....oggo.......', '.....oggo.......', '.....oggo.......', '.....oggo.......', '.....oggo.......', '.....oggo.......', '......oo........', '................', '................', '................'],
  // NEW icons, drawn in the same 16×16 grid and the same PAL palette
  // (the previous game had no battery, camera, waves, magnetometer, engine or shield icon)
  battery: ['................', '......oooo......', '....oooooooo....', '....ommmmmmo....', '....ommmmmmo....', '....okkkkkko....', '....ommmmmmo....', '....ommmmmmo....', '....okkkkkko....', '....ommmmmmo....', '....ommmmmmo....', '....okkkkkko....', '....ommmmmmo....', '....oooooooo....', '................', '................'],
  antenna: ['................', '.oo.............', '.owoo...........', '.owwwoo.........', '..owwwwoo.......', '..owwwwwwoo.....', '...owwwwwwwo....', '...owwgwwwwo....', '....owwgwwo.....', '....oowwgo......', '......oogo......', '........go.yy...', '.......ggo..y...', '......gggggo....', '.....ooooooo....', '................'],
  storage: ['................', '..oooooooooooo..', '..okkkkkkkkkko..', '..okmkmkmkmkko..', '..okkkkkkkkkko..', '..oooooooooooo..', '..okkkkkkkkkko..', '..okmkmkmkmkko..', '..okkkkkkkkkko..', '..oooooooooooo..', '..okkkkkkkkkko..', '..okmkmkmkyyko..', '..okkkkkkkkkko..', '..oooooooooooo..', '................', '................'],
  junocam: ['................', '................', '...ooo..........', '..ocyco.........', '.oooooooooooooo.', '.oggggggggggggo.', '.oggggoooogggyo.', '.ogggoovvoogggo.', '.ogggovhvvogggo.', '.ogggovvvvogggo.', '.ogggoovvoogggo.', '.oggggooooggggo.', '.oggggggggggggo.', '.oooooooooooooo.', '................', '................'],
  waves: ['................', '..m.......m.....', '.m.m.....m.m....', 'm...m...m...m...', '.....m.m.....m..', '......m.......m.', '................', '..l.......l.....', '.l.l.....l.l....', 'l...l...l...l...', '.....l.l.....l..', '......l.......l.', '................', '.......oo.......', '......owwo......', '.....oooooo.....'],
  magnetometer: ['................', '..owwo....owwo..', '..owwo....owwo..', '..orro....orro..', '..orro....orro..', '..orro....orro..', '..orro....orro..', '..orro....orro..', '..orroooooorro..', '..orrrrrrrrrro..', '...orrrrrrrro...', '....oooooooo....', '................', '..v..........v..', '...v........v...', '................'],
  propulsion: ['.....oooooo.....', '.....oggggo.....', '.....oggggo.....', '....oggggggo....', '....okkkkkko....', '...oggggggggo...', '...oggggggggo...', '..oggggggggggo..', '..oooooooooooo..', '....cyywwyyc....', '.....cyyyyc.....', '......cyyc......', '.......cc.......', '................', '................', '................'],
  shield: ['................', '..oooooooooooo..', '..ovvvvvvvvvvo..', '..ovvvhhvvvvvo..', '..ovvhvvvvvvvo..', '..ovvvvvwvvvvo..', '..ovvvvwwwvvvo..', '...ovvvvwvvvo...', '...ovvvvvvvvo...', '....ovvvvvvo....', '.....ovvvvo.....', '......ovvo......', '.......oo.......', '................', '................', '................']
};
for (const [n, rows] of Object.entries(SPR)) { const w = rows[0].length; rows.forEach((r, i) => { if (r.length !== w) throw new Error(`sprite ${n} row ${i} has ${r.length} chars, expected ${w}`); }); }

// ---------- tiny RGBA canvas ----------
function hex(c) { const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255]; }
function canvas(W, H, bg) {
  const px = Buffer.alloc(W * H * 4);
  const R = (x, y, w, h, c) => {
    const [r, g, b, a] = hex(c); x = Math.round(x); y = Math.round(y); w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    for (let j = Math.max(0, y); j < Math.min(H, y + h); j++) for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const k = (j * W + i) * 4, al = a / 255;
      px[k] = Math.round(r * al + px[k] * (1 - al)); px[k + 1] = Math.round(g * al + px[k + 1] * (1 - al));
      px[k + 2] = Math.round(b * al + px[k + 2] * (1 - al)); px[k + 3] = Math.max(px[k + 3], a);
    }
  };
  if (bg) R(0, 0, W, H, bg);
  return { W, H, px, R };
}
function sprite(cv, name, x, y, s = 1, pal = {}) {
  const P = Object.assign({}, PAL, pal);
  SPR[name].forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') cv.R(x + c * s, y + r * s, s, s, P[ch]); }));
}
async function save(cv, file, scale = 1) {
  let img = sharp(cv.px, { raw: { width: cv.W, height: cv.H, channels: 4 } });
  if (scale !== 1) img = img.resize(cv.W * scale, cv.H * scale, { kernel: 'nearest' });
  await img.png().toFile(file);
  console.log('wrote', file);
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function stars(cv, n, seed) { const rnd = mulberry32(seed); for (let i = 0; i < n; i++) { const big = rnd() > 0.9; cv.R(rnd() * cv.W, rnd() * cv.H, 1, 1, big ? C.gold : i % 4 ? C.cream : C.ice); } }

// ---------- 3D pixel planet (same engine as pxPlanet of the previous game) ----------
const EARTH = {
  deep: ['#2a4a9a', '#22397a', '#182a5c', '#0f1a3d'], sea: ['#4a78c9', '#3b63ad', '#2c4c8c', '#1a2c5c'],
  shore: ['#6fa4e8', '#5788cf', '#3f68a8', '#22386a'], grass: ['#86d8b4', '#62b892', '#468f70', '#2a5646'],
  forest: ['#4f9e78', '#3d8062', '#2c604a', '#1b3c30'], sand: ['#ffd27a', '#e0a84a', '#b47e34', '#6e4c26'],
  rock: ['#b48a5a', '#8f6a44', '#6a4e34', '#3e2e22'], ice: ['#f6efe3', '#cfc8e0', '#9d96b5', '#4a4778'],
  cloud: ['#ffffff', '#e2def0', '#b9b2d0', '#5b5880'],
  moon: ['#d8d2ea', '#b9b2d0', '#8a84a8', '#4a4778'], crater: ['#a39cbf', '#86809f', '#6a6488', '#33315a']
};
// Jupiter bands use the colors of the master document (section 11)
const JUP = { light: ['#f6e2c4', '#e8c9a2', '#c9a27c', '#5e4636'], tan: ['#e89a6c', '#c97f55', '#a5643f', '#4e2c1e'],
  rust: ['#c96a3f', '#a85532', '#8f3d24', '#3e1d12'], dark: ['#8f3d24', '#74301c', '#5a2414', '#2a110a'], spot: ['#e8461e', '#c9381a', '#9e2a12', '#4a1408'] };
const SUN = (() => { const v = [-0.78, -0.32, 0.54], m = Math.hypot(...v); return v.map(a => a / m); })();
function landAt(lon, lat) { return Math.sin(lon * 2 + 1.3) * Math.cos(lat * 2.4 - 0.3) + 0.5 * Math.sin(lon * 3 - lat * 4.1 + 2) + 0.28 * Math.sin(lon * 7 + lat * 5 + 0.7) + 0.14 * Math.sin(lon * 13 - lat * 11); }
function planet(cv, cx, cy, r, kind, rot = 0, tint) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) {
      const nx = (x + 0.5) / r, ny = (y + 0.5) / r, d2 = nx * nx + ny * ny; if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2), lon = Math.atan2(nx, nz) + rot, lat = -Math.asin(ny);
      const b = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
      let level = b > 0.42 ? 0 : b > 0.18 ? 1 : b > -0.02 ? 2 : 3;
      if (level < 3 && b > 0 && ((x + y) & 1) && [0.42, 0.18].some(k => Math.abs(b - k) < 0.05)) level++;
      let pal;
      if (kind === 'earth') {
        const land = landAt(lon, lat), alat = Math.abs(lat), dry = Math.sin(lon * 4 + 0.5) * 0.5 + (1 - Math.abs(alat - 0.4) * 3);
        if (alat > 1.22 + 0.06 * Math.sin(lon * 5)) pal = EARTH.ice;
        else if (land > 0.42) pal = land > 1.4 ? EARTH.rock : dry > 0.9 ? EARTH.sand : land > 0.75 ? EARTH.forest : EARTH.grass;
        else pal = land > 0.28 ? EARTH.shore : land > -0.35 ? EARTH.sea : EARTH.deep;
        const cl = Math.sin(lon * 5 + Math.sin(lat * 7) * 1.6) * Math.cos(lat * 3.2) + 0.35 * Math.sin(lon * 11 + lat * 9);
        if (cl > 0.78) pal = EARTH.cloud;
      } else if (kind === 'moon') {
        const cr = Math.sin(lon * 9 + 1) * Math.sin(lat * 8 + 2) + 0.6 * Math.sin(lon * 17 - lat * 13);
        pal = cr > 0.95 ? EARTH.crater : EARTH.moon;
      } else if (kind === 'europa') {             // icy moon with brown cracks
        const ln = Math.abs(Math.sin(lon * 6 + lat * 3) + 0.6 * Math.sin(lon * 2 - lat * 9));
        pal = ln < 0.12 ? EARTH.rock : EARTH.ice;
      } else if (kind === 'jupiter') {            // bands by latitude + wavy edges + Great Red Spot
        const w = lat * 9 + 0.35 * Math.sin(lon * 6 + lat * 4) + 0.15 * Math.sin(lon * 15);
        const band = ((Math.floor(w) % 5) + 5) % 5;
        pal = [JUP.light, JUP.tan, JUP.light, JUP.rust, JUP.dark][band];
        const dl = lon - 0.6, dt = lat + 0.38;
        if ((dl * dl) / 0.05 + (dt * dt) / 0.012 < 1) pal = JUP.spot;
      } else {                                    // simple banded planet with a given 4-tone palette
        const w = lat * 6 + 0.3 * Math.sin(lon * 5);
        pal = (Math.floor(w) & 1) ? tint[0] : tint[1];
      }
      let c = pal[level];
      if (level === 3 && kind === 'earth') c = (x + y) & 1 ? '#10102a' : '#0b0b1e';
      cv.R(cx + x, cy + y, 1, 1, c);
    }
  }
}
const shades = (a, b, c, d) => [a, b, c, d];
const TINT = {
  mercury: [shades('#bdbdbd', '#9a9a9a', '#787878', '#3a3a3a'), shades('#a8a8a8', '#8f8f8f', '#6c6c6c', '#333333')],
  venus: [shades('#f0c987', '#d8a55a', '#b07f3e', '#5a3f20'), shades('#e3b874', '#c9954d', '#a27236', '#4f361c')],
  mars: [shades('#e8624f', '#d0402f', '#a52f22', '#4e1610'), shades('#d85a46', '#bb3a2a', '#932a1f', '#45130e')],
  saturn: [shades('#d9c2ff', '#c9a6ff', '#8a64c4', '#3e2c5e'), shades('#c2a6ee', '#a98ae0', '#7756ad', '#352651')],
  uranus: [shades('#8fe0ec', '#4fb3c8', '#38879a', '#1a4048'), shades('#7fd2e0', '#47a6ba', '#327a8c', '#173a42')],
  neptune: [shades('#6fa8f0', '#2f7fd8', '#245fa6', '#112c50'), shades('#5f98e4', '#2a72c6', '#205596', '#0f2848')]
};

// ---------- gold-cube ship (same drawing as pixShip of the previous game) ----------
function shipBody(cv, x0, y0, s, k) {
  cv.R(x0 - 1, y0 - k - 1, s + k + 2, s + k + 2, C.night);
  for (let j = 1; j <= k; j++) cv.R(x0 + j, y0 - j, s, 1, '#ffe7a8');
  for (let j = 0; j < k; j++) cv.R(x0 + s + j, y0 - j, 1, s, j % 2 ? C.goldDD : '#a8792a');
  cv.R(x0, y0, s, s, C.sand); cv.R(x0, y0, 2, s, C.gold); cv.R(x0 + s - 2, y0, 2, s, C.goldD);
  const cr = mulberry32(11); for (let i = 0; i < s; i++) cv.R(x0 + 2 + cr() * (s - 4), y0 + cr() * s, 1, 1, cr() > 0.5 ? C.gold : C.goldD);
}

// ---------- sounds (simple 8-bit style tones) ----------
function wav(file, seconds, fn) {
  const rate = 22050, n = Math.floor(rate * seconds), data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) { const t = i / rate; let v = fn(t, t / seconds); v = Math.max(-1, Math.min(1, v)); data.writeInt16LE(Math.round(v * 12000), i * 2); }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data])); console.log('wrote', file);
}
const sq = (f, t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);

(async () => {
  // characters
  let cv = canvas(16, 16); sprite(cv, 'astro', 0, 0); await save(cv, 'art-director.png', 4);
  cv = canvas(16, 16); sprite(cv, 'cheer', 0, 0); await save(cv, 'art-director-happy.png', 4);   // director reactions
  cv = canvas(16, 16); sprite(cv, 'sad', 0, 0); await save(cv, 'art-director-sad.png', 4);
  for (let i = 0; i < 4; i++) {
    for (const [pose, suffix] of [['astro', ''], ['cheer', '-happy'], ['sad', '-sad']]) {
      cv = canvas(16, 16); sprite(cv, pose, 0, 0, 1, { c: ROLE_ACCENT[i], y: ROLE_ACCENT[i] }); await save(cv, `art-player${i + 1}${suffix}.png`, 2);
    }
  }
  // components (32×32)
  const ICON = { solar: 'si', battery: 'battery', antenna: 'antenna', storage: 'storage', junocam: 'junocam', waves: 'waves', magnetometer: 'magnetometer', propulsion: 'propulsion', shield: 'shield' };
  for (const [id, key] of Object.entries(ICON)) { cv = canvas(16, 16); sprite(cv, key, 0, 0); await save(cv, `art-${id}.png`, 2); }
  for (const id of ['coin', 'weight', 'bolt', 'heart', 'stormphoto', 'cloudphoto', 'lock', 'team', 'wrench2']) { cv = canvas(16, 16); sprite(cv, id, 0, 0); await save(cv, `art-icon-${id}.png`, 2); }
  for (const id of ['rocketS', 'rocketM', 'rocketH', 'sat', 'ufo']) { const w = SPR[id][0].length, h = SPR[id].length; cv = canvas(w, h); sprite(cv, id, 0, 0); await save(cv, `art-icon-${id}.png`, 2); }
  // empty ship seen from above: the gold cube
  cv = canvas(32, 32); shipBody(cv, 8, 12, 14, 4); await save(cv, 'art-ship.png', 4);
  // planets
  cv = canvas(64, 64); planet(cv, 32, 32, 31, 'earth', 0.4); await save(cv, 'art-earth.png');
  cv = canvas(32, 32); planet(cv, 16, 16, 15, 'europa'); await save(cv, 'art-europa.png', 2);
  cv = canvas(128, 128); planet(cv, 64, 64, 63, 'jupiter'); await save(cv, 'art-jupiter.png', 4);
  // rocket 32×96: previous rocket sprite ×4 plus exhaust
  cv = canvas(8, 24); sprite(cv, 'rocket', 0, 0); cv.R(3, 12, 2, 3, C.gold); cv.R(3, 15, 2, 3, C.coral); cv.R(3, 18, 2, 2, C.red); cv.R(3, 21, 1, 1, C.ice); await save(cv, 'art-rocket.png', 4);

  // solar system 960×540 (grid 240×135, ×4). Planet x positions are copied into content.json.
  cv = canvas(240, 135, C.void); stars(cv, 140, 5);
  for (let y = -40; y <= 40; y++) { const half = Math.floor(Math.sqrt(40 * 40 - y * y)); cv.R(-28, 67 + y, half, 1, C.gold); cv.R(-28 + half - 2, 67 + y, 2, 1, C.coral); }
  const PL = [['mercury', 24, 2], ['venus', 40, 3], ['earth', 58, 4], ['mars', 76, 3], ['jupiter', 106, 12], ['saturn', 146, 10], ['uranus', 182, 6], ['neptune', 214, 6]];
  for (const [, x] of PL) for (let y = 0; y < 135; y += 3) cv.R(x, y, 1, 1, C.line);   // dotted orbit lines
  for (const [n, x, r] of PL) {
    if (n === 'earth') planet(cv, x, 67, r, 'earth');
    else if (n === 'jupiter') planet(cv, x, 67, r, 'jupiter');
    else planet(cv, x, 67, r, 'band', 0, TINT[n]);
    if (n === 'saturn') { cv.R(x - 17, 67, 34, 1, C.ice); cv.R(x - 15, 68, 30, 1, C.soft); }
  }
  await save(cv, 'art-solarsystem.png', 4);

  // mission control room 960×540 (grid 240×135): screen with Earth, consoles, operators (same sprites)
  cv = canvas(240, 135, C.deep);
  for (let x = 0; x < 240; x += 12) cv.R(x, 0, 1, 135, C.mid); for (let y = 0; y < 135; y += 12) cv.R(0, y, 240, 1, C.mid);
  cv.R(50, 8, 140, 62, C.night); cv.R(52, 10, 136, 58, C.void); stars(Object.assign({}, cv, { W: 136, H: 58, R: (x, y, w, h, c) => cv.R(52 + x, 10 + y, w, h, c) }), 40, 3);
  planet(cv, 120, 39, 22, 'earth', 1.2);
  [[30, 92], [90, 92], [150, 92], [210, 92]].forEach(([x, y], i) => {
    cv.R(x - 18, y, 36, 14, C.line); cv.R(x - 16, y + 2, 32, 8, C.mid); cv.R(x - 14, y + 3, 28, 6, [C.mint, C.sky, C.lilac, C.gold][i]);
    sprite(cv, 'astro', x - 8, y + 16, 1, { c: ROLE_ACCENT[i], y: ROLE_ACCENT[i] });
  });
  await save(cv, 'art-missioncontrol.png', 4);

  // workshop room 960×540 (grid 480×270, ×2): wall with a window to Earth, floor, grated assembly platform
  cv = canvas(480, 270, C.deep);
  // wall panels
  cv.R(0, 0, 480, 66, '#24233f');
  for (let x = 0; x < 480; x += 40) { cv.R(x, 0, 1, 66, C.line); cv.R(x + 3, 6, 34, 1, C.dim); }
  cv.R(0, 64, 480, 3, C.line);
  // big window with stars and Earth
  cv.R(118, 14, 244, 50, C.line); cv.R(121, 17, 238, 47, C.void);
  stars(Object.assign({}, cv, { W: 238, H: 47, R: (x, y, w, h, c) => { if (x < 238 && y < 47) cv.R(121 + x, 17 + y, w, h, c); } }), 60, 4);
  (function earthInWindow() { const tmp = canvas(80, 80); planet(tmp, 40, 40, 38, 'earth', 0.9); for (let y = 0; y < 47 - 10; y++) for (let x = 0; x < 80; x++) { const k = ((y) * 80 + x) * 4; if (tmp.px[k + 3]) cv.R(200 + x, 27 + y, 1, 1, '#' + [0, 1, 2].map((i) => tmp.px[k + i].toString(16).padStart(2, '0')).join('')); } })();
  cv.R(239, 14, 2, 50, C.line);
  // floor tiles
  for (let y = 67; y < 270; y += 12) for (let x = 0; x < 480; x += 12) { cv.R(x, y, 12, 12, ((x + y) / 12) % 2 ? '#2b2a48' : '#262542'); cv.R(x, y, 12, 1, '#33315a'); }
  // grated assembly platform in the middle (where the ship is built)
  cv.R(128, 80, 224, 140, C.line); cv.R(131, 83, 218, 134, '#1b1a30');
  for (let y = 86; y < 214; y += 4) cv.R(133, y, 214, 1, '#2b2a48');
  for (let x = 131; x < 349; x += 8) { cv.R(x, 80, 4, 3, C.gold); cv.R(x, 217, 4, 3, C.gold); }
  // robot arms at the platform corners
  for (const [ax, ay, dir] of [[136, 210, 1], [344, 210, -1]]) { cv.R(ax - 4, ay - 2, 8, 6, C.goldD); cv.R(ax, ay - 18, 3, 16, C.coral); cv.R(ax, ay - 20, dir * 14, 3, C.coral); cv.R(ax + dir * 13, ay - 24, 3, 6, C.ice); }
  // decorations: crates, consoles, tools (old sprites)
  [['box', 6, 232], ['box', 22, 238], ['box', 450, 232], ['box', 436, 240], ['nut', 120, 236], ['wrench', 356, 238], ['paper', 300, 244]].forEach(([n, x, y]) => sprite(cv, n, x, y, 3));
  for (const [x, y] of [[20, 24], [420, 24]]) { cv.R(x, y, 40, 28, C.line); cv.R(x + 3, y + 3, 34, 18, '#0f2a2a'); for (let i = 0; i < 4; i++) cv.R(x + 6, y + 6 + i * 4, 6 + ((i * 7) % 20), 2, C.mint); cv.R(x + 4, y + 23, 4, 3, C.red); cv.R(x + 10, y + 23, 4, 3, C.mint); }
  await save(cv, 'art-workshop.png', 2);

  // big Overcooked-style workshop world 1920×1080 (grid 960×540, ×2)
  cv = canvas(960, 540, '#1b1a30');
  for (let y = 0; y < 540; y += 16) for (let x = 0; x < 960; x += 16) { cv.R(x, y, 16, 16, ((x + y) / 16) % 2 ? '#24233f' : '#201f38'); cv.R(x, y, 16, 1, '#2b2a48'); }
  // walls
  cv.R(0, 0, 960, 40, '#2b2a48'); cv.R(0, 38, 960, 3, C.line); cv.R(0, 0, 10, 540, '#2b2a48'); cv.R(950, 0, 10, 540, '#2b2a48'); cv.R(0, 530, 960, 10, '#2b2a48');
  for (let x = 20; x < 940; x += 60) cv.R(x, 6, 40, 24, '#33315a');
  cv.R(380, 4, 200, 32, C.line); cv.R(383, 7, 194, 26, C.void);
  stars(Object.assign({}, cv, { R: (x, y, w, h, c) => { if (x < 194 && y < 26) cv.R(383 + x, 7 + y, w, h, c); } }), 30, 8);
  // colored station floors (Power, Comms, Science, Engines)
  const zonesF = [[165, 140, '#ffd27a'], [795, 140, '#93c5ff'], [165, 400, '#c3a6ff'], [795, 400, '#ff8a6b']];
  for (const [cx, cy, col] of zonesF) {
    cv.R(cx - 140, cy - 95, 280, 190, col + '33');
    for (let i = 0; i < 280; i += 10) { cv.R(cx - 140 + i, cy - 95, 6, 3, col); cv.R(cx - 140 + i, cy + 92, 6, 3, col); }
    // dotted path to the ship
    const tx = 480, ty = 280; for (let t = 0.25; t < 0.8; t += 0.04) cv.R(cx + (tx - cx) * t, cy + (ty - cy) * t, 4, 4, col + '99');
  }
  // central assembly pad
  cv.R(315, 150, 330, 260, C.line); cv.R(318, 153, 324, 254, '#16152a');
  for (let y = 158; y < 404; y += 6) cv.R(320, y, 320, 1, '#24233f');
  for (let x = 318; x < 642; x += 12) { cv.R(x, 150, 6, 3, C.gold); cv.R(x, 407, 6, 3, C.gold); }
  for (let y = 150; y < 410; y += 12) { cv.R(315, y, 3, 6, C.gold); cv.R(642, y, 3, 6, C.gold); }
  // decorations: crates, tools, consoles
  [['box', 30, 240], ['box', 46, 250], ['box', 900, 250], ['box', 916, 240], ['nut', 470, 470], ['wrench', 520, 480], ['paper', 600, 60], ['box', 30, 500], ['box', 900, 500]].forEach(([n, x, y]) => sprite(cv, n, x, y, 3));
  for (const [x, y] of [[100, 50], [820, 50]]) { cv.R(x, y, 50, 30, C.line); cv.R(x + 3, y + 3, 44, 20, '#0f2a2a'); for (let i = 0; i < 4; i++) cv.R(x + 6, y + 6 + i * 4, 8 + ((i * 9) % 24), 2, C.mint); }
  await save(cv, 'art-workshop-world.png', 2);

  // endings 480×270 (grid 240×135 ×2), each made only from the previous sprites
  const ending = async (id, draw) => { const e = canvas(240, 135, C.void); stars(e, 90, id.length * 7); draw(e); await save(e, `art-ending-${id}.png`, 2); };
  await ending('legendary', e => { planet(e, 160, 70, 46, 'jupiter'); planet(e, 60, 40, 10, 'europa'); sprite(e, 'cheer', 40, 80, 2); sprite(e, 'star', 20, 20, 2); sprite(e, 'star', 214, 18, 2); sprite(e, 'sat', 110, 18, 1); });
  await ending('costly', e => { planet(e, 165, 70, 44, 'jupiter'); planet(e, 40, 100, 22, 'earth', 0.4); for (let i = 0; i < 18; i++) e.R(30 + i * 2, 72 - (i % 4) * 3, 3, 3, '#33315acc'); sprite(e, 'sat', 95, 28, 1); planet(e, 105, 112, 8, 'europa'); sprite(e, 'alien', 98, 92, 1); });
  await ending('guardians', e => { planet(e, 175, 75, 40, 'jupiter'); planet(e, 70, 55, 20, 'europa'); sprite(e, 'astro', 30, 85, 2); sprite(e, 'sat', 120, 20, 1); });
  await ending('lessons', e => { sprite(e, 'sad', 100, 70, 3); [['wrench', 40, 30], ['nut', 70, 50], ['box', 170, 35], ['paper', 200, 60], ['nut', 150, 20], ['box', 60, 100]].forEach(([n, x, y]) => sprite(e, n, x, y, 3)); });
  await ending('lost', e => { planet(e, 30, 30, 14, 'earth'); sprite(e, 'rocket', 150, 50, 2); sprite(e, 'ufo', 190, 100, 2); sprite(e, 'sad', 60, 85, 2); for (let i = 0; i < 30; i += 3) e.R(120 + i, 75 - i / 2, 1, 1, C.soft); });

  // style guide sheet for P3 (every sprite on one page)
  const names = Object.keys(SPR); cv = canvas(20 * 8 + 4, 20 * Math.ceil(names.length / 8) + 4, C.void);
  names.forEach((n, i) => sprite(cv, n, 4 + (i % 8) * 20, 4 + Math.floor(i / 8) * 20));
  await save(cv, 'art-styleguide.png', 4);

  // sounds
  wav('sfx-pickup.wav', 0.12, (t, p) => sq(600 + 900 * p, t) * (1 - p));
  wav('sfx-place.wav', 0.15, (t, p) => sq(220 - 120 * p, t) * (1 - p));
  wav('sfx-error.wav', 0.3, (t, p) => sq(110, t) * (p < 0.45 || p > 0.55 ? 1 : 0) * (1 - p * 0.5));
  const rnd = mulberry32(9); wav('sfx-launch.wav', 1.2, (t, p) => (rnd() * 2 - 1) * (1 - p) * 0.8 + sq(80 + 60 * p, t) * 0.2);
  wav('sfx-photo.wav', 0.1, (t, p) => (p < 0.3 ? rnd() * 2 - 1 : sq(1200, t) * 0.4) * (1 - p));
  wav('sfx-alarm.wav', 0.6, (t, p) => sq(p % 0.5 < 0.25 ? 880 : 660, t) * 0.7);    // 2 tones per second, no fast flashing
})();
