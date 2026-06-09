import type { CharacterDamageReactionType } from '../../character/CharacterDamageReactionSkill';
import type { CharacterBaseStats } from '../../character/CharacterDefinition';
import type { WeaponTag } from '../../weapon/tags/WeaponTag';

export interface StrategyPosition {
  x: number;
  y: number;
}

export interface StrategyPlayerSnapshot {
  currentHp: number;
  maxHp: number;
  level?: number;
  hitRadiusPx?: number;
  radiusPx?: number;
  moveSpeed?: number;
  pickupRangePx?: number;
  characterId?: string;
  damageReactionType?: CharacterDamageReactionType;
  baseStats?: Partial<CharacterBaseStats>;
}

export interface StrategyWeaponSnapshot {
  weaponId: string;
  baseWeaponId: string;
  level: number;
  maxLevel: number;
  tags: readonly WeaponTag[];
  radiusPx?: number;
  rangePx?: number;
}

export interface StrategyEnemySnapshot extends StrategyPosition {
  id?: string;
  vx?: number;
  vy?: number;
  radiusPx?: number;
  moveSpeed?: number;
  damage?: number;
  hpRatio?: number;
  isBoss?: boolean;
  isElite?: boolean;
  isMiniBoss?: boolean;
}

export interface StrategyPickupSnapshot extends StrategyPosition {
  exp?: number;
  effectiveDistance?: number;
  clusterScore?: number;
  dangerScore?: number;
}

export interface StrategyTreasureSnapshot extends StrategyPosition {
  effectiveDistance?: number;
  dangerScore?: number;
}

export interface StrategyObstacleSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'circle' | 'rect';
  blocksPlayer: boolean;
}

export interface StrategySlowZoneSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  shape: 'circle' | 'rect';
  playerSpeedMultiplier: number;
  enemySpeedMultiplier: number;
}

export interface StrategyPortalSnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
  target?: StrategyPosition;
  isAvailable?: boolean;
  cooldownRemainingMs?: number;
}

export interface StrategyMapSnapshot {
  obstacles: readonly StrategyObstacleSnapshot[];
  slowZones: readonly StrategySlowZoneSnapshot[];
  portals: readonly StrategyPortalSnapshot[];
}

export type StrategyBossWarningKind =
  | 'dash'
  | 'beam'
  | 'shockwave'
  | 'ring'
  | 'slowZone'
  | 'impact';

export type StrategyBossWarningDanger = 'damage' | 'slow';

export interface StrategyBossWarningMetadata {
  bossId?: string;
  skillId?: string;
  bulletCount?: number;
  angleOffset?: number;
  projectileSpeed?: number;
  bulletRadius?: number;
}

export type StrategyBossWarningSnapshot =
  | {
    shape: 'line';
    kind: StrategyBossWarningKind;
    danger: StrategyBossWarningDanger;
    start: StrategyPosition;
    end: StrategyPosition;
    width: number;
    remainingMs?: number;
  } & StrategyBossWarningMetadata
  | {
    shape: 'circle';
    kind: StrategyBossWarningKind;
    danger: StrategyBossWarningDanger;
    x: number;
    y: number;
    radius: number;
    remainingMs?: number;
  } & StrategyBossWarningMetadata;

export interface StrategyWeaponContext {
  weaponIds: readonly string[];
  garlicRadiusPx?: number;
  bibleRadiusPx?: number;
  weapons?: readonly StrategyWeaponSnapshot[];
}

export interface StrategyWorldSnapshot {
  playerPosition: StrategyPosition;
  enemyPositions: readonly (StrategyPosition | StrategyEnemySnapshot)[];
  pickupPositions: readonly (StrategyPosition | StrategyPickupSnapshot)[];
  treasurePositions?: readonly (StrategyPosition | StrategyTreasureSnapshot)[];
  pickupRangePx?: number;
  player?: StrategyPlayerSnapshot;
  weaponContext?: StrategyWeaponContext;
  map?: StrategyMapSnapshot;
  bossWarnings?: readonly StrategyBossWarningSnapshot[];
  deltaMs?: number;
  worldBounds: {
    width: number;
    height: number;
  };
}
