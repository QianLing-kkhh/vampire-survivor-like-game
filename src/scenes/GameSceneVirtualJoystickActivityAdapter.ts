import type { PlaytestSettingsState } from '../settings/PlaytestSettings';

export interface GameSceneVirtualJoystickActivityScenePort {
  playtestSettings: PlaytestSettingsState;
  isGameplayPaused: boolean;
  liveStrategyControlHandler: {
    isPauseActive: boolean;
  };
}

export class GameSceneVirtualJoystickActivityAdapter {
  shouldBeActive(scene: GameSceneVirtualJoystickActivityScenePort): boolean {
    return !scene.playtestSettings.autoMovement
      && !scene.isGameplayPaused
      && !scene.liveStrategyControlHandler.isPauseActive;
  }
}
