import type { Vector2 } from '../core/domain/Vector2';

import type { StrategicPathStyle } from './AutoPlayerMovementTypes';

export interface StrategicLookaheadDebugSnapshot {
  preferredPathStyle: StrategicPathStyle;
  strategicLookaheadSeconds: number;
  farmGrowthUrgency: number;
  combatOpportunityScore: number;
  xpAccessScore: number;
  killZoneScore: number;
  weaponEffectivePositionScore: number;
  xpRouteScore: number;
  killRouteScore: number;
  overKitePenalty: number;
  combatWindow: boolean;
  futurePlayerDensityRisk: number;
  futureTargetZoneDensityRisk: number;
  futurePathInterceptionRisk: number;
  lureQuality: number;
  escapeCorridorScore: number;
  loopSustainability: number;
  futureBoundaryRisk: number;
  linearEscapePenalty: number;
  continuationScore: number;
  deadEndAfterArrivalRisk: number;
  finalBossCloseRangeScore: number;
  finalBossDashRisk: number;
  finalBossRingGapScore: number;
  finalBossDistancePenalty: number;
  finalBossDistance: number;
  finalBossDistanceForbiddenCandidateCount: number;
  finalBossDistanceHardLimitTriggered: boolean;
  finalBossEmergencyDistanceEscapeUsed: boolean;
  finalBossOrbitCandidateChosen: boolean;
  finalBossRingGapDodgeChosen: boolean;
  finalBossDashSideStepChosen: boolean;
  finalBossCloseCutInCandidateChosen: boolean;
  selectedFinalBossCandidateReason: string;
  bossWarningAvoidReason: string;
}

export interface StrategicDirectionAnalysis extends StrategicLookaheadDebugSnapshot {
  direction: Vector2;
  targetZoneCenter: Vector2;
  desiredOrbitRadius: number;
  avoidLinearEscape: boolean;
  score: number;
}

export interface StrategicLookaheadResult extends StrategicLookaheadDebugSnapshot {
  futureZoneSafety: number;
  desiredOrbitRadius: number;
  avoidLinearEscape: boolean;
}
