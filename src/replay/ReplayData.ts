import { VersionInfo } from '../version/VersionInfo';
import { RunMetadata } from '../run/RunMetadata';

export interface ReplaySelectionSnapshot {
  selectedCharacterId?: string;
  characterSelectionMode?: 'fixed' | 'random_unlocked';
  characterId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  customStageId?: string;
  challengeId?: string;
  seed?: string;
  rulesetId?: string;
}

export interface ReplaySettingsSnapshot {
  autoMovement: boolean;
  autoUpgrade: boolean;
  fastMode: boolean;
  endlessMode: boolean;
}

export interface ReplayInputSample {
  timeMs: number;
  moveX: number;
  moveY: number;
  skill1?: boolean;
  skill2?: boolean;
  pause?: boolean;
}

export interface ReplayEventMarker {
  timeMs: number;
  type: string;
  payload?: Record<string, unknown>;
}

export interface ReplayResultSummary {
  resultType: string;
  survivalTime: number;
  endlessSurvivalTime?: number;
  finalLevel: number;
  killCount: number;
}

export interface ReplayData {
  replayVersion: number;
  createdAt: string;
  gameVersion?: string;
  contentHash?: string;
  saveSchemaVersion?: number;
  csvSchemaVersion?: number;
  versionInfo?: VersionInfo;
  metadata?: RunMetadata;
  runId: string;
  runSeed: string;
  selection: ReplaySelectionSnapshot;
  settingsSnapshot: ReplaySettingsSnapshot;
  inputSamples: ReplayInputSample[];
  events: ReplayEventMarker[];
  result?: ReplayResultSummary;
}

export interface ReplayStartConfig {
  runId: string;
  runSeed: string;
  selection: ReplaySelectionSnapshot;
  settingsSnapshot: ReplaySettingsSnapshot;
  saveSchemaVersion?: number;
  csvSchemaVersion?: number;
  versionInfo?: VersionInfo;
  metadata?: RunMetadata;
}
