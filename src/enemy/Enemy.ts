import Phaser from 'phaser';

export interface EnemyStats {
  hp: number;
  moveSpeed: number;
  damage: number;
  exp: number;
}

export class Enemy {
  readonly body: Phaser.GameObjects.Arc;
  readonly maxHp: number;
  readonly moveSpeed: number;
  readonly damage: number;
  readonly exp: number;

  currentHp: number;

  constructor(
    scene: Phaser.Scene,
    readonly id: string,
    stats: EnemyStats,
    x: number,
    y: number,
  ) {
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.moveSpeed = stats.moveSpeed;
    this.damage = stats.damage;
    this.exp = stats.exp;
    this.body = scene.add.circle(x, y, 12, 0xef4444);
  }
}
