import { DEFAULT_CONTENT_IDS } from '../content/ContentId';

import { ChallengeDefinition } from './ChallengeDefinition';

export class DailyChallengeGenerator {
  generate(dateKey = DailyChallengeGenerator.getTodayDateKey()): ChallengeDefinition {
    return {
      id: `daily:${dateKey}`,
      nameKey: 'challenge.daily.name',
      descriptionKey: 'challenge.daily.description',
      type: 'daily',
      dateKey,
      characterId: DEFAULT_CONTENT_IDS.character,
      stageId: DEFAULT_CONTENT_IDS.stage,
      mapId: DEFAULT_CONTENT_IDS.map,
      seed: `daily:${dateKey}`,
      difficultyId: 'normal',
      mutators: [],
      endlessMode: false,
    };
  }

  static getTodayDateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
