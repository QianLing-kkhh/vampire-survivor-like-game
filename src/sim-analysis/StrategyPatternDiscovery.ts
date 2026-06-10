import type {
  StableWeightDistributionEntry,
  StrategyOptimizationAnalysisReport,
} from './StrategyOptimizationAnalysisReport';
import type {
  StrategyPatternDiscoveryConfig,
  StrategyPatternDiscoveryReport,
  StrategyPatternId,
  StrategyPatternScore,
  StrategyPhasePatternDiscovery,
  StrategyStateMachineRule,
} from './StrategyPatternDiscoveryReport';

interface PatternDefinition {
  patternId: StrategyPatternId;
  name: string;
  positiveFields: string[];
  lowFields: string[];
  focus: string[];
  entryTemplates: string[];
  exitTemplates: string[];
}

const PATTERNS: PatternDefinition[] = [
  {
    patternId: 'early-farm',
    name: 'Early Farm Phase',
    positiveFields: [
      'movement.farmBias',
      'movement.loopBias',
      'upgrade.growthPriority',
      'upgrade.newWeaponPriority',
      'relic.economyRelicPriority',
    ],
    lowFields: [
      'movement.survivalBias',
      'movement.bossBias',
      'treasure.openRiskTolerance',
    ],
    focus: [
      'Prioritize dense exp routing and low-risk kill farming.',
      'Favor growth and weapon-slot setup before committing to boss or treasure detours.',
    ],
    entryTemplates: [
      'elapsedSeconds >= {startSeconds}',
      'run is still in early scaling and evolution is not yet the dominant objective',
    ],
    exitTemplates: [
      'elapsedSeconds >= {endSeconds}',
      'core weapon/passive pairing becomes available or survival pressure rises',
    ],
  },
  {
    patternId: 'evolution-rush',
    name: 'Evolution Rush Phase',
    positiveFields: [
      'upgrade.evolutionPriority',
      'upgrade.mainWeaponPriority',
      'upgrade.cooldownPriority',
      'treasure.evolutionChestPriority',
      'treasure.relicExpectedValuePriority',
    ],
    lowFields: [
      'upgrade.newWeaponPriority',
      'movement.loopBias',
    ],
    focus: [
      'Compress upgrade choices toward evolution prerequisites.',
      'Treat evolution chest routing as valuable when survival margin is acceptable.',
    ],
    entryTemplates: [
      'elapsedSeconds >= {startSeconds}',
      'evolution prerequisites are partially assembled or chest value is high',
    ],
    exitTemplates: [
      'elapsedSeconds >= {endSeconds}',
      'priority evolution is completed or survival state becomes urgent',
    ],
  },
  {
    patternId: 'survival',
    name: 'Survival Phase',
    positiveFields: [
      'movement.survivalBias',
      'movement.overKitePenalty',
      'upgrade.survivalPriority',
      'relic.survivalRelicPriority',
    ],
    lowFields: [
      'movement.riskTolerance',
      'treasure.openRiskTolerance',
      'movement.treasureBias',
    ],
    focus: [
      'Reduce route risk and prioritize health-preserving upgrades.',
      'Avoid treasure or relic detours unless they are close and low pressure.',
    ],
    entryTemplates: [
      'elapsedSeconds >= {startSeconds}',
      'hp ratio is low, enemy density is high, or damage intake is trending upward',
    ],
    exitTemplates: [
      'elapsedSeconds >= {endSeconds}',
      'hp and spacing recover enough to resume farm or objective routing',
    ],
  },
  {
    patternId: 'boss-preparation',
    name: 'Boss Preparation Phase',
    positiveFields: [
      'movement.bossBias',
      'upgrade.damagePriority',
      'upgrade.cooldownPriority',
      'relic.damageRelicPriority',
      'relic.synergyPriority',
    ],
    lowFields: [
      'movement.farmBias',
      'relic.economyRelicPriority',
    ],
    focus: [
      'Shift from economy to boss damage and cooldown reliability.',
      'Prefer damage/synergy relics over long farm loops.',
    ],
    entryTemplates: [
      'elapsedSeconds >= {startSeconds}',
      'boss timing is near or boss objective pressure exceeds farm value',
    ],
    exitTemplates: [
      'elapsedSeconds >= {endSeconds}',
      'boss is defeated or endless/survival priorities take over',
    ],
  },
  {
    patternId: 'balanced-transition',
    name: 'Balanced Transition Phase',
    positiveFields: [],
    lowFields: [],
    focus: [
      'No single stable weight cluster dominates; keep a conservative blended policy.',
      'Use live runtime signals to choose between farm, evolution, survival, and boss objectives.',
    ],
    entryTemplates: [
      'elapsedSeconds >= {startSeconds}',
      'phase evidence is mixed or confidence is below threshold',
    ],
    exitTemplates: [
      'elapsedSeconds >= {endSeconds}',
      'a stronger objective signal appears',
    ],
  },
];

export function discoverStrategyPatterns(input: {
  config: StrategyPatternDiscoveryConfig;
  optimizationAnalysis: StrategyOptimizationAnalysisReport;
}): StrategyPatternDiscoveryReport {
  const phasePatterns = discoverPhasePatterns(input.optimizationAnalysis, input.config);
  const states = buildStateMachineStates(phasePatterns);

  return {
    schemaVersion: 1,
    config: input.config,
    sourceOptimizationAnalysis: input.optimizationAnalysis,
    phasePatterns,
    suggestedStateMachine: {
      version: 1,
      id: `discovered_strategy_state_machine_${formatTimestampForId(input.config.generatedAt)}`,
      name: 'Discovered Strategy State Machine',
      sourceOptimizationCount: input.optimizationAnalysis.optimizationIndex.length,
      states,
      transitions: states.slice(0, -1).map((state, index) => ({
        from: state.stateId,
        to: states[index + 1].stateId,
        condition: `elapsedSeconds >= ${state.endSeconds}`,
      })),
    },
    skipped: input.optimizationAnalysis.skipped,
    warnings: [
      ...input.optimizationAnalysis.warnings,
      'Pattern discovery is an interpretation layer over optimization outputs, not a formal AutoStrategyEngine preset.',
    ],
  };
}

export function patternDiscoveryMarkdown(report: StrategyPatternDiscoveryReport): string {
  const lines = [
    '# Strategy Pattern Discovery',
    '',
    '## Scope',
    '',
    `- Input: ${report.config.inputDir}`,
    `- Source optimizations: ${report.sourceOptimizationAnalysis.optimizationIndex.length}`,
    `- Min confidence: ${report.config.minConfidence}`,
    `- Skipped directories: ${report.skipped.length}`,
    '',
    '## Phase Patterns',
    '',
    '| Phase | Pattern | Confidence | Stable High | Stable Low | Unstable |',
    '| --- | --- | ---: | --- | --- | --- |',
  ];

  for (const phase of report.phasePatterns) {
    lines.push(`| ${phase.phaseId} | ${phase.primaryPatternName} | ${phase.confidence} | ${phase.stableHighFields.map((entry) => entry.fieldPath).join(', ') || 'none'} | ${phase.stableLowFields.map((entry) => entry.fieldPath).join(', ') || 'none'} | ${phase.unstableFields.map((entry) => entry.fieldPath).join(', ') || 'none'} |`);
  }

  lines.push('', '## Suggested State Machine', '');

  for (const state of report.suggestedStateMachine.states) {
    lines.push(`### ${state.name}`, '');
    lines.push(`- State id: ${state.stateId}`);
    lines.push(`- Phase ids: ${state.phaseIds.join(', ')}`);
    lines.push(`- Time window: ${state.startSeconds}-${state.endSeconds}s`);
    lines.push(`- Confidence: ${state.confidence}`);
    lines.push(`- Entry: ${state.entryConditions.join('; ')}`);
    lines.push(`- Exit: ${state.exitConditions.join('; ')}`);
    lines.push(`- Focus: ${state.recommendedFocus.join(' ')}`);
    lines.push('');
    lines.push('| Evidence Field | Median | Avg | StdDev | Label |');
    lines.push('| --- | ---: | ---: | ---: | --- |');

    for (const evidence of state.evidenceFields) {
      lines.push(`| ${evidence.fieldPath} | ${evidence.median} | ${evidence.avg} | ${evidence.stdDev} | ${evidence.stabilityLabel} |`);
    }

    lines.push('');
  }

  lines.push('## Transitions', '');
  lines.push('| From | To | Condition |');
  lines.push('| --- | --- | --- |');

  for (const transition of report.suggestedStateMachine.transitions) {
    lines.push(`| ${transition.from} | ${transition.to} | ${transition.condition} |`);
  }

  lines.push('', '## Important Notes', '');
  lines.push('- These rules are inferred from headless optimization outputs.');
  lines.push('- They should be treated as design guidance for a future strategy state machine, not as final gameplay balance.');
  lines.push('- Do not convert them into built-in presets until browser/headless behavior is aligned and validated.');

  if (report.warnings.length > 0) {
    lines.push('', '## Warnings', '');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function discoverPhasePatterns(
  analysis: StrategyOptimizationAnalysisReport,
  config: StrategyPatternDiscoveryConfig,
): StrategyPhasePatternDiscovery[] {
  const phaseIds = uniquePhaseIds(analysis.stableWeightDistribution);

  return phaseIds.map((phaseId) => {
    const entries = analysis.stableWeightDistribution.filter((entry) => entry.phaseId === phaseId);
    const stableHighFields = entries.filter((entry) => entry.stabilityLabel === 'stable-high');
    const stableLowFields = entries.filter((entry) => entry.stabilityLabel === 'stable-low');
    const unstableFields = entries.filter((entry) => entry.stabilityLabel === 'unstable');
    const scores = PATTERNS
      .filter((pattern) => pattern.patternId !== 'balanced-transition')
      .map((pattern) => scorePattern(pattern, entries))
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.patternId.localeCompare(b.patternId));
    const best = scores[0];
    const selected = best && best.confidence >= config.minConfidence
      ? best
      : scoreBalancedTransition(entries);
    const first = entries[0];

    return {
      phaseId,
      startSeconds: first?.startSeconds ?? 0,
      endSeconds: first?.endSeconds ?? 0,
      primaryPatternId: selected.patternId,
      primaryPatternName: selected.name,
      confidence: selected.confidence,
      scores: [...scores, scoreBalancedTransition(entries)].sort((a, b) => b.confidence - a.confidence || b.score - a.score),
      stableHighFields,
      stableLowFields,
      unstableFields,
    };
  });
}

function scorePattern(
  pattern: PatternDefinition,
  entries: readonly StableWeightDistributionEntry[],
): StrategyPatternScore {
  const byPath = new Map(entries.map((entry) => [entry.fieldPath, entry]));
  const positiveEvidence: string[] = [];
  const negativeEvidence: string[] = [];
  let score = 0;

  for (const field of pattern.positiveFields) {
    const entry = byPath.get(field);
    const value = entry?.median ?? 50;

    score += value;

    if (entry && (entry.stabilityLabel === 'stable-high' || entry.median >= 65)) {
      positiveEvidence.push(`${field}=${entry.median}`);
    }
  }

  for (const field of pattern.lowFields) {
    const entry = byPath.get(field);
    const value = entry?.median ?? 50;

    score += 100 - value;

    if (entry && (entry.stabilityLabel === 'stable-low' || entry.median <= 35)) {
      negativeEvidence.push(`${field}=${entry.median}`);
    }
  }

  const fieldCount = pattern.positiveFields.length + pattern.lowFields.length;
  const normalized = fieldCount === 0 ? 0 : score / fieldCount;
  const confidence = roundMetric(Math.max(0, Math.min(1, (normalized - 45) / 40)));

  return {
    patternId: pattern.patternId,
    name: pattern.name,
    score: roundMetric(normalized),
    confidence,
    positiveEvidence,
    negativeEvidence,
  };
}

function scoreBalancedTransition(entries: readonly StableWeightDistributionEntry[]): StrategyPatternScore {
  const unstableCount = entries.filter((entry) => entry.stabilityLabel === 'unstable').length;
  const stableCount = entries.filter((entry) => entry.stabilityLabel === 'stable-high' || entry.stabilityLabel === 'stable-low').length;
  const confidence = roundMetric(Math.max(0.25, Math.min(1, (unstableCount + 1) / Math.max(1, stableCount + unstableCount + 1))));

  return {
    patternId: 'balanced-transition',
    name: 'Balanced Transition Phase',
    score: roundMetric(50 + unstableCount - stableCount),
    confidence,
    positiveEvidence: [],
    negativeEvidence: [],
  };
}

function buildStateMachineStates(
  phasePatterns: readonly StrategyPhasePatternDiscovery[],
): StrategyStateMachineRule[] {
  const states: StrategyStateMachineRule[] = [];

  for (const phase of phasePatterns) {
    const previous = states[states.length - 1];

    if (previous && previous.patternId === phase.primaryPatternId) {
      previous.phaseIds.push(phase.phaseId);
      previous.endSeconds = phase.endSeconds;
      previous.confidence = roundMetric((previous.confidence + phase.confidence) / 2);
      previous.evidenceFields = mergeEvidence(previous.evidenceFields, evidenceFieldsForPhase(phase));
      previous.exitConditions = exitConditionsForPhase(phase);
    } else {
      states.push(createStateRule(phase, states.length + 1));
    }
  }

  return states;
}

function createStateRule(
  phase: StrategyPhasePatternDiscovery,
  index: number,
): StrategyStateMachineRule {
  const definition = getPatternDefinition(phase.primaryPatternId);

  return {
    stateId: `${phase.primaryPatternId}-${String(index).padStart(2, '0')}`,
    name: definition.name,
    patternId: definition.patternId,
    phaseIds: [phase.phaseId],
    startSeconds: phase.startSeconds,
    endSeconds: phase.endSeconds,
    confidence: phase.confidence,
    entryConditions: entryConditionsForPhase(phase),
    exitConditions: exitConditionsForPhase(phase),
    recommendedFocus: definition.focus,
    evidenceFields: evidenceFieldsForPhase(phase),
  };
}

function entryConditionsForPhase(phase: StrategyPhasePatternDiscovery): string[] {
  const definition = getPatternDefinition(phase.primaryPatternId);

  return definition.entryTemplates.map((template) => renderCondition(template, phase));
}

function exitConditionsForPhase(phase: StrategyPhasePatternDiscovery): string[] {
  const definition = getPatternDefinition(phase.primaryPatternId);

  return definition.exitTemplates.map((template) => renderCondition(template, phase));
}

function evidenceFieldsForPhase(
  phase: StrategyPhasePatternDiscovery,
): StrategyStateMachineRule['evidenceFields'] {
  const score = phase.scores.find((item) => item.patternId === phase.primaryPatternId);
  const paths = new Set<string>();

  for (const evidence of [...(score?.positiveEvidence ?? []), ...(score?.negativeEvidence ?? [])]) {
    paths.add(evidence.split('=')[0]);
  }

  if (paths.size === 0) {
    for (const entry of [...phase.stableHighFields, ...phase.stableLowFields].slice(0, 6)) {
      paths.add(entry.fieldPath);
    }
  }

  return [...phase.stableHighFields, ...phase.stableLowFields, ...phase.unstableFields]
    .filter((entry) => paths.has(entry.fieldPath))
    .sort((a, b) => a.fieldPath.localeCompare(b.fieldPath))
    .map((entry) => ({
      fieldPath: entry.fieldPath,
      median: entry.median,
      avg: entry.avg,
      stdDev: entry.stdDev,
      stabilityLabel: entry.stabilityLabel,
    }));
}

function mergeEvidence(
  left: StrategyStateMachineRule['evidenceFields'],
  right: StrategyStateMachineRule['evidenceFields'],
): StrategyStateMachineRule['evidenceFields'] {
  const byPath = new Map<string, StrategyStateMachineRule['evidenceFields'][number]>();

  for (const entry of [...left, ...right]) {
    byPath.set(entry.fieldPath, entry);
  }

  return Array.from(byPath.values()).sort((a, b) => a.fieldPath.localeCompare(b.fieldPath));
}

function getPatternDefinition(patternId: StrategyPatternId): PatternDefinition {
  return PATTERNS.find((pattern) => pattern.patternId === patternId) ?? PATTERNS[PATTERNS.length - 1];
}

function renderCondition(template: string, phase: StrategyPhasePatternDiscovery): string {
  return template
    .replace('{startSeconds}', String(phase.startSeconds))
    .replace('{endSeconds}', String(phase.endSeconds));
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

function formatTimestampForId(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z]+/g, '_').replace(/^_+|_+$/g, '');
}
