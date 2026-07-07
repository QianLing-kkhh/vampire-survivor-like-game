import type { GameplayContext } from '../gameplay/GameplayContext';
import type { RunState } from '../run/RunState';

import type { EndlessBossManager } from './EndlessBossManager';
import type { EndlessManager } from './EndlessManager';

export interface EndlessStartContext {
  gameplayContext?: GameplayContext;
  runState: RunState;
  endlessManager?: EndlessManager;
  endlessBossManager?: EndlessBossManager;
  gameTimeSeconds: number;
  runId: string;
}

export class EndlessStartCoordinator {
  startIfBossAlreadyKilled(context: EndlessStartContext): void {
    if (
      !context.gameplayContext
      || context.runState.endlessStarted
      || !context.gameplayContext.bossController.hasBossBeenKilled()
    ) {
      return;
    }

    context.runState.startEndless(context.gameTimeSeconds);
    context.endlessManager?.start(context.gameTimeSeconds);
    context.endlessBossManager?.start(context.gameTimeSeconds);
    context.gameplayContext.gameEventBus.emit('endless.started', {
      endlessStartTime: context.gameTimeSeconds,
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
  }
}
