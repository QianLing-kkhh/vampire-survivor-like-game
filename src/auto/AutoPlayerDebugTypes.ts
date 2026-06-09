import Phaser from 'phaser';

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
}

export interface StrategicDirectionAnalysis extends StrategicLookaheadDebugSnapshot {
  direction: Phaser.Math.Vector2;
  targetZoneCenter: Phaser.Math.Vector2;
  desiredOrbitRadius: number;
  avoidLinearEscape: boolean;
  score: number;
}

export interface StrategicLookaheadResult extends StrategicLookaheadDebugSnapshot {
  futureZoneSafety: number;
  desiredOrbitRadius: number;
  avoidLinearEscape: boolean;
}
