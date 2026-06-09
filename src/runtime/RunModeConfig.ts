import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import {
  createSimulationSpeedConfig,
  createSpeedBucket,
  SimulationSpeedConfig,
  SimulationSpeedConfigInput,
  StrategySpeedBucket,
} from './SimulationSpeedConfig';

export type { SimulationSpeedConfig, StrategySpeedBucket };
export { createSpeedBucket };

export type RunControlMode = 'manual' | 'autoStrategy' | 'replay';
export type AutoChallengeType = 'normal' | 'endless' | 'scoreAttack';
export type StrategyControlType = 'fixed' | 'live';

export interface RunModeConfig extends SimulationSpeedConfig {
  controlMode: RunControlMode;
  autoChallengeType?: AutoChallengeType;
  strategyProfileId?: string;
  strategyProfileHash?: string;
  strategyProfile?: AutoStrategyProfile;
  strategyControlType?: StrategyControlType;
  allowRuntimeStrategyEdit?: boolean;
}

export type LeaderboardControlMode = Exclude<RunControlMode, 'replay'>;

export function isStrategyControlType(value: unknown): value is StrategyControlType {
  return value === 'fixed' || value === 'live';
}

export function createManualRunModeConfig(
  speed: number | SimulationSpeedConfigInput = 1,
): RunModeConfig {
  const speedConfig = typeof speed === 'number'
    ? createSimulationSpeedConfig({ simulationSpeedMultiplier: speed })
    : createSimulationSpeedConfig(speed);

  return {
    ...speedConfig,
    controlMode: 'manual',
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
  const speedConfig = createSimulationSpeedConfig({
    simulationSpeedMultiplier: input.simulationSpeedMultiplier,
    viewPlaybackSpeedMultiplier: input.viewPlaybackSpeedMultiplier,
  });

  return {
    ...speedConfig,
    controlMode: 'autoStrategy',
    autoChallengeType: input.autoChallengeType ?? 'normal',
    strategyProfileId: input.strategyProfileId,
    strategyProfileHash: input.strategyProfileHash,
    strategyProfile: input.strategyProfile,
    strategyControlType: input.strategyControlType,
    allowRuntimeStrategyEdit: input.allowRuntimeStrategyEdit,
  };
}

export function createReplayRunModeConfig(playbackSpeed = 1): RunModeConfig {
  const speedConfig = createSimulationSpeedConfig({
    simulationSpeedMultiplier: 1,
    viewPlaybackSpeedMultiplier: playbackSpeed,
  });

  return {
    ...speedConfig,
    controlMode: 'replay',
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
