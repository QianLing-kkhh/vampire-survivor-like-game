import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../strategy/profile/AutoStrategyDefaults';
import { hashStableValue } from '../core-sim/StableJson';

export interface StrategyWeightRange {
  min: number;
  max: number;
}

export type StrategyWeightLockMap = Record<string, number>;
export type StrategyWeightRangeMap = Record<string, StrategyWeightRange>;

export interface StrategyWeightCandidate {
  candidateId: string;
  strategyProfileHash: string;
  profile: AutoStrategyProfile;
  phasedStrategy?: StrategyWeightCandidatePhasedStrategy;
}

export interface StrategyWeightCandidateConfig {
  count: number;
  randomSeed: string;
  locked?: StrategyWeightLockMap;
  ranges?: StrategyWeightRangeMap;
  baseProfile?: AutoStrategyProfile;
}

export interface StrategyWeightCandidatePhasedStrategy {
  version: 1;
  id: string;
  name: string;
  generationMethod?: string;
  phases: Array<{
    startSeconds: number;
    endSeconds: number;
    profile: AutoStrategyProfile;
  }>;
}

export interface CenteredStrategyWeightCandidateConfig {
  count: number;
  randomSeed: string;
  centerStrategy: StrategyWeightCandidatePhasedStrategy;
  mutationRadius: number;
  mutationMode: 'uniform' | 'gaussian';
  locked?: StrategyWeightLockMap;
  ranges?: StrategyWeightRangeMap;
}

const SEARCH_SECTIONS = ['movement', 'upgrade', 'treasure', 'relic'] as const;

class CandidateRandom {
  private state: number;

  constructor(seed: string) {
    this.state = CandidateRandom.hashSeed(seed);
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;

    return this.state / 0x100000000;
  }

  integer(min: number, max: number): number {
    return Math.round(min + (max - min) * this.next());
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  gaussian(): number {
    const first = Math.max(Number.EPSILON, this.next());
    const second = Math.max(Number.EPSILON, this.next());

    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  private static hashSeed(seed: string): number {
    let hash = 2166136261;

    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0 || 1;
  }
}

export function generateStrategyWeightCandidates(
  config: StrategyWeightCandidateConfig,
): StrategyWeightCandidate[] {
  const count = Math.max(0, Math.floor(config.count));
  const baseProfile = cloneProfile(config.baseProfile ?? DEFAULT_AUTO_STRATEGY_PROFILE);
  const paths = listNumericWeightPaths(baseProfile);
  const locked = config.locked ?? {};
  const ranges = config.ranges ?? {};
  const random = new CandidateRandom(config.randomSeed);
  const candidates: StrategyWeightCandidate[] = [];

  validateWeightOverrides(paths, locked, ranges);

  for (let index = 0; index < count; index += 1) {
    const profile = cloneProfile(baseProfile);

    for (const path of paths) {
      const value = locked[path] ?? random.integer(
        ranges[path]?.min ?? 0,
        ranges[path]?.max ?? 100,
      );

      setNumericProfileValue(profile, path, clampWeight(value));
    }

    const hash = hashStableValue('fnv1a', profile);
    const suffix = hash.replace(/^fnv1a-/, '').slice(0, 8);
    const candidateId = `search_candidate_${String(index + 1).padStart(6, '0')}_${suffix}`;

    profile.id = candidateId;
    profile.name = `Search Candidate ${String(index + 1).padStart(6, '0')}`;

    candidates.push({
      candidateId,
      strategyProfileHash: hashStableValue('fnv1a', profile),
      profile,
    });
  }

  return candidates;
}

export function generateCenteredStrategyWeightCandidates(
  config: CenteredStrategyWeightCandidateConfig,
): StrategyWeightCandidate[] {
  const count = Math.max(0, Math.floor(config.count));
  const firstProfile = config.centerStrategy.phases[0]?.profile ?? DEFAULT_AUTO_STRATEGY_PROFILE;
  const paths = listNumericWeightPaths(firstProfile);
  const locked = config.locked ?? {};
  const ranges = config.ranges ?? {};
  const random = new CandidateRandom(config.randomSeed);
  const mutationRadius = Math.max(0, config.mutationRadius);
  const candidates: StrategyWeightCandidate[] = [];

  validateWeightOverrides(paths, locked, ranges);

  for (let index = 0; index < count; index += 1) {
    const phasedStrategy = clonePhasedStrategy(config.centerStrategy);

    phasedStrategy.id = `centered_candidate_${String(index + 1).padStart(6, '0')}`;
    phasedStrategy.name = `Centered Candidate ${String(index + 1).padStart(6, '0')}`;
    phasedStrategy.generationMethod = `centered-${config.mutationMode}`;

    for (const phase of phasedStrategy.phases) {
      for (const path of paths) {
        const centerValue = getNumericProfileValue(phase.profile, path);
        const mutated = config.mutationMode === 'gaussian'
          ? centerValue + random.gaussian() * (mutationRadius / 2)
          : random.uniform(centerValue - mutationRadius, centerValue + mutationRadius);
        const rawValue = locked[path] ?? mutated;
        const rangedValue = applySearchRange(rawValue, ranges[path]);

        setNumericProfileValue(phase.profile, path, clampWeight(rangedValue));
      }

      phase.profile.id = `${phasedStrategy.id}_${phase.startSeconds}_${phase.endSeconds}`;
      phase.profile.name = phasedStrategy.name;
    }

    const strategyProfileHash = hashStableValue('fnv1a', phasedStrategy);
    const suffix = strategyProfileHash.replace(/^fnv1a-/, '').slice(0, 8);
    const candidateId = `centered_candidate_${String(index + 1).padStart(6, '0')}_${suffix}`;

    phasedStrategy.id = candidateId;
    phasedStrategy.phases = phasedStrategy.phases.map((phase) => ({
      ...phase,
      profile: {
        ...phase.profile,
        id: `${candidateId}_${phase.startSeconds}_${phase.endSeconds}`,
      },
    }));

    candidates.push({
      candidateId,
      strategyProfileHash: hashStableValue('fnv1a', phasedStrategy),
      profile: cloneProfile(phasedStrategy.phases[0]?.profile ?? DEFAULT_AUTO_STRATEGY_PROFILE),
      phasedStrategy,
    });
  }

  return candidates;
}

export function listNumericWeightPaths(profile: AutoStrategyProfile = DEFAULT_AUTO_STRATEGY_PROFILE): string[] {
  const paths: string[] = [];

  for (const section of SEARCH_SECTIONS) {
    const record = profile[section] as unknown as Record<string, unknown>;

    for (const key of Object.keys(record).sort()) {
      if (typeof record[key] === 'number') {
        paths.push(`${section}.${key}`);
      }
    }
  }

  return paths;
}

export function parseWeightLocks(text: string | undefined): StrategyWeightLockMap {
  const locks: StrategyWeightLockMap = {};

  for (const entry of splitOverrideList(text)) {
    const [path, rawValue] = entry.split('=');
    const value = Number(rawValue);

    if (!path || !Number.isFinite(value)) {
      throw new Error(`Invalid locked weight "${entry}". Expected path=value.`);
    }

    locks[path.trim()] = clampWeight(value);
  }

  return locks;
}

export function parseWeightRanges(text: string | undefined): StrategyWeightRangeMap {
  const ranges: StrategyWeightRangeMap = {};

  for (const entry of splitOverrideList(text)) {
    const [path, rawRange] = entry.split('=');
    const [rawMin, rawMax] = String(rawRange ?? '').split(':');
    const min = Number(rawMin);
    const max = Number(rawMax);

    if (!path || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      throw new Error(`Invalid search range "${entry}". Expected path=min:max.`);
    }

    ranges[path.trim()] = {
      min: clampWeight(min),
      max: clampWeight(max),
    };
  }

  return ranges;
}

function validateWeightOverrides(
  paths: readonly string[],
  locked: StrategyWeightLockMap,
  ranges: StrategyWeightRangeMap,
): void {
  const known = new Set(paths);

  for (const path of Object.keys(locked)) {
    if (!known.has(path)) {
      throw new Error(`Unknown locked strategy weight "${path}".`);
    }
  }

  for (const path of Object.keys(ranges)) {
    if (!known.has(path)) {
      throw new Error(`Unknown ranged strategy weight "${path}".`);
    }
  }
}

function splitOverrideList(text: string | undefined): string[] {
  if (!text) {
    return [];
  }

  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function setNumericProfileValue(profile: AutoStrategyProfile, path: string, value: number): void {
  const [section, key] = path.split('.') as [typeof SEARCH_SECTIONS[number], string];
  const record = profile[section] as unknown as Record<string, number>;

  record[key] = value;
}

function getNumericProfileValue(profile: AutoStrategyProfile, path: string): number {
  const [section, key] = path.split('.') as [typeof SEARCH_SECTIONS[number], string];
  const record = profile[section] as unknown as Record<string, number>;

  return record[key];
}

function cloneProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
  return JSON.parse(JSON.stringify(profile)) as AutoStrategyProfile;
}

function clonePhasedStrategy(strategy: StrategyWeightCandidatePhasedStrategy): StrategyWeightCandidatePhasedStrategy {
  return JSON.parse(JSON.stringify(strategy)) as StrategyWeightCandidatePhasedStrategy;
}

function applySearchRange(value: number, range: StrategyWeightRange | undefined): number {
  if (!range) {
    return value;
  }

  return Math.max(range.min, Math.min(range.max, value));
}

function clampWeight(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
