import { MutatorConfig } from '../rules/MutatorConfig';

export interface StageDefinition {
  id: string;
  name: string;
  mapId: string;
  finalBossId: string;
  finalBossSpawnTimeSeconds: number;
  warningBeforeSpawnSeconds: number;
  difficultyId?: string;
  mutators?: MutatorConfig[];
}
