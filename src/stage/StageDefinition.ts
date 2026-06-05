import { MutatorConfig } from '../rules/MutatorConfig';

export interface StageDefinition {
  id: string;
  name: string;
  mapId: string;
  waveSetId?: string;
  finalBossId: string;
  finalBossSpawnTimeSeconds: number;
  warningBeforeSpawnSeconds: number;
  allowEndless?: boolean;
  difficultyId?: string;
  mutators?: MutatorConfig[];
}
