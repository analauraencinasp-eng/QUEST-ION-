// rules.js — every game formula (owner: P2). No numbers here: they all come from content.json.
// Reads: state.ship, state.results.  Writes: nothing (pure functions, easy to test).
// Data structures used here:
//   - linear search (sorts.js) to find a component by id
//   - a DECISION TREE (non-linear) to choose 1 of 5 endings

import { linearSearch } from './sorts.js';

// ---------- helpers ----------
export function findComponent(content, id) {
  const i = linearSearch(content.components, (c) => c.id === id);   // O(n), n = 9
  return i === -1 ? null : content.components[i];
}
export function has(state, id) { return state.ship.components.includes(id); }
export function findLauncher(content, id) {
  const i = linearSearch(content.launchers, (l) => l.id === id);
  return i === -1 ? null : content.launchers[i];
}
export function cheapestLauncher(content) {
  let best = content.launchers[0];
  for (const l of content.launchers) if (l.cost < best.cost) best = l;
  return best;
}

// ---------- placement: WHERE a part is on the ship changes what it does ----------
export function zoneOf(state, id) { return (state.ship.placement || {})[id] || null; }
// 'best' | 'ok' | null (not placed). Parts installed without a zone (old saves, tests) count as 'best'.
export function placeQuality(content, state, id) {
  if (!state.ship.components.includes(id)) return null;
  const z = zoneOf(state, id), rule = content.placement && content.placement[id];
  if (!z || !rule) return 'best';
  return rule.best.includes(z) ? 'best' : 'ok';
}
export function zoneUsed(state, zone) { return Object.entries(state.ship.placement || {}).filter(([id, z]) => z === zone && state.ship.components.includes(id)).length; }
// can this part go in this zone? { ok, quality, reason }
export function canPlace(content, state, id, zone) {
  const rule = content.placement[id], z = content.zones.find((q) => q.id === zone);
  if (!z) return { ok: false, reason: 'Ese no es un lugar de la sonda.' };
  if (rule.only && !rule.best.includes(zone)) return { ok: false, reason: rule.noMsg };
  if (rule.no.includes(zone)) return { ok: false, reason: rule.noMsg };
  const here = zoneOf(state, id) === zone && state.ship.components.includes(id) ? 1 : 0;
  if (zoneUsed(state, zone) - here >= z.cap) return { ok: false, reason: `${z.name} está lleno (${z.cap} ${z.cap > 1 ? 'piezas' : 'pieza'}). Saca algo primero.` };
  return { ok: true, quality: rule.best.includes(zone) ? 'best' : 'ok', reason: rule.best.includes(zone) ? rule.good : rule.weak };
}
// the effects of placement, in one place
export function effects(content, state) {
  const q = (id) => placeQuality(content, state, id);
  return {
    solarFactor: q('solar') === 'ok' ? 0.5 : 1,
    downlink: q('antenna') === 'ok' ? 2 : null,              // null = the antenna's normal value
    batteryWorks: q('battery') === 'best',
    storageSafe: q('storage') !== 'ok',
    wavesPackets: q('waves') === 'ok' ? 2 : null,
    magScience: q('magnetometer') === 'ok' ? Math.round((findComponent(content, 'magnetometer') || { science: 10 }).science / 2) : null,
    cameraWide: q('junocam') !== 'ok',
    shieldWorks: q('shield') === 'best'
  };
}

// ---------- ship numbers ----------
export function computeShip(content, state) {
  const m = content.mission;
  let mass = m.baseMass, shipCost = m.baseCost, powerBalance = m.basePower, storage = m.baseStorage;
  let downlink = 0, fuel = 0, powerGen = 0, powerUse = -m.basePower;
  const fx = content.placement ? effects(content, state) : { solarFactor: 1, downlink: null };
  for (const id of state.ship.components) {
    const c = findComponent(content, id);
    if (!c) continue;
    mass += c.mass;
    shipCost += c.cost;
    const power = c.power > 0 ? Math.round(c.power * fx.solarFactor) : c.power;   // panels in shadow give less
    powerBalance += power;
    if (power > 0) powerGen += power; else powerUse += -power;
    storage += c.storage || 0;
    downlink += c.downlink ? (fx.downlink ?? c.downlink) : 0;                     // antenna not facing Earth sends less
    fuel += c.fuel || 0;
  }
  const launcher = state.ship.launcher ? findLauncher(content, state.ship.launcher) : null;
  const cost = shipCost + (launcher ? launcher.cost : 0);
  return { mass, massLimit: m.massLimit, cost, shipCost, budget: m.budget, powerBalance, powerGen, powerUse,
    storage, downlink, fuel, cheapest: cheapestLauncher(content).cost };
}

// Would adding this component break the budget or the mass limit? (workshop rejects it)
export function canAdd(content, state, id) {
  const s = computeShip(content, state), c = findComponent(content, id);
  if (!c) return { ok: false, reason: 'Pieza desconocida.' };
  if (state.ship.components.includes(id)) return { ok: false, reason: `${c.name} ya está instalado.` };
  if (s.mass + c.mass > s.massLimit) return { ok: false, reason: `Demasiado pesado: ${c.name} agrega ${c.mass} kg y solo quedan ${s.massLimit - s.mass} kg.` };
  if (s.shipCost + c.cost > s.budget) return { ok: false, reason: `Demasiado caro: ${c.name} cuesta ${c.cost} M$ y solo quedan ${s.budget - s.shipCost} M$.` };
  return { ok: true, reason: '' };
}

// ---------- tests (plain-English messages) ----------
// level: 'ok' | 'warning' | 'error'. station = where to fix it in the workshop.
export function runTests(content, state) {
  const s = computeShip(content, state), out = [];
  const add = (id, ok, level, message, station) => out.push({ id, ok, level, message, station });
  for (const id of ['solar', 'antenna', 'propulsion']) {
    const c = findComponent(content, id);
    const msg = { solar: 'Necesitas paneles solares: sin paneles no hay energía.', antenna: 'Necesitas una antena para mandar datos a casa.',
      propulsion: 'Necesitas propulsión: sin motor no hay viaje.' }[id];
    add(id, has(state, id), has(state, id) ? 'ok' : 'error', has(state, id) ? `${c.name} instalado.` : msg, c.station);
  }
  const massOk = s.mass <= s.massLimit;
  add('mass', massOk, massOk ? 'ok' : 'error', massOk ? `Masa ${s.mass} de ${s.massLimit} kg.`
    : `Demasiado pesada: ${s.mass} de ${s.massLimit} kg. Quita ${s.mass - s.massLimit} kg.`, 'Engines');
  const moneyOk = s.shipCost + s.cheapest <= s.budget;
  add('budget', moneyOk, moneyOk ? 'ok' : 'error', moneyOk ? `Presupuesto: quedan ${s.budget - s.shipCost} M$ para el cohete.`
    : `No queda dinero para un cohete: el más barato cuesta ${s.cheapest} M$ y tienes ${s.budget - s.shipCost} M$.`, 'Science');
  const powerOk = s.powerBalance >= 0;
  add('power', powerOk, powerOk ? 'ok' : 'error', powerOk ? `Energía: sobran ${s.powerBalance} W.`
    : `No alcanza la energía: usas ${s.powerUse} W y los paneles dan ${s.powerGen} W.`, 'Power');
  // warnings: the probe can fly, but something will be missing
  if (!has(state, 'junocam')) add('junocam', true, 'warning', 'Sin JunoCam: no puedes fotografiar tormentas.', 'Science');
  if (has(state, 'junocam') && !has(state, 'shield')) add('shield', true, 'warning', 'Sin escudo contra radiación: las zonas de radiación arruinarán fotos.', 'Engines');
  if (!has(state, 'waves')) add('waves', true, 'warning', 'Sin Waves: no puedes juntar datos de auroras.', 'Science');
  const batteryOk = has(state, 'battery') && (!content.placement || effects(content, state).batteryWorks);
  if (!batteryOk && powerOk && s.powerBalance < content.jupiter.lowBatteryBelow)
    add('battery', true, 'warning', `La energía está justa (sobran ${s.powerBalance} W) y no hay batería que funcione.`, 'Power');
  // parts in a weaker spot: say what it costs (placement teaches)
  if (content.placement) for (const id of state.ship.components) {
    if (placeQuality(content, state, id) === 'ok') add(`place-${id}`, true, 'warning', `${findComponent(content, id).name}: ${content.placement[id].weak}`, findComponent(content, id).station);
  }
  return out;
}
export function testsPassed(list) { return list.every((t) => t.level !== 'error'); }

// ---------- science (only what reached Earth) ----------
export function computeScience(content, state) {
  if (state.results.missionLost) return 0;
  const v = content.science, s = state.results.sent;
  let total = s.storm * v.storm + s.cloud * v.cloud + s.waves * v.waves;
  const mag = findComponent(content, 'magnetometer');
  if (has(state, 'magnetometer')) total += (content.placement && effects(content, state).magScience) || mag.science;
  return total;
}

export function objectivesMet(content, state) {
  const o = content.objectives, s = state.results.sent;
  const storms = s.storm >= o.stormPhotosNeeded, auroras = s.waves >= o.wavesPacketsNeeded;
  return { storms, auroras, count: (storms ? 1 : 0) + (auroras ? 1 : 0) };
}

// ---------- responsibility (0-25) ----------
export function dilemmaPoints(content, which, choice) {
  if (!choice) return 0;
  if (which === 'launch') { const l = findLauncher(content, choice); return l ? l.points : 0; }
  const opt = content.dilemmas[which].options.find((o) => o.id === choice);
  return opt ? opt.points : 0;
}
export function computeResponsibility(state, content) {
  const d = state.results.dilemmas;
  return dilemmaPoints(content, 'launch', d.launch) + dilemmaPoints(content, 'openData', d.openData) + dilemmaPoints(content, 'europa', d.europa);
}

// ---------- endings: a decision tree ----------
// Each inner node asks a yes/no question; each leaf is an ending id.
// Walking it is O(depth) = O(3). It is a tree (non-linear): every node has 2 children.
export const ENDING_TREE = {
  question: '¿Se perdió la sonda en el camino?', test: (f) => f.lost,
  yes: { leaf: 'lost' },
  no: {
    question: '¿Responsabilidad alta (17+ de 25)?', test: (f) => f.highResponsibility,
    yes: { question: '¿Ambas metas científicas?', test: (f) => f.objectives === 2, yes: { leaf: 'legendary' }, no: { leaf: 'guardians' } },
    no: { question: '¿Al menos una meta científica?', test: (f) => f.objectives >= 1, yes: { leaf: 'costly' }, no: { leaf: 'lessons' } }
  }
};
export function walkTree(node, facts, path = []) {
  if (node.leaf) return { leaf: node.leaf, path };
  const answer = !!node.test(facts);
  path.push(`${node.question} ${answer ? 'sí' : 'no'}`);
  return walkTree(answer ? node.yes : node.no, facts, path);
}
export function endingFacts(content, state) {
  return { lost: state.results.missionLost,
    highResponsibility: computeResponsibility(state, content) >= content.objectives.highResponsibility,
    objectives: objectivesMet(content, state).count };
}
export function chooseEnding(content, state) { return walkTree(ENDING_TREE, endingFacts(content, state)).leaf; }

// ---------- score (100 points) with human-readable reasons ----------
export function computeScore(content, state) {
  const r = state.results, sc = content.score, reasons = [];
  const s = computeShip(content, state);

  // Science 30
  const sci = computeScience(content, state);
  const science = Math.round(sc.sciencePoints * Math.min(1, sci / content.science.max));
  reasons.push(`Ciencia ${science}/${sc.sciencePoints}: ${sci} puntos de ciencia llegaron a la Tierra ` +
    `(${r.sent.storm} fotos de tormenta, ${r.sent.cloud} de nubes, ${r.sent.waves} paquetes de auroras${has(state, 'magnetometer') && !r.missionLost ? ', + magnetómetro' : ''}).`);

  // Engineering 15
  const e1 = r.testsFirstTry ? 5 : 0, e2 = r.photosRuined === 0 ? 5 : 0, e3 = r.events.includes('lowBattery') ? 0 : 5;
  const engineering = e1 + e2 + e3;
  reasons.push(`Ingeniería ${engineering}/${sc.engineering}: las pruebas ${r.testsFirstTry ? 'pasaron al primer intento (+5)' : 'necesitaron más de un intento (0)'}, ` +
    `${r.photosRuined === 0 ? 'ninguna foto perdida por radiación (+5)' : `${r.photosRuined} fotos arruinadas por radiación (0)`}, ` +
    `${e3 ? 'nunca te quedaste sin energía (+5)' : 'te pegó un evento de batería baja (0)'}.`);

  // Resources 15
  const bu = s.cost / s.budget, mu = s.mass / s.massLimit;
  const r1 = bu >= sc.budgetUse[0] && bu <= sc.budgetUse[1] ? 5 : 0;
  const r2 = mu >= sc.massUse[0] && mu <= sc.massUse[1] ? 5 : 0;
  const r3 = r.fuelAtArrival !== null && r.fuelAtArrival >= content.fuel.safeEnding ? 5 : 0;
  const resources = r1 + r2 + r3;
  reasons.push(`Recursos ${resources}/${sc.resources}: usaste ${Math.round(bu * 100)}% del presupuesto (${r1 ? '+5' : 'meta 85-100%'}), ` +
    `${Math.round(mu * 100)}% del límite de masa (${r2 ? '+5' : 'meta 90-100%'}), ` +
    `${r.fuelAtArrival === null ? 'nunca llegaste a Júpiter (0)' : `${r.fuelAtArrival} de combustible en Júpiter (${r3 ? '+5' : `se necesitaban ${content.fuel.safeEnding}`})`}.`);

  // Communications 15
  const communications = r.packetsCollected > 0 ? Math.round(sc.communications * (r.packetsSent / r.packetsCollected)) : 0;
  reasons.push(`Comunicaciones ${communications}/${sc.communications}: enviaste ${r.packetsSent} de ${r.packetsCollected} paquetes juntados.`);

  // Responsibility 25
  const responsibility = computeResponsibility(state, content);
  const d = r.dilemmas, parts = [];
  const l = d.launch ? findLauncher(content, d.launch) : null;
  parts.push(l ? `${l.name} (+${l.points})` : 'ningún cohete elegido (0)');
  const od = d.openData ? content.dilemmas.openData.options.find((o) => o.id === d.openData) : null;
  parts.push(od ? `${od.label.toLowerCase()} (+${od.points})` : 'no compartiste datos (0)');
  const eu = d.europa ? content.dilemmas.europa.options.find((o) => o.id === d.europa) : null;
  parts.push(eu ? `${eu.label.toLowerCase()} (+${eu.points})` : 'no se decidió sobre Europa (0)');
  reasons.push(`Responsabilidad ${responsibility}/${sc.responsibility}: ${parts.join(', ')}.`);

  const total = science + engineering + resources + communications + responsibility;
  const stars = sc.stars.filter((t) => total >= t).length;
  return { total, stars, parts: { science, engineering, resources, communications, responsibility }, reasons };
}

// Lessons ending: the biggest problem and the station that fixes it
export function mainProblem(content, state) {
  const o = objectivesMet(content, state);
  if (!has(state, 'junocam')) return { text: 'No tenías JunoCam, así que no hubo fotos de tormentas.', station: 'Science' };
  if (!has(state, 'waves')) return { text: 'No tenías Waves, así que no hubo datos de auroras.', station: 'Science' };
  if (state.results.photosRuined > 0) return { text: 'La radiación arruinó algunas fotos.', station: 'Engines' };
  if (!o.storms || !o.auroras) return { text: 'No llegaron suficientes paquetes buenos a la Tierra.', station: 'Comms' };
  return { text: 'La responsabilidad fue baja.', station: 'Engines' };
}

// ---------- mission design: the player's choices change the numbers of the game ----------
// design = { question, orbit, route, name } (ids from content.design.steps). Returns a NEW content
// object with the chosen options' "apply" merged in; the original content is never changed.
// Cost: O(steps x options + parts) — a handful of objects.
export function designOption(content, stepId, optionId) {
  const step = ((content.design || {}).steps || []).find((s) => s.id === stepId);
  return step ? step.options.find((o) => o.id === optionId) || null : null;
}
export function applyDesign(content, design) {
  if (!design || !content.design) return content;
  const out = { ...content };
  for (const step of content.design.steps) {
    const opt = designOption(content, step.id, design[step.id]);
    const a = (opt && opt.apply) || {};
    for (const key of ['objectives', 'science', 'jupiter', 'fuel', 'mission']) {
      if (a[key]) out[key] = { ...out[key], ...a[key] };
    }
    if (a.components) out.components = out.components.map((comp) => (a.components[comp.id] ? { ...comp, ...a.components[comp.id] } : comp));
  }
  return out;
}

