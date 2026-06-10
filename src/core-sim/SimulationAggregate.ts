import type { SimulationResult } from './SimulationResult';

export interface SimulationAggregateGroup {
  key: string;
  runCount: number;
  resultCounts: Record<string, number>;
  completedRate: number;
  victoryRate: number;
  gameOverRate: number;
  averageSurvivalTimeSeconds: number;
  averageScore: number;
  averageKills: number;
  averageLevel: number;
  averageDamageTaken: number;
  averageDamageDealt: number;
}

export interface SimulationAggregateReport {
  schemaVersion: 1;
  totalRuns: number;
  groups: SimulationAggregateGroup[];
}

export function aggregateSimulationResults(results: readonly SimulationResult[]): SimulationAggregateReport {
  const grouped = new Map<string, SimulationResult[]>();

  for (const result of results) {
    const key = [
      result.presetId ?? 'single',
      result.strategyProfileId,
      result.characterId,
      result.stageId,
      result.mapId,
      result.difficultyId,
      result.durationSeconds,
    ].join('|');
    const bucket = grouped.get(key) ?? [];

    bucket.push(result);
    grouped.set(key, bucket);
  }

  return {
    schemaVersion: 1,
    totalRuns: results.length,
    groups: Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, bucket]) => createGroup(key, bucket)),
  };
}

export function aggregateToMarkdown(report: SimulationAggregateReport): string {
  const lines = [
    '# Headless Simulation Aggregate',
    '',
    `Total runs: ${report.totalRuns}`,
    '',
    '| Group | Runs | Completed | Victory | Game Over | Avg Survival | Avg Score | Avg Kills | Avg Level | Avg Damage Taken |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];

  for (const group of report.groups) {
    lines.push([
      group.key,
      group.runCount,
      formatRate(group.completedRate),
      formatRate(group.victoryRate),
      formatRate(group.gameOverRate),
      group.averageSurvivalTimeSeconds.toFixed(2),
      group.averageScore.toFixed(2),
      group.averageKills.toFixed(2),
      group.averageLevel.toFixed(2),
      group.averageDamageTaken.toFixed(2),
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  return `${lines.join('\n')}\n`;
}

function createGroup(key: string, results: readonly SimulationResult[]): SimulationAggregateGroup {
  const resultCounts: Record<string, number> = {};

  for (const result of results) {
    resultCounts[result.result] = (resultCounts[result.result] ?? 0) + 1;
  }

  return {
    key,
    runCount: results.length,
    resultCounts,
    completedRate: rate(resultCounts.completed ?? 0, results.length),
    victoryRate: rate(resultCounts.victory ?? 0, results.length),
    gameOverRate: rate(resultCounts.gameOver ?? 0, results.length),
    averageSurvivalTimeSeconds: average(results, (result) => result.survivalTimeSeconds),
    averageScore: average(results, (result) => result.score),
    averageKills: average(results, (result) => result.kills),
    averageLevel: average(results, (result) => result.level),
    averageDamageTaken: average(results, (result) => result.damageTaken),
    averageDamageDealt: average(results, (result) => result.damageDealt),
  };
}

function average(results: readonly SimulationResult[], getValue: (result: SimulationResult) => number): number {
  if (results.length === 0) {
    return 0;
  }

  return results.reduce((sum, result) => sum + getValue(result), 0) / results.length;
}

function rate(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
