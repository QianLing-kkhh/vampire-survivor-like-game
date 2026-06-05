import { PlayerStatsData } from '../player/PlayerStats';

import { CharacterDefinition } from './CharacterDefinition';

export interface CharacterInitialStats {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier?: number;
}

export interface CharacterGrowthPerLevel {
  maxHp?: number;
  moveSpeed?: number;
  pickupRange?: number;
  weaponDamageMultiplier?: number;
  cooldownMultiplier?: number;
}

export interface CharacterBaseStats extends PlayerStatsData {
  weaponDamageMultiplier: number;
  cooldownMultiplier: number;
}

export function calculateCharacterBaseStats(
  character: CharacterDefinition,
  level: number,
): CharacterBaseStats {
  const safeLevelOffset = Math.max(0, level - 1);
  const initialStats = character.initialStats;
  const growth = character.growthPerLevel;

  return {
    maxHp: initialStats.maxHp + (growth.maxHp ?? 0) * safeLevelOffset,
    moveSpeed: initialStats.moveSpeed + (growth.moveSpeed ?? 0) * safeLevelOffset,
    pickupRange: initialStats.pickupRange + (growth.pickupRange ?? 0) * safeLevelOffset,
    expMultiplier: initialStats.expMultiplier ?? 1,
    weaponDamageMultiplier: 1 + (growth.weaponDamageMultiplier ?? 0) * safeLevelOffset,
    cooldownMultiplier: Math.max(0.1, 1 - (growth.cooldownMultiplier ?? 0) * safeLevelOffset),
  };
}
