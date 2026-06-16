import type { Vector2Like } from '../domain/Vector2';

export type InputActionButton =
  | 'primary'
  | 'secondary'
  | 'dash'
  | 'interact'
  | 'pause'
  | 'confirm'
  | 'cancel'
  | string;

export type InputMode = 'keyboard' | 'mouse' | 'touch' | 'auto';

export interface MovementIntent {
  direction: Vector2Like;
  magnitude: number;
  active: boolean;
}

export interface AimIntent {
  direction?: Vector2Like;
  active: boolean;
}

export interface PointerWorldPosition extends Vector2Like {
  active: boolean;
}

export interface ActionButtonState {
  pressed: boolean;
  justPressed?: boolean;
  justReleased?: boolean;
}

export interface InputSnapshot {
  mode: InputMode;
  movement: MovementIntent;
  aim?: AimIntent;
  pointerWorld?: PointerWorldPosition;
  actions: Record<InputActionButton, ActionButtonState>;
}

export interface InputPort {
  getSnapshot(): InputSnapshot;
}
