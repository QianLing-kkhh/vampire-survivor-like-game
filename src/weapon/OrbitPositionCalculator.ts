import { Math2D } from '../core/domain/Math2D';
import type { Vector2Like } from '../core/domain/Vector2';
import type { OrbitBehaviorConfig } from './behavior/WeaponBehaviorConfig';

export interface OrbitPositionInput {
  center: Vector2Like;
  angleDeg: number;
  radiusPixels: number;
}

export interface OrbitRadiusScaleInput {
  elapsedMs: number;
  behavior?: OrbitBehaviorConfig;
}

export class OrbitPositionCalculator {
  getPosition(input: OrbitPositionInput): Vector2Like {
    const angleRad = Math2D.degToRad(input.angleDeg);

    return {
      x: input.center.x + Math.cos(angleRad) * input.radiusPixels,
      y: input.center.y + Math.sin(angleRad) * input.radiusPixels,
    };
  }

  getRadiusScale(input: OrbitRadiusScaleInput): number {
    const behavior = input.behavior;
    const minScale = Math.max(0, behavior?.radiusScaleMin ?? 1);
    const maxScale = Math.max(minScale, behavior?.radiusScaleMax ?? minScale);
    const cycleMs = Math.max(0, behavior?.radiusCycleMs ?? 0);

    if (cycleMs <= 0 || maxScale === minScale) {
      return minScale;
    }

    const cycleProgress = (input.elapsedMs % cycleMs) / cycleMs;
    const triangleProgress = cycleProgress < 0.5
      ? cycleProgress * 2
      : (1 - cycleProgress) * 2;

    return minScale + (maxScale - minScale) * triangleProgress;
  }
}
