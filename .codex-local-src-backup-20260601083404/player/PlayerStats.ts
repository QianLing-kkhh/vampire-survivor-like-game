export interface PlayerStatsData {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
}

export class PlayerStats {
  readonly maxHp: number;
  readonly moveSpeed: number;
  readonly pickupRange: number;
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
}
