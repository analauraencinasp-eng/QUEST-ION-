// BootScene — reads data/manifest.json, then loads every content JSON, image and sound it lists.
// A missing file never stops the game (widgets.img() draws a placeholder). Waits for the pixel
// fonts so the first texts measure correctly. Then: TitleScene.
import { setContent, content } from '../content.js';
import { loadSettings } from '../save.js';
import { registerRecordedLines } from '../voice.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    loadSettings();
    const bar = this.add.rectangle(440, 360, 0, 20, 0xe69f00).setOrigin(0, 0.5);
    this.add.rectangle(640, 360, 404, 28).setStrokeStyle(4, 0xffffff);
    this.add.text(640, 316, 'LOADING...', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.load.on('progress', (p) => bar.setSize(400 * p, 20));
    this.load.on('loaderror', (file) => console.warn('[QUEST(ION)] missing file, using a placeholder:', file.key));
    this.load.json('manifest', 'data/manifest.json');
    this.load.once('filecomplete-json-manifest', (key, type, m) => {
      for (const name of m.content) this.load.json(`c:${name}`, `data/content/${name}.json`);
      for (const [k, url] of Object.entries(m.data || {})) this.load.json(`d:${k}`, url);
      for (const [k, url] of Object.entries(m.images || {})) this.load.image(k, url);
      for (const [k, url] of Object.entries(m.audio || {})) this.load.audio(k, url);
      registerRecordedLines(m.voice || []);
    });
  }

  create() {
    const m = this.cache.json.get('manifest');
    if (!m) {
      this.add.text(640, 420, 'Could not load data/manifest.json.\nOpen the game with Live Server (not by double-clicking index.html).',
        { fontFamily: 'monospace', fontSize: '20px', color: '#ff7a45', align: 'center' }).setOrigin(0.5);
      return;
    }
    for (const name of m.content) setContent(name, this.cache.json.get(`c:${name}`) || {});
    for (const k of Object.keys(m.data || {})) setContent(k, this.cache.json.get(`d:${k}`) || null);
    // NASA audio clips listed in nasa_media.json are loaded lazily here (optional)
    const media = content.nasa_media && content.nasa_media.audio;
    if (media && media.length) {
      for (const a of media) if (a.file) this.load.audio(a.key, a.file);
      this.load.once('complete', () => this.go());
      this.load.start();
    } else this.go();
  }

  go() {
    const start = () => this.scene.start('TitleScene');
    if (document.fonts && document.fonts.load) {
      const f = Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('16px "VT323"')]);
      Promise.race([f, new Promise((r) => setTimeout(r, 1500))]).then(start, start);
    } else start();
  }
}
