import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { MapVisibilityController } from '../world/MapVisibilityController';

export interface GameScenePostInitializeScenePort extends Phaser.Scene {
  mapVisibilityController: MapVisibilityController;
  playtestSettings: PlaytestSettingsState;
  runtimeTimeScale: PhaserRuntimeTimeScale;
}

export class GameScenePostInitializeAdapter {
  apply(scene: GameScenePostInitializeScenePort, context: GameplayContext): void {
    this.syncMapVisibilityToPlayer(scene, context);
    this.applyConfiguredRuntimeTimeScale(scene, context);
  }

  private syncMapVisibilityToPlayer(
    scene: GameScenePostInitializeScenePort,
    context: GameplayContext,
  ): void {
    scene.mapVisibilityController.update(context.player.getPositionLike());
  }

  private applyConfiguredRuntimeTimeScale(
    scene: GameScenePostInitializeScenePort,
    context: GameplayContext,
  ): void {
    scene.runtimeTimeScale.applyConfigured(scene, context, scene.playtestSettings);
  }
}
