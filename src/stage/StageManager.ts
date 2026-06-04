import stages from '../data/stages.json';
import { SaveManager } from '../save/SaveManager';

import { StageDefinition } from './StageDefinition';

type StageData = Record<string, StageDefinition>;

const DEFAULT_STAGE_ID = 'stage_001';

export class StageManager {
  constructor(
    private readonly stageData: StageData = stages,
    private selectedStageId = SaveManager.get().selections.selectedStageId,
  ) {
    if (!this.stageData[this.selectedStageId]) {
      this.selectedStageId = DEFAULT_STAGE_ID;
    }
  }

  getSelectedStage(): StageDefinition {
    return this.getStage(this.selectedStageId);
  }

  getSelectedStageId(): string {
    return this.selectedStageId;
  }

  setSelectedStageId(stageId: string): void {
    this.selectedStageId = this.stageData[stageId] ? stageId : DEFAULT_STAGE_ID;

    SaveManager.update({
      selections: {
        ...SaveManager.get().selections,
        selectedStageId: this.selectedStageId,
      },
    });
  }

  getStage(stageId: string): StageDefinition {
    return this.stageData[stageId] ?? this.stageData[DEFAULT_STAGE_ID];
  }

  getFinalBossWarningTimeSeconds(stage: StageDefinition): number {
    return Math.max(0, stage.finalBossSpawnTimeSeconds - stage.warningBeforeSpawnSeconds);
  }
}
