export const WorldConfig = {
  width: 4000,
  height: 4000,
  gridSize: 128,
  landmarkSpacing: 512,
} as const;

export interface WorldRenderConfig {
  width: number;
  height: number;
  gridSize: number;
  landmarkSpacing: number;
  backgroundColor?: number;
  gridColor?: number;
  gridAlpha?: number;
  groundTileKey?: string;
  landmarkWeights?: Partial<Record<'tree' | 'rock' | 'grave', number>>;
}
