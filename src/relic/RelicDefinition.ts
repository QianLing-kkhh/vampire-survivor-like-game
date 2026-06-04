import { RelicEffectConfig } from './RelicEffect';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RelicDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  rarity?: RelicRarity;
  tags?: string[];
  effects: RelicEffectConfig[];
}
