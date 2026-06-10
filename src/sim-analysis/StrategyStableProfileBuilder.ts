import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { hashStableValue } from '../core-sim/StableJson';

import type {
  StablePhasedStrategyDraft,
  StableWeightDistributionEntry,
} from './StrategyOptimizationAnalysisReport';
import type { RecommendedPhasedStrategy } from './StrategyWeightSearch';
import { flattenProfileWeights } from './StrategyWeightSearchReport';

interface StableProfileBuilderInput {
  generatedAt: string;
  distribution: readonly StableWeightDistributionEntry[];
  sourceStrategies: readonly RecommendedPhasedStrategy[];
  sourceDirs: readonly string[];
}

export function buildStablePhasedStrategy(
  input: StableProfileBuilderInput,
): StablePhasedStrategyDraft {
  const phases = uniquePhases(input.distribution);
  const draft: StablePhasedStrategyDraft = {
    version: 1,
    id: `stable_phased_strategy_${formatTimestampForId(input.generatedAt)}`,
    name: 'Stable Phased Strategy',
    sourceOptimizationCount: input.sourceStrategies.length,
    sourceDirs: [...input.sourceDirs],
    phases: phases.map((phase) => {
      const baseProfile = findSourceProfile(input.sourceStrategies, phase)
        ?? input.sourceStrategies[0]?.phases[0]?.profile;

      if (!baseProfile) {
        throw new Error(`Cannot build stable profile for phase "${phase.phaseId}" without source profiles.`);
      }

      const profile = cloneProfile(baseProfile);
      const entries = input.distribution.filter((entry) => entry.phaseId === phase.phaseId);

      for (const entry of entries) {
        setProfileWeight(profile, entry.fieldPath, clampWeight(entry.median));
      }

      profile.id = `${draftIdPrefix(input.generatedAt)}_${phase.startSeconds}_${phase.endSeconds}`;
      profile.name = 'Stable Phased Strategy';

      return {
        phaseId: phase.phaseId,
        startSeconds: phase.startSeconds,
        endSeconds: phase.endSeconds,
        profile,
      };
    }),
  };

  const hash = hashStableValue('fnv1a', draft).replace(/^fnv1a-/, '').slice(0, 8);

  return {
    ...draft,
    id: `${draft.id}_${hash}`,
    phases: draft.phases.map((phase) => ({
      ...phase,
      profile: {
        ...phase.profile,
        id: `${draftIdPrefix(input.generatedAt)}_${hash}_${phase.startSeconds}_${phase.endSeconds}`,
      },
    })),
  };
}

export function stablePhasedStrategyMarkdown(input: {
  strategy: StablePhasedStrategyDraft;
  distribution: readonly StableWeightDistributionEntry[];
}): string {
  const lines = [
    '# Stable Phased Strategy',
    '',
    `- Strategy: ${input.strategy.id}`,
    `- Source optimizations: ${input.strategy.sourceOptimizationCount}`,
    '',
  ];

  for (const phase of input.strategy.phases) {
    const rows = input.distribution
      .filter((entry) => entry.phaseId === phase.phaseId)
      .sort((a, b) => a.fieldPath.localeCompare(b.fieldPath));

    lines.push(`## ${phase.phaseId}`, '');
    lines.push('| Field | Median | Avg | StdDev | Label |');
    lines.push('| --- | ---: | ---: | ---: | --- |');

    for (const row of rows) {
      lines.push(`| ${row.fieldPath} | ${row.median} | ${row.avg} | ${row.stdDev} | ${row.stabilityLabel} |`);
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function uniquePhases(distribution: readonly StableWeightDistributionEntry[]): Array<{
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
}> {
  const phaseById = new Map<string, { phaseId: string; startSeconds: number; endSeconds: number }>();

  for (const entry of distribution) {
    phaseById.set(entry.phaseId, {
      phaseId: entry.phaseId,
      startSeconds: entry.startSeconds,
      endSeconds: entry.endSeconds,
    });
  }

  return Array.from(phaseById.values()).sort((a, b) => (
    a.startSeconds - b.startSeconds
    || a.endSeconds - b.endSeconds
    || a.phaseId.localeCompare(b.phaseId)
  ));
}

function findSourceProfile(
  strategies: readonly RecommendedPhasedStrategy[],
  phase: { phaseId: string; startSeconds: number; endSeconds: number },
): AutoStrategyProfile | undefined {
  for (const strategy of strategies) {
    const strategyPhase = strategy.phases.find((item) => (
      item.startSeconds === phase.startSeconds
      && item.endSeconds === phase.endSeconds
    ));

    if (strategyPhase) {
      return strategyPhase.profile;
    }
  }

  return undefined;
}

function setProfileWeight(profile: AutoStrategyProfile, path: string, value: number): void {
  const [section, key] = path.split('.') as ['movement' | 'upgrade' | 'treasure' | 'relic', string];
  const record = profile[section] as unknown as Record<string, number>;

  record[key] = value;
}

function clampWeight(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cloneProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
  return JSON.parse(JSON.stringify(profile)) as AutoStrategyProfile;
}

function draftIdPrefix(timestamp: string): string {
  return `stable_phased_strategy_${formatTimestampForId(timestamp)}`;
}

function formatTimestampForId(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z]+/g, '_').replace(/^_+|_+$/g, '');
}

export function stableStrategyProfileRows(profile: AutoStrategyProfile): Array<{ path: string; value: number }> {
  return flattenProfileWeights(profile);
}
