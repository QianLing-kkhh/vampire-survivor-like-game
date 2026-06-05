export interface PlayerStatsData {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
  weaponDamageMultiplier?: number;
  cooldownMultiplier?: number;
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
  weaponDamageMultiplier: number;
  cooldownMultiplier: number;
  readonly expMultiplier: number;
  readonly acceleration: number;
  readonly deceleration: number;
  private baseMaxHp: number;
  private baseMoveSpeed: number;
  private basePickupRange: number;
  private baseWeaponDamageMultiplier: number;
  private baseCooldownMultiplier: number;
  private maxHpUpgradeMultiplier = 1;
  private moveSpeedUpgradeMultiplier = 1;
  private pickupRangeUpgradeMultiplier = 1;

  constructor(data: PlayerStatsData) {
    this.baseMaxHp = data.maxHp;
    this.baseMoveSpeed = data.moveSpeed;
    this.basePickupRange = data.pickupRange;
    this.baseWeaponDamageMultiplier = data.weaponDamageMultiplier ?? 1;
    this.baseCooldownMultiplier = data.cooldownMultiplier ?? 1;
    this.maxHp = data.maxHp;
    this.moveSpeed = data.moveSpeed;
    this.pickupRange = data.pickupRange;
    this.weaponDamageMultiplier = data.weaponDamageMultiplier ?? 1;
    this.cooldownMultiplier = data.cooldownMultiplier ?? 1;
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
    this.baseWeaponDamageMultiplier = data.weaponDamageMultiplier ?? 1;
    this.baseCooldownMultiplier = data.cooldownMultiplier ?? 1;
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
    this.weaponDamageMultiplier = this.baseWeaponDamageMultiplier;
    this.cooldownMultiplier = this.baseCooldownMultiplier;
  }
}
