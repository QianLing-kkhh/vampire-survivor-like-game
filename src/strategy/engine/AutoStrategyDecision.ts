import type { PlayerIntent } from '../../input/PlayerIntent';

export interface AutoStrategyDecision {
  intent: PlayerIntent;
  mode?: string;
  reason?: string;
}

export interface StrategyScoreWeights {
  survivalMultiplier: number;
  combatMultiplier: number;
  farmMultiplier: number;
  treasureMultiplier: number;
  bossMultiplier: number;
  riskMultiplier: number;
  loopMultiplier: number;
  overKitePenaltyMultiplier: number;
}
