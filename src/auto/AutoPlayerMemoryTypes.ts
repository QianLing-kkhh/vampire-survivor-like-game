import Phaser from 'phaser';

export interface CornerTrapInfo {
  active: boolean;
  inwardDirection: Phaser.Math.Vector2;
}

export interface MovementMemoryInfo {
  stalled: boolean;
  prolonged: boolean;
  stallMs: number;
  anchor: Phaser.Math.Vector2;
  recentDisplacement: number;
}

export interface SurroundInfo {
  surrounded: boolean;
  blockedSectors: number;
  safestDirection: Phaser.Math.Vector2;
  safestScore: number;
}

export interface KiteInfo {
  active: boolean;
  direction: Phaser.Math.Vector2;
  inwardDirection: Phaser.Math.Vector2;
  currentPressure: number;
  nearBorder: boolean;
  nearCorner: boolean;
}

export interface TerrainEscapeInfo {
  active: boolean;
  direction: Phaser.Math.Vector2;
  enemySectors: number;
  nearBorder: boolean;
  nearObstacle: boolean;
  inSlowZone: boolean;
}

export interface SegmentPointInfo {
  distance: number;
  t: number;
  point: Phaser.Math.Vector2;
}

export interface EnemyMotionSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}
