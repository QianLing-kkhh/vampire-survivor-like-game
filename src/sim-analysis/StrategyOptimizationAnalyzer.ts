import type {
  BaselinePerformanceReport,
  StableWeightDistributionEntry,
  StrategyOptimizationAnalysisReport,
  StrategyOptimizationAnalyzerConfig,
  StrategyOptimizationIndexEntry,
  StrategyOptimizationInput,
  StrategyOptimizationSkippedEntry,
  VariantWinRateEntry,
} from './StrategyOptimizationAnalysisReport';
import { buildStablePhasedStrategy } from './StrategyStableProfileBuilder';
import { flattenProfileWeights } from './StrategyWeightSearchReport';

export function analyzeStrategyOptimizations(input: {
  config: StrategyOptimizationAnalyzerConfig;
  optimizations: readonly StrategyOptimizationInput[];
  skipped: readonly StrategyOptimizationSkippedEntry[];
}): StrategyOptimizationAnalysisReport {
  const optimizationIndex = input.optimizations.map(createOptimizationIndexEntry);
  const warnings: string[] = [];

  if (optimizationIndex.length < input.config.minRuns) {
    warnings.push(`Only ${optimizationIndex.length} optimization(s) found; minRuns is ${input.config.minRuns}.`);
  }

  const filteredStrategies = input.optimizations.map((optimization) => optimization.bestStrategy);
  const stableWeightDistribution = calculateStableWeightDistribution(input.optimizations, input.config);
  const variantWinRate = calculateVariantWinRate(optimizationIndex, input.optimizations);
  const baselinePerformance = calculateBaselinePerformance(optimizationIndex);
  const stablePhasedStrategy = stableWeightDistribution.length > 0 && filteredStrategies.length > 0
    ? buildStablePhasedStrategy({
      generatedAt: input.config.generatedAt,
      distribution: stableWeightDistribution,
      sourceStrategies: filteredStrategies,
      sourceDirs: input.optimizations.map((optimization) => optimization.optimizationDir),
    })
    : {
      version: 1 as const,
      id: `stable_phased_strategy_${input.config.generatedAt.replace(/[^0-9A-Za-z]+/g, '_').replace(/^_+|_+$/g, '')}`,
      name: 'Stable Phased Strategy' as const,
      sourceOptimizationCount: 0,
      sourceDirs: [],
      phases: [],
    };

  return {
    schemaVersion: 1,
    config: input.config,
    optimizationIndex,
    stableWeightDistribution,
    variantWinRate,
    baselinePerformance,
    stablePhasedStrategy,
    skipped: [...input.skipped],
    warnings,
  };
}

export function analysisSummaryMarkdown(report: StrategyOptimizationAnalysisReport): string {
  const lines = [
    '# Strategy Optimization Analysis',
    '',
    '## Analysis Scope',
    '',
    `- Input: ${report.config.inputDir}`,
    `- Output: ${report.config.outputDir}`,
    `- Include pattern: ${report.config.includePattern ?? '*_optimization'}`,
    `- Exclude pattern: ${report.config.excludePattern ?? 'n/a'}`,
    `- Min runs: ${report.config.minRuns}`,
    `- Optimization count: ${report.optimizationIndex.length}`,
    `- Skipped directories: ${report.skipped.length}`,
    '',
    '## Baseline Performance',
    '',
    `- Beat baseline rate: ${report.baselinePerformance.beatBaselineRate}`,
    `- Beat baseline count: ${report.baselinePerformance.beatBaselineCount} / ${report.baselinePerformance.totalOptimizations}`,
    `- Average improvement: ${report.baselinePerformance.avgVsBaselineDelta}`,
    `- Median improvement: ${report.baselinePerformance.medianVsBaselineDelta}`,
    `- Best improvement: ${report.baselinePerformance.bestVsBaselineDelta}`,
    `- Worst improvement: ${report.baselinePerformance.worstVsBaselineDelta}`,
    '',
    '## Variant Win Rate',
    '',
    '| Variant | Wins | Win Rate | Avg Score | Avg Vs Baseline Delta | Beat Baseline Rate |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of report.variantWinRate) {
    lines.push(`| ${row.strategyVariantId} | ${row.wins} | ${row.winRate} | ${row.avgScore} | ${row.avgVsBaselineDelta} | ${row.beatBaselineRate} |`);
  }

  lines.push('', '## Stable Fields By Phase', '');

  for (const phaseId of uniquePhaseIds(report.stableWeightDistribution)) {
    const rows = report.stableWeightDistribution.filter((entry) => entry.phaseId === phaseId);
    const stableHigh = rows.filter((entry) => entry.stabilityLabel === 'stable-high');
    const stableLow = rows.filter((entry) => entry.stabilityLabel === 'stable-low');
    const unstable = rows.filter((entry) => entry.stabilityLabel === 'unstable');

    lines.push(`### ${phaseId}`, '');
    lines.push(`- stable-high: ${stableHigh.map((entry) => entry.fieldPath).join(', ') || 'none'}`);
    lines.push(`- stable-low: ${stableLow.map((entry) => entry.fieldPath).join(', ') || 'none'}`);
    lines.push(`- unstable: ${unstable.map((entry) => entry.fieldPath).join(', ') || 'none'}`);
    lines.push('');
  }

  lines.push('## Stable Phased Strategy Summary', '');
  lines.push(`- Strategy: ${report.stablePhasedStrategy.id}`);
  lines.push(`- Source optimizations: ${report.stablePhasedStrategy.sourceOptimizationCount}`);
  lines.push(`- Phases: ${report.stablePhasedStrategy.phases.map((phase) => phase.phaseId).join(', ')}`);
  lines.push('');
  lines.push('## Important Notes', '');
  lines.push('- These results are still based on core-sim simplified analysis.');
  lines.push('- They should not be treated as final live game balance conclusions.');
  lines.push('- Browser/headless equivalence should be confirmed before converting any result into a formal strategy preset.');

  if (report.warnings.length > 0) {
    lines.push('', '## Warnings', '');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function createOptimizationIndexEntry(
  optimization: StrategyOptimizationInput,
): StrategyOptimizationIndexEntry {
  const firstConfig = optimization.rounds.find((round) => round.config)?.config;
  const summary = optimization.summary;
  const bestDelta = roundMetric(summary.bestVsBaselineDelta ?? 0);

  return {
    optimizationDir: optimization.optimizationDir,
    createdAt: summary.generatedAt ?? firstConfig?.generatedAt ?? '',
    phaseList: (firstConfig?.phases ?? phasesFromStrategy(optimization)).map((phase) => `${phase.startSeconds}-${phase.endSeconds}`),
    rounds: summary.optimize?.rounds ?? summary.rounds?.length ?? optimization.rounds.length,
    bestStrategyId: summary.bestStrategyId ?? optimization.bestStrategy.id,
    bestAvgScore: roundMetric(summary.bestAvgScore ?? 0),
    bestVsBaselineDelta: bestDelta,
    beatsBaseline: bestDelta > 0,
    mutationSettings: {
      initialMutationRadius: summary.optimize?.initialMutationRadius,
      mutationDecay: summary.optimize?.mutationDecay,
      centerStrategyMode: summary.optimize?.centerStrategyMode,
      carryForwardTop: summary.optimize?.carryForwardTop,
    },
    candidates: firstConfig?.candidates,
    seedCount: firstConfig?.seedCount,
    durationSeconds: firstConfig?.durationSeconds,
    tickMs: firstConfig?.tickMs,
  };
}

function calculateStableWeightDistribution(
  optimizations: readonly StrategyOptimizationInput[],
  config: StrategyOptimizationAnalyzerConfig,
): StableWeightDistributionEntry[] {
  const requestedPhases = new Set((config.phases ?? []).map((phase) => phase.phaseId));
  const valuesByKey = new Map<string, {
    phaseId: string;
    startSeconds: number;
    endSeconds: number;
    fieldPath: string;
    values: number[];
  }>();

  for (const optimization of optimizations) {
    for (const phase of optimization.bestStrategy.phases) {
      const phaseId = `${phase.startSeconds}-${phase.endSeconds}`;

      if (requestedPhases.size > 0 && !requestedPhases.has(phaseId)) {
        continue;
      }

      for (const row of flattenProfileWeights(phase.profile)) {
        const key = `${phaseId}|${row.path}`;
        const entry = valuesByKey.get(key) ?? {
          phaseId,
          startSeconds: phase.startSeconds,
          endSeconds: phase.endSeconds,
          fieldPath: row.path,
          values: [],
        };

        entry.values.push(row.value);
        valuesByKey.set(key, entry);
      }
    }
  }

  return Array.from(valuesByKey.values())
    .sort((a, b) => (
      a.startSeconds - b.startSeconds
      || a.endSeconds - b.endSeconds
      || a.fieldPath.localeCompare(b.fieldPath)
    ))
    .map((entry) => {
      const summary = summarizeValues(entry.values);

      return {
        phaseId: entry.phaseId,
        startSeconds: entry.startSeconds,
        endSeconds: entry.endSeconds,
        fieldPath: entry.fieldPath,
        ...summary,
        sampleCount: entry.values.length,
        stabilityLabel: stabilityLabel(summary.median, summary.stdDev),
      };
    });
}

function calculateVariantWinRate(
  index: readonly StrategyOptimizationIndexEntry[],
  optimizations: readonly StrategyOptimizationInput[],
): VariantWinRateEntry[] {
  const byVariant = new Map<string, {
    wins: number;
    scores: number[];
    deltas: number[];
    beatBaselineCount: number;
  }>();

  for (let indexNumber = 0; indexNumber < optimizations.length; indexNumber += 1) {
    const optimization = optimizations[indexNumber];
    const indexEntry = index[indexNumber];
    const variant = optimization.bestStrategy.generationMethod
      ?? summaryBestGenerationMethod(optimization)
      ?? 'unknown';
    const entry = byVariant.get(variant) ?? {
      wins: 0,
      scores: [],
      deltas: [],
      beatBaselineCount: 0,
    };

    entry.wins += 1;
    entry.scores.push(indexEntry.bestAvgScore);
    entry.deltas.push(indexEntry.bestVsBaselineDelta);

    if (indexEntry.beatsBaseline) {
      entry.beatBaselineCount += 1;
    }

    byVariant.set(variant, entry);
  }

  return Array.from(byVariant.entries())
    .map(([strategyVariantId, entry]) => ({
      strategyVariantId,
      wins: entry.wins,
      winRate: roundMetric(entry.wins / Math.max(1, optimizations.length)),
      avgScore: roundMetric(average(entry.scores)),
      avgVsBaselineDelta: roundMetric(average(entry.deltas)),
      beatBaselineRate: roundMetric(entry.beatBaselineCount / Math.max(1, entry.wins)),
    }))
    .sort((a, b) => b.wins - a.wins || b.avgVsBaselineDelta - a.avgVsBaselineDelta || a.strategyVariantId.localeCompare(b.strategyVariantId));
}

function calculateBaselinePerformance(
  index: readonly StrategyOptimizationIndexEntry[],
): BaselinePerformanceReport {
  const deltas = index.map((entry) => entry.bestVsBaselineDelta);

  return {
    totalOptimizations: index.length,
    beatBaselineCount: index.filter((entry) => entry.beatsBaseline).length,
    beatBaselineRate: roundMetric(index.filter((entry) => entry.beatsBaseline).length / Math.max(1, index.length)),
    avgVsBaselineDelta: roundMetric(average(deltas)),
    medianVsBaselineDelta: roundMetric(percentile(deltas, 0.5)),
    bestVsBaselineDelta: roundMetric(deltas.length > 0 ? Math.max(...deltas) : 0),
    worstVsBaselineDelta: roundMetric(deltas.length > 0 ? Math.min(...deltas) : 0),
  };
}

function summarizeValues(values: readonly number[]): {
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p10: number;
  p90: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = average(sorted);
  const variance = sorted.reduce((sum, value) => sum + ((value - avg) ** 2), 0) / Math.max(1, sorted.length);

  return {
    avg: roundMetric(avg),
    median: roundMetric(percentile(sorted, 0.5)),
    min: roundMetric(sorted[0] ?? 0),
    max: roundMetric(sorted[sorted.length - 1] ?? 0),
    stdDev: roundMetric(Math.sqrt(variance)),
    p10: roundMetric(percentile(sorted, 0.1)),
    p90: roundMetric(percentile(sorted, 0.9)),
  };
}

function stabilityLabel(median: number, stdDev: number): StableWeightDistributionEntry['stabilityLabel'] {
  if (median >= 70 && stdDev <= 15) {
    return 'stable-high';
  }

  if (median <= 30 && stdDev <= 15) {
    return 'stable-low';
  }

  if (stdDev > 25) {
    return 'unstable';
  }

  return 'neutral';
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

function summaryBestGenerationMethod(optimization: StrategyOptimizationInput): string | undefined {
  const bestRound = optimization.summary.rounds?.find((round) => (
    round.bestStrategyId === optimization.summary.bestStrategyId
  ));

  return bestRound?.bestGenerationMethod;
}

function phasesFromStrategy(optimization: StrategyOptimizationInput): Array<{ startSeconds: number; endSeconds: number }> {
  return optimization.bestStrategy.phases.map((phase) => ({
    startSeconds: phase.startSeconds,
    endSeconds: phase.endSeconds,
  }));
}

function uniquePhaseIds(distribution: readonly StableWeightDistributionEntry[]): string[] {
  return Array.from(new Set(distribution.map((entry) => entry.phaseId))).sort((a, b) => {
    const left = distribution.find((entry) => entry.phaseId === a);
    const right = distribution.find((entry) => entry.phaseId === b);

    return (left?.startSeconds ?? 0) - (right?.startSeconds ?? 0)
      || (left?.endSeconds ?? 0) - (right?.endSeconds ?? 0)
      || a.localeCompare(b);
  });
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}
