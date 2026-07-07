import type { LevelUpOptionsPresenter } from '../ui/LevelUpOptionsPresenter';

import type { UpgradeFlow } from './UpgradeFlow';
import type { UpgradeSelectionState } from './UpgradeSelectionState';

export interface LevelUpAutoSelectionRefreshContext {
  upgradeSelectionState: UpgradeSelectionState;
  upgradeFlow?: UpgradeFlow;
  autoUpgrade: boolean;
  levelUpOptionsPresenter: LevelUpOptionsPresenter;
}

export class LevelUpAutoSelectionRefresher {
  refresh(context: LevelUpAutoSelectionRefreshContext): void {
    if (!context.upgradeSelectionState.active) {
      return;
    }

    if (context.upgradeSelectionState.source === 'levelUp' && context.autoUpgrade) {
      const autoSelectedOption = context.upgradeFlow?.chooseAutoUpgrade(
        context.upgradeSelectionState.options,
      );

      context.levelUpOptionsPresenter.show(context.upgradeSelectionState.options, {
        optionId: autoSelectedOption?.id,
      });
      return;
    }

    context.levelUpOptionsPresenter.show(context.upgradeSelectionState.options);
  }
}
