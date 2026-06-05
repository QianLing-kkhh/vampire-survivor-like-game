export interface PlayerStatsData {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
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
  acceleration?: number;
  deceleration?: number;
}

export class PlayerStats {
  readonly maxMoveSpeed = 420;
  readonly maxPickupRange = 6.0;
  readonly maxHpLimit = 300;

  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
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
  readonly expMultiplier: number;
  readonly acceleration: number;
  readonly deceleration: number;
  private baseMaxHp: number;
  private baseMoveSpeed: number;
  private basePickupRange: number;
  private baseDamageMultiplier: number;
  private baseWeaponDamageMultiplier: number;
  private basePhysicalDamageMultiplier: number;
  private baseMagicDamageMultiplier: number;
  private baseProjectileDamageMultiplier: number;
  private baseAuraDamageMultiplier: number;
  private baseOrbitDamageMultiplier: number;
  private baseAreaDamageMultiplier: number;
  private baseExplosionDamageMultiplier: number;
  private baseBossDamageMultiplier: number;
  private baseEliteDamageMultiplier: number;
  private baseCritChance: number;
  private baseCritDamageMultiplier: number;
  private baseCooldownMultiplier: number;
  private baseProjectileSpeedMultiplier: number;
  private baseKnockbackPowerMultiplier: number;
  private baseDamageTakenMultiplier: number;
  private baseArmorFlat: number;
  private baseDodgeChance: number;
  private baseHealingMultiplier: number;
  private baseShieldGainMultiplier: number;
  private baseInvulnerabilityBonusMs: number;
  private baseExpGainMultiplier: number;
  private baseTreasureDropMultiplier: number;
  private baseUpgradeChoiceBonus: number;
  private maxHpUpgradeMultiplier = 1;
  private moveSpeedUpgradeMultiplier = 1;
  private pickupRangeUpgradeMultiplier = 1;

  constructor(data: PlayerStatsData) {
    this.baseMaxHp = data.maxHp;
    this.baseMoveSpeed = data.moveSpeed;
    this.basePickupRange = data.pickupRange;
    this.baseDamageMultiplier = this.readMultiplier(data.damageMultiplier);
    this.baseWeaponDamageMultiplier = this.readMultiplier(
      data.weaponDamageMultiplier ?? data.damageMultiplier,
    );
    this.basePhysicalDamageMultiplier = this.readMultiplier(data.physicalDamageMultiplier);
    this.baseMagicDamageMultiplier = this.readMultiplier(data.magicDamageMultiplier);
    this.baseProjectileDamageMultiplier = this.readMultiplier(data.projectileDamageMultiplier);
    this.baseAuraDamageMultiplier = this.readMultiplier(data.auraDamageMultiplier);
    this.baseOrbitDamageMultiplier = this.readMultiplier(data.orbitDamageMultiplier);
    this.baseAreaDamageMultiplier = this.readMultiplier(data.areaDamageMultiplier);
    this.baseExplosionDamageMultiplier = this.readMultiplier(data.explosionDamageMultiplier);
    this.baseBossDamageMultiplier = this.readMultiplier(data.bossDamageMultiplier);
    this.baseEliteDamageMultiplier = this.readMultiplier(data.eliteDamageMultiplier);
    this.baseCritChance = this.readChance(data.critChance);
    this.baseCritDamageMultiplier = this.readMultiplier(data.critDamageMultiplier, 1.5);
    this.baseCooldownMultiplier = this.readMultiplier(data.cooldownMultiplier);
    this.baseProjectileSpeedMultiplier = this.readMultiplier(data.projectileSpeedMultiplier);
    this.baseKnockbackPowerMultiplier = this.readMultiplier(data.knockbackPowerMultiplier);
    this.baseDamageTakenMultiplier = this.readMultiplier(data.damageTakenMultiplier);
    this.baseArmorFlat = this.readFlat(data.armorFlat);
    this.baseDodgeChance = this.readChance(data.dodgeChance);
    this.baseHealingMultiplier = this.readMultiplier(data.healingMultiplier);
    this.baseShieldGainMultiplier = this.readMultiplier(data.shieldGainMultiplier);
    this.baseInvulnerabilityBonusMs = this.readFlat(data.invulnerabilityBonusMs);
    this.baseExpGainMultiplier = this.readMultiplier(data.expGainMultiplier);
    this.baseTreasureDropMultiplier = this.readMultiplier(data.treasureDropMultiplier);
    this.baseUpgradeChoiceBonus = this.readFlat(data.upgradeChoiceBonus);
    this.maxHp = data.maxHp;
    this.moveSpeed = data.moveSpeed;
    this.pickupRange = data.pickupRange;
    this.damageMultiplier = this.baseDamageMultiplier;
    this.weaponDamageMultiplier = this.baseWeaponDamageMultiplier;
    this.physicalDamageMultiplier = this.basePhysicalDamageMultiplier;
    this.magicDamageMultiplier = this.baseMagicDamageMultiplier;
    this.projectileDamageMultiplier = this.baseProjectileDamageMultiplier;
    this.auraDamageMultiplier = this.baseAuraDamageMultiplier;
    this.orbitDamageMultiplier = this.baseOrbitDamageMultiplier;
    this.areaDamageMultiplier = this.baseAreaDamageMultiplier;
    this.explosionDamageMultiplier = this.baseExplosionDamageMultiplier;
    this.bossDamageMultiplier = this.baseBossDamageMultiplier;
    this.eliteDamageMultiplier = this.baseEliteDamageMultiplier;
    this.critChance = this.baseCritChance;
    this.critDamageMultiplier = this.baseCritDamageMultiplier;
    this.cooldownMultiplier = this.baseCooldownMultiplier;
    this.projectileSpeedMultiplier = this.baseProjectileSpeedMultiplier;
    this.knockbackPowerMultiplier = this.baseKnockbackPowerMultiplier;
    this.damageTakenMultiplier = this.baseDamageTakenMultiplier;
    this.armorFlat = this.baseArmorFlat;
    this.dodgeChance = this.baseDodgeChance;
    this.healingMultiplier = this.baseHealingMultiplier;
    this.shieldGainMultiplier = this.baseShieldGainMultiplier;
    this.invulnerabilityBonusMs = this.baseInvulnerabilityBonusMs;
    this.expGainMultiplier = this.baseExpGainMultiplier;
    this.treasureDropMultiplier = this.baseTreasureDropMultiplier;
    this.upgradeChoiceBonus = this.baseUpgradeChoiceBonus;
    this.expMultiplier = data.expMultiplier;
    this.acceleration = data.acceleration ?? 900;
    this.deceleration = data.deceleration ?? 1200;
  }

  static fromConfig(data: PlayerStatsData): PlayerStats {
    return new PlayerStats(data);
  }

  setCharacterBaseStats(data: PlayerStatsData): void {
    this.baseMaxHp = data.maxHp;
    this.baseMoveSpeed = data.moveSpeed;
    this.basePickupRange = data.pickupRange;
    this.baseDamageMultiplier = this.readMultiplier(data.damageMultiplier);
    this.baseWeaponDamageMultiplier = this.readMultiplier(
      data.weaponDamageMultiplier ?? data.damageMultiplier,
    );
    this.basePhysicalDamageMultiplier = this.readMultiplier(data.physicalDamageMultiplier);
    this.baseMagicDamageMultiplier = this.readMultiplier(data.magicDamageMultiplier);
    this.baseProjectileDamageMultiplier = this.readMultiplier(data.projectileDamageMultiplier);
    this.baseAuraDamageMultiplier = this.readMultiplier(data.auraDamageMultiplier);
    this.baseOrbitDamageMultiplier = this.readMultiplier(data.orbitDamageMultiplier);
    this.baseAreaDamageMultiplier = this.readMultiplier(data.areaDamageMultiplier);
    this.baseExplosionDamageMultiplier = this.readMultiplier(data.explosionDamageMultiplier);
    this.baseBossDamageMultiplier = this.readMultiplier(data.bossDamageMultiplier);
    this.baseEliteDamageMultiplier = this.readMultiplier(data.eliteDamageMultiplier);
    this.baseCritChance = this.readChance(data.critChance);
    this.baseCritDamageMultiplier = this.readMultiplier(data.critDamageMultiplier, 1.5);
    this.baseCooldownMultiplier = this.readMultiplier(data.cooldownMultiplier);
    this.baseProjectileSpeedMultiplier = this.readMultiplier(data.projectileSpeedMultiplier);
    this.baseKnockbackPowerMultiplier = this.readMultiplier(data.knockbackPowerMultiplier);
    this.baseDamageTakenMultiplier = this.readMultiplier(data.damageTakenMultiplier);
    this.baseArmorFlat = this.readFlat(data.armorFlat);
    this.baseDodgeChance = this.readChance(data.dodgeChance);
    this.baseHealingMultiplier = this.readMultiplier(data.healingMultiplier);
    this.baseShieldGainMultiplier = this.readMultiplier(data.shieldGainMultiplier);
    this.baseInvulnerabilityBonusMs = this.readFlat(data.invulnerabilityBonusMs);
    this.baseExpGainMultiplier = this.readMultiplier(data.expGainMultiplier);
    this.baseTreasureDropMultiplier = this.readMultiplier(data.treasureDropMultiplier);
    this.baseUpgradeChoiceBonus = this.readFlat(data.upgradeChoiceBonus);
    this.recalculateFinalStats();
  }

  increaseMaxHp(rate: number): void {
    this.maxHpUpgradeMultiplier *= 1 + Math.max(0, rate);
    this.recalculateFinalStats();
  }

  increaseMoveSpeed(rate: number): boolean {
    const previousMoveSpeed = this.moveSpeed;
    this.moveSpeedUpgradeMultiplier *= 1 + Math.max(0, rate);
    this.recalculateFinalStats();

    return this.moveSpeed > previousMoveSpeed;
  }

  increasePickupRange(rate: number): boolean {
    const previousPickupRange = this.pickupRange;
    this.pickupRangeUpgradeMultiplier *= 1 + Math.max(0, rate);
    this.recalculateFinalStats();

    return this.pickupRange > previousPickupRange;
  }

  private recalculateFinalStats(): void {
    this.maxHp = Math.min(
      this.maxHpLimit,
      Math.round(this.baseMaxHp * this.maxHpUpgradeMultiplier),
    );
    this.moveSpeed = Math.min(
      this.maxMoveSpeed,
      this.baseMoveSpeed * this.moveSpeedUpgradeMultiplier,
    );
    this.pickupRange = Math.min(
      this.maxPickupRange,
      this.basePickupRange * this.pickupRangeUpgradeMultiplier,
    );
    this.damageMultiplier = this.baseDamageMultiplier;
    this.weaponDamageMultiplier = this.baseWeaponDamageMultiplier;
    this.physicalDamageMultiplier = this.basePhysicalDamageMultiplier;
    this.magicDamageMultiplier = this.baseMagicDamageMultiplier;
    this.projectileDamageMultiplier = this.baseProjectileDamageMultiplier;
    this.auraDamageMultiplier = this.baseAuraDamageMultiplier;
    this.orbitDamageMultiplier = this.baseOrbitDamageMultiplier;
    this.areaDamageMultiplier = this.baseAreaDamageMultiplier;
    this.explosionDamageMultiplier = this.baseExplosionDamageMultiplier;
    this.bossDamageMultiplier = this.baseBossDamageMultiplier;
    this.eliteDamageMultiplier = this.baseEliteDamageMultiplier;
    this.critChance = this.baseCritChance;
    this.critDamageMultiplier = this.baseCritDamageMultiplier;
    this.cooldownMultiplier = this.baseCooldownMultiplier;
    this.projectileSpeedMultiplier = this.baseProjectileSpeedMultiplier;
    this.knockbackPowerMultiplier = this.baseKnockbackPowerMultiplier;
    this.damageTakenMultiplier = this.baseDamageTakenMultiplier;
    this.armorFlat = this.baseArmorFlat;
    this.dodgeChance = this.baseDodgeChance;
    this.healingMultiplier = this.baseHealingMultiplier;
    this.shieldGainMultiplier = this.baseShieldGainMultiplier;
    this.invulnerabilityBonusMs = this.baseInvulnerabilityBonusMs;
    this.expGainMultiplier = this.baseExpGainMultiplier;
    this.treasureDropMultiplier = this.baseTreasureDropMultiplier;
    this.upgradeChoiceBonus = this.baseUpgradeChoiceBonus;
  }

  private readMultiplier(value: number | undefined, fallback = 1): number {
    return typeof value === 'number' ? value : fallback;
  }

  private readChance(value: number | undefined): number {
    return typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
  }

  private readFlat(value: number | undefined): number {
    return typeof value === 'number' ? value : 0;
  }
}
