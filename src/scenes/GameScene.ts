import Phaser from 'phaser';

import characters from '../data/characters.json';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';

export class GameScene extends Phaser.Scene {
  private player?: PlayerController;
  private playerHealth?: PlayerHealth;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const playerStats = PlayerStats.fromConfig(characters.default);
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.player = new PlayerController(this, playerStats, centerX, centerY);
    this.playerHealth = new PlayerHealth(playerStats.maxHp);
  }

  update(_time: number, delta: number): void {
    this.player?.update(delta);
  }

  getPlayerHealth(): PlayerHealth | undefined {
    return this.playerHealth;
  }
}
