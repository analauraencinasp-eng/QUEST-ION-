// STUB — replaced in the next step
import { fresh, txt } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
export default class OrbitScene extends Phaser.Scene {
  constructor() { super('OrbitScene'); }
  create(data) { fresh(this); txt(this, 640, 360, 'OrbitScene (coming next)', { font: 'title', size: 20, origin: 0.5 }); setup(this, data, { back: true }); }
}
