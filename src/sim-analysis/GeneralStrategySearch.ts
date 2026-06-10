import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { hashStableValue } from '../core-sim/StableJson';

import type { GeneralStrategySearchConfig } from './GeneralStrategySearchConfig';
import type {
  GeneratedGeneralStrategy,
  GeneralStrategyCandidateStats,
  GeneralStrategyPhase,
} from './GeneralStrategySearchReport';
import type { RecommendedPhasedStrategy } from './StrategyWeightSearch';
import { flattenProfileWeights } from './StrategyWeightSearchReport';

export interface GeneralStrategyDefinition {
  candidateId: string;
  strategyVariantId: string;
  strategyProfileHash: string;
  profile: AutoStrategyProfile;
  phasedStrategy: RecommendedPhasedStrategy;
}

export function createGeneralStrategyFromProfile(input: {
  candidateId: string;
  strategyVariantId?: string;
  profile: AutoStrategyProfile;
  config: GeneralStrategySearchConfig;
}): GeneralStrategyDefinition {
  const phasedStrategy: RecommendedPhasedStrategy = {
    version: 1,
    id: input.candidateId,
    name: input.profile.name,
    generationMethod: input.strategyVariantId ?? 'single-profile-phased',
    phases: input.config.phases.map((phase) => ({
      startSeconds: phase.startSeconds,
      endSeconds: phase.endSeconds,
      profile: cloneProfile(input.profile),
    })),
  };
  const hash = hashStableValue('fnv1a', phasedStrategy);

  return {
    candidateId: input.candidateId,
    strategyVariantId: input.strategyVariantId ?? 'single-profile-phased',
    strategyProfileHash: hash,
    profile: cloneProfile(input.profile),
    phasedStrategy,
  };
}

export function createGeneralStrategyVariants(input: {
  config: GeneralStrategySearchConfig;
  rankedCandidates: readonly GeneralStrategyDefinition[];
}): GeneralStrategyDefinition[] {
  const ranked = [...input.rankedCandidates];

  if (ranked.length === 0) {
    return [];
  }

  return [
    createMergedVariant(input.config, ranked, 'top1-phased', 1, 'top'),
    createMergedVariant(input.config, ranked, 'top5-average-phased', 5, 'average'),
    createMergedVariant(input.config, ranked, 'top10-average-phased', 10, 'average'),
    createMergedVariant(input.config, ranked, 'top10-median-phased', 10, 'median'),
    createMergedVariant(input.config, ranked, 'topN-median-phased', input.config.topN, 'median'),
  ];
}

export function createGeneratedGeneralStrategy(input: {
  config: GeneralStrategySearchConfig;
  strategy: GeneralStrategyDefinition;
  stats: GeneralStrategyCandidateStats;
}): GeneratedGeneralStrategy {
  const timestamp = input.config.generatedAt.replace(/[^0-9A-Za-z]+/g, '_').replace(/^_+|_+$/g, '');
  const phases: GeneralStrategyPhase[] = input.strategy.phasedStrategy.phases.map((phase) => ({
    phaseId: `${phase.startSeconds}-${phase.endSeconds}`,
    startSeconds: phase.startSeconds,
    endSeconds: phase.endSeconds,
    profile: phase.profile,
  }));
  const draft: GeneratedGeneralStrategy = {
    version: 1,
    id: `generated_general_strategy_${timestamp}`,
    name: 'Generated General Strategy',
    source: 'headless-general-search',
    simulationKind: 'core-sim-simplified',
    createdAt: input.config.generatedAt,
    searchConfig: input.config,
    generalFitnessScore: input.stats.generalFitnessScore,
    stats: input.stats,
    phases,
  };
  const suffix = hashStableValue('fnv1a', draft).replace(/^fnv1a-/, '').slice(0, 8);

  return {
    ...draft,
    id: `${draft.id}_${suffix}`,
    phases: draft.phases.map((phase) => ({
      ...phase,
      profile: {
        ...phase.profile,
        id: `${draft.id}_${suffix}_${phase.startSeconds}_${phase.endSeconds}`,
        name: 'Generated General Strategy',
      },
    })),
  };
}

export function bestGeneralStrategyMarkdown(input: {
  strategy: GeneratedGeneralStrategy;
  balancedStats?: GeneralStrategyCandidateStats;
  scenarioCount: number;
}): string {
  const lines = [
    '# Best General Strategy',
    '',
    '## Search Config',
    '',
    `- Scenario count: ${input.strategy.searchConfig.scenarioCount}`,
    `- Seed count: ${input.strategy.searchConfig.seedCount}`,
    `- Candidates: ${input.strategy.searchConfig.candidates}`,
    `- Rounds: ${input.strategy.searchConfig.rounds}`,
    `- Duration seconds: ${input.strategy.searchConfig.durationSeconds}`,
    `- Tick ms: ${input.strategy.searchConfig.tickMs}`,
    `- Phases: ${input.strategy.phases.map((phase) => phase.phaseId).join(', ')}`,
    '',
    '## Overall Performance',
    '',
    `- Evaluated random scenarios: ${input.scenarioCount}`,
    `- General fitness score: ${input.strategy.generalFitnessScore}`,
    `- Fitness target: damage dealt first, with 30s damage-window safety penalty retained.`,
    `- Avg damage dealt: ${input.strategy.stats.avgDamageDealt}`,
    `- Median damage dealt: ${input.strategy.stats.medianDamageDealt}`,
    `- P10 damage dealt: ${input.strategy.stats.p10DamageDealt}`,
    `- Damage dealt std dev: ${input.strategy.stats.damageDealtStdDev}`,
    `- Avg score: ${input.strategy.stats.avgScore}`,
    `- Median score: ${input.strategy.stats.medianScore}`,
    `- P10 score: ${input.strategy.stats.p10Score}`,
    `- Completion rate: ${input.strategy.stats.completionRate}`,
    `- Avg damage taken: ${input.strategy.stats.avgDamageTaken}`,
    `- Damage window pass rate: ${input.strategy.stats.damageWindowPassRate}`,
    `- Avg 30s damage window violation count: ${input.strategy.stats.avgDamageWindowViolationCount}`,
    `- Damage safety penalty: ${input.strategy.stats.damageSafetyPenalty}`,
    '- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.',
    '',
    '## Balanced Default Comparison',
    '',
    `- Balanced fitness: ${input.balancedStats?.generalFitnessScore ?? 'n/a'}`,
    `- Delta: ${input.balancedStats ? Number((input.strategy.generalFitnessScore - input.balancedStats.generalFitnessScore).toFixed(4)) : 'n/a'}`,
    '',
    '## Phase Weight Tables',
    '',
  ];

  for (const phase of input.strategy.phases) {
    lines.push(`### ${phase.phaseId}`, '');
    lines.push('| Weight | Value |');
    lines.push('| --- | ---: |');

    for (const row of flattenProfileWeights(phase.profile)) {
      lines.push(`| ${row.path} | ${row.value} |`);
    }

    lines.push('');
  }

  lines.push('## Risks', '');
  lines.push('- This result is based on core-sim simplified.');
  lines.push('- It has not been validated in browser gameplay.');
  lines.push('- It is not a formal game balance conclusion.');

  return `${lines.join('\n')}\n`;
}

export function roundSummaryMarkdown(rows: readonly {
  round: number;
  searchMode: string;
  mutationRadius?: number;
  candidateCount: number;
  evaluatedStrategyCount: number;
  bestCandidateId: string;
  bestVariantId: string;
  bestGeneralFitnessScore: number;
}[]): string {
  const lines = [
    '# General Strategy Search Rounds',
    '',
    '| Round | Mode | Mutation Radius | Candidates | Evaluated Strategies | Best Candidate | Variant | Fitness |',
    '| ---: | --- | ---: | ---: | ---: | --- | --- | ---: |',
  ];

  for (const row of rows) {
    lines.push(`| ${row.round} | ${row.searchMode} | ${row.mutationRadius ?? ''} | ${row.candidateCount} | ${row.evaluatedStrategyCount} | ${row.bestCandidateId} | ${row.bestVariantId} | ${row.bestGeneralFitnessScore} |`);
  }

  return `${lines.join('\n')}\n`;
}

function createMergedVariant(
  config: GeneralStrategySearchConfig,
  ranked: readonly GeneralStrategyDefinition[],
  variantId: string,
  requestedTopCount: number,
  mode: 'top' | 'average' | 'median',
): GeneralStrategyDefinition {
  const selected = ranked.slice(0, Math.max(1, requestedTopCount));
  const phasedStrategy: RecommendedPhasedStrategy = {
    version: 1,
    id: `general_${variantId}`,
    name: `General ${variantId}`,
    generationMethod: variantId,
    phases: config.phases.map((phase) => {
      const profiles = selected.map((candidate) => {
        const candidatePhase = candidate.phasedStrategy.phases.find((item) => (
          item.startSeconds === phase.startSeconds
          && item.endSeconds === phase.endSeconds
        ));

        return candidatePhase?.profile ?? candidate.profile;
      });

      return {
        startSeconds: phase.startSeconds,
        endSeconds: phase.endSeconds,
        profile: mode === 'top'
          ? cloneProfile(profiles[0])
          : mergeProfiles(profiles, mode),
      };
    }),
  };
  const hash = hashStableValue('fnv1a', phasedStrategy);
  const candidateId = `general_${variantId}_${hash.replace(/^fnv1a-/, '').slice(0, 8)}`;

  return {
    candidateId,
    strategyVariantId: variantId,
    strategyProfileHash: hash,
    profile: cloneProfile(phasedStrategy.phases[0]?.profile ?? selected[0].profile),
    phasedStrategy: {
      ...phasedStrategy,
      id: candidateId,
      phases: phasedStrategy.phases.map((phase) => ({
        ...phase,
        profile: {
          ...phase.profile,
          id: `${candidateId}_${phase.startSeconds}_${phase.endSeconds}`,
          name: `General ${variantId}`,
        },
      })),
    },
  };
}

function mergeProfiles(profiles: readonly AutoStrategyProfile[], mode: 'average' | 'median'): AutoStrategyProfile {
  const merged = cloneProfile(profiles[0]);

  for (const row of flattenProfileWeights(merged)) {
    const values = profiles.map((profile) => getProfileWeight(profile, row.path));
    const nextValue = mode === 'average'
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : median(values);

    setProfileWeight(merged, row.path, Math.round(nextValue));
  }

  return merged;
}

function getProfileWeight(profile: AutoStrategyProfile, path: string): number {
  const [section, key] = path.split('.') as ['movement' | 'upgrade' | 'treasure' | 'relic', string];
  const record = profile[section] as unknown as Record<string, number>;

  return record[key];
}

function setProfileWeight(profile: AutoStrategyProfile, path: string, value: number): void {
  const [section, key] = path.split('.') as ['movement' | 'upgrade' | 'treasure' | 'relic', string];
  const record = profile[section] as unknown as Record<string, number>;

  record[key] = Math.max(0, Math.min(100, value));
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function cloneProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
  return JSON.parse(JSON.stringify(profile)) as AutoStrategyProfile;
}
