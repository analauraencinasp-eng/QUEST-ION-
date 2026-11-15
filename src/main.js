// main.js — Phaser configuration (1280×720 like the Figma frames, pixel art, FIT + centered)
// and the list of scenes. One scene per group of Figma screens.
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import RoleScene from './scenes/RoleScene.js';
import StoryScene from './scenes/StoryScene.js';
import DestinationScene from './scenes/DestinationScene.js';
import NextUpScene from './scenes/NextUpScene.js';
import ObjectiveScene from './scenes/ObjectiveScene.js';
import SummaryScene from './scenes/SummaryScene.js';
import BriefingScene from './scenes/BriefingScene.js';
import WorkshopScene from './minigames/WorkshopScene.js';
import StationScene from './scenes/StationScene.js';
import WarehouseScene from './minigames/WarehouseScene.js';
import InstrumentScene from './scenes/InstrumentScene.js';
import AssemblyScene from './minigames/AssemblyScene.js';
import AssemblyResultsScene from './scenes/AssemblyResultsScene.js';
import OrbitScene from './minigames/OrbitScene.js';
import LaunchReadyScene from './scenes/LaunchReadyScene.js';
import MeteorScene from './minigames/MeteorScene.js';
import SlidesScene from './scenes/SlidesScene.js';
import QuizGateScene from './scenes/QuizGateScene.js';
import RockHunterScene from './minigames/RockHunterScene.js';
import CommsScene from './minigames/CommsScene.js';
import TalkScene from './scenes/TalkScene.js';
import SignalRunScene from './minigames/SignalRunScene.js';
import DashboardScene from './scenes/DashboardScene.js';
import StageDetailScene from './scenes/StageDetailScene.js';
import ReviewIntroScene from './scenes/ReviewIntroScene.js';
import ReviewFormatScene from './scenes/ReviewFormatScene.js';
import ReviewScene from './scenes/ReviewScene.js';
import ReviewCheckScene from './scenes/ReviewCheckScene.js';
import ReviewResultsScene from './scenes/ReviewResultsScene.js';
import ReviewReportScene from './scenes/ReviewReportScene.js';

export const SCENES = [BootScene, TitleScene, RoleScene, StoryScene, DestinationScene, NextUpScene, ObjectiveScene,
  SummaryScene, BriefingScene, WorkshopScene, StationScene, WarehouseScene, InstrumentScene, AssemblyScene,
  AssemblyResultsScene, OrbitScene, LaunchReadyScene, MeteorScene, SlidesScene, QuizGateScene, RockHunterScene,
  CommsScene, TalkScene, SignalRunScene, DashboardScene, StageDetailScene,
  ReviewIntroScene, ReviewFormatScene, ReviewScene, ReviewCheckScene, ReviewResultsScene, ReviewReportScene];

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  pixelArt: true,
  backgroundColor: '#0b0f26',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: true, mouse: true, touch: false },
  scene: SCENES
};

const game = new Phaser.Game(config);
window.game = game;   // handy for debugging (F12)
export default game;
