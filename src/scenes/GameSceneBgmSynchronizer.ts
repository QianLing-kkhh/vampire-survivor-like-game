import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';

export interface GameSceneBgmSyncContext {
  scene: Phaser.Scene;
  isGameOver: boolean;
  hasBossSpawned: boolean;
}

export class GameSceneBgmSynchronizer {
  playGameplayBgm(scene: Phaser.Scene): void {
    AudioManager.playBgm(scene, 'gameplay_bgm');
  }

  syncCurrent(context: GameSceneBgmSyncContext): void {
    if (context.isGameOver || !AudioManager.isAudioEnabled()) {
      return;
    }

    if (AudioManager.getChannelVolume('bgm') <= 0) {
      return;
    }

    if (context.hasBossSpawned) {
      AudioManager.playBgm(context.scene, 'boss_bgm');
      return;
    }

    AudioManager.playBgm(context.scene, 'gameplay_bgm');
  }
}
