import { CharacterManager } from '../character/CharacterManager';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { MapManager } from '../map/MapManager';
import { SaveManager } from '../save/SaveManager';
import { StageManager } from '../stage/StageManager';

import {
  DEFAULT_SELECTION_STATE,
  SelectionState,
} from './SelectionState';
import { SelectionSummary } from './SelectionSummary';

type SelectionListener = (selection: SelectionState) => void;

export class SelectionManager {
  private static readonly listeners = new Set<SelectionListener>();

  static getSelection(): SelectionState {
    const saveSelection = SaveManager.get().selections;
    const characterManager = new CharacterManager();
    const stageManager = new StageManager();
    const mapManager = new MapManager();
    const characterId = characterManager.getCharacter(saveSelection.selectedCharacterId).id;
    const stage = stageManager.getStage(saveSelection.selectedStageId);
    const map = mapManager.getMap(saveSelection.selectedMapId);

    return {
      ...DEFAULT_SELECTION_STATE,
      characterId,
      stageId: stage.id,
      mapId: map.id,
      difficultyId: saveSelection.selectedDifficultyId ?? DEFAULT_SELECTION_STATE.difficultyId,
      challengeId: saveSelection.selectedChallengeId,
      customStageId: saveSelection.selectedCustomStageId,
      seed: saveSelection.selectedSeed,
      rulesetId: saveSelection.selectedRulesetId,
    };
  }

  static setCharacterId(id: string): boolean {
    const characterManager = new CharacterManager();

    if (characterManager.getCharacter(id).id !== id) {
      console.warn(`Selection character id not found: ${id}`);
      return false;
    }

    characterManager.setSelectedCharacterId(id);
    this.notify();
    return true;
  }

  static setStageId(id: string): boolean {
    const stageManager = new StageManager();

    if (stageManager.getStage(id).id !== id) {
      console.warn(`Selection stage id not found: ${id}`);
      return false;
    }

    stageManager.setSelectedStageId(id);
    this.notify();
    return true;
  }

  static setMapId(id: string): boolean {
    const mapManager = new MapManager();

    if (mapManager.getMap(id).id !== id) {
      console.warn(`Selection map id not found: ${id}`);
      return false;
    }

    mapManager.setSelectedMapId(id);
    this.notify();
    return true;
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
      },
    });
    this.notify();
  }

  static getSummary(): SelectionSummary {
    const selection = this.getSelection();
    const character = new CharacterManager().getCharacter(selection.characterId);
    const stage = new StageManager().getStage(selection.stageId);
    const map = new MapManager().getMap(selection.mapId);
    const validation = this.validateSelection();

    return {
      characterId: character.id,
      characterName: character.name,
      stageId: stage.id,
      stageName: stage.name,
      mapId: map.id,
      mapName: map.name,
      difficultyId: selection.difficultyId,
      seed: selection.seed,
      valid: validation.valid,
      warnings: validation.warnings,
    };
  }

  static validateSelection(): { valid: boolean; warnings: string[] } {
    const saveSelection = SaveManager.get().selections;
    const warnings: string[] = [];

    if (new CharacterManager().getCharacter(saveSelection.selectedCharacterId).id !== saveSelection.selectedCharacterId) {
      warnings.push(`Character fallback: ${DEFAULT_CONTENT_IDS.character}`);
    }

    if (new StageManager().getStage(saveSelection.selectedStageId).id !== saveSelection.selectedStageId) {
      warnings.push(`Stage fallback: ${DEFAULT_CONTENT_IDS.stage}`);
    }

    if (new MapManager().getMap(saveSelection.selectedMapId).id !== saveSelection.selectedMapId) {
      warnings.push(`Map fallback: ${DEFAULT_CONTENT_IDS.map}`);
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
}
