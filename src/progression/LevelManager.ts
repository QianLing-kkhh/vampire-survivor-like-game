import { EventBus } from '../core/EventBus';
import { GameEventMap, isExpGainedEvent } from '../enemy/Enemy';
import { ExpManager } from './ExpManager';

export class LevelManager {
  private level = 1;
  private requiredExpMultiplier = 1;

  constructor(
    private readonly expManager: ExpManager,
    private readonly eventBus: EventBus<GameEventMap>,
  ) {
    this.eventBus.subscribe('ExpGained', (event) => {
      if (!isExpGainedEvent(event)) {
        return;
      }

      this.checkLevelUp();
    });
  }

  get currentLevel(): number {
    return this.level;
  }

  get requiredExp(): number {
    return Math.ceil(this.level * 5 * this.requiredExpMultiplier);
  }

  setRequiredExpMultiplier(multiplier: number): void {
    this.requiredExpMultiplier = Math.max(1, multiplier);
  }

  getRequiredExpMultiplier(): number {
    return this.requiredExpMultiplier;
  }

  checkLevelUp(): boolean {
    let leveledUp = false;

    while (this.expManager.currentExp >= this.requiredExp) {
      const previousLevel = this.level;
      const spentExp = this.requiredExp;

      this.expManager.spendExp(spentExp);
      this.level += 1;
      leveledUp = true;

      this.eventBus.publish('LevelUp', {
        previousLevel,
        currentLevel: this.level,
        requiredExp: this.requiredExp,
      });
    }

    return leveledUp;
  }
}
