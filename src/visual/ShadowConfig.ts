export type ShadowType =
  | 'player'
  | 'enemy'
  | 'miniBoss'
  | 'boss'
  | 'treasure'
  | 'pickup'
  | 'landmark'
  | 'axeProjectile'
  | 'largeProjectile';

export interface ShadowConfig {
  enabled: boolean;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  alpha: number;
  depthOffset: number;
}

export const SHADOW_CONFIGS: Record<ShadowType, ShadowConfig> = {
  player: { enabled: true, width: 38, height: 14, offsetX: 0, offsetY: 20, alpha: 0.28, depthOffset: -1 },
  enemy: { enabled: true, width: 24, height: 8, offsetX: 0, offsetY: 18, alpha: 0.1, depthOffset: -1 },
  miniBoss: { enabled: true, width: 72, height: 24, offsetX: 0, offsetY: 36, alpha: 0.25, depthOffset: -1 },
  boss: { enabled: true, width: 120, height: 40, offsetX: 0, offsetY: 60, alpha: 0.28, depthOffset: -1 },
  treasure: { enabled: true, width: 42, height: 12, offsetX: 0, offsetY: 20, alpha: 0.22, depthOffset: -1 },
  pickup: { enabled: true, width: 18, height: 6, offsetX: 0, offsetY: 10, alpha: 0.16, depthOffset: -1 },
  landmark: { enabled: true, width: 80, height: 28, offsetX: 0, offsetY: 45, alpha: 0.25, depthOffset: -2 },
  axeProjectile: { enabled: true, width: 28, height: 8, offsetX: 0, offsetY: 12, alpha: 0.16, depthOffset: -1 },
  largeProjectile: { enabled: true, width: 44, height: 12, offsetX: 0, offsetY: 16, alpha: 0.18, depthOffset: -1 },
};
