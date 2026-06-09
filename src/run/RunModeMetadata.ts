import type {
  AutoChallengeType,
  RunControlMode,
  RunModeConfig,
  StrategyControlType,
} from '../runtime/RunModeConfig';
import type { StrategySpeedBucket } from '../runtime/SimulationSpeedConfig';

export interface RunModeMetadata {
  controlMode?: RunControlMode;
  autoChallengeType?: AutoChallengeType;
  strategyProfileId?: string;
  strategyProfileHash?: string;
  strategyControlType?: StrategyControlType;
  allowRuntimeStrategyEdit?: boolean;
  simulationSpeedMultiplier?: number;
  speedBucket?: StrategySpeedBucket;
}

export function createRunModeMetadataFromConfig(
  runModeConfig: RunModeConfig,
): RunModeMetadata {
  const isAutoStrategy = runModeConfig.controlMode === 'autoStrategy';

  return {
    controlMode: runModeConfig.controlMode,
    autoChallengeType: runModeConfig.autoChallengeType,
    strategyProfileId: isAutoStrategy ? runModeConfig.strategyProfileId : undefined,
    strategyProfileHash: isAutoStrategy ? runModeConfig.strategyProfileHash : undefined,
    strategyControlType: isAutoStrategy ? runModeConfig.strategyControlType : undefined,
    allowRuntimeStrategyEdit: isAutoStrategy ? runModeConfig.allowRuntimeStrategyEdit : undefined,
    simulationSpeedMultiplier: runModeConfig.simulationSpeedMultiplier,
    speedBucket: runModeConfig.speedBucket,
  };
}
