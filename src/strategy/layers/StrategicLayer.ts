import type { MovementStrategyConfig } from '../profile/AutoStrategyProfile';
import type { StrategyScoreWeights } from '../engine/AutoStrategyDecision';

export class StrategicLayer {
  getScoreWeights(movement: MovementStrategyConfig): StrategyScoreWeights {
    return {
      survivalMultiplier: this.weightToMultiplier(movement.survivalBias),
      combatMultiplier: this.weightToMultiplier(movement.combatBias),
      farmMultiplier: this.weightToMultiplier(movement.farmBias),
      treasureMultiplier: this.weightToMultiplier(movement.treasureBias),
      bossMultiplier: this.weightToMultiplier(movement.bossBias),
      riskMultiplier: this.weightToInverseMultiplier(movement.riskTolerance),
      loopMultiplier: this.weightToMultiplier(movement.loopBias),
      overKitePenaltyMultiplier: this.weightToMultiplier(movement.overKitePenalty),
    };
  }

  private weightToMultiplier(value: number): number {
    return 0.5 + value / 100;
  }

  private weightToInverseMultiplier(value: number): number {
    return 1.5 - value / 100;
  }
}
