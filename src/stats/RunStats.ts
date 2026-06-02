export interface KeyValueStat {
  key: string;
  value: number;
}

export interface RunStatsSummary {
  damageTaken: number;
  lowestHp: number;
  weaponDamageStats: KeyValueStat[];
  weaponHitStats: KeyValueStat[];
  weaponKillStats: KeyValueStat[];
  upgradeCountStats: KeyValueStat[];
}

export class RunStats {
  private damageTakenTotal = 0;
  private lowestHpValue: number;
  private readonly weaponDamage = new Map<string, number>();
  private readonly weaponHits = new Map<string, number>();
  private readonly weaponKills = new Map<string, number>();
  private readonly upgradeCounts = new Map<string, number>();

  constructor(initialHp = Number.POSITIVE_INFINITY) {
    this.lowestHpValue = initialHp;
  }

  recordDamageTaken(amount: number, currentHp: number): void {
    const actualAmount = Math.max(0, amount);

    if (actualAmount <= 0) {
      return;
    }

    this.damageTakenTotal += actualAmount;
    this.lowestHpValue = Math.min(this.lowestHpValue, currentHp);
  }

  recordWeaponDamage(weaponId: string, damage: number): void {
    this.increment(this.weaponDamage, weaponId, Math.max(0, damage));
  }

  recordWeaponHit(weaponId: string): void {
    this.increment(this.weaponHits, weaponId, 1);
  }

  recordWeaponKill(weaponId: string): void {
    this.increment(this.weaponKills, weaponId, 1);
  }

  recordUpgrade(upgradeId: string): void {
    this.increment(this.upgradeCounts, upgradeId, 1);
  }

  getSummary(): RunStatsSummary {
    return {
      damageTaken: this.damageTakenTotal,
      lowestHp: Number.isFinite(this.lowestHpValue) ? this.lowestHpValue : 0,
      weaponDamageStats: this.toStats(this.weaponDamage),
      weaponHitStats: this.toStats(this.weaponHits),
      weaponKillStats: this.toStats(this.weaponKills),
      upgradeCountStats: this.toStats(this.upgradeCounts),
    };
  }

  private increment(stats: Map<string, number>, key: string, amount: number): void {
    if (amount <= 0) {
      return;
    }

    stats.set(key, (stats.get(key) ?? 0) + amount);
  }

  private toStats(stats: Map<string, number>): KeyValueStat[] {
    return [...stats.entries()].map(([key, value]) => ({ key, value }));
  }
}
