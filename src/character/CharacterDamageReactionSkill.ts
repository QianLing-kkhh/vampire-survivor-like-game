import Phaser from 'phaser';

import { DamageCalculator } from '../combat/DamageCalculator';
import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';

export type CharacterDamageReactionType =
  | 'shockwave'
  | 'blinkForward'
  | 'slowTrail'
  | 'holySanctuary'
  | 'gainShield'
  | 'none';

export interface CharacterDamageReactionConfig {
  type: CharacterDamageReactionType;
  cooldownMs?: number;
  damage?: number;
  radius?: number;
  knockbackDistance?: number;
  blinkDistance?: number;
  invulnerableMs?: number;
  moveSpeedMultiplier?: number;
  speedBuffMs?: number;
  trailDurationMs?: number;
  tickIntervalMs?: number;
  zoneRadius?: number;
  zoneDurationMs?: number;
  enemySpeedMultiplier?: number;
}

export interface CharacterDamageReactionContext {
  scene: Phaser.Scene;
  player: PlayerController;
  playerHealth: PlayerHealth;
  enemies: Enemy[];
  damageCalculator: DamageCalculator;
  worldWidth: number;
  worldHeight: number;
  nowMs: number;
}

export interface CharacterDamageReactionSkill {
  readonly type: CharacterDamageReactionType;
  tryTrigger(context: CharacterDamageReactionContext): boolean;
  isInvulnerable(nowMs: number): boolean;
}

export class NoneCharacterDamageReactionSkill implements CharacterDamageReactionSkill {
  readonly type = 'none';

  tryTrigger(): boolean {
    return false;
  }

  isInvulnerable(): boolean {
    return false;
  }
}

abstract class BaseCharacterDamageReactionSkill implements CharacterDamageReactionSkill {
  private nextReadyAtMs = 0;
  protected invulnerableUntilMs = 0;

  abstract readonly type: CharacterDamageReactionType;

  constructor(protected readonly config: CharacterDamageReactionConfig) {}

  tryTrigger(context: CharacterDamageReactionContext): boolean {
    if (this.isInvulnerable(context.nowMs) || context.nowMs < this.nextReadyAtMs) {
      return false;
    }

    const triggered = this.activate(context);

    if (triggered) {
      this.nextReadyAtMs = context.nowMs + Math.max(0, this.config.cooldownMs ?? 0);
    }

    return triggered;
  }

  isInvulnerable(nowMs: number): boolean {
    return nowMs < this.invulnerableUntilMs;
  }

  protected abstract activate(context: CharacterDamageReactionContext): boolean;

  protected getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }
}

export class ShockwaveDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  readonly type = 'shockwave';

  protected activate(context: CharacterDamageReactionContext): boolean {
    const radius = Math.max(0, this.config.radius ?? 0);
    const feedback = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      radius,
      0x60a5fa,
      0.18,
    );

    feedback.setStrokeStyle(2, 0xbfdbfe, 0.8);
    feedback.setDepth(25);
    context.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 180,
      onComplete: () => {
        feedback.destroy();
      },
    });

    const hitResult = context.damageCalculator.calculateDamage(this.config.damage ?? 0);

    for (const enemy of context.enemies) {
      if (
        enemy.isDead
        || Phaser.Math.Distance.Between(
          context.player.body.x,
          context.player.body.y,
          enemy.body.x,
          enemy.body.y,
        ) > radius
      ) {
        continue;
      }

      enemy.takeDamage(hitResult);

      if (enemy.isDead) {
        enemy.destroy();
        continue;
      }

      this.knockEnemyBack(enemy, context);
    }

    return true;
  }

  private knockEnemyBack(enemy: Enemy, context: CharacterDamageReactionContext): void {
    const direction = new Phaser.Math.Vector2(
      enemy.body.x - context.player.body.x,
      enemy.body.y - context.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(Math.max(0, this.config.knockbackDistance ?? 0));

    const enemyRadius = this.getEnemyRadius(enemy);
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + direction.x,
      enemyRadius,
      context.worldWidth - enemyRadius,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + direction.y,
      enemyRadius,
      context.worldHeight - enemyRadius,
    );
  }
}

export class BlinkForwardDamageReactionSkill extends BaseCharacterDamageReactionSkill {
  readonly type = 'blinkForward';

  protected activate(context: CharacterDamageReactionContext): boolean {
    const direction = context.player.getLastFacingDirection();
    const blinkDistance = Math.max(0, this.config.blinkDistance ?? 0);
    const invulnerableMs = Math.max(0, this.config.invulnerableMs ?? 0);
    const speedMultiplier = Math.max(0.1, this.config.moveSpeedMultiplier ?? 1);
    const speedBuffMs = Math.max(0, this.config.speedBuffMs ?? 0);

    context.player.applyExternalDisplacement(direction.scale(blinkDistance));
    context.playerHealth.setInvulnerable(invulnerableMs);
    context.player.setTemporaryMoveSpeedMultiplier(speedMultiplier, speedBuffMs);
    this.invulnerableUntilMs = context.nowMs + invulnerableMs;
    this.showBlinkFeedback(context);
    return true;
  }

  private showBlinkFeedback(context: CharacterDamageReactionContext): void {
    const flash = context.scene.add.circle(
      context.player.body.x,
      context.player.body.y,
      22,
      0x93c5fd,
      0.28,
    );

    flash.setStrokeStyle(1, 0xdbeafe, 0.75);
    flash.setDepth(25);
    context.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.7,
      scaleY: 1.7,
      duration: 160,
      onComplete: () => {
        flash.destroy();
      },
    });
  }
}
