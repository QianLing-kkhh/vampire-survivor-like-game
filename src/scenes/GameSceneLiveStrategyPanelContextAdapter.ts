import type { LiveStrategyPanelContext } from '../strategy/runtime/LiveStrategyControlHandler';
import type { RunState } from '../run/RunState';

interface GameplayActivityController {
  setGameplayActive(active: boolean): void;
}

export interface GameSceneLiveStrategyPanelScenePort {
  runState: RunState;
  virtualJoystick?: GameplayActivityController;
  shouldVirtualJoystickBeActive(): boolean;
  emitHUDState(): void;
}

export class GameSceneLiveStrategyPanelContextAdapter {
  build(scene: GameSceneLiveStrategyPanelScenePort): LiveStrategyPanelContext {
    return {
      runState: scene.runState,
      setVirtualJoystickActive: (active: boolean) => (
        scene.virtualJoystick?.setGameplayActive(active)
      ),
      shouldVirtualJoystickBeActive: () => scene.shouldVirtualJoystickBeActive(),
      emitHUDState: () => scene.emitHUDState(),
    };
  }
}
