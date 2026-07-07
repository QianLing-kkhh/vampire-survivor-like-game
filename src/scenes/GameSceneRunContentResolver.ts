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

export interface GameSceneRunContentRandomSourceProviderPort {
  getStageRandomSource(selection: SelectionState): RandomSource;
}

export interface GameSceneRunContentResolverOptions {
  selectionProvider?: GameSceneRunContentSelectionProviderPort;
  randomSourceProvider?: GameSceneRunContentRandomSourceProviderPort;
}

const DEFAULT_SELECTION_PROVIDER: GameSceneRunContentSelectionProviderPort = SelectionManager;

const DEFAULT_RANDOM_SOURCE_PROVIDER: GameSceneRunContentRandomSourceProviderPort = {
  getStageRandomSource(selection) {
    const runSeed = RunSeed.createSeedFromSelection(selection);
    const randomManager = new RandomManager(runSeed);

    return randomManager.getSource('stage');
  },
};

export class GameSceneRunContentResolver {
  private readonly selectionProvider: GameSceneRunContentSelectionProviderPort;
  private readonly randomSourceProvider: GameSceneRunContentRandomSourceProviderPort;

  constructor();
  constructor(options: GameSceneRunContentResolverOptions);
  constructor(
    selectionProvider: GameSceneRunContentSelectionProviderPort,
    randomSourceProvider?: GameSceneRunContentRandomSourceProviderPort,
  );
  constructor(
    optionsOrSelectionProvider:
      | GameSceneRunContentResolverOptions
      | GameSceneRunContentSelectionProviderPort = {},
    randomSourceProvider?: GameSceneRunContentRandomSourceProviderPort,
  ) {
    if (this.isResolverOptions(optionsOrSelectionProvider)) {
      this.selectionProvider =
        optionsOrSelectionProvider.selectionProvider ?? DEFAULT_SELECTION_PROVIDER;
      this.randomSourceProvider =
        optionsOrSelectionProvider.randomSourceProvider ?? DEFAULT_RANDOM_SOURCE_PROVIDER;
      return;
    }

    this.selectionProvider = optionsOrSelectionProvider;
    this.randomSourceProvider = randomSourceProvider ?? DEFAULT_RANDOM_SOURCE_PROVIDER;
  }

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
    const selectedStageRuntime = stageManager.getSelectedStageRuntimeDefinition();
    const stage = selectedStageRuntime.source === 'custom'
      ? selectedStageRuntime.stage
      : stageManager.resolveStageForRun(
        selection.stageId,
        this.randomSourceProvider.getStageRandomSource(selection),
      );
    const map = selectedStageRuntime.source === 'custom'
      ? mapManager.getSelectedMap()
      : mapManager.resolveMapForStage(stage);

    return { stage, map, characterId: selection.characterId };
  }

  private isResolverOptions(
    value: GameSceneRunContentResolverOptions | GameSceneRunContentSelectionProviderPort,
  ): value is GameSceneRunContentResolverOptions {
    return !('getSelection' in value);
  }
}
