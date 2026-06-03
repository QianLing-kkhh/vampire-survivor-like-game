export class RunState {
  killCount = 0;
  treasureDropCount = 0;
  treasureOpenCount = 0;
  levelUpUpgradeCount = 0;
  chestUpgradeCount = 0;
  chestEvolutionCount = 0;
  duplicateOrInvalidUpgradeCount = 0;
  upgradePath: string[] = [];
  treasureUpgradePath: string[] = [];
  evolutionPath: string[] = [];
  evolutionTime: number | null = null;
  bossPhaseDamageTaken = 0;
  bossPhaseLowestHp = 0;
  bossPhaseKills = 0;
  bossDashCount = 0;
  bossDashHitCount = 0;
  endlessMode = false;
  endlessStarted = false;
  endlessStartTime = 0;
  endlessSurvivalTime = 0;
  endlessBestUpdated = false;
  endlessEnemyKills = 0;
  endlessDamageTaken = 0;
  endlessLeaderboardRank = 0;

  reset(): void {
    this.killCount = 0;
    this.treasureDropCount = 0;
    this.treasureOpenCount = 0;
    this.levelUpUpgradeCount = 0;
    this.chestUpgradeCount = 0;
    this.chestEvolutionCount = 0;
    this.duplicateOrInvalidUpgradeCount = 0;
    this.upgradePath = [];
    this.treasureUpgradePath = [];
    this.evolutionPath = [];
    this.evolutionTime = null;
    this.bossPhaseDamageTaken = 0;
    this.bossPhaseLowestHp = 0;
    this.bossPhaseKills = 0;
    this.bossDashCount = 0;
    this.bossDashHitCount = 0;
    this.endlessMode = false;
    this.endlessStarted = false;
    this.endlessStartTime = 0;
    this.endlessSurvivalTime = 0;
    this.endlessBestUpdated = false;
    this.endlessEnemyKills = 0;
    this.endlessDamageTaken = 0;
    this.endlessLeaderboardRank = 0;
  }

  recordKill(): void {
    this.killCount += 1;

    if (this.endlessStarted) {
      this.endlessEnemyKills += 1;
    }
  }

  recordTreasureDrop(): void {
    this.treasureDropCount += 1;
  }

  recordTreasureOpen(): void {
    this.treasureOpenCount += 1;
  }

  recordLevelUpUpgrade(upgradeId: string): void {
    this.levelUpUpgradeCount += 1;
    this.upgradePath.push(upgradeId);
  }

  recordChestUpgrade(upgradeId: string): void {
    const treasureUpgradeId = `chest:${upgradeId}`;

    this.chestUpgradeCount += 1;
    this.upgradePath.push(treasureUpgradeId);
    this.treasureUpgradePath.push(treasureUpgradeId);
  }

  recordEvolution(baseWeaponId: string, evolvedWeaponId: string, timeSeconds: number): void {
    const evolutionId = `evolve:${baseWeaponId}->${evolvedWeaponId}`;

    this.evolutionTime ??= timeSeconds;
    this.chestEvolutionCount += 1;
    this.upgradePath.push(evolutionId);
    this.evolutionPath.push(evolutionId);
  }

  recordInvalidUpgrade(): void {
    this.duplicateOrInvalidUpgradeCount += 1;
  }

  recordBossDash(): void {
    this.bossDashCount += 1;
  }

  recordBossDashHit(): void {
    this.bossDashHitCount += 1;
  }

  recordBossPhaseDamage(damage: number, currentHp: number): void {
    this.bossPhaseDamageTaken += Math.max(0, damage);
    this.bossPhaseLowestHp = this.bossPhaseLowestHp === 0
      ? currentHp
      : Math.min(this.bossPhaseLowestHp, currentHp);
  }

  startEndless(gameTimeSeconds: number): void {
    if (this.endlessStarted) {
      return;
    }

    this.endlessMode = true;
    this.endlessStarted = true;
    this.endlessStartTime = gameTimeSeconds;
    this.endlessSurvivalTime = 0;
  }

  updateEndlessTime(gameTimeSeconds: number): void {
    if (!this.endlessStarted) {
      return;
    }

    this.endlessSurvivalTime = Math.max(0, gameTimeSeconds - this.endlessStartTime);
  }

  recordEndlessDamage(damage: number): void {
    if (!this.endlessStarted) {
      return;
    }

    this.endlessDamageTaken += Math.max(0, damage);
  }

  recordEndlessLeaderboardRank(rank: number | null): void {
    this.endlessLeaderboardRank = rank ?? 0;
    this.endlessBestUpdated = rank !== null;
  }

  recordBossPhaseKill(): void {
    this.bossPhaseKills += 1;
  }

  setBossPhaseInitialHp(currentHp: number): void {
    this.bossPhaseLowestHp = currentHp;
  }

  get totalUpgradeCount(): number {
    return this.levelUpUpgradeCount + this.chestUpgradeCount;
  }

  get totalRewardCount(): number {
    return this.levelUpUpgradeCount + this.chestUpgradeCount + this.chestEvolutionCount;
  }
}
