import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { SupportedLocale, SUPPORTED_LOCALES } from '../i18n/Locale';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { MINIMAP_SCALE_STEPS } from '../settings/DisplaySettings';
import { SettingsManager } from '../settings/SettingsManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIButton } from './components/UIButton';
import { UIDivider } from './components/UIDivider';
import { UIPager } from './components/UIPager';
import { UISettingRowShell } from './components/UISettingRowShell';
import { UISlider } from './components/UISlider';
import { UITabBar } from './components/UITabBar';
import { UIToggleSwitch } from './components/UIToggleSwitch';
import { truncateTextToWidth } from './components/UITextUtils';
import { UIStyle } from './theme/UIStyle';
import { UIThemeRegistry } from './theme/UIThemeRegistry';
import { ASSET_STYLES, AssetStyle, DISPLAY_QUALITIES, DisplayQuality } from '../visual/DisplayQuality';
import {
  createModalBlocker,
  setRectangleHitArea,
  stopPointerEvent,
} from './input/UIInteraction';
import { UITheme } from './UITheme';

type SettingsMenuHandler = () => void;
type SettingsTabId = 'gameplay' | 'audio' | 'display' | 'input';
type RowType = 'toggle' | 'select' | 'slider' | 'info';

type SettingValue = string | number;

interface SettingRowOption<T extends SettingValue = SettingValue> {
  value: T;
  label: string;
}

interface SettingRowDefinition {
  id: string;
  label: string;
  type: RowType;
  getToggleValue?: () => boolean;
  getValue?: () => SettingValue;
  formatValue?: (value: SettingValue) => string;
  setValue?: (value: SettingValue) => void;
  onToggle?: () => void;
  options?: Array<SettingRowOption>;
  sliderSteps?: number[];
  sliderLabel?: string;
  sliderValueText?: (value: number) => string;
}

interface RowControl {
  shell: UISettingRowShell;
  container: Phaser.GameObjects.Container;
  selectButton?: UIButton;
  toggle?: UIToggleSwitch;
  slider?: UISlider;
  definition: SettingRowDefinition;
}

interface OpenDropdown {
  rowControl: RowControl;
  overlay: Phaser.GameObjects.Container;
}

const SETTINGS_TABS: SettingsTabId[] = ['display', 'audio', 'gameplay', 'input'];

export class SettingsMenu {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly pager: UIPager;
  private tabBar?: UITabBar<SettingsTabId>;
  private readonly rowControls: RowControl[] = [];
  private readonly pageByTab: Record<SettingsTabId, number> = {
    gameplay: 0,
    audio: 0,
    display: 0,
    input: 0,
  };
  private selectedTab: SettingsTabId = 'display';
  private uiStyleReopenNotice = false;
  private strategyPanelNextRunNotice = false;
  private unsubscribeResize?: () => void;
  private openDropdown?: OpenDropdown;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: SettingsMenuHandler,
    private readonly onSettingsChanged: SettingsMenuHandler = () => {},
  ) {
    this.screenManager = new ScreenManager(scene);
    this.blocker = createModalBlocker(scene, 2199, () => this.closeDropdown());
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2200);
    this.pager = new UIPager(scene, {
      x: 0,
      y: 0,
      width: 420,
      closeLabel: this.t('settings.back', I18n.t('common.close')),
      onPageChanged: (page) => {
        this.pageByTab[this.selectedTab] = page;
        this.applyLayout();
      },
      onClose: () => this.onClose(),
    });
    this.container.add([
      this.pager.container,
    ]);
    this.renderRows();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.closeDropdown();
      this.applyLayout();
    });
  }

  destroy(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.closeDropdown();
    this.clearRows();
    this.tabBar?.destroy();
    this.tabBar = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.closeDropdown();
    this.clearRows();

    for (const definition of this.getRowsForTab(this.selectedTab)) {
      const control = this.createRowControl(definition);
      this.rowControls.push(control);
      this.container.add(control.container);
    }
  }

  private clearRows(): void {
    for (const row of this.rowControls) {
      row.container.destroy(true);
    }

    this.rowControls.length = 0;
  }

  private createRowControl(definition: SettingRowDefinition): RowControl {
    const shell = new UISettingRowShell(this.scene, {
      x: 0,
      y: 0,
      width: 460,
      height: 42,
      label: definition.label,
      tone: definition.type === 'info' ? 'info' : 'normal',
      interactive: definition.type !== 'info',
    });
    const row = shell.container;

    const control: RowControl = {
      shell,
      container: row,
      definition,
    };

    if (definition.type === 'toggle') {
      this.addToggleControl(row, control);
      shell.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        stopPointerEvent(event);
        this.activateToggle(definition);
      });
      return control;
    }

    if (definition.type === 'select') {
      this.addSelectControl(row, control);
      shell.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        stopPointerEvent(event);
        this.openSelect(control);
      });
      return control;
    }

    if (definition.type === 'slider') {
      this.addSliderControl(row, control);
      return control;
    }

    return control;
  }

  private addToggleControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const toggle = new UIToggleSwitch(this.scene, {
      x: 0,
      y: 0,
      value: control.definition.getToggleValue?.() === true,
      onToggle: () => this.activateToggle(control.definition),
    });
    row.add(toggle.container);
    control.toggle = toggle;
  }

  private addSelectControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const selectButton = new UIButton(this.scene, {
      x: 0,
      y: 0,
      width: 148,
      height: 30,
      size: 'small',
      label: this.getSelectButtonLabel(control.definition),
      onClick: () => this.openSelect(control),
    });
    row.add(selectButton.container);
    control.selectButton = selectButton;
  }

  private addSliderControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const steps = control.definition.sliderSteps ?? [];
    const initialValue = this.getNumericRowValue(control.definition);
    const slider = new UISlider(this.scene, {
      x: 0,
      y: 0,
      label: control.definition.sliderLabel ?? '',
      value: this.getSliderStepIndex(control.definition, initialValue, steps),
      min: 0,
      max: Math.max(0, steps.length - 1),
      step: 1,
      width: 180,
      labelWidth: 0,
      trackWidth: 120,
      compact: true,
      onChange: (stepIndex, commit) => {
        this.setSliderFromStepIndex(control, stepIndex, commit);
      },
      formatValue: (stepIndex) => {
        const index = Phaser.Math.Clamp(Math.round(stepIndex), 0, Math.max(0, steps.length - 1));
        const value = steps[index] ?? initialValue;

        return control.definition.sliderValueText?.(value)
          ?? this.getDisplayValue(control.definition, value);
      },
    });
    row.add(slider.container);
    control.slider = slider;
  }

  private openSelect(control: RowControl): void {
    if (this.openDropdown?.rowControl === control) {
      this.closeDropdown();
      return;
    }

    const options = control.definition.options ?? [];
    if (options.length === 0) {
      return;
    }

    this.closeDropdown();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(this.container.depth + 10);
    layer.setScrollFactor(0);

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const optionStride = tiny ? 28 : compact ? 30 : 34;
    const optionHeight = tiny ? 24 : compact ? 26 : 28;
    const panelWidth = Math.min(compact ? 200 : 220, Math.max(130, control.shell.getWidth() * 0.62));
    const panelHeight = options.length * optionStride + 8;
    const rowWidth = control.shell.getWidth();
    const rowHeight = control.shell.getHeight();
    const rowWorld = this.getRowWorldPosition(control);
    const rowWorldLeft = rowWorld.x - rowWidth / 2;
    const rowTop = rowWorld.y - rowHeight / 2;
    const rowBottom = rowWorld.y + rowHeight / 2;
    const preferredY = rowBottom + 2;
    const belowFits = preferredY + panelHeight <= this.screenManager.height - 10;
    const dropdownY = belowFits ? preferredY : rowTop - panelHeight - 2;
    const dropdownLeft = Phaser.Math.Clamp(rowWorldLeft, 12, this.screenManager.width - panelWidth - 12);

    const overlayBg = createModalBlocker(this.scene, layer.depth - 1, () => this.closeDropdown());
    layer.add(overlayBg);

    const panelFrame = PanelFrame.create(this.scene, {
      x: dropdownLeft + panelWidth / 2,
      y: dropdownY + panelHeight / 2,
      width: panelWidth,
      height: panelHeight,
      variant: 'tooltip',
      alpha: 0.98,
    });
    panelFrame.setScrollFactor(0);
    layer.add(panelFrame);

    const divider = UIDivider.create(
      this.scene,
      dropdownLeft + 8,
      dropdownY + 6,
      { width: panelWidth - 16, alpha: 0.4 },
    );
    divider.setScrollFactor(0);
    layer.add(divider);

    const rowValueHeight = optionStride;
    options.forEach((option, index) => {
      const optionY = dropdownY + 12 + index * rowValueHeight + optionHeight / 2;
      const optionFontSize = tiny ? '10px' : UITheme.smallFontSize;
      const optionButton = new UIButton(this.scene, {
        x: dropdownLeft + panelWidth / 2,
        y: optionY,
        width: panelWidth - 10,
        height: optionHeight,
        size: 'small',
        label: truncateTextToWidth(option.label, panelWidth - 24, Number.parseFloat(optionFontSize)),
        selected: option.value === control.definition.getValue?.(),
        onClick: () => {
          control.definition.setValue?.(option.value);
          this.closeDropdown();
          this.afterSettingChanged();
        },
      });
      optionButton.setFontSize(optionFontSize);
      optionButton.container.setScrollFactor(0);
      layer.add(optionButton.container);
    });

    this.openDropdown = {
      rowControl: control,
      overlay: layer,
    };
  }

  private closeDropdown(): void {
    if (!this.openDropdown) {
      return;
    }

    this.openDropdown.overlay.destroy(true);
    this.openDropdown = undefined;
  }

  private activateToggle(definition: SettingRowDefinition): void {
    definition.onToggle?.();
    this.afterSettingChanged();
  }

  private afterSettingChanged(): void {
    this.syncSceneBgm();
    this.onSettingsChanged();
    this.renderRows();
    this.applyLayout();
  }

  private applyLayout(): void {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const portrait = this.screenManager.isPortrait();
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: portrait ? (tiny ? 300 : 330) : tiny ? 480 : compact ? 520 : 560,
      maxHeight: portrait ? (tiny ? 520 : 570) : compact ? 430 : 460,
      padding: tiny ? 14 : compact ? 16 : 20,
    });
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const tabWidth = tiny ? 70 : compact ? 78 : 92;
    const tabHeight = tiny ? 24 : compact ? 26 : 30;
    const tabGap = tiny ? 4 : compact ? 5 : 6;
    const tabTop = panel.content.y + (tiny ? 36 : compact ? 40 : 46);
    const tabAreaHeight = this.renderTabBar(
      panel.content.x + panel.content.width / 2,
      tabTop,
      panel.content.width,
      tabWidth,
      tabHeight,
      tabGap,
    );
    const tabAreaBottom = tabTop + tabAreaHeight;
    const closeY = panel.y + panel.height - (tiny ? 20 : compact ? 22 : 26);
    const contentTop = tabAreaBottom + (tiny ? 6 : compact ? 8 : 12);
    const contentBottom = closeY - (tiny ? 44 : compact ? 48 : 56);
    const rowGap = tiny ? 4 : compact ? 5 : 6;
    const rowHeight = tiny ? 38 : compact ? 40 : 38;
    const rowsPerPage = Math.max(1, Math.floor((contentBottom - contentTop + rowGap) / (rowHeight + rowGap)));
    const pageCount = Math.max(1, Math.ceil(this.rowControls.length / rowsPerPage));
    const currentPage = Math.min(this.getCurrentPage(), pageCount - 1);
    const pageStart = currentPage * rowsPerPage;
    const pageEnd = pageStart + rowsPerPage;
    this.pageByTab[this.selectedTab] = currentPage;
    const rowWidth = panel.content.width;

    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.frame?.destroy(true);
    this.header?.destroy();
    this.frame = PanelFrame.create(this.scene, {
      x: centerX,
      y: centerY,
      width: panel.width,
      height: panel.height,
      variant: 'modal',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: centerX,
      y: panel.content.y + (tiny ? 17 : compact ? 20 : 26),
      width: Math.max(220, panel.width - 64),
      title: this.t('settings.title', 'Settings'),
    });
    this.container.add(this.header);

    this.rowControls.forEach((row, index) => {
      if (index < pageStart || index >= pageEnd) {
        row.container.setVisible(false);
        return;
      }

      const visibleIndex = index - pageStart;
      row.container.setVisible(true);
      row.container.setPosition(
        panel.content.x + rowWidth / 2,
        contentTop + rowHeight / 2 + visibleIndex * (rowHeight + rowGap),
      );
      const labelFontSize = row.definition.type === 'info' ? fonts.small : fonts.body;
      const labelWidth = this.getRowLabelWidth(row, rowWidth);
      row.shell.layout(rowWidth, rowHeight, {
        label: row.definition.label,
        tone: row.definition.type === 'info' ? 'info' : 'normal',
        fontSize: labelFontSize,
        labelWidth,
      });

      row.selectButton?.setVisible(row.definition.type === 'select');
      row.toggle?.setVisible(row.definition.type === 'toggle');
      row.slider?.setVisible(row.definition.type === 'slider');

      if (row.definition.type === 'toggle') {
        this.layoutToggleRow(row, rowWidth, rowHeight);
      } else if (row.definition.type === 'select') {
        this.layoutSelectRow(row, rowWidth, rowHeight);
      } else if (row.definition.type === 'slider') {
        this.layoutSliderRow(row, rowWidth, rowHeight);
      }
    });

    this.layoutPagingControls(
      panel.content.x,
      closeY - (compact ? 36 : 40),
      rowWidth,
      pageCount,
      currentPage,
      compact,
    );
  }

  private getRowWorldPosition(row: RowControl): { x: number; y: number } {
    const matrix = row.container.getWorldTransformMatrix();
    return {
      x: matrix.tx,
      y: matrix.ty,
    };
  }

  private layoutPagingControls(
    left: number,
    y: number,
    width: number,
    pageCount: number,
    currentPage: number,
    compact: boolean,
  ): void {
    this.pager.setPosition(left + width / 2, y);
    this.pager.setSize(width, compact);
    this.pager.setPage(currentPage, pageCount);

    const pageControlsVisible = pageCount > 1;
    this.pager.prevButton.setVisible(pageControlsVisible);
    this.pager.nextButton.setVisible(pageControlsVisible);
    this.pager.pageText.setVisible(pageControlsVisible);
  }

  private renderTabBar(
    x: number,
    y: number,
    width: number,
    tabWidth: number,
    tabHeight: number,
    gap: number,
  ): number {
    this.tabBar?.destroy();
    this.tabBar = new UITabBar(this.scene, {
      x,
      y,
      width,
      items: SETTINGS_TABS.map((id) => ({
        id,
        label: this.getTabLabel(id),
      })),
      selectedId: this.selectedTab,
      tabWidth,
      tabHeight,
      gap,
      onSelect: (tabId) => {
        this.closeDropdown();
        this.selectedTab = tabId;
        this.pageByTab[tabId] = 0;
        this.renderRows();
        this.applyLayout();
      },
    });
    this.container.add(this.tabBar.container);
    return this.tabBar.height;
  }

  private layoutToggleRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    const enabled = row.definition.getToggleValue?.() === true;
    row.toggle?.setVisible(true);
    row.toggle?.setPosition(rowWidth / 2 - 48, 0);
    row.toggle?.setSize(54, 28);
    row.toggle?.setValue(enabled);
    row.toggle?.setDisabled(false);
  }

  private layoutSelectRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    const valueWidth = this.getSelectValueWidth(rowWidth);
    const fontSize = LayoutConfig.getResponsiveFontSizes(this.screenManager).small;
    const buttonWidth = valueWidth + 30;
    row.selectButton?.setVisible(true);
    row.selectButton?.setPosition(rowWidth / 2 - 16 - buttonWidth / 2, 0);
    row.selectButton?.setSize(buttonWidth, Math.max(26, rowHeight - 12));
    row.selectButton?.setFontSize(fontSize);
    row.selectButton?.setText(this.getSelectButtonLabel(row.definition));
  }

  private layoutSliderRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    const steps = row.definition.sliderSteps ?? [];
    const trackWidth = this.getSliderTrackWidth(rowWidth);
    const valueWidth = this.getSliderValueWidth();
    const labelWidth = this.getSliderLabelWidth(rowWidth);
    const sliderWidth = Math.max(120, labelWidth + trackWidth + valueWidth + 16);
    const sliderX = rowWidth / 2 - 16 - sliderWidth;
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const numericValue = this.getNumericRowValue(row.definition);
    const currentIndex = this.getSliderStepIndex(row.definition, numericValue, steps);

    row.slider?.setVisible(true);
    row.slider?.setPosition(sliderX, -(tiny ? 8 : 10));
    row.slider?.setLayout({
      width: sliderWidth,
      labelWidth,
      trackWidth,
      valueWidth,
      compact: compact || tiny,
    });
    row.slider?.setValue(currentIndex);
  }

  private getRowLabelWidth(row: RowControl, rowWidth: number): number {
    if (row.definition.type === 'info') {
      return Math.max(120, rowWidth - 24);
    }

    if (row.definition.type === 'toggle') {
      return Math.max(110, rowWidth - 108);
    }

    if (row.definition.type === 'select') {
      return Math.max(92, rowWidth - this.getSelectValueWidth(rowWidth) - 54);
    }

    if (row.definition.type === 'slider') {
      return Math.max(82, rowWidth - this.getSliderTrackWidth(rowWidth) - this.getSliderValueWidth() - 54);
    }

    return Math.max(100, rowWidth - 24);
  }

  private getSelectValueWidth(rowWidth: number): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;

    return Math.min(
      tiny ? 92 : compact ? 112 : 136,
      Math.max(72, rowWidth * (tiny ? 0.3 : compact ? 0.34 : 0.38)),
    );
  }

  private getSliderTrackWidth(rowWidth: number): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;

    return Math.min(
      tiny ? 86 : compact ? 108 : 150,
      Math.max(70, rowWidth * (tiny ? 0.25 : compact ? 0.3 : 0.34)),
    );
  }

  private getSliderValueWidth(): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);

    return density === 'tiny' ? 34 : density === 'compact' ? 42 : 50;
  }

  private getSliderLabelWidth(rowWidth: number): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;

    if (tiny) {
      return 0;
    }

    return Math.min(compact ? 48 : 64, Math.max(0, rowWidth * 0.16));
  }

  private setSliderFromStepIndex(row: RowControl, stepIndex: number, commit: boolean): void {
    const steps = row.definition.sliderSteps ?? [];

    if (steps.length === 0) {
      return;
    }

    const nearest = Phaser.Math.Clamp(Math.round(stepIndex), 0, steps.length - 1);
    const value = steps[nearest]!;
    row.slider?.setValue(nearest);

    if (!commit) {
      return;
    }

    const current = row.definition.getValue?.();
    if (current !== undefined && current === value) {
      return;
    }

    row.definition.setValue?.(value);
    this.afterSettingChanged();
  }

  private getDisplayValue(definition: SettingRowDefinition, value: SettingValue | undefined = definition.getValue?.()): string {
    if (!definition.getValue && value === undefined) {
      return '';
    }

    const current = value as SettingValue;
    if (definition.formatValue) {
      return definition.formatValue(current);
    }

    if (typeof current === 'number' && Number.isFinite(current)) {
      return current.toString();
    }

    return String(current);
  }

  private getSelectButtonLabel(definition: SettingRowDefinition): string {
    return `${this.getDisplayValue(definition)} v`;
  }

  private getNumericRowValue(definition: SettingRowDefinition): number {
    const value = definition.getValue?.();

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    return 0;
  }

  private getCurrentPage(): number {
    return this.pageByTab[this.selectedTab] ?? 0;
  }

  private getRowsForTab(tabId: SettingsTabId): SettingRowDefinition[] {
    switch (tabId) {
      case 'audio':
        return this.getAudioRows();
      case 'display':
        return this.getDisplayRows();
      case 'input':
        return this.getInputRows();
      case 'gameplay':
      default:
        return this.getGameplayRows();
    }
  }

  private getGameplayRows(): SettingRowDefinition[] {
    const gameplay = SettingsManager.getGameplay();

    const rows: SettingRowDefinition[] = [
      this.toggleRow('showDetailedCooldownTime', this.t('settings.showDetailedCooldownTime', 'Detailed CD Time'), gameplay.showDetailedCooldownTime, () => {
        SettingsManager.updateGameplay({
          showDetailedCooldownTime: !SettingsManager.getGameplay().showDetailedCooldownTime,
        });
      }),
      this.toggleRow('damageNumbers', this.t('settings.damageNumbers', 'Damage Numbers'), gameplay.showDamageNumbers, () => {
        SettingsManager.updateGameplay({ showDamageNumbers: !SettingsManager.getGameplay().showDamageNumbers });
      }),
      this.toggleRow('endlessMode', this.t('settings.endlessMode', 'Endless Mode'), gameplay.endlessMode, () => {
        SettingsManager.updateGameplay({ endlessMode: !SettingsManager.getGameplay().endlessMode });
      }),
      this.toggleRow('strategyTacticsPanel', this.t('settings.strategyTacticsPanel', 'Strategy / Tactics Panel'), gameplay.showStrategyTacticsPanel, () => {
        this.strategyPanelNextRunNotice = true;
        SettingsManager.updateGameplay({
          showStrategyTacticsPanel: !SettingsManager.getGameplay().showStrategyTacticsPanel,
        });
      }),
      this.toggleRow('pauseWhenStrategyPanelOpen', this.t('settings.pauseWhenStrategyPanelOpen', 'Pause When Tactics Open'), gameplay.pauseWhenStrategyPanelOpen, () => {
        SettingsManager.updateGameplay({
          pauseWhenStrategyPanelOpen: !SettingsManager.getGameplay().pauseWhenStrategyPanelOpen,
        });
      }),
      {
        id: 'manualHidesStrategyPanel',
        label: this.t('settings.manualHidesStrategyPanel', 'Manual mode always keeps this panel hidden.'),
        type: 'info',
      },
      {
        id: 'strategyControlType',
        label: this.t('settings.strategyControlType', 'Auto Strategy Control'),
        type: 'select',
        getValue: () => SettingsManager.getGameplay().strategyControlType,
        setValue: (value) => {
          SettingsManager.updateGameplay({
            strategyControlType: value === 'live' ? 'live' : 'fixed',
          });
        },
        options: [
          {
            value: 'fixed',
            label: this.t('settings.strategyControl.fixed', 'Fixed'),
          },
          {
            value: 'live',
            label: this.t('settings.strategyControl.live', 'Live'),
          },
        ],
        formatValue: (value) => (
          value === 'live'
            ? this.t('settings.strategyControl.live', 'Live')
            : this.t('settings.strategyControl.fixed', 'Fixed')
        ),
      },
    ];

    if (this.strategyPanelNextRunNotice) {
      rows.splice(5, 0, {
        id: 'strategyTacticsPanelNextRunNotice',
        label: this.t('settings.strategyTacticsPanelNextRunNotice', 'Strategy / Tactics Panel loads on the next run.'),
        type: 'info',
      });
    }

    return rows;
  }

  private getAudioRows(): SettingRowDefinition[] {
    const audio = SettingsManager.getAudio();

    return [
      this.toggleRow('audioEnabled', this.t('settings.audio', 'Audio'), audio.audioEnabled, () => {
        AudioManager.setAudioEnabled(!AudioManager.isAudioEnabled());
      }),
      this.sliderRow('bgmVolume', this.t('settings.bgmVolume', 'BGM Volume'), () => AudioManager.getChannelVolume('bgm'), [0, 0.25, 0.5, 0.75, 1], (value) => {
        AudioManager.setChannelVolume('bgm', value as number);
      }),
      this.sliderRow('sfxVolume', this.t('settings.sfxVolume', 'SFX Volume'), () => AudioManager.getChannelVolume('sfx'), [0, 0.25, 0.5, 0.75, 1], (value) => {
        AudioManager.setChannelVolume('sfx', value as number);
      }),
      this.sliderRow('weaponVolume', this.t('settings.weaponVolume', 'Weapon Volume'), () => AudioManager.getChannelVolume('weapon'), [0, 0.25, 0.5, 0.75, 1], (value) => {
        AudioManager.setChannelVolume('weapon', value as number);
      }),
      this.sliderRow('uiVolume', this.t('settings.uiVolume', 'UI Volume'), () => AudioManager.getChannelVolume('ui'), [0, 0.25, 0.5, 0.75, 1], (value) => {
        AudioManager.setChannelVolume('ui', value as number);
      }),
    ];
  }

  private getDisplayRows(): SettingRowDefinition[] {
    const display = SettingsManager.getDisplay();
    const rows: SettingRowDefinition[] = [
      {
        id: 'language',
        label: this.t('settings.language', I18n.getLocaleDisplayName()),
        type: 'select',
        getValue: () => I18n.getLocale(),
        setValue: (value) => {
          I18n.setLocale(value as SupportedLocale);
        },
        options: SUPPORTED_LOCALES.map((locale) => ({
          value: locale,
          label: I18n.getLocaleDisplayName(locale),
        })),
        formatValue: (value) => I18n.getLocaleDisplayName(value as SupportedLocale),
      },
      {
        id: 'graphicsQuality',
        label: this.t('settings.graphicsQuality', 'Graphics Quality'),
        type: 'select',
        getValue: () => SettingsManager.getDisplay().displayQuality,
        setValue: (value) => {
          SettingsManager.updateDisplay({
            displayQuality: value as DisplayQuality,
          });
        },
        options: DISPLAY_QUALITIES.map((value) => ({
          value,
          label: this.formatDisplayQuality(value),
        })),
      },
      {
        id: 'assetStyle',
        label: this.t('settings.assetStyle', 'Asset Style'),
        type: 'select',
        getValue: () => SettingsManager.getDisplay().assetStyle,
        setValue: (value) => {
          SettingsManager.updateDisplay({
            assetStyle: value as AssetStyle,
          });
        },
        options: ASSET_STYLES.map((value) => ({
          value,
          label: this.formatAssetStyle(value),
        })),
      },
      {
        id: 'uiStyle',
        label: this.t('settings.uiStyle', 'UI Style'),
        type: 'select',
        getValue: () => SettingsManager.getDisplay().uiStyle,
        setValue: (value) => {
          this.uiStyleReopenNotice = true;
          SettingsManager.updateDisplay({
            uiStyle: value as UIStyle,
          });
        },
        options: UIThemeRegistry.listStyles().map((value) => ({
          value,
          label: this.t(`settings.uiStyle.${value}`, value),
        })),
      },
      {
        id: 'modelScale',
        label: this.t('settings.modelScale', 'Model Scale'),
        type: 'slider',
        getValue: () => SettingsManager.getDisplay().visualModelScale,
        setValue: (value) => {
          SettingsManager.updateDisplay({
            visualModelScale: value as 1 | 1.5 | 2,
          });
        },
        sliderSteps: [1, 1.5, 2],
        formatValue: (value) => `${value}x`,
      },
      this.sliderRow(
        'minimapScale',
        this.t('settings.minimapScale', 'Minimap Size'),
        () => SettingsManager.getDisplay().minimapScale,
        [...MINIMAP_SCALE_STEPS],
        (value) => {
          SettingsManager.updateDisplay({ minimapScale: value as typeof MINIMAP_SCALE_STEPS[number] });
        },
        (value) => `x${value}`,
      ),
      this.toggleRow('shadows', this.t('settings.shadows', 'Shadows'), display.shadowsEnabled, () => {
        SettingsManager.updateDisplay({ shadowsEnabled: !SettingsManager.getDisplay().shadowsEnabled });
      }),
      this.toggleRow('debugOverlay', this.t('settings.debugOverlay', 'Debug Overlay'), display.showDebugOverlay, () => {
        SettingsManager.updateDisplay({ showDebugOverlay: !SettingsManager.getDisplay().showDebugOverlay });
      }),
    ];

    if (SettingsManager.isVisualRestartRequired()) {
      rows.push({
        id: 'visualRestartRequired',
        label: this.t(
          'settings.nextRunNotice',
          'Some visual settings apply after restart or next run.',
        ),
        type: 'info',
      });
    }

    if (this.uiStyleReopenNotice) {
      rows.push({
        id: 'uiStyleReopenNotice',
        label: this.t(
          'settings.uiStyleReopenNotice',
          'Some UI style changes apply after reopening this menu.',
        ),
        type: 'info',
      });
    }

    return rows;
  }

  private getInputRows(): SettingRowDefinition[] {
    const input = SettingsManager.getInput();

    return [
      this.toggleRow('virtualJoystick', this.t('settings.virtualJoystick', 'Virtual Joystick'), input.virtualJoystickEnabled, () => {
        SettingsManager.updateInput({
          virtualJoystickEnabled: !SettingsManager.getInput().virtualJoystickEnabled,
        });
      }),
      this.sliderRow(
        'joystickSize',
        this.t('settings.joystickSize', 'Joystick Size'),
        () => SettingsManager.getInput().virtualJoystickSize,
        [0.75, 1, 1.25, 1.5],
        (value) => {
          SettingsManager.updateInput({ virtualJoystickSize: value as number });
        },
      ),
      this.sliderRow(
        'joystickOpacity',
        this.t('settings.joystickOpacity', 'Joystick Opacity'),
        () => SettingsManager.getInput().virtualJoystickOpacity,
        [0.35, 0.5, 0.6, 0.75, 1],
        (value) => {
          SettingsManager.updateInput({ virtualJoystickOpacity: value as number });
        },
        (value) => `${Math.round((value as number) * 100)}%`,
      ),
      this.toggleRow('leftHandedMode', this.t('settings.leftHandedMode', 'Left Handed'), input.leftHandedMode, () => {
        SettingsManager.updateInput({
          leftHandedMode: !SettingsManager.getInput().leftHandedMode,
        });
      }),
    ];
  }

  private toggleRow(
    id: string,
    label: string,
    currentValue: boolean,
    onToggle: () => void,
  ): SettingRowDefinition {
    return {
      id,
      label,
      type: 'toggle',
      getToggleValue: () => currentValue,
      onToggle,
    };
  }

  private sliderRow(
    id: string,
    label: string,
    getValue: () => number,
    steps: number[],
    setValue: (value: SettingValue) => void,
    formatValue: (value: SettingValue) => string = (value) => `${Math.round((Number(value) * 100))}%`,
  ): SettingRowDefinition {
    return {
      id,
      label,
      type: 'slider',
      getValue,
      setValue,
      sliderSteps: steps,
      formatValue: (value) => formatValue(value as number),
    };
  }

  private formatDisplayQuality(quality: DisplayQuality): string {
    switch (quality) {
      case 'medium':
        return this.t('settings.qualityMedium', 'Medium');
      case 'low':
        return this.t('settings.qualityLow', 'Low');
      case 'minimal':
        return this.t('settings.qualityMinimal', 'Minimal');
      case 'high':
      default:
        return this.t('settings.qualityHigh', 'High');
    }
  }

  private formatAssetStyle(assetStyle: AssetStyle): string {
    switch (assetStyle) {
      case 'legacy':
        return this.t('settings.assetStyleLegacy', 'Legacy');
      case 'graphics':
        return this.t('settings.assetStyleGraphics', 'Graphics');
      case 'newArt':
      default:
        return this.t('settings.assetStyleNew', 'New');
    }
  }

  private getTabLabel(tabId: SettingsTabId): string {
    return this.t(`settings.tab.${tabId}`, this.getFallbackTabLabel(tabId));
  }

  private getFallbackTabLabel(tabId: SettingsTabId): string {
    switch (tabId) {
      case 'audio':
        return 'Audio';
      case 'display':
        return 'Display';
      case 'input':
        return 'Input';
      case 'gameplay':
      default:
        return 'Gameplay';
    }
  }

  private syncSceneBgm(): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      return;
    }

    switch (this.scene.scene.key) {
      case 'TitleScene':
        AudioManager.playBgm(this.scene, 'title_bgm');
        break;
      case 'ResultScene':
        AudioManager.playBgm(this.scene, 'result_bgm');
        break;
      default:
        break;
    }
  }

  private getSliderStepIndex(definition: SettingRowDefinition, value: number, steps: number[]): number {
    if (steps.length === 0) {
      return 0;
    }

    if (Number.isNaN(value)) {
      return 0;
    }

    let best = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < steps.length; i += 1) {
      const delta = Math.abs(steps[i]! - value);
      if (delta < bestDelta) {
        best = i;
        bestDelta = delta;
      }
    }

    return best;
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
