import { CharacterManager } from '../character/CharacterManager';
import { I18n } from '../i18n/I18n';
import { StageManager } from '../stage/StageManager';

import { UnlockManager } from './UnlockManager';

export interface VictoryUnlockResult {
  messages: string[];
}

export class VictoryUnlockService {
  unlockNextForVictory(context: {
    resultType: 'gameOver' | 'victory';
    characterId?: string;
    stageId?: string;
  }): VictoryUnlockResult {
    if (context.resultType !== 'victory') {
      return { messages: [] };
    }

    return {
      messages: [
        ...this.unlockNextCharacter(context.characterId),
        ...this.unlockNextStage(context.stageId),
      ],
    };
  }

  private unlockNextCharacter(characterId: string | undefined): string[] {
    if (!characterId) {
      return [];
    }

    const characterManager = new CharacterManager();
    const characters = characterManager.listCharacters({ includeLocked: true });
    const index = characters.findIndex((character) => character.id === characterId);
    const nextCharacter = index >= 0 ? characters[index + 1] : undefined;

    if (!nextCharacter || !UnlockManager.unlock('character', nextCharacter.id)) {
      return [];
    }

    return [I18n.t('unlock.message.character', { name: I18n.t(nextCharacter.nameKey) })];
  }

  private unlockNextStage(stageId: string | undefined): string[] {
    if (!stageId) {
      return [];
    }

    const stageManager = new StageManager();
    const stages = stageManager.listStages({ includeLocked: true });
    const index = stages.findIndex((stage) => stage.id === stageId);
    const nextStage = index >= 0 ? stages[index + 1] : undefined;

    if (!nextStage || !UnlockManager.unlock('stage', nextStage.id)) {
      return [];
    }

    UnlockManager.unlock('map', nextStage.mapId);
    return [I18n.t('unlock.message.stage', { name: nextStage.name })];
  }
}
