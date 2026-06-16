import { EventBus } from '../core/EventBus';
import type { GameEventMap } from '../core/domain/GameEvents';

export class ExpManager {
  private exp = 0;
  private lifetimeExp = 0;

  constructor(private readonly eventBus: EventBus<GameEventMap>) {}

  get currentExp(): number {
    return this.exp;
  }

  get totalExp(): number {
    return this.lifetimeExp;
  }

  addExp(amount: number): void {
    const gainedExp = Math.max(0, amount);

    this.exp += gainedExp;
    this.lifetimeExp += gainedExp;
    this.eventBus.publish('ExpGained', {
      amount: gainedExp,
      currentExp: this.exp,
      totalExp: this.lifetimeExp,
    });
  }

  spendExp(amount: number): void {
    this.exp = Math.max(0, this.exp - amount);
  }
}
