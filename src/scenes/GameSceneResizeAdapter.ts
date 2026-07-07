import type Phaser from 'phaser';

export interface GameSceneResizeScenePort {
  worldWidth: number;
  worldHeight: number;
  orientationOverlayController: {
    resize(): boolean;
  };
}

export class GameSceneResizeAdapter {
  resize(scene: Phaser.Scene & GameSceneResizeScenePort): void {
    scene.cameras.main.setSize(scene.scale.width, scene.scale.height);
    scene.cameras.main.setBounds(0, 0, scene.worldWidth, scene.worldHeight);
    scene.orientationOverlayController.resize();
  }
}
