import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

import type { StrategyPhaseAggregate, StrategyPhaseRunMetrics, StrategySearchPhase } from './StrategyPhaseMetrics';
import type { StrategyWeightCandidate, StrategyWeightLockMap, StrategyWeightRangeMap } from './StrategyWeightCandidate';
import type { RecommendedPhasedStrategy } from './StrategyWeightSearch';

export interface StrategyWeightSearchConfig {
  schemaVersion: 1;
  generatedAt: string;
  presetId?: string;
  phases: StrategySearchPhase[];
  candidates: number;
  seedCount: number;
  durationSeconds: number;
  tickMs: number;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId: string;
  randomSeed: string;
  topN: number;
  searchMode: 'random' | 'centered';
  centerProfilePath?: string;
  centerStrategyId?: string;
  mutationRadius?: number;
  mutationMode?: 'uniform' | 'gaussian';
  optimize?: boolean;
  rounds?: number;
  initialMutationRadius?: number;
  mutationDecay?: number;
  centerStrategyMode?: 'best' | 'top10-average' | 'top10-median' | 'topN-median';
  carryForwardTop?: number;
  locked: StrategyWeightLockMap;
  ranges: StrategyWeightRangeMap;
}

export interface StrategyWeightSearchReport {
  schemaVersion: 1;
  config: StrategyWeightSearchConfig;
  candidates: StrategyWeightCandidate[];
  phaseRuns: StrategyPhaseRunMetrics[];
  phaseAggregate: StrategyPhaseAggregate[];
  topByPhase: Record<string, StrategyPhaseAggregate[]>;
  topWeightDistributionByPhase: StrategyPhaseWeightDistributionReport;
  baselineByPhase: Record<string, StrategyPhaseAggregate | undefined>;
  phasedEvaluation?: StrategyPhasedEvaluationSuiteReport;
  recommendedStrategy: RecommendedPhasedStrategy;
  recommendedStrategies: RecommendedPhasedStrategy[];
}

export interface StrategyWeightDistribution {
  avg: number;
  median: number;
  min: number;
  max: number;
}

export type StrategyPhaseWeightDistributionReport = Record<string, Record<string, StrategyWeightDistribution>>;

export interface StrategyPhasedEvaluationComparison {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  baselineFitnessScore: number;
  phasedFitnessScore: number;
  deltaFitnessScore: number;
  baselineSurvivalRate: number;
  phasedSurvivalRate: number;
  deltaSurvivalRate: number;
  baselineAvgScoreGain: number;
  phasedAvgScoreGain: number;
  deltaAvgScoreGain: number;
  baselineAvgExpGain: number;
  phasedAvgExpGain: number;
  deltaAvgExpGain: number;
  baselineAvgKills: number;
  phasedAvgKills: number;
  deltaAvgKills: number;
  baselineAvgDamageTaken: number;
  phasedAvgDamageTaken: number;
  deltaAvgDamageTaken: number;
  improved: boolean;
}

export interface StrategyPhasedEvaluationReport {
  schemaVersion: 1;
  strategyId: string;
  generationMethod: string;
  baselineCandidateId: string;
  phasedCandidateId: string;
  seeds: string[];
  phaseAggregate: StrategyPhaseAggregate[];
  comparisonByPhase: StrategyPhasedEvaluationComparison[];
  summary: {
    phaseCount: number;
    improvedPhaseCount: number;
    avgDeltaFitnessScore: number;
    totalDeltaFitnessScore: number;
    beatsBaseline: boolean;
  };
}

export interface StrategyPhasedEvaluationRanking {
  rank: number;
  strategyId: string;
  generationMethod: string;
  improvedPhaseCount: number;
  phaseCount: number;
  totalDeltaFitnessScore: number;
  avgDeltaFitnessScore: number;
  beatsBaseline: boolean;
}

export interface StrategyPhasedEvaluationSuiteReport {
  schemaVersion: 1;
  baselineCandidateId: string;
  centerStrategyId?: string;
  seeds: string[];
  bestStrategyId: string;
  bestImprovementOverBaseline: number;
  bestImprovementOverCenter?: number;
  ranking: StrategyPhasedEvaluationRanking[];
  centerEvaluation?: StrategyPhasedEvaluationReport;
  evaluations: StrategyPhasedEvaluationReport[];
}

export function phaseAggregateCsv(aggregates: readonly StrategyPhaseAggregate[]): string {
  return [
    phaseAggregateCsvHeader,
    ...aggregates.map((aggregate) => [
      aggregate.candidateId,
      aggregate.strategyProfileHash,
      aggregate.phaseId,
      aggregate.startSeconds,
      aggregate.endSeconds,
      aggregate.runs,
      aggregate.survivalRate,
      aggregate.avgScoreGain,
      aggregate.avgExpGain,
      aggregate.avgLevelGain,
      aggregate.avgEndLevel,
      aggregate.avgEndExp,
      aggregate.avgEndPlayerHp,
      aggregate.avgEndPlayerHpRatio,
      aggregate.avgKills,
      aggregate.avgDamageDealt,
      aggregate.avgBossDamageDealt,
      aggregate.avgDamageTaken,
      aggregate.avgPickupsCollected,
      aggregate.avgEnemiesSpawned,
      aggregate.bossKillRate,
      aggregate.phaseFitnessScore,
    ].map(escapeCsv).join(',')),
  ].join('\n');
}

export function topByPhaseCsv(topByPhase: Record<string, StrategyPhaseAggregate[]>): string {
  const rows = ['phaseId,rank,candidateId,strategyProfileHash,phaseFitnessScore,survivalRate,avgScoreGain,avgExpGain,avgLevelGain,avgEndLevel,avgEndPlayerHpRatio,avgKills,avgDamageDealt,avgBossDamageDealt,avgDamageTaken,avgPickupsCollected,avgEnemiesSpawned,bossKillRate'];

  for (const phaseId of Object.keys(topByPhase).sort()) {
    topByPhase[phaseId].forEach((aggregate, index) => {
      rows.push([
        phaseId,
        index + 1,
        aggregate.candidateId,
        aggregate.strategyProfileHash,
        aggregate.phaseFitnessScore,
        aggregate.survivalRate,
        aggregate.avgScoreGain,
        aggregate.avgExpGain,
        aggregate.avgLevelGain,
        aggregate.avgEndLevel,
        aggregate.avgEndPlayerHpRatio,
        aggregate.avgKills,
        aggregate.avgDamageDealt,
        aggregate.avgBossDamageDealt,
        aggregate.avgDamageTaken,
        aggregate.avgPickupsCollected,
        aggregate.avgEnemiesSpawned,
        aggregate.bossKillRate,
      ].map(escapeCsv).join(','));
    });
  }

  return rows.join('\n');
}

export function calculateTopWeightDistributionByPhase(input: {
  topByPhase: Record<string, StrategyPhaseAggregate[]>;
  candidates: readonly StrategyWeightCandidate[];
}): StrategyPhaseWeightDistributionReport {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const report: StrategyPhaseWeightDistributionReport = {};

  for (const phaseId of Object.keys(input.topByPhase).sort()) {
    const topCandidates = input.topByPhase[phaseId]
      .map((aggregate) => candidateById.get(aggregate.candidateId))
      .filter((candidate): candidate is StrategyWeightCandidate => Boolean(candidate));
    const valuesByPath = new Map<string, number[]>();

    for (const candidate of topCandidates) {
      for (const row of flattenProfileWeights(getCandidateProfileForDistribution(candidate, phaseId))) {
        const values = valuesByPath.get(row.path) ?? [];
        values.push(row.value);
        valuesByPath.set(row.path, values);
      }
    }

    report[phaseId] = {};

    for (const path of Array.from(valuesByPath.keys()).sort()) {
      report[phaseId][path] = summarizeDistribution(valuesByPath.get(path) ?? []);
    }
  }

  return report;
}

export function createStrategyPhasedEvaluationReport(input: {
  strategyId: string;
  generationMethod: string;
  baselineCandidateId: string;
  phasedCandidateId: string;
  seeds: readonly string[];
  phaseAggregate: readonly StrategyPhaseAggregate[];
  phases: readonly StrategySearchPhase[];
}): StrategyPhasedEvaluationReport {
  const comparisonByPhase = input.phases.map((phase) => {
    const baseline = findAggregate(input.phaseAggregate, input.baselineCandidateId, phase.phaseId);
    const phased = findAggregate(input.phaseAggregate, input.phasedCandidateId, phase.phaseId);
    const deltaFitnessScore = roundMetric(phased.phaseFitnessScore - baseline.phaseFitnessScore);

    return {
      phaseId: phase.phaseId,
      startSeconds: phase.startSeconds,
      endSeconds: phase.endSeconds,
      baselineFitnessScore: baseline.phaseFitnessScore,
      phasedFitnessScore: phased.phaseFitnessScore,
      deltaFitnessScore,
      baselineSurvivalRate: baseline.survivalRate,
      phasedSurvivalRate: phased.survivalRate,
      deltaSurvivalRate: roundMetric(phased.survivalRate - baseline.survivalRate),
      baselineAvgScoreGain: baseline.avgScoreGain,
      phasedAvgScoreGain: phased.avgScoreGain,
      deltaAvgScoreGain: roundMetric(phased.avgScoreGain - baseline.avgScoreGain),
      baselineAvgExpGain: baseline.avgExpGain,
      phasedAvgExpGain: phased.avgExpGain,
      deltaAvgExpGain: roundMetric(phased.avgExpGain - baseline.avgExpGain),
      baselineAvgKills: baseline.avgKills,
      phasedAvgKills: phased.avgKills,
      deltaAvgKills: roundMetric(phased.avgKills - baseline.avgKills),
      baselineAvgDamageTaken: baseline.avgDamageTaken,
      phasedAvgDamageTaken: phased.avgDamageTaken,
      deltaAvgDamageTaken: roundMetric(phased.avgDamageTaken - baseline.avgDamageTaken),
      improved: deltaFitnessScore > 0,
    };
  });
  const totalDeltaFitnessScore = roundMetric(comparisonByPhase.reduce((sum, comparison) => sum + comparison.deltaFitnessScore, 0));
  const phaseCount = comparisonByPhase.length;
  const improvedPhaseCount = comparisonByPhase.filter((comparison) => comparison.improved).length;

  return {
    schemaVersion: 1,
    strategyId: input.strategyId,
    generationMethod: input.generationMethod,
    baselineCandidateId: input.baselineCandidateId,
    phasedCandidateId: input.phasedCandidateId,
    seeds: [...input.seeds],
    phaseAggregate: [...input.phaseAggregate],
    comparisonByPhase,
    summary: {
      phaseCount,
      improvedPhaseCount,
      avgDeltaFitnessScore: roundMetric(totalDeltaFitnessScore / Math.max(1, phaseCount)),
      totalDeltaFitnessScore,
      beatsBaseline: totalDeltaFitnessScore > 0 && improvedPhaseCount >= Math.ceil(phaseCount / 2),
    },
  };
}

export function createStrategyPhasedEvaluationSuiteReport(input: {
  baselineCandidateId: string;
  centerEvaluation?: StrategyPhasedEvaluationReport;
  seeds: readonly string[];
  evaluations: readonly StrategyPhasedEvaluationReport[];
}): StrategyPhasedEvaluationSuiteReport {
  const ranking = input.evaluations
    .map((evaluation) => ({
      rank: 0,
      strategyId: evaluation.strategyId,
      generationMethod: evaluation.generationMethod,
      improvedPhaseCount: evaluation.summary.improvedPhaseCount,
      phaseCount: evaluation.summary.phaseCount,
      totalDeltaFitnessScore: evaluation.summary.totalDeltaFitnessScore,
      avgDeltaFitnessScore: evaluation.summary.avgDeltaFitnessScore,
      beatsBaseline: evaluation.summary.beatsBaseline,
    }))
    .sort((a, b) => (
      Number(b.beatsBaseline) - Number(a.beatsBaseline)
      || b.totalDeltaFitnessScore - a.totalDeltaFitnessScore
      || b.improvedPhaseCount - a.improvedPhaseCount
      || a.strategyId.localeCompare(b.strategyId)
    ))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    schemaVersion: 1,
    baselineCandidateId: input.baselineCandidateId,
    centerStrategyId: input.centerEvaluation?.strategyId,
    seeds: [...input.seeds],
    bestStrategyId: ranking[0]?.strategyId ?? '',
    bestImprovementOverBaseline: ranking[0]?.totalDeltaFitnessScore ?? 0,
    bestImprovementOverCenter: input.centerEvaluation && ranking[0]
      ? roundMetric(ranking[0].totalDeltaFitnessScore - input.centerEvaluation.summary.totalDeltaFitnessScore)
      : undefined,
    ranking,
    centerEvaluation: input.centerEvaluation,
    evaluations: [...input.evaluations],
  };
}

export function phasedEvaluationCsv(report: StrategyPhasedEvaluationSuiteReport): string {
  return [
    'strategyId,generationMethod,phaseId,startSeconds,endSeconds,baselineFitnessScore,phasedFitnessScore,deltaFitnessScore,baselineSurvivalRate,phasedSurvivalRate,deltaSurvivalRate,baselineAvgScoreGain,phasedAvgScoreGain,deltaAvgScoreGain,baselineAvgExpGain,phasedAvgExpGain,deltaAvgExpGain,baselineAvgKills,phasedAvgKills,deltaAvgKills,baselineAvgDamageTaken,phasedAvgDamageTaken,deltaAvgDamageTaken,improved',
    ...report.evaluations.flatMap((evaluation) => evaluation.comparisonByPhase.map((comparison) => [
      evaluation.strategyId,
      evaluation.generationMethod,
      comparison.phaseId,
      comparison.startSeconds,
      comparison.endSeconds,
      comparison.baselineFitnessScore,
      comparison.phasedFitnessScore,
      comparison.deltaFitnessScore,
      comparison.baselineSurvivalRate,
      comparison.phasedSurvivalRate,
      comparison.deltaSurvivalRate,
      comparison.baselineAvgScoreGain,
      comparison.phasedAvgScoreGain,
      comparison.deltaAvgScoreGain,
      comparison.baselineAvgExpGain,
      comparison.phasedAvgExpGain,
      comparison.deltaAvgExpGain,
      comparison.baselineAvgKills,
      comparison.phasedAvgKills,
      comparison.deltaAvgKills,
      comparison.baselineAvgDamageTaken,
      comparison.phasedAvgDamageTaken,
      comparison.deltaAvgDamageTaken,
      comparison.improved,
    ].map(escapeCsv).join(','))),
  ].join('\n');
}

export function phasedEvaluationMarkdown(report: StrategyPhasedEvaluationSuiteReport): string {
  const lines = [
    '# Phased Strategy Evaluation Suite',
    '',
    `- Best strategy: ${report.bestStrategyId}`,
    `- Seeds: ${report.seeds.length}`,
    `- Evaluated strategies: ${report.evaluations.length}`,
    `- Best improvement over baseline: ${report.bestImprovementOverBaseline}`,
    `- Best improvement over center: ${report.bestImprovementOverCenter ?? 'n/a'}`,
    '',
    '## Ranking',
    '',
    '| Rank | Method | Strategy | Total Delta | Avg Delta | Improved Phases | Beats Baseline |',
    '| ---: | --- | --- | ---: | ---: | ---: | --- |',
  ];

  for (const ranking of report.ranking) {
    lines.push(`| ${ranking.rank} | ${ranking.generationMethod} | ${ranking.strategyId} | ${ranking.totalDeltaFitnessScore} | ${ranking.avgDeltaFitnessScore} | ${ranking.improvedPhaseCount} / ${ranking.phaseCount} | ${ranking.beatsBaseline ? 'yes' : 'no'} |`);
  }

  if (report.centerEvaluation) {
    lines.push('', '## Center Strategy', '');
    lines.push(`- Strategy: ${report.centerEvaluation.strategyId}`);
    lines.push(`- Total fitness delta vs baseline: ${report.centerEvaluation.summary.totalDeltaFitnessScore}`);
    lines.push(`- Average fitness delta vs baseline: ${report.centerEvaluation.summary.avgDeltaFitnessScore}`);
    lines.push(`- Beats baseline: ${report.centerEvaluation.summary.beatsBaseline ? 'yes' : 'no'}`);
  }

  for (const evaluation of report.evaluations) {
    lines.push('', `## ${evaluation.generationMethod}`, '');
    lines.push(`- Strategy: ${evaluation.strategyId}`);
    lines.push(`- Improved phases: ${evaluation.summary.improvedPhaseCount} / ${evaluation.summary.phaseCount}`);
    lines.push(`- Total fitness delta: ${evaluation.summary.totalDeltaFitnessScore}`);
    lines.push(`- Average fitness delta: ${evaluation.summary.avgDeltaFitnessScore}`);
    lines.push(`- Beats baseline: ${evaluation.summary.beatsBaseline ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');

    for (const comparison of evaluation.comparisonByPhase) {
      lines.push(`| ${comparison.phaseId} | ${comparison.baselineFitnessScore} | ${comparison.phasedFitnessScore} | ${comparison.deltaFitnessScore} | ${comparison.baselineSurvivalRate} | ${comparison.phasedSurvivalRate} | ${comparison.deltaAvgScoreGain} | ${comparison.deltaAvgExpGain} | ${comparison.deltaAvgKills} | ${comparison.deltaAvgDamageTaken} | ${comparison.improved ? 'yes' : 'no'} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function strategyWeightSearchSummaryMarkdown(report: StrategyWeightSearchReport): string {
  const lines: string[] = [
    '# Strategy Weight Search',
    '',
    '## Search Config',
    '',
    `- Preset: ${report.config.presetId ?? 'custom'}`,
    `- Candidates: ${report.config.candidates}`,
    `- Seed count: ${report.config.seedCount}`,
    `- Duration seconds: ${report.config.durationSeconds}`,
    `- Tick ms: ${report.config.tickMs}`,
    `- Character/stage/map/difficulty: ${report.config.characterId} / ${report.config.stageId} / ${report.config.mapId} / ${report.config.difficultyId}`,
    `- Random seed: ${report.config.randomSeed}`,
    `- Search Mode: ${report.config.searchMode}`,
    `- Center Strategy: ${report.config.centerStrategyId ?? 'n/a'}`,
    `- Mutation Radius: ${report.config.mutationRadius ?? 'n/a'}`,
    `- Mutation Mode: ${report.config.mutationMode ?? 'n/a'}`,
    `- Phases: ${report.config.phases.map((phase) => phase.phaseId).join(', ')}`,
    '',
    '## Top By Phase',
    '',
  ];

  for (const phase of report.config.phases) {
    const top = report.topByPhase[phase.phaseId] ?? [];
    lines.push(`### ${phase.phaseId}`, '');
    lines.push('| Rank | Candidate | Fitness | Survival | End Level | End HP Ratio | Exp Gain | Kills | Boss Damage | Boss Kill Rate | Damage Taken | Pickups |');
    lines.push('| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');

    top.forEach((aggregate, index) => {
      lines.push(`| ${index + 1} | ${aggregate.candidateId} | ${aggregate.phaseFitnessScore} | ${aggregate.survivalRate} | ${aggregate.avgEndLevel} | ${aggregate.avgEndPlayerHpRatio} | ${aggregate.avgExpGain} | ${aggregate.avgKills} | ${aggregate.avgBossDamageDealt} | ${aggregate.bossKillRate} | ${aggregate.avgDamageTaken} | ${aggregate.avgPickupsCollected} |`);
    });

    lines.push('');
  }

  lines.push('## Top Weight Distribution by Phase', '');

  for (const phase of report.config.phases) {
    const distribution = report.topWeightDistributionByPhase[phase.phaseId] ?? {};
    lines.push(`### ${phase.phaseId}`, '');
    lines.push('| Weight | Avg | Median | Min | Max |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');

    for (const path of Object.keys(distribution).sort()) {
      const stats = distribution[path];
      lines.push(`| ${path} | ${stats.avg} | ${stats.median} | ${stats.min} | ${stats.max} |`);
    }

    lines.push('');
  }

  lines.push('## Top Candidate Weight Tables', '');

  const topCandidateIds = Array.from(new Set(Object.values(report.topByPhase).flat().map((aggregate) => aggregate.candidateId)));
  for (const candidateId of topCandidateIds) {
    const candidate = report.candidates.find((item) => item.candidateId === candidateId);
    if (!candidate) {
      continue;
    }

    lines.push(`### ${candidateId}`, '');
    lines.push('| Weight | Value |');
    lines.push('| --- | ---: |');

    for (const row of flattenProfileWeights(candidate.profile)) {
      lines.push(`| ${row.path} | ${row.value} |`);
    }

    lines.push('');
  }

  if (report.phasedEvaluation) {
    lines.push('## Phased Strategy Evaluation', '');
    lines.push(`- Best strategy: ${report.phasedEvaluation.bestStrategyId}`);
    lines.push(`- Evaluated strategies: ${report.phasedEvaluation.evaluations.length}`);
    lines.push(`- Best Improvement Over Center: ${report.phasedEvaluation.bestImprovementOverCenter ?? 'n/a'}`);
    lines.push(`- Best Improvement Over Baseline: ${report.phasedEvaluation.bestImprovementOverBaseline}`);
    lines.push('');
    lines.push('| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |');
    lines.push('| ---: | --- | ---: | ---: | ---: | --- |');

    for (const ranking of report.phasedEvaluation.ranking) {
      lines.push(`| ${ranking.rank} | ${ranking.generationMethod} | ${ranking.totalDeltaFitnessScore} | ${ranking.avgDeltaFitnessScore} | ${ranking.improvedPhaseCount} / ${ranking.phaseCount} | ${ranking.beatsBaseline ? 'yes' : 'no'} |`);
    }

    lines.push('');
  }

  lines.push('## Balanced Default Comparison', '');
  lines.push('| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |');
  lines.push('| --- | --- | ---: | ---: | ---: |');

  for (const phase of report.config.phases) {
    const best = report.topByPhase[phase.phaseId]?.[0];
    const baseline = report.baselineByPhase[phase.phaseId];
    const delta = best && baseline ? best.phaseFitnessScore - baseline.phaseFitnessScore : undefined;

    lines.push(`| ${phase.phaseId} | ${best?.candidateId ?? ''} | ${best?.phaseFitnessScore ?? ''} | ${baseline?.phaseFitnessScore ?? ''} | ${delta === undefined ? '' : Number(delta.toFixed(4))} |`);
  }

  lines.push('', '## Recommended Phased Strategy Drafts', '', '```json');
  lines.push(JSON.stringify(report.recommendedStrategies, null, 2));
  lines.push('```', '');

  return `${lines.join('\n')}\n`;
}

export function flattenProfileWeights(profile: AutoStrategyProfile): Array<{ path: string; value: number }> {
  const rows: Array<{ path: string; value: number }> = [];
  const sections = ['movement', 'upgrade', 'treasure', 'relic'] as const;

  for (const section of sections) {
    const record = profile[section] as unknown as Record<string, number>;

    for (const key of Object.keys(record).sort()) {
      rows.push({ path: `${section}.${key}`, value: record[key] });
    }
  }

  return rows;
}

const phaseAggregateCsvHeader = [
  'candidateId',
  'strategyProfileHash',
  'phaseId',
  'startSeconds',
  'endSeconds',
  'runs',
  'survivalRate',
  'avgScoreGain',
  'avgExpGain',
  'avgLevelGain',
  'avgEndLevel',
  'avgEndExp',
  'avgEndPlayerHp',
  'avgEndPlayerHpRatio',
  'avgKills',
  'avgDamageDealt',
  'avgBossDamageDealt',
  'avgDamageTaken',
  'avgPickupsCollected',
  'avgEnemiesSpawned',
  'bossKillRate',
  'phaseFitnessScore',
].join(',');

function escapeCsv(value: unknown): string {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function summarizeDistribution(values: readonly number[]): StrategyWeightDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  if (count === 0) {
    return { avg: 0, median: 0, min: 0, max: 0 };
  }

  const mid = Math.floor(count / 2);
  const median = count % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return {
    avg: roundMetric(sorted.reduce((sum, value) => sum + value, 0) / count),
    median: roundMetric(median),
    min: sorted[0],
    max: sorted[count - 1],
  };
}

function findAggregate(
  aggregates: readonly StrategyPhaseAggregate[],
  candidateId: string,
  phaseId: string,
): StrategyPhaseAggregate {
  const aggregate = aggregates.find((item) => item.candidateId === candidateId && item.phaseId === phaseId);

  if (!aggregate) {
    throw new Error(`Missing phased evaluation aggregate for "${candidateId}" phase "${phaseId}".`);
  }

  return aggregate;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function getCandidateProfileForDistribution(
  candidate: StrategyWeightCandidate,
  phaseId: string,
): AutoStrategyProfile {
  const phase = candidate.phasedStrategy?.phases.find((item) => `${item.startSeconds}-${item.endSeconds}` === phaseId);

  return phase?.profile ?? candidate.profile;
}
