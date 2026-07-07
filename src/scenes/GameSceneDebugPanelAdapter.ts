import type Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import { DebugPanelPresenter } from '../ui/debug/DebugPanelPresenter';

export interface GameSceneDebugPanelScenePort {
  gameplayContext?: GameplayContext;
}

export class GameSceneDebugPanelAdapter {
  private readonly debugPanelPresenter = new DebugPanelPresenter();

  emit(scene: Phaser.Scene & GameSceneDebugPanelScenePort): void {
    this.debugPanelPresenter.emit(scene, scene.gameplayContext);
  }

  toggle(): void {
    this.debugPanelPresenter.toggle();
  }
}
