import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { TitlePreloadScene } from '../scenes/TitlePreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { StageSelectScene } from '../scenes/StageSelectScene';
import { CustomStageToolScene } from '../scenes/CustomStageToolScene';
import { CustomStageEditorLiteScene } from '../scenes/CustomStageEditorLiteScene';
import { RecordsScene } from '../scenes/RecordsScene';
import { ReplayToolScene } from '../scenes/ReplayToolScene';
import { DailyChallengeScene } from '../scenes/DailyChallengeScene';
import { StrategyEditorScene } from '../scenes/StrategyEditorScene';
import { RunPreloadScene } from '../scenes/RunPreloadScene';
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
  scene: [BootScene, TitlePreloadScene, TitleScene, CharacterSelectScene, StageSelectScene, CustomStageToolScene, CustomStageEditorLiteScene, RecordsScene, ReplayToolScene, DailyChallengeScene, StrategyEditorScene, RunPreloadScene, GameScene, UIScene, ResultScene]
};
