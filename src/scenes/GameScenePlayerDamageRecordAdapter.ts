import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PlayerController } from '../player/PlayerController';
import { PlayerDamageRecorder } from '../player/PlayerDamageRecorder';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { RunState } from '../run/RunState';
import { SettingsManager } from '../settings/SettingsManager';
import type { RunStats } from '../stats/RunStats';
import type { PlayerFeedbackController } from '../ui/PlayerFeedbackController';

export interface GameScenePlayerDamageRecordScenePort {
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  playerFeedbackController: PlayerFeedbackController;
  runStats: RunStats;
  runState: RunState;
  gameplayContext?: GameplayContext;
}

export class GameScenePlayerDamageRecordAdapter {
  private readonly playerDamageRecorder = new PlayerDamageRecorder();

  record(actualDamage: number, scene: GameScenePlayerDamageRecordScenePort): void {
    this.playerDamageRecorder.record(actualDamage, {
      player: scene.player,
      playerHealth: scene.playerHealth,
      playerFeedbackController: scene.playerFeedbackController,
      runStats: scene.runStats,
      runState: scene.runState,
      gameplayContext: scene.gameplayContext,
      showDamageNumbers: SettingsManager.getGameplay().showDamageNumbers,
    });
  }
}
