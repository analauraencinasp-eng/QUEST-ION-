// ReportScene.js — score out of 100 in 5 parts, stars, the reason for every point,
// comparison with the real Juno, "Endings found: X of 5", "Concepts learned: X of 15"
// and the discovery log kept in a LINKED LIST (LinkedList.js). (owner: P5)
// Addendum D: gallery of REAL JunoCam images (1 per storm photo that reached Earth, max 3)
// and, if Waves was installed, P plays the real Juno "Jupiter auroras radio" clip.
// Mini-game stars from state.stars are listed too.
// Buttons: R = Redesign (back to the workshop, redesigns + 1), M = Main menu.
// Reads everything in state. Writes results.redesigns (through resetForRedesign).

import LinkedList from './LinkedList.js';
import { state, resetState, resetForRedesign } from './state.js';
import { say } from './a11y.js';
import { computeScore, computeShip, zoneOf, findComponent, designOption } from './rules.js';
import { endingsFound } from './EndingScene.js';
import * as ui from './ui.js';

export default class ReportScene extends Phaser.Scene {
  constructor() { super('ReportScene'); }

  create() {
    ui.freshScene(this, { gallery: [], wavesPlayable: false, bars: [], audioBtn: null, design: [] });
    const c = ui.content(this);
    ui.background(this);
    ui.progressBar(this, 8);
    ui.helpHint(this);

    const score = computeScore(c, state);
    const stars = ui.starsText(score.stars);
    ui.text(this, 30, 42, `${state.design ? `«${state.design.name}» · ` : ''}PUNTAJE ${score.total}/100  ${stars}`, { size: 18, title: true, color: ui.color(this, 'accent') });
    ui.text(this, 30, 72, `Finales encontrados: ${endingsFound().size} de 5 · Conceptos aprendidos: ${ui.conceptsLearned()} de ${c.concepts.length}` +
      (state.results.votes.length ? ` · Votos del equipo: ${state.results.votes.filter((v) => v.unanimous).length} unánimes, ${state.results.votes.filter((v) => !v.unanimous).length} divididos` : ''),
    { size: 16, color: ui.color(this, 'interactive') });

    // the discovery log: a linked list walked from head to tail
    this.log = new LinkedList();
    for (const entry of state.log) this.log.append(typeof entry === 'string' ? entry : entry.text);

    // pages (Left/Right): score, design, reasons, real Juno, log, concepts, rewards, NASA sources
    const s = computeShip(c, state), j = c.realJuno;
    this.pages = [
      { title: 'Tu puntaje', body: '' },
      { title: 'Tu diseño: dónde pusiste cada pieza', body: '' },
      { title: 'Por qué ganaste cada punto', body: score.reasons.join('\n') },
      { title: 'Tú contra la Juno real', body:
        `Tu sonda: ${s.mass.toLocaleString('es-MX')} kg (en seco) · ${s.cost} M$ · ${state.ship.components.length} piezas · cohete: ${state.ship.launcher ? (c.launchers.find((l) => l.id === state.ship.launcher) || {}).name : 'ninguno'}\n` +
        `Juno real: lanzada en ${j.launchYear} en un ${j.rocket} · ${j.massKg.toLocaleString('es-MX')} kg al lanzar · unos ${j.costMillion.toLocaleString('es-MX')} millones de dólares · llegó a Júpiter en ${j.arrivalYear}.\n` +
        (state.design ? `Tus decisiones: ${['question', 'orbit', 'route'].map((id) => (designOption(c, id, state.design[id]) || {}).label).filter(Boolean).join(' · ')}\n` : '') +
        `Juno eligió: estudiar el interior, la atmósfera y las auroras · órbita polar muy alargada (evita la peor radiación) · pasar junto a la Tierra en ${j.earthFlyby || 'octubre de 2013'} para ganar velocidad.\n` +
        'Nuestros números son valores de juego simplificados para que las decisiones sean difíciles; los reales vienen de la NASA (página Fuentes).' },
      { title: 'Bitácora de descubrimientos', body: this.log.toArray().filter((t) => !t.startsWith('Aprendiste:')).slice(-12).join('\n') || 'Nada registrado.' },
      { title: 'Conceptos que puedes repasar', body: (() => {
        const seen = c.concepts.filter((k) => ui.conceptSeen(k.id));
        const checks = state.log.filter((e) => e.type === 'check');
        return seen.length ? `${seen.map((k) => k.title).join(' · ')}\n\nPreguntas rápidas en esta partida: ${checks.filter((e) => e.correct).length} correctas de ${checks.length}.\nPresiona 1-9 para releer un concepto.` : 'Todavía no has visto conceptos.';
      })() },
      { title: 'Recompensas', body: '' },
      { title: 'Fuentes NASA de los datos del juego', body: (c.sources || []).map((q) => `• ${q.name}: ${q.url.replace(/^https?:\/\/(www\.)?/, '')}`).join('\n') +
        '\nImágenes de Júpiter: NASA/JPL-Caltech/SwRI/MSSS (JunoCam).' }
    ];
    this.page = 0;
    this.buildRewards(c);
    ui.panel(this, 20, 100, 920, 330);
    // page 0 is drawn as bars with icons instead of text
    const P = score.parts, maxes = c.score;
    const rows = [['Ciencia', 'art-icon-stormphoto', P.science, maxes.sciencePoints], ['Ingeniería', 'art-icon-wrench2', P.engineering, maxes.engineering],
      ['Recursos', 'art-icon-coin', P.resources, maxes.resources], ['Comunicaciones', 'art-antenna', P.communications, maxes.communications],
      ['Responsabilidad', 'art-icon-heart', P.responsibility, maxes.responsibility]];
    const g = ui.track(this, this.add.graphics(), 101);
    rows.forEach(([name, icon, val, max], i) => {
      const y = 140 + i * 54;
      this.bars.push(ui.image(this, 60, y + 13, icon, 32, 32, { ui: true, depth: 101 }));
      this.bars.push(ui.text(this, 90, y + 2, name, { size: 16, depth: 101 }));
      this.bars.push(ui.text(this, 910, y + 2, `${val}/${max}`, { size: 18, title: true, origin: [1, 0], depth: 101, color: val === max ? '#86d8b4' : '#f6efe3' }));
      const n = 20, filled = Math.round((val / max) * n);
      for (let b = 0; b < n; b++) g.fillStyle(b < filled ? (val === max ? 0x009E73 : 0x56B4E9) : 0x2b2a48, 1).fillRect(260 + b * 26, y + 4, 22, 18);
    });
    this.bars.push(g);
    // page 1: every installed part, its zone, ★ best / ⚠ weaker, and what that caused
    this.design = [];
    state.ship.components.forEach((id, i) => {
      const y = 136 + i * 32, comp = findComponent(c, id), zone = zoneOf(state, id);
      const z = (c.zones.find((q) => q.id === zone) || { name: '—' });
      const best = c.placement[id].best.includes(zone);
      this.design.push(ui.image(this, 54, y + 10, `art-${id}`, 26, 26, { ui: true, depth: 101 }));
      this.design.push(ui.text(this, 76, y, `${best ? '★' : '⚠'} ${comp.name} → ${z.name}`, { size: 16, depth: 101, color: best ? '#86d8b4' : '#F0E442' }));
      this.design.push(ui.text(this, 380, y, best ? c.placement[id].good : c.placement[id].weak, { size: 16, depth: 101, wrap: 540 }));
    });
    if (!state.ship.components.length) this.design.push(ui.text(this, 40, 140, 'No hay piezas instaladas.', { size: 16, depth: 101 }));
    this.pageTitle = ui.text(this, 40, 110, '', { size: 16, color: ui.color(this, 'accent') });
    this.pageBody = ui.text(this, 40, 138, '', { size: 16, wrap: 880 });
    ui.button(this, 90, 455, '◀', () => this.onKey('ArrowLeft'), { w: 70 });
    ui.button(this, 170, 455, '▶', () => this.onKey('ArrowRight'), { w: 70 });
    ui.button(this, 560, 455, '↻ Rediseñar', () => this.onKey('r'), { w: 190, color: '#4f9e78' });
    ui.button(this, 800, 455, '⌂ Menú', () => this.onKey('m'), { w: 200, small: true });
    this.audioBtn = ui.button(this, 340, 455, '♪ Oír auroras', () => this.onKey('p'), { w: 200, small: true });
    this.showPage();
    ui.directorSays(this, c.dialogues.director.report);
    say(`Puntaje ${score.total} de 100, ${score.stars} estrellas. ${score.reasons.join(' ')}`);
    ui.onKeys(this, (k) => this.onKey(k));
  }

  buildRewards(c) {
    const rw = c.rewards, unlocked = Math.min(rw.junocamImages.length, state.results.sent.storm);
    const stars = Object.entries(state.stars).map(([k, n]) => `${k.replace('Scene', '')} ${ui.starsText(n)}`).join(' · ') || 'Todavía no hay estrellas de minijuegos.';
    const wavesOn = state.ship.components.includes('waves') && !state.results.missionLost;
    const audioOk = this.cache.audio.exists(rw.wavesAudio);
    this.pages[6].body = `Estrellas de minijuegos: ${stars}\n` +
      `Imágenes reales de JunoCam desbloqueadas: ${unlocked} de ${rw.junocamImages.length} (una por foto de tormenta enviada)\n` +
      (wavesOn ? (audioOk ? 'P: oye el sonido real de las auroras de Júpiter grabado por Waves de Juno.' : 'Waves desbloqueó el sonido real de las auroras, pero falta sfx-real-waves.wav (P5 lo agrega).') : 'Instala Waves para desbloquear el sonido real de las auroras de Júpiter.') +
      `\n${rw.credit}`;
    this.wavesPlayable = wavesOn && audioOk;
    this.gallery = rw.junocamImages.map((key, i) => {
      const x = 170 + i * 310, open = i < unlocked;   // 16:9 thumbnails of the real JunoCam data
      const img = open && this.textures.exists(key) ? ui.image(this, x, 340, key, 280, 158, { ui: true, depth: 101 })
        : ui.track(this, this.add.rectangle(x, 340, 280, 158, 0x2b2a48), 101);
      const label = ui.text(this, x, 340, open ? (this.textures.exists(key) ? '' : `✓ Desbloqueada\n(falta ${key}.png)`) : '✕ Bloqueada: manda una\nfoto de tormenta', { size: 16, origin: [0.5, 0.5], align: 'center', depth: 102 });
      if (open && this.textures.exists(key)) img.setInteractive({ useHandCursor: true }).on('pointerdown', () => ui.modal(this, `Imagen real de JunoCam ${i + 1}`, `${c.rewards.credit}\nSon datos reales del paso cercano de Juno del 8 de junio de 2025.`));
      return [img, label];
    }).flat();
  }

  showPage() {
    const p = this.pages[this.page];
    if (this.audioBtn) this.audioBtn.setVisible(this.page === 6 && this.wavesPlayable);
    (this.gallery || []).forEach((o) => o.setVisible(this.page === 6));
    (this.design || []).forEach((o) => o.setVisible(this.page === 1));
    (this.bars || []).forEach((o) => o.setVisible(this.page === 0));
    this.pageTitle.setText(`${p.title}  (${this.page + 1}/${this.pages.length})`);
    this.pageBody.setText(p.body);
    // shrink the page if it would not fit (large text)
    if (this.pageBody.height > 280) this.pageBody.setText(p.body.split('\n').slice(-8).join('\n'));
    say(`${p.title}. ${p.body}`);
  }

  onKey(k) {
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { this.page = (this.page + 1) % this.pages.length; this.showPage(); }
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { this.page = (this.page + this.pages.length - 1) % this.pages.length; this.showPage(); }
    else if (this.page === 5 && /^[1-9]$/.test(k)) {
      const seen = ui.content(this).concepts.filter((x) => ui.conceptSeen(x.id));
      const hit = seen[Number(k) - 1];
      if (hit) ui.modal(this, hit.title, `${hit.text.replace(/\n/g, ' ')}\n\n${hit.more}`, ['Enter: cerrar']);
    }
    else if ((k === 'p' || k === 'P') && this.page === 6 && this.wavesPlayable) ui.sfx(this, ui.content(this).rewards.wavesAudio);
    else if (k === 'r' || k === 'R') { resetForRedesign(); this.scene.start('WorkshopScene'); }
    else if (k === 'm' || k === 'M' || k === 'Escape') { resetState(); this.scene.start('TitleScene'); }
  }
}
