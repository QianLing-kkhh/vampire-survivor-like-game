export type PauseFlowAction =
  | 'none'
  | 'openPause'
  | 'resumePause'
  | 'restart'
  | 'backToTitle'
  | 'openDeveloperScene';

export interface PauseFlowState {
  isGameOver: boolean;
  isLevelUpSelectionActive: boolean;
  isPauseMenuOpen: boolean;
  gameTimeSeconds: number;
  runId: string;
}

export interface PauseFlowResult {
  action: PauseFlowAction;
  isPauseMenuOpen?: boolean;
  isGameplayPaused?: boolean;
  event?: {
    name: 'ui.pauseOpened' | 'ui.pauseClosed';
    payload: {
      gameTimeSeconds: number;
    };
    meta: {
      gameTimeSeconds: number;
      runId: string;
    };
  };
}

export class PauseFlowCoordinator {
  handleEscapePressed(state: PauseFlowState): PauseFlowResult {
    if (state.isGameOver || state.isLevelUpSelectionActive) {
      return { action: 'none' };
    }

    if (state.isPauseMenuOpen) {
      return this.resume(state);
    }

    return {
      action: 'openPause',
      isPauseMenuOpen: true,
      isGameplayPaused: true,
      event: this.createPauseEvent('ui.pauseOpened', state),
    };
  }

  resume(state: PauseFlowState): PauseFlowResult {
    if (!state.isPauseMenuOpen) {
      return { action: 'none' };
    }

    return {
      action: 'resumePause',
      isPauseMenuOpen: false,
      isGameplayPaused: false,
      event: this.createPauseEvent('ui.pauseClosed', state),
    };
  }

  restart(): PauseFlowResult {
    return {
      action: 'restart',
      isPauseMenuOpen: false,
    };
  }

  backToTitle(): PauseFlowResult {
    return {
      action: 'backToTitle',
      isPauseMenuOpen: false,
    };
  }

  openDeveloperScene(): PauseFlowResult {
    return {
      action: 'openDeveloperScene',
      isPauseMenuOpen: false,
    };
  }

  private createPauseEvent(
    name: 'ui.pauseOpened' | 'ui.pauseClosed',
    state: PauseFlowState,
  ): NonNullable<PauseFlowResult['event']> {
    return {
      name,
      payload: {
        gameTimeSeconds: state.gameTimeSeconds,
      },
      meta: {
        gameTimeSeconds: state.gameTimeSeconds,
        runId: state.runId,
      },
    };
  }
}
