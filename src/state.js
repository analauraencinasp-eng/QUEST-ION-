// state.js — ONE shared object with everything the player has decided or achieved.
// Every scene imports { state }. save.js turns it into JSON for localStorage.
// The mission log is a hand-written LinkedList (append O(1), read in order for MY MISSION / LOG).
import LinkedList from './ds/LinkedList.js';

export const STATION_IDS = ['structure', 'power', 'comms', 'computer', 'attitude'];

export function defaultSettings() {
  return { narration: true, textSize: 'M', volume: 70, music: true, sfx: true, reduceMotion: false, nasaKey: '' };
}

function freshMission() {
  return {
    mode: '1p',                       // '1p' | '4p' (4 players is visual only for now)
    role: null,                       // 'systems' | 'engineer' | 'science' | 'comms'
    roles4: {},                       // 4P: { P1: 'engineer', ... }
    planet: null,                     // 'mars'
    objective: null,                  // 'water'
    // Screen 9/10: the chosen alternative per station ('A' | 'B' | 'C') in install order
    stations: { structure: null, power: null, comms: null, computer: null, attitude: null },
    installOrder: [],
    meters: { budget: 0, mass: 0, energy: 0, responsibility: 60 },   // SIMULATED GAME VALUES
    // Screen 11: warehouse + assembly
    instruments: { inspected: {}, quiz: {}, kit: [], placed: {}, results: null, undoCount: 0 },
    // Screen 12: orbit planner
    orbit: { launchDay: 0, burnPower: 4, burnDirection: 0, drawnPath: [], travelDays: null, fuelUsed: null,
      reached: false, attempts: [], tutorialStep: 0, stars: 0, launchDate: null, arrivalDate: null },
    // Screen 13: meteor launch mini-game
    launch: { hull: 3, rocksPushed: 0, timeSec: 0, lost: 0, done: false },
    // quiz gates 13e / 14f: { tier, firstTry, answeredTier }
    quizzes: {},
    // Screen 14: Rock Hunter
    rocks: { samples: [], scanned: [], science: 0, energyLeft: 100, done: false },
    // Screens 15b–15i: comms planner
    comms: { route: null, window: null, priority: null, returnedMb: 0, totalMb: 0, energy: null, done: false },
    // Screen 16b: Signal Run
    signal: { packets: 0, shots: 0, energyLeft: 100, done: false },
    points: { science: 0, engineering: 0, resources: 0, earth: 0 },
    resourceHistory: [],              // [{ stage, budget, energy, fuel }] for the dashboard chart
    log: new LinkedList(),
    completed: false,
    lastScore: null,
    unlocked: { planets: ['mars'], objectives: ['water'] }
  };
}

export const state = {
  settings: defaultSettings(),
  mission: freshMission(),
  screen: null,                       // { key, data } of the screen the player is on (for CONTINUE)
  history: []                         // router history (array copy of the Stack, saved for CONTINUE)
};

// NEW GAME: wipe the mission but keep the settings (and what was unlocked + the last score for {DELTA_VS_LAST}).
export function resetMission() {
  const keep = { unlocked: state.mission.unlocked, lastScore: state.mission.lastScore };
  state.mission = freshMission();
  state.mission.unlocked = keep.unlocked;
  state.mission.lastScore = keep.lastScore;
  state.screen = null;
  state.history = [];
}

// Add one line to the mission log (shown in MY MISSION and the LOG button of the dashboard).
export function logEvent(text, stage = '') {
  state.mission.log.append({ text, stage, t: Date.now() });
}

export function m() { return state.mission; }

// rebuild the state from saved JSON (save.js)
export function hydrate(saved) {
  if (!saved || typeof saved !== 'object') return;
  const fresh = freshMission();
  const mission = { ...fresh, ...(saved.mission || {}) };
  for (const k of Object.keys(fresh)) {
    if (fresh[k] && typeof fresh[k] === 'object' && !Array.isArray(fresh[k]) && !(fresh[k] instanceof LinkedList)) {
      mission[k] = { ...fresh[k], ...((saved.mission || {})[k] || {}) };
    }
  }
  const list = new LinkedList();
  for (const e of (saved.mission && saved.mission.log) || []) list.append(e);
  mission.log = list;
  state.mission = mission;
  state.screen = saved.screen || null;
  state.history = Array.isArray(saved.history) ? saved.history : [];
}

export function serialize() {
  return { v: 1, mission: { ...state.mission, log: state.mission.log.toArray() }, screen: state.screen, history: state.history };
}
