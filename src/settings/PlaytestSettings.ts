import type { AudioChannel } from '../audio/AudioManager';
import { DEFAULT_LOCALE, SupportedLocale, isSupportedLocale } from '../i18n/Locale';
import { isStrategyControlType, type StrategyControlType } from '../runtime/RunModeConfig';
import { SaveManager } from '../save/SaveManager';
import { LocalStorageAdapter } from '../save/storage/LocalStorageAdapter';

import { SettingsData, SettingsManager } from './SettingsManager';

export interface PlaytestSettingsState {
  autoMode: boolean;
  autoMovement: boolean;
  autoUpgrade: boolean;
  autoOpenTreasure: boolean;
  strategyControlType: StrategyControlType;
  fastMode: boolean;
  autoTimeScale: number;
  soundEnabled: boolean;
  audioEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
  weaponVolume: number;
  uiVolume: number;
  locale: SupportedLocale;
  endlessMode: boolean;
}

export type PlaytestSettingName = keyof PlaytestSettingsState | 'settings';
export type PlaytestSettingsListener = (
  settingName: PlaytestSettingName,
  state: PlaytestSettingsState,
) => void;

export class PlaytestSettings {
  private static readonly STORAGE_KEY = 'vampire-survivor-like-game:playtest-settings';
  private static readonly listeners = new Set<PlaytestSettingsListener>();
  private static readonly legacyStorage = new LocalStorageAdapter();
  private static unsubscribeSettingsManager?: () => void;
  private static legacyMigrated = false;

  static get(): PlaytestSettingsState {
    this.ensureLegacyMigrated();
    this.ensureSettingsManagerSubscription();

    return this.flatten(SettingsManager.getAll());
  }

  static subscribe(listener: PlaytestSettingsListener): () => void {
    this.ensureSettingsManagerSubscription();
    this.listeners.add(listener);

    return () => this.unsubscribe(listener);
  }

  static unsubscribe(listener: PlaytestSettingsListener): void {
    this.listeners.delete(listener);
  }

  static setAutoMode(autoMode: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({
      autoMovement: autoMode,
      autoUpgrade: autoMode,
      autoOpenTreasure: autoMode,
    });

    return this.get();
  }

  static setAutoMovement(autoMovement: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({ autoMovement });

    return this.get();
  }

  static setAutoUpgrade(autoUpgrade: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({ autoUpgrade });

    return this.get();
  }

  static setAutoOpenTreasure(autoOpenTreasure: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({ autoOpenTreasure });

    return this.get();
  }

  static setStrategyControlType(strategyControlType: StrategyControlType): PlaytestSettingsState {
    SettingsManager.updateGameplay({ strategyControlType });

    return this.get();
  }

  static setFastMode(fastMode: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({ fastMode });

    return this.get();
  }

  static setSoundEnabled(soundEnabled: boolean): PlaytestSettingsState {
    return this.setAudioEnabled(soundEnabled);
  }

  static setAudioEnabled(audioEnabled: boolean): PlaytestSettingsState {
    SettingsManager.updateAudio({ audioEnabled });

    return this.get();
  }

  static setAudioChannelVolume(channel: AudioChannel, volume: number): PlaytestSettingsState {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    switch (channel) {
      case 'bgm':
        SettingsManager.updateAudio({ bgmVolume: clampedVolume });
        break;
      case 'sfx':
        SettingsManager.updateAudio({ sfxVolume: clampedVolume });
        break;
      case 'weapon':
        SettingsManager.updateAudio({ weaponVolume: clampedVolume });
        break;
      case 'ui':
        SettingsManager.updateAudio({ uiVolume: clampedVolume });
        break;
      default:
        break;
    }

    return this.get();
  }

  static setLocale(locale: SupportedLocale): PlaytestSettingsState {
    SettingsManager.updateDisplay({ locale });

    return this.get();
  }

  static setEndlessMode(endlessMode: boolean): PlaytestSettingsState {
    SettingsManager.updateGameplay({ endlessMode });

    return this.get();
  }

  static toggleAutoMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoMode(!state.autoMode);
  }

  static toggleAutoMovement(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoMovement(!state.autoMovement);
  }

  static toggleAutoUpgrade(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoUpgrade(!state.autoUpgrade);
  }

  static toggleAutoOpenTreasure(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoOpenTreasure(!state.autoOpenTreasure);
  }

  static toggleFastMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setFastMode(!state.fastMode);
  }

  static toggleSoundEnabled(): PlaytestSettingsState {
    return this.toggleAudioEnabled();
  }

  static toggleAudioEnabled(): PlaytestSettingsState {
    const state = this.get();

    return this.setAudioEnabled(!state.audioEnabled);
  }

  static toggleEndlessMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setEndlessMode(!state.endlessMode);
  }

  static notifyChange(
    settingName: PlaytestSettingName,
    state: PlaytestSettingsState,
  ): void {
    for (const listener of this.listeners) {
      listener(settingName, { ...state });
    }
  }

  static clearLegacyStorage(): void {
    PlaytestSettings.legacyMigrated = true;
    PlaytestSettings.legacyStorage.removeItem(PlaytestSettings.STORAGE_KEY);
  }

  private static ensureSettingsManagerSubscription(): void {
    if (this.unsubscribeSettingsManager) {
      return;
    }

    this.unsubscribeSettingsManager = SettingsManager.subscribe((domain, settingName, settings) => {
      const state = this.flatten(settings);

      this.notifyChange(this.toPlaytestSettingName(domain, settingName), state);
    });
  }

  private static ensureLegacyMigrated(): void {
    if (this.legacyMigrated) {
      return;
    }

    this.legacyMigrated = true;

    if (SaveManager.hasStoredSave()) {
      return;
    }

    const legacyState = this.readLegacyStoredState();

    if (!legacyState) {
      return;
    }

    SettingsManager.updateGameplay({
      autoMovement: legacyState.autoMovement,
      autoUpgrade: legacyState.autoUpgrade,
      autoOpenTreasure: legacyState.autoOpenTreasure,
      strategyControlType: legacyState.strategyControlType,
      fastMode: legacyState.fastMode,
      endlessMode: legacyState.endlessMode,
      autoTimeScale: legacyState.autoTimeScale,
    });
    SettingsManager.updateAudio({
      audioEnabled: legacyState.audioEnabled,
      bgmVolume: legacyState.bgmVolume,
      sfxVolume: legacyState.sfxVolume,
      weaponVolume: legacyState.weaponVolume,
      uiVolume: legacyState.uiVolume,
    });
    SettingsManager.updateDisplay({ locale: legacyState.locale });
  }

  private static flatten(settings: SettingsData): PlaytestSettingsState {
    const gameplay = settings.gameplay;
    const audio = settings.audio;
    const display = settings.display;

    return {
      autoMode: gameplay.autoMovement || gameplay.autoUpgrade || gameplay.autoOpenTreasure,
      autoMovement: gameplay.autoMovement,
      autoUpgrade: gameplay.autoUpgrade,
      autoOpenTreasure: gameplay.autoOpenTreasure,
      strategyControlType: isStrategyControlType(gameplay.strategyControlType)
        ? gameplay.strategyControlType
        : 'fixed',
      fastMode: gameplay.fastMode,
      autoTimeScale: gameplay.autoTimeScale,
      soundEnabled: audio.audioEnabled,
      audioEnabled: audio.audioEnabled,
      bgmVolume: this.readVolume(audio.bgmVolume),
      sfxVolume: this.readVolume(audio.sfxVolume),
      weaponVolume: this.readVolume(audio.weaponVolume),
      uiVolume: this.readVolume(audio.uiVolume),
      locale: isSupportedLocale(display.locale) ? display.locale : DEFAULT_LOCALE,
      endlessMode: gameplay.endlessMode,
    };
  }

  private static toPlaytestSettingName(
    domain: keyof SettingsData,
    settingName: string,
  ): PlaytestSettingName {
    if (domain === 'audio' || domain === 'display' || domain === 'gameplay') {
      if (settingName === 'settings') {
        return 'settings';
      }

      return settingName as PlaytestSettingName;
    }

    return 'settings';
  }

  private static readLegacyStoredState(): PlaytestSettingsState | undefined {
    try {
      const rawState = PlaytestSettings.legacyStorage.getItem(PlaytestSettings.STORAGE_KEY);

      if (!rawState) {
        return undefined;
      }

      const parsedState = JSON.parse(rawState) as Partial<PlaytestSettingsState>;

      const audioEnabled = parsedState.audioEnabled === undefined
        ? Boolean(parsedState.soundEnabled)
        : Boolean(parsedState.audioEnabled);
      const legacyAutoMode = Boolean(parsedState.autoMode);
      const autoMovement = parsedState.autoMovement === undefined
        ? legacyAutoMode
        : Boolean(parsedState.autoMovement);
      const autoUpgrade = parsedState.autoUpgrade === undefined
        ? legacyAutoMode
        : Boolean(parsedState.autoUpgrade);
      const autoOpenTreasure = parsedState.autoOpenTreasure === undefined
        ? legacyAutoMode
        : Boolean(parsedState.autoOpenTreasure);

      return {
        autoMode: autoMovement || autoUpgrade || autoOpenTreasure,
        autoMovement,
        autoUpgrade,
        autoOpenTreasure,
        strategyControlType: isStrategyControlType(parsedState.strategyControlType)
          ? parsedState.strategyControlType
          : 'fixed',
        fastMode: Boolean(parsedState.fastMode),
        autoTimeScale: typeof parsedState.autoTimeScale === 'number'
          ? parsedState.autoTimeScale
          : 3,
        soundEnabled: parsedState.soundEnabled === undefined
          ? audioEnabled
          : Boolean(parsedState.soundEnabled),
        audioEnabled,
        bgmVolume: this.readVolume(parsedState.bgmVolume),
        sfxVolume: this.readVolume(parsedState.sfxVolume),
        weaponVolume: this.readVolume(parsedState.weaponVolume),
        uiVolume: this.readVolume(parsedState.uiVolume),
        locale: isSupportedLocale(parsedState.locale)
          ? parsedState.locale
          : DEFAULT_LOCALE,
        endlessMode: Boolean(parsedState.endlessMode),
      };
    } catch {
      return undefined;
    }
  }

  private static readVolume(value: unknown): number {
    return typeof value === 'number'
      ? Math.max(0, Math.min(1, value))
      : 0;
  }
}
