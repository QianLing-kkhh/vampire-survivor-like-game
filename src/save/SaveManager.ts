import { SaveData, createDefaultSaveData } from './SaveData';
import { SaveMigrator } from './SaveMigrator';
import { SaveStorage } from './SaveStorage';

export type SaveListener = (saveData: SaveData) => void;
type SaveSettingsUpdate = Partial<{
  [Domain in keyof SaveData['settings']]: Partial<SaveData['settings'][Domain]>;
}>;
export type SaveDataUpdate = Partial<Omit<SaveData, 'settings'>> & {
  settings?: SaveSettingsUpdate;
};

export class SaveManager {
  private static readonly storage = new SaveStorage();
  private static readonly migrator = new SaveMigrator();
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

  private static clone(saveData: SaveData): SaveData {
    return JSON.parse(JSON.stringify(saveData)) as SaveData;
  }
}
