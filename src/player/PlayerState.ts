import { PlayerHealth } from './PlayerHealth';
import { PlayerModel } from './PlayerModel';

export interface PlayerHealthStateSnapshot {
  currentHp: number;
  maxHp: number;
  isDead: boolean;
  isInvulnerable: boolean;
  shieldStacks: number;
}

export class PlayerState {
  constructor(
    readonly model: PlayerModel,
    readonly health: PlayerHealth,
  ) {
    this.syncLifecycleFromHealth();
  }

  get isAlive(): boolean {
    return !this.health.isDead;
  }

  get isDead(): boolean {
    return this.health.isDead;
  }

  syncLifecycleFromHealth(): void {
    this.model.alive = !this.health.isDead;
  }

  getHealthSnapshot(): PlayerHealthStateSnapshot {
    return {
      currentHp: this.health.currentHp,
      maxHp: this.health.maxHp,
      isDead: this.health.isDead,
      isInvulnerable: this.health.isInvulnerable(),
      shieldStacks: this.health.getShieldStacks(),
    };
  }
}
