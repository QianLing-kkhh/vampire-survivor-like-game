import type { GeneratedGeneralStrategy } from './GeneralStrategySearchReport';

export interface GeneratedTestStrategyDocument extends Omit<GeneratedGeneralStrategy, 'id' | 'name'> {
  id: 'generated_test';
  name: 'Generated Test Strategy';
  metadata: {
    sourceReportDir: string;
    appliedAt: string;
    simulationKind: 'core-sim-simplified';
    warning: 'Generated for headless auto testing only.';
  };
}

export function createGeneratedTestStrategyDocument(input: {
  source: GeneratedGeneralStrategy;
  sourceReportDir: string;
  appliedAt: string;
}): GeneratedTestStrategyDocument {
  validateGeneratedGeneralStrategy(input.source);

  return {
    ...input.source,
    id: 'generated_test',
    name: 'Generated Test Strategy',
    metadata: {
      sourceReportDir: input.sourceReportDir,
      appliedAt: input.appliedAt,
      simulationKind: 'core-sim-simplified',
      warning: 'Generated for headless auto testing only.',
    },
  };
}

export function validateGeneratedGeneralStrategy(value: unknown): asserts value is GeneratedGeneralStrategy {
  const record = value as Partial<GeneratedGeneralStrategy>;

  if (!record || record.version !== 1 || record.source !== 'headless-general-search') {
    throw new Error('Source is not a generated general strategy document.');
  }

  if (record.simulationKind !== 'core-sim-simplified') {
    throw new Error('Generated strategy simulationKind must be core-sim-simplified.');
  }

  if (!Array.isArray(record.phases) || record.phases.length === 0) {
    throw new Error('Generated strategy must contain at least one phase.');
  }

  for (const phase of record.phases) {
    if (!phase.profile || !Number.isFinite(phase.startSeconds) || !Number.isFinite(phase.endSeconds)) {
      throw new Error('Generated strategy phase is missing startSeconds, endSeconds, or profile.');
    }
  }
}
