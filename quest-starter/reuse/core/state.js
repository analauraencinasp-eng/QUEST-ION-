// state.js — the shared state of the game (owner: P1).
// Every scene imports it: import { state, resetState } from './state.js'
// Shape follows section 2 of the master document. Fields marked "ADDED" were needed
// to apply the rules exactly (they are new, nothing was renamed).

function freshResults() {
  return {
    photos: 0, stormPhotos: 0,                 // photos stored on board (not ruined)
    packetsCollected: 0, packetsSent: 0, packetsLost: 0,
    events: [],                                // ids of events that happened ('lowBattery', 'storageFull')
    dilemmas: { launch: null, openData: null, europa: null },
    votes: [],                                 // team mode: { dilemma, votes:[...], unanimous }
    testsFirstTry: false,
    missionLost: false, ending: null, redesigns: 0,
    // ADDED
    testsTried: 0,                             // how many times tests ran (testsFirstTry = passed on try 1)
    packets: [],                               // packets on board: { type:'storm'|'cloud'|'waves', value }
    sent: { storm: 0, cloud: 0, waves: 0 },    // what reached Earth
    photosRuined: 0,                           // photos lost to radiation noise (addendum C: radiation zones)
    lostToEvents: 0,                           // packets lost by Low battery / Storage full
    fuelAtArrival: null,                       // fuel left when arriving at Jupiter
    launchAttempts: 0
  };
}

export const state = {
  mode: 'solo', players: 1, roles: [], avatar: 1,           // ADDED avatar: which astronaut (1-4) the player chose         // roles: [{ player: 1, role: 'Director' }, ...]
  settings: { narration: false, colorblind: true, largeText: false, highContrast: false, noTimers: false, sharedCamera: false },
  design: null,                                // ADDED the mission the player designed: { question, orbit, route, name }
  ship: { components: [], placement: {}, launcher: null, fuel: 0 },   // ADDED placement: { partId: zoneId }
  results: freshResults(),
  stars: {},                                   // addendum B: best stars per mini-game { TestsScene: 2, ... }
  log: []                                      // discovery log entries (strings), read by ReportScene
};

// New game: keep the accessibility settings, clear everything else.
export function resetState() {
  // (state.avatar is kept: you keep your astronaut)
  state.mode = 'solo';
  state.players = 1;
  state.roles = [];
  state.design = null;
  state.ship = { components: [], placement: {}, launcher: null, fuel: 0 };
  state.results = freshResults();
  state.stars = {};
  state.log = [];
}

// Redesign: keep the ship's parts, team and settings; clear the flight results.
export function resetForRedesign() {
  const redesigns = state.results.redesigns + 1;
  state.ship.launcher = null;
  state.ship.fuel = 0;
  state.results = freshResults();
  state.results.redesigns = redesigns;
  state.log = [];
}

// Add a line to the discovery log
export function logEvent(text) { state.log.push(text); }
