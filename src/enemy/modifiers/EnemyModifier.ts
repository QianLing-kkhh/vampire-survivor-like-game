import Phaser from 'phaser';

import { HitResult } from '../../combat/HitResult';
import { Enemy, EnemyStats } from '../Enemy';

import { EnemyModifierType } from './EnemyModifierConfig';

export interface EnemyModifierDamageContext {
  enemy: Enemy;
  hitResult: HitResult;
  damage: number;
}

export interface EnemyModifierDamageResult {
  damage: number;
  absorbed?: number;
}

export interface EnemyModifierAfterDamageContext {
  enemy: Enemy;
  hitResult: HitResult;
  incomingDamage: number;
  actualDamage: number;
  absorbedDamage: number;
}

export interface EnemyModifierDeathContext {
  enemy: Enemy;
  scene: Phaser.Scene;
  spawnEnemy?(enemyId: string, x: number, y: number): Enemy | null;
}

export interface EnemyModifierUpdateContext {
  enemy: Enemy;
}

export interface EnemyModifier {
  readonly type: EnemyModifierType;

  applyStats?(stats: EnemyStats): EnemyStats;
  onAttach?(enemy: Enemy): void;
  beforeTakeDamage?(context: EnemyModifierDamageContext): EnemyModifierDamageResult;
  afterTakeDamage?(context: EnemyModifierAfterDamageContext): void;
  onDeath?(context: EnemyModifierDeathContext): void;
  update?(deltaMs: number, context: EnemyModifierUpdateContext): void;
  getDisplayTags?(): string[];
}
