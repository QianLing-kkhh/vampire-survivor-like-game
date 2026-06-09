import type {
  StrategyBossWarningDanger,
  StrategyBossWarningKind,
  StrategyBossWarningSnapshot,
  StrategyEnemySnapshot,
  StrategyMapSnapshot,
  StrategyObstacleSnapshot,
  StrategyPickupSnapshot,
  StrategyPlayerSnapshot,
  StrategyPortalSnapshot,
  StrategyPosition,
  StrategySlowZoneSnapshot,
  StrategyTreasureSnapshot,
  StrategyWeaponContext,
  StrategyWeaponSnapshot,
  StrategyWorldSnapshot,
} from '../strategy/snapshot/StrategyWorldSnapshot';

export type AutoPosition = StrategyPosition;
export type AutoPlayerSnapshot = StrategyPlayerSnapshot;
export type AutoWeaponSnapshot = StrategyWeaponSnapshot;
export type AutoEnemySnapshot = StrategyEnemySnapshot;
export type AutoPickupSnapshot = StrategyPickupSnapshot;
export type AutoTreasureSnapshot = StrategyTreasureSnapshot;
export type AutoObstacleSnapshot = StrategyObstacleSnapshot;
export type AutoSlowZoneSnapshot = StrategySlowZoneSnapshot;
export type AutoPortalSnapshot = StrategyPortalSnapshot;
export type AutoMapSnapshot = StrategyMapSnapshot;
export type AutoBossWarningKind = StrategyBossWarningKind;
export type AutoBossWarningDanger = StrategyBossWarningDanger;
export type AutoBossWarningSnapshot = StrategyBossWarningSnapshot;
export type WeaponAutoContext = StrategyWeaponContext;
export type AutoPlayerContext = StrategyWorldSnapshot;
