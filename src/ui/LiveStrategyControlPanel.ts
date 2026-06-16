import Phaser from 'phaser';

import type { RunControlMode } from '../runtime/RunModeConfig';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import type { StrategyEditReason } from '../strategy/runtime/RuntimeStrategyState';
import { I18n } from '../i18n/I18n';
import { UIButton } from './components/UIButton';
import { UICollapsiblePanel } from './components/UICollapsiblePanel';
import { UISlider } from './components/UISlider';
import { UITextBlock } from './components/UITextBlock';
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
  slider: UISlider;
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
  button: UIButton;
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
  private readonly shell: UICollapsiblePanel;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly pauseToggleText: Phaser.GameObjects.Text;
  private readonly pauseToggleButton: UIButton;
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
    this.shell = new UICollapsiblePanel(scene, {
      x: 0,
      y: 0,
      width: 140,
      height: 40,
      title: I18n.t('strategyPanel.title'),
      collapsed: true,
      orientation: 'bottomBar',
      collapsedLabel: I18n.t('strategyPanel.collapsed'),
      expandedLabel: I18n.t('strategyPanel.collapse'),
      onToggle: (collapsed) => {
        this.applyCollapsed(collapsed, true);
      },
    });
    this.shell.setDepth(2100);
    this.shell.setScrollFactor(0);

    this.statusText = this.createText('', UITheme.mutedTextColor, '11px', false);
    this.pauseToggleText = this.createText('', UITheme.textColor, '11px', false);
    this.pauseToggleButton = new UIButton(scene, {
      x: 0,
      y: 0,
      width: 52,
      height: 22,
      size: 'small',
      label: I18n.t('common.off'),
      onClick: () => this.togglePauseWhenOpen(),
    });

    this.shell.contentContainer.add([
      this.statusText,
      this.pauseToggleText,
      this.pauseToggleButton.container,
    ]);
    this.createPresetButtons();
    this.createSliders();
    this.shell.setVisible(false);
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
    this.shell.setVisible(true);
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
    this.shell.destroy();
  }

  private hidePanel(): void {
    if (!this.collapsed) {
      this.collapsed = true;
      this.emitExpandedChanged(false);
    }

    this.shell.setVisible(false);
  }

  private setCollapsed(collapsed: boolean): void {
    this.applyCollapsed(collapsed, false);
  }

  private applyCollapsed(collapsed: boolean, fromShell: boolean): void {
    if (this.collapsed === collapsed) {
      return;
    }

    this.collapsed = collapsed;
    if (!fromShell) {
      this.shell.setCollapsed(collapsed);
    }
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
      const button = new UIButton(this.scene, {
        x: 0,
        y: 0,
        width: 64,
        height: 24,
        size: 'small',
        label: I18n.t(config.labelKey),
        onClick: () => {
          if (!this.state?.enabled || !this.state.editable) {
            return;
          }

          for (const patch of config.patches) {
            this.onPatch({ ...patch, reason: 'preset' });
          }
        },
      });
      this.shell.contentContainer.add(button.container);
      this.presetButtons.push({ config, button });
    }
  }

  private createSliders(): void {
    for (const config of SLIDERS) {
      const slider = new UISlider(this.scene, {
        x: 0,
        y: 0,
        label: I18n.t(config.labelKey),
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        width: 160,
        labelWidth: 58,
        trackWidth: 92,
        valueWidth: 28,
        compact: true,
        onChange: (value) => {
          this.handleSliderValue(config, value);
        },
      });
      const control: SliderControl = {
        ...config,
        slider,
      };

      this.shell.contentContainer.add(slider.container);
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
    const hudLayout = LayoutConfig.getHudLayout(this.screenManager);
    const density = hudLayout.density;
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const margin = tiny ? 6 : 10;
    const zone = portrait ? hudLayout.hudZones.bottomCenter : hudLayout.hudZones.rightStack;
    const width = portrait
      ? Math.min(this.screenManager.width - margin * 2, Math.max(tiny ? 190 : 220, Math.min(zone.width, tiny ? 260 : 320)))
      : compact ? 32 : 36;
    const height = portrait
      ? tiny ? 30 : 34
      : Math.min(compact ? 118 : 138, Math.max(92, zone.height - margin * 2));
    const x = portrait
      ? zone.x + zone.width / 2
      : zone.x + zone.width - width / 2;
    const y = portrait
      ? Math.min(this.screenManager.height - margin - height / 2, zone.y + zone.height - height / 2)
      : Phaser.Math.Clamp(
        zone.y + height / 2 + margin,
        margin + height / 2,
        this.screenManager.height - margin - height / 2,
      );

    this.shell.setLayout({
      width,
      height,
      orientation: portrait ? 'bottomBar' : 'rightSidebar',
    });
    this.shell.setPosition(x, y);
    if (!this.shell.isCollapsed()) {
      this.shell.setCollapsed(true);
    }
  }

  private layoutExpanded(portrait: boolean): void {
    const hudLayout = LayoutConfig.getHudLayout(this.screenManager);
    const density = hudLayout.density;
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const margin = tiny ? 6 : 10;
    const zone = portrait ? hudLayout.hudZones.bottomCenter : hudLayout.hudZones.rightStack;
    const width = portrait
      ? Math.min(this.screenManager.width - margin * 2, Math.max(tiny ? 236 : 268, Math.min(zone.width, tiny ? 300 : 364)))
      : Math.min(zone.width, Phaser.Math.Clamp(this.screenManager.width * 0.18, compact ? 196 : 216, 270));
    const topLimit = portrait
      ? margin
      : Math.max(zone.y + margin, hudLayout.statsRect.y + hudLayout.statsRect.height + margin);
    const bottomLimit = this.screenManager.height - margin;
    const maxAvailableHeight = Math.max(tiny ? 150 : 190, bottomLimit - topLimit);
    const height = portrait
      ? Math.min(
        Phaser.Math.Clamp(this.screenManager.height * (tiny ? 0.16 : 0.18), tiny ? 124 : 140, tiny ? 156 : 184),
        this.screenManager.height - margin * 2,
      )
      : Math.min(
        maxAvailableHeight,
        Phaser.Math.Clamp(this.screenManager.height * (compact ? 0.48 : 0.52), compact ? 188 : 226, compact ? 320 : 420),
      );
    const left = portrait
      ? zone.x + zone.width / 2 - width / 2
      : zone.x + zone.width - width;
    const top = portrait
      ? Math.min(this.screenManager.height - height - margin, zone.y + zone.height - height)
      : Phaser.Math.Clamp(
        topLimit,
        margin,
        Math.max(margin, this.screenManager.height - height - margin),
      );
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const localLeft = -width / 2;
    const localTop = -height / 2;

    this.shell.setLayout({
      width,
      height,
      orientation: portrait ? 'bottomBar' : 'rightSidebar',
    });
    this.shell.setPosition(centerX, centerY);
    if (this.shell.isCollapsed()) {
      this.shell.setCollapsed(false);
    }

    this.statusText.setVisible(true);
    this.statusText.setPosition(localLeft + 10, localTop + (tiny ? 31 : 35));
    this.statusText.setFontSize(tiny ? '9px' : compact ? '10px' : '11px');

    this.pauseToggleText.setVisible(true);
    this.pauseToggleButton.setVisible(true);
    this.pauseToggleText.setPosition(localLeft + 10, localTop + (tiny ? 46 : 52));
    this.pauseToggleText.setFontSize(tiny ? '9px' : compact ? '10px' : '11px');
    this.pauseToggleButton.setPosition(localLeft + width - (tiny ? 28 : 32), localTop + (tiny ? 46 : 52));
    this.pauseToggleButton.setSize(tiny ? 42 : 52, tiny ? 18 : 22);
    this.pauseToggleButton.setFontSize(tiny ? '9px' : '10px');
    this.pauseToggleButton.setSelected(this.state?.pauseWhenOpen === true);

    this.layoutPresets(localLeft, localTop, width, portrait, density);
    this.layoutSliders(localLeft, localTop, width, height, portrait, density);
  }

  private layoutPresets(
    left: number,
    top: number,
    width: number,
    portrait: boolean,
    density: ReturnType<typeof LayoutConfig.getContentDensity>,
  ): void {
    const tiny = density === 'tiny';
    const columns = portrait ? 3 : 2;
    const gap = tiny ? 3 : 5;
    const startY = top + (portrait ? tiny ? 58 : 66 : tiny ? 70 : 80);
    const buttonWidth = (width - 24 - gap * (columns - 1)) / columns;
    const buttonHeight = tiny ? 18 : 20;

    this.setPresetButtonsVisible(true);
    this.presetButtons.forEach((button, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = left + 12 + buttonWidth / 2 + column * (buttonWidth + gap);
      const y = startY + row * (buttonHeight + gap);
      button.button.setPosition(x, y);
      button.button.setSize(buttonWidth, buttonHeight);
      button.button.setFontSize(tiny ? '9px' : '10px');
    });
  }

  private layoutSliders(
    left: number,
    top: number,
    width: number,
    height: number,
    portrait: boolean,
    density: ReturnType<typeof LayoutConfig.getContentDensity>,
  ): void {
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const columns = portrait ? 2 : 1;
    const rowHeight = portrait ? tiny ? 22 : 25 : compact ? 27 : 31;
    const presetRows = Math.ceil(this.presetButtons.length / (portrait ? 3 : 2));
    const sliderTop = top + (portrait ? tiny ? 58 : 66 : tiny ? 70 : 80) + presetRows * (tiny ? 21 : 25) + (tiny ? 4 : 6);
    const columnWidth = (width - 24) / columns;
    const labelWidth = tiny ? 42 : compact ? 52 : 58;
    const trackWidth = Math.max(52, Math.min(portrait ? tiny ? 70 : 88 : compact ? 104 : 132, columnWidth - labelWidth - 18));
    const availableRows = Math.max(1, Math.floor((top + height - sliderTop - (tiny ? 4 : 8)) / rowHeight));

    this.setSlidersVisible(true);
    this.sliders.forEach((slider, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const visible = row < availableRows;
      slider.slider.setVisible(visible);

      if (!visible) {
        return;
      }

      const x = left + 12 + column * columnWidth;
      const y = sliderTop + row * rowHeight;
      const valueWidth = tiny ? 24 : 28;
      const sliderWidth = Math.max(104, labelWidth + trackWidth + valueWidth + 16);
      slider.slider.setPosition(x, y);
      slider.slider.setLayout({
        width: sliderWidth,
        labelWidth,
        trackWidth,
        valueWidth,
        compact: compact || tiny,
      });
    });
  }

  private updateText(): void {
    const state = this.state;
    const editable = state?.editable === true;
    this.shell.setLabels({
      title: I18n.t('strategyPanel.title'),
      collapsedLabel: this.screenManager.isPortrait()
        ? `${I18n.t('strategyPanel.title')} ^`
        : `< ${I18n.t('strategyPanel.collapsed')}`,
      expandedLabel: I18n.t('strategyPanel.collapse'),
    });
    this.statusText.setText(editable
      ? I18n.t('strategyPanel.edits', { count: state?.editCount ?? 0 })
      : I18n.t('strategyPanel.readOnly'));
    this.pauseToggleText.setText(I18n.t('strategyPanel.pauseWhenOpen'));
    this.pauseToggleButton.setText(state?.pauseWhenOpen ? I18n.t('common.on') : I18n.t('common.off'));
    this.pauseToggleButton.setSelected(state?.pauseWhenOpen === true);
    this.presetButtons.forEach((button) => {
      button.button.setText(I18n.t(button.config.labelKey));
    });
    this.sliders.forEach((slider) => {
      slider.slider.setLabel(I18n.t(slider.labelKey));
    });
  }

  private updateInteractivity(): void {
    const editable = this.state?.editable === true;
    this.presetButtons.forEach((button) => {
      button.button.setDisabled(!editable);
      button.button.container.setAlpha(editable ? 1 : 0.55);
    });
    this.sliders.forEach((slider) => {
      slider.slider.setDisabled(!editable);
    });
    this.pauseToggleButton.setDisabled(this.state?.enabled !== true);
  }

  private setPresetButtonsVisible(visible: boolean): void {
    this.presetButtons.forEach((button) => {
      button.button.setVisible(visible);
    });
  }

  private setSlidersVisible(visible: boolean): void {
    this.sliders.forEach((slider) => {
      slider.slider.setVisible(visible);
    });
  }

  private handleSliderValue(slider: SliderConfig, value: number): void {
    if (!this.state?.enabled || !this.state.editable) {
      return;
    }

    const nextValue = Phaser.Math.Clamp(Math.round(value), 0, 100);
    this.onPatch({
      fieldPath: slider.fieldPath,
      value: nextValue,
      reason: 'user',
    });
  }

  private updateSliderValue(slider: SliderControl, value: number): void {
    const safeValue = Phaser.Math.Clamp(Math.round(value), 0, 100);
    slider.slider.setValue(safeValue);
  }

  private createText(
    value: string,
    color: string,
    fontSize: string,
    bold: boolean,
  ): Phaser.GameObjects.Text {
    const text = new UITextBlock(this.scene, {
      x: 0,
      y: 0,
      text: value,
      fontSize,
      fontStyle: bold ? 'bold' : '',
      align: 'left',
    }).text;
    text.setColor(color);
    text.setStroke('#020617', bold ? 2 : 0);
    text.setScrollFactor(0);

    return text;
  }
}
