import { EnemyModifierConfig } from '../enemy/modifiers/EnemyModifierConfig';

export const CUSTOM_STAGE_SCHEMA_VERSION = 1;

export interface CustomStagePackage {
  schemaVersion: number;
  id: string;
  name: string;
  description?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  stage: CustomStageDefinition;
  map: CustomMapDefinition;
  waves: CustomWaveDefinition[];
  metadata?: Record<string, unknown>;
}

export interface CustomStageDefinition {
  id: string;
  name: string;
  mapId: string;
  waveSetId: string;
  finalBossId: string;
  finalBossSpawnTime: number;
  warningBeforeBoss: number;
  allowEndless: boolean;
  startingRules?: Record<string, unknown>;
}

export interface CustomMapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSetId?: string;
  landmarkSetId?: string;
  spawnRegions?: CustomSpawnRegion[];
  safeSpawnRadius?: number;
}

export interface CustomSpawnRegion {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CustomWaveDefinition {
  startTime: number;
  enemyId: string;
  count: number;
  interval: number;
  duration?: number;
  weight?: number;
  groupId?: string;
  modifiers?: EnemyModifierConfig[];
}
