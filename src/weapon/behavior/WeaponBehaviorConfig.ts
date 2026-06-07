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
