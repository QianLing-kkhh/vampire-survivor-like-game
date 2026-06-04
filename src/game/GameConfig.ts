import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { StageSelectScene } from '../scenes/StageSelectScene';
import { CustomStageToolScene } from '../scenes/CustomStageToolScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { ResultScene } from '../scenes/ResultScene';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: globalThis.innerWidth || 1280,
  height: globalThis.innerHeight || 720,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: globalThis.innerWidth || 1280,
    height: globalThis.innerHeight || 720
  },
  backgroundColor: '#101018',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, TitleScene, CharacterSelectScene, StageSelectScene, CustomStageToolScene, GameScene, UIScene, ResultScene]
};
