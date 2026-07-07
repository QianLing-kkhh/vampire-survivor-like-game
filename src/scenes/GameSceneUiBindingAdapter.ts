import Phaser from 'phaser';

import type { LevelUpGameScenePort, LevelUpSubscriptionBinder } from '../progression/LevelUpSubscriptionBinder';
import type { GameSceneInputBindingHandlers, GameSceneInputBindings } from './GameSceneInputBindings';

export interface GameSceneUiBindingScenePort extends Phaser.Scene {
  uiScene?: Phaser.Scene;
  unsubscribeLevelUp?: () => void;
  levelUpSubscriptionBinder: LevelUpSubscriptionBinder;
  inputBindings: GameSceneInputBindings;
  inputBindingHandlers: GameSceneInputBindingHandlers;
}

export class GameSceneUiBindingAdapter {
  bind(scene: GameSceneUiBindingScenePort): void {
    const uiScene = scene.scene.get('UIScene');
    scene.uiScene = uiScene;

    scene.unsubscribeLevelUp = scene.levelUpSubscriptionBinder.bindGameScene(
      scene as unknown as LevelUpGameScenePort & Phaser.Scene,
      uiScene,
    );
    scene.inputBindings.bind(scene, uiScene, scene.inputBindingHandlers, scene);
  }
}
