import Phaser from 'phaser';

import { stopPointerEvent, setContainerHitArea } from '../input/UIInteraction';
import { UITheme } from '../UITheme';

export interface UIToggleSwitchConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  value?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}

export class UIToggleSwitch {
  readonly container: Phaser.GameObjects.Container;
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Arc;
  private width: number;
  private height: number;
  private value: boolean;
  private disabled: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly config: UIToggleSwitchConfig) {
    this.width = config.width ?? 54;
    this.height = config.height ?? 28;
    this.value = config.value === true;
    this.disabled = config.disabled === true;
    this.container = scene.add.container(config.x, config.y);
    this.track = scene.add.graphics();
    this.knob = scene.add.circle(0, 0, Math.max(7, this.height / 2 - 3), UITheme.toggleKnobColor, 1);
    this.container.add([this.track, this.knob]);
    setContainerHitArea(this.container, this.width, this.height);
    this.container.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      if (this.disabled) {
        return;
      }

      this.config.onToggle?.();
    });
    this.render();
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    setContainerHitArea(this.container, width, height);
    this.knob.setRadius(Math.max(7, height / 2 - 3));
    this.render();
    return this;
  }

  setValue(value: boolean): this {
    this.value = value;
    this.render();
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.container.setAlpha(disabled ? 0.55 : 1);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private render(): void {
    const radius = Math.max(4, this.height / 2);
    const knobOffset = Math.max(0, this.width / 2 - this.height / 2);
    const fillColor = this.value ? UITheme.toggleOnColor : UITheme.toggleOffColor;
    this.track.clear();
    this.track.fillStyle(fillColor, this.disabled ? 0.52 : 0.95);
    this.track.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius);
    this.track.lineStyle(1, UITheme.panelBorderColor, this.disabled ? 0.3 : 0.55);
    this.track.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius);
    this.knob.setPosition(this.value ? knobOffset : -knobOffset, 0);
    this.knob.setFillStyle(UITheme.toggleKnobColor, this.disabled ? 0.68 : 1);
  }
}
