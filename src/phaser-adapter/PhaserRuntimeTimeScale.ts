import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';

export class PhaserRuntimeTimeScale {
  getConfigured(settings: PlaytestSettingsState): number {
    if (!settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }

  getEffective(
    gameplayContext: GameplayContext | undefined,
    settings: PlaytestSettingsState,
  ): number {
    return gameplayContext?.effectiveTimeScale
      ?? this.getConfigured(settings);
  }

  applyConfigured(
    scene: Phaser.Scene,
    gameplayContext: GameplayContext | undefined,
    settings: PlaytestSettingsState,
  ): void {
    this.apply(scene, gameplayContext, this.getConfigured(settings));
  }

  apply(
    scene: Phaser.Scene,
    gameplayContext: GameplayContext | undefined,
    scale: number,
  ): void {
    const safeScale = Math.max(0.1, scale);

    this.resetSceneClocks(scene);

    if (!gameplayContext) {
      return;
    }

    gameplayContext.timeScale = safeScale;
    gameplayContext.effectiveTimeScale = safeScale;
  }

  resetSceneClocks(scene: Phaser.Scene): void {
    // GameplayUpdater is the single runtime timeScale path. Phaser clocks stay
    // unscaled so managers receive one consistently scaled delta.
    scene.time.timeScale = 1;
    (scene.physics.world as unknown as { timeScale?: number }).timeScale = 1;
  }
}
