import { EventBus } from '../../core/EventBus';
import type { GameEventMap } from '../../core/domain/GameEvents';
import { TimeManager } from '../../core/TimeManager';
import { GameEventBridge } from '../../events/GameEventBridge';
import { GameEventBus } from '../../events/GameEventBus';
import { GameEventRecorder } from '../../events/GameEventRecorder';
import { ReplayRecorder } from '../../replay/ReplayRecorder';
import { RunState } from '../../run/RunState';

export interface RuntimeEventFactoryConfig {
  eventBus: EventBus<GameEventMap>;
  timeManager: TimeManager;
  runId: string;
  runState: RunState;
}

export interface RuntimeEventBundle {
  gameEventBus: GameEventBus;
  gameEventRecorder: GameEventRecorder;
  replayRecorder: ReplayRecorder;
  gameEventBridge: GameEventBridge;
}

export class RuntimeEventFactory {
  create(config: RuntimeEventFactoryConfig): RuntimeEventBundle {
    const gameEventBus = new GameEventBus();
    const gameEventRecorder = new GameEventRecorder();
    const replayRecorder = new ReplayRecorder();
    const gameEventBridge = new GameEventBridge({
      sourceEventBus: config.eventBus,
      gameEventBus,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      getRunId: () => config.runId,
    });

    gameEventBus.subscribeAll((event) => {
      gameEventRecorder.record(event);
      replayRecorder.recordEvent(event);
      config.runState.recordGameEvent();
    });

    return {
      gameEventBus,
      gameEventRecorder,
      replayRecorder,
      gameEventBridge,
    };
  }
}
