import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';
import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE } from '../profile/AutoStrategyDefaults';

declare global {
  interface ImportMeta {
    glob<T = unknown>(
      pattern: string,
      options: { eager: true },
    ): Record<string, T>;
  }
}

export const GENERATED_TEST_STRATEGY_ID = 'generated_test';

export interface GeneratedStrategyPhase {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
  profile: AutoStrategyProfile;
}

export interface GeneratedTestStrategy {
  version: number;
  id: typeof GENERATED_TEST_STRATEGY_ID;
  name: string;
  source?: string;
  simulationKind?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  phases: GeneratedStrategyPhase[];
}

export interface BrowserAutoTestStrategyContext {
  playtestMode: boolean;
  autoMode: boolean;
  autoMovement: boolean;
  autoUpgrade: boolean;
  autoOpenTreasure: boolean;
}

export interface BrowserAutoTestDefaultStrategy {
  profile: AutoStrategyProfile;
  phasedStrategy?: GeneratedTestStrategy;
  source: typeof GENERATED_TEST_STRATEGY_ID | 'balanced_default';
  fallbackReason?: string;
}

type GeneratedStrategyModule = {
  default?: unknown;
};

const generatedStrategyModules = import.meta.glob<GeneratedStrategyModule>(
  './generated-test-strategy.json',
  { eager: true },
);
const warnedMessages = new Set<string>();

export function loadGeneratedTestStrategy(): GeneratedTestStrategy | undefined {
  const rawModule = generatedStrategyModules['./generated-test-strategy.json'];
  const raw = rawModule?.default;

  return parseGeneratedTestStrategy(raw);
}

export function isGeneratedTestStrategyAvailable(): boolean {
  return loadGeneratedTestStrategy() !== undefined;
}

export function getBrowserAutoTestDefaultStrategy(
  context: BrowserAutoTestStrategyContext,
): BrowserAutoTestDefaultStrategy {
  if (!isBrowserAutoTestRun(context)) {
    return {
      profile: StrategyProfileValidator.normalize(DEFAULT_AUTO_STRATEGY_PROFILE),
      source: 'balanced_default',
    };
  }

  const generated = loadGeneratedTestStrategy();

  if (!generated) {
    const fallbackReason = 'generated-test-strategy.json is missing or invalid';

    warnOnce(
      fallbackReason,
      '[generated-strategy] generated_test is unavailable; falling back to balanced_default for browser auto test.',
    );

    return {
      profile: StrategyProfileValidator.normalize(DEFAULT_AUTO_STRATEGY_PROFILE),
      source: 'balanced_default',
      fallbackReason,
    };
  }

  return {
    profile: getGeneratedStrategyProfileAtSeconds(generated, 0),
    phasedStrategy: generated,
    source: GENERATED_TEST_STRATEGY_ID,
  };
}

export function getGeneratedStrategyProfileAtSeconds(
  strategy: GeneratedTestStrategy,
  elapsedSeconds: number,
): AutoStrategyProfile {
  const activePhase = strategy.phases.find((phase) => (
    elapsedSeconds >= phase.startSeconds && elapsedSeconds < phase.endSeconds
  )) ?? strategy.phases[strategy.phases.length - 1];

  return normalizeGeneratedProfile(activePhase.profile, strategy.name);
}

export function getGeneratedStrategyPhaseIdAtSeconds(
  strategy: GeneratedTestStrategy,
  elapsedSeconds: number,
): string {
  const activePhase = strategy.phases.find((phase) => (
    elapsedSeconds >= phase.startSeconds && elapsedSeconds < phase.endSeconds
  )) ?? strategy.phases[strategy.phases.length - 1];

  return activePhase.phaseId;
}

function isBrowserAutoTestRun(context: BrowserAutoTestStrategyContext): boolean {
  return context.playtestMode
    && context.autoMode
    && (context.autoMovement || context.autoUpgrade || context.autoOpenTreasure);
}

function parseGeneratedTestStrategy(raw: unknown): GeneratedTestStrategy | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  if (raw.id !== GENERATED_TEST_STRATEGY_ID || !Array.isArray(raw.phases) || raw.phases.length === 0) {
    return undefined;
  }

  const phases = raw.phases
    .map((phase) => parseGeneratedPhase(phase, readString(raw.name, 'Generated Test Strategy')))
    .filter((phase): phase is GeneratedStrategyPhase => phase !== undefined)
    .sort((a, b) => a.startSeconds - b.startSeconds || a.endSeconds - b.endSeconds);

  if (phases.length === 0) {
    return undefined;
  }

  return {
    version: readNumber(raw.version, 1),
    id: GENERATED_TEST_STRATEGY_ID,
    name: readString(raw.name, 'Generated Test Strategy'),
    source: readOptionalString(raw.source),
    simulationKind: readOptionalString(raw.simulationKind),
    createdAt: readOptionalString(raw.createdAt),
    metadata: isObject(raw.metadata) ? { ...raw.metadata } : undefined,
    phases,
  };
}

function parseGeneratedPhase(raw: unknown, strategyName: string): GeneratedStrategyPhase | undefined {
  if (!isObject(raw) || !isObject(raw.profile)) {
    return undefined;
  }

  const startSeconds = readNumber(raw.startSeconds, Number.NaN);
  const endSeconds = readNumber(raw.endSeconds, Number.NaN);

  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
    return undefined;
  }

  return {
    phaseId: readString(raw.phaseId, `${startSeconds}-${endSeconds}`),
    startSeconds,
    endSeconds,
    profile: normalizeGeneratedProfile(raw.profile, strategyName),
  };
}

function normalizeGeneratedProfile(rawProfile: unknown, strategyName: string): AutoStrategyProfile {
  const profile = StrategyProfileValidator.normalize(rawProfile);

  return {
    ...profile,
    id: GENERATED_TEST_STRATEGY_ID,
    name: strategyName,
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function warnOnce(key: string, message: string): void {
  if (warnedMessages.has(key)) {
    return;
  }

  warnedMessages.add(key);
  console.warn(message);
}
