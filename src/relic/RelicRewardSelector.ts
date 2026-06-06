import { RandomSource } from '../random/RandomSource';

import { RelicDefinition, RelicRarity } from './RelicDefinition';

const RARITY_WEIGHTS: Record<RelicRarity, number> = {
  common: 60,
  rare: 30,
  epic: 10,
  legendary: 1,
};

export class RelicRewardSelector {
  selectAvailableRelic(context: {
    ownedRelicIds: readonly string[];
    random: RandomSource;
    definitions: readonly RelicDefinition[];
  }): RelicDefinition | undefined {
    const owned = new Set(context.ownedRelicIds);
    const availableRelics = context.definitions.filter((definition) => (
      definition.enabled !== false && !owned.has(definition.id)
    ));

    return context.random.weightedPick(
      availableRelics,
      (definition) => RARITY_WEIGHTS[definition.rarity ?? 'common'] ?? 1,
    );
  }
}
