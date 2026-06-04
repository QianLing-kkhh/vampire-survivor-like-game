import { getBuiltInContentHash } from './ContentHash';
import { GAME_VERSION } from './GameVersion';
import {
  CSV_SCHEMA_VERSION,
  CUSTOM_STAGE_SCHEMA_VERSION,
  REPLAY_SCHEMA_VERSION,
  SAVE_SCHEMA_VERSION,
} from './SchemaVersion';

export interface VersionInfo {
  gameVersion: string;
  saveSchemaVersion: number;
  csvSchemaVersion: number;
  replaySchemaVersion: number;
  customStageSchemaVersion: number;
  contentHash: string;
}

export function getCurrentVersionInfo(): VersionInfo {
  return {
    gameVersion: GAME_VERSION,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    csvSchemaVersion: CSV_SCHEMA_VERSION,
    replaySchemaVersion: REPLAY_SCHEMA_VERSION,
    customStageSchemaVersion: CUSTOM_STAGE_SCHEMA_VERSION,
    contentHash: getBuiltInContentHash(),
  };
}

