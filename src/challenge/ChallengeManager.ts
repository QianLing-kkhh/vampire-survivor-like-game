import { CharacterManager } from '../character/CharacterManager';
import { MapManager } from '../map/MapManager';
import { SaveManager } from '../save/SaveManager';
import { SelectionManager } from '../selection/SelectionManager';
import { StageManager } from '../stage/StageManager';

import { ChallengeDefinition } from './ChallengeDefinition';
import { ChallengeRegistry } from './ChallengeRegistry';
import { ChallengeRules } from './ChallengeRules';
import { DailyChallengeGenerator } from './DailyChallengeGenerator';

export class ChallengeManager {
  getTodayChallenge(): ChallengeDefinition {
    return new DailyChallengeGenerator().generate();
  }

  getChallenge(id: string): ChallengeDefinition | undefined {
    if (id.startsWith('daily:')) {
      const dateKey = id.replace(/^daily:/, '');
      return new DailyChallengeGenerator().generate(dateKey);
    }

    return ChallengeRegistry.get(id);
  }

  activateChallenge(id: string): boolean {
    const challenge = this.getChallenge(id);

    if (!challenge) {
      console.warn(`Challenge not found: ${id}`);
      return false;
    }

    if (!this.isChallengeSelectable(challenge)) {
      return false;
    }

    SelectionManager.setChallengeSelection({
      challengeId: challenge.id,
      characterId: challenge.characterId,
      stageId: challenge.stageId,
      mapId: challenge.mapId,
      difficultyId: challenge.difficultyId ?? 'normal',
      seed: challenge.seed,
      rulesetId: ChallengeRules.getRulesetId(challenge),
      challengeDateKey: challenge.dateKey,
    });
    this.recordChallengeActivation(challenge.id);
    return true;
  }

  clearChallenge(): void {
    SelectionManager.clearChallengeSelection();
  }

  getActiveChallenge(): ChallengeDefinition | undefined {
    const challengeId = SelectionManager.getSelection().challengeId;

    return challengeId ? this.getChallenge(challengeId) : undefined;
  }

  private isChallengeSelectable(challenge: ChallengeDefinition): boolean {
    if (new CharacterManager().getCharacter(challenge.characterId).id !== challenge.characterId) {
      console.warn(`Challenge character not found: ${challenge.characterId}`);
      return false;
    }

    if (new StageManager().getStage(challenge.stageId).id !== challenge.stageId) {
      console.warn(`Challenge stage not found: ${challenge.stageId}`);
      return false;
    }

    if (new MapManager().getMap(challenge.mapId).id !== challenge.mapId) {
      console.warn(`Challenge map not found: ${challenge.mapId}`);
      return false;
    }

    return true;
  }

  private recordChallengeActivation(challengeId: string): void {
    const currentRecords = SaveManager.get().records;

    SaveManager.update({
      records: {
        challengeHistory: {
          ...currentRecords.challengeHistory,
          [challengeId]: {
            ...currentRecords.challengeHistory[challengeId],
            activatedAt: new Date().toISOString(),
          },
        },
      },
    });
  }
}
