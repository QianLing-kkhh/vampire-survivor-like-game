import { CharacterManager } from '../character/CharacterManager';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import { CustomStageValidator } from '../custom/CustomStageValidator';
import { I18n } from '../i18n/I18n';
import { MapManager } from '../map/MapManager';
import { SaveManager } from '../save/SaveManager';
import { StageManager } from '../stage/StageManager';
import { UnlockManager } from '../unlock/UnlockManager';

import {
  DEFAULT_SELECTION_STATE,
  RANDOM_UNLOCKED_CHARACTER_ID,
  RANDOM_UNLOCKED_STAGE_ID,
  SelectionState,
} from './SelectionState';
import { SelectionSummary } from './SelectionSummary';

type SelectionListener = (selection: SelectionState) => void;

export class SelectionManager {
  private static readonly listeners = new Set<SelectionListener>();

  static getSelection(): SelectionState {
    const saveSelection = SaveManager.get().selections;
    const stageManager = new StageManager();
    const mapManager = new MapManager();
    const characterId = this.getValidCharacterSelectionId(saveSelection.selectedCharacterId);
    const stageId = stageManager.isRandomStageSelection(saveSelection.selectedStageId)
      ? RANDOM_UNLOCKED_STAGE_ID
      : stageManager.getStage(saveSelection.selectedStageId).id;
    const map = mapManager.getMap(saveSelection.selectedMapId);
    const customStageId = this.getValidCustomStageId(saveSelection.selectedCustomStageId);

    return {
      ...DEFAULT_SELECTION_STATE,
      characterId,
      stageId,
      selectedStageId: stageId,
      mapId: map.id,
      difficultyId: saveSelection.selectedDifficultyId ?? DEFAULT_SELECTION_STATE.difficultyId,
      challengeId: saveSelection.selectedChallengeId,
      customStageId,
      seed: saveSelection.selectedSeed,
      rulesetId: saveSelection.selectedRulesetId,
      challengeDateKey: saveSelection.selectedChallengeDateKey,
    };
  }

  static setCharacterId(id: string): boolean {
    const characterManager = new CharacterManager();

    if (characterManager.isRandomCharacterSelection(id)) {
      characterManager.setSelectedCharacterId(id);
      this.notify();
      return true;
    }

    if (characterManager.getCharacter(id).id !== id) {
      console.warn(`Selection character id not found: ${id}`);
      return false;
    }

    UnlockManager.initialize();

    if (!UnlockManager.isUnlocked('character', id)) {
      console.warn(`Selection character is locked: ${id}`);
      return false;
    }

    characterManager.setSelectedCharacterId(id);
    this.notify();
    return true;
  }

  static setStageId(id: string): boolean {
    const stageManager = new StageManager();

    if (stageManager.isRandomStageSelection(id)) {
      SaveManager.update({
        selections: {
          selectedStageId: RANDOM_UNLOCKED_STAGE_ID,
          selectedMapId: DEFAULT_CONTENT_IDS.map,
          selectedCustomStageId: undefined,
        },
      });
      this.notify();
      return true;
    }

    const stage = stageManager.getStage(id);

    if (stage.id !== id) {
      console.warn(`Selection stage id not found: ${id}`);
      return false;
    }

    if (!UnlockManager.isUnlocked('stage', id)) {
      console.warn(`Selection stage is locked: ${id}`);
      return false;
    }

    SaveManager.update({
      selections: {
        selectedStageId: stage.id,
        selectedMapId: stage.mapId,
        selectedCustomStageId: undefined,
      },
    });
    this.notify();
    return true;
  }

  static setMapId(id: string): boolean {
    const mapManager = new MapManager();

    if (mapManager.getMap(id).id !== id) {
      console.warn(`Selection map id not found: ${id}`);
      return false;
    }

    if (!UnlockManager.isUnlocked('map', id)) {
      console.warn(`Selection map is locked: ${id}`);
      return false;
    }

    SaveManager.update({
      selections: {
        selectedMapId: id,
        selectedCustomStageId: undefined,
      },
    });
    this.notify();
    return true;
  }

  static setCustomStageId(customStageId: string): boolean {
    const stagePackage = new CustomStageStorage().get(customStageId);

    if (!stagePackage) {
      console.warn(`Selection custom stage package not found: ${customStageId}`);
      return false;
    }

    const validation = new CustomStageValidator().validate(stagePackage);

    if (!validation.valid) {
      console.warn(`Selection custom stage package is invalid: ${customStageId}`);
      return false;
    }

    SaveManager.update({
      selections: {
        selectedCustomStageId: stagePackage.id,
        selectedStageId: stagePackage.stage.id,
        selectedMapId: stagePackage.map.id,
      },
    });
    this.notify();
    return true;
  }

  static clearCustomStage(): void {
    SaveManager.update({
      selections: {
        selectedCustomStageId: undefined,
        selectedStageId: DEFAULT_SELECTION_STATE.stageId,
        selectedMapId: DEFAULT_SELECTION_STATE.mapId,
      },
    });
    this.notify();
  }

  static isCustomStageSelected(): boolean {
    return this.getSelection().customStageId !== undefined;
  }

  static setDifficultyId(id: string): boolean {
    if (!id) {
      console.warn('Selection difficulty id cannot be empty.');
      return false;
    }

    SaveManager.update({
      selections: {
        selectedDifficultyId: id,
      },
    });
    this.notify();
    return true;
  }

  static setSeed(seed: string): void {
    SaveManager.update({
      selections: {
        selectedSeed: seed,
      },
    });
    this.notify();
  }

  static clearChallengeSelection(): void {
    SaveManager.update({
      selections: {
        selectedChallengeId: undefined,
        selectedCustomStageId: undefined,
        selectedSeed: undefined,
        selectedRulesetId: undefined,
        selectedChallengeDateKey: undefined,
      },
    });
    this.notify();
  }

  static setChallengeSelection(selection: {
    challengeId: string;
    characterId: string;
    stageId: string;
    mapId: string;
    difficultyId?: string;
    seed: string;
    rulesetId?: string;
    challengeDateKey?: string;
  }): void {
    SaveManager.update({
      selections: {
        selectedChallengeId: selection.challengeId,
        selectedCharacterId: selection.characterId,
        selectedStageId: selection.stageId,
        selectedMapId: selection.mapId,
        selectedDifficultyId: selection.difficultyId ?? DEFAULT_SELECTION_STATE.difficultyId,
        selectedCustomStageId: undefined,
        selectedSeed: selection.seed,
        selectedRulesetId: selection.rulesetId,
        selectedChallengeDateKey: selection.challengeDateKey,
      },
    });
    this.notify();
  }

  static getSummary(): SelectionSummary {
    const selection = this.getSelection();
    const characterManager = new CharacterManager();
    const character = characterManager.isRandomCharacterSelection(selection.characterId)
      ? characterManager.listSelectableCharacters()[0]
      : characterManager.getCharacter(selection.characterId);
    const stageManager = new StageManager();
    const isRandomStage = stageManager.isRandomStageSelection(selection.stageId);
    const stage = isRandomStage
      ? undefined
      : stageManager.getStage(selection.stageId);
    const map = new MapManager().getMap(selection.mapId);
    const validation = this.validateSelection();

    return {
      characterId: character.id,
      characterName: I18n.t(character.nameKey),
      stageId: isRandomStage ? RANDOM_UNLOCKED_STAGE_ID : stage?.id ?? DEFAULT_CONTENT_IDS.stage,
      stageName: isRandomStage ? I18n.t('stage.random.name') : stage?.name ?? DEFAULT_CONTENT_IDS.stage,
      mapId: map.id,
      mapName: isRandomStage ? I18n.t('stageSelection.randomUnlocked') : map.name,
      difficultyId: selection.difficultyId,
      seed: selection.seed,
      valid: validation.valid,
      warnings: validation.warnings,
    };
  }

  static validateSelection(): { valid: boolean; warnings: string[] } {
    const saveSelection = SaveManager.get().selections;
    const warnings: string[] = [];

    const characterManager = new CharacterManager();

    if (
      !characterManager.isRandomCharacterSelection(saveSelection.selectedCharacterId)
      && characterManager.getCharacter(saveSelection.selectedCharacterId).id !== saveSelection.selectedCharacterId
    ) {
      warnings.push(`Character fallback: ${RANDOM_UNLOCKED_CHARACTER_ID}`);
    }

    const stageManager = new StageManager();

    if (
      !stageManager.isRandomStageSelection(saveSelection.selectedStageId)
      && stageManager.getStage(saveSelection.selectedStageId).id !== saveSelection.selectedStageId
    ) {
      warnings.push(`Stage fallback: ${DEFAULT_CONTENT_IDS.stage}`);
    }

    if (new MapManager().getMap(saveSelection.selectedMapId).id !== saveSelection.selectedMapId) {
      warnings.push(`Map fallback: ${DEFAULT_CONTENT_IDS.map}`);
    }

    if (saveSelection.selectedCustomStageId) {
      const stagePackage = new CustomStageStorage().get(saveSelection.selectedCustomStageId);

      if (!stagePackage) {
        warnings.push(`Custom stage fallback: ${DEFAULT_CONTENT_IDS.stage}`);
      } else if (!new CustomStageValidator().validate(stagePackage).valid) {
        warnings.push(`Custom stage invalid: ${saveSelection.selectedCustomStageId}`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  static subscribe(listener: SelectionListener): () => void {
    this.listeners.add(listener);

    return () => this.unsubscribe(listener);
  }

  static unsubscribe(listener: SelectionListener): void {
    this.listeners.delete(listener);
  }

  private static notify(): void {
    const selection = this.getSelection();

    for (const listener of this.listeners) {
      listener(selection);
    }
  }

  private static getValidCustomStageId(customStageId: string | undefined): string | undefined {
    if (!customStageId) {
      return undefined;
    }

    const stagePackage = new CustomStageStorage().get(customStageId);

    if (!stagePackage) {
      return undefined;
    }

    return new CustomStageValidator().validate(stagePackage).valid
      ? stagePackage.id
      : undefined;
  }

  private static getValidCharacterSelectionId(characterId: string): string {
    const characterManager = new CharacterManager();

    if (characterManager.isRandomCharacterSelection(characterId)) {
      return RANDOM_UNLOCKED_CHARACTER_ID;
    }

    const resolvedCharacter = characterManager.getCharacter(characterId);

    return resolvedCharacter.id === characterId
      ? characterId
      : RANDOM_UNLOCKED_CHARACTER_ID;
  }
}
