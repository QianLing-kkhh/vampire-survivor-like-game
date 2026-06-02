export interface PlayerStatsData {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
}

export class PlayerStats {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  readonly expMultiplier: number;

  constructor(data: PlayerStatsData) {
    this.maxHp = data.maxHp;
    this.moveSpeed = data.moveSpeed;
    this.pickupRange = data.pickupRange;
    this.expMultiplier = data.expMultiplier;
  }

  static fromConfig(data: PlayerStatsData): PlayerStats {
    return new PlayerStats(data);
  }

  increaseMaxHp(rate: number): void {
    this.maxHp = Math.round(this.maxHp * (1 + rate));
  }

  increaseMoveSpeed(rate: number): void {
    this.moveSpeed *= 1 + rate;
  }

  increasePickupRange(rate: number): void {
    this.pickupRange *= 1 + rate;
  }
}
