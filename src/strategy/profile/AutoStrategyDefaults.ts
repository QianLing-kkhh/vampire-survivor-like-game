import type { AutoStrategyProfile } from './AutoStrategyProfile';

export const AUTO_STRATEGY_PROFILE_VERSION = 1;
export const DEFAULT_AUTO_STRATEGY_PROFILE_ID = 'balanced_default';
export const PLAYTEST_AUTO_STRATEGY_PROFILE_ID = 'playtest_baseline';

export const DEFAULT_AUTO_STRATEGY_PROFILE: AutoStrategyProfile = {
  version: AUTO_STRATEGY_PROFILE_VERSION,
  id: DEFAULT_AUTO_STRATEGY_PROFILE_ID,
  name: 'Balanced Default',
  movement: {
    survivalBias: 50,
    combatBias: 60,
    farmBias: 88,
    treasureBias: 28,
    bossBias: 86,
    riskTolerance: 58,
    loopBias: 68,
    overKitePenalty: 82,
  },
  upgrade: {
    evolutionPriority: 80,
    mainWeaponPriority: 65,
    newWeaponPriority: 45,
    passivePriority: 50,
    survivalPriority: 55,
    cooldownPriority: 60,
    damagePriority: 60,
    growthPriority: 50,
  },
  treasure: {
    openRiskTolerance: 40,
    evolutionChestPriority: 80,
    relicExpectedValuePriority: 50,
    routeDeviationTolerance: 45,
  },
  relic: {
    rarityPriority: 55,
    synergyPriority: 65,
    survivalRelicPriority: 55,
    damageRelicPriority: 60,
    economyRelicPriority: 45,
  },
};

export const PLAYTEST_AUTO_STRATEGY_PROFILE: AutoStrategyProfile = {
  version: AUTO_STRATEGY_PROFILE_VERSION,
  id: PLAYTEST_AUTO_STRATEGY_PROFILE_ID,
  name: 'Playtest Baseline',
  movement: {
    survivalBias: 50,
    combatBias: 60,
    farmBias: 88,
    treasureBias: 28,
    bossBias: 86,
    riskTolerance: 58,
    loopBias: 68,
    overKitePenalty: 82,
  },
  upgrade: {
    evolutionPriority: 80,
    mainWeaponPriority: 65,
    newWeaponPriority: 45,
    passivePriority: 50,
    survivalPriority: 55,
    cooldownPriority: 60,
    damagePriority: 60,
    growthPriority: 50,
  },
  treasure: {
    openRiskTolerance: 40,
    evolutionChestPriority: 80,
    relicExpectedValuePriority: 50,
    routeDeviationTolerance: 45,
  },
  relic: {
    rarityPriority: 55,
    synergyPriority: 65,
    survivalRelicPriority: 55,
    damageRelicPriority: 60,
    economyRelicPriority: 45,
  },
};

