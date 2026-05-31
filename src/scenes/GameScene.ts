import Phaser from 'phaser';

import characters from '../data/characters.json';
import enemies from '../data/enemies.json';
import { Enemy } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyMovement } from '../enemy/EnemyMovement';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';

export class GameScene extends Phaser.Scene {
  private player?: PlayerController;
  private playerHealth?: PlayerHealth;
  private enemies: Enemy[] = [];
  private enemyMovement = new EnemyMovement();

  constructor() {
    super('GameScene');
  }

  create(): void {
    const playerStats = PlayerStats.fromConfig(characters.default);
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.player = new PlayerController(this, playerStats, centerX, centerY);
    this.playerHealth = new PlayerHealth(playerStats.maxHp);

    const enemyFactory = new EnemyFactory(this, enemies);

    this.enemies = [
      enemyFactory.create('slime', centerX - 180, centerY - 120),
      enemyFactory.create('slime', centerX + 180, centerY - 120),
      enemyFactory.create('slime', centerX - 180, centerY + 120),
      enemyFactory.create('slime', centerX + 180, centerY + 120),
    ];
  }

  update(_time: number, delta: number): void {
    this.player?.update(delta);

    if (!this.player) {
      return;
    }

    for (const enemy of this.enemies) {
      this.enemyMovement.moveToward(enemy, this.player.body, delta);
    }
  }

  getPlayerHealth(): PlayerHealth | undefined {
    return this.playerHealth;
  }
}
