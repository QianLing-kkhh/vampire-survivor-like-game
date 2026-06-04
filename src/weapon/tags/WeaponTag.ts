export type BuiltInWeaponTag =
  | 'projectile'
  | 'aura'
  | 'orbit'
  | 'melee'
  | 'magic'
  | 'physical'
  | 'explosive'
  | 'pierce'
  | 'homing'
  | 'arcing'
  | 'spiral'
  | 'knockback'
  | 'control'
  | 'area'
  | 'evolved'
  | 'base'
  | 'defensive'
  | 'sustain';

export type WeaponTag = BuiltInWeaponTag | string;

export const BUILT_IN_WEAPON_TAGS: readonly BuiltInWeaponTag[] = [
  'projectile',
  'aura',
  'orbit',
  'melee',
  'magic',
  'physical',
  'explosive',
  'pierce',
  'homing',
  'arcing',
  'spiral',
  'knockback',
  'control',
  'area',
  'evolved',
  'base',
  'defensive',
  'sustain',
];
