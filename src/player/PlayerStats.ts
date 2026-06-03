export interface PlayerStatsData {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
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
  readonly expMultiplier: number;
  readonly acceleration: number;
  readonly deceleration: number;

  constructor(data: PlayerStatsData) {
    this.maxHp = data.maxHp;
    this.moveSpeed = data.moveSpeed;
    this.pickupRange = data.pickupRange;
    this.expMultiplier = data.expMultiplier;
    this.acceleration = data.acceleration ?? 900;
    this.deceleration = data.deceleration ?? 1200;
  }

  static fromConfig(data: PlayerStatsData): PlayerStats {
    return new PlayerStats(data);
  }

  increaseMaxHp(rate: number): void {
    this.maxHp = Math.min(
      this.maxHpLimit,
      Math.round(this.maxHp * (1 + rate)),
    );
  }

  increaseMoveSpeed(rate: number): boolean {
    const previousMoveSpeed = this.moveSpeed;
    this.moveSpeed = Math.min(this.maxMoveSpeed, this.moveSpeed * (1 + rate));

    return this.moveSpeed > previousMoveSpeed;
  }

  increasePickupRange(rate: number): boolean {
    const previousPickupRange = this.pickupRange;
    this.pickupRange = Math.min(this.maxPickupRange, this.pickupRange * (1 + rate));

    return this.pickupRange > previousPickupRange;
  }
}
