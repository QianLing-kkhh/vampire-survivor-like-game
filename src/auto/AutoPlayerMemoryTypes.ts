import type { Vector2 } from '../core/domain/Vector2';

export interface CornerTrapInfo {
  active: boolean;
  inwardDirection: Vector2;
}

export interface MovementMemoryInfo {
  stalled: boolean;
  prolonged: boolean;
  stallMs: number;
  anchor: Vector2;
  recentDisplacement: number;
}

export interface SurroundInfo {
  surrounded: boolean;
  blockedSectors: number;
  safestDirection: Vector2;
  safestScore: number;
}

export interface KiteInfo {
  active: boolean;
  direction: Vector2;
  inwardDirection: Vector2;
  currentPressure: number;
  nearBorder: boolean;
  nearCorner: boolean;
}

export interface TerrainEscapeInfo {
  active: boolean;
  direction: Vector2;
  enemySectors: number;
  nearBorder: boolean;
  nearObstacle: boolean;
  inSlowZone: boolean;
}

export interface SegmentPointInfo {
  distance: number;
  t: number;
  point: Vector2;
}

export interface EnemyMotionSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
