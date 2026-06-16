import type { EnemyKilledEvent } from '../core/domain/EnemyTypes';
import type { Vector2Like } from '../core/domain/Vector2';

export interface EnemyDropRequest {
  kind: 'exp';
  position: Vector2Like;
  exp: number;
}

export interface EnemyDeathResult {
  enemyKilledEvent: EnemyKilledEvent;
  drops: EnemyDropRequest[];
}

export interface EnemyDeathInput {
  position: Vector2Like;
  exp: number;
  mergeLevel?: number;
  enemyId?: string;
  isBoss?: boolean;
  isBossLike?: boolean;
}

export function createEnemyDeathResult(input: EnemyDeathInput): EnemyDeathResult {
  const enemyKilledEvent: EnemyKilledEvent = {
    x: input.position.x,
    y: input.position.y,
    exp: input.exp,
    mergeLevel: input.mergeLevel,
    enemyId: input.enemyId,
    isBoss: input.isBoss,
    isBossLike: input.isBossLike,
  };

  return {
    enemyKilledEvent,
    drops: input.exp > 0
      ? [{
        kind: 'exp',
        position: input.position,
        exp: input.exp,
      }]
      : [],
  };
}
