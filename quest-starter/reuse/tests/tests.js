// tests.js — test cases for the data structures and game rules (rubric: "at least 5 test
// cases, including edge cases"). Run them:
//   - in the browser: open tests.html with Live Server
//   - in a terminal:  node tests-run.mjs
// Each case: { name, kind: 'normal' | 'edge', run() } — run() throws if something is wrong.

import Stack from '../ds/Stack.js';
import Queue from '../ds/Queue.js';
import LinkedList from '../ds/LinkedList.js';
import MinHeap from '../ds/MinHeap.js';
import Graph from '../ds/Graph.js';
import { insertionSort, linearSearch } from '../ds/sorts.js';

function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg || 'not equal'}: got ${A}, expected ${B}`);
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected true'); }

// a fresh fake state (same shape as state.js) so tests never touch the real game
function fakeState(components = [], extra = {}) {
  return {
    mode: 'solo', players: 1, roles: [], settings: {}, stars: {}, log: [],
    ship: { components: components.slice(), placement: {}, launcher: null, fuel: 0 },
    results: { photos: 0, stormPhotos: 0, packetsCollected: 0, packetsSent: 0, packetsLost: 0, events: [],
      dilemmas: { launch: null, openData: null, europa: null }, votes: [], testsFirstTry: false, missionLost: false,
      ending: null, redesigns: 0, testsTried: 0, packets: [], sent: { storm: 0, cloud: 0, waves: 0 }, photosRuined: 0,
      lostToEvents: 0, fuelAtArrival: null, launchAttempts: 0, ...extra }
  };
}

export function makeCases(content) {
  return [
    // ---------- Stack (linear) ----------
    { name: 'Stack: undo removes the LAST part installed (LIFO)', kind: 'normal', run() {
      const s = new Stack(); ['solar', 'antenna', 'junocam'].forEach((x) => s.push(x));
      eq(s.pop(), 'junocam'); eq(s.pop(), 'antenna'); eq(s.size(), 1);
    } },
    { name: 'Stack: pop/peek on an empty stack return undefined (no crash)', kind: 'edge', run() {
      const s = new Stack(); eq(s.pop(), undefined); eq(s.peek(), undefined); eq(s.size(), 0); ok(s.isEmpty());
    } },
    // ---------- Queue (linear) ----------
    { name: 'Queue: director lines come out in order (FIFO)', kind: 'normal', run() {
      const q = new Queue(); ['a', 'b', 'c'].forEach((x) => q.enqueue(x));
      eq([q.dequeue(), q.dequeue(), q.dequeue()], ['a', 'b', 'c']);
    } },
    { name: 'Queue: empty -> dequeue undefined; reuse after emptying keeps head/tail right', kind: 'edge', run() {
      const q = new Queue(); eq(q.dequeue(), undefined);
      q.enqueue(1); q.dequeue(); ok(q.tail === null && q.head === null, 'tail must reset');
      q.enqueue(2); q.enqueue(3); eq(q.toArray(), [2, 3]);
    } },
    // ---------- Linked list (linear) ----------
    { name: 'LinkedList: log keeps order; removing the tail updates the tail pointer', kind: 'edge', run() {
      const l = new LinkedList(); l.append('x').append('y').append('z');
      eq(l.remove((v) => v === 'z'), 'z'); eq(l.tail.value, 'y');
      l.append('w'); eq(l.toArray(), ['x', 'y', 'w']);
    } },
    // ---------- Min-heap (NON-linear: binary tree) ----------
    { name: 'MinHeap: events come out ordered by time (100 random times)', kind: 'normal', run() {
      const h = new MinHeap((e) => e.time), times = [];
      for (let i = 0; i < 100; i++) { const t = Math.floor(Math.random() * 1000); times.push(t); h.push({ time: t }); }
      const out = []; while (!h.isEmpty()) out.push(h.pop().time);
      eq(out, times.slice().sort((a, b) => a - b));
    } },
    { name: 'MinHeap: empty heap, one element and equal keys', kind: 'edge', run() {
      const h = new MinHeap(); eq(h.pop(), undefined); eq(h.peek(), undefined);
      h.push(5); eq(h.pop(), 5); ok(h.isEmpty());
      [3, 3, 3].forEach((x) => h.push(x)); eq([h.pop(), h.pop(), h.pop()], [3, 3, 3]);
    } },
    { name: 'MinHeap: heap property holds after every push (parent <= children)', kind: 'normal', run() {
      const h = new MinHeap();
      [9, 4, 7, 1, 8, 2, 6].forEach((x) => {
        h.push(x);
        h.data.forEach((v, i) => { if (i > 0) ok(h.data[(i - 1) >> 1] <= v, `broken at index ${i}`); });
      });
      eq(h.peek(), 1);
    } },
    // ---------- Graph + BFS (NON-linear) ----------
    { name: 'Graph BFS: unknown start returns []; cycles do not loop forever', kind: 'edge', run() {
      const g = new Graph(); g.addEdge('a', 'b').addEdge('b', 'c').addEdge('c', 'a');
      eq(g.bfs('zzz'), []); eq(g.bfs('a').map((v) => v.vertex), ['a', 'b', 'c']); eq(g.distance('a', 'c'), 2); eq(g.distance('a', 'q'), -1);
    } },
    // ---------- Sorting and searching ----------
    { name: 'insertionSort: sorts by value, highest first, and is stable', kind: 'normal', run() {
      const packets = [{ id: 1, v: 2 }, { id: 2, v: 6 }, { id: 3, v: 5 }, { id: 4, v: 6 }];
      eq(insertionSort(packets, (a, b) => b.v - a.v).map((p) => p.id), [2, 4, 3, 1]);
    } },
    { name: 'insertionSort / linearSearch: empty list, one item, not found', kind: 'edge', run() {
      eq(insertionSort([]), []); eq(insertionSort([7]), [7]); eq(insertionSort([3, 2, 1]), [1, 2, 3]);
      eq(linearSearch([], () => true), -1); eq(linearSearch([1, 2], (x) => x === 9), -1);
    } },
    // ---------- Game rules ----------
  ];
}

export function runAll(content) {
  return makeCases(content).map((c) => {
    try { c.run(); return { name: c.name, kind: c.kind, pass: true }; } catch (e) { return { name: c.name, kind: c.kind, pass: false, error: e.message }; }
  });
}
