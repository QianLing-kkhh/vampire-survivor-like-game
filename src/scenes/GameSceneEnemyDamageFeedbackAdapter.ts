import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import type {
  EnemyDamageFeedbackController,
  EnemyDamageFeedbackPayload,
} from '../ui/EnemyDamageFeedbackController';

export interface GameSceneEnemyDamageFeedbackScenePort {
  playtestSettings: PlaytestSettingsState;
  enemyDamageFeedbackController: EnemyDamageFeedbackController;
}

export class GameSceneEnemyDamageFeedbackAdapter {
  show(
    scene: GameSceneEnemyDamageFeedbackScenePort,
    payload: EnemyDamageFeedbackPayload,
  ): void {
    scene.enemyDamageFeedbackController.show(payload, {
      showDamageNumbers: SettingsManager.getGameplay().showDamageNumbers,
      autoMode: scene.playtestSettings.autoMovement
        || scene.playtestSettings.autoUpgrade
        || scene.playtestSettings.autoOpenTreasure,
    });
  }
}
