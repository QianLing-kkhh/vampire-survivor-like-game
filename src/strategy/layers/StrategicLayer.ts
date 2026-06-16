import { Math2D } from '../../core/domain/Math2D';
import type { MovementStrategyConfig } from '../profile/AutoStrategyProfile';
import type { StrategyScoreWeights } from '../engine/AutoStrategyDecision';
import type { StrategicMoveIntent } from '../../auto/AutoPlayerMovementTypes';
import { AUTO_PLAYER_CONSTANTS } from '../../auto/AutoPlayerConstants';

import type { StrategicLayerInput } from './AutoMoveLayerTypes';

export class StrategicLayer {
  evaluate(input: StrategicLayerInput): StrategicMoveIntent {
    const remainingMs = input.intentRemainingMs - Math2D.clamp(input.context.deltaMs ?? 16, 0, 120);

    if (
      input.currentIntent
      && remainingMs > 0
      && !input.ops.needsForcedRefresh(input, input.currentIntent)
    ) {
      input.ops.commitIntentState(input.currentIntent, remainingMs);
      return input.currentIntent;
    }

    const nextIntent = input.ops.evaluateIntent(input);

    if (input.currentIntent && input.currentIntent.targetDirection.lengthSq() > 0) {
      const currentScore = input.ops.scoreDirection(
        input,
        input.currentIntent.targetDirection.clone().normalize(),
        nextIntent.mode,
      );
      const nextScore = input.ops.scoreDirection(input, nextIntent.targetDirection, nextIntent.mode);
      const canKeepCurrent = input.currentIntent.mode === nextIntent.mode
        && currentScore >= nextScore * (1 - AUTO_PLAYER_CONSTANTS.STRATEGIC_SWITCH_RATIO)
        && input.ops.getBossWarningRisk(input.context, input.player) <= 0;

      if (canKeepCurrent) {
        const keptIntent = {
          ...nextIntent,
          targetDirection: input.currentIntent.targetDirection.clone(),
          targetPosition: input.player.clone().add(
            input.currentIntent.targetDirection.clone().normalize().scale(AUTO_PLAYER_CONSTANTS.STRATEGIC_DISTANCE),
          ),
          preferredPathStyle: input.currentIntent.preferredPathStyle,
          strategicLookaheadSeconds: input.currentIntent.strategicLookaheadSeconds,
          desiredOrbitRadius: input.currentIntent.desiredOrbitRadius,
          avoidLinearEscape: input.currentIntent.avoidLinearEscape,
        };

        input.ops.commitIntentState(keptIntent, keptIntent.validMs);
        return keptIntent;
      }
    }

    input.ops.commitIntentState(nextIntent, nextIntent.validMs);
    return nextIntent;
  }

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
