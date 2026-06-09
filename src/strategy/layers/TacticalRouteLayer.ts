import Phaser from 'phaser';

import type { TreasureStrategyConfig } from '../profile/AutoStrategyProfile';
import type { TacticalRoute } from '../../auto/AutoPlayerMovementTypes';

import type { TacticalRouteLayerInput } from './AutoMoveLayerTypes';

export class TacticalRouteLayer {
  getTreasureRouteMultiplier(treasure: TreasureStrategyConfig): number {
    return 0.5 + treasure.routeDeviationTolerance / 100;
  }

  evaluate(input: TacticalRouteLayerInput): TacticalRoute {
    const remainingMs = input.routeRemainingMs - Phaser.Math.Clamp(input.context.deltaMs ?? 16, 0, 120);

    if (
      input.currentRoute
      && remainingMs > 0
      && input.currentRoute.validUntil > input.elapsedMs
      && !input.ops.shouldForceRefresh(input)
    ) {
      input.ops.commitRouteState(input.currentRoute, remainingMs);
      return input.currentRoute;
    }

    const nextRoute = input.ops.evaluateRoute(input);
    const committed = input.ops.chooseRouteWithCommitment(input, input.currentRoute, nextRoute);

    input.ops.commitRouteState(committed, input.ops.getUpdateInterval(input.intent.mode));
    return committed;
  }
}
