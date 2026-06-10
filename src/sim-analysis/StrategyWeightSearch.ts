import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

import type { StrategyPhaseAggregate, StrategySearchPhase } from './StrategyPhaseMetrics';
import type { StrategyWeightCandidate } from './StrategyWeightCandidate';
import { hashStableValue } from '../core-sim/StableJson';

export interface StrategyWeightSearchPlan {
  phases: StrategySearchPhase[];
  candidates: StrategyWeightCandidate[];
  seeds: string[];
}

export interface RecommendedPhasedStrategy {
  version: 1;
  id: string;
  name: string;
  generationMethod: string;
  phases: Array<{
    startSeconds: number;
    endSeconds: number;
    profile: AutoStrategyProfile;
  }>;
}

export function createStrategyWeightSearchSeeds(randomSeed: string, seedCount: number): string[] {
  return Array.from({ length: Math.max(1, Math.floor(seedCount)) }, (_, index) => (
    `${randomSeed}-sim-${String(index + 1).padStart(3, '0')}`
  ));
}

export function createRecommendedPhasedStrategy(input: {
  id: string;
  phases: readonly StrategySearchPhase[];
  topByPhase: Record<string, StrategyPhaseAggregate[]>;
  candidateProfiles: Record<string, AutoStrategyProfile>;
  candidateProfilesByPhase?: Record<string, Record<string, AutoStrategyProfile>>;
}): RecommendedPhasedStrategy {
  const strategy: RecommendedPhasedStrategy = {
    version: 1,
    id: input.id,
    name: 'Searched Phased Strategy',
    generationMethod: 'top1-phased',
    phases: input.phases.map((phase) => {
      const top = input.topByPhase[phase.phaseId]?.[0];
      const profile = top ? getCandidateProfileForPhase(input, top.candidateId, phase.phaseId) : undefined;

      if (!profile) {
        throw new Error(`No top candidate profile available for phase "${phase.phaseId}".`);
      }

      return {
        startSeconds: phase.startSeconds,
        endSeconds: phase.endSeconds,
        profile,
      };
    }),
  };

  return {
    ...strategy,
    id: input.id,
  };
}

export function createRecommendedPhasedStrategies(input: {
  phases: readonly StrategySearchPhase[];
  topByPhase: Record<string, StrategyPhaseAggregate[]>;
  candidateProfiles: Record<string, AutoStrategyProfile>;
  candidateProfilesByPhase?: Record<string, Record<string, AutoStrategyProfile>>;
  topN: number;
}): RecommendedPhasedStrategy[] {
  return [
    createGeneratedStrategy(input, 'top1-phased', 'Top1 Phased Strategy', 1, 'top'),
    createGeneratedStrategy(input, 'top5-average-phased', 'Top5 Average Phased Strategy', 5, 'average'),
    createGeneratedStrategy(input, 'top10-average-phased', 'Top10 Average Phased Strategy', 10, 'average'),
    createGeneratedStrategy(input, 'top10-median-phased', 'Top10 Median Phased Strategy', 10, 'median'),
    createGeneratedStrategy(input, 'topN-median-phased', 'TopN Median Phased Strategy', input.topN, 'median'),
  ];
}

function createGeneratedStrategy(input: {
  phases: readonly StrategySearchPhase[];
  topByPhase: Record<string, StrategyPhaseAggregate[]>;
  candidateProfiles: Record<string, AutoStrategyProfile>;
  candidateProfilesByPhase?: Record<string, Record<string, AutoStrategyProfile>>;
}, methodId: string, name: string, requestedTopCount: number, mode: 'top' | 'average' | 'median'): RecommendedPhasedStrategy {
  const draft: RecommendedPhasedStrategy = {
    version: 1,
    id: `searched_${methodId}`,
    name,
    generationMethod: methodId,
    phases: input.phases.map((phase) => {
      const ranked = input.topByPhase[phase.phaseId] ?? [];
      const selected = ranked
        .slice(0, Math.max(1, requestedTopCount))
        .map((aggregate) => getCandidateProfileForPhase(input, aggregate.candidateId, phase.phaseId))
        .filter((profile): profile is AutoStrategyProfile => Boolean(profile));

      if (selected.length === 0) {
        throw new Error(`No candidate profiles available for phase "${phase.phaseId}" using "${methodId}".`);
      }

      return {
        startSeconds: phase.startSeconds,
        endSeconds: phase.endSeconds,
        profile: mode === 'top'
          ? cloneProfile(selected[0])
          : mergeProfiles(selected, mode),
      };
    }),
  };

  const hash = hashStableValue('fnv1a', draft).replace(/^fnv1a-/, '').slice(0, 8);

  return {
    ...draft,
    id: `searched_${methodId}_${hash}`,
    phases: draft.phases.map((phase) => ({
      ...phase,
      profile: {
        ...phase.profile,
        id: `searched_${methodId}_${hash}_${phase.startSeconds}_${phase.endSeconds}`,
        name,
      },
    })),
  };
}

function getCandidateProfileForPhase(input: {
  candidateProfiles: Record<string, AutoStrategyProfile>;
  candidateProfilesByPhase?: Record<string, Record<string, AutoStrategyProfile>>;
}, candidateId: string, phaseId: string): AutoStrategyProfile | undefined {
  return input.candidateProfilesByPhase?.[candidateId]?.[phaseId]
    ?? input.candidateProfiles[candidateId];
}

function mergeProfiles(profiles: readonly AutoStrategyProfile[], mode: 'average' | 'median'): AutoStrategyProfile {
  const merged = cloneProfile(profiles[0]);
  const paths = flattenProfileWeightPaths(merged);

  for (const path of paths) {
    const values = profiles.map((profile) => getProfileWeight(profile, path));
    const value = mode === 'average'
      ? values.reduce((sum, item) => sum + item, 0) / values.length
      : median(values);

    setProfileWeight(merged, path, Math.round(value));
  }

  return merged;
}

function flattenProfileWeightPaths(profile: AutoStrategyProfile): string[] {
  const paths: string[] = [];
  const sections = ['movement', 'upgrade', 'treasure', 'relic'] as const;

  for (const section of sections) {
    const record = profile[section] as unknown as Record<string, number>;

    for (const key of Object.keys(record).sort()) {
      paths.push(`${section}.${key}`);
    }
  }

  return paths;
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
