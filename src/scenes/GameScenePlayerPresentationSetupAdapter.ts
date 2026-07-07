import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';

const CAMERA_FOLLOW_LERP = 0.08;

export interface GameScenePlayerPresentationSetupScenePort extends Phaser.Scene {
  orientationOverlayController: { create(): void };
  playerHitRangeAdapter: { create(position: { x: number; y: number }): void };
  shouldVirtualJoystickBeActive(): boolean;
}

export class GameScenePlayerPresentationSetupAdapter {
  setup(
    scene: GameScenePlayerPresentationSetupScenePort,
    context: GameplayContext,
  ): void {
    context.virtualJoystick.setGameplayActive(scene.shouldVirtualJoystickBeActive());
    scene.orientationOverlayController.create();
    scene.playerHitRangeAdapter.create(context.player.getPositionLike());
    scene.cameras.main.startFollow(
      context.player.body,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP,
    );
  }
}
