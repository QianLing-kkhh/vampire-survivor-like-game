import type { Vector2Like } from '../core/domain/Vector2';

export interface EnemyHealthSnapshot {
  currentHp: number;
  maxHp: number;
}

export interface EnemySnapshot {
  id: string;
  autoMoveId: string;
  position: Vector2Like;
  collisionRadius: number;
  health: EnemyHealthSnapshot;
  moveSpeed: number;
  damage: number;
  alive: boolean;
  bossLike: boolean;
  boss: boolean;
  elite: boolean;
  miniBoss: boolean;
  endlessBoss: boolean;
  mergeLevel: number;
}

export interface EnemyQuery {
  readonly id: string;
  readonly isDead: boolean;
  getAutoMoveId(): string;
  getPositionLike(): Vector2Like;
  getCollisionRadius(): number;
  getHealthSnapshot(): EnemyHealthSnapshot;
  getEnemySnapshot(): EnemySnapshot;
  isBossLike(): boolean;
  isBoss(): boolean;
  isElite(): boolean;
  isAlive(): boolean;
}
