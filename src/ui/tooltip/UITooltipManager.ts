import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { IconTooltipContentResolver } from './IconTooltipContentResolver';
import { IconTooltipData, ResolvedIconTooltip } from './IconTooltipTypes';

export interface IconTooltipAttachOptions {
  lockOnClick?: boolean;
  stopPropagation?: boolean;
}

const TOOLTIP_MANAGERS = new WeakMap<Phaser.Scene, UITooltipManager>();

export function getTooltipManager(scene: Phaser.Scene): UITooltipManager {
  const existing = TOOLTIP_MANAGERS.get(scene);

  if (existing) {
    return existing;
  }

  const manager = new UITooltipManager(scene);
  TOOLTIP_MANAGERS.set(scene, manager);
  return manager;
}

export function attachIconTooltip(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  data: IconTooltipData | (() => IconTooltipData | undefined) | undefined,
  options: IconTooltipAttachOptions = {},
): void {
  if (!data) {
    return;
  }

  getTooltipManager(scene).attach(target, data, options);
}

export class UITooltipManager {
  private container?: Phaser.GameObjects.Container;
  private locked = false;
  private ignoreNextScenePointerDown = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.input.on('pointerdown', this.handleScenePointerDown, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  attach(
    target: Phaser.GameObjects.GameObject,
    data: IconTooltipData | (() => IconTooltipData | undefined),
    options: IconTooltipAttachOptions = {},
  ): void {
    const lockOnClick = options.lockOnClick ?? true;

    target.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      const resolved = this.resolveData(data);
      if (!this.locked && resolved) {
        this.show(resolved, pointer.x, pointer.y, false);
      }
    });
    target.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.locked && this.container) {
        this.position(pointer.x, pointer.y);
      }
    });
    target.on('pointerout', () => {
      if (!this.locked) {
        this.hide();
      }
    });
    target.on('pointerdown', (
      pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event?: Phaser.Types.Input.EventData,
    ) => {
      if (options.stopPropagation) {
        event?.stopPropagation();
      }

      if (!lockOnClick) {
        return;
      }

      this.ignoreNextScenePointerDown = true;
      if (this.locked) {
        this.hide();
        return;
      }

      const resolved = this.resolveData(data);
      if (resolved) {
        this.show(resolved, pointer.x, pointer.y, true);
      }
    });
  }

  show(data: IconTooltipData, x: number, y: number, locked: boolean): void {
    this.hide();
    this.locked = locked;
    this.container = this.createTooltip(IconTooltipContentResolver.resolve(data));
    this.position(x, y);
  }

  hide(): void {
    this.locked = false;
    this.container?.destroy(true);
    this.container = undefined;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handleScenePointerDown, this);
    this.hide();
  }

  private createTooltip(content: ResolvedIconTooltip): Phaser.GameObjects.Container {
    const maxWidth = Math.min(320, Math.max(220, this.scene.scale.width - 32));
    const title = this.scene.add.text(0, 0, content.title, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '15px',
      fontStyle: 'bold',
      wordWrap: { width: maxWidth - 28 },
    });
    const description = this.scene.add.text(0, title.height + 8, content.description, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '13px',
      lineSpacing: 3,
      wordWrap: { width: maxWidth - 28 },
    });
    const width = Math.min(maxWidth, Math.max(title.width, description.width) + 28);
    const height = title.height + description.height + 30;
    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.graphics();

    bg.fillStyle(UITheme.panelBgColor, UITheme.alpha.tooltip);
    bg.fillRoundedRect(0, 0, width, height, UITheme.radius.panel);
    bg.lineStyle(1, UITheme.colors.borderBright, 0.9);
    bg.strokeRoundedRect(0, 0, width, height, UITheme.radius.panel);
    title.setPosition(14, 12);
    description.setPosition(14, title.height + 20);
    container.add([bg, title, description]);
    container.setDepth(UITheme.depth.top + 20);
    container.setScrollFactor(0);
    return container;
  }

  private position(pointerX: number, pointerY: number): void {
    if (!this.container) {
      return;
    }

    const bounds = this.container.getBounds();
    const margin = 12;
    const width = bounds.width;
    const height = bounds.height;
    let x = pointerX + 18;
    let y = pointerY + 18;

    if (x + width + margin > this.scene.scale.width) {
      x = pointerX - width - 18;
    }

    if (y + height + margin > this.scene.scale.height) {
      y = pointerY - height - 18;
    }

    this.container.setPosition(
      Phaser.Math.Clamp(x, margin, Math.max(margin, this.scene.scale.width - width - margin)),
      Phaser.Math.Clamp(y, margin, Math.max(margin, this.scene.scale.height - height - margin)),
    );
  }

  private handleScenePointerDown(): void {
    if (this.ignoreNextScenePointerDown) {
      this.ignoreNextScenePointerDown = false;
      return;
    }

    if (this.locked) {
      this.hide();
    }
  }

  private resolveData(data: IconTooltipData | (() => IconTooltipData | undefined)): IconTooltipData | undefined {
    return typeof data === 'function' ? data() : data;
  }
}
