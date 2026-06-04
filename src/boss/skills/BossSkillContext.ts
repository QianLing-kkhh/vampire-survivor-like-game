import Phaser from 'phaser';

import { AudioEventKey } from '../../audio/AudioManager';
import { Enemy } from '../../enemy/Enemy';
import { EnemyFactory } from '../../enemy/EnemyFactory';
import { EnemyFlow, PlayerDamageResult } from '../../enemy/EnemyFlow';
import { RunState } from '../../run/RunState';

export interface BossSkillContext {
  scene: Phaser.Scene;
  boss: Enemy;
  enemies: Enemy[];
  enemyFactory: EnemyFactory;
  enemyFlow: EnemyFlow;
  runState: RunState;

  getPlayerPosition(): Phaser.Math.Vector2;
  getPlayerBody(): { x: number; y: number };
  getGameTimeSeconds(): number;
  getWorldSize(): { width: number; height: number };
  getEndlessTimeSeconds(): number;

  applyPlayerDamage(source: string, damage: number, options?: {
    knockbackDirection?: Phaser.Math.Vector2;
    knockbackDistance?: number;
    isBossSkill?: boolean;
  }): PlayerDamageResult;

  spawnEnemy(enemyId: string, x: number, y: number, options?: {
    useEndlessScaling?: boolean;
  }): Enemy | null;

  addPlayerSlowZone?(zone: {
    x: number;
    y: number;
    radius: number;
    durationMs: number;
    playerSpeedMultiplier: number;
    visual: Phaser.GameObjects.Arc;
  }): void;

  playSfx?(key: AudioEventKey): void;
}
