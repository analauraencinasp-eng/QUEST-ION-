// sorts.js — sorting and searching written by hand.
//   insertionSort: used by "Sort by value" in TransmitScene.js. O(n²) worst case,
//     O(n) if the list is almost sorted; O(1) extra memory (in place on a copy).
//     Good choice here: the list has at most ~12 packets and it is stable
//     (packets with the same value keep their order).
//   linearSearch: used in rules.js to find a component by id. O(n), O(1) memory.
//     With only 9 components it is as fast as a Map and simpler to explain.

// returns a NEW sorted array; compare(a, b) < 0 means a goes first
export function insertionSort(list, compare = (a, b) => a - b) {
  const arr = list.slice();
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;
    // move bigger items one place to the right until current fits
    while (j >= 0 && compare(arr[j], current) > 0) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = current;
  }
  return arr;
}

// index of the first item that passes the test, or -1
export function linearSearch(list, test) {
  for (let i = 0; i < list.length; i++) if (test(list[i], i)) return i;
  return -1;
}
