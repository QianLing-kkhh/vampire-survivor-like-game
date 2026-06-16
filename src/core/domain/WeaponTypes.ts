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

export type WeaponBehaviorType =
  | 'projectile'
  | 'aura'
  | 'orbit'
  | 'arcing'
  | 'homing';

export interface BaseWeaponBehaviorConfig {
  type: WeaponBehaviorType;
}

export interface ProjectileBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'projectile';
  targeting?: 'nearest' | 'directional' | 'random';
  alignToVelocity?: boolean;
  pierceDamageFalloff?: number;
}

export interface AuraBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'aura';
  knockback?: boolean;
  percentMaxHpDamage?: number;
  percentDamageCap?: number;
  elitePercentDamageMultiplier?: number;
  bossPercentDamageMultiplier?: number;
}

export interface OrbitBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'orbit';
  radiusScaleMin?: number;
  radiusScaleMax?: number;
  radiusCycleMs?: number;
}

export interface ArcingBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'arcing';
  trajectory?: 'arc' | 'spiralAccelerating';
  spiralTurns?: number;
  maxSpiralRadius?: number;
  acceleration?: number;
  radialEasePower?: number;
  spiralTravelRange?: number;
  spiralSpeedMultiplier?: number;
  launchProgress?: number;
  startDistance?: number;
  scaleOverLifetime?: {
    enabled?: boolean;
    startScale?: number;
    endScale?: number;
    curve?: 'linear' | 'easeOut';
  };
  hitRadiusOverLifetime?: {
    enabled?: boolean;
    startRadius?: number;
    endRadius?: number;
    curve?: 'linear' | 'easeOut';
  };
}

export interface HomingBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'homing';
  explosionRadius?: number;
  explosionDamageMultiplier?: number;
}

export type WeaponBehaviorConfig =
  | ProjectileBehaviorConfig
  | AuraBehaviorConfig
  | OrbitBehaviorConfig
  | ArcingBehaviorConfig
  | HomingBehaviorConfig;

export type WeaponType = 'projectile' | 'aura' | 'orbit' | 'magic_wand' | 'axe';

export interface WeaponConfig {
  type: WeaponType | string;
  tags?: WeaponTag[];
  behavior?: WeaponBehaviorConfig;
  damage: number;
  cooldown: number;
  projectileSpeed?: number;
  projectileCount?: number;
  spreadAngle?: number;
  pierce?: number;
  radius?: number;
  orbitSpeed?: number;
  orbitCount?: number;
  hitRadius?: number;
  lifetime?: number;
  arcHeight?: number;
  knockbackPower?: number;
  knockbackSpeedFactor?: number;
  knockbackDurationMs?: number;
}
