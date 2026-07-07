import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import type { RenderEventPort } from '../core/ports/RenderEventPort';

export interface EnemyDamageFeedbackPayload {
  x: number;
  y: number;
  damage: number;
  isBoss?: boolean;
}

export interface EnemyDamageFeedbackOptions {
  showDamageNumbers: boolean;
  autoMode: boolean;
}

export class EnemyDamageFeedbackController {
  private renderEventPort?: RenderEventPort;

  constructor(private readonly scene: Phaser.Scene) {}

  setRenderEventPort(renderEventPort?: RenderEventPort): void {
    this.renderEventPort = renderEventPort;
  }

  show(payload: EnemyDamageFeedbackPayload, options: EnemyDamageFeedbackOptions): void {
    if (payload.damage <= 0) {
      return;
    }

    if (options.showDamageNumbers) {
      this.renderEventPort?.showFloatingText({
        text: Math.ceil(payload.damage).toString(),
        position: {
          x: payload.x,
          y: payload.y,
        },
        metadata: {
          kind: 'enemyDamage',
          damage: payload.damage,
          isBoss: payload.isBoss === true,
        },
      });
    }

    AudioManager.playSfx(this.scene, 'enemy_hit', {
      autoMode: options.autoMode,
    });
  }

  clear(): void {
    this.renderEventPort = undefined;
  }
}
