import type { TreasureRewardResult } from '../progression/UpgradeFlow';
import type { FloatingTextManager } from './FloatingTextManager';
import type { PlayerFeedbackPosition } from './PlayerFeedbackController';

export class TreasureRewardFeedbackController {
  private floatingTextManager?: FloatingTextManager;

  setFloatingTextManager(floatingTextManager?: FloatingTextManager): void {
    this.floatingTextManager = floatingTextManager;
  }

  show(position: PlayerFeedbackPosition | undefined, result: TreasureRewardResult): void {
    if (!position || !this.floatingTextManager || result.type === 'none' || result.type === 'pending') {
      return;
    }

    if (result.appliedUpgrade) {
      this.floatingTextManager.showChestUpgrade(
        position.x,
        position.y,
        {
          name: result.appliedUpgrade.targetName,
          iconFallback: result.appliedUpgrade.iconFallback,
          beforeLevel: result.appliedUpgrade.beforeLevel,
          afterLevel: result.appliedUpgrade.afterLevel,
          maxLevel: result.appliedUpgrade.maxLevel,
          isMax: result.appliedUpgrade.isMax,
          kind: result.appliedUpgrade.kind,
        },
      );
    }

    if (result.evolutionDetail) {
      this.floatingTextManager.showChestUpgrade(
        position.x,
        position.y,
        {
          name: result.evolutionDetail.baseName,
          evolvedName: result.evolutionDetail.evolvedName,
          iconFallback: result.evolutionDetail.iconFallback,
          kind: 'evolution',
        },
      );
    }
  }

  clear(): void {
    this.floatingTextManager = undefined;
  }
}
