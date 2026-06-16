export type PassiveEffectStat =
  | 'damageMultiplier'
  | 'cooldownMultiplier'
  | 'projectileSpeedMultiplier'
  | 'knockbackPowerMultiplier'
  | 'treasureDropBonus';

export interface PassiveEffectScope {
  all?: boolean;
  tags?: string[];
  weaponIds?: string[];
}

export interface PassiveEffectDefinition {
  stat: PassiveEffectStat;
  valuePerLevel: number;
  operation?: 'add' | 'multiply';
  scope?: PassiveEffectScope;
}

export interface PassiveItem {
  id: string;
  name: string;
  description: string;
  maxLevel?: number;
  effects?: readonly PassiveEffectDefinition[];
}

export interface PassiveLevel {
  id: string;
  name: string;
  level: number;
}

export interface PassiveEffects {
  damageMultiplier: number;
  cooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  knockbackPowerMultiplier: number;
  treasureDropBonus: number;
  scopedWeaponModifiers: PassiveWeaponModifier[];
}

export interface PassiveWeaponModifier {
  scope: PassiveEffectScope;
  damageMultiplier?: number;
  cooldownMultiplier?: number;
  projectileSpeedMultiplier?: number;
  knockbackPowerMultiplier?: number;
}
