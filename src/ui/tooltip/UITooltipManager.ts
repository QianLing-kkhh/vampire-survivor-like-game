import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { PanelFrame } from '../components/PanelFrame';
import { UITextBlock } from '../components/UITextBlock';
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
    const compact = this.scene.scale.width <= 900 || this.scene.scale.height <= 560;
    const tiny = this.scene.scale.width <= 430 || this.scene.scale.height <= 390;
    const paddingX = tiny ? 9 : compact ? 10 : 12;
    const paddingY = tiny ? 8 : compact ? 9 : 10;
    const gap = tiny ? 4 : compact ? 5 : 7;
    const maxWidth = Math.min(
      tiny ? 210 : compact ? 250 : 300,
      Math.max(tiny ? 150 : compact ? 180 : 210, this.scene.scale.width - 24),
    );
    const wrapWidth = maxWidth - paddingX * 2;
    const title = new UITextBlock(this.scene, {
      x: 0,
      y: 0,
      text: content.title,
      width: wrapWidth,
      fontSize: tiny ? '12px' : compact ? '13px' : '14px',
      fontStyle: 'bold',
      align: 'left',
    }).text;
    title.setMaxLines(tiny ? 1 : 2);
    const description = new UITextBlock(this.scene, {
      x: 0,
      y: title.height + gap,
      text: content.description,
      width: wrapWidth,
      fontSize: tiny ? '10px' : compact ? '11px' : '12px',
      tone: 'muted',
      lineSpacing: tiny ? 1 : 2,
      align: 'left',
    }).text;
    description.setMaxLines(tiny ? 3 : compact ? 4 : 5);
    const width = Math.min(maxWidth, Math.max(title.width, description.width) + paddingX * 2);
    const maxHeight = Math.max(72, this.scene.scale.height * (tiny ? 0.28 : compact ? 0.32 : 0.38));
    const height = Math.min(maxHeight, title.height + description.height + paddingY * 2 + gap);
    const container = this.scene.add.container(0, 0);
    const frame = PanelFrame.create(this.scene, {
      x: width / 2,
      y: height / 2,
      width,
      height,
      variant: 'tooltip',
      alpha: UITheme.alpha.tooltip,
    });

    title.setPosition(paddingX, paddingY);
    description.setPosition(paddingX, paddingY + title.height + gap);
    container.add([frame, title, description]);
    container.setDepth(UITheme.depth.top + 20);
    container.setScrollFactor(0);
    return container;
  }

  private position(pointerX: number, pointerY: number): void {
    if (!this.container) {
      return;
    }

    const bounds = this.container.getBounds();
    const compact = this.scene.scale.width <= 900 || this.scene.scale.height <= 560;
    const margin = compact ? 8 : 12;
    const offset = compact ? 10 : 16;
    const width = bounds.width;
    const height = bounds.height;
    let x = pointerX + offset;
    let y = pointerY + offset;

    if (x + width + margin > this.scene.scale.width) {
      x = pointerX - width - offset;
    }

    if (y + height + margin > this.scene.scale.height) {
      y = pointerY - height - offset;
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
