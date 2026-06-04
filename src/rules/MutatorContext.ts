export type MutatorRunMode = 'normal' | 'endless' | 'challenge' | 'custom';

export interface MutatorContext {
  difficultyId: string;
  characterId: string;
  stageId: string;
  mapId: string;
  mode: MutatorRunMode;
  seed?: string;
  endlessTimeSeconds?: number;
  contentSource?: 'builtin' | 'custom' | 'mod';
}
