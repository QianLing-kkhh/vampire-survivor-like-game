import {
  SAVE_SCHEMA_VERSION,
  SaveData,
  createDefaultSaveData,
} from './SaveData';

export class SaveMigrator {
  migrate(rawSave: string | null): SaveData {
    if (!rawSave) {
      return createDefaultSaveData();
    }

    try {
      const parsedSave = JSON.parse(rawSave) as Partial<SaveData>;

      if (parsedSave.schemaVersion === SAVE_SCHEMA_VERSION) {
        return this.mergeWithDefaults(parsedSave);
      }

      return this.mergeWithDefaults(parsedSave);
    } catch (error) {
      console.warn('Save data is invalid. Falling back to default save.', error);
      return createDefaultSaveData();
    }
  }

  private mergeWithDefaults(save: Partial<SaveData>): SaveData {
    const defaultSave = createDefaultSaveData();

    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      settings: {
        ...defaultSave.settings,
        ...save.settings,
      },
      progression: {
        ...defaultSave.progression,
        ...save.progression,
      },
      selections: {
        ...defaultSave.selections,
        ...save.selections,
      },
      cosmetics: {
        ...defaultSave.cosmetics,
        ...save.cosmetics,
      },
      records: {
        ...defaultSave.records,
        ...save.records,
      },
    };
  }
}
