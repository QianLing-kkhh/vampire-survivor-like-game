import Phaser from 'phaser';

import type { CenterMessageController } from '../ui/CenterMessageController';
import type { Enemy, GameEventMap } from '../enemy/Enemy';
import type { EventBus } from '../core/EventBus';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { SpawnEventReporterContext } from '../enemy/SpawnEventReporter';

export interface GameSceneSpawnEventReporterScenePort extends Phaser.Scene {
  eventBus: EventBus<GameEventMap>;
  enemies: Enemy[];
  gameplayContext?: GameplayContext;
  timeManager: { gameTimeSeconds: number };
  runId: string;
  centerMessageController: CenterMessageController;
}

export class GameSceneSpawnEventReporterContextAdapter {
  build(scene: GameSceneSpawnEventReporterScenePort): SpawnEventReporterContext {
    return {
      scene,
      eventBus: scene.eventBus,
      enemies: scene.enemies,
      gameplayContext: scene.gameplayContext,
      gameTimeSeconds: scene.timeManager.gameTimeSeconds,
      runId: scene.runId,
      centerMessageController: scene.centerMessageController,
    };
  }
}
