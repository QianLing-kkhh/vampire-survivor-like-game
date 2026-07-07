import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import type { FloatingTextManager } from './FloatingTextManager';

export interface PlayerFeedbackPosition {
  x: number;
  y: number;
}

export class PlayerFeedbackController {
  private floatingTextManager?: FloatingTextManager;

  constructor(private readonly scene: Phaser.Scene) {}

  setFloatingTextManager(floatingTextManager?: FloatingTextManager): void {
    this.floatingTextManager = floatingTextManager;
  }

  showHeal(position: PlayerFeedbackPosition | undefined, amount: number): void {
    if (!position || amount <= 0) {
      return;
    }

    this.floatingTextManager?.showPlayerHeal(position.x, position.y, amount);
  }

  showDamage(
    position: PlayerFeedbackPosition | undefined,
    damage: number,
    showDamageNumbers: boolean,
  ): void {
    if (damage <= 0) {
      return;
    }

    AudioManager.playSfx(this.scene, 'player_hit');

    if (!position || !showDamageNumbers) {
      return;
    }

    this.floatingTextManager?.showPlayerDamage(position.x, position.y, damage);
  }

  clear(): void {
    this.floatingTextManager = undefined;
  }
}
