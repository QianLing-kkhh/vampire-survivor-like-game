import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

export type RunControlMode = 'manual' | 'autoStrategy' | 'replay';
export type AutoChallengeType = 'normal' | 'endless' | 'scoreAttack';
export type StrategyControlType = 'fixed' | 'live';

export type StrategySpeedBucket =
  | '0.5x'
  | '1.0x'
  | '1.5x'
  | '2.0x'
  | '2.5x'
  | '3.0x';

export interface RunModeConfig {
  controlMode: RunControlMode;
  autoChallengeType?: AutoChallengeType;
  strategyProfileId?: string;
  strategyProfileHash?: string;
  strategyProfile?: AutoStrategyProfile;
  strategyControlType?: StrategyControlType;
  allowRuntimeStrategyEdit?: boolean;
  simulationSpeedMultiplier: number;
  viewPlaybackSpeedMultiplier: number;
  speedBucket: StrategySpeedBucket;
}

export type LeaderboardControlMode = Exclude<RunControlMode, 'replay'>;

const SPEED_BUCKETS: readonly number[] = [0.5, 1, 1.5, 2, 2.5, 3];

export function createSpeedBucket(speed: number): StrategySpeedBucket {
  const safeSpeed = Number.isFinite(speed) ? speed : 1;
  const nearest = SPEED_BUCKETS.reduce((best, candidate) => (
    Math.abs(candidate - safeSpeed) < Math.abs(best - safeSpeed) ? candidate : best
  ), 1);

  return `${nearest.toFixed(1)}x` as StrategySpeedBucket;
}

export function isStrategyControlType(value: unknown): value is StrategyControlType {
  return value === 'fixed' || value === 'live';
}

export function createManualRunModeConfig(speed = 1): RunModeConfig {
  const speedBucket = createSpeedBucket(speed);

  return {
    controlMode: 'manual',
    simulationSpeedMultiplier: speed,
    viewPlaybackSpeedMultiplier: speed,
    speedBucket,
  };
}

export interface AutoStrategyRunModeConfigInput {
  autoChallengeType?: AutoChallengeType;
  strategyProfileId: string;
  strategyProfileHash: string;
  strategyProfile: AutoStrategyProfile;
  strategyControlType: StrategyControlType;
  allowRuntimeStrategyEdit: boolean;
  simulationSpeedMultiplier?: number;
  viewPlaybackSpeedMultiplier?: number;
}

export function createAutoStrategyRunModeConfig(
  input: AutoStrategyRunModeConfigInput,
): RunModeConfig {
  const simulationSpeedMultiplier = input.simulationSpeedMultiplier ?? 1;
  const viewPlaybackSpeedMultiplier = input.viewPlaybackSpeedMultiplier ?? simulationSpeedMultiplier;

  return {
    controlMode: 'autoStrategy',
    autoChallengeType: input.autoChallengeType ?? 'normal',
    strategyProfileId: input.strategyProfileId,
    strategyProfileHash: input.strategyProfileHash,
    strategyProfile: input.strategyProfile,
    strategyControlType: input.strategyControlType,
    allowRuntimeStrategyEdit: input.allowRuntimeStrategyEdit,
    simulationSpeedMultiplier,
    viewPlaybackSpeedMultiplier,
    speedBucket: createSpeedBucket(simulationSpeedMultiplier),
  };
}

export function createReplayRunModeConfig(playbackSpeed = 1): RunModeConfig {
  return {
    controlMode: 'replay',
    simulationSpeedMultiplier: 1,
    viewPlaybackSpeedMultiplier: playbackSpeed,
    speedBucket: createSpeedBucket(playbackSpeed),
  };
}

export function createScoreAttackRunModeConfig(
  input: Omit<AutoStrategyRunModeConfigInput, 'autoChallengeType'>,
): RunModeConfig {
  return createAutoStrategyRunModeConfig({
    ...input,
    autoChallengeType: 'scoreAttack',
  });
}
