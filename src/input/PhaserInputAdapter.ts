import Phaser from 'phaser';

import type {
  ActionButtonState,
  InputMode,
  InputPort,
  InputSnapshot,
  PointerWorldPosition,
} from '../core/ports/InputPort';
import type { Vector2Like } from '../core/domain/Vector2';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

type PlayerPositionProvider = () => Vector2Like;

export class PhaserInputAdapter implements InputPort {
  private readonly keys: MovementKeys;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getPlayerPosition: PlayerPositionProvider,
  ) {
    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
  }

  getSnapshot(): InputSnapshot {
    const keyboardDirection = this.getKeyboardDirection();
    const pointerWorld = this.getPointerWorldPosition();
    const pointerDirection = this.getPointerDirection();
    const movementDirection = keyboardDirection.clone().add(pointerDirection);
    const primaryPressed = this.isPrimaryPointerPressed();

    return {
      mode: this.getInputMode(keyboardDirection, primaryPressed),
      movement: {
        direction: { x: movementDirection.x, y: movementDirection.y },
        magnitude: movementDirection.length(),
        active: movementDirection.lengthSq() > 0,
      },
      aim: {
        direction: pointerDirection.lengthSq() > 0
          ? { x: pointerDirection.x, y: pointerDirection.y }
          : undefined,
        active: pointerDirection.lengthSq() > 0,
      },
      pointerWorld,
      actions: {
        primary: this.createActionState(primaryPressed),
      },
    };
  }

  getManualMoveDirection(): Phaser.Math.Vector2 {
    return this.getKeyboardDirection().add(this.getPointerDirection());
  }

  private getKeyboardDirection(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.getHorizontalDirection(),
      this.getVerticalDirection(),
    );
  }

  private getHorizontalDirection(): number {
    const movingLeft = this.keys.left.isDown || this.keys.a.isDown;
    const movingRight = this.keys.right.isDown || this.keys.d.isDown;

    return Number(movingRight) - Number(movingLeft);
  }

  private getVerticalDirection(): number {
    const movingUp = this.keys.up.isDown || this.keys.w.isDown;
    const movingDown = this.keys.down.isDown || this.keys.s.isDown;

    return Number(movingDown) - Number(movingUp);
  }

  private getPointerDirection(): Phaser.Math.Vector2 {
    if (!this.isPrimaryPointerPressed()) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const pointerWorld = this.getPointerWorldPosition();
    if (!pointerWorld.active) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const player = this.getPlayerPosition();
    const direction = new Phaser.Math.Vector2(
      pointerWorld.x - player.x,
      pointerWorld.y - player.y,
    );

    if (direction.lengthSq() < 1) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return direction.normalize();
  }

  private getPointerWorldPosition(): PointerWorldPosition {
    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown) {
      return {
        x: 0,
        y: 0,
        active: false,
      };
    }

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    return {
      x: worldPoint.x,
      y: worldPoint.y,
      active: true,
    };
  }

  private isPrimaryPointerPressed(): boolean {
    const pointer = this.scene.input.activePointer;

    return pointer.isDown && pointer.leftButtonDown();
  }

  private getInputMode(
    keyboardDirection: Phaser.Math.Vector2,
    primaryPressed: boolean,
  ): InputMode {
    if (primaryPressed) {
      return this.scene.sys.game.device.input.touch ? 'touch' : 'mouse';
    }

    if (keyboardDirection.lengthSq() > 0) {
      return 'keyboard';
    }

    return 'keyboard';
  }

  private createActionState(pressed: boolean): ActionButtonState {
    return { pressed };
  }
}
