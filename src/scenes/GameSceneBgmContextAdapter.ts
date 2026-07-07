import type Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import type { GameSceneBgmSyncContext } from './GameSceneBgmSynchronizer';

export interface GameSceneBgmScenePort {
  isGameOver: boolean;
  gameplayContext?: GameplayContext;
}

export class GameSceneBgmContextAdapter {
  build(scene: Phaser.Scene & GameSceneBgmScenePort): GameSceneBgmSyncContext {
    return {
      scene,
      isGameOver: scene.isGameOver,
      hasBossSpawned: scene.gameplayContext?.bossController.hasBossSpawned() === true,
    };
  }
}
