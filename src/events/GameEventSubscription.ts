import { GameEvent } from './GameEvent';

export type GameEventListener<TPayload = unknown> = (
  event: GameEvent<string, TPayload>
) => void;

export type GameEventUnsubscribe = () => void;

export interface GameEventSubscription {
  unsubscribe: GameEventUnsubscribe;
}
