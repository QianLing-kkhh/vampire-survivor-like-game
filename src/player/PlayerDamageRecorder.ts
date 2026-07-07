import type { GameplayContext } from '../gameplay/GameplayContext';
import type { RunState } from '../run/RunState';
import type { RunStats } from '../stats/RunStats';
import type { PlayerFeedbackController } from '../ui/PlayerFeedbackController';

import type { PlayerController } from './PlayerController';
import type { PlayerHealth } from './PlayerHealth';

export interface PlayerDamageRecordContext {
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  playerFeedbackController: PlayerFeedbackController;
  runStats: RunStats;
  runState: RunState;
  gameplayContext?: GameplayContext;
  showDamageNumbers: boolean;
}

export class PlayerDamageRecorder {
  record(actualDamage: number, context: PlayerDamageRecordContext): void {
    if (!context.playerHealth) {
      return;
    }

    context.playerFeedbackController.showDamage(
      context.player?.getPositionLike(),
      actualDamage,
      context.showDamageNumbers,
    );

    context.runStats.recordDamageTaken(actualDamage, context.playerHealth.currentHp);

    if (context.gameplayContext?.bossController.hasBossSpawned()) {
      context.runState.recordBossPhaseDamage(actualDamage, context.playerHealth.currentHp);
    }
  }
}
