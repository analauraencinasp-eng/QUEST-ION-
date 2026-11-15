// STUB — replaced in the next step
import { fresh, txt } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
export default class SlidesScene extends Phaser.Scene {
  constructor() { super('SlidesScene'); }
  create(data) { fresh(this); txt(this, 640, 360, 'SlidesScene (coming next)', { font: 'title', size: 20, origin: 0.5 }); setup(this, data, { back: true }); }
}
