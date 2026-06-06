import { RelicEffectConfig } from './RelicEffect';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RelicDefinition {
  id: string;
  name?: string;
  description?: string;
  nameKey: string;
  descriptionKey: string;
  rarity?: RelicRarity;
  enabled?: boolean;
  iconKey?: string;
  tags?: string[];
  effects: RelicEffectConfig[];
}
