import { GameEvent } from '../events/GameEvent';
import { GameEventBus } from '../events/GameEventBus';
import { GameEventUnsubscribe } from '../events/GameEventSubscription';
import { SaveManager } from '../save/SaveManager';

import { TutorialRegistry } from './TutorialRegistry';
import { TutorialState } from './TutorialState';
import { TutorialStep } from './TutorialStep';

export type TutorialListener = (step: TutorialStep) => void;

export interface TutorialManagerOptions {
  gameEventBus?: GameEventBus;
  onShowStep?: TutorialListener;
}

export class TutorialManager {
  private readonly listeners = new Set<TutorialListener>();
  private readonly onShowStep?: TutorialListener;
  private unsubscribeGameEvents?: GameEventUnsubscribe;

  constructor(options: TutorialManagerOptions = {}) {
    this.onShowStep = options.onShowStep;
    TutorialRegistry.ensureInitialized();

    if (options.gameEventBus) {
      this.initialize(options.gameEventBus);
    }
  }

  initialize(gameEventBus: GameEventBus): void {
    this.unsubscribeGameEvents?.();
    this.unsubscribeGameEvents = gameEventBus.subscribeAll((event) => {
      this.handleGameEvent(event);
    });
  }

  destroy(): void {
    this.unsubscribeGameEvents?.();
    this.unsubscribeGameEvents = undefined;
    this.listeners.clear();
  }

  handleGameEvent(event: GameEvent): void {
    for (const step of TutorialRegistry.list()) {
      if (step.trigger.type !== 'event' || step.trigger.eventType !== event.type) {
        continue;
      }

      this.showStep(step);
    }
  }

  handleCondition(conditionId: string): void {
    for (const step of TutorialRegistry.list()) {
      if (step.trigger.type !== 'condition' || step.trigger.conditionId !== conditionId) {
        continue;
      }

      this.showStep(step);
    }
  }

  handleTime(gameTimeSeconds: number): void {
    for (const step of TutorialRegistry.list()) {
      if (
        step.trigger.type !== 'time'
        || gameTimeSeconds < step.trigger.gameTimeSeconds
      ) {
        continue;
      }

      this.showStep(step);
    }
  }

  markSeen(id: string): void {
    const state = this.getState();

    if (state.seenStepIds.includes(id)) {
      return;
    }

    SaveManager.update({
      progression: {
        tutorial: {
          ...state,
          seenStepIds: [...state.seenStepIds, id],
        },
      },
    });
  }

  setDisabled(disabled: boolean): void {
    const state = this.getState();

    SaveManager.update({
      progression: {
        tutorial: {
          ...state,
          disabled,
        },
      },
    });
  }

  shouldShow(step: TutorialStep): boolean {
    const state = this.getState();

    if (state.disabled) {
      return false;
    }

    return step.once !== true || !state.seenStepIds.includes(step.id);
  }

  getPendingSteps(): TutorialStep[] {
    const state = this.getState();

    if (state.disabled) {
      return [];
    }

    return TutorialRegistry.list()
      .filter((step) => step.once !== true || !state.seenStepIds.includes(step.id));
  }

  getState(): TutorialState {
    return SaveManager.get().progression.tutorial;
  }

  subscribe(listener: TutorialListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private showStep(step: TutorialStep): void {
    if (!this.shouldShow(step)) {
      return;
    }

    this.markSeen(step.id);
    this.onShowStep?.(step);
    this.notify(step);

    if (!this.onShowStep && this.listeners.size === 0) {
      console.info(`Tutorial hint: ${step.titleKey} - ${step.messageKey}`);
    }
  }

  private notify(step: TutorialStep): void {
    for (const listener of this.listeners) {
      try {
        listener(step);
      } catch (error) {
        console.warn(`Tutorial listener failed for ${step.id}`, error);
      }
    }
  }
}
