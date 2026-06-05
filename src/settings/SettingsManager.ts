import { AppearanceManager } from '../appearance/AppearanceManager';
import { AppearanceSelection } from '../appearance/AppearanceSelection';
import { SaveData } from '../save/SaveData';
import { SaveManager } from '../save/SaveManager';

import { AudioSettingsData } from './AudioSettings';
import { DeveloperSettingsData } from './DeveloperSettings';
import { DisplaySettingsData } from './DisplaySettings';
import { GameplaySettingsData } from './GameplaySettings';
import { InputSettingsData } from './InputSettings';

export type SettingsData = SaveData['settings'];
export type SettingsDomain = keyof SettingsData;
export type SettingsValueByDomain = {
  gameplay: GameplaySettingsData;
  audio: AudioSettingsData;
  display: DisplaySettingsData;
  input: InputSettingsData;
  developer: DeveloperSettingsData;
};
export type SettingsChangeListener = (
  domain: SettingsDomain,
  settingName: string,
  settings: SettingsData,
) => void;

export class SettingsManager {
  private static readonly listeners = new Set<SettingsChangeListener>();

  static getAll(): SettingsData {
    return SettingsManager.clone(SaveManager.get().settings);
  }

  static getGameplay(): GameplaySettingsData {
    return { ...SettingsManager.getAll().gameplay };
  }

  static getAudio(): AudioSettingsData {
    return { ...SettingsManager.getAll().audio };
  }

  static getDisplay(): DisplaySettingsData {
    return { ...SettingsManager.getAll().display };
  }

  static getInput(): InputSettingsData {
    return {
      ...SettingsManager.getAll().input,
      keyBindings: { ...SettingsManager.getAll().input.keyBindings },
    };
  }

  static getDeveloper(): DeveloperSettingsData {
    return { ...SettingsManager.getAll().developer };
  }

  static getAppearance(): AppearanceSelection {
    return AppearanceManager.getSelection();
  }

  static updateGameplay(partial: Partial<GameplaySettingsData>): SettingsData {
    return SettingsManager.updateDomain('gameplay', partial);
  }

  static updateAudio(partial: Partial<AudioSettingsData>): SettingsData {
    const clampedPartial = SettingsManager.withoutUndefined({
      ...partial,
      bgmVolume: SettingsManager.clampVolume(partial.bgmVolume),
      sfxVolume: SettingsManager.clampVolume(partial.sfxVolume),
      weaponVolume: SettingsManager.clampVolume(partial.weaponVolume),
      uiVolume: SettingsManager.clampVolume(partial.uiVolume),
    });

    return SettingsManager.updateDomain('audio', clampedPartial);
  }

  static updateDisplay(partial: Partial<DisplaySettingsData>): SettingsData {
    const nextPartial = { ...partial };

    switch (partial.displayQuality) {
      case 'high':
        nextPartial.assetStyle = 'newArt';
        nextPartial.shadowsEnabled = true;
        break;
      case 'low':
        nextPartial.assetStyle = 'legacy';
        nextPartial.shadowsEnabled = false;
        break;
      case 'minimal':
        nextPartial.assetStyle = 'graphics';
        nextPartial.shadowsEnabled = false;
        break;
      default:
        break;
    }

    return SettingsManager.updateDomain('display', nextPartial);
  }

  static updateInput(partial: Partial<InputSettingsData>): SettingsData {
    return SettingsManager.updateDomain('input', partial);
  }

  static updateDeveloper(partial: Partial<DeveloperSettingsData>): SettingsData {
    const clampedPartial = SettingsManager.withoutUndefined({
      ...partial,
      debugPanelOpacity: typeof partial.debugPanelOpacity === 'number'
        ? Math.max(0.25, Math.min(1, partial.debugPanelOpacity))
        : undefined,
    });

    return SettingsManager.updateDomain('developer', clampedPartial);
  }

  static updateSelectedTheme(themeId: string): AppearanceSelection {
    AppearanceManager.setSelectedThemeId(themeId);

    return AppearanceManager.getSelection();
  }

  static subscribe(listener: SettingsChangeListener): () => void {
    SettingsManager.listeners.add(listener);

    return () => SettingsManager.unsubscribe(listener);
  }

  static unsubscribe(listener: SettingsChangeListener): void {
    SettingsManager.listeners.delete(listener);
  }

  private static updateDomain<Domain extends SettingsDomain>(
    domain: Domain,
    partial: Partial<SettingsValueByDomain[Domain]>,
  ): SettingsData {
    const previousSettings = SettingsManager.getAll();
    const nextSave = SaveManager.update({
      settings: {
        [domain]: partial,
      },
    });
    const nextSettings = nextSave.settings;
    const changedKeys = SettingsManager.getChangedKeys(
      previousSettings[domain],
      nextSettings[domain],
    );

    for (const settingName of changedKeys) {
      SettingsManager.notify(domain, settingName, nextSettings);
    }

    if (changedKeys.length === 0) {
      SettingsManager.notify(domain, 'settings', nextSettings);
    }

    return SettingsManager.clone(nextSettings);
  }

  private static notify(
    domain: SettingsDomain,
    settingName: string,
    settings: SettingsData,
  ): void {
    const settingsSnapshot = SettingsManager.clone(settings);

    for (const listener of SettingsManager.listeners) {
      listener(domain, settingName, settingsSnapshot);
    }
  }

  private static getChangedKeys(
    previousDomain: object,
    nextDomain: object,
  ): string[] {
    const previousRecord = previousDomain as Record<string, unknown>;
    const nextRecord = nextDomain as Record<string, unknown>;

    return Object.keys(nextDomain).filter((key) => (
      JSON.stringify(previousRecord[key]) !== JSON.stringify(nextRecord[key])
    ));
  }

  private static clampVolume(volume: number | undefined): number | undefined {
    return typeof volume === 'number'
      ? Math.max(0, Math.min(1, volume))
      : undefined;
  }

  private static withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter((entry) => entry[1] !== undefined),
    ) as Partial<T>;
  }

  private static clone(settings: SettingsData): SettingsData {
    return JSON.parse(JSON.stringify(settings)) as SettingsData;
  }
}
