import { CharacterDefinition } from '../../character/CharacterDefinition';
import { CharacterManager, CharacterSelectionMode } from '../../character/CharacterManager';
import { DifficultyDefinition } from '../../rules/DifficultyDefinition';
import { DifficultyManager } from '../../rules/DifficultyManager';
import { MapDefinition } from '../../map/MapDefinition';
import { MapManager } from '../../map/MapManager';
import { RandomManager } from '../../random/RandomManager';
import { RunSeed } from '../../random/RunSeed';
import { SelectionManager } from '../../selection/SelectionManager';
import { SelectionState } from '../../selection/SelectionState';
import { StageDefinition } from '../../stage/StageDefinition';
import { StageManager, StageRuntimeDefinition } from '../../stage/StageManager';

export type StageSelectionMode = 'fixed' | 'random_unlocked';

export interface RunSelectionResolution {
  selection: SelectionState;
  runSeed: string;
  randomManager: RandomManager;
  selectedCharacter: CharacterDefinition;
  characterSelectionMode: CharacterSelectionMode;
  selectedStageRuntime: StageRuntimeDefinition;
  selectedStage: StageDefinition;
  stageSelectionMode: StageSelectionMode;
  selectedMap: MapDefinition;
  selectedDifficulty: DifficultyDefinition;
}

export class RunSelectionResolver {
  resolve(): RunSelectionResolution {
    const characterManager = new CharacterManager();
    const stageManager = new StageManager();
    const mapManager = new MapManager();
    const difficultyManager = new DifficultyManager();
    const selection = SelectionManager.getSelection();
    const runSeed = RunSeed.createSeedFromSelection(selection);
    const randomManager = new RandomManager(runSeed);
    const selectedCharacter = characterManager.resolveCharacterForRun(
      selection.characterId,
      randomManager.getSource('character'),
    );
    const characterSelectionMode = characterManager.getCharacterSelectionMode(selection.characterId);
    const selectedStageRuntime = stageManager.getSelectedStageRuntimeDefinition();
    const selectedStage = selectedStageRuntime.source === 'custom'
      ? selectedStageRuntime.stage
      : stageManager.resolveStageForRun(selection.stageId, randomManager.getSource('stage'));
    const stageSelectionMode = stageManager.isRandomStageSelection(selection.stageId)
      ? 'random_unlocked'
      : 'fixed';
    const selectedMap = selectedStageRuntime.source === 'custom'
      ? mapManager.getSelectedMap()
      : mapManager.resolveMapForStage(selectedStage);
    const selectedDifficulty = selectedStage.difficultyId
      ? difficultyManager.getDifficulty(selectedStage.difficultyId)
      : difficultyManager.getSelectedDifficulty();

    return {
      selection,
      runSeed,
      randomManager,
      selectedCharacter,
      characterSelectionMode,
      selectedStageRuntime,
      selectedStage,
      stageSelectionMode,
      selectedMap,
      selectedDifficulty,
    };
  }
}
