// Screen 1 · Title (+ 1b Settings via ☰). Solar-system background, mode toggle 1 PLAYER / 4 PLAYERS
// above START, ☰ top-right, ? bottom-left. CONTINUE appears if there is a saved mission;
// NEW GAME erases it (settings are kept).
import { C, S } from '../ui/theme.js';
import { fresh, txt, pxButton, bg } from '../ui/widgets.js';
import { setup, confirmBox } from '../ui/chrome.js';
import { t } from '../content.js';
import { state, resetMission, logEvent } from '../state.js';
import { hasSave, loadGame, clearGame, saveGame } from '../save.js';
import { go, restoreHistory, resetHistory, replace } from '../router.js';
import { say, sayHover, describeItem } from '../a11y.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(data) {
    fresh(this);
    bg(this, 'bg-solar');
    // Title block (Figma frame "Title" 280,60 720x162)
    const g = this.add.graphics();
    g.fillStyle(C.gold, 1); g.fillRect(330, 60, 620, 6); g.fillRect(330, 176, 620, 6);
    txt(this, 640, 122, t('title.name'), { font: 'title', size: 66, color: S.gold, origin: 0.5, shadow: 5 });
    txt(this, 640, 210, t('title.subtitle'), { font: 'title', size: 20, color: S.cyan, origin: 0.5 });

    // Main menu (Figma 394,440 492x234)
    txt(this, 640, 452, t('title.chooseMode'), { size: 24, origin: 0.5 });
    this.mode = state.mission.mode || '1p';
    this.b1 = pxButton(this, 394, 496, 222, 56, t('title.p1'), () => this.setMode('1p'), { size: 16 });
    this.b4 = pxButton(this, 642, 496, 244, 56, t('title.p4'), () => this.setMode('4p'), { size: 16 });
    this.setMode(this.mode, true);

    this.saved = hasSave() && !(data && data.returnTo);
    const startLabel = this.saved ? t('title.continue') : t('title.start');
    this.startText = txt(this, 640, 600, startLabel, { font: 'title', size: 40, origin: 0.5, shadow: 4 });
    this.startText._a11yRole = 'button'; this.startText._a11yInteractive = true;
    this.startText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.start());
    this.startText.on('pointerover', () => sayHover(describeItem(this.saved ? 'Continue your saved mission' : 'Start a new mission', 'button', 'Shortcut: Enter.')));
    this.tweens.add({ targets: this.startText, alpha: 0.25, duration: 520, yoyo: true, repeat: -1, ease: 'Stepped' });
    if (this.saved) pxButton(this, 1000, 574, 220, 52, t('title.newGame'), () => this.newGame(), { size: 13 });
    txt(this, 640, 662, t('title.press'), { size: 20, origin: 0.5, color: S.muted });
    txt(this, 640, 700, t('title.footer'), { size: 18, origin: 0.5, color: S.muted });

    this.onKey = (k) => {
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd') { this.setMode(this.mode === '1p' ? '4p' : '1p'); return true; }
      if (k === 'Enter' || k === ' ') { this.start(); return true; }
      return false;
    };
    setup(this, data, { help: 'TitleScene', mission: false });   // the narrator reads the whole screen (router)
  }

  setMode(mode, silent) {
    this.mode = mode;
    this.b1.setPrimary(mode === '1p');
    this.b4.setPrimary(mode === '4p');
    if (!silent) say(mode === '4p' ? t('title.p4note') : t('title.p1'));
  }

  start() {
    if (this.routeData && this.routeData.returnTo) {       // "✎ change" from the summary: only the mode changes
      state.mission.mode = this.mode;
      logEvent(`Mode changed to ${this.mode === '4p' ? '4 PLAYERS' : '1 PLAYER'}.`, 'title');
      go(this, this.mode === '4p' && !Object.keys(state.mission.roles4 || {}).length ? 'RoleScene' : this.routeData.returnTo, { returnTo: this.routeData.returnTo });
      return;
    }
    if (this.saved) {
      // CONTINUE: go back INTO the saved mission (never to this same title screen)
      if (loadGame() && state.screen && state.screen.key && state.screen.key !== 'TitleScene' && this.scene.manager.keys[state.screen.key]) {
        restoreHistory();
        if (this.mode !== state.mission.mode) { state.mission.mode = this.mode; logEvent(`Mode changed to ${this.mode === '4p' ? '4 PLAYERS' : '1 PLAYER'}.`, 'title'); }
        const target = state.mission.role || state.screen.key === 'RoleScene' ? state.screen : { key: 'RoleScene', data: {} };
        replace(this, target.key, target.data || {}, { transition: 'dither' });
        return;
      }
    }
    resetMission();
    resetHistory();
    state.mission.mode = this.mode;
    logEvent(`New mission started in ${this.mode === '4p' ? '4 PLAYERS' : '1 PLAYER'} mode.`, 'title');
    saveGame();
    go(this, 'RoleScene', {}, { transition: 'dither' });
  }

  newGame() {
    confirmBox(this, t('title.newConfirm'), () => {
      clearGame();
      this.saved = false;
      this.scene.restart();
    }, { yes: t('title.newGame') });
  }
}
