import type { SimulationResult } from '../core-sim/SimulationResult';
import type { SimTracePoint } from '../core-sim/SimulationState';

export interface StrategySearchPhase {
  phaseId: string;
  startSeconds: number;
  endSeconds: number;
}

export interface StrategyPhaseRunMetrics extends StrategySearchPhase {
  candidateId: string;
  strategyProfileHash: string;
  seed: string;
  runIndex: number;
  survivedPhase: boolean;
  scoreGain: number;
  expGain: number;
  levelGain: number;
  endLevel: number;
  endExp: number;
  endPlayerHp: number;
  endPlayerHpRatio: number;
  kills: number;
  damageDealt: number;
  bossDamageDealt: number;
  damageTaken: number;
  pickupsCollected: number;
  enemiesSpawned: number;
  bossKilled: boolean;
}

export interface StrategyPhaseAggregate extends StrategySearchPhase {
  candidateId: string;
  strategyProfileHash: string;
  runs: number;
  survivalRate: number;
  avgScoreGain: number;
  avgExpGain: number;
  avgLevelGain: number;
  avgEndLevel: number;
  avgEndExp: number;
  avgEndPlayerHp: number;
  avgEndPlayerHpRatio: number;
  avgKills: number;
  avgDamageDealt: number;
  avgBossDamageDealt: number;
  avgDamageTaken: number;
  avgPickupsCollected: number;
  avgEnemiesSpawned: number;
  bossKillRate: number;
  phaseFitnessScore: number;
}

type MetricAccumulator = StrategySearchPhase & {
  candidateId: string;
  strategyProfileHash: string;
  runs: number;
  survived: number;
  scoreGain: number;
  expGain: number;
  levelGain: number;
  endLevel: number;
  endExp: number;
  endPlayerHp: number;
  endPlayerHpRatio: number;
  kills: number;
  damageDealt: number;
  bossDamageDealt: number;
  damageTaken: number;
  pickupsCollected: number;
  enemiesSpawned: number;
  bossKilled: number;
};

export function parseStrategyPhases(text: string): StrategySearchPhase[] {
  const phases = text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawStart, rawEnd] = entry.split('-');
      const startSeconds = Number(rawStart);
      const endSeconds = Number(rawEnd);

      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < 0 || endSeconds <= startSeconds) {
        throw new Error(`Invalid phase "${entry}". Expected start-end seconds.`);
      }

      return {
        phaseId: `${trimPhaseNumber(startSeconds)}-${trimPhaseNumber(endSeconds)}`,
        startSeconds,
        endSeconds,
      };
    });

  if (phases.length === 0) {
    throw new Error('At least one --phase range is required.');
  }

  return phases;
}

export function computeStrategyPhaseMetrics(input: {
  candidateId: string;
  strategyProfileHash: string;
  result: SimulationResult;
  phases: readonly StrategySearchPhase[];
}): StrategyPhaseRunMetrics[] {
  const trace = input.result.trace ?? [];

  return input.phases.map((phase) => {
    const start = getTracePointAtOrBefore(trace, phase.startSeconds * 1000) ?? createZeroTracePoint();
    const end = getTracePointAtOrBefore(trace, phase.endSeconds * 1000)
      ?? trace[trace.length - 1]
      ?? createZeroTracePoint();

    return {
      candidateId: input.candidateId,
      strategyProfileHash: input.strategyProfileHash,
      seed: input.result.seed,
      runIndex: input.result.runIndex,
      phaseId: phase.phaseId,
      startSeconds: phase.startSeconds,
      endSeconds: phase.endSeconds,
      survivedPhase: input.result.survivalTimeSeconds >= phase.endSeconds,
      scoreGain: Math.max(0, end.score - start.score),
      expGain: Math.max(0, end.exp - start.exp),
      levelGain: Math.max(0, end.level - start.level),
      endLevel: end.level,
      endExp: end.exp,
      endPlayerHp: roundMetric(end.playerHp),
      endPlayerHpRatio: roundMetric(end.playerMaxHp > 0 ? end.playerHp / end.playerMaxHp : 0),
      kills: Math.max(0, end.kills - start.kills),
      damageDealt: roundMetric(Math.max(0, end.damageDealt - start.damageDealt)),
      bossDamageDealt: roundMetric(Math.max(0, end.bossDamageDealt - start.bossDamageDealt)),
      damageTaken: roundMetric(Math.max(0, end.damageTaken - start.damageTaken)),
      pickupsCollected: Math.max(0, end.pickupsCollected - start.pickupsCollected),
      enemiesSpawned: Math.max(0, end.enemiesSpawned - start.enemiesSpawned),
      bossKilled: end.bossKilled,
    };
  });
}

export function aggregateStrategyPhaseMetrics(
  metrics: readonly StrategyPhaseRunMetrics[],
): StrategyPhaseAggregate[] {
  const groups = new Map<string, MetricAccumulator>();

  for (const metric of metrics) {
    const key = `${metric.candidateId}|${metric.phaseId}`;
    const accumulator = groups.get(key) ?? {
      candidateId: metric.candidateId,
      strategyProfileHash: metric.strategyProfileHash,
      phaseId: metric.phaseId,
      startSeconds: metric.startSeconds,
      endSeconds: metric.endSeconds,
      runs: 0,
      survived: 0,
      scoreGain: 0,
      expGain: 0,
      levelGain: 0,
      endLevel: 0,
      endExp: 0,
      endPlayerHp: 0,
      endPlayerHpRatio: 0,
      kills: 0,
      damageDealt: 0,
      bossDamageDealt: 0,
      damageTaken: 0,
      pickupsCollected: 0,
      enemiesSpawned: 0,
      bossKilled: 0,
    };

    accumulator.runs += 1;
    accumulator.survived += metric.survivedPhase ? 1 : 0;
    accumulator.scoreGain += metric.scoreGain;
    accumulator.expGain += metric.expGain;
    accumulator.levelGain += metric.levelGain;
    accumulator.endLevel += metric.endLevel;
    accumulator.endExp += metric.endExp;
    accumulator.endPlayerHp += metric.endPlayerHp;
    accumulator.endPlayerHpRatio += metric.endPlayerHpRatio;
    accumulator.kills += metric.kills;
    accumulator.damageDealt += metric.damageDealt;
    accumulator.bossDamageDealt += metric.bossDamageDealt;
    accumulator.damageTaken += metric.damageTaken;
    accumulator.pickupsCollected += metric.pickupsCollected;
    accumulator.enemiesSpawned += metric.enemiesSpawned;
    accumulator.bossKilled += metric.bossKilled ? 1 : 0;

    groups.set(key, accumulator);
  }

  return Array.from(groups.values())
    .map(toAggregate)
    .sort((a, b) => a.phaseId.localeCompare(b.phaseId) || b.phaseFitnessScore - a.phaseFitnessScore || a.candidateId.localeCompare(b.candidateId));
}

export function selectTopStrategyPhaseAggregates(
  aggregates: readonly StrategyPhaseAggregate[],
  topN: number,
  options: { excludeCandidateIds?: readonly string[] } = {},
): Record<string, StrategyPhaseAggregate[]> {
  const excluded = new Set(options.excludeCandidateIds ?? []);
  const byPhase: Record<string, StrategyPhaseAggregate[]> = {};

  for (const aggregate of aggregates) {
    if (excluded.has(aggregate.candidateId)) {
      continue;
    }

    byPhase[aggregate.phaseId] = byPhase[aggregate.phaseId] ?? [];
    byPhase[aggregate.phaseId].push(aggregate);
  }

  for (const phaseId of Object.keys(byPhase)) {
    byPhase[phaseId] = byPhase[phaseId]
      .sort((a, b) => b.phaseFitnessScore - a.phaseFitnessScore || a.candidateId.localeCompare(b.candidateId))
      .slice(0, Math.max(1, Math.floor(topN)));
  }

  return byPhase;
}

export function calculatePhaseFitnessScore(aggregate: Omit<StrategyPhaseAggregate, 'phaseFitnessScore'>): number {
  if (aggregate.endSeconds <= 300) {
    return roundMetric(
      aggregate.survivalRate * 700
      + aggregate.avgEndLevel * 150
      + aggregate.avgEndPlayerHpRatio * 360
      + aggregate.avgExpGain * 0.75
      + aggregate.avgKills * 0.65
      + aggregate.avgPickupsCollected * 2.2
      - aggregate.avgDamageTaken * 1.45,
    );
  }

  if (aggregate.startSeconds >= 300) {
    return roundMetric(
      aggregate.bossKillRate * 1800
      + aggregate.survivalRate * 520
      + aggregate.avgBossDamageDealt * 0.085
      + aggregate.avgDamageDealt * 0.012
      + aggregate.avgEndPlayerHpRatio * 180
      - aggregate.avgDamageTaken * 1.25,
    );
  }

  if (aggregate.startSeconds === 0 && aggregate.endSeconds <= 30) {
    return roundMetric(
      aggregate.avgExpGain * 1.2
      + aggregate.avgKills * 0.8
      + aggregate.avgLevelGain * 100
      - aggregate.avgDamageTaken * 1.5,
    );
  }

  if (aggregate.startSeconds >= 30 && aggregate.endSeconds <= 60) {
    return roundMetric(
      aggregate.avgExpGain
      + aggregate.avgKills
      + aggregate.avgLevelGain * 120
      + aggregate.avgDamageDealt * 0.02
      - aggregate.avgDamageTaken * 1.8,
    );
  }

  return roundMetric(
    aggregate.avgScoreGain
    + aggregate.avgKills * 0.8
    + aggregate.survivalRate * 500
    - aggregate.avgDamageTaken * 2,
  );
}

function toAggregate(accumulator: MetricAccumulator): StrategyPhaseAggregate {
  const runs = Math.max(1, accumulator.runs);
  const base = {
    candidateId: accumulator.candidateId,
    strategyProfileHash: accumulator.strategyProfileHash,
    phaseId: accumulator.phaseId,
    startSeconds: accumulator.startSeconds,
    endSeconds: accumulator.endSeconds,
    runs: accumulator.runs,
    survivalRate: roundMetric(accumulator.survived / runs),
    avgScoreGain: roundMetric(accumulator.scoreGain / runs),
    avgExpGain: roundMetric(accumulator.expGain / runs),
    avgLevelGain: roundMetric(accumulator.levelGain / runs),
    avgEndLevel: roundMetric(accumulator.endLevel / runs),
    avgEndExp: roundMetric(accumulator.endExp / runs),
    avgEndPlayerHp: roundMetric(accumulator.endPlayerHp / runs),
    avgEndPlayerHpRatio: roundMetric(accumulator.endPlayerHpRatio / runs),
    avgKills: roundMetric(accumulator.kills / runs),
    avgDamageDealt: roundMetric(accumulator.damageDealt / runs),
    avgBossDamageDealt: roundMetric(accumulator.bossDamageDealt / runs),
    avgDamageTaken: roundMetric(accumulator.damageTaken / runs),
    avgPickupsCollected: roundMetric(accumulator.pickupsCollected / runs),
    avgEnemiesSpawned: roundMetric(accumulator.enemiesSpawned / runs),
    bossKillRate: roundMetric(accumulator.bossKilled / runs),
  };

  return {
    ...base,
    phaseFitnessScore: calculatePhaseFitnessScore(base),
  };
}

function getTracePointAtOrBefore(trace: readonly SimTracePoint[], timeMs: number): SimTracePoint | undefined {
  let selected: SimTracePoint | undefined;

  for (const point of trace) {
    if (point.timeMs > timeMs) {
      break;
    }

    selected = point;
  }

  return selected;
}

function createZeroTracePoint(): SimTracePoint {
  return {
    tick: 0,
    timeMs: 0,
    score: 0,
    playerX: 0,
    playerY: 0,
    playerHp: 0,
    playerMaxHp: 0,
    level: 1,
    enemyCount: 0,
    pickupCount: 0,
    kills: 0,
    exp: 0,
    damageDealt: 0,
    bossDamageDealt: 0,
    damageTaken: 0,
    pickupsCollected: 0,
    enemiesSpawned: 0,
    bossSpawned: false,
    bossKilled: false,
    endlessStarted: false,
  };
}

function trimPhaseNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}
