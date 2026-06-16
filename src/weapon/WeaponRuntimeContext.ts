import type { PlayerQuery } from '../player/PlayerQuery';

import type { WeaponTarget } from './WeaponTarget';

export interface WeaponCharacterRuntimeView {
  getCharacterId(): string;
  getEnemySpeedMultiplierAt(x: number, y: number): number;
}

export interface ProjectilePathQuery {
  (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius?: number,
  ): boolean;
}

export interface WeaponRuntimeContext {
  player: PlayerQuery;
  enemyTargets: readonly WeaponTarget[];
  deltaMs: number;
  characterRuntime?: WeaponCharacterRuntimeView;
  isProjectilePathBlocked?: ProjectilePathQuery;
}
