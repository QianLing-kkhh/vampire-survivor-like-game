export const AUTO_STRATEGY_PROFILE_VERSION = 1;
export const DEFAULT_AUTO_STRATEGY_PROFILE_ID = 'balanced_default';

export interface MovementStrategyConfig {
  survivalBias: number;
  combatBias: number;
  farmBias: number;
  treasureBias: number;
  bossBias: number;
  riskTolerance: number;
  loopBias: number;
  overKitePenalty: number;
}

export interface UpgradeStrategyConfig {
  evolutionPriority: number;
  mainWeaponPriority: number;
  newWeaponPriority: number;
  passivePriority: number;
  survivalPriority: number;
  cooldownPriority: number;
  damagePriority: number;
  growthPriority: number;
}

export interface TreasureStrategyConfig {
  openRiskTolerance: number;
  evolutionChestPriority: number;
  relicExpectedValuePriority: number;
  routeDeviationTolerance: number;
}

export interface RelicStrategyConfig {
  rarityPriority: number;
  synergyPriority: number;
  survivalRelicPriority: number;
  damageRelicPriority: number;
  economyRelicPriority: number;
}

export interface AutoStrategyProfile {
  version: number;
  id: string;
  name: string;
  movement: MovementStrategyConfig;
  upgrade: UpgradeStrategyConfig;
  treasure: TreasureStrategyConfig;
  relic: RelicStrategyConfig;
}

export const DEFAULT_AUTO_STRATEGY_PROFILE: AutoStrategyProfile = {
  version: AUTO_STRATEGY_PROFILE_VERSION,
  id: DEFAULT_AUTO_STRATEGY_PROFILE_ID,
  name: 'Balanced Default',
  movement: {
    survivalBias: 70,
    combatBias: 50,
    farmBias: 55,
    treasureBias: 45,
    bossBias: 55,
    riskTolerance: 35,
    loopBias: 55,
    overKitePenalty: 50,
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

export interface StrategySaveData {
  selectedProfileId: string;
  profilesById: Record<string, AutoStrategyProfile>;
}

export function createDefaultStrategySaveData(): StrategySaveData {
  return {
    selectedProfileId: DEFAULT_AUTO_STRATEGY_PROFILE_ID,
    profilesById: {
      [DEFAULT_AUTO_STRATEGY_PROFILE_ID]: cloneAutoStrategyProfile(DEFAULT_AUTO_STRATEGY_PROFILE),
    },
  };
}

export function cloneAutoStrategyProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
  return JSON.parse(JSON.stringify(profile)) as AutoStrategyProfile;
}
