import Phaser from 'phaser';

import { MapDefinition } from '../map/MapDefinition';
import { MapLightSourceDefinition } from '../map/mechanics/MapMechanicDefinition';
import { MapVisibilityRenderer, MapVisibilityRendererLightSource } from './MapVisibilityRenderer';
import { WorldRenderConfig } from './WorldConfig';

export class MapVisibilityController {
  private renderer?: MapVisibilityRenderer;

  constructor(private readonly scene: Phaser.Scene) {}

  create(config: WorldRenderConfig, map: MapDefinition): void {
    this.destroy();

    if (!config.visibility?.enabled) {
      return;
    }

    this.renderer = new MapVisibilityRenderer(
      this.scene,
      config,
      this.getLightSources(map),
    );
  }

  update(playerPosition?: { x: number; y: number }): void {
    if (!this.renderer || !playerPosition) {
      return;
    }

    this.renderer.update(playerPosition.x, playerPosition.y);
  }

  destroy(): void {
    this.renderer?.destroy();
    this.renderer = undefined;
  }

  private getLightSources(map: MapDefinition): MapVisibilityRendererLightSource[] {
    return (map.mechanics ?? [])
      .filter((mechanic): mechanic is MapLightSourceDefinition => (
        mechanic.type === 'lightSource'
      ))
      .map((mechanic) => ({
        x: mechanic.x,
        y: mechanic.y,
        radius: mechanic.radius,
      }));
  }
}
