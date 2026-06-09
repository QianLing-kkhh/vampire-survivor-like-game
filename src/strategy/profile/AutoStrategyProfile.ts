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

