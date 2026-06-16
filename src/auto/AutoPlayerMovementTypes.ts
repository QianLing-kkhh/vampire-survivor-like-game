import type { Vector2 } from '../core/domain/Vector2';

export interface AutoTarget {
  id: string;
  type: 'pickup' | 'treasure';
  position: Vector2;
  approachPosition: Vector2;
  value: number;
  effectiveDistance: number;
  blocked: boolean;
}

export interface Candidate {
  direction: Vector2;
  reason: string;
}

export type MoveMode =
  | 'SURVIVE'
  | 'REPOSITION'
  | 'BOSS_POSITIONING'
  | 'KITE'
  | 'COMBAT_FARM'
  | 'CHEST_APPROACH'
  | 'COLLECT';

export type StrategicPathStyle =
  | 'DIRECT'
  | 'ARC_LEFT'
  | 'ARC_RIGHT'
  | 'LOOP_CLOCKWISE'
  | 'LOOP_COUNTERCLOCKWISE';

export interface StrategicMoveIntent {
  mode: MoveMode;
  targetDirection: Vector2;
  targetPosition?: Vector2;
  preferredPathStyle: StrategicPathStyle;
  strategicLookaheadSeconds: number;
  desiredOrbitRadius: number;
  avoidLinearEscape: boolean;
  urgency: number;
  validMs: number;
  target?: AutoTarget;
}

export interface TacticalRoute {
  id: string;
  waypoints: Vector2[];
  currentWaypointIndex: number;
  threatRank: number;
  rawThreat: number;
  rewardScore: number;
  combatFitScore: number;
  xpRouteScore: number;
  killRouteScore: number;
  overKitePenalty: number;
  routeScore: number;
  createdAt: number;
  validUntil: number;
  commitment: number;
}

export interface CandidateRoute {
  id: string;
  waypoints: Vector2[];
  rawThreat: number;
  threatRank: number;
  rewardScore: number;
  combatFitScore: number;
  xpRouteScore: number;
  killRouteScore: number;
  overKitePenalty: number;
  routeScore: number;
  hardInvalid: boolean;
}

export interface MicroMoveResult {
  direction: Vector2;
  reason:
    | 'FOLLOW_ROUTE'
    | 'AVOID_CLOSE_ENEMY'
    | 'AVOID_BOSS_WARNING'
    | 'AVOID_OBSTACLE'
    | 'EMERGENCY_ESCAPE';
  score: number;
}
