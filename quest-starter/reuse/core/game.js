// game.js — Phaser configuration and the list of the 11 scenes, in order (owner: P1).

import BootScene from './BootScene.js';
import TitleScene from './TitleScene.js';
import SolarMapScene from './SolarMapScene.js';
import MissionControlScene from './MissionControlScene.js';
import WorkshopScene from './WorkshopScene.js';
import TestsScene from './TestsScene.js';
import LaunchScene from './LaunchScene.js';
import JupiterScene from './JupiterScene.js';
import TransmitScene from './TransmitScene.js';
import EndingScene from './EndingScene.js';
import ReportScene from './ReportScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  pixelArt: true,
  backgroundColor: '#0d0c1c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, SolarMapScene, MissionControlScene, WorkshopScene, TestsScene,
    LaunchScene, JupiterScene, TransmitScene, EndingScene, ReportScene]
};

const game = new Phaser.Game(config);
window.game = game; // handy for debugging in the console (F12)
export default game;
