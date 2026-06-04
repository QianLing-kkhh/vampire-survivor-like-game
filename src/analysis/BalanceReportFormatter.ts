import { BalanceReport } from './BalanceReport';

export class BalanceReportFormatter {
  format(report: BalanceReport): string {
    return [
      '# Playtest Balance Report',
      '',
      '## Data Overview',
      `- Total runs: ${report.totalRuns}`,
      `- Schema/content groups: ${report.schemaGroups.length}`,
      ...report.schemaGroups.map((group) => (
        `  - schema=${group.csvSchemaVersion}, contentHash=${this.shortHash(group.contentHash)}: ${group.runCount} runs`
      )),
      '',
      '## Normal Mode',
      `- Victory: ${report.victory.victoryCount}`,
      `- GameOver: ${report.victory.gameOverCount}`,
      `- Victory rate: ${this.percent(report.victory.victoryRate)}`,
      `- Average survival time: ${this.duration(report.averageSurvivalTime)}`,
      `- Average final level: ${this.number(report.averageFinalLevel)}`,
      `- Average kills: ${this.number(report.averageKillCount)}`,
      `- Evolution rate: ${this.percent(report.evolutionRate)}`,
      `- Death time distribution: ${this.formatBuckets(report.deathTimeBuckets)}`,
      '',
      '## Boss Phase',
      `- Boss spawn rate: ${this.percent(report.boss.bossSpawnRate)}`,
      `- Boss kill rate: ${this.percent(report.boss.bossKillRate)}`,
      `- Boss dash hit rate: ${this.percent(report.boss.bossDashHitRate)}`,
      `- Average boss phase damage: ${this.number(report.boss.averageBossPhaseDamage)}`,
      '',
      '## Endless Mode',
      `- Endless entry rate: ${this.percent(report.endless.endlessStartedRate)}`,
      `- Average endless survival: ${this.duration(report.endless.averageEndlessSurvivalTime)}`,
      `- Max endless survival: ${this.duration(report.endless.maxEndlessSurvivalTime)}`,
      `- Average endless rewards: ${this.number(report.endless.averageEndlessRewardCount)}`,
      `- Average endless level interval: ${this.duration(report.endless.averageEndlessLevelIntervalSeconds)}`,
      `- Reward usage: ${this.formatRecord(report.endless.rewardBreakdown)}`,
      '',
      '## Treasures',
      `- Average drops: ${this.number(report.treasure.averageTreasureDrops)}`,
      `- Average opens: ${this.number(report.treasure.averageTreasureOpens)}`,
      `- Average endless drops: ${this.number(report.treasure.averageEndlessTreasureDrops)}`,
      `- Average endless opens: ${this.number(report.treasure.averageEndlessTreasureOpens)}`,
      '',
      '## Weapons',
      ...this.formatWeapons(report),
      '',
      '## Warnings',
      ...(report.warnings.length === 0 ? ['- None'] : report.warnings.map((warning) => `- ${warning}`)),
      '',
      '## Suggested Checks',
      ...report.suggestedChecks.map((check) => `- ${check}`),
    ].join('\n');
  }

  private formatWeapons(report: BalanceReport): string[] {
    if (report.weapons.length === 0) {
      return ['- No weapon damage stats found.'];
    }

    return report.weapons
      .slice(0, 12)
      .map((weapon) => (
        `- ${weapon.weaponId}: ${Math.round(weapon.totalDamage)} damage (${this.percent(weapon.damageShare)})`
      ));
  }

  private percent(value: number | null): string {
    return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
  }

  private number(value: number | null): string {
    return value === null ? 'n/a' : value.toFixed(1);
  }

  private duration(value: number | null): string {
    if (value === null) {
      return 'n/a';
    }

    const seconds = Math.max(0, Math.round(value));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private shortHash(value: string): string {
    return value.length > 12 ? value.slice(0, 12) : value;
  }

  private formatBuckets(buckets: Record<string, number>): string {
    const entries = Object.entries(buckets);
    return entries.length === 0
      ? 'n/a'
      : entries.map(([key, value]) => `${key}=${value}`).join(', ');
  }

  private formatRecord(record: Record<string, number>): string {
    return Object.entries(record)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  }
}
