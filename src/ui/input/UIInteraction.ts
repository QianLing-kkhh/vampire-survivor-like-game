import Phaser from 'phaser';

export type PointerEventData = Phaser.Types.Input.EventData | undefined;

export const UI_HIT_DEBUG = false;

export function stopPointerEvent(event: PointerEventData): void {
  event?.stopPropagation();
}

export function setTextHitArea(
  text: Phaser.GameObjects.Text,
  width: number,
  height: number,
): void {
  text.setFixedSize(width, height);

  const hitArea = text.input?.hitArea as Phaser.Geom.Rectangle | undefined;
  if (hitArea) {
    hitArea.setTo(0, 0, width, height);
    return;
  }

  text.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
}

export function setContainerHitArea(
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
): void {
  container.setSize(width, height);

  const hitArea = container.input?.hitArea as Phaser.Geom.Rectangle | undefined;
  if (hitArea) {
    hitArea.setTo(-width / 2, -height / 2, width, height);
    attachHitAreaDebug(container);
    return;
  }

  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
  attachHitAreaDebug(container);
}

export function setRectangleHitArea(
  rectangle: Phaser.GameObjects.Rectangle,
  width: number,
  height: number,
): void {
  rectangle.setSize(width, height);

  const hitArea = rectangle.input?.hitArea as Phaser.Geom.Rectangle | undefined;
  if (hitArea) {
    hitArea.setTo(0, 0, width, height);
    return;
  }

  rectangle.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
}

export function createModalBlocker(
  scene: Phaser.Scene,
  depth: number,
  onOutside?: () => void,
): Phaser.GameObjects.Rectangle {
  const blocker = scene.add.rectangle(
    0,
    0,
    scene.scale.width,
    scene.scale.height,
    0x000000,
    0,
  );
  blocker.setOrigin(0, 0);
  blocker.setScrollFactor(0);
  blocker.setDepth(depth);
  blocker.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, scene.scale.width, scene.scale.height),
    Phaser.Geom.Rectangle.Contains,
  );
  blocker.on('pointerdown', (
    _pointer: Phaser.Input.Pointer,
    _localX: number,
    _localY: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    stopPointerEvent(event);
    onOutside?.();
  });

  return blocker;
}

function attachHitAreaDebug(gameObject: Phaser.GameObjects.GameObject): void {
  if (!UI_HIT_DEBUG || gameObject.getData('uiHitDebugAttached')) {
    return;
  }

  gameObject.setData('uiHitDebugAttached', true);
  gameObject.on('pointermove', (
    pointer: Phaser.Input.Pointer,
    localX: number,
    localY: number,
  ) => {
    // Enable UI_HIT_DEBUG locally when checking visual/input alignment.
    console.debug('[ui-hit]', gameObject.type, {
      pointerX: Math.round(pointer.x),
      pointerY: Math.round(pointer.y),
      localX: Math.round(localX),
      localY: Math.round(localY),
    });
  });
}
