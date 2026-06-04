export class RunState {
  runSeed = '';
  killCount = 0;
  treasureDropCount = 0;
  treasureOpenCount = 0;
  levelUpUpgradeCount = 0;
  chestUpgradeCount = 0;
  chestEvolutionCount = 0;
  duplicateOrInvalidUpgradeCount = 0;
  skippedLevelUpCount = 0;
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
  endlessTreasureDropCount = 0;
  endlessTreasureOpenCount = 0;
  endlessLeaderboardRank = 0;
  endlessScalingLevel = 0;
  endlessHpMultiplier = 1;
  endlessDamageMultiplier = 1;
  endlessSpeedMultiplier = 1;
  endlessExpMultiplier = 1;
  endlessRewardCount = 0;
  endlessHealCount = 0;
  endlessOverdriveCount = 0;
  endlessGrowthCount = 0;
  endlessPermanentDamageMultiplier = 1;
  endlessMaxOverdriveStacksReached = 0;
  endlessOverdriveActiveTime = 0;
  endlessEnemySlowCount = 0;
  endlessEnemySlowActiveTime = 0;
  endlessShieldGained = 0;
  endlessShieldConsumed = 0;
  endlessShieldRemaining = 0;
  endlessShieldAbsorbedDamage = 0;
  endlessBossSpawnCount = 0;
  endlessBossKillCount = 0;
  endlessBossDamageTakenByPlayer = 0;
  endlessBossDamageDealtToPlayer = 0;
  endlessBossIdsKilled: string[] = [];
  endlessBossIdsSpawned: string[] = [];
  endlessBossSkillHitCount = 0;
  endlessBossSkillUseCount = 0;
  maxSimultaneousEndlessBosses = 0;
  activeEndlessBossCountAtDeath = 0;
  endlessBossSpawnSkippedBySoftCapCount = 0;
  finalExpRequirementMultiplier = 1;
  maxExpRequirementMultiplier = 1;
  endlessLevelUpCount = 0;
  difficultyId = 'normal';
  mutatorIds: string[] = [];
  rulesetId = 'normal';
  private endlessLevelIntervalTotalSeconds = 0;
  private lastEndlessLevelUpTime: number | null = null;

  reset(): void {
    this.runSeed = '';
    this.killCount = 0;
    this.treasureDropCount = 0;
    this.treasureOpenCount = 0;
    this.levelUpUpgradeCount = 0;
    this.chestUpgradeCount = 0;
    this.chestEvolutionCount = 0;
    this.duplicateOrInvalidUpgradeCount = 0;
    this.skippedLevelUpCount = 0;
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
    this.endlessTreasureDropCount = 0;
    this.endlessTreasureOpenCount = 0;
    this.endlessLeaderboardRank = 0;
    this.endlessScalingLevel = 0;
    this.endlessHpMultiplier = 1;
    this.endlessDamageMultiplier = 1;
    this.endlessSpeedMultiplier = 1;
    this.endlessExpMultiplier = 1;
    this.endlessRewardCount = 0;
    this.endlessHealCount = 0;
    this.endlessOverdriveCount = 0;
    this.endlessGrowthCount = 0;
    this.endlessPermanentDamageMultiplier = 1;
    this.endlessMaxOverdriveStacksReached = 0;
    this.endlessOverdriveActiveTime = 0;
    this.endlessEnemySlowCount = 0;
    this.endlessEnemySlowActiveTime = 0;
    this.endlessShieldGained = 0;
    this.endlessShieldConsumed = 0;
    this.endlessShieldRemaining = 0;
    this.endlessShieldAbsorbedDamage = 0;
    this.endlessBossSpawnCount = 0;
    this.endlessBossKillCount = 0;
    this.endlessBossDamageTakenByPlayer = 0;
    this.endlessBossDamageDealtToPlayer = 0;
    this.endlessBossIdsKilled = [];
    this.endlessBossIdsSpawned = [];
    this.endlessBossSkillHitCount = 0;
    this.endlessBossSkillUseCount = 0;
    this.maxSimultaneousEndlessBosses = 0;
    this.activeEndlessBossCountAtDeath = 0;
    this.endlessBossSpawnSkippedBySoftCapCount = 0;
    this.finalExpRequirementMultiplier = 1;
    this.maxExpRequirementMultiplier = 1;
    this.endlessLevelUpCount = 0;
    this.difficultyId = 'normal';
    this.mutatorIds = [];
    this.rulesetId = 'normal';
    this.endlessLevelIntervalTotalSeconds = 0;
    this.lastEndlessLevelUpTime = null;
  }

  setRuleSetInfo(difficultyId: string, mutatorIds: readonly string[], rulesetId: string): void {
    this.difficultyId = difficultyId || 'normal';
    this.mutatorIds = [...mutatorIds];
    this.rulesetId = rulesetId || this.difficultyId;
  }

  setRunSeed(runSeed: string): void {
    this.runSeed = runSeed;
  }

  recordKill(): void {
    this.killCount += 1;

    if (this.endlessStarted) {
      this.endlessEnemyKills += 1;
    }
  }

  recordTreasureDrop(): void {
    this.treasureDropCount += 1;

    if (this.endlessStarted) {
      this.endlessTreasureDropCount += 1;
    }
  }

  recordTreasureOpen(): void {
    this.treasureOpenCount += 1;

    if (this.endlessStarted) {
      this.endlessTreasureOpenCount += 1;
    }
  }

  recordLevelUpUpgrade(upgradeId: string): void {
    this.levelUpUpgradeCount += 1;
    this.upgradePath.push(upgradeId);

    if (this.endlessStarted) {
      this.recordEndlessLevelUp();
    }
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

  recordSkippedLevelUp(): void {
    this.skippedLevelUpCount += 1;
  }

  recordEndlessReward(rewardId: string, source: 'level' | 'chest'): void {
    this.endlessRewardCount += 1;

    if (source === 'chest') {
      const treasureRewardId = `chest:${rewardId}`;
      this.upgradePath.push(treasureRewardId);
      this.treasureUpgradePath.push(treasureRewardId);
      return;
    }

    this.upgradePath.push(`endless:${rewardId.replace(/^endless_/, '')}`);
  }

  recordEndlessHeal(): void {
    this.endlessHealCount += 1;
  }

  recordEndlessOverdrive(): void {
    this.endlessOverdriveCount += 1;
    this.endlessMaxOverdriveStacksReached = Math.max(
      this.endlessMaxOverdriveStacksReached,
      1,
    );
  }

  recordEndlessGrowth(damageMultiplierBonus: number): void {
    this.endlessGrowthCount += 1;
    this.endlessPermanentDamageMultiplier += Math.max(0, damageMultiplierBonus);
  }

  recordEndlessOverdriveActiveTime(seconds: number): void {
    this.endlessOverdriveActiveTime += Math.max(0, seconds);
  }

  recordEndlessEnemySlow(): void {
    this.endlessEnemySlowCount += 1;
  }

  recordEndlessEnemySlowActiveTime(seconds: number): void {
    this.endlessEnemySlowActiveTime += Math.max(0, seconds);
  }

  recordEndlessShieldGained(count: number, remainingStacks: number): void {
    this.endlessShieldGained += Math.max(0, count);
    this.endlessShieldRemaining = Math.max(0, remainingStacks);
  }

  recordEndlessShieldConsumed(incomingDamage: number, remainingStacks: number): void {
    this.endlessShieldConsumed += 1;
    this.endlessShieldAbsorbedDamage += Math.max(0, incomingDamage);
    this.endlessShieldRemaining = Math.max(0, remainingStacks);
  }

  recordEndlessBossSpawn(bossId: string, activeBossCount = 1): void {
    this.endlessBossSpawnCount += 1;
    this.endlessBossIdsSpawned.push(bossId);
    this.recordEndlessBossActiveCount(activeBossCount);
  }

  recordEndlessBossKill(bossId: string): void {
    this.endlessBossKillCount += 1;
    this.endlessBossIdsKilled.push(bossId);
  }

  recordEndlessBossActiveCount(activeBossCount: number): void {
    const safeCount = Math.max(0, activeBossCount);

    this.activeEndlessBossCountAtDeath = safeCount;
    this.maxSimultaneousEndlessBosses = Math.max(
      this.maxSimultaneousEndlessBosses,
      safeCount,
    );
  }

  recordEndlessBossSpawnSkippedBySoftCap(): void {
    this.endlessBossSpawnSkippedBySoftCapCount += 1;
  }

  recordEndlessBossSkillUse(): void {
    this.endlessBossSkillUseCount += 1;
  }

  recordEndlessBossSkillHit(actualDamage: number, incomingDamage: number): void {
    this.endlessBossSkillHitCount += 1;
    this.endlessBossDamageTakenByPlayer += Math.max(0, actualDamage);
    this.endlessBossDamageDealtToPlayer += Math.max(0, incomingDamage);
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
    this.updateEndlessScaling(this.endlessSurvivalTime);
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
    return this.levelUpUpgradeCount
      + this.chestUpgradeCount
      + this.chestEvolutionCount
      + this.endlessRewardCount;
  }

  get averageEndlessLevelIntervalSeconds(): number {
    return this.endlessLevelUpCount > 1
      ? this.endlessLevelIntervalTotalSeconds / (this.endlessLevelUpCount - 1)
      : 0;
  }

  recordExpRequirementMultiplier(multiplier: number): void {
    const safeMultiplier = Math.max(1, multiplier);
    this.finalExpRequirementMultiplier = safeMultiplier;
    this.maxExpRequirementMultiplier = Math.max(
      this.maxExpRequirementMultiplier,
      safeMultiplier,
    );
  }

  private recordEndlessLevelUp(): void {
    this.endlessLevelUpCount += 1;

    if (this.lastEndlessLevelUpTime !== null) {
      this.endlessLevelIntervalTotalSeconds += Math.max(
        0,
        this.endlessSurvivalTime - this.lastEndlessLevelUpTime,
      );
    }

    this.lastEndlessLevelUpTime = this.endlessSurvivalTime;
  }

  private updateEndlessScaling(endlessTimeSeconds: number): void {
    const safeEndlessTime = Math.max(0, endlessTimeSeconds);
    const scalingLevel = Math.floor(safeEndlessTime / 45);
    let hpMultiplier = 1 + scalingLevel * 0.45;
    let damageMultiplier = 1 + scalingLevel * 0.28;

    if (safeEndlessTime >= 900) {
      hpMultiplier *= 1.30;
      damageMultiplier *= 1.20;
    } else if (safeEndlessTime >= 600) {
      hpMultiplier *= 1.15;
      damageMultiplier *= 1.10;
    }

    this.endlessScalingLevel = scalingLevel;
    this.endlessHpMultiplier = hpMultiplier;
    this.endlessDamageMultiplier = damageMultiplier;
    this.endlessSpeedMultiplier = Math.min(1 + scalingLevel * 0.085, 2.2);
    this.endlessExpMultiplier = 1 + scalingLevel * 0.18;
  }
}
