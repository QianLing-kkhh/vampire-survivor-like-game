import { GameEvent } from './GameEvent';
import { GameEventPayload } from './GameEventPayloads';
import { GameEventListener, GameEventUnsubscribe } from './GameEventSubscription';

export interface GameEventMeta {
  gameTimeSeconds?: number;
  runId?: string;
}

export class GameEventBus {
  private static nextEventId = 1;

  private readonly listeners = new Map<string, Set<GameEventListener>>();
  private readonly allListeners = new Set<GameEventListener>();

  emit<TType extends string>(
    type: TType,
    payload: GameEventPayload<TType>,
    meta: GameEventMeta = {},
  ): GameEvent<TType, GameEventPayload<TType>> {
    const gameTimeSeconds = meta.gameTimeSeconds
      ?? this.getPayloadGameTimeSeconds(payload);
    const event: GameEvent<TType, GameEventPayload<TType>> = {
      id: `game-event-${GameEventBus.nextEventId}`,
      type,
      payload,
      gameTimeSeconds,
      realTimestamp: new Date().toISOString(),
      runId: meta.runId,
    };

    GameEventBus.nextEventId += 1;
    this.notify(event);
    return event;
  }

  subscribe<TType extends string>(
    type: TType,
    listener: GameEventListener<GameEventPayload<TType>>,
  ): GameEventUnsubscribe {
    const listenersForType = this.listeners.get(type) ?? new Set<GameEventListener>();

    listenersForType.add(listener as GameEventListener);
    this.listeners.set(type, listenersForType);

    return () => {
      listenersForType.delete(listener as GameEventListener);
      if (listenersForType.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  subscribeAll(listener: GameEventListener): GameEventUnsubscribe {
    this.allListeners.add(listener);
    return () => {
      this.allListeners.delete(listener);
    };
  }

  clear(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }

  private notify<TType extends string>(
    event: GameEvent<TType, GameEventPayload<TType>>,
  ): void {
    const listenersForType = this.listeners.get(event.type) ?? new Set<GameEventListener>();

    for (const listener of listenersForType) {
      this.safeNotify(listener, event);
    }

    for (const listener of this.allListeners) {
      this.safeNotify(listener, event);
    }
  }

  private safeNotify(listener: GameEventListener, event: GameEvent): void {
    try {
      listener(event);
    } catch (error) {
      console.warn(`GameEvent listener failed for ${event.type}`, error);
    }
  }

  private getPayloadGameTimeSeconds(payload: unknown): number {
    if (
      typeof payload === 'object'
      && payload !== null
      && 'gameTimeSeconds' in payload
      && typeof (payload as { gameTimeSeconds?: unknown }).gameTimeSeconds === 'number'
    ) {
      return (payload as { gameTimeSeconds: number }).gameTimeSeconds;
    }

    return 0;
  }
}
