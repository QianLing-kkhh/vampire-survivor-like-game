import {
  LevelUpAutoSelectionRefresher,
} from '../progression/LevelUpAutoSelectionRefresher';
import type { UpgradeFlow } from '../progression/UpgradeFlow';
import type { UpgradeSelectionState } from '../progression/UpgradeSelectionState';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { LevelUpOptionsPresenter } from '../ui/LevelUpOptionsPresenter';

export interface GameSceneLevelUpAutoSelectionScenePort {
  upgradeSelectionState: UpgradeSelectionState;
  upgradeFlow?: UpgradeFlow;
  playtestSettings: PlaytestSettingsState;
  levelUpOptionsPresenter: LevelUpOptionsPresenter;
}

export class GameSceneLevelUpAutoSelectionAdapter {
  private readonly levelUpAutoSelectionRefresher = new LevelUpAutoSelectionRefresher();

  refresh(scene: GameSceneLevelUpAutoSelectionScenePort): void {
    this.levelUpAutoSelectionRefresher.refresh({
      upgradeSelectionState: scene.upgradeSelectionState,
      upgradeFlow: scene.upgradeFlow,
      autoUpgrade: scene.playtestSettings.autoUpgrade,
      levelUpOptionsPresenter: scene.levelUpOptionsPresenter,
    });
  }
}
