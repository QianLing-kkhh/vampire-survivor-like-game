export type StrategySpeedBucket =
  | '0.5x'
  | '1.0x'
  | '1.5x'
  | '2.0x'
  | '2.5x'
  | '3.0x';

export interface SimulationSpeedConfig {
  simulationSpeedMultiplier: number;
  viewPlaybackSpeedMultiplier: number;
  speedBucket: StrategySpeedBucket;
}

export interface SimulationSpeedConfigInput {
  simulationSpeedMultiplier?: number;
  viewPlaybackSpeedMultiplier?: number;
}

export interface LegacySimulationSpeedInput {
  fastMode: boolean;
  autoTimeScale: number;
}

const DEFAULT_SPEED = 1;
const SPEED_BUCKETS: readonly number[] = [0.5, 1, 1.5, 2, 2.5, 3];

export function createSpeedBucket(speed: number): StrategySpeedBucket {
  const safeSpeed = Number.isFinite(speed) ? speed : DEFAULT_SPEED;
  const nearest = SPEED_BUCKETS.reduce((best, candidate) => (
    Math.abs(candidate - safeSpeed) < Math.abs(best - safeSpeed) ? candidate : best
  ), DEFAULT_SPEED);

  return `${nearest.toFixed(1)}x` as StrategySpeedBucket;
}

export function createSimulationSpeedConfig(
  input: SimulationSpeedConfigInput = {},
): SimulationSpeedConfig {
  const simulationSpeedMultiplier = normalizeSpeed(input.simulationSpeedMultiplier ?? DEFAULT_SPEED);
  const viewPlaybackSpeedMultiplier = normalizeSpeed(
    input.viewPlaybackSpeedMultiplier ?? simulationSpeedMultiplier,
  );

  return {
    simulationSpeedMultiplier,
    viewPlaybackSpeedMultiplier,
    speedBucket: createSpeedBucket(simulationSpeedMultiplier),
  };
}

export function createSimulationSpeedConfigFromLegacySettings(
  input: LegacySimulationSpeedInput,
): SimulationSpeedConfig {
  return createSimulationSpeedConfig({
    simulationSpeedMultiplier: input.fastMode ? input.autoTimeScale : DEFAULT_SPEED,
  });
}

function normalizeSpeed(speed: number): number {
  return Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED;
}
