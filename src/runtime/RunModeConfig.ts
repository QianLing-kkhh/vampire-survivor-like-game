import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';

export type RunControlMode = 'manual' | 'autoStrategy' | 'replay';
export type AutoChallengeType = 'normal' | 'endless' | 'scoreAttack';

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

export function createManualRunModeConfig(speed = 1): RunModeConfig {
  const speedBucket = createSpeedBucket(speed);

  return {
    controlMode: 'manual',
    simulationSpeedMultiplier: speed,
    viewPlaybackSpeedMultiplier: speed,
    speedBucket,
  };
}
