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
    landmarkWeights?: {
      tree?: number;
      rock?: number;
      grave?: number;
    };
  };
}
