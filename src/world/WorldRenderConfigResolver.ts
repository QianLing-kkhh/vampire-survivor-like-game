import type { MapDefinition } from '../map/MapDefinition';

import type { WorldRenderConfig } from './WorldConfig';

export class WorldRenderConfigResolver {
  resolve(map: MapDefinition): WorldRenderConfig {
    return {
      width: map.worldWidth,
      height: map.worldHeight,
      gridSize: map.gridSize,
      landmarkSpacing: map.landmarkSpacing,
      ...map.render,
    };
  }
}
