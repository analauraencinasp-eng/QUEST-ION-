// Queue.js — FIFO queue (first in, first out) made with linked nodes.
// Used in MissionControlScene.js (director lines in order) and TransmitScene.js
// (data packets leave the antenna in the order they were queued).
// enqueue / dequeue / peek are O(1) because we keep a pointer to both ends.
// (An array with shift() would make dequeue O(n): every item moves one place.)

class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export default class Queue {
  constructor() {
    this.head = null;   // first to leave
    this.tail = null;   // last to arrive
    this.length = 0;
  }

  // add at the back. O(1)
  enqueue(value) {
    const node = new Node(value);
    if (this.tail) this.tail.next = node;
    else this.head = node;          // queue was empty
    this.tail = node;
    this.length++;
    return this.length;
  }

  // take from the front. O(1). Returns undefined if empty.
  dequeue() {
    if (!this.head) return undefined;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null; // queue is now empty
    this.length--;
    return value;
  }

  peek() { return this.head ? this.head.value : undefined; }
  isEmpty() { return this.length === 0; }
  size() { return this.length; }

  // copy front to back. O(n)
  toArray() {
    const out = [];
    for (let n = this.head; n; n = n.next) out.push(n.value);
    return out;
  }
}
