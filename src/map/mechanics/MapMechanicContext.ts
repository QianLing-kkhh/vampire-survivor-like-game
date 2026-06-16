import Phaser from 'phaser';

import { Enemy } from '../../enemy/Enemy';
import { PlayerController } from '../../player/PlayerController';
import { PlayerHealth } from '../../player/PlayerHealth';
import { FloatingTextManager } from '../../ui/FloatingTextManager';

export interface MapMechanicContext {
  scene: Phaser.Scene;
  player: PlayerController;
  playerHealth?: PlayerHealth;
  enemies: Enemy[];
  worldWidth: number;
  worldHeight: number;
  floatingTextManager?: FloatingTextManager;
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
