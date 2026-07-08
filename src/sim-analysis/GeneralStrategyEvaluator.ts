import type {
  GeneralStrategyBaselineComparisonEntry,
  GeneralStrategyCandidateStats,
  GeneralStrategyDamageWindowMetrics,
  GeneralStrategyRunRecord,
} from './GeneralStrategySearchReport';

const DAMAGE_WINDOW_SECONDS = 30;
const DAMAGE_WINDOW_MAX_RATIO = 0.15;
const DAMAGE_WINDOW_VIOLATION_PENALTY = 5000;
const DAMAGE_WINDOW_EXCESS_RATIO_PENALTY = 10000;
const FITNESS_EXP_WEIGHT = 1;
const FITNESS_DAMAGE_DEALT_WEIGHT = 0.08;
const FITNESS_BOSS_DAMAGE_DEALT_WEIGHT = 0.18;
const FITNESS_LEVEL_WEIGHT = 80;
const FITNESS_SURVIVAL_WEIGHT = 2;
const FITNESS_BOSS_KILL_RATE_WEIGHT = 2200;
const FITNESS_COMPLETION_RATE_WEIGHT = 800;
const FITNESS_DAMAGE_SAFETY_PENALTY_WEIGHT = 0.08;

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
      || a.candidateId.localeCompare(b.candidateId)
    ));
}

export function generalStrategyAggregateCsv(stats: readonly GeneralStrategyCandidateStats[]): string {
  return [
    'candidateId,strategyVariantId,runs,scenarioCount,bossKillRate,avgExp,medianExp,p10Exp,p90Exp,expStdDev,avgScore,medianScore,p10Score,p90Score,completionRate,earlyGrowthCollapseRate,avgSurvivalTimeSeconds,avgLevel,avgKills,avgDamageDealt,medianDamageDealt,p10DamageDealt,p90DamageDealt,avgBossDamageDealt,medianBossDamageDealt,p10BossDamageDealt,p90BossDamageDealt,avgDamageTaken,damageWindowPassRate,avgDamageWindowViolationCount,avgMaxDamageWindowRatio,damageSafetyPenalty,damageDealtStdDev,scoreStdDev,consistencyScore,generalFitnessScore',
    ...stats.map((row) => [
      row.candidateId,
      row.strategyVariantId,
      row.runs,
      row.scenarioCount,
      row.bossKillRate,
      row.avgExp,
      row.medianExp,
      row.p10Exp,
      row.p90Exp,
      row.expStdDev,
      row.avgScore,
      row.medianScore,
      row.p10Score,
      row.p90Score,
      row.completionRate,
      row.earlyGrowthCollapseRate,
      row.avgSurvivalTimeSeconds,
      row.avgLevel,
      row.avgKills,
      row.avgDamageDealt,
      row.medianDamageDealt,
      row.p10DamageDealt,
      row.p90DamageDealt,
      row.avgBossDamageDealt,
      row.medianBossDamageDealt,
      row.p10BossDamageDealt,
      row.p90BossDamageDealt,
      row.avgDamageTaken,
      row.damageWindowPassRate,
      row.avgDamageWindowViolationCount,
      row.avgMaxDamageWindowRatio,
      row.damageSafetyPenalty,
      row.damageDealtStdDev,
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
  const strategyFile = baselineStats.find((stats) => stats.candidateId === 'strategy_file');
  const strategyFileFitness = strategyFile?.generalFitnessScore;

  return baselineStats.map((stats) => {
    const delta = roundMetric(stats.generalFitnessScore - balancedFitness);
    const deltaVsStrategyFile = strategyFileFitness === undefined
      ? undefined
      : roundMetric(stats.generalFitnessScore - strategyFileFitness);
    const deltaPctVsStrategyFile = strategyFileFitness === undefined || deltaVsStrategyFile === undefined
      ? undefined
      : strategyFileFitness === 0
        ? 0
        : roundMetric(deltaVsStrategyFile / Math.abs(strategyFileFitness));

    return {
      strategyId: stats.candidateId,
      avgScore: stats.avgScore,
      medianScore: stats.medianScore,
      p10Score: stats.p10Score,
      completionRate: stats.completionRate,
      avgSurvivalTimeSeconds: stats.avgSurvivalTimeSeconds,
      earlyGrowthCollapseRate: stats.earlyGrowthCollapseRate,
      bossKillRate: stats.bossKillRate,
      avgExp: stats.avgExp,
      medianExp: stats.medianExp,
      p10Exp: stats.p10Exp,
      avgDamageDealt: stats.avgDamageDealt,
      medianDamageDealt: stats.medianDamageDealt,
      p10DamageDealt: stats.p10DamageDealt,
      avgBossDamageDealt: stats.avgBossDamageDealt,
      medianBossDamageDealt: stats.medianBossDamageDealt,
      p10BossDamageDealt: stats.p10BossDamageDealt,
      avgDamageTaken: stats.avgDamageTaken,
      damageWindowPassRate: stats.damageWindowPassRate,
      damageSafetyPenalty: stats.damageSafetyPenalty,
      generalFitnessScore: stats.generalFitnessScore,
      deltaVsBalancedDefault: delta,
      deltaPctVsBalancedDefault: balancedFitness === 0
        ? 0
        : roundMetric(delta / Math.abs(balancedFitness)),
      deltaVsStrategyFile,
      deltaPctVsStrategyFile,
    };
  })
    .sort((a, b) => b.generalFitnessScore - a.generalFitnessScore || a.strategyId.localeCompare(b.strategyId))
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));
}

export function baselineComparisonMarkdown(rows: readonly GeneralStrategyBaselineComparisonEntry[]): string {
  const includeStrategyFileDelta = rows.some((row) => row.deltaVsStrategyFile !== undefined);
  const header = includeStrategyFileDelta
    ? '| Rank | Strategy | Boss Kill | Avg Exp | Median Exp | P10 Exp | Avg Damage Dealt | Avg Boss Damage | Avg Score | Completion | Early Collapse | Damage Window Pass | Damage Taken | Fitness | Delta vs Balanced | Delta Pct | Delta vs Strategy File | Delta Pct vs Strategy File |'
    : '| Rank | Strategy | Boss Kill | Avg Exp | Median Exp | P10 Exp | Avg Damage Dealt | Avg Boss Damage | Avg Score | Completion | Early Collapse | Damage Window Pass | Damage Taken | Fitness | Delta vs Balanced | Delta Pct |';
  const separator = includeStrategyFileDelta
    ? '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
    : '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';
  const lines = [
    '# General Strategy Baseline Comparison',
    '',
    header,
    separator,
  ];

  for (const row of rows) {
    const cells = [
      row.rank,
      row.strategyId,
      row.bossKillRate,
      row.avgExp,
      row.medianExp,
      row.p10Exp,
      row.avgDamageDealt,
      row.avgBossDamageDealt,
      row.avgScore,
      row.completionRate,
      row.earlyGrowthCollapseRate,
      row.damageWindowPassRate,
      row.avgDamageTaken,
      row.generalFitnessScore,
      row.deltaVsBalancedDefault,
      row.deltaPctVsBalancedDefault,
    ];

    if (includeStrategyFileDelta) {
      cells.push(row.deltaVsStrategyFile ?? 0, row.deltaPctVsStrategyFile ?? 0);
    }

    lines.push(`| ${cells.join(' | ')} |`);
  }

  return `${lines.join('\n')}\n`;
}

export function baselineComparisonCsv(rows: readonly GeneralStrategyBaselineComparisonEntry[]): string {
  return [
    'rank,strategyId,bossKillRate,avgExp,medianExp,p10Exp,avgDamageDealt,avgBossDamageDealt,avgScore,completionRate,earlyGrowthCollapseRate,damageWindowPassRate,avgDamageTaken,generalFitnessScore,deltaVsBalancedDefault,deltaPctVsBalancedDefault,deltaVsStrategyFile,deltaPctVsStrategyFile',
    ...rows.map((row) => [
      row.rank,
      row.strategyId,
      row.bossKillRate,
      row.avgExp,
      row.medianExp,
      row.p10Exp,
      row.avgDamageDealt,
      row.avgBossDamageDealt,
      row.avgScore,
      row.completionRate,
      row.earlyGrowthCollapseRate,
      row.damageWindowPassRate,
      row.avgDamageTaken,
      row.generalFitnessScore,
      row.deltaVsBalancedDefault,
      row.deltaPctVsBalancedDefault,
      row.deltaVsStrategyFile ?? '',
      row.deltaPctVsStrategyFile ?? '',
    ].map(escapeCsv).join(',')),
  ].join('\n');
}

function summarizeCandidateRuns(runs: readonly GeneralStrategyRunRecord[]): GeneralStrategyCandidateStats {
  const scores = runs.map((run) => run.result.score);
  const expValues = runs.map((run) => run.result.exp);
  const damageDealtValues = runs.map((run) => run.result.damageDealt);
  const bossDamageDealtValues = runs.map((run) => run.result.bossDamageDealt ?? 0);
  const scoreStdDev = stdDev(scores);
  const expStdDev = stdDev(expValues);
  const damageDealtStdDev = stdDev(damageDealtValues);
  const avgDamageTaken = average(runs.map((run) => run.result.damageTaken));
  const damageSafetyPenalty = average(runs.map((run) => calculateDamageSafetyPenalty(run.damageWindow)));
  const completionRate = runs.filter((run) => run.result.result === 'completed' || run.result.result === 'victory').length / Math.max(1, runs.length);
  const earlyGrowthCollapseRate = runs.filter(isEarlyGrowthCollapse).length / Math.max(1, runs.length);
  const bossKillRate = runs.filter((run) => run.result.bossKilled).length / Math.max(1, runs.length);
  const avgScore = average(scores);
  const medianScore = percentile(scores, 0.5);
  const p10Score = percentile(scores, 0.1);
  const avgExp = average(expValues);
  const medianExp = percentile(expValues, 0.5);
  const p10Exp = percentile(expValues, 0.1);
  const p90Exp = percentile(expValues, 0.9);
  const avgDamageDealt = average(damageDealtValues);
  const medianDamageDealt = percentile(damageDealtValues, 0.5);
  const p10DamageDealt = percentile(damageDealtValues, 0.1);
  const p90DamageDealt = percentile(damageDealtValues, 0.9);
  const avgBossDamageDealt = average(bossDamageDealtValues);
  const medianBossDamageDealt = percentile(bossDamageDealtValues, 0.5);
  const p10BossDamageDealt = percentile(bossDamageDealtValues, 0.1);
  const p90BossDamageDealt = percentile(bossDamageDealtValues, 0.9);
  const generalFitnessScore = calculateGeneralFitnessScore({
    avgExp,
    avgDamageDealt,
    avgBossDamageDealt,
    avgLevel: average(runs.map((run) => run.result.level)),
    avgSurvivalTimeSeconds: average(runs.map((run) => run.result.survivalTimeSeconds)),
    bossKillRate,
    completionRate,
    damageSafetyPenalty,
  });

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
    earlyGrowthCollapseRate: roundMetric(earlyGrowthCollapseRate),
    completionRate: roundMetric(completionRate),
    avgLevel: roundMetric(average(runs.map((run) => run.result.level))),
    avgKills: roundMetric(average(runs.map((run) => run.result.kills))),
    bossKillRate: roundMetric(bossKillRate),
    avgExp: roundMetric(avgExp),
    medianExp: roundMetric(medianExp),
    p10Exp: roundMetric(p10Exp),
    p90Exp: roundMetric(p90Exp),
    expStdDev: roundMetric(expStdDev),
    avgDamageDealt: roundMetric(avgDamageDealt),
    medianDamageDealt: roundMetric(medianDamageDealt),
    p10DamageDealt: roundMetric(p10DamageDealt),
    p90DamageDealt: roundMetric(p90DamageDealt),
    avgBossDamageDealt: roundMetric(avgBossDamageDealt),
    medianBossDamageDealt: roundMetric(medianBossDamageDealt),
    p10BossDamageDealt: roundMetric(p10BossDamageDealt),
    p90BossDamageDealt: roundMetric(p90BossDamageDealt),
    avgDamageTaken: roundMetric(avgDamageTaken),
    damageWindowPassRate: roundMetric(runs.filter((run) => run.damageWindow.passed).length / Math.max(1, runs.length)),
    avgDamageWindowViolationCount: roundMetric(average(runs.map((run) => run.damageWindow.violationCount))),
    avgMaxDamageWindowRatio: roundMetric(average(runs.map((run) => run.damageWindow.maxWindowDamageRatio))),
    damageSafetyPenalty: roundMetric(damageSafetyPenalty),
    damageDealtStdDev: roundMetric(damageDealtStdDev),
    scoreStdDev: roundMetric(scoreStdDev),
    consistencyScore: roundMetric(p10Exp - expStdDev * 0.5),
    generalFitnessScore: roundMetric(generalFitnessScore),
  };
}

function isEarlyGrowthCollapse(run: GeneralStrategyRunRecord): boolean {
  return run.result.survivalTimeSeconds < 180 && run.result.level <= 6;
}

function calculateGeneralFitnessScore(input: {
  avgExp: number;
  avgDamageDealt: number;
  avgBossDamageDealt: number;
  avgLevel: number;
  avgSurvivalTimeSeconds: number;
  bossKillRate: number;
  completionRate: number;
  damageSafetyPenalty: number;
}): number {
  return input.avgExp * FITNESS_EXP_WEIGHT
    + input.avgDamageDealt * FITNESS_DAMAGE_DEALT_WEIGHT
    + input.avgBossDamageDealt * FITNESS_BOSS_DAMAGE_DEALT_WEIGHT
    + input.avgLevel * FITNESS_LEVEL_WEIGHT
    + input.avgSurvivalTimeSeconds * FITNESS_SURVIVAL_WEIGHT
    + input.bossKillRate * FITNESS_BOSS_KILL_RATE_WEIGHT
    + input.completionRate * FITNESS_COMPLETION_RATE_WEIGHT
    - input.damageSafetyPenalty * FITNESS_DAMAGE_SAFETY_PENALTY_WEIGHT;
}

export function calculateDamageWindowMetrics(result: {
  damageTaken: number;
  durationSeconds: number;
  survivalTimeSeconds: number;
  trace?: readonly {
    timeMs: number;
    damageTaken: number;
    playerHp: number;
    playerMaxHp?: number;
  }[];
}): GeneralStrategyDamageWindowMetrics {
  const trace = result.trace ?? [];

  if (trace.length === 0) {
    const fallbackMaxHp = 100;
    const ratio = result.damageTaken / fallbackMaxHp;
    const excessRatio = Math.max(0, ratio - DAMAGE_WINDOW_MAX_RATIO);

    return {
      windowSeconds: DAMAGE_WINDOW_SECONDS,
      maxDamageRatioLimit: DAMAGE_WINDOW_MAX_RATIO,
      passed: excessRatio === 0,
      violationCount: excessRatio > 0 ? 1 : 0,
      maxWindowDamage: roundMetric(result.damageTaken),
      maxWindowDamageRatio: roundMetric(ratio),
      totalExcessDamage: roundMetric(excessRatio * fallbackMaxHp),
      totalExcessDamageRatio: roundMetric(excessRatio),
    };
  }

  const endSeconds = Math.max(
    Math.min(result.durationSeconds, result.survivalTimeSeconds),
    trace[trace.length - 1].timeMs / 1000,
  );
  let violationCount = 0;
  let maxWindowDamage = 0;
  let maxWindowDamageRatio = 0;
  let totalExcessDamage = 0;
  let totalExcessDamageRatio = 0;

  for (let startSeconds = 0; startSeconds < endSeconds; startSeconds += DAMAGE_WINDOW_SECONDS) {
    const windowEndSeconds = Math.min(startSeconds + DAMAGE_WINDOW_SECONDS, endSeconds);
    const startDamage = readCumulativeDamageAt(trace, startSeconds);
    const endDamage = readCumulativeDamageAt(trace, windowEndSeconds);
    const windowDamage = Math.max(0, endDamage - startDamage);
    const maxHp = readWindowMaxHp(trace, startSeconds, windowEndSeconds);
    const threshold = maxHp * DAMAGE_WINDOW_MAX_RATIO;
    const ratio = maxHp > 0 ? windowDamage / maxHp : 0;
    const excessDamage = Math.max(0, windowDamage - threshold);
    const excessRatio = Math.max(0, ratio - DAMAGE_WINDOW_MAX_RATIO);

    maxWindowDamage = Math.max(maxWindowDamage, windowDamage);
    maxWindowDamageRatio = Math.max(maxWindowDamageRatio, ratio);

    if (excessDamage > 0.0001) {
      violationCount += 1;
      totalExcessDamage += excessDamage;
      totalExcessDamageRatio += excessRatio;
    }
  }

  return {
    windowSeconds: DAMAGE_WINDOW_SECONDS,
    maxDamageRatioLimit: DAMAGE_WINDOW_MAX_RATIO,
    passed: violationCount === 0,
    violationCount,
    maxWindowDamage: roundMetric(maxWindowDamage),
    maxWindowDamageRatio: roundMetric(maxWindowDamageRatio),
    totalExcessDamage: roundMetric(totalExcessDamage),
    totalExcessDamageRatio: roundMetric(totalExcessDamageRatio),
  };
}

function calculateDamageSafetyPenalty(metrics: GeneralStrategyDamageWindowMetrics): number {
  if (metrics.passed) {
    return 0;
  }

  return metrics.violationCount * DAMAGE_WINDOW_VIOLATION_PENALTY
    + metrics.totalExcessDamageRatio * DAMAGE_WINDOW_EXCESS_RATIO_PENALTY;
}

function readCumulativeDamageAt(
  trace: readonly { timeMs: number; damageTaken: number }[],
  seconds: number,
): number {
  if (seconds <= 0) {
    return 0;
  }

  const targetMs = seconds * 1000;
  let previous = trace[0];

  for (const point of trace) {
    if (point.timeMs > targetMs) {
      return previous.damageTaken;
    }

    previous = point;
  }

  return previous.damageTaken;
}

function readWindowMaxHp(
  trace: readonly { timeMs: number; playerHp: number; playerMaxHp?: number }[],
  startSeconds: number,
  endSeconds: number,
): number {
  const startMs = startSeconds * 1000;
  const endMs = endSeconds * 1000;
  const values = trace
    .filter((point) => point.timeMs > startMs && point.timeMs <= endMs)
    .map((point) => point.playerMaxHp ?? Math.max(1, point.playerHp));

  if (values.length === 0) {
    const nearest = trace.find((point) => point.timeMs >= startMs) ?? trace[trace.length - 1];

    return nearest.playerMaxHp ?? Math.max(1, nearest.playerHp);
  }

  return Math.max(1, ...values);
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
