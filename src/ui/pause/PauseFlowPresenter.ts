import Phaser from 'phaser';

import { StatsBuildSnapshot } from '../stats/StatsBuildSnapshot';
import { PauseFlowResult } from './PauseFlowCoordinator';

export interface PauseFlowPresenterCallbacks {
  buildStatsBuildSnapshot: () => StatsBuildSnapshot;
  applyGameplayTimeScale: () => void;
  setVirtualJoystickActive: (active: boolean) => void;
  shouldVirtualJoystickBeActive: () => boolean;
}

export class PauseFlowPresenter {
  constructor(private readonly scene: Phaser.Scene) {}

  apply(
    result: PauseFlowResult,
    callbacks: PauseFlowPresenterCallbacks,
    sceneKey?: string,
  ): void {
    switch (result.action) {
      case 'openPause':
        callbacks.setVirtualJoystickActive(false);
        this.scene.scene.get('UIScene').events.emit(
          'ShowPauseMenu',
          callbacks.buildStatsBuildSnapshot(),
        );
        break;
      case 'resumePause':
        callbacks.applyGameplayTimeScale();
        callbacks.setVirtualJoystickActive(callbacks.shouldVirtualJoystickBeActive());
        this.scene.scene.get('UIScene').events.emit('HidePauseMenu');
        break;
      case 'restart':
        callbacks.setVirtualJoystickActive(false);
        this.scene.scene.stop('UIScene');
        this.scene.scene.restart();
        break;
      case 'backToTitle':
        callbacks.setVirtualJoystickActive(false);
        this.scene.scene.stop('UIScene');
        this.scene.scene.start('TitleScene');
        break;
      case 'openDeveloperScene':
        if (!sceneKey) {
          return;
        }

        callbacks.setVirtualJoystickActive(false);
        this.scene.scene.stop('UIScene');
        this.scene.scene.start(sceneKey);
        break;
      case 'none':
      default:
        break;
    }
  }
}
