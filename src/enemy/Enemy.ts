import Phaser from 'phaser';

import { HitResult } from '../combat/HitResult';
import { EventBus } from '../core/EventBus';

export interface EnemyStats {
  hp: number;
  moveSpeed: number;
  damage: number;
  exp: number;
  scale?: number;
}

export interface EnemyKilledEvent {
  x: number;
  y: number;
  exp: number;
  enemyId?: string;
  isBoss?: boolean;
}

export interface ExpGainedEvent {
  amount: number;
  currentExp: number;
  totalExp: number;
}

export interface LevelUpEvent {
  previousLevel: number;
  currentLevel: number;
  requiredExp: number;
}

export type GameEventMap = Record<string, unknown> & {
  EnemyKilled: EnemyKilledEvent;
  ExpGained: ExpGainedEvent;
  LevelUp: LevelUpEvent;
};

export function isEnemyKilledEvent(value: unknown): value is EnemyKilledEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<EnemyKilledEvent>;

  return (
    typeof event.x === 'number'
    && typeof event.y === 'number'
    && typeof event.exp === 'number'
  );
}

export function isExpGainedEvent(value: unknown): value is ExpGainedEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<ExpGainedEvent>;

  return (
    typeof event.amount === 'number'
    && typeof event.currentExp === 'number'
    && typeof event.totalExp === 'number'
  );
}

export function isLevelUpEvent(value: unknown): value is LevelUpEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<LevelUpEvent>;

  return (
    typeof event.previousLevel === 'number'
    && typeof event.currentLevel === 'number'
    && typeof event.requiredExp === 'number'
  );
}

export class Enemy {
  readonly body: Phaser.GameObjects.Arc;
  readonly maxHp: number;
  readonly moveSpeed: number;
  readonly damage: number;
  readonly exp: number;
  readonly scale: number;

  currentHp: number;
  isDead = false;
  private eventBus?: EventBus<GameEventMap>;
  private baseScaleX = 1;
  private baseScaleY = 1;
  private baseScaleBody?: Phaser.GameObjects.GameObject;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    stats: EnemyStats,
    x: number,
    y: number,
  ) {
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.moveSpeed = stats.moveSpeed;
    this.damage = stats.damage;
    this.exp = stats.exp;
    this.scale = stats.scale ?? 1;
    this.body = scene.add.circle(x, y, 12 * this.scale, 0xef4444);
    this.captureBaseScale(this.body);
  }

  setEventBus(eventBus: EventBus<GameEventMap>): void {
    this.eventBus = eventBus;
  }

  takeDamage(hitResult: HitResult): number {
    if (this.isDead) {
      return 0;
    }

    const actualDamage = Math.min(this.currentHp, Math.max(0, hitResult.damage));

    this.currentHp -= actualDamage;
    console.log(
      `Enemy hit: ${this.id} HP ${Math.max(0, this.currentHp)} / ${this.maxHp}`,
    );

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.isDead = true;
      this.publishKilled();
      return actualDamage;
    }

    this.playHitFeedback();
    return actualDamage;
  }

  destroy(): void {
    this.body.destroy();
  }

  private playHitFeedback(): void {
    const body = this.body as Phaser.GameObjects.GameObject & {
      active: boolean;
      alpha: number;
      scaleX: number;
      scaleY: number;
      setAlpha?: (value: number) => void;
      setFillStyle?: (color: number) => void;
      setScale?: (x: number, y?: number) => void;
      setTint?: (color: number) => void;
      clearTint?: () => void;
    };

    this.captureBaseScale(body);
    body.setScale?.(this.baseScaleX, this.baseScaleY);
    body.setFillStyle?.(0xffffff);
    body.setTint?.(0xffffff);
    body.setAlpha?.(0.65);

    this.scene.tweens.add({
      targets: body,
      duration: 90,
      alpha: 1,
      onComplete: () => {
        if (!body.active || this.isDead) {
          return;
        }

        body.clearTint?.();
        body.setFillStyle?.(0xef4444);
        body.setScale?.(this.baseScaleX, this.baseScaleY);
      },
    });
  }

  private captureBaseScale(
    body: Phaser.GameObjects.GameObject & { scaleX?: number; scaleY?: number },
  ): void {
    if (this.baseScaleBody === body) {
      return;
    }

    this.baseScaleBody = body;
    this.baseScaleX = body.scaleX ?? 1;
    this.baseScaleY = body.scaleY ?? 1;
  }

  private publishKilled(): void {
    this.eventBus?.publish('EnemyKilled', {
      x: this.body.x,
      y: this.body.y,
      exp: this.exp,
      enemyId: this.id,
      isBoss: this.id.endsWith('_boss') || this.id === 'boss',
    });
  }
}
