// LinkedList.js — singly linked list with head and tail pointers.
// Used in ReportScene.js as the mission's discovery log: entries are added at the
// end while you play (O(1) with the tail pointer) and read once, in order, at the end (O(n)).

class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export default class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  // add at the end. O(1)
  append(value) {
    const node = new ListNode(value);
    if (!this.head) this.head = node;
    else this.tail.next = node;
    this.tail = node;
    this.length++;
    return this;
  }

  // add at the start. O(1)
  prepend(value) {
    const node = new ListNode(value);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.length++;
    return this;
  }

  // first value that matches the test (linear search). O(n)
  find(test) {
    for (let n = this.head; n; n = n.next) if (test(n.value)) return n.value;
    return undefined;
  }

  // remove the first value that matches the test. O(n)
  remove(test) {
    let prev = null;
    for (let n = this.head; n; prev = n, n = n.next) {
      if (!test(n.value)) continue;
      if (prev) prev.next = n.next; else this.head = n.next;
      if (n === this.tail) this.tail = prev;
      this.length--;
      return n.value;
    }
    return undefined;
  }

  size() { return this.length; }
  isEmpty() { return this.length === 0; }

  // walk the list from head to tail. O(n)
  toArray() {
    const out = [];
    for (let n = this.head; n; n = n.next) out.push(n.value);
    return out;
  }

  *[Symbol.iterator]() { for (let n = this.head; n; n = n.next) yield n.value; }
}
