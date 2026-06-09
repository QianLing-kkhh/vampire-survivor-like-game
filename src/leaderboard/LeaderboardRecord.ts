import type {
  AutoChallengeType,
  LeaderboardControlMode,
  StrategySpeedBucket,
} from '../runtime/RunModeConfig';

export interface LeaderboardRecord {
  id: string;
  runId?: string;
  runSeed?: string;
  gameVersion?: string;
  contentHash?: string;
  timestamp: string;
  mode: string;
  controlMode?: LeaderboardControlMode;
  autoChallengeType?: AutoChallengeType;
  strategyProfileId?: string;
  strategyProfileHash?: string;
  simulationSpeedMultiplier?: number;
  speedBucket?: StrategySpeedBucket;
  resultType?: 'gameOver' | 'victory';
  survivalTime: number;
  endlessSurvivalTime?: number;
  score?: number;
  finalLevel: number;
  killCount: number;
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  customStageId?: string;
  challengeId?: string;
  rulesetId?: string;
  leaderboardKey?: string;
  seed?: string;
  weaponIds: string[];
  passiveItems: string[];
  evolutionPath: string[];
  metadata?: Record<string, unknown>;
}
