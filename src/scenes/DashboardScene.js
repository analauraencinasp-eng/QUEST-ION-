// STUB — replaced in the next step
import { fresh, txt } from '../ui/widgets.js';
import { setup } from '../ui/chrome.js';
export default class DashboardScene extends Phaser.Scene {
  constructor() { super('DashboardScene'); }
  create(data) { fresh(this); txt(this, 640, 360, 'DashboardScene (coming next)', { font: 'title', size: 20, origin: 0.5 }); setup(this, data, { back: true }); }
}
