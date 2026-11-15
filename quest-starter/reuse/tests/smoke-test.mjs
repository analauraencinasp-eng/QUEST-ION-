// smoke-test.mjs — plays the whole game by keyboard WITHOUT a browser, using a fake
// ("mock") Phaser that records objects but draws nothing. It checks that every scene,
// branch and ending runs without JavaScript errors. It does NOT check how things look:
// for that, play it with Live Server.   Run: node smoke-test.mjs
import { readFileSync, existsSync } from 'node:fs';

// ---------------- fake Phaser ----------------
const content = JSON.parse(readFileSync(new URL('./content.json', import.meta.url)));
let rnd = 1; const random = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
const textures = new Set(content.assets.filter((a) => a.startsWith('art-') && existsSync(new URL(`./${a}.png`, import.meta.url))));
const audio = new Set(content.assets.filter((a) => a.startsWith('sfx-') && existsSync(new URL(`./${a}.wav`, import.meta.url))));
const created = { count: 0 };

function GO(props = {}) {
  const o = { x: 0, y: 0, width: 32, height: 20, visible: true, alpha: 1, text: '', zoom: 1, ...props, destroyed: false };
  created.count++;
  const proxy = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'symbol' || k === 'then') return undefined;
      // like real Phaser: only methods exist; unknown plain properties are undefined
      if (!/^(set|fill|stroke|line|clear|destroy|explode|on$|off$|once$|generate|centerOn|ignore|startFollow|play|stop|remove)/.test(k)) return undefined;
      return (...a) => {
        switch (k) {
          case 'setText': if (t.destroyed) throw new Error('setText on a destroyed object'); t.text = String(a[0]); measure(t); break;
          case 'setX': t.x = a[0]; break;
          case 'setY': t.y = a[0]; break;
          case 'setPosition': t.x = a[0]; t.y = a[1] ?? t.y; break;
          case 'setVisible': t.visible = a[0]; break;
          case 'setAlpha': t.alpha = a[0]; break;
          case 'setZoom': t.zoom = a[0]; break;
          case 'destroy': t.destroyed = true; break;
          case 'setColor': if (typeof a[0] !== 'string') throw new Error('setColor needs a string'); break;
          case 'explode': break;
          default: break;
        }
        return proxy;
      };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return proxy;
}
function measure(t) {
  const lines = t.text.split('\n');
  const size = parseInt(t.style?.fontSize || '16', 10);
  const wrap = t.style?.wordWrap?.width;
  let rows = 0, w = 0;
  for (const l of lines) { const lw = l.length * size * 0.55; rows += wrap ? Math.max(1, Math.ceil(lw / wrap)) : 1; w = Math.max(w, wrap ? Math.min(wrap, lw) : lw); }
  t.width = w; t.height = rows * (size + 4);
}

class Scene {
  constructor(key) { this.sys = { key }; }
}
globalThis.Phaser = {
  Scene,
  Math: {
    Distance: { Between: (a, b, c, d) => Math.hypot(c - a, d - b) },
    Clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    Between: (a, b) => a + Math.floor(random() * (b - a + 1)),
    RandomDataGenerator: class { between(a, b) { return a + Math.floor(random() * (b - a + 1)); } }
  },
  Utils: { Array: { Shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; } } },
  AUTO: 0, Scale: { FIT: 0, CENTER_BOTH: 0 }
};
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };

// ---------------- scene runner ----------------
const scenes = {};
for (const name of ['TitleScene', 'SolarMapScene', 'MissionControlScene', 'WorkshopScene', 'TestsScene', 'LaunchScene', 'JupiterScene', 'TransmitScene', 'EndingScene', 'ReportScene']) {
  scenes[name] = (await import(`./${name}.js`)).default;
}
const { state, resetState } = await import('./state.js');
const rules = { ...(await import('./rules.js')), content };

const runner = { scene: null, name: null, next: null, now: 0, timers: [], keydown: [], keyup: [], visited: [], errors: [] };

const instances = {};
function makeScene(name) {
  // like Phaser: ONE object per scene, reused every time the scene starts again
  const s = instances[name] || (instances[name] = new scenes[name]());
  runner.timers = []; runner.keydown = []; runner.keyup = [];
  const add = {};
  for (const k of ['rectangle', 'image', 'graphics', 'particles', 'container', 'ellipse', 'zone', 'circle', 'triangle']) add[k] = (...a) => GO({ x: a[0] || 0, y: a[1] || 0 });
  add.text = (x, y, str, style) => { const g = GO({ x, y, text: String(str), style }); measure(g); return g; };
  s.add = add;
  s.make = { graphics: () => GO() };
  s.cache = { json: { get: () => content }, audio: { exists: (k) => audio.has(k) } };
  s.textures = { exists: (k) => textures.has(k) || k === 'px4', get: () => ({ getSourceImage: () => ({ width: 40, height: 96 }) }) };
  s.sound = { play: () => {} };
  runner.pointer = {};
  s.input = { keyboard: { on: (ev, fn) => (ev === 'keydown' ? runner.keydown : runner.keyup).push(fn) }, on: (ev, fn) => { (runner.pointer[ev] ||= []).push(fn); } };
  const addTimer = (delay, cb, repeat = 0) => { const ev = { at: runner.now + delay, delay, cb, left: repeat, removed: false, remove() { this.removed = true; }, getRepeatCount() { return this.left; } }; runner.timers.push(ev); return ev; };
  s.time = { delayedCall: (d, cb) => addTimer(d, cb, 0), addEvent: (cfg) => addTimer(cfg.delay, cfg.callback, cfg.repeat || 0) };
  s.tweens = { add: (cfg) => { if (cfg.onComplete) addTimer(cfg.duration || 0, cfg.onComplete, 0); return GO(); } };
  if (!s.cameras) {
    const cams = { main: GO({ zoom: 1, worldView: { x: 0, y: 0 }, midPoint: { x: 480, y: 270 }, getWorldPoint: (x, y) => ({ x, y }) }), cameras: [] };
    cams.cameras.push(cams.main);
    cams.add = () => { const c = GO(); cams.cameras.push(c); return c; };
    cams.remove = (c) => { cams.cameras = cams.cameras.filter((x) => x !== c); };
    s.cameras = cams;
  }
  // a scene left open with a modal from the previous run would show up here
  if (s.modal) runner.errors.push(`${name}: modal left over from the previous run`);
  s.scene = { start: (k) => { runner.next = k; }, restart: () => { runner.next = name; } };
  return s;
}

function start(name) {
  runner.name = name; runner.visited.push(name);
  runner.scene = makeScene(name);
  safe(() => runner.scene.create(), `${name}.create`);
}
function safe(fn, where) { try { fn(); } catch (e) { runner.errors.push(`${where}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); } }
function key(k) { for (const fn of runner.keydown.slice()) safe(() => fn({ key: k }), `${runner.name} key ${k}`); }
function keyup(k) { for (const fn of runner.keyup.slice()) safe(() => fn({ key: k }), `${runner.name} keyup ${k}`); }
function tick(ms = 50) {
  runner.now += ms;
  for (const ev of runner.timers.slice()) {
    if (ev.removed || ev.at > runner.now) continue;
    if (ev.left > 0) { ev.left--; ev.at += ev.delay; } else ev.removed = true;
    safe(() => ev.cb(), `${runner.name} timer`);
  }
  runner.timers = runner.timers.filter((e) => !e.removed);
  if (runner.scene.update) safe(() => runner.scene.update(runner.now, ms), `${runner.name}.update`);
  if (runner.next) { const n = runner.next; runner.next = null; start(n); }
}
function wait(sec) { for (let i = 0; i < sec * 20; i++) tick(50); }
// close any concept card / modal: Enter, then 1 for the quick check, then Enter
function clearModals(max = 40) {
  for (let i = 0; i < max && runner.scene.modal; i++) { key(runner.scene.cal ? 'k' : i % 2 ? '1' : 'Enter'); tick(); }
}
function until(cond, sec = 30) { for (let i = 0; i < sec * 20 && !cond(); i++) { clearModals(); tick(50); } return cond(); }

// ---------------- scripted play-throughs ----------------
function playthrough(opts) {
  const log = [];
  const expect = (cond, msg) => { if (!cond) runner.errors.push(`[${opts.label}] ${msg}`); };
  resetState();
  start('TitleScene');
  clearModals();
  if (opts.settings) Object.assign(state.settings, opts.settings);
  if (opts.team) { key('ArrowDown'); key(opts.teamRight ? 'ArrowRight' : 'Enter'); if (opts.teamRight) key('Enter'); }
  else key('Enter');
  expect(runner.scene.page === 'avatar', 'astronaut picker should open');
  const before = state.avatar;
  key('ArrowRight'); key('Enter'); wait(0.5);
  expect(state.avatar === (before % 4) + 1, `next avatar chosen, got ${state.avatar}`);
  expect(runner.name === 'SolarMapScene', `expected map, got ${runner.name}`);
  key('ArrowRight'); key('Enter'); expect(runner.name === 'SolarMapScene', 'Saturn must be "coming soon"');
  key('ArrowLeft'); key('Enter'); tick();
  expect(runner.name === 'MissionControlScene', `expected mission control, got ${runner.name}`);
  // mission design: the team asks 4 questions (pick option 1, or opts.design), then the summary
  until(() => { if (!runner.scene.modal) key(runner.scene.phase === 'design' ? (opts.design || '1') : 'Enter'); tick(); return runner.name === 'WorkshopScene'; }, 60);
  expect(state.design && state.design.name, `mission designed, got ${JSON.stringify(state.design)}`);
  expect(runner.name === 'WorkshopScene', `expected workshop, got ${runner.name}`);
  if (opts.team) expect(state.roles.length === 4 && new Set(state.roles.map((r) => r.player)).size === Math.min(4, state.players), 'roles dealt');

  // --- workshop: keyboard first (pick the panels at the bench, walk into the Sun wing, place, calibrate)
  clearModals();
  const ws = runner.scene;
  const p = ws.workers[0];
  [p.x, p.y] = [ws.crates.solar.standX, ws.crates.solar.standY];
  key(opts.team ? 'e' : ' '); clearModals(); tick();
  expect(p.carrying === 'solar', `keyboard: should carry solar, carrying ${p.carrying}`);
  const wing = ws.zones.wing.r;
  p.x = wing.x + wing.w / 2; p.y = wing.y + wing.h + 20;
  key(opts.team ? 'e' : ' ');
  wait(1.1);
  expect(state.ship.components.includes('solar') && state.ship.placement.solar === 'wing', 'solar placed in the Sun wing by keyboard');
  // calibration "cables": press the right socket 3 times -> 3 stars
  expect(ws.cal && ws.cal.kind === 'cables', 'cables calibration should open');
  for (let r = 0; r < 3 && ws.cal; r++) { key(String(ws.cal.answer + 1)); tick(); }
  expect(!ws.cal && state.stars.WorkshopScene === 3, `perfect calibration = 3 stars, got ${state.stars.WorkshopScene}`);
  key('z'); expect(!state.ship.components.includes('solar'), 'Z should undo solar');
  // Stage 1 cards still work (C): install and remove the battery
  key('c'); expect(!!ws.cards, 'cards open');
  ws.cards.index = ws.c.components.findIndex((x) => x.id === 'battery'); key('Enter');
  expect(state.ship.components.includes('battery'), 'cards install battery'); key('Enter');
  expect(!state.ship.components.includes('battery'), 'cards remove battery'); key('c');
  // mouse: drop every part in its best free zone (or any allowed zone)
  for (const id of opts.build) {
    const zones = [...rules.content.placement[id].best, ...rules.content.zones.map((z) => z.id)];
    const zone = (opts.weak && opts.weak[id]) || zones.find((z) => rules.canPlace(rules.content, state, id, z).ok);
    ws.order(id, zone);
    until(() => state.ship.components.includes(id) && !ws.cal, 20);
  }
  expect(opts.build.every((id) => state.ship.components.includes(id)), `build ${opts.build} -> got ${state.ship.components}`);
  // move a part to another zone, then take one off and put it back
  const last = opts.build[opts.build.length - 1];
  ws.orderRemove(last); until(() => !state.ship.components.includes(last), 10);
  expect(!state.ship.components.includes(last), 'tap on ship removes the part');
  ws.order(last, rules.content.placement[last].best.find((z) => rules.canPlace(rules.content, state, last, z).ok) || rules.content.zones.map((z) => z.id).find((z) => rules.canPlace(rules.content, state, last, z).ok));
  until(() => state.ship.components.includes(last) && !ws.cal, 20);
  log.push(`placement ${JSON.stringify(state.ship.placement)}`);
  key('f'); tick();
  expect(runner.name === 'TestsScene', `expected tests, got ${runner.name}`);

  // --- tests
  until(() => runner.scene.phase === 'shake', 10);
  key('ArrowRight'); wait(16); keyup('ArrowRight');
  if (state.settings.noTimers) key('Enter');           // no timer: the player stops the test
  expect(runner.scene.phase === 'shakeDone', `shake should end, phase ${runner.scene.phase}`);
  key('Enter');
  until(() => ['failed', 'passed'].includes(runner.scene.phase), 15);
  if (opts.failFirst) {
    expect(runner.scene.phase === 'failed', 'tests should fail');
    key('Enter'); tick();
    expect(runner.name === 'WorkshopScene', 'failed tests go back to workshop');
    clearModals();
    for (const id of opts.fix) { const z = rules.content.placement[id].best.find((q) => rules.canPlace(rules.content, state, id, q).ok); runner.scene.order(id, z); until(() => state.ship.components.includes(id) && !runner.scene.cal, 20); }
    key('f'); tick();
    until(() => runner.scene.phase === 'shake', 10); key('k'); key('Enter');
    until(() => ['failed', 'passed'].includes(runner.scene.phase), 15);
  }
  expect(runner.scene.phase === 'passed', `tests should pass, phase ${runner.scene.phase}`);
  key('Enter'); clearModals(); tick();
  const votes = opts.team ? state.players : 1;
  for (let v = 0; v < votes; v++) key(String(opts.rocket));
  wait(0.6);
  expect(state.ship.launcher !== null, 'rocket chosen');
  key('Enter'); tick();
  expect(runner.name === 'LaunchScene', `expected launch, got ${runner.name}`);

  // --- launch
  const ls = runner.scene;
  until(() => ls.phase === 'window', 5);
  key(' ');                                         // window (may hit or miss)
  clearModals();
  if (opts.loseLaunch) {
    for (let i = 0; i < 3 && !ls.done; i++) { ls.angle = ls.L.angleRange[0]; ls.power = ls.L.powerRange[0]; key(' '); wait(3); clearModals(); }
    expect(state.results.missionLost, 'mission should be lost');
  } else {
    ls.angle = ls.target.angle; ls.power = ls.target.power; key('ArrowUp'); key('ArrowDown');
    key(' '); wait(3);
    expect(state.results.fuelAtArrival !== null, 'should arrive');
  }
  key('Enter'); tick();

  if (!opts.loseLaunch) {
    // --- Jupiter
    expect(runner.name === 'JupiterScene', `expected Jupiter, got ${runner.name}`);
    const js = runner.scene;
    clearModals();
    for (let i = 0; i < 400 && !js.ended; i++) {
      if (js.eventMenu) { key(String(Math.min(opts.eventChoice || 1, js.eventMenu.rows.length))); continue; }
      if (i % 10 === 0 && js.stormSpots && (!opts.maxPhotos || js.photoCount < opts.maxPhotos)) { const s = js.stormSpots[i % js.stormSpots.length]; js.fx = Phaser.Math.Clamp(js.jx + s.dx, 40, 920); js.fy = 330 + s.dy; key(' '); }
      if (opts.skipJupiter && i === 5) key('k');
      clearModals(); tick(150);
    }
    expect(js.ended, 'Jupiter pass should end');
    log.push(`packets ${state.results.packets.map((p) => p.type[0]).join('')} ruined ${state.results.photosRuined} events ${state.results.events}`);
    wait(2);
    key('Enter'); tick();
    // --- transmit
    expect(runner.name === 'TransmitScene', `expected transmit, got ${runner.name}`);
    const ts = runner.scene;
    clearModals();
    key('v');
    if (opts.smartSend) {               // choose 2 storm photos + 2 aurora packets
      const want = { storm: 2, waves: 2 };
      ts.list.forEach((p, i) => { if (want[p.type] > 0) { want[p.type]--; ts.index = i; key(' '); } });
    } else for (let i = 0; i < ts.capacity + 1; i++) { key(' '); key('ArrowDown'); }
    key('Enter');
    until(() => ts.phase === 'dilemma', 20);
    log.push(`transmit phase ${ts.phase} chosen ${ts.list.filter((p) => p.chosen).map((p) => p.type[0]).join('')} sent ${JSON.stringify(state.results.sent)}`);
    for (let v = 0; v < votes; v++) key(String(opts.openData));
    wait(0.6);
    key('Enter'); tick();
    // --- ending
    expect(runner.name === 'EndingScene', `expected ending, got ${runner.name}`);
    clearModals();
    for (let v = 0; v < votes; v++) key(String(opts.europa));
    wait(0.6);
  } else {
    expect(runner.name === 'EndingScene', `expected ending after loss, got ${runner.name}`);
  }
  until(() => runner.scene.phase === 'shown', 5);
  const ending = state.results.ending;
  log.push(`dilemmas ${JSON.stringify(state.results.dilemmas)}`);
  key('Enter'); tick();
  expect(runner.name === 'ReportScene', `expected report, got ${runner.name}`);
  for (let i = 0; i < 5; i++) key('ArrowRight');
  key('p');
  const total = runner.scene.pages[0].body.length > 0;
  expect(runner.scene.pages.find((p) => p.title.startsWith('Por qué')).body.length > 0, 'report has reasons');
  if (opts.redesign) { key('r'); tick(); expect(runner.name === 'WorkshopScene' && state.results.redesigns === 1, 'redesign returns to workshop'); }
  else { key('m'); tick(); expect(runner.name === 'TitleScene', 'main menu'); }
  return { ending, stars: { ...state.stars }, log };
}

const ALL = ['solar', 'battery', 'antenna', 'storage', 'junocam', 'waves', 'propulsion'];
const runs = [
  { label: 'solo legendary', build: ALL, maxPhotos: 5, smartSend: true, rocket: 3, openData: 1, europa: 1, expectEnding: 'legendary' },
  { label: 'solo lessons / no camera + weak spots', weak: { antenna: 'bottom', solar: 'top' }, build: ['solar', 'antenna', 'propulsion'], rocket: 1, openData: 3, europa: 3, expectEnding: 'lessons', redesign: true },
  { label: 'solo lost in space', build: ['solar', 'antenna', 'propulsion'], rocket: 1, openData: 1, europa: 1, loseLaunch: true, expectEnding: 'lost' },
  { label: 'solo tests fail then fix', build: ['solar', 'propulsion', 'junocam'], failFirst: true, fix: ['antenna', 'waves'], rocket: 2, openData: 2, europa: 2, eventChoice: 3 },
  { label: 'team 2 players', team: true, build: ['solar', 'antenna', 'propulsion', 'junocam', 'waves', 'shield'], rocket: 1, openData: 1, europa: 1 },
  { label: 'team 4 players + skip + accessibility', team: true, teamRight: true, settings: { noTimers: true, largeText: true, narration: true, highContrast: true }, build: ALL, rocket: 2, openData: 1, europa: 2, skipJupiter: true }
];
for (const r of runs) {
  const before = runner.errors.length;
  let out;
  try { out = playthrough(r); } catch (e) { runner.errors.push(`[${r.label}] crashed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  if (out && r.expectEnding && out.ending !== r.expectEnding) runner.errors.push(`[${r.label}] ending ${out.ending}, expected ${r.expectEnding}`);
  console.log(`${runner.errors.length === before ? 'OK  ' : 'FAIL'} ${r.label}${out ? ` → ending ${out.ending}, stars ${JSON.stringify(out.stars)} ${out.log.join(' ')}` : ''}`);
}
console.log(`\nScenes visited: ${[...new Set(runner.visited)].join(', ')}`);
if (runner.errors.length) { console.log(`\n${runner.errors.length} problems:`); runner.errors.slice(0, 40).forEach((e) => console.log(' - ' + e)); process.exit(1); }
console.log('No JavaScript errors in any scene.');
