import Phaser from 'phaser';

import { Enemy } from '../../enemy/Enemy';
import { PlayerController } from '../../player/PlayerController';

export interface MapMechanicContext {
  scene: Phaser.Scene;
  player: PlayerController;
  enemies: Enemy[];
  worldWidth: number;
  worldHeight: number;
}

export interface MapMechanicEntity {
  body: {
    x: number;
    y: number;
    radius?: number;
  };
  id?: string;
  bossLike?: boolean;
}
