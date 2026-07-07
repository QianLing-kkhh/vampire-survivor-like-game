import Phaser from 'phaser';

import type { MapDefinition } from '../map/MapDefinition';
import type { MapVisibilityController } from '../world/MapVisibilityController';
import { WorldRenderer } from '../world/WorldRenderer';
import { WorldRenderConfigResolver } from '../world/WorldRenderConfigResolver';

export interface GameSceneWorldSetupScenePort extends Phaser.Scene {
  currentMap: MapDefinition;
  mapVisibilityController: MapVisibilityController;
}

export class GameSceneWorldSetupAdapter {
  private readonly worldRenderConfigResolver = new WorldRenderConfigResolver();

  setup(scene: GameSceneWorldSetupScenePort): void {
    const worldWidth = scene.currentMap.worldWidth;
    const worldHeight = scene.currentMap.worldHeight;

    scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    const worldRenderConfig = this.worldRenderConfigResolver.resolve(scene.currentMap);

    new WorldRenderer(scene, worldRenderConfig).render();
    scene.mapVisibilityController.create(worldRenderConfig, scene.currentMap);
  }
}
