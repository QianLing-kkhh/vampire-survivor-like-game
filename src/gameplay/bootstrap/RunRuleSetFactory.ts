import { CharacterDefinition } from '../../character/CharacterDefinition';
import { DifficultyDefinition } from '../../rules/DifficultyDefinition';
import { Mutator } from '../../rules/Mutator';
import { MutatorConfig } from '../../rules/MutatorConfig';
import { MutatorContext } from '../../rules/MutatorContext';
import { MutatorFactory } from '../../rules/MutatorFactory';
import { RunRuleSet } from '../../rules/RunRuleSet';
import { MapDefinition } from '../../map/MapDefinition';
import { SelectionState } from '../../selection/SelectionState';
import { StageDefinition } from '../../stage/StageDefinition';
import { StageRuntimeDefinition } from '../../stage/StageManager';

export interface RunRuleSetFactoryConfig {
  selectedDifficulty: DifficultyDefinition;
  selectedCharacter: CharacterDefinition;
  selectedStage: StageDefinition;
  selectedMap: MapDefinition;
  selectedStageRuntime: StageRuntimeDefinition;
  selection: SelectionState;
}

export interface RunRuleSetFactoryResult {
  mutatorConfigs: readonly MutatorConfig[];
  mutators: readonly Mutator[];
  mutatorContext: MutatorContext;
  runRuleSet: RunRuleSet;
}

export class RunRuleSetFactory {
  create(config: RunRuleSetFactoryConfig): RunRuleSetFactoryResult {
    const mutatorConfigs = config.selectedStage.mutators ?? [];
    const mutators = MutatorFactory.createMany(mutatorConfigs);
    const mutatorContext: MutatorContext = {
      difficultyId: config.selectedDifficulty.id,
      characterId: config.selectedCharacter.id,
      stageId: config.selectedStage.id,
      mapId: config.selectedMap.id,
      mode: 'normal',
      seed: config.selection.seed,
      contentSource: config.selectedStageRuntime.source,
    };
    const runRuleSet = new RunRuleSet(
      config.selectedDifficulty,
      mutators,
      mutatorConfigs,
      mutatorContext,
    );

    return {
      mutatorConfigs,
      mutators,
      mutatorContext,
      runRuleSet,
    };
  }
}
