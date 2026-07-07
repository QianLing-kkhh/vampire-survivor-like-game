import Phaser from 'phaser';

import { ReplayStorage } from '../replay/ReplayStorage';
import { VictoryUnlockService } from '../unlock/VictoryUnlockService';
import { ResultScenePresenter } from '../ui/result/ResultScenePresenter';
import type { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';

import { RunEndCoordinator, type RunEndCoordinatorContext } from './RunEndCoordinator';
import { RunResultBuilder } from './RunResultBuilder';

export type RunEndFlowContext = RunEndCoordinatorContext & {
  statsBuildSnapshot: StatsBuildSnapshot;
  cleanup: () => void;
};

export class RunEndFlowController {
  private readonly runEndCoordinator = new RunEndCoordinator();
  private readonly runResultBuilder = new RunResultBuilder();
  private readonly victoryUnlockService = new VictoryUnlockService();
  private readonly resultScenePresenter: ResultScenePresenter;

  constructor(scene: Phaser.Scene) {
    this.resultScenePresenter = new ResultScenePresenter(scene);
  }

  endRun(context: RunEndFlowContext): void {
    const endResult = this.runEndCoordinator.prepare(context);

    context.gameplayContext?.gameEventBus.emit(
      'run.ended',
      endResult.runEndedEvent.payload,
      endResult.runEndedEvent.meta,
    );
    const replayData = context.gameplayContext?.replayRecorder?.stop(
      endResult.replayStopContext,
    );

    if (replayData) {
      new ReplayStorage().save(replayData);
    }

    const unlockResult = this.victoryUnlockService.unlockNextForVictory(
      endResult.unlockContext,
    );
    const resultData = this.runResultBuilder.build(endResult.resultBuildContext);

    this.resultScenePresenter.show({
      resultData,
      unlockMessages: unlockResult.messages,
      statsBuildSnapshot: context.statsBuildSnapshot,
    }, context.cleanup);
  }
}
