import Phaser from 'phaser';

import type { StrategyEditReason } from '../strategy/runtime/RuntimeStrategyState';
import { stopPointerEvent } from './input/UIInteraction';
import { UITheme } from './UITheme';

export interface LiveStrategyMovementValues {
  survivalBias: number;
  combatBias: number;
  farmBias: number;
  treasureBias: number;
  riskTolerance: number;
  loopBias: number;
}

export interface LiveStrategyControlState {
  enabled: boolean;
  movement: LiveStrategyMovementValues;
  editCount: number;
  runtimeProfileHash?: string;
}

export interface LiveStrategyPatchPayload {
  fieldPath: string;
  value: number;
  reason: StrategyEditReason;
}

type SliderKey = keyof LiveStrategyMovementValues;

interface SliderConfig {
  key: SliderKey;
  fieldPath: string;
  label: string;
}

interface SliderControl extends SliderConfig {
  labelText: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  knob: Phaser.GameObjects.Arc;
  trackLeft: number;
  trackWidth: number;
}

interface PresetConfig {
  id: string;
  label: string;
  patches: Array<{
    fieldPath: string;
    value: number;
  }>;
}

interface PresetButton {
  config: PresetConfig;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

const SLIDERS: readonly SliderConfig[] = [
  { key: 'survivalBias', fieldPath: 'movement.survivalBias', label: 'Survive' },
  { key: 'combatBias', fieldPath: 'movement.combatBias', label: 'Combat' },
  { key: 'farmBias', fieldPath: 'movement.farmBias', label: 'Farm' },
  { key: 'treasureBias', fieldPath: 'movement.treasureBias', label: 'Treasure' },
  { key: 'riskTolerance', fieldPath: 'movement.riskTolerance', label: 'Risk' },
  { key: 'loopBias', fieldPath: 'movement.loopBias', label: 'Loop' },
];

const PRESETS: readonly PresetConfig[] = [
  {
    id: 'survival',
    label: 'Safe',
    patches: [
      { fieldPath: 'movement.survivalBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 15 },
      { fieldPath: 'movement.treasureBias', value: 20 },
      { fieldPath: 'movement.loopBias', value: 75 },
    ],
  },
  {
    id: 'farm',
    label: 'Farm',
    patches: [
      { fieldPath: 'movement.farmBias', value: 90 },
      { fieldPath: 'movement.survivalBias', value: 55 },
      { fieldPath: 'movement.riskTolerance', value: 45 },
    ],
  },
  {
    id: 'combat',
    label: 'Combat',
    patches: [
      { fieldPath: 'movement.combatBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 55 },
      { fieldPath: 'movement.survivalBias', value: 50 },
    ],
  },
  {
    id: 'treasure',
    label: 'Chest',
    patches: [
      { fieldPath: 'movement.treasureBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 60 },
    ],
  },
  {
    id: 'boss',
    label: 'Boss',
    patches: [
      { fieldPath: 'movement.bossBias', value: 90 },
      { fieldPath: 'movement.combatBias', value: 75 },
      { fieldPath: 'movement.riskTolerance', value: 45 },
    ],
  },
  {
    id: 'loop',
    label: 'Loop',
    patches: [
      { fieldPath: 'movement.loopBias', value: 90 },
      { fieldPath: 'movement.survivalBias', value: 75 },
      { fieldPath: 'movement.riskTolerance', value: 25 },
    ],
  },
];

export class LiveStrategyControlPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly sliders: SliderControl[] = [];
  private readonly presetButtons: PresetButton[] = [];
  private state?: LiveStrategyControlState;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPatch: (payload: LiveStrategyPatchPayload) => void,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2100);
    this.container.setScrollFactor(0);
    this.background = scene.add.rectangle(0, 0, 100, 100, 0x0f172a, 0.88);
    this.background.setStrokeStyle(1, 0x38bdf8, 0.55);
    this.titleText = this.createText('Live Strategy', '#e0f2fe', '13px', true);
    this.statusText = this.createText('', UITheme.mutedTextColor, '11px', false);

    this.container.add([this.background, this.titleText, this.statusText]);
    this.createPresetButtons();
    this.createSliders();
    this.container.setVisible(false);
  }

  update(state?: LiveStrategyControlState): void {
    this.state = state;
    const visible = state?.enabled === true;
    this.container.setVisible(visible);

    if (!visible || !state) {
      return;
    }

    this.layout();
    this.statusText.setText(`edits ${state.editCount}`);

    for (const slider of this.sliders) {
      this.updateSliderValue(slider, state.movement[slider.key]);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private createPresetButtons(): void {
    for (const config of PRESETS) {
      const background = this.scene.add.rectangle(0, 0, 64, 24, 0x1e293b, 0.96);
      background.setStrokeStyle(1, 0x64748b, 0.7);
      background.setInteractive({ useHandCursor: true });
      background.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        stopPointerEvent(event);
        for (const patch of config.patches) {
          this.onPatch({ ...patch, reason: 'preset' });
        }
      });

      const label = this.createText(config.label, UITheme.textColor, '11px', false);
      label.setOrigin(0.5);
      this.container.add([background, label]);
      this.presetButtons.push({ config, background, label });
    }
  }

  private createSliders(): void {
    for (const config of SLIDERS) {
      const labelText = this.createText(config.label, UITheme.textColor, '11px', false);
      const valueText = this.createText('0', UITheme.mutedTextColor, '10px', false);
      const track = this.scene.add.rectangle(0, 0, 100, 4, 0x334155, 1);
      const fill = this.scene.add.rectangle(0, 0, 0, 4, 0x38bdf8, 1);
      const knob = this.scene.add.circle(0, 0, 7, 0xe0f2fe, 1);
      const control: SliderControl = {
        ...config,
        labelText,
        valueText,
        track,
        fill,
        knob,
        trackLeft: 0,
        trackWidth: 100,
      };

      track.setInteractive({ useHandCursor: true });
      knob.setInteractive({ useHandCursor: true });
      this.scene.input.setDraggable(knob);

      track.on('pointerdown', (
        pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => this.handleSliderPointer(control, pointer, event));
      knob.on('drag', (pointer: Phaser.Input.Pointer) => this.handleSliderPointer(control, pointer));

      this.container.add([labelText, track, fill, knob, valueText]);
      this.sliders.push(control);
    }
  }

  private layout(): void {
    const width = Math.min(780, Math.max(320, this.scene.scale.width - 24));
    const compact = this.scene.scale.width < 640;
    const height = compact ? 178 : 126;
    const left = (this.scene.scale.width - width) / 2;
    const top = this.scene.scale.height - height - 10;
    const buttonTop = top + 36;
    const buttonGap = 6;
    const buttonWidth = Math.min(72, Math.max(48, (width - 28 - buttonGap * (this.presetButtons.length - 1)) / this.presetButtons.length));
    const buttonHeight = 24;

    this.background.setPosition(left + width / 2, top + height / 2);
    this.background.setSize(width, height);
    this.titleText.setPosition(left + 14, top + 10);
    this.statusText.setPosition(left + width - 68, top + 10);

    this.presetButtons.forEach((button, index) => {
      const x = left + 14 + buttonWidth / 2 + index * (buttonWidth + buttonGap);
      const y = buttonTop;

      button.background.setPosition(x, y);
      button.background.setSize(buttonWidth, buttonHeight);
      button.label.setPosition(x, y);
    });

    const columns = compact ? 2 : 3;
    const rowHeight = 42;
    const sliderTop = compact ? top + 62 : top + 74;
    const columnWidth = (width - 28) / columns;
    const trackWidth = Math.max(72, Math.min(156, columnWidth - 72));

    this.sliders.forEach((slider, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + 14 + column * columnWidth;
      const y = sliderTop + row * rowHeight;
      const trackLeft = x + 62;

      slider.trackLeft = trackLeft;
      slider.trackWidth = trackWidth;
      slider.labelText.setPosition(x, y - 5);
      slider.valueText.setPosition(trackLeft + trackWidth + 8, y - 5);
      slider.track.setPosition(trackLeft + trackWidth / 2, y + 14);
      slider.track.setSize(trackWidth, 4);
      slider.fill.setPosition(trackLeft, y + 14);
      slider.fill.setOrigin(0, 0.5);
    });
  }

  private handleSliderPointer(
    slider: SliderControl,
    pointer: Phaser.Input.Pointer,
    event?: Phaser.Types.Input.EventData,
  ): void {
    if (!this.state?.enabled) {
      return;
    }

    if (event) {
      stopPointerEvent(event);
    }

    const ratio = Phaser.Math.Clamp((pointer.x - slider.trackLeft) / slider.trackWidth, 0, 1);
    const value = Math.round(ratio * 100);
    this.onPatch({
      fieldPath: slider.fieldPath,
      value,
      reason: 'user',
    });
  }

  private updateSliderValue(slider: SliderControl, value: number): void {
    const safeValue = Phaser.Math.Clamp(Math.round(value), 0, 100);
    const fillWidth = slider.trackWidth * (safeValue / 100);

    slider.valueText.setText(String(safeValue));
    slider.fill.setSize(fillWidth, 4);
    slider.knob.setPosition(slider.trackLeft + fillWidth, slider.track.y);
  }

  private createText(
    value: string,
    color: string,
    fontSize: string,
    bold: boolean,
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(0, 0, value, {
      color,
      fontFamily: UITheme.fontFamily,
      fontSize,
      fontStyle: bold ? 'bold' : '',
    });
    text.setScrollFactor(0);

    return text;
  }
}
