// Hud.js — resource bars + Responsibility meter across the top of the screen (owner: P2).
//   const hud = new Hud(scene);  hud.refresh(lastComponentId?);  hud.tick(deltaMs) every frame
// Each block = icon + number + animated bar of 10 pixel blocks + ✓/⚠/✕ (never color alone).
// Domino effect: a GRAPH of "what affects what" + BFS (Graph.js). When a component is
// installed, BFS walks from it and every bar it reaches flashes (closest ones first).
// Reads state.ship / state.results. Writes nothing.

import Graph from './Graph.js';
import { state } from './state.js';
import { computeShip, computeResponsibility, has, effects } from './rules.js';
import { text, track, color, hexNum, ICON, content } from './ui.js';

export function buildEffectGraph(content) {
  const g = new Graph();
  for (const c of content.components) {
    g.addEdge(c.id, 'budget');
    g.addEdge(c.id, 'mass');
    if (c.power) g.addEdge(c.id, 'power');
    if (c.storage || c.downlink || c.packets || c.id === 'junocam') g.addEdge(c.id, 'data');
    if (c.fuel) g.addEdge(c.id, 'fuel');
  }
  g.addEdge('battery', 'power');
  g.addEdge('power', 'data');            // without power, instruments make no data
  g.addEdge('fuel', 'responsibility');   // fuel is needed to protect Europa
  g.addEdge('launcher', 'budget');
  g.addEdge('launcher', 'responsibility');
  return g;
}

const BARS = [
  ['budget', 'art-icon-coin'], ['mass', 'art-icon-weight'], ['power', 'art-icon-bolt'],
  ['data', 'art-storage'], ['fuel', 'art-icon-rocketS'], ['responsibility', 'art-icon-heart']
];
const NAMES = { budget: 'Budget', mass: 'Mass', power: 'Power', data: 'Data', fuel: 'Fuel', responsibility: 'Responsibility' };

export default class Hud {
  constructor(scene, y = 36) {
    this.scene = scene;
    this.y = y;
    this.graph = buildEffectGraph(content(scene));
    this.bw = 158;
    this.blocks = {};
    this.shown = {};
    this.lit = new Map();               // id -> seconds left to glow
    this.gfx = track(scene, scene.add.graphics(), 92);
    BARS.forEach(([id, icon], i) => {
      const x = 4 + i * this.bw;
      const bg = track(scene, scene.add.rectangle(x, y, this.bw - 6, 52, hexNum(color(scene, 'panel')), 0.92).setOrigin(0).setStrokeStyle(2, 0x4a4778), 90);
      const ic = scene.textures.exists(icon) ? track(scene, scene.add.image(x + 18, y + 18, icon).setDisplaySize(28, 28), 93) : null;
      const val = text(scene, x + 36, y + 4, '', { size: 16, depth: 93 });
      const mark = text(scene, x + this.bw - 12, y + 4, '', { size: 16, depth: 93, origin: [1, 0] });
      bg.setInteractive();
      bg.on('pointerover', () => { this.tip = id; this.draw(); });
      bg.on('pointerout', () => { this.tip = null; this.draw(); });
      this.blocks[id] = { x, bg, ic, val, mark };
      this.shown[id] = 0;
    });
    this.tipText = text(this.scene, 0, y + 56, '', { size: 16, depth: 130, color: '#f6efe3' });
    this.refresh();
    for (const [id] of BARS) this.shown[id] = this.target[id].fill;   // no animation on the first frame
    this.draw();
  }

  values() {
    const c = content(this.scene), s = computeShip(c, state);
    const fuelShown = state.ship.fuel || s.fuel;
    const resp = computeResponsibility(state, c);
    const noRocketMoney = !state.ship.launcher && s.shipCost + s.cheapest > s.budget;
    const powerLevel = s.powerGen === 0 || s.powerBalance < 0 ? 'error' : (!(has(state, 'battery') && effects(c, state).batteryWorks) && s.powerBalance < c.jupiter.lowBatteryBelow) ? 'warning' : 'ok';
    return {
      budget: { fill: s.cost / s.budget, level: s.cost > s.budget || noRocketMoney ? 'error' : 'ok', text: `${s.budget - s.cost} M$`, tip: `Presupuesto: ${s.cost} de ${s.budget} M$ usados${noRocketMoney ? ' — ¡no queda dinero para un cohete!' : ''}` },
      mass: { fill: s.mass / s.massLimit, level: s.mass > s.massLimit ? 'error' : 'ok', text: `${s.mass} kg`, tip: `Masa: ${s.mass} de ${s.massLimit} kg` },
      power: { fill: s.powerGen ? Math.min(1, s.powerUse / s.powerGen) : 1, level: powerLevel, text: `${s.powerBalance} W`, tip: `Energía: los paneles dan ${s.powerGen} W, las piezas usan ${s.powerUse} W` },
      data: { fill: s.storage / 9, level: !has(state, 'antenna') ? 'error' : 'ok', text: `${s.storage}·${s.downlink}`, tip: `Datos: guarda ${s.storage} paquetes, la antena manda ${s.downlink}` },
      fuel: { fill: fuelShown / c.fuel.start, level: fuelShown === 0 ? 'error' : fuelShown < c.fuel.safeEnding ? 'warning' : 'ok', text: `${fuelShown}`, tip: `Combustible: ${fuelShown} unidades (se necesitan ${c.fuel.safeEnding} para proteger Europa)` },
      responsibility: { fill: resp / c.score.responsibility, level: resp >= c.objectives.highResponsibility ? 'ok' : 'warning', text: `${resp}/25`, tip: `Responsabilidad: ${resp} de 25 (17+ es alta)` }
    };
  }

  // lastId: component (or 'launcher') that just changed -> BFS: bars flash in "domino" order
  refresh(lastId) {
    this.target = this.values();
    if (lastId && this.graph.hasVertex(lastId)) {
      for (const { vertex, depth } of this.graph.bfs(lastId)) if (this.blocks[vertex]) this.lit.set(vertex, 1.2 + depth * 0.35);
    }
    this.draw();
  }

  // animate the bars toward their new values
  tick(ms) {
    const dt = ms / 1000;
    let moving = false;
    for (const [id] of BARS) {
      const t = this.target[id].fill, d = t - this.shown[id];
      if (Math.abs(d) > 0.002) { this.shown[id] += d * Math.min(1, dt * 6); moving = true; } else this.shown[id] = t;
    }
    for (const [id, left] of this.lit) { if (left - dt <= 0) this.lit.delete(id); else this.lit.set(id, left - dt); moving = true; }
    if (moving) this.draw();
  }

  draw() {
    const v = this.target, g = this.gfx, sc = this.scene;
    g.clear();
    BARS.forEach(([id]) => {
      const b = this.blocks[id], val = v[id], y = this.y + 30;
      b.val.setText(val.text);
      b.mark.setText(ICON[val.level]);
      b.mark.setColor(color(sc, val.level === 'ok' ? 'ok' : val.level));
      const n = 10, w = Math.floor((this.bw - 22) / n), filled = Math.max(0, Math.min(n, Math.round(this.shown[id] * n)));
      const col = hexNum(color(sc, val.level === 'ok' ? 'ok' : val.level));
      for (let i = 0; i < n; i++) {
        const bx = b.x + 6 + i * w;
        g.fillStyle(i < filled ? col : 0x2b2a48, 1).fillRect(bx, y, w - 2, 14);
        if (i < filled && state.settings.colorblind && val.level !== 'ok') {      // pattern: not color alone
          g.fillStyle(0x16152a, 1);
          if (val.level === 'error') g.fillRect(bx + 2, y + 4, 4, 4); else g.fillRect(bx + 1, y + 6, w - 4, 2);
        }
      }
      const glow = this.lit.get(id);
      const on = glow && glow < 1.2;                     // starts glowing after its BFS delay
      b.bg.setStrokeStyle(on ? 4 : 2, on ? hexNum(color(sc, 'accent')) : 0x4a4778);
    });
    if (this.tip) { const b = this.blocks[this.tip]; this.tipText.setText(v[this.tip].tip); this.tipText.setPosition(Math.min(b.x, 950 - this.tipText.width), this.y + 56); this.tipText.setVisible(true); }
    else this.tipText.setVisible(false);
  }
}
