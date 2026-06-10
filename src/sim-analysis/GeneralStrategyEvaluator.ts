import type { GeneralStrategyBaselineComparisonEntry, GeneralStrategyCandidateStats, GeneralStrategyRunRecord } from './GeneralStrategySearchReport';

export function aggregateGeneralStrategyRuns(
  runs: readonly GeneralStrategyRunRecord[],
): GeneralStrategyCandidateStats[] {
  const byCandidate = new Map<string, GeneralStrategyRunRecord[]>();

  for (const run of runs) {
    const rows = byCandidate.get(run.candidateId) ?? [];
    rows.push(run);
    byCandidate.set(run.candidateId, rows);
  }

  return Array.from(byCandidate.values())
    .map(summarizeCandidateRuns)
    .sort((a, b) => (
      b.generalFitnessScore - a.generalFitnessScore
      || b.avgScore - a.avgScore
      || a.candidateId.localeCompare(b.candidateId)
    ));
}

export function generalStrategyAggregateCsv(stats: readonly GeneralStrategyCandidateStats[]): string {
  return [
    'candidateId,strategyVariantId,runs,scenarioCount,avgScore,medianScore,p10Score,p90Score,completionRate,avgSurvivalTimeSeconds,avgLevel,avgKills,avgDamageTaken,scoreStdDev,consistencyScore,generalFitnessScore',
    ...stats.map((row) => [
      row.candidateId,
      row.strategyVariantId,
      row.runs,
      row.scenarioCount,
      row.avgScore,
      row.medianScore,
      row.p10Score,
      row.p90Score,
      row.completionRate,
      row.avgSurvivalTimeSeconds,
      row.avgLevel,
      row.avgKills,
      row.avgDamageTaken,
      row.scoreStdDev,
      row.consistencyScore,
      row.generalFitnessScore,
    ].map(escapeCsv).join(',')),
  ].join('\n');
}

export function createBaselineComparison(
  baselineStats: readonly GeneralStrategyCandidateStats[],
): GeneralStrategyBaselineComparisonEntry[] {
  const balanced = baselineStats.find((stats) => stats.candidateId === 'balanced_default');
  const balancedFitness = balanced?.generalFitnessScore ?? 0;

  return baselineStats.map((stats) => {
    const delta = roundMetric(stats.generalFitnessScore - balancedFitness);

    return {
      strategyId: stats.candidateId,
      avgScore: stats.avgScore,
      medianScore: stats.medianScore,
      p10Score: stats.p10Score,
      completionRate: stats.completionRate,
      avgSurvivalTimeSeconds: stats.avgSurvivalTimeSeconds,
      avgDamageTaken: stats.avgDamageTaken,
      generalFitnessScore: stats.generalFitnessScore,
      deltaVsBalancedDefault: delta,
      deltaPctVsBalancedDefault: balancedFitness === 0
        ? 0
        : roundMetric(delta / Math.abs(balancedFitness)),
    };
  }).sort((a, b) => b.generalFitnessScore - a.generalFitnessScore || a.strategyId.localeCompare(b.strategyId));
}

export function baselineComparisonMarkdown(rows: readonly GeneralStrategyBaselineComparisonEntry[]): string {
  const lines = [
    '# General Strategy Baseline Comparison',
    '',
    '| Strategy | Avg Score | Median | P10 | Completion | Damage Taken | Fitness | Delta vs Balanced | Delta Pct |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of rows) {
    lines.push(`| ${row.strategyId} | ${row.avgScore} | ${row.medianScore} | ${row.p10Score} | ${row.completionRate} | ${row.avgDamageTaken} | ${row.generalFitnessScore} | ${row.deltaVsBalancedDefault} | ${row.deltaPctVsBalancedDefault} |`);
  }

  return `${lines.join('\n')}\n`;
}

function summarizeCandidateRuns(runs: readonly GeneralStrategyRunRecord[]): GeneralStrategyCandidateStats {
  const scores = runs.map((run) => run.result.score);
  const scoreStdDev = stdDev(scores);
  const avgDamageTaken = average(runs.map((run) => run.result.damageTaken));
  const completionRate = runs.filter((run) => run.result.result === 'completed' || run.result.result === 'victory').length / Math.max(1, runs.length);
  const avgScore = average(scores);
  const medianScore = percentile(scores, 0.5);
  const p10Score = percentile(scores, 0.1);
  const generalFitnessScore = (
    avgScore * 1.0
    + medianScore * 0.5
    + p10Score * 0.8
    + completionRate * 1000
    - scoreStdDev * 0.2
    - avgDamageTaken * 2.0
  );

  return {
    candidateId: runs[0]?.candidateId ?? '',
    strategyVariantId: runs[0]?.strategyVariantId ?? '',
    strategyProfileHash: runs[0]?.strategyProfileHash ?? '',
    runs: runs.length,
    scenarioCount: new Set(runs.map((run) => run.scenario.scenarioId)).size,
    avgScore: roundMetric(avgScore),
    medianScore: roundMetric(medianScore),
    p10Score: roundMetric(p10Score),
    p90Score: roundMetric(percentile(scores, 0.9)),
    minScore: roundMetric(scores.length > 0 ? Math.min(...scores) : 0),
    maxScore: roundMetric(scores.length > 0 ? Math.max(...scores) : 0),
    avgSurvivalTimeSeconds: roundMetric(average(runs.map((run) => run.result.survivalTimeSeconds))),
    completionRate: roundMetric(completionRate),
    avgLevel: roundMetric(average(runs.map((run) => run.result.level))),
    avgKills: roundMetric(average(runs.map((run) => run.result.kills))),
    avgDamageTaken: roundMetric(avgDamageTaken),
    scoreStdDev: roundMetric(scoreStdDev),
    consistencyScore: roundMetric(p10Score - scoreStdDev * 0.5),
    generalFitnessScore: roundMetric(generalFitnessScore),
  };
}

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return 0;
  }

  if (sorted.length === 1) {
    return sorted[0];
  }

  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: readonly number[]): number {
  const avg = average(values);
  const variance = values.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / Math.max(1, values.length);

  return Math.sqrt(variance);
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function escapeCsv(value: unknown): string {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
