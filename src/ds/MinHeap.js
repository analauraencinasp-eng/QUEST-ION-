// MinHeap.js — binary min-heap (a NON-LINEAR structure: a complete binary tree
// stored in an array). The smallest key is always at the root.
// Used in JupiterScene.js: events are ordered by the second when they happen,
// so the next event is always heap.peek().
//   For the node at index i: parent = (i - 1) >> 1, children = 2i + 1 and 2i + 2.
//   push and pop: O(log n) (one walk up or down the tree). peek: O(1). Memory: O(n).

export default class MinHeap {
  // keyOf tells the heap which number to compare (default: the value itself)
  constructor(keyOf = (x) => x) {
    this.data = [];
    this.keyOf = keyOf;
  }

  size() { return this.data.length; }
  isEmpty() { return this.data.length === 0; }
  peek() { return this.data[0]; }

  // add a value, then move it UP while it is smaller than its parent. O(log n)
  push(value) {
    this.data.push(value);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keyOf(this.data[i]) >= this.keyOf(this.data[parent])) break;
      this.swap(i, parent);
      i = parent;
    }
    return this.data.length;
  }

  // take the smallest value: move the last leaf to the root and push it DOWN. O(log n)
  pop() {
    const n = this.data.length;
    if (n === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (n > 1) {
      this.data[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < this.data.length && this.keyOf(this.data[l]) < this.keyOf(this.data[smallest])) smallest = l;
        if (r < this.data.length && this.keyOf(this.data[r]) < this.keyOf(this.data[smallest])) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  swap(a, b) { const t = this.data[a]; this.data[a] = this.data[b]; this.data[b] = t; }

  // copy of the values in the order they would come out (does not change the heap). O(n log n)
  toSortedArray() {
    const copy = new MinHeap(this.keyOf);
    copy.data = this.data.slice();
    const out = [];
    while (!copy.isEmpty()) out.push(copy.pop());
    return out;
  }
}
