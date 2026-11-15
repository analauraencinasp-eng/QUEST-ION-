// BootScene.js — loads content.json, then every art-*.png and sfx-*.wav listed in its "assets".
// If a file is missing the game keeps going (the scenes draw a colored rectangle instead).
// Reads: content.json. Writes: nothing. Next: TitleScene.

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // loading bar
    const bar = this.add.rectangle(480 - 200, 270, 0, 20, 0x56B4E9).setOrigin(0, 0.5);
    this.add.rectangle(480, 270, 404, 24).setStrokeStyle(2, 0xf6efe3);
    const label = this.add.text(480, 230, 'Cargando...', { fontFamily: 'monospace', fontSize: '18px', color: '#f6efe3' }).setOrigin(0.5);
    this.load.on('progress', (p) => { bar.setSize(400 * p, 20); });
    this.load.on('loaderror', (file) => { console.warn('Missing file, using a placeholder:', file.key); });

    this.load.json('content', 'content.json');
    // when content.json arrives, queue every asset it lists
    this.load.once('filecomplete-json-content', (key, type, data) => {
      for (const name of data.assets) {
        if (name.startsWith('sfx-')) this.load.audio(name, `${name}.wav`);
        else this.load.image(name, `${name}.png`);
      }
      label.setText('Cargando arte y sonidos...');
    });
  }

  create() {
    if (!this.cache.json.get('content')) {
      this.add.text(480, 300, 'No se pudo cargar content.json.\nAbre el juego con Live Server (no con doble clic).',
        { fontFamily: 'monospace', fontSize: '18px', color: '#D55E00', align: 'center' }).setOrigin(0.5);
      return;
    }
    // wait for the pixel fonts (max 1.5 s) so the first texts measure correctly
    const go = () => this.scene.start('TitleScene');
    if (document.fonts && document.fonts.load) {
      const fonts = Promise.all([document.fonts.load('16px "Pixelify Sans"'), document.fonts.load('16px "Press Start 2P"')]);
      Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(go, go);
    } else go();
  }
}
