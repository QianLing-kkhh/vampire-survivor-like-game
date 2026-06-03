import { DEFAULT_LOCALE, SupportedLocale, isSupportedLocale } from '../i18n/Locale';
import type { AudioChannel } from '../audio/AudioManager';

export interface PlaytestSettingsState {
  autoMode: boolean;
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

export class PlaytestSettings {
  private static readonly STORAGE_KEY = 'vampire-survivor-like-game:playtest-settings';
  private static memoryState: PlaytestSettingsState = {
    autoMode: false,
    fastMode: false,
    autoTimeScale: 3,
    soundEnabled: false,
    audioEnabled: false,
    bgmVolume: 0,
    sfxVolume: 0,
    weaponVolume: 0,
    uiVolume: 0,
    locale: DEFAULT_LOCALE,
    endlessMode: false,
  };

  static get(): PlaytestSettingsState {
    const storedState = this.readStoredState();

    return storedState ?? { ...this.memoryState };
  }

  static setAutoMode(autoMode: boolean): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      autoMode,
    });
  }

  static setFastMode(fastMode: boolean): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      fastMode,
    });
  }

  static setSoundEnabled(soundEnabled: boolean): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      soundEnabled,
      audioEnabled: soundEnabled,
    });
  }

  static setAudioEnabled(audioEnabled: boolean): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      audioEnabled,
      soundEnabled: audioEnabled,
    });
  }

  static setAudioChannelVolume(channel: AudioChannel, volume: number): PlaytestSettingsState {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const state = this.get();

    switch (channel) {
      case 'bgm':
        return this.save({ ...state, bgmVolume: clampedVolume });
      case 'sfx':
        return this.save({ ...state, sfxVolume: clampedVolume });
      case 'weapon':
        return this.save({ ...state, weaponVolume: clampedVolume });
      case 'ui':
        return this.save({ ...state, uiVolume: clampedVolume });
      default:
        return state;
    }
  }

  static setLocale(locale: SupportedLocale): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      locale,
    });
  }

  static setEndlessMode(endlessMode: boolean): PlaytestSettingsState {
    return this.save({
      ...this.get(),
      endlessMode,
    });
  }

  static toggleAutoMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoMode(!state.autoMode);
  }

  static toggleFastMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setFastMode(!state.fastMode);
  }

  static toggleSoundEnabled(): PlaytestSettingsState {
    const state = this.get();

    return this.setAudioEnabled(!state.audioEnabled);
  }

  static toggleAudioEnabled(): PlaytestSettingsState {
    const state = this.get();

    return this.setAudioEnabled(!state.audioEnabled);
  }

  static toggleEndlessMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setEndlessMode(!state.endlessMode);
  }

  private static save(state: PlaytestSettingsState): PlaytestSettingsState {
    const nextState = {
      autoMode: state.autoMode,
      fastMode: state.fastMode,
      autoTimeScale: state.autoTimeScale,
      soundEnabled: state.soundEnabled,
      audioEnabled: state.audioEnabled,
      bgmVolume: state.bgmVolume,
      sfxVolume: state.sfxVolume,
      weaponVolume: state.weaponVolume,
      uiVolume: state.uiVolume,
      locale: state.locale,
      endlessMode: state.endlessMode,
    };

    this.memoryState = nextState;

    try {
      globalThis.localStorage?.setItem(
        PlaytestSettings.STORAGE_KEY,
        JSON.stringify(nextState),
      );
    } catch {
      // Memory fallback is enough for environments without localStorage.
    }

    return { ...nextState };
  }

  private static readStoredState(): PlaytestSettingsState | undefined {
    try {
      const rawState = globalThis.localStorage?.getItem(PlaytestSettings.STORAGE_KEY);

      if (!rawState) {
        return undefined;
      }

      const parsedState = JSON.parse(rawState) as Partial<PlaytestSettingsState>;

      const audioEnabled = parsedState.audioEnabled === undefined
        ? Boolean(parsedState.soundEnabled)
        : Boolean(parsedState.audioEnabled);

      return {
        autoMode: Boolean(parsedState.autoMode),
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
