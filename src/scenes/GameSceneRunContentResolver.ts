import type { MapDefinition } from '../map/MapDefinition';
import { RandomManager } from '../random/RandomManager';
import type { RandomSource } from '../random/RandomSource';
import { RunSeed } from '../random/RunSeed';
import { SelectionManager } from '../selection/SelectionManager';
import type { SelectionState } from '../selection/SelectionState';
import type { StageDefinition } from '../stage/StageDefinition';

type GameSceneRunSelectedStageRuntime = Readonly<{
  source: 'builtin' | 'custom';
  stage: StageDefinition;
}>;

export interface GameSceneRunContent {
  stage: StageDefinition;
  map: MapDefinition;
  characterId: string;
}

export interface GameSceneRunContentStageManagerPort {
  getSelectedStageRuntimeDefinition(): GameSceneRunSelectedStageRuntime;
  resolveStageForRun(
    stageId: string,
    randomSource: RandomSource,
  ): StageDefinition;
}

export interface GameSceneRunContentMapManagerPort {
  getSelectedMap(): MapDefinition;
  resolveMapForStage(stage: StageDefinition): MapDefinition;
}

export interface GameSceneRunContentSelectionProviderPort {
  getSelection(): SelectionState;
}

const DEFAULT_SELECTION_PROVIDER: GameSceneRunContentSelectionProviderPort = SelectionManager;

export class GameSceneRunContentResolver {
  constructor(
    private readonly selectionProvider: GameSceneRunContentSelectionProviderPort =
      DEFAULT_SELECTION_PROVIDER,
  ) {}

  resolve(
    stageManager: GameSceneRunContentStageManagerPort,
    mapManager: GameSceneRunContentMapManagerPort,
  ): GameSceneRunContent {
    const selection = this.selectionProvider.getSelection();

    return this.resolveForSelection(stageManager, mapManager, selection);
  }

  resolveForSelection(
    stageManager: GameSceneRunContentStageManagerPort,
    mapManager: GameSceneRunContentMapManagerPort,
    selection: SelectionState,
  ): GameSceneRunContent {
    const runSeed = RunSeed.createSeedFromSelection(selection);
    const randomManager = new RandomManager(runSeed);
    const selectedStageRuntime = stageManager.getSelectedStageRuntimeDefinition();
    const stage = selectedStageRuntime.source === 'custom'
      ? selectedStageRuntime.stage
      : stageManager.resolveStageForRun(selection.stageId, randomManager.getSource('stage'));
    const map = selectedStageRuntime.source === 'custom'
      ? mapManager.getSelectedMap()
      : mapManager.resolveMapForStage(stage);

    return { stage, map, characterId: selection.characterId };
  }
}
