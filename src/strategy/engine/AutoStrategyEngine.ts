import type { PlayerIntent } from '../../input/PlayerIntent';
import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../profile/AutoStrategyProfile';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';
import { MicroControlLayer } from '../layers/MicroControlLayer';
import { StrategicLayer } from '../layers/StrategicLayer';
import { TacticalRouteLayer } from '../layers/TacticalRouteLayer';
import type { AutoStrategyDecision, StrategyScoreWeights } from './AutoStrategyDecision';

export class AutoStrategyEngine {
  private readonly strategicLayer = new StrategicLayer();
  private readonly tacticalRouteLayer = new TacticalRouteLayer();
  private readonly microControlLayer = new MicroControlLayer();
  private profile = StrategyProfileValidator.normalize(DEFAULT_AUTO_STRATEGY_PROFILE);

  setProfile(profile: AutoStrategyProfile): void {
    this.profile = StrategyProfileValidator.normalize(profile);
  }

  getProfile(): AutoStrategyProfile {
    return StrategyProfileValidator.normalize(this.profile);
  }

  getMovementWeights(): StrategyScoreWeights {
    return this.strategicLayer.getScoreWeights(this.profile.movement);
  }

  getTreasureRouteMultiplier(): number {
    return this.tacticalRouteLayer.getTreasureRouteMultiplier(this.profile.treasure);
  }

  createMovementDecision(direction: { x: number; y: number }, reason?: string): AutoStrategyDecision {
    return {
      intent: this.toIntent(direction),
      reason,
    };
  }

  toIntent(direction: { x: number; y: number }): PlayerIntent {
    return this.microControlLayer.toAutoStrategyIntent(direction);
  }
}
