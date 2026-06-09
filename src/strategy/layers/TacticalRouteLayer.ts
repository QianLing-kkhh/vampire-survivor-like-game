import type { TreasureStrategyConfig } from '../profile/AutoStrategyProfile';

export class TacticalRouteLayer {
  getTreasureRouteMultiplier(treasure: TreasureStrategyConfig): number {
    return 0.5 + treasure.routeDeviationTolerance / 100;
  }
}
