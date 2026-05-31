export type EventHandler<TPayload = void> = (payload: TPayload) => void;

export class EventBus<TEventMap extends Record<string, unknown> = Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEventMap, Set<EventHandler<unknown>>>();

  subscribe<K extends keyof TEventMap>(
    eventName: K,
    handler: EventHandler<TEventMap[K]>,
  ): () => void {
    const handlers = this.handlers.get(eventName) ?? new Set<EventHandler<unknown>>();

    handlers.add(handler as EventHandler<unknown>);
    this.handlers.set(eventName, handlers);

    return () => this.unsubscribe(eventName, handler);
  }

  unsubscribe<K extends keyof TEventMap>(
    eventName: K,
    handler: EventHandler<TEventMap[K]>,
  ): void {
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return;
    }

    handlers.delete(handler as EventHandler<unknown>);

    if (handlers.size === 0) {
      this.handlers.delete(eventName);
    }
  }

  publish<K extends keyof TEventMap>(eventName: K, payload: TEventMap[K]): void {
    const handlers = this.handlers.get(eventName);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      (handler as EventHandler<TEventMap[K]>)(payload);
    }
  }
}
