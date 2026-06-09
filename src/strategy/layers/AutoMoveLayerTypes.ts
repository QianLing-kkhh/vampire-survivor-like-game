import Phaser from 'phaser';

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
  fleeDirection: Phaser.Math.Vector2;
  enemyCenter: Phaser.Math.Vector2;
  [key: string]: unknown;
}

export interface StrategicLayerOps {
  needsForcedRefresh(input: StrategicLayerInput, intent: StrategicMoveIntent): boolean;
  evaluateIntent(input: StrategicLayerInput): StrategicMoveIntent;
  scoreDirection(
    input: StrategicLayerInput,
    direction: Phaser.Math.Vector2,
    mode: StrategicMoveIntent['mode'],
  ): number;
  getBossWarningRisk(context: AutoPlayerContext, player: Phaser.Math.Vector2): number;
  commitIntentState(intent: StrategicMoveIntent, remainingMs: number): void;
}

export interface StrategicLayerInput {
  context: AutoPlayerContext;
  player: Phaser.Math.Vector2;
  danger: AutoMoveDangerInfo;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  terrainEscape: TerrainEscapeInfo;
  kite: KiteInfo;
  target?: AutoTarget;
  warningEscapeDirection: Phaser.Math.Vector2;
  portalEscapeDirection: Phaser.Math.Vector2;
  breakoutDirection: Phaser.Math.Vector2;
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
  player: Phaser.Math.Vector2;
  danger: AutoMoveDangerInfo;
  intent: StrategicMoveIntent;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  kite: KiteInfo;
  terrainEscape: TerrainEscapeInfo;
  warningEscapeDirection: Phaser.Math.Vector2;
  portalEscapeDirection: Phaser.Math.Vector2;
  breakoutDirection: Phaser.Math.Vector2;
  currentRoute?: TacticalRoute;
  routeRemainingMs: number;
  elapsedMs: number;
  weights: StrategyScoreWeights;
  ops: TacticalRouteLayerOps;
}

export interface MicroControlLayerOps {
  advanceRouteWaypoint(route: TacticalRoute, player: Phaser.Math.Vector2): void;
  getRouteDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    route: TacticalRoute,
    intent: StrategicMoveIntent,
  ): Phaser.Math.Vector2;
  getBossWarningEscapeDirection(context: AutoPlayerContext, player: Phaser.Math.Vector2): Phaser.Math.Vector2;
  getRouteReturnDirection(player: Phaser.Math.Vector2, route: TacticalRoute): Phaser.Math.Vector2;
  getFinalBossWarningCandidates(context: AutoPlayerContext, player: Phaser.Math.Vector2): Candidate[];
  getNearestEnemyEscapeCandidates(context: AutoPlayerContext, player: Phaser.Math.Vector2): Candidate[];
  getCandidateEndpoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2;
  getFinalBossDistanceConstraint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
  ): FinalBossDistanceConstraintResult;
  scoreMicroDirection(
    input: MicroControlLayerInput,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    routeDirection: Phaser.Math.Vector2,
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

export interface FinalBossDistanceConstraintDebugUpdate {
  forbiddenCandidateCount: number;
  hardLimitTriggered: boolean;
  emergencyEscapeUsed: boolean;
  selectedReason: string;
}

export interface MicroControlLayerInput {
  context: AutoPlayerContext;
  player: Phaser.Math.Vector2;
  route: TacticalRoute;
  intent: StrategicMoveIntent;
  danger: AutoMoveDangerInfo;
  cornerTrap: CornerTrapInfo;
  surround: SurroundInfo;
  movement: MovementMemoryInfo;
  kite: KiteInfo;
  terrainEscape: TerrainEscapeInfo;
  lastMoveDirection?: Phaser.Math.Vector2;
  debugSnapshot?: StrategicLookaheadDebugSnapshot;
  ops: MicroControlLayerOps;
}

export interface AutoStrategyEngineEvaluateInput {
  strategic: StrategicLayerInput;
  tactical: Omit<TacticalRouteLayerInput, 'intent'>;
  micro: Omit<MicroControlLayerInput, 'intent' | 'route'>;
}
