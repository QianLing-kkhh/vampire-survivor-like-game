import {
  SAVE_SCHEMA_VERSION,
  SaveData,
  createDefaultSaveData,
} from './SaveData';
import { isSupportedLocale } from '../i18n/Locale';
import { DEFAULT_AUDIO_SETTINGS } from '../settings/AudioSettings';
import { DEFAULT_DEVELOPER_SETTINGS } from '../settings/DeveloperSettings';
import { DEFAULT_DISPLAY_SETTINGS } from '../settings/DisplaySettings';
import { DEFAULT_GAMEPLAY_SETTINGS } from '../settings/GameplaySettings';
import { DEFAULT_INPUT_SETTINGS } from '../settings/InputSettings';

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
      settings: this.migrateSettings(save.settings),
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

  private migrateSettings(settings: unknown): SaveData['settings'] {
    const defaultSettings = createDefaultSaveData().settings;

    if (!settings || typeof settings !== 'object') {
      return defaultSettings;
    }

    const rawSettings = settings as Record<string, unknown>;

    if (
      this.isObject(rawSettings.gameplay)
      || this.isObject(rawSettings.audio)
      || this.isObject(rawSettings.display)
      || this.isObject(rawSettings.input)
      || this.isObject(rawSettings.developer)
    ) {
      const display = rawSettings.display as Partial<SaveData['settings']['display']> | undefined;

      return {
        gameplay: {
          ...DEFAULT_GAMEPLAY_SETTINGS,
          ...(this.isObject(rawSettings.gameplay) ? rawSettings.gameplay : {}),
        },
        audio: {
          ...DEFAULT_AUDIO_SETTINGS,
          ...(this.isObject(rawSettings.audio) ? rawSettings.audio : {}),
        },
        display: {
          ...DEFAULT_DISPLAY_SETTINGS,
          ...(display ?? {}),
          locale: isSupportedLocale(display?.locale)
            ? display.locale
            : DEFAULT_DISPLAY_SETTINGS.locale,
        },
        input: {
          ...DEFAULT_INPUT_SETTINGS,
          ...(this.isObject(rawSettings.input) ? rawSettings.input : {}),
        },
        developer: {
          ...DEFAULT_DEVELOPER_SETTINGS,
          ...(this.isObject(rawSettings.developer) ? rawSettings.developer : {}),
        },
      };
    }

    const audioEnabled = rawSettings.audioEnabled === undefined
      ? Boolean(rawSettings.soundEnabled)
      : Boolean(rawSettings.audioEnabled);
    const legacyAutoMode = Boolean(rawSettings.autoMode);
    const autoMovement = rawSettings.autoMovement === undefined
      ? legacyAutoMode
      : Boolean(rawSettings.autoMovement);
    const autoUpgrade = rawSettings.autoUpgrade === undefined
      ? legacyAutoMode
      : Boolean(rawSettings.autoUpgrade);

    return {
      gameplay: {
        ...DEFAULT_GAMEPLAY_SETTINGS,
        autoMovement,
        autoUpgrade,
        fastMode: Boolean(rawSettings.fastMode),
        endlessMode: Boolean(rawSettings.endlessMode),
        autoTimeScale: this.readNumber(rawSettings.autoTimeScale, DEFAULT_GAMEPLAY_SETTINGS.autoTimeScale),
      },
      audio: {
        ...DEFAULT_AUDIO_SETTINGS,
        audioEnabled,
        bgmVolume: this.readVolume(rawSettings.bgmVolume),
        sfxVolume: this.readVolume(rawSettings.sfxVolume),
        weaponVolume: this.readVolume(rawSettings.weaponVolume),
        uiVolume: this.readVolume(rawSettings.uiVolume),
      },
      display: {
        ...DEFAULT_DISPLAY_SETTINGS,
        locale: isSupportedLocale(rawSettings.locale)
          ? rawSettings.locale
          : DEFAULT_DISPLAY_SETTINGS.locale,
      },
      input: { ...DEFAULT_INPUT_SETTINGS },
      developer: { ...DEFAULT_DEVELOPER_SETTINGS },
    };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private readVolume(value: unknown): number {
    return this.readNumber(value, 0, 0, 1);
  }

  private readNumber(
    value: unknown,
    fallback: number,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
  ): number {
    return typeof value === 'number'
      ? Math.max(min, Math.min(max, value))
      : fallback;
  }
}
