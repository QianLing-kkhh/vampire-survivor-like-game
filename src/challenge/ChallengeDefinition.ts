import { MutatorConfig } from '../rules/MutatorConfig';

export type ChallengeType = 'daily' | 'weekly' | 'seeded' | 'custom';

export interface ChallengeDefinition {
  id: string;
  nameKey: string;
  descriptionKey?: string;
  type: ChallengeType;
  dateKey?: string;
  characterId: string;
  stageId: string;
  mapId: string;
  seed: string;
  difficultyId?: string;
  mutators?: MutatorConfig[];
  endlessMode?: boolean;
}
