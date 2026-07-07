import { EndlessStartCoordinator } from '../endless/EndlessStartCoordinator';
import type { EndlessBossManager } from '../endless/EndlessBossManager';
import type { EndlessManager } from '../endless/EndlessManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { RunState } from '../run/RunState';

export interface GameSceneEndlessStartScenePort {
  gameplayContext?: GameplayContext;
  runState: RunState;
  endlessManager?: EndlessManager;
  endlessBossManager?: EndlessBossManager;
  timeManager: {
    gameTimeSeconds: number;
  };
  runId: string;
}

export class GameSceneEndlessStartAdapter {
  private readonly endlessStartCoordinator = new EndlessStartCoordinator();

  startIfBossAlreadyKilled(scene: GameSceneEndlessStartScenePort): void {
    this.endlessStartCoordinator.startIfBossAlreadyKilled({
      gameplayContext: scene.gameplayContext,
      runState: scene.runState,
      endlessManager: scene.endlessManager,
      endlessBossManager: scene.endlessBossManager,
      gameTimeSeconds: scene.timeManager.gameTimeSeconds,
      runId: scene.runId,
    });
  }
}
