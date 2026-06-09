import type { PlayerIntent } from '../../input/PlayerIntent';
import type {
  MicroMoveResult,
  StrategicMoveIntent,
  TacticalRoute,
} from '../../auto/AutoPlayerMovementTypes';
import type { StrategicLookaheadDebugSnapshot } from '../../auto/AutoPlayerDebugTypes';

export interface AutoStrategyDecision {
  intent: PlayerIntent;
  strategicIntent?: StrategicMoveIntent;
  tacticalRoute?: TacticalRoute;
  microMove?: MicroMoveResult;
  debugSnapshot?: StrategicLookaheadDebugSnapshot;
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
