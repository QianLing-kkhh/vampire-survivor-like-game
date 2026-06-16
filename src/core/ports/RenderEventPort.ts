import type { Vector2Like } from '../domain/Vector2';

export type RenderVisualId = string;

export interface RenderTransform {
  position: Vector2Like;
  rotation?: number;
  scale?: Vector2Like | number;
  alpha?: number;
  visible?: boolean;
}

export interface SpawnVisualRequest {
  id?: RenderVisualId;
  kind: string;
  assetKey?: string;
  transform: RenderTransform;
  layer?: string;
  metadata?: Record<string, unknown>;
}

export interface PlayEffectRequest {
  kind: string;
  position: Vector2Like;
  assetKey?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface FloatingTextRequest {
  text: string;
  position: Vector2Like;
  color?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface CameraShakeRequest {
  durationMs: number;
  intensity: number;
}

export interface RenderEventPort {
  spawnVisual(request: SpawnVisualRequest): RenderVisualId;
  despawnVisual(id: RenderVisualId): void;
  updateTransform(id: RenderVisualId, transform: Partial<RenderTransform>): void;
  playEffect(request: PlayEffectRequest): void;
  showFloatingText(request: FloatingTextRequest): void;
  shakeCamera(request: CameraShakeRequest): void;
}
