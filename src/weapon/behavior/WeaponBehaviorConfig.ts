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
}

export interface OrbitBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'orbit';
}

export interface ArcingBehaviorConfig extends BaseWeaponBehaviorConfig {
  type: 'arcing';
  trajectory?: 'arc' | 'spiralAccelerating';
  spiralTurns?: number;
  maxSpiralRadius?: number;
  acceleration?: number;
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
