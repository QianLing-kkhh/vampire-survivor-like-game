import { WeaponTag } from '../weapon/tags/WeaponTag';
import { WeaponTagQuery } from '../weapon/tags/WeaponTagQuery';

import { DamageType } from './DamageType';
import { HitResult } from './HitResult';

export interface DamageCalculationModifiers {
  damageMultiplier?: number;
  physicalDamageMultiplier?: number;
  magicDamageMultiplier?: number;
  projectileDamageMultiplier?: number;
  auraDamageMultiplier?: number;
  orbitDamageMultiplier?: number;
  areaDamageMultiplier?: number;
  explosionDamageMultiplier?: number;
  bossDamageMultiplier?: number;
  eliteDamageMultiplier?: number;
  critDamageMultiplier?: number;
}

export interface DamageTargetContext {
  enemyId: string;
  isBoss: boolean;
  isElite: boolean;
  isMiniBoss: boolean;
  isEndlessBoss: boolean;
}

export interface TaggedDamageCalculationOptions {
  damageType?: DamageType;
  isCritical?: boolean;
  tags?: readonly WeaponTag[];
  modifiers?: DamageCalculationModifiers;
  targetContext?: DamageTargetContext;
}

export class DamageCalculator {
  calculateDamage(
    baseDamage: number,
    damageType: DamageType = DamageType.Normal,
    isCritical = false,
  ): HitResult {
    return {
      damage: baseDamage,
      isCritical,
      damageType,
    };
  }

  calculateTaggedDamage(
    baseDamage: number,
    options: TaggedDamageCalculationOptions = {},
  ): HitResult {
    const damageType = options.damageType ?? DamageType.Normal;
    const isCritical = options.isCritical ?? false;
    const damage = baseDamage
      * this.getTagDamageMultiplier(options.tags, options.modifiers)
      * this.getTargetDamageMultiplier(options.targetContext, options.modifiers)
      * (isCritical ? (options.modifiers?.critDamageMultiplier ?? 1.5) : 1);

    return {
      damage,
      isCritical,
      damageType,
    };
  }

  getTagDamageMultiplier(
    tags: readonly WeaponTag[] | undefined,
    modifiers: DamageCalculationModifiers | undefined,
  ): number {
    if (!modifiers) {
      return 1;
    }

    let multiplier = modifiers.damageMultiplier ?? 1;

    if (WeaponTagQuery.hasTag(tags, 'physical')) {
      multiplier *= modifiers.physicalDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'magic')) {
      multiplier *= modifiers.magicDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'projectile')) {
      multiplier *= modifiers.projectileDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'aura')) {
      multiplier *= modifiers.auraDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'orbit')) {
      multiplier *= modifiers.orbitDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'area')) {
      multiplier *= modifiers.areaDamageMultiplier ?? 1;
    }

    if (WeaponTagQuery.hasTag(tags, 'explosive')) {
      multiplier *= modifiers.explosionDamageMultiplier ?? 1;
    }

    return multiplier;
  }

  getTargetDamageMultiplier(
    targetContext: DamageTargetContext | undefined,
    modifiers: DamageCalculationModifiers | undefined,
  ): number {
    if (!targetContext || !modifiers) {
      return 1;
    }

    if (targetContext.isBoss || targetContext.isEndlessBoss) {
      return modifiers.bossDamageMultiplier ?? 1;
    }

    if (targetContext.isElite || targetContext.isMiniBoss) {
      return modifiers.eliteDamageMultiplier ?? 1;
    }

    return 1;
  }
}
