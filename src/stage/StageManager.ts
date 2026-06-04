import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { SaveManager } from '../save/SaveManager';

import { StageDefinition } from './StageDefinition';

type StageData = Record<string, StageDefinition>;

export class StageManager {
  constructor(
    stageData?: StageData,
    private selectedStageId = SaveManager.get().selections.selectedStageId,
  ) {
    ContentBootstrap.ensureInitialized();
    this.stageData = stageData ?? this.getStageDataFromRegistry();

    if (!this.stageData[this.selectedStageId]) {
      this.selectedStageId = DEFAULT_CONTENT_IDS.stage;
    }
  }

  private readonly stageData: StageData;

  getSelectedStage(): StageDefinition {
    return this.getStage(this.selectedStageId);
  }

  getSelectedStageId(): string {
    return this.selectedStageId;
  }

  setSelectedStageId(stageId: string): void {
    this.selectedStageId = this.stageData[stageId] ? stageId : DEFAULT_CONTENT_IDS.stage;

    SaveManager.update({
      selections: {
        ...SaveManager.get().selections,
        selectedStageId: this.selectedStageId,
      },
    });
  }

  getStage(stageId: string): StageDefinition {
    return this.stageData[stageId] ?? this.stageData[DEFAULT_CONTENT_IDS.stage];
  }

  getFinalBossWarningTimeSeconds(stage: StageDefinition): number {
    return Math.max(0, stage.finalBossSpawnTimeSeconds - stage.warningBeforeSpawnSeconds);
  }

  private getStageDataFromRegistry(): StageData {
    return ContentRegistry.listStages().reduce<StageData>((record, stage) => {
      record[stage.id] = stage;
      return record;
    }, {});
  }
}
