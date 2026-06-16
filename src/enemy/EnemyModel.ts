import { Vector2, type Vector2Like } from '../core/domain/Vector2';

export interface EnemyModelConfig {
  id: string;
  position: Vector2Like;
  collisionRadius: number;
  maxHp: number;
  currentHp: number;
  alive?: boolean;
  bossLike?: boolean;
  mergeLevel?: number;
}

export class EnemyModel {
  readonly id: string;
  readonly position: Vector2;
  readonly velocity = new Vector2();
  collisionRadius: number;
  maxHp: number;
  currentHp: number;
  alive: boolean;
  bossLike: boolean;
  mergeLevel: number;

  constructor(config: EnemyModelConfig) {
    this.id = config.id;
    this.position = Vector2.from(config.position);
    this.collisionRadius = Math.max(0, config.collisionRadius);
    this.maxHp = Math.max(0, config.maxHp);
    this.currentHp = Math.max(0, config.currentHp);
    this.alive = config.alive ?? this.currentHp > 0;
    this.bossLike = config.bossLike ?? false;
    this.mergeLevel = Math.max(1, Math.floor(config.mergeLevel ?? 1));
  }

  syncPosition(position: Vector2Like): void {
    this.position.copy(position);
  }

  syncCollisionRadius(radius: number): void {
    this.collisionRadius = Math.max(0, radius);
  }
}
