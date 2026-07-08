import Phaser from 'phaser';

import { setRectangleHitArea, stopPointerEvent } from '../input/UIInteraction';
import { UITheme } from '../UITheme';
import { UIProgressBar } from './UIProgressBar';
import { truncateTextToWidth } from './UITextUtils';

export interface UISliderConfig {
  x: number;
  y: number;
  label: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  labelWidth?: number;
  trackWidth?: number;
  compact?: boolean;
  disabled?: boolean;
  valueWidth?: number;
  formatValue?: (value: number) => string;
  onChange?: (value: number, commit: boolean) => void;
}

export class UISlider {
  readonly container: Phaser.GameObjects.Container;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly progressBar: UIProgressBar;
  private readonly hitArea: Phaser.GameObjects.Rectangle;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly min: number;
  private readonly max: number;
  private readonly step: number;
  private label: string;
  private value: number;
  private width: number;
  private labelWidth: number;
  private trackWidth: number;
  private valueWidth: number;
  private compact: boolean;
  private disabled: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: UISliderConfig,
  ) {
    this.min = config.min ?? 0;
    this.max = config.max ?? 100;
    this.step = config.step ?? 1;
    this.label = config.label;
    this.value = this.clampValue(config.value ?? this.min);
    this.width = config.width ?? 260;
    this.labelWidth = config.labelWidth ?? 82;
    this.trackWidth = config.trackWidth ?? Math.max(80, this.width - this.labelWidth - 44);
    this.valueWidth = config.valueWidth ?? 36;
    this.compact = config.compact === true;
    this.disabled = config.disabled === true;
    this.container = scene.add.container(config.x, config.y);
    this.labelText = scene.add.text(0, 0, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.compact ? '10px' : '12px',
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0, 0.5);
    this.valueText = scene.add.text(0, 0, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.compact ? '10px' : '12px',
      align: 'right',
      fixedWidth: this.valueWidth,
    });
    this.valueText.setOrigin(0, 0.5);
    this.progressBar = new UIProgressBar(scene, {
      x: 0,
      y: 0,
      width: this.trackWidth,
      height: this.compact ? 7 : 8,
      variant: 'default',
      compact: true,
    });
    this.hitArea = scene.add.rectangle(0, 0, this.trackWidth, this.compact ? 18 : 22, 0xffffff, 0.001);
    this.knob = scene.add.circle(0, 0, this.compact ? 6 : 7, UITheme.colors.borderBright, 1);
    this.knob.setInteractive({ useHandCursor: true });
    scene.input.setDraggable(this.knob);
    this.hitArea.on('pointerdown', (
      pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => this.handlePointer(pointer, true, event));
    this.hitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.handlePointer(pointer, false);
      }
    });
    this.knob.on('drag', (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer, false));
    this.knob.on('dragend', (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer, true));
    this.container.add([
      this.labelText,
      this.progressBar.container,
      this.hitArea,
      this.knob,
      this.valueText,
    ]);
    this.layout();
  }

  setValue(value: number): void {
    this.value = this.clampValue(value);
    this.renderValue();
  }

  setLabel(label: string): void {
    this.label = label;
    this.layout();
  }

  setLayout(options: {
    width?: number;
    labelWidth?: number;
    trackWidth?: number;
    valueWidth?: number;
    compact?: boolean;
  }): void {
    this.width = options.width ?? this.width;
    this.labelWidth = options.labelWidth ?? this.labelWidth;
    this.trackWidth = options.trackWidth ?? Math.max(80, this.width - this.labelWidth - 44);
    this.valueWidth = options.valueWidth ?? this.valueWidth;
    this.compact = options.compact ?? this.compact;
    this.layout();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.container.setAlpha(disabled ? 0.45 : 1);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private layout(): void {
    const fontSize = this.compact ? '10px' : '12px';
    const trackX = this.labelWidth;
    const trackY = this.compact ? 8 : 10;
    this.labelText.setFontSize(fontSize);
    this.labelText.setText(truncateTextToWidth(this.label, this.labelWidth - 8, fontSize));
    this.labelText.setFixedSize(this.labelWidth - 8, this.compact ? 20 : 24);
    this.labelText.setMaxLines(1);
    this.labelText.setPosition(0, trackY - 4);
    this.progressBar.container.setPosition(trackX, trackY - 3);
    this.progressBar.resize(this.trackWidth, this.compact ? 7 : 8);
    this.hitArea.setPosition(trackX + this.trackWidth / 2, trackY);
    setRectangleHitArea(this.hitArea, this.trackWidth, this.compact ? 18 : 22);
    this.valueText.setFontSize(fontSize);
    this.valueText.setPosition(trackX + this.trackWidth + 8, trackY - 4);
    this.valueText.setFixedSize(this.valueWidth, this.compact ? 20 : 24);
    this.renderValue();
  }

  private renderValue(): void {
    const ratio = this.getRatio();
    this.progressBar.setRatio(ratio);
    this.knob.setPosition(this.labelWidth + this.trackWidth * ratio, this.compact ? 8 : 10);
    this.valueText.setText(this.config.formatValue?.(this.value) ?? String(Math.round(this.value)));
  }

  private handlePointer(
    pointer: Phaser.Input.Pointer,
    commit: boolean,
    event?: Phaser.Types.Input.EventData,
  ): void {
    if (event) {
      stopPointerEvent(event);
    }

    if (this.disabled) {
      return;
    }

    const matrix = this.hitArea.getWorldTransformMatrix();
    const left = matrix.tx - this.trackWidth / 2;
    const ratio = Phaser.Math.Clamp((pointer.x - left) / Math.max(1, this.trackWidth), 0, 1);
    const rawValue = this.min + ratio * (this.max - this.min);
    this.value = this.clampValue(rawValue);
    this.renderValue();
    this.config.onChange?.(this.value, commit);
  }

  private getRatio(): number {
    return Phaser.Math.Clamp((this.value - this.min) / Math.max(1, this.max - this.min), 0, 1);
  }

  private clampValue(value: number): number {
    const stepped = this.step > 0
      ? Math.round(value / this.step) * this.step
      : value;

    return Phaser.Math.Clamp(stepped, this.min, this.max);
  }
}
