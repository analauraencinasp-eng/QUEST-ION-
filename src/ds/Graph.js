// Graph.js — directed graph with an adjacency list (a NON-LINEAR structure),
// plus breadth-first search (BFS).
// Used in Hud.js for the "domino effect": when you install a component, BFS walks
// from that component to every resource it affects, and those bars light up.
//   addVertex / addEdge: O(1). neighbors: O(1).
//   bfs: O(V + E) time, O(V) memory (visited set + queue).

import Queue from './Queue.js';

export default class Graph {
  constructor() {
    this.adj = new Map();   // vertex -> array of neighbors
  }

  addVertex(v) {
    if (!this.adj.has(v)) this.adj.set(v, []);
    return this;
  }

  // edge from a to b (a affects b)
  addEdge(a, b) {
    this.addVertex(a);
    this.addVertex(b);
    if (!this.adj.get(a).includes(b)) this.adj.get(a).push(b);
    return this;
  }

  neighbors(v) { return this.adj.get(v) || []; }
  hasVertex(v) { return this.adj.has(v); }
  vertexCount() { return this.adj.size; }

  // Breadth-first search from start. Returns [{ vertex, depth }] in visiting order.
  // depth = how many "domino" steps away the vertex is.
  bfs(start) {
    if (!this.adj.has(start)) return [];
    const visited = new Set([start]);
    const queue = new Queue();
    const order = [];
    queue.enqueue({ vertex: start, depth: 0 });
    while (!queue.isEmpty()) {
      const cur = queue.dequeue();
      order.push(cur);
      for (const next of this.neighbors(cur.vertex)) {
        if (visited.has(next)) continue;     // never visit a vertex twice (handles cycles)
        visited.add(next);
        queue.enqueue({ vertex: next, depth: cur.depth + 1 });
      }
    }
    return order;
  }

  // shortest number of steps from a to b (BFS), or -1 if there is no path
  distance(a, b) {
    const hit = this.bfs(a).find((x) => x.vertex === b);
    return hit ? hit.depth : -1;
  }
}
