import { PlayerStatsData } from '../player/PlayerStats';

import { CharacterDefinition } from './CharacterDefinition';

export interface CharacterInitialStats {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier?: number;
  damageMultiplier?: number;
  weaponDamageMultiplier?: number;
  physicalDamageMultiplier?: number;
  magicDamageMultiplier?: number;
  projectileDamageMultiplier?: number;
  auraDamageMultiplier?: number;
  orbitDamageMultiplier?: number;
  areaDamageMultiplier?: number;
  explosionDamageMultiplier?: number;
  bossDamageMultiplier?: number;
  eliteDamageMultiplier?: number;
  critChance?: number;
  critDamageMultiplier?: number;
  cooldownMultiplier?: number;
  projectileSpeedMultiplier?: number;
  knockbackPowerMultiplier?: number;
  damageTakenMultiplier?: number;
  armorFlat?: number;
  dodgeChance?: number;
  healingMultiplier?: number;
  shieldGainMultiplier?: number;
  invulnerabilityBonusMs?: number;
  expGainMultiplier?: number;
  treasureDropMultiplier?: number;
  upgradeChoiceBonus?: number;
}

export interface CharacterGrowthPerLevel {
  maxHp?: number;
  moveSpeed?: number;
  pickupRange?: number;
  damageMultiplier?: number;
  weaponDamageMultiplier?: number;
  physicalDamageMultiplier?: number;
  magicDamageMultiplier?: number;
  projectileDamageMultiplier?: number;
  auraDamageMultiplier?: number;
  orbitDamageMultiplier?: number;
  areaDamageMultiplier?: number;
  explosionDamageMultiplier?: number;
  bossDamageMultiplier?: number;
  eliteDamageMultiplier?: number;
  critChance?: number;
  critDamageMultiplier?: number;
  cooldownMultiplier?: number;
  projectileSpeedMultiplier?: number;
  knockbackPowerMultiplier?: number;
  damageTakenMultiplier?: number;
  armorFlat?: number;
  dodgeChance?: number;
  healingMultiplier?: number;
  shieldGainMultiplier?: number;
  invulnerabilityBonusMs?: number;
  expGainMultiplier?: number;
  treasureDropMultiplier?: number;
  upgradeChoiceBonus?: number;
}

export interface CharacterBaseStats extends PlayerStatsData {
  damageMultiplier: number;
  weaponDamageMultiplier: number;
  physicalDamageMultiplier: number;
  magicDamageMultiplier: number;
  projectileDamageMultiplier: number;
  auraDamageMultiplier: number;
  orbitDamageMultiplier: number;
  areaDamageMultiplier: number;
  explosionDamageMultiplier: number;
  bossDamageMultiplier: number;
  eliteDamageMultiplier: number;
  critChance: number;
  critDamageMultiplier: number;
  cooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  knockbackPowerMultiplier: number;
  damageTakenMultiplier: number;
  armorFlat: number;
  dodgeChance: number;
  healingMultiplier: number;
  shieldGainMultiplier: number;
  invulnerabilityBonusMs: number;
  expGainMultiplier: number;
  treasureDropMultiplier: number;
  upgradeChoiceBonus: number;
}

export function calculateCharacterBaseStats(
  character: CharacterDefinition,
  level: number,
): CharacterBaseStats {
  const safeLevelOffset = Math.max(0, level - 1);
  const initialStats = character.initialStats;
  const growth = character.growthPerLevel;
  const damageMultiplier = growMultiplier(
    initialStats.damageMultiplier ?? initialStats.weaponDamageMultiplier,
    growth.damageMultiplier ?? growth.weaponDamageMultiplier,
    safeLevelOffset,
  );

  return {
    maxHp: initialStats.maxHp + (growth.maxHp ?? 0) * safeLevelOffset,
    moveSpeed: initialStats.moveSpeed + (growth.moveSpeed ?? 0) * safeLevelOffset,
    pickupRange: initialStats.pickupRange + (growth.pickupRange ?? 0) * safeLevelOffset,
    expMultiplier: initialStats.expMultiplier ?? 1,
    damageMultiplier,
    weaponDamageMultiplier: damageMultiplier,
    physicalDamageMultiplier: growMultiplier(
      initialStats.physicalDamageMultiplier,
      growth.physicalDamageMultiplier,
      safeLevelOffset,
    ),
    magicDamageMultiplier: growMultiplier(
      initialStats.magicDamageMultiplier,
      growth.magicDamageMultiplier,
      safeLevelOffset,
    ),
    projectileDamageMultiplier: growMultiplier(
      initialStats.projectileDamageMultiplier,
      growth.projectileDamageMultiplier,
      safeLevelOffset,
    ),
    auraDamageMultiplier: growMultiplier(
      initialStats.auraDamageMultiplier,
      growth.auraDamageMultiplier,
      safeLevelOffset,
    ),
    orbitDamageMultiplier: growMultiplier(
      initialStats.orbitDamageMultiplier,
      growth.orbitDamageMultiplier,
      safeLevelOffset,
    ),
    areaDamageMultiplier: growMultiplier(
      initialStats.areaDamageMultiplier,
      growth.areaDamageMultiplier,
      safeLevelOffset,
    ),
    explosionDamageMultiplier: growMultiplier(
      initialStats.explosionDamageMultiplier,
      growth.explosionDamageMultiplier,
      safeLevelOffset,
    ),
    bossDamageMultiplier: growMultiplier(
      initialStats.bossDamageMultiplier,
      growth.bossDamageMultiplier,
      safeLevelOffset,
    ),
    eliteDamageMultiplier: growMultiplier(
      initialStats.eliteDamageMultiplier,
      growth.eliteDamageMultiplier,
      safeLevelOffset,
    ),
    critChance: clampChance(growFlat(initialStats.critChance, growth.critChance, safeLevelOffset)),
    critDamageMultiplier: growMultiplier(
      initialStats.critDamageMultiplier,
      growth.critDamageMultiplier,
      safeLevelOffset,
      1.5,
    ),
    cooldownMultiplier: Math.max(
      0.1,
      growMultiplier(initialStats.cooldownMultiplier, growth.cooldownMultiplier, safeLevelOffset),
    ),
    projectileSpeedMultiplier: growMultiplier(
      initialStats.projectileSpeedMultiplier,
      growth.projectileSpeedMultiplier,
      safeLevelOffset,
    ),
    knockbackPowerMultiplier: growMultiplier(
      initialStats.knockbackPowerMultiplier,
      growth.knockbackPowerMultiplier,
      safeLevelOffset,
    ),
    damageTakenMultiplier: Math.max(
      0,
      growMultiplier(
        initialStats.damageTakenMultiplier,
        growth.damageTakenMultiplier,
        safeLevelOffset,
      ),
    ),
    armorFlat: Math.max(0, growFlat(initialStats.armorFlat, growth.armorFlat, safeLevelOffset)),
    dodgeChance: clampChance(growFlat(initialStats.dodgeChance, growth.dodgeChance, safeLevelOffset)),
    healingMultiplier: growMultiplier(
      initialStats.healingMultiplier,
      growth.healingMultiplier,
      safeLevelOffset,
    ),
    shieldGainMultiplier: growMultiplier(
      initialStats.shieldGainMultiplier,
      growth.shieldGainMultiplier,
      safeLevelOffset,
    ),
    invulnerabilityBonusMs: Math.max(
      0,
      growFlat(initialStats.invulnerabilityBonusMs, growth.invulnerabilityBonusMs, safeLevelOffset),
    ),
    expGainMultiplier: growMultiplier(
      initialStats.expGainMultiplier,
      growth.expGainMultiplier,
      safeLevelOffset,
    ),
    treasureDropMultiplier: growMultiplier(
      initialStats.treasureDropMultiplier,
      growth.treasureDropMultiplier,
      safeLevelOffset,
    ),
    upgradeChoiceBonus: Math.max(
      0,
      growFlat(initialStats.upgradeChoiceBonus, growth.upgradeChoiceBonus, safeLevelOffset),
    ),
  };
}

function growMultiplier(
  initialValue: number | undefined,
  growthValue: number | undefined,
  levelOffset: number,
  fallback = 1,
): number {
  return (initialValue ?? fallback) + (growthValue ?? 0) * levelOffset;
}

function growFlat(
  initialValue: number | undefined,
  growthValue: number | undefined,
  levelOffset: number,
): number {
  return (initialValue ?? 0) + (growthValue ?? 0) * levelOffset;
}

function clampChance(value: number): number {
  return Math.max(0, Math.min(1, value));
}
