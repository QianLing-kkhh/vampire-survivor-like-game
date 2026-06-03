import Phaser from 'phaser';

type PauseHandler = () => void;

export class VirtualJoystick {
  private static readonly BASE_RADIUS = 56;
  private static readonly KNOB_RADIUS = 24;
  private static readonly BOTTOM_MARGIN = 100;
  private static readonly LEFT_MARGIN = 100;
  private static readonly UI_DEPTH = 10000;

  private readonly container: Phaser.GameObjects.Container;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly pauseButton: Phaser.GameObjects.Text;
  private readonly direction = new Phaser.Math.Vector2(0, 0);
  private activePointerId?: number;
  private gameplayActive = true;
  private baseX = VirtualJoystick.LEFT_MARGIN;
  private baseY: number;

  constructor(
    private readonly scene: Phaser.Scene,
    onPause: PauseHandler,
  ) {
    this.baseY = scene.scale.height - VirtualJoystick.BOTTOM_MARGIN;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(VirtualJoystick.UI_DEPTH);
    this.container.setScrollFactor(0);

    this.base = scene.add.circle(
      this.baseX,
      this.baseY,
      VirtualJoystick.BASE_RADIUS,
      0x0f172a,
      0.35,
    );
    this.base.setDepth(VirtualJoystick.UI_DEPTH);
    this.base.setScrollFactor(0);
    this.base.setStrokeStyle(2, 0xe2e8f0, 0.45);

    this.knob = scene.add.circle(
      this.baseX,
      this.baseY,
      VirtualJoystick.KNOB_RADIUS,
      0xe2e8f0,
      0.5,
    );
    this.knob.setDepth(VirtualJoystick.UI_DEPTH + 1);
    this.knob.setScrollFactor(0);
    this.knob.setStrokeStyle(2, 0xffffff, 0.55);

    this.pauseButton = scene.add.text(
      scene.scale.width - 70,
      50,
      'Pause',
      {
        backgroundColor: '#1f2937',
        color: '#f8fafc',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        padding: {
          x: 14,
          y: 9,
        },
      },
    );
    this.pauseButton.setDepth(VirtualJoystick.UI_DEPTH + 1);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setOrigin(0.5);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => {
      onPause();
    });

    this.container.add([this.base, this.knob, this.pauseButton]);

    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
    scene.input.on('pointerupoutside', this.handlePointerUp, this);
    scene.scale.on('resize', this.handleResize, this);

    this.updateControlPositions();
    this.updateVisibility();
  }

  getDirection(): Phaser.Math.Vector2 {
    return this.direction.clone();
  }

  hasInput(): boolean {
    return this.direction.lengthSq() > 0;
  }

  setGameplayActive(active: boolean): void {
    this.gameplayActive = active;

    if (!active) {
      this.reset();
    }

    this.updateVisibility();
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
    this.scene.scale.off('resize', this.handleResize, this);
    this.container.destroy(true);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isVisible() || this.activePointerId !== undefined) {
      return;
    }

    if (!this.isInActiveTouchArea(pointer.x, pointer.y)) {
      return;
    }

    this.activePointerId = pointer.id;
    this.updateDirection(pointer.x, pointer.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.updateDirection(pointer.x, pointer.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.activePointerId) {
      return;
    }

    this.reset();
  }

  private handleResize(): void {
    this.updateControlPositions();
    this.updateVisibility();
  }

  private updateDirection(pointerX: number, pointerY: number): void {
    const offset = new Phaser.Math.Vector2(
      pointerX - this.baseX,
      pointerY - this.baseY,
    );
    const distance = Math.min(offset.length(), VirtualJoystick.BASE_RADIUS);

    if (offset.lengthSq() === 0) {
      this.direction.set(0, 0);
      this.knob.setPosition(this.baseX, this.baseY);
      return;
    }

    offset.normalize();
    this.direction.copy(offset).scale(distance / VirtualJoystick.BASE_RADIUS);
    this.knob.setPosition(
      this.baseX + offset.x * distance,
      this.baseY + offset.y * distance,
    );
  }

  private reset(): void {
    this.activePointerId = undefined;
    this.direction.set(0, 0);
    this.knob.setPosition(this.baseX, this.baseY);
  }

  private updateControlPositions(): void {
    this.baseX = VirtualJoystick.LEFT_MARGIN;
    this.baseY = this.scene.scale.height - VirtualJoystick.BOTTOM_MARGIN;
    this.base.setPosition(this.baseX, this.baseY);
    this.knob.setPosition(this.baseX, this.baseY);
    this.pauseButton.setPosition(this.scene.scale.width - 80, 60);
  }

  private updateVisibility(): void {
    const visible = this.gameplayActive && this.isTouchUiEnabled();

    this.container.setVisible(visible);

    if (this.pauseButton.input) {
      this.pauseButton.input.enabled = visible;
    }
  }

  private isVisible(): boolean {
    return this.container.visible && this.gameplayActive;
  }

  private isInActiveTouchArea(x: number, y: number): boolean {
    return x <= this.scene.scale.width * 0.45
      && y >= this.scene.scale.height * 0.45;
  }

  private isTouchUiEnabled(): boolean {
    const phaserTouch = this.scene.sys.game.device.input.touch;
    const hasTouch = (globalThis.navigator?.maxTouchPoints ?? 0) > 0;
    const hasCoarsePointer = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    const isNarrowScreen = this.scene.scale.width <= 900;
    const isNarrowWindow = (globalThis.innerWidth ?? this.scene.scale.width) <= 900
      || (globalThis.innerHeight ?? this.scene.scale.height) <= 900;

    return phaserTouch || hasTouch || hasCoarsePointer || isNarrowScreen || isNarrowWindow;
  }
}
