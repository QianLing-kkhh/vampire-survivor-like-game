import stages from '../data/stages.json';

import { StageDefinition } from './StageDefinition';

type StageData = Record<string, StageDefinition>;

const DEFAULT_STAGE_ID = 'stage_001';

export class StageManager {
  constructor(
    private readonly stageData: StageData = stages,
    private selectedStageId = DEFAULT_STAGE_ID,
  ) {}

  getSelectedStage(): StageDefinition {
    return this.getStage(this.selectedStageId);
  }

  getStage(stageId: string): StageDefinition {
    return this.stageData[stageId] ?? this.stageData[DEFAULT_STAGE_ID];
  }

  getFinalBossWarningTimeSeconds(stage: StageDefinition): number {
    return Math.max(0, stage.finalBossSpawnTimeSeconds - stage.warningBeforeSpawnSeconds);
  }
}
