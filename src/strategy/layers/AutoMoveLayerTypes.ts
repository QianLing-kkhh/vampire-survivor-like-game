import type { Vector2 } from '../../core/domain/Vector2';
import type {
  AutoTarget,
  Candidate,
  MicroMoveResult,
  StrategicMoveIntent,
  TacticalRoute,
} from '../../auto/AutoPlayerMovementTypes';
import type {
  CornerTrapInfo,
  KiteInfo,
  MovementMemoryInfo,
  SurroundInfo,
  TerrainEscapeInfo,
} from '../../auto/AutoPlayerMemoryTypes';
import type { StrategicLookaheadDebugSnapshot } from '../../auto/AutoPlayerDebugTypes';
import type { AutoPlayerContext } from '../../auto/AutoPlayerTypes';
import type { StrategyScoreWeights } from '../engine/AutoStrategyDecision';

export interface AutoMoveDangerInfo {
  nearestDistance: number;
  fleeDirection: Vector2;
  enemyCenter: Vector2;
  [key: string]: unknown;
}

export interface StrategicLayerOps {
  needsForcedRefresh(input: StrategicLayerInput, intent: StrategicMoveIntent): boolean;
  evaluateIntent(input: StrategicLayerInput): StrategicMoveIntent;
  scoreDirection(
    input: StrategicLayerInput,
    direction: Vector2,
    mode: StrategicMoveIntent['mode'],
  ): number;
  getBossWarningRisk(context: AutoPlayerContext, player: Vector2): number;
  commitIntentState(intent: StrategicMoveIntent, remainingMs: number): void;
}

export interface StrategicLayerInput {
  context: AutoPlayerContext;
  player: Vector2;
  danger: AutoMoveDangerInfo;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  terrainEscape: TerrainEscapeInfo;
  kite: KiteInfo;
  target?: AutoTarget;
  warningEscapeDirection: Vector2;
  portalEscapeDirection: Vector2;
  breakoutDirection: Vector2;
  currentIntent?: StrategicMoveIntent;
  intentRemainingMs: number;
  ops: StrategicLayerOps;
}

export interface TacticalRouteLayerOps {
  shouldForceRefresh(input: TacticalRouteLayerInput): boolean;
  evaluateRoute(input: TacticalRouteLayerInput): TacticalRoute;
  chooseRouteWithCommitment(
    input: TacticalRouteLayerInput,
    currentRoute: TacticalRoute | undefined,
    nextRoute: TacticalRoute,
  ): TacticalRoute;
  getUpdateInterval(mode: StrategicMoveIntent['mode']): number;
  commitRouteState(route: TacticalRoute, remainingMs: number): void;
}

export interface TacticalRouteLayerInput {
  context: AutoPlayerContext;
  player: Vector2;
  danger: AutoMoveDangerInfo;
  intent: StrategicMoveIntent;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  kite: KiteInfo;
  terrainEscape: TerrainEscapeInfo;
  warningEscapeDirection: Vector2;
  portalEscapeDirection: Vector2;
  breakoutDirection: Vector2;
  currentRoute?: TacticalRoute;
  routeRemainingMs: number;
  elapsedMs: number;
  weights: StrategyScoreWeights;
  ops: TacticalRouteLayerOps;
}

export interface MicroControlLayerOps {
  advanceRouteWaypoint(route: TacticalRoute, player: Vector2): void;
  getRouteDirection(
    context: AutoPlayerContext,
    player: Vector2,
    route: TacticalRoute,
    intent: StrategicMoveIntent,
  ): Vector2;
  getBossWarningEscapeDirection(context: AutoPlayerContext, player: Vector2): Vector2;
  getRouteReturnDirection(player: Vector2, route: TacticalRoute): Vector2;
  getFinalBossWarningCandidates(context: AutoPlayerContext, player: Vector2): Candidate[];
  getFinalBossDistanceFallbackDirection(context: AutoPlayerContext, player: Vector2): Vector2;
  getNearestEnemyEscapeCandidates(context: AutoPlayerContext, player: Vector2): Candidate[];
  getEmergencyMicroCandidates(context: AutoPlayerContext, player: Vector2): Candidate[];
  getCandidateEndpoint(
    context: AutoPlayerContext,
    player: Vector2,
    direction: Vector2,
  ): Vector2;
  getFinalBossDistanceConstraint(
    context: AutoPlayerContext,
    player: Vector2,
    endpoint: Vector2,
  ): FinalBossDistanceConstraintResult;
  getFinalBossWarningConstraint(
    context: AutoPlayerContext,
    player: Vector2,
    endpoint: Vector2,
  ): FinalBossWarningConstraintResult;
  scoreMicroDirection(
    input: MicroControlLayerInput,
    endpoint: Vector2,
    direction: Vector2,
    routeDirection: Vector2,
  ): number;
  getMicroResultReason(reason: string): MicroMoveResult['reason'];
  updateFinalBossWarningChoiceDebug(reason: string): void;
  updateFinalBossDistanceConstraintDebug(update: FinalBossDistanceConstraintDebugUpdate): void;
}

export interface FinalBossDistanceConstraintResult {
  active: boolean;
  forbidden: boolean;
  emergencyAllowed: boolean;
  distance: number;
  reason: string;
}

export interface FinalBossWarningConstraintResult {
  active: boolean;
  forbidden: boolean;
  currentRisk: number;
  endpointRisk: number;
  reason: string;
}

export interface FinalBossDistanceConstraintDebugUpdate {
  forbiddenCandidateCount: number;
  hardLimitTriggered: boolean;
  emergencyEscapeUsed: boolean;
  selectedReason: string;
}

export interface MicroControlLayerInput {
  context: AutoPlayerContext;
  player: Vector2;
  route: TacticalRoute;
  intent: StrategicMoveIntent;
  danger: AutoMoveDangerInfo;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  kite: KiteInfo;
  terrainEscape: TerrainEscapeInfo;
  lastMoveDirection?: Vector2;
  debugSnapshot?: StrategicLookaheadDebugSnapshot;
  ops: MicroControlLayerOps;
}

export interface AutoStrategyEngineEvaluateInput {
  strategic: StrategicLayerInput;
  tactical: Omit<TacticalRouteLayerInput, 'intent'>;
  micro: Omit<MicroControlLayerInput, 'intent' | 'route'>;
}
