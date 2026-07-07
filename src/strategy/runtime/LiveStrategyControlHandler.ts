import type { RunState } from '../../run/RunState';

import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import type {
  RuntimeStrategyState,
  StrategyEditReason,
} from './RuntimeStrategyState';

export interface LiveStrategyPatchLike {
  fieldPath: string;
  value: number;
  reason: StrategyEditReason;
}

export interface LiveStrategyPatchContext {
  runState: RunState;
  runtimeStrategyState?: RuntimeStrategyState;
  gameTimeSeconds: number;
  syncRuntimeStrategyProfile: (profile?: AutoStrategyProfile) => void;
  refreshLevelUpPanelAutoSelection: () => void;
  emitHUDState: () => void;
}

export interface LiveStrategyPanelContext {
  runState: RunState;
  setVirtualJoystickActive: (active: boolean) => void;
  shouldVirtualJoystickBeActive: () => boolean;
  emitHUDState: () => void;
}

export class LiveStrategyControlHandler {
  private panelPauseActive = false;
  private tacticsPanelExpanded = false;

  get isPauseActive(): boolean {
    return this.panelPauseActive;
  }

  reset(): void {
    this.panelPauseActive = false;
    this.tacticsPanelExpanded = false;
  }

  handlePatch(payload: LiveStrategyPatchLike, context: LiveStrategyPatchContext): void {
    const metadata = context.runState.getRunMetadata();
    const runtimeStrategyState = context.runtimeStrategyState;

    if (
      metadata.controlMode !== 'autoStrategy'
      || metadata.strategyControlType !== 'live'
      || metadata.allowRuntimeStrategyEdit !== true
      || !runtimeStrategyState
    ) {
      return;
    }

    const event = runtimeStrategyState.applyPatch(
      context.gameTimeSeconds,
      payload.fieldPath,
      payload.value,
      payload.reason,
    );

    if (!event) {
      return;
    }

    context.syncRuntimeStrategyProfile(runtimeStrategyState.getProfile());
    context.refreshLevelUpPanelAutoSelection();
    context.emitHUDState();
  }

  handleExpandedChanged(
    payload: { expanded: boolean; pauseWhenOpen: boolean },
    context: LiveStrategyPanelContext,
  ): void {
    if (context.runState.getRunMetadata().controlMode === 'manual') {
      this.reset();
      return;
    }

    this.tacticsPanelExpanded = payload.expanded;
    this.panelPauseActive = payload.expanded && payload.pauseWhenOpen;
    context.setVirtualJoystickActive(context.shouldVirtualJoystickBeActive());
    context.emitHUDState();
  }

  handlePauseWhenOpenChanged(
    pauseWhenOpen: boolean,
    context: LiveStrategyPanelContext,
  ): void {
    if (context.runState.getRunMetadata().controlMode === 'manual') {
      this.reset();
      return;
    }

    this.panelPauseActive = this.tacticsPanelExpanded && pauseWhenOpen;
    context.setVirtualJoystickActive(context.shouldVirtualJoystickBeActive());
    context.emitHUDState();
  }
}
