// Stack.js — LIFO stack (last in, first out), written by hand on top of an array.
// Used in WorkshopScene.js: key Z removes the LAST component installed.
// push / pop / peek are O(1) (amortized for push); memory O(n).

export default class Stack {
  constructor() {
    this.items = [];   // the top of the stack is the end of the array
    this.count = 0;
  }

  // put a value on top. O(1)
  push(value) {
    this.items[this.count] = value;
    this.count++;
    return this.count;
  }

  // take the value on top out. O(1). Returns undefined if empty.
  pop() {
    if (this.count === 0) return undefined;
    this.count--;
    const value = this.items[this.count];
    this.items.length = this.count;   // forget the removed slot
    return value;
  }

  // look at the top without removing it. O(1)
  peek() { return this.count === 0 ? undefined : this.items[this.count - 1]; }

  isEmpty() { return this.count === 0; }
  size() { return this.count; }

  // remove one specific value (used when a card is uninstalled by hand). O(n)
  remove(value) {
    const i = this.items.lastIndexOf(value);
    if (i === -1) return false;
    this.items.splice(i, 1);
    this.count--;
    return true;
  }

  clear() { this.items = []; this.count = 0; }

  // copy from bottom to top. O(n)
  toArray() { return this.items.slice(0, this.count); }
}
