import Phaser from 'phaser';

import type { GameplayContext } from '../../gameplay/GameplayContext';
import type { StatsBuildSnapshot } from '../stats/StatsBuildSnapshot';

import { PauseFlowCoordinator, type PauseFlowResult } from './PauseFlowCoordinator';
import { PauseFlowPresenter } from './PauseFlowPresenter';

export interface PauseFlowHandlerContext {
  isGameOver: boolean;
  isLevelUpSelectionActive: boolean;
  isPauseMenuOpen: boolean;
  gameTimeSeconds: number;
  runId: string;
  gameplayContext?: GameplayContext;
  setPauseMenuOpen: (open: boolean) => void;
  setGameplayPaused: (paused: boolean) => void;
  buildStatsBuildSnapshot: () => StatsBuildSnapshot;
  applyGameplayTimeScale: () => void;
  setVirtualJoystickActive: (active: boolean) => void;
  shouldVirtualJoystickBeActive: () => boolean;
}

export class PauseFlowHandler {
  private readonly coordinator = new PauseFlowCoordinator();
  private readonly presenter: PauseFlowPresenter;

  constructor(scene: Phaser.Scene) {
    this.presenter = new PauseFlowPresenter(scene);
  }

  handleEscapePressed(context: PauseFlowHandlerContext): void {
    this.apply(this.coordinator.handleEscapePressed(context), context);
  }

  resume(context: PauseFlowHandlerContext): void {
    this.apply(this.coordinator.resume(context), context);
  }

  restart(context: PauseFlowHandlerContext): void {
    this.apply(this.coordinator.restart(), context);
  }

  backToTitle(context: PauseFlowHandlerContext): void {
    this.apply(this.coordinator.backToTitle(), context);
  }

  openDeveloperScene(context: PauseFlowHandlerContext, sceneKey: string): void {
    this.apply(this.coordinator.openDeveloperScene(), context, sceneKey);
  }

  private apply(
    result: PauseFlowResult,
    context: PauseFlowHandlerContext,
    sceneKey?: string,
  ): void {
    if (result.action === 'none') {
      return;
    }

    if (result.isPauseMenuOpen !== undefined) {
      context.setPauseMenuOpen(result.isPauseMenuOpen);
    }

    if (result.isGameplayPaused !== undefined) {
      context.setGameplayPaused(result.isGameplayPaused);
    }

    if (result.event) {
      context.gameplayContext?.gameEventBus.emit(
        result.event.name,
        result.event.payload,
        result.event.meta,
      );
    }

    this.presenter.apply(result, {
      buildStatsBuildSnapshot: context.buildStatsBuildSnapshot,
      applyGameplayTimeScale: context.applyGameplayTimeScale,
      setVirtualJoystickActive: context.setVirtualJoystickActive,
      shouldVirtualJoystickBeActive: context.shouldVirtualJoystickBeActive,
    }, sceneKey);
  }
}
