import { MapMechanicDefinition } from './mechanics/MapMechanicDefinition';

export interface MapVisibilityRenderConfig {
  enabled: boolean;
  ambientAlpha: number;
  ambientColor?: number;
  baseRevealRadius: number;
  baseRevealAlpha: number;
  baseLightRevealRadius?: number;
  lightRevealRadiusScale?: number;
  lightRevealAlpha: number;
  lightContributionClamp?: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  worldWidth: number;
  worldHeight: number;
  gridSize: number;
  landmarkSpacing: number;
  render?: {
    backgroundColor?: number;
    gridColor?: number;
    gridAlpha?: number;
    groundTileKey?: string;
    landmarkDensity?: number;
    themeId?: string;
    visibility?: MapVisibilityRenderConfig;
    landmarkWeights?: {
      tree?: number;
      rock?: number;
      grave?: number;
    };
  };
  mechanics?: MapMechanicDefinition[];
}
