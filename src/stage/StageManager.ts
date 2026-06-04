import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { CustomStagePackage } from '../custom/CustomStageSchema';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import { CustomStageValidator } from '../custom/CustomStageValidator';
import { SaveManager } from '../save/SaveManager';
import { UnlockManager } from '../unlock/UnlockManager';

import { StageDefinition } from './StageDefinition';

type StageData = Record<string, StageDefinition>;

export interface SelectableStageEntry {
  id: string;
  name: string;
  source: 'builtin' | 'custom';
  customStageId?: string;
  mapId: string;
  description?: string;
  valid: boolean;
  warnings?: string[];
}

export interface StageRuntimeDefinition {
  source: 'builtin' | 'custom';
  stage: StageDefinition;
  customStagePackage?: CustomStagePackage;
}

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
    return this.getSelectedStageRuntimeDefinition().stage;
  }

  getSelectedStageRuntimeDefinition(): StageRuntimeDefinition {
    const customStagePackage = this.getSelectedCustomStagePackage();

    if (customStagePackage) {
      return {
        source: 'custom',
        stage: this.toStageDefinition(customStagePackage),
        customStagePackage,
      };
    }

    return {
      source: 'builtin',
      stage: this.getStage(this.getSelectedStageId()),
    };
  }

  getSelectedStageId(): string {
    const customStagePackage = this.getSelectedCustomStagePackage();

    if (customStagePackage) {
      return customStagePackage.stage.id;
    }

    const savedStageId = SaveManager.get().selections.selectedStageId;

    this.selectedStageId = this.stageData[savedStageId]
      ? savedStageId
      : DEFAULT_CONTENT_IDS.stage;

    return this.selectedStageId;
  }

  setSelectedStageId(stageId: string): void {
    this.selectedStageId = this.stageData[stageId] ? stageId : DEFAULT_CONTENT_IDS.stage;

    SaveManager.update({
      selections: {
        selectedStageId: this.selectedStageId,
        selectedCustomStageId: undefined,
      },
    });
  }

  getStage(stageId: string): StageDefinition {
    const customStagePackage = this.getSelectedCustomStagePackage();

    if (customStagePackage?.stage.id === stageId) {
      return this.toStageDefinition(customStagePackage);
    }

    return this.stageData[stageId] ?? this.stageData[DEFAULT_CONTENT_IDS.stage];
  }

  listStages(options: { includeLocked?: boolean } = {}): StageDefinition[] {
    const stages = Object.values(this.stageData).map((stage) => ({ ...stage }));

    if (options.includeLocked === true) {
      return stages;
    }

    return stages.filter((stage) => this.isStageUnlocked(stage.id));
  }

  isStageUnlocked(stageId: string): boolean {
    return UnlockManager.isUnlocked('stage', stageId);
  }

  listSelectableStages(): SelectableStageEntry[] {
    const builtinStages = this.listStages({ includeLocked: false }).map((stage) => ({
      id: stage.id,
      name: stage.name,
      source: 'builtin' as const,
      mapId: stage.mapId,
      description: stage.mapId,
      valid: true,
      warnings: [],
    }));
    const validator = new CustomStageValidator();
    const customStages = new CustomStageStorage().list().map((stagePackage) => {
      const validation = validator.validate(stagePackage);

      return {
        id: stagePackage.id,
        name: stagePackage.name,
        source: 'custom' as const,
        customStageId: stagePackage.id,
        mapId: stagePackage.map.id,
        description: stagePackage.stage.id,
        valid: validation.valid,
        warnings: validation.warnings.map((warning) => warning.message),
      };
    });

    return [...builtinStages, ...customStages];
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

  private getSelectedCustomStagePackage(): CustomStagePackage | undefined {
    const customStageId = SaveManager.get().selections.selectedCustomStageId;

    if (!customStageId) {
      return undefined;
    }

    const stagePackage = new CustomStageStorage().get(customStageId);

    if (!stagePackage) {
      console.warn(`Selected custom stage package not found: ${customStageId}`);
      return undefined;
    }

    const validation = new CustomStageValidator().validate(stagePackage);

    if (!validation.valid) {
      console.warn(`Selected custom stage package is invalid: ${customStageId}`);
      return undefined;
    }

    return stagePackage;
  }

  private toStageDefinition(stagePackage: CustomStagePackage): StageDefinition {
    return {
      id: stagePackage.stage.id,
      name: stagePackage.stage.name,
      mapId: stagePackage.map.id,
      finalBossId: stagePackage.stage.finalBossId,
      finalBossSpawnTimeSeconds: stagePackage.stage.finalBossSpawnTime,
      warningBeforeSpawnSeconds: stagePackage.stage.warningBeforeBoss,
      mutators: stagePackage.stage.mutators,
    };
  }
}
