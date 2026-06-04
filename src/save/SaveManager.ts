import {
  SaveData,
  SaveSummary,
  createDefaultSaveData,
} from './SaveData';
import { createSaveExportPackage } from './SaveExport';
import { SaveImportResult, createSaveImportResult } from './SaveImportResult';
import { SaveMigrator } from './SaveMigrator';
import { SaveStorage } from './SaveStorage';
import { SaveValidator } from './SaveValidator';

export type SaveListener = (saveData: SaveData) => void;
type SaveSettingsUpdate = Partial<{
  [Domain in keyof SaveData['settings']]: Partial<SaveData['settings'][Domain]>;
}>;
export type SaveDataUpdate = Partial<Omit<SaveData, 'settings' | 'progression' | 'selections' | 'cosmetics' | 'records'>> & {
  settings?: SaveSettingsUpdate;
  progression?: Partial<SaveData['progression']>;
  selections?: Partial<SaveData['selections']>;
  cosmetics?: Partial<SaveData['cosmetics']>;
  records?: Partial<SaveData['records']>;
};

export class SaveManager {
  private static readonly storage = new SaveStorage();
  private static readonly migrator = new SaveMigrator();
  private static readonly validator = new SaveValidator();
  private static readonly listeners = new Set<SaveListener>();
  private static saveData: SaveData | null = null;

  static load(): SaveData {
    const loadedSave = this.migrator.migrate(this.storage.loadRaw());

    this.saveData = loadedSave;
    this.save();
    return this.clone(loadedSave);
  }

  static save(): void {
    const saveData = this.saveData ?? createDefaultSaveData();

    this.saveData = saveData;
    this.storage.saveRaw(JSON.stringify(saveData));
  }

  static get(): SaveData {
    if (!this.saveData) {
      return this.load();
    }

    return this.clone(this.saveData);
  }

  static update(partial: SaveDataUpdate): SaveData {
    const currentSave = this.saveData ?? this.load();
    const nextSave: SaveData = {
      ...currentSave,
      ...partial,
      settings: {
        gameplay: {
          ...currentSave.settings.gameplay,
          ...partial.settings?.gameplay,
        },
        audio: {
          ...currentSave.settings.audio,
          ...partial.settings?.audio,
        },
        display: {
          ...currentSave.settings.display,
          ...partial.settings?.display,
        },
        input: {
          ...currentSave.settings.input,
          ...partial.settings?.input,
        },
        developer: {
          ...currentSave.settings.developer,
          ...partial.settings?.developer,
        },
      },
      progression: {
        ...currentSave.progression,
        ...partial.progression,
      },
      selections: {
        ...currentSave.selections,
        ...partial.selections,
      },
      cosmetics: {
        ...currentSave.cosmetics,
        ...partial.cosmetics,
      },
      records: {
        ...currentSave.records,
        ...partial.records,
      },
    };

    this.saveData = nextSave;
    this.save();
    this.notify();
    return this.clone(nextSave);
  }

  static reset(): SaveData {
    this.saveData = createDefaultSaveData();
    this.save();
    this.notify();
    return this.get();
  }

  static resetSave(): SaveData {
    return this.reset();
  }

  static exportSave(): string {
    return JSON.stringify(createSaveExportPackage(this.get()), null, 2);
  }

  static importSave(serialized: string): SaveImportResult {
    let parsed: unknown;

    try {
      parsed = JSON.parse(serialized);
    } catch {
      return createSaveImportResult([
        {
          level: 'error',
          code: 'invalid_json',
          message: 'Save import text is not valid JSON.',
        },
      ]);
    }

    const candidateSave = this.extractSaveCandidate(parsed);
    const validationResult = this.validator.validateSave(candidateSave);

    if (!validationResult.success) {
      return validationResult;
    }

    const migratedSave = this.migrator.migrate(JSON.stringify(candidateSave));

    this.saveData = migratedSave;
    this.save();
    this.notify();

    return {
      success: true,
      save: this.clone(migratedSave),
      errors: [],
      warnings: validationResult.warnings,
    };
  }

  static validateCurrentSave(): SaveImportResult {
    const currentSave = this.get();
    const validationResult = this.validator.validateSave(currentSave);

    return {
      ...validationResult,
      save: validationResult.success ? currentSave : undefined,
    };
  }

  static getSaveSummary(): SaveSummary {
    const saveData = this.get();

    return {
      schemaVersion: saveData.schemaVersion,
      selectedCharacterId: saveData.selections.selectedCharacterId,
      selectedStageId: saveData.selections.selectedStageId,
      selectedMapId: saveData.selections.selectedMapId,
      selectedDifficultyId: saveData.selections.selectedDifficultyId ?? 'normal',
      selectedThemeId: saveData.cosmetics.selectedThemeId
        ?? saveData.selections.selectedThemeId,
      settingsCount: Object.values(saveData.settings)
        .reduce((total, domain) => total + Object.keys(domain).length, 0),
      unlockCount: Object.values(saveData.progression.unlocks)
        .filter((progress) => progress.unlocked).length,
      achievementCount: Object.values(saveData.progression.achievements)
        .filter((progress) => progress.unlocked).length,
      leaderboardCount: Object.values(saveData.records.leaderboardsByKey)
        .reduce((total, records) => total + records.length, 0),
    };
  }

  static clear(): void {
    this.saveData = null;
    this.storage.clear();
    this.notify();
  }

  static hasStoredSave(): boolean {
    return this.storage.loadRaw() !== null;
  }

  static subscribe(listener: SaveListener): () => void {
    this.listeners.add(listener);

    return () => this.unsubscribe(listener);
  }

  static unsubscribe(listener: SaveListener): void {
    this.listeners.delete(listener);
  }

  private static notify(): void {
    const saveData = this.get();

    for (const listener of this.listeners) {
      listener(saveData);
    }
  }

  private static extractSaveCandidate(parsed: unknown): unknown {
    if (!this.isObject(parsed)) {
      return parsed;
    }

    if (this.isObject(parsed.save)) {
      return parsed.save;
    }

    return parsed;
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static clone(saveData: SaveData): SaveData {
    return JSON.parse(JSON.stringify(saveData)) as SaveData;
  }
}
