import { DEFAULT_LOCALE, SupportedLocale, isSupportedLocale } from '../i18n/Locale';

export interface PlaytestSettingsState {
  autoMode: boolean;
  fastMode: boolean;
  autoTimeScale: number;
  soundEnabled: boolean;
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
    });
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

    return this.setSoundEnabled(!state.soundEnabled);
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

      return {
        autoMode: Boolean(parsedState.autoMode),
        fastMode: Boolean(parsedState.fastMode),
        autoTimeScale: typeof parsedState.autoTimeScale === 'number'
          ? parsedState.autoTimeScale
          : 3,
        soundEnabled: parsedState.soundEnabled === undefined
          ? false
          : Boolean(parsedState.soundEnabled),
        locale: isSupportedLocale(parsedState.locale)
          ? parsedState.locale
          : DEFAULT_LOCALE,
        endlessMode: Boolean(parsedState.endlessMode),
      };
    } catch {
      return undefined;
    }
  }
}
