export interface PlaytestSettingsState {
  autoMode: boolean;
  fastMode: boolean;
  autoTimeScale: number;
}

export class PlaytestSettings {
  private static readonly STORAGE_KEY = 'vampire-survivor-like-game:playtest-settings';
  private static memoryState: PlaytestSettingsState = {
    autoMode: false,
    fastMode: false,
    autoTimeScale: 3,
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

  static toggleAutoMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setAutoMode(!state.autoMode);
  }

  static toggleFastMode(): PlaytestSettingsState {
    const state = this.get();

    return this.setFastMode(!state.fastMode);
  }

  private static save(state: PlaytestSettingsState): PlaytestSettingsState {
    const nextState = {
      autoMode: state.autoMode,
      fastMode: state.fastMode,
      autoTimeScale: state.autoTimeScale,
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
      };
    } catch {
      return undefined;
    }
  }
}
