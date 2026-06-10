import Phaser from 'phaser';

import type { RunControlMode } from '../runtime/RunModeConfig';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import type { StrategyEditReason } from '../strategy/runtime/RuntimeStrategyState';
import { I18n } from '../i18n/I18n';
import { setRectangleHitArea, stopPointerEvent } from './input/UIInteraction';
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
  editable: boolean;
  controlMode: RunControlMode;
  showPanel: boolean;
  pauseWhenOpen: boolean;
  movement: LiveStrategyMovementValues;
  editCount: number;
  runtimeProfileHash?: string;
}

export interface LiveStrategyPatchPayload {
  fieldPath: string;
  value: number;
  reason: StrategyEditReason;
}

export interface LiveStrategyControlPanelOptions {
  onExpandedChanged?: (payload: {
    expanded: boolean;
    pauseWhenOpen: boolean;
  }) => void;
  onPauseWhenOpenChanged?: (pauseWhenOpen: boolean) => void;
}

type SliderKey = keyof LiveStrategyMovementValues;

interface SliderConfig {
  key: SliderKey;
  fieldPath: string;
  labelKey: string;
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
  labelKey: string;
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
  { key: 'survivalBias', fieldPath: 'movement.survivalBias', labelKey: 'strategyPanel.slider.survive' },
  { key: 'combatBias', fieldPath: 'movement.combatBias', labelKey: 'strategyPanel.slider.combat' },
  { key: 'farmBias', fieldPath: 'movement.farmBias', labelKey: 'strategyPanel.slider.farm' },
  { key: 'treasureBias', fieldPath: 'movement.treasureBias', labelKey: 'strategyPanel.slider.treasure' },
  { key: 'riskTolerance', fieldPath: 'movement.riskTolerance', labelKey: 'strategyPanel.slider.risk' },
  { key: 'loopBias', fieldPath: 'movement.loopBias', labelKey: 'strategyPanel.slider.loop' },
];

const PRESETS: readonly PresetConfig[] = [
  {
    id: 'safe',
    labelKey: 'strategyPanel.preset.safe',
    patches: [
      { fieldPath: 'movement.survivalBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 15 },
      { fieldPath: 'movement.treasureBias', value: 20 },
      { fieldPath: 'movement.loopBias', value: 75 },
    ],
  },
  {
    id: 'farm',
    labelKey: 'strategyPanel.preset.farm',
    patches: [
      { fieldPath: 'movement.farmBias', value: 90 },
      { fieldPath: 'movement.survivalBias', value: 55 },
      { fieldPath: 'movement.riskTolerance', value: 45 },
    ],
  },
  {
    id: 'combat',
    labelKey: 'strategyPanel.preset.combat',
    patches: [
      { fieldPath: 'movement.combatBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 55 },
      { fieldPath: 'movement.survivalBias', value: 50 },
    ],
  },
  {
    id: 'chest',
    labelKey: 'strategyPanel.preset.chest',
    patches: [
      { fieldPath: 'movement.treasureBias', value: 90 },
      { fieldPath: 'movement.riskTolerance', value: 60 },
    ],
  },
  {
    id: 'boss',
    labelKey: 'strategyPanel.preset.boss',
    patches: [
      { fieldPath: 'movement.bossBias', value: 90 },
      { fieldPath: 'movement.combatBias', value: 75 },
      { fieldPath: 'movement.riskTolerance', value: 45 },
    ],
  },
  {
    id: 'loop',
    labelKey: 'strategyPanel.preset.loop',
    patches: [
      { fieldPath: 'movement.loopBias', value: 90 },
      { fieldPath: 'movement.survivalBias', value: 75 },
      { fieldPath: 'movement.riskTolerance', value: 25 },
    ],
  },
];

export class LiveStrategyControlPanel {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly collapseButtonBg: Phaser.GameObjects.Rectangle;
  private readonly collapseButtonText: Phaser.GameObjects.Text;
  private readonly pauseToggleBg: Phaser.GameObjects.Rectangle;
  private readonly pauseToggleKnob: Phaser.GameObjects.Arc;
  private readonly pauseToggleText: Phaser.GameObjects.Text;
  private readonly sliders: SliderControl[] = [];
  private readonly presetButtons: PresetButton[] = [];
  private state?: LiveStrategyControlState;
  private collapsed = true;
  private lastPauseWhenOpen = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onPatch: (payload: LiveStrategyPatchPayload) => void,
    private readonly options: LiveStrategyControlPanelOptions = {},
  ) {
    this.screenManager = new ScreenManager(scene);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2100);
    this.container.setScrollFactor(0);

    this.background = scene.add.rectangle(0, 0, 100, 100, 0x0f172a, 0.9);
    this.background.setStrokeStyle(1, 0x38bdf8, 0.55);
    this.background.setInteractive({ useHandCursor: true });
    this.background.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      if (this.collapsed) {
        this.setCollapsed(false);
      }
    });

    this.titleText = this.createText('', '#e0f2fe', '13px', true);
    this.statusText = this.createText('', UITheme.mutedTextColor, '11px', false);
    this.collapseButtonBg = scene.add.rectangle(0, 0, 74, 24, 0x1e293b, 0.95);
    this.collapseButtonBg.setStrokeStyle(1, 0x64748b, 0.72);
    this.collapseButtonBg.setInteractive({ useHandCursor: true });
    this.collapseButtonBg.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      this.setCollapsed(true);
    });
    this.collapseButtonText = this.createText('', UITheme.textColor, '11px', false);
    this.collapseButtonText.setOrigin(0.5);

    this.pauseToggleBg = scene.add.rectangle(0, 0, 42, 20, 0x334155, 1);
    this.pauseToggleBg.setStrokeStyle(1, 0x64748b, 0.7);
    this.pauseToggleBg.setInteractive({ useHandCursor: true });
    this.pauseToggleBg.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      this.togglePauseWhenOpen();
    });
    this.pauseToggleKnob = scene.add.circle(-10, 0, 7, 0xe0f2fe, 1);
    this.pauseToggleText = this.createText('', UITheme.textColor, '11px', false);

    this.container.add([
      this.background,
      this.titleText,
      this.statusText,
      this.collapseButtonBg,
      this.collapseButtonText,
      this.pauseToggleBg,
      this.pauseToggleKnob,
      this.pauseToggleText,
    ]);
    this.createPresetButtons();
    this.createSliders();
    this.container.setVisible(false);
  }

  update(state?: LiveStrategyControlState): void {
    this.state = state;
    const visible = state?.enabled === true
      && state.showPanel === true
      && state.controlMode !== 'manual';

    if (!visible || !state) {
      this.hidePanel();
      return;
    }

    const previousPauseWhenOpen = this.lastPauseWhenOpen;
    this.lastPauseWhenOpen = state.pauseWhenOpen;
    if (!this.collapsed && previousPauseWhenOpen !== state.pauseWhenOpen) {
      this.emitExpandedChanged(true);
    }
    this.container.setVisible(true);
    this.updateText();
    this.layout();
    this.updateInteractivity();

    for (const slider of this.sliders) {
      this.updateSliderValue(slider, state.movement[slider.key]);
    }
  }

  destroy(): void {
    this.hidePanel();
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private hidePanel(): void {
    if (!this.collapsed) {
      this.collapsed = true;
      this.emitExpandedChanged(false);
    }

    this.container.setVisible(false);
  }

  private setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) {
      return;
    }

    this.collapsed = collapsed;
    this.emitExpandedChanged(!collapsed);
    this.updateText();
    this.layout();
  }

  private emitExpandedChanged(expanded: boolean): void {
    this.options.onExpandedChanged?.({
      expanded,
      pauseWhenOpen: this.state?.pauseWhenOpen ?? this.lastPauseWhenOpen,
    });
  }

  private togglePauseWhenOpen(): void {
    if (!this.state?.enabled) {
      return;
    }

    const next = !SettingsManager.getGameplay().pauseWhenStrategyPanelOpen;
    SettingsManager.updateGameplay({
      pauseWhenStrategyPanelOpen: next,
    });
    this.lastPauseWhenOpen = next;
    this.state = {
      ...this.state,
      pauseWhenOpen: next,
    };
    this.options.onPauseWhenOpenChanged?.(next);
    if (!this.collapsed) {
      this.emitExpandedChanged(true);
    }
    this.updateText();
    this.layout();
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
        if (!this.state?.enabled || !this.state.editable) {
          return;
        }

        for (const patch of config.patches) {
          this.onPatch({ ...patch, reason: 'preset' });
        }
      });

      const label = this.createText('', UITheme.textColor, '11px', false);
      label.setOrigin(0.5);
      this.container.add([background, label]);
      this.presetButtons.push({ config, background, label });
    }
  }

  private createSliders(): void {
    for (const config of SLIDERS) {
      const labelText = this.createText('', UITheme.textColor, '11px', false);
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
    const portrait = this.screenManager.isPortrait();

    if (this.collapsed) {
      this.layoutCollapsed(portrait);
      return;
    }

    this.layoutExpanded(portrait);
  }

  private layoutCollapsed(portrait: boolean): void {
    const margin = 10;
    const width = portrait ? Math.max(260, this.screenManager.width - 20) : 44;
    const height = portrait ? 40 : 178;
    const x = portrait
      ? this.screenManager.centerX
      : this.screenManager.width - width / 2 - margin;
    const y = portrait
      ? this.screenManager.height - height / 2 - margin
      : this.screenManager.centerY;

    this.background.setPosition(x, y);
    setRectangleHitArea(this.background, width, height);
    this.background.setFillStyle(0x0f172a, 0.92);
    this.background.setStrokeStyle(1, 0x38bdf8, 0.72);
    this.titleText.setText(portrait
      ? `${I18n.t('strategyPanel.title')} ^`
      : `< ${I18n.t('strategyPanel.collapsed')}`);
    this.titleText.setFontSize(portrait ? '13px' : '12px');
    this.titleText.setOrigin(0.5);
    this.titleText.setRotation(portrait ? 0 : -Math.PI / 2);
    this.titleText.setPosition(x, y);

    this.statusText.setVisible(false);
    this.collapseButtonBg.setVisible(false);
    this.collapseButtonText.setVisible(false);
    this.pauseToggleBg.setVisible(false);
    this.pauseToggleKnob.setVisible(false);
    this.pauseToggleText.setVisible(false);
    this.setPresetButtonsVisible(false);
    this.setSlidersVisible(false);
  }

  private layoutExpanded(portrait: boolean): void {
    const hudLayout = LayoutConfig.getHudLayout(this.screenManager);
    const margin = 10;
    const width = portrait
      ? Math.max(300, this.screenManager.width - 16)
      : Phaser.Math.Clamp(this.screenManager.width * 0.22, 260, 340);
    const height = portrait
      ? Phaser.Math.Clamp(this.screenManager.height * 0.24, 180, 240)
      : Math.min(520, Math.max(240, this.screenManager.height - 110));
    const left = portrait
      ? (this.screenManager.width - width) / 2
      : this.screenManager.width - width - margin;
    const preferredTop = hudLayout.statsRect.y + hudLayout.statsRect.height + 8;
    const top = portrait
      ? this.screenManager.height - height - margin
      : Phaser.Math.Clamp(
        preferredTop,
        margin,
        Math.max(margin, this.screenManager.height - height - margin),
      );
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    this.background.setPosition(centerX, centerY);
    setRectangleHitArea(this.background, width, height);
    this.background.setFillStyle(0x0f172a, 0.92);
    this.background.setStrokeStyle(1, 0x38bdf8, 0.72);
    this.titleText.setOrigin(0, 0.5);
    this.titleText.setRotation(0);
    this.titleText.setFontSize(portrait ? '13px' : '14px');
    this.titleText.setPosition(left + 12, top + 18);
    this.statusText.setVisible(true);
    this.statusText.setPosition(left + 12, top + 38);

    this.collapseButtonBg.setVisible(true);
    this.collapseButtonText.setVisible(true);
    this.collapseButtonBg.setPosition(left + width - 46, top + 18);
    setRectangleHitArea(this.collapseButtonBg, 76, 24);
    this.collapseButtonText.setPosition(left + width - 46, top + 18);

    this.pauseToggleText.setVisible(true);
    this.pauseToggleBg.setVisible(true);
    this.pauseToggleKnob.setVisible(true);
    this.pauseToggleText.setPosition(left + 12, top + 64);
    this.pauseToggleBg.setPosition(left + width - 34, top + 64);
    setRectangleHitArea(this.pauseToggleBg, 44, 22);
    this.pauseToggleKnob.setPosition(
      left + width - 34 + (this.state?.pauseWhenOpen ? 10 : -10),
      top + 64,
    );
    this.pauseToggleBg.setFillStyle(this.state?.pauseWhenOpen ? 0x22c55e : 0x334155, 1);

    this.layoutPresets(left, top, width, portrait);
    this.layoutSliders(left, top, width, height, portrait);
  }

  private layoutPresets(left: number, top: number, width: number, portrait: boolean): void {
    const columns = portrait ? 3 : 2;
    const gap = 6;
    const startY = top + (portrait ? 92 : 96);
    const buttonWidth = (width - 24 - gap * (columns - 1)) / columns;
    const buttonHeight = 24;

    this.setPresetButtonsVisible(true);
    this.presetButtons.forEach((button, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + 12 + buttonWidth / 2 + column * (buttonWidth + gap);
      const y = startY + row * (buttonHeight + gap);
      button.background.setPosition(x, y);
      setRectangleHitArea(button.background, buttonWidth, buttonHeight);
      button.label.setPosition(x, y);
      button.label.setFontSize('11px');
    });
  }

  private layoutSliders(
    left: number,
    top: number,
    width: number,
    height: number,
    portrait: boolean,
  ): void {
    const columns = portrait ? 2 : 1;
    const rowHeight = portrait ? 34 : 38;
    const presetRows = Math.ceil(this.presetButtons.length / (portrait ? 3 : 2));
    const sliderTop = top + (portrait ? 92 : 96) + presetRows * 30 + 8;
    const columnWidth = (width - 24) / columns;
    const trackWidth = Math.max(70, Math.min(portrait ? 104 : 156, columnWidth - 74));
    const availableRows = Math.max(1, Math.floor((top + height - sliderTop - 8) / rowHeight));

    this.setSlidersVisible(true);
    this.sliders.forEach((slider, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const visible = row < availableRows;
      slider.labelText.setVisible(visible);
      slider.valueText.setVisible(visible);
      slider.track.setVisible(visible);
      slider.fill.setVisible(visible);
      slider.knob.setVisible(visible);

      if (!visible) {
        return;
      }

      const x = left + 12 + column * columnWidth;
      const y = sliderTop + row * rowHeight;
      const trackLeft = x + 60;

      slider.trackLeft = trackLeft;
      slider.trackWidth = trackWidth;
      slider.labelText.setPosition(x, y - 4);
      slider.valueText.setPosition(trackLeft + trackWidth + 8, y - 4);
      slider.track.setPosition(trackLeft + trackWidth / 2, y + 14);
      setRectangleHitArea(slider.track, trackWidth, 8);
      slider.fill.setPosition(trackLeft, y + 14);
      slider.fill.setOrigin(0, 0.5);
    });
  }

  private updateText(): void {
    const state = this.state;
    const editable = state?.editable === true;
    this.titleText.setText(I18n.t('strategyPanel.title'));
    this.statusText.setText(editable
      ? I18n.t('strategyPanel.edits', { count: state?.editCount ?? 0 })
      : I18n.t('strategyPanel.readOnly'));
    this.collapseButtonText.setText(I18n.t('strategyPanel.collapse'));
    this.pauseToggleText.setText(I18n.t('strategyPanel.pauseWhenOpen'));
    this.presetButtons.forEach((button) => {
      button.label.setText(I18n.t(button.config.labelKey));
    });
    this.sliders.forEach((slider) => {
      slider.labelText.setText(I18n.t(slider.labelKey));
    });
  }

  private updateInteractivity(): void {
    const editable = this.state?.editable === true;
    this.presetButtons.forEach((button) => {
      button.background.setAlpha(editable ? 1 : 0.42);
      button.label.setAlpha(editable ? 1 : 0.55);
    });
    this.sliders.forEach((slider) => {
      const alpha = editable ? 1 : 0.45;
      slider.labelText.setAlpha(alpha);
      slider.valueText.setAlpha(alpha);
      slider.track.setAlpha(alpha);
      slider.fill.setAlpha(alpha);
      slider.knob.setAlpha(alpha);
    });
  }

  private setPresetButtonsVisible(visible: boolean): void {
    this.presetButtons.forEach((button) => {
      button.background.setVisible(visible);
      button.label.setVisible(visible);
    });
  }

  private setSlidersVisible(visible: boolean): void {
    this.sliders.forEach((slider) => {
      slider.labelText.setVisible(visible);
      slider.valueText.setVisible(visible);
      slider.track.setVisible(visible);
      slider.fill.setVisible(visible);
      slider.knob.setVisible(visible);
    });
  }

  private handleSliderPointer(
    slider: SliderControl,
    pointer: Phaser.Input.Pointer,
    event?: Phaser.Types.Input.EventData,
  ): void {
    if (!this.state?.enabled || !this.state.editable) {
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
      stroke: '#020617',
      strokeThickness: bold ? 2 : 0,
    });
    text.setScrollFactor(0);

    return text;
  }
}
