import type Phaser from 'phaser';

import { PlayerHitRangeController } from '../ui/PlayerHitRangeController';

export interface GameScenePlayerHitRangeScenePort {
  player?: {
    getPositionLike(): { x: number; y: number };
  };
}

export class GameScenePlayerHitRangeAdapter {
  private readonly playerHitRangeController: PlayerHitRangeController;

  constructor(scene: Phaser.Scene, radiusPx: number) {
    this.playerHitRangeController = new PlayerHitRangeController(scene, radiusPx);
  }

  create(position: { x: number; y: number }): void {
    this.playerHitRangeController.create(position);
  }

  update(scene: GameScenePlayerHitRangeScenePort): void {
    this.playerHitRangeController.update(scene.player?.getPositionLike());
  }

  destroy(): void {
    this.playerHitRangeController.destroy();
  }
}
