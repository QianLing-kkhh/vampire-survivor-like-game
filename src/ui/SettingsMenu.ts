import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { SupportedLocale, SUPPORTED_LOCALES } from '../i18n/Locale';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { UIStyle } from './theme/UIStyle';
import { UIThemeRegistry } from './theme/UIThemeRegistry';
import { ASSET_STYLES, AssetStyle, DISPLAY_QUALITIES, DisplayQuality } from '../visual/DisplayQuality';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type SettingsMenuHandler = () => void;
type SettingsTabId = 'gameplay' | 'audio' | 'display' | 'input' | 'developer';
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
}

interface TabButton {
  id: SettingsTabId;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface RowControl {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value?: Phaser.GameObjects.Text;
  leftArrow?: Phaser.GameObjects.Text;
  rightArrow?: Phaser.GameObjects.Text;
  track?: Phaser.GameObjects.Rectangle;
  knob?: Phaser.GameObjects.Arc;
  definition: SettingRowDefinition;
  sliderTrackLeft?: number;
  sliderTrackRight?: number;
}

interface OpenDropdown {
  rowControl: RowControl;
  overlay: Phaser.GameObjects.Container;
}

const SETTINGS_TABS: SettingsTabId[] = ['display', 'audio', 'gameplay', 'input', 'developer'];

export class SettingsMenu {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private readonly prevPageButton: Phaser.GameObjects.Text;
  private readonly nextPageButton: Phaser.GameObjects.Text;
  private readonly pageText: Phaser.GameObjects.Text;
  private readonly tabButtons: TabButton[] = [];
  private readonly rowControls: RowControl[] = [];
  private readonly pageByTab: Record<SettingsTabId, number> = {
    gameplay: 0,
    audio: 0,
    display: 0,
    input: 0,
    developer: 0,
  };
  private selectedTab: SettingsTabId = 'display';
  private uiStyleReopenNotice = false;
  private unsubscribeResize?: () => void;
  private openDropdown?: OpenDropdown;
  private activeDraggedSlider?: RowControl;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: SettingsMenuHandler,
    private readonly onSettingsChanged: SettingsMenuHandler = () => {},
  ) {
    this.screenManager = new ScreenManager(scene);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(2200);
    this.background = scene.add.rectangle(
      this.screenManager.centerX,
      this.screenManager.centerY,
      520,
      520,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.85);
    this.panelImage = scene.textures.exists('art_ui_pause_panel_bg')
      ? scene.add.image(this.screenManager.centerX, this.screenManager.centerY, 'art_ui_pause_panel_bg')
      : undefined;
    this.panelImage?.setAlpha(UITheme.pausePanelAlpha);
    this.title = scene.add.text(0, 0, this.t('settings.title', 'Settings'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);
    this.closeButton = this.createCloseButton();
    this.prevPageButton = this.createPageButton(this.t('settings.previousPage', 'Prev'), () => {
      this.setCurrentPage(this.getCurrentPage() - 1);
    });
    this.nextPageButton = this.createPageButton(this.t('settings.nextPage', 'Next'), () => {
      this.setCurrentPage(this.getCurrentPage() + 1);
    });
    this.pageText = scene.add.text(0, 0, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
    });
    this.pageText.setOrigin(0.5);
    this.container.add([
      this.background,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
      this.prevPageButton,
      this.nextPageButton,
      this.pageText,
      this.closeButton,
    ]);
    this.createTabs();
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
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private createTabs(): void {
    for (const tabId of SETTINGS_TABS) {
      const tab = this.scene.add.container(0, 0);
      const background = this.scene.add.rectangle(0, 0, 96, 34, UITheme.buttonBgColor, 0.94);
      background.setStrokeStyle(1, UITheme.panelBorderColor, 0.72);
      background.setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(0, 0, this.getTabLabel(tabId), {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        align: 'center',
      });
      label.setOrigin(0.5);
      tab.add([background, label]);
      background.on('pointerdown', () => {
        AudioManager.playUi(this.scene, 'ui_click');
        this.closeDropdown();
        this.selectedTab = tabId;
        this.pageByTab[tabId] = 0;
        this.renderRows();
        this.applyLayout();
      });
      this.tabButtons.push({ id: tabId, container: tab, background, label });
      this.container.add(tab);
    }
  }

  private renderRows(): void {
    this.closeDropdown();
    this.clearRows();
    this.title.setText(this.t('settings.title', 'Settings'));

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
    const row = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, 460, 42, UITheme.iconBgColor, 0.58);
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.28);
    if (definition.type !== 'info') {
      background.setInteractive({ useHandCursor: true });
    }
    const label = this.scene.add.text(0, 0, definition.label, {
      color: definition.type === 'info' ? UITheme.successTextColor : UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
    });
    label.setOrigin(0, 0.5);
    row.add([background, label]);

    const control: RowControl = {
      container: row,
      background,
      label,
      definition,
    };

    if (definition.type === 'toggle') {
      this.addToggleControl(row, control);
      background.on('pointerdown', () => this.activateToggle(definition));
      return control;
    }

    if (definition.type === 'select') {
      this.addSelectControl(row, control);
      background.on('pointerdown', () => this.openSelect(control));
      return control;
    }

    if (definition.type === 'slider') {
      this.addSliderControl(row, control);
      return control;
    }

    return control;
  }

  private addToggleControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const enabled = control.definition.getToggleValue?.() === true;
    const track = this.scene.add.rectangle(0, 0, 54, 28, this.getToggleTrackColor(enabled), 1);
    const knob = this.scene.add.circle(enabled ? 13 : -13, 0, 11, UITheme.toggleKnobColor, 1);

    track.setStrokeStyle(1, UITheme.panelBorderColor, 0.5);
    track.setInteractive({ useHandCursor: true });
    knob.setInteractive({ useHandCursor: true });
    track.on('pointerdown', () => this.activateToggle(control.definition));
    knob.on('pointerdown', () => this.activateToggle(control.definition));
    row.add([track, knob]);
    control.track = track;
    control.knob = knob;
  }

  private addSelectControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const valueText = this.scene.add.text(0, 0, this.getDisplayValue(control.definition), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'right',
    });
    const arrow = this.scene.add.text(0, 0, 'v', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      fontStyle: 'bold',
    });

    valueText.setOrigin(1, 0.5);
    arrow.setOrigin(0, 0.5);
    valueText.setInteractive({ useHandCursor: true });
    arrow.setInteractive({ useHandCursor: true });
    valueText.on('pointerdown', () => this.openSelect(control));
    arrow.on('pointerdown', () => this.openSelect(control));
    row.add([valueText, arrow]);
    control.value = valueText;
    control.rightArrow = arrow;
  }

  private addSliderControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const track = this.scene.add.rectangle(0, 0, 160, 12, UITheme.panelBorderColor, 0.42);
    const knob = this.scene.add.circle(0, 0, 10, UITheme.toggleKnobColor, 1);
    const valueText = this.scene.add.text(0, 0, this.getDisplayValue(control.definition), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'right',
    });

    track.setStrokeStyle(1, UITheme.panelBorderColor, 0.6);
    track.setInteractive({ useHandCursor: true });
    knob.setInteractive({ draggable: true, useHandCursor: true });
    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.setSliderFromWorldX(control, pointer.x, true);
    });
    knob.on('dragstart', () => {
      this.activeDraggedSlider = control;
    });
    knob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      this.setSliderFromWorldX(control, dragX, false);
    });
    knob.on('dragend', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      if (this.activeDraggedSlider === control) {
        this.setSliderFromWorldX(control, dragX, true);
      }

      this.activeDraggedSlider = undefined;
    });
    row.add([valueText, track, knob]);
    control.value = valueText;
    control.track = track;
    control.knob = knob;
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

    const panelWidth = Math.min(220, Math.max(130, control.background.displayWidth * 0.62));
    const panelHeight = options.length * 34 + 8;
    const rowWidth = control.background.displayWidth;
    const rowWorld = this.getRowWorldPosition(control);
    const rowWorldLeft = rowWorld.x - rowWidth / 2;
    const rowTop = rowWorld.y - control.background.height / 2;
    const rowBottom = rowWorld.y + control.background.height / 2;
    const preferredY = rowBottom + 2;
    const belowFits = preferredY + panelHeight <= this.screenManager.height - 10;
    const dropdownY = belowFits ? preferredY : rowTop - panelHeight - 2;
    const dropdownLeft = Phaser.Math.Clamp(rowWorldLeft, 12, this.screenManager.width - panelWidth - 12);

    const overlayBg = this.scene.add.rectangle(0, 0, this.screenManager.width, this.screenManager.height, 0x000000, 0);
    overlayBg.setOrigin(0, 0);
    overlayBg.setScrollFactor(0);
    overlayBg.setInteractive({ useHandCursor: true });
    overlayBg.on('pointerdown', () => this.closeDropdown());
    layer.add(overlayBg);

    const panel = this.scene.add.rectangle(
      dropdownLeft + panelWidth / 2,
      dropdownY + panelHeight / 2,
      panelWidth,
      panelHeight,
      UITheme.panelBgColor,
      0.98,
    );
    panel.setStrokeStyle(1, UITheme.panelBorderColor, 0.9);
    panel.setScrollFactor(0);
    layer.add(panel);

    const divider = this.scene.add.rectangle(
      dropdownLeft + panelWidth / 2,
      dropdownY + 6,
      panelWidth - 16,
      1,
      UITheme.panelBorderColor,
      0.4,
    );
    divider.setOrigin(0.5, 0.5);
    divider.setScrollFactor(0);
    layer.add(divider);

    const rowValueHeight = 34;
    const optionLeft = dropdownLeft + 12;

    options.forEach((option, index) => {
      const optionY = dropdownY + 12 + index * rowValueHeight + 13;
      const optionBg = this.scene.add.rectangle(dropdownLeft + panelWidth / 2, optionY, panelWidth - 8, 28, UITheme.iconBgColor, 0.96);
      optionBg.setStrokeStyle(1, UITheme.panelBorderColor, 0.34);
      optionBg.setScrollFactor(0);
      optionBg.setInteractive({ useHandCursor: true });
      const optionText = this.scene.add.text(optionLeft, optionY, option.label, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
      });
      optionText.setOrigin(0, 0.5);
      optionText.setScrollFactor(0);
      optionText.setInteractive({ useHandCursor: true });
      if (option.value === control.definition.getValue?.()) {
        optionText.setColor(UITheme.successTextColor);
      }

      const selectOption = () => {
        control.definition.setValue?.(option.value);
        this.closeDropdown();
        this.afterSettingChanged();
      };
      optionBg.on('pointerdown', selectOption);
      optionText.on('pointerdown', selectOption);
      layer.add([optionBg, optionText]);
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
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: this.screenManager.isPortrait() ? 380 : 640,
      maxHeight: this.screenManager.isPortrait() ? 720 : 560,
      padding: 26,
    });
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const compact = this.screenManager.width <= 430 || this.screenManager.height <= 620;
    const tabWidth = compact ? 94 : 108;
    const tabHeight = compact ? 30 : 34;
    const tabGap = compact ? 6 : 8;
    const tabColumns = this.getTabColumns(panel.content.width, tabWidth, tabGap);
    const tabRows = Math.ceil(this.tabButtons.length / tabColumns);
    const tabTop = panel.content.y + 54;
    const tabAreaBottom = tabTop + tabRows * tabHeight + Math.max(0, tabRows - 1) * tabGap;
    const closeY = panel.y + panel.height - (compact ? 28 : 34);
    const contentTop = tabAreaBottom + (compact ? 12 : 18);
    const pagingAreaHeight = compact ? 28 : 32;
    const contentBottom = closeY - (compact ? 64 : 74);
    const rowGap = compact ? 7 : 9;
    const rowHeight = compact ? 38 : 42;
    const rowsPerPage = Math.max(1, Math.floor((contentBottom - contentTop + rowGap) / (rowHeight + rowGap)));
    const pageCount = Math.max(1, Math.ceil(this.rowControls.length / rowsPerPage));
    const currentPage = Math.min(this.getCurrentPage(), pageCount - 1);
    const pageStart = currentPage * rowsPerPage;
    const pageEnd = pageStart + rowsPerPage;
    this.pageByTab[this.selectedTab] = currentPage;
    const rowWidth = panel.content.width;

    this.background.setPosition(centerX, centerY);
    this.background.setSize(panel.width, panel.height);
    this.background.setFillStyle(UITheme.panelBgColor, UITheme.panelBgAlpha);
    this.background.setStrokeStyle(UITheme.panel.borderWidth, UITheme.panelBorderColor, 0.85);
    this.panelImage?.setPosition(centerX, centerY);
    this.panelImage?.setAlpha(UITheme.pausePanelAlpha);
    this.coverImage(this.panelImage, panel.width, panel.height);
    this.title.setPosition(centerX, panel.content.y + 24);
    this.title.setFontSize(fonts.header);
    this.title.setColor(UITheme.textColor);
    this.layoutTabs(panel.content.x, tabTop, tabColumns, tabWidth, tabHeight, tabGap);

    this.rowControls.forEach((row, index) => {
      if (index < pageStart || index >= pageEnd) {
        row.container.setVisible(false);
        return;
      }

      const visibleIndex = index - pageStart;
      row.container.setVisible(true);
      row.label.setText(row.definition.label);
      row.container.setPosition(panel.content.x + rowWidth / 2, contentTop + visibleIndex * (rowHeight + rowGap));
      row.background.setSize(rowWidth, rowHeight);
      row.label.setPosition(-rowWidth / 2 + 14, rowHeight / 2);
      row.label.setFontSize(row.definition.type === 'info' ? fonts.small : fonts.body);
      row.label.setWordWrapWidth(rowWidth - (row.definition.type === 'toggle' ? 110 : 250));

      row.value?.setVisible(row.definition.type === 'select' || row.definition.type === 'slider');
      row.leftArrow?.setVisible(false);
      row.rightArrow?.setVisible(row.definition.type === 'select');
      row.track?.setVisible(row.definition.type === 'toggle' || row.definition.type === 'slider');
      row.knob?.setVisible(row.definition.type === 'toggle' || row.definition.type === 'slider');

      if (row.definition.type === 'toggle') {
        this.layoutToggleRow(row, rowWidth, rowHeight);
      } else if (row.definition.type === 'select') {
        this.layoutSelectRow(row, rowWidth, rowHeight);
      } else if (row.definition.type === 'slider') {
        this.layoutSliderRow(row, rowWidth, rowHeight);
      }
    });

    this.layoutPagingControls(panel.content.x, closeY - pagingAreaHeight - 4, rowWidth, pageCount, currentPage, compact);

    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    this.closeButton.setPosition(centerX, closeY);
    this.closeButton.setFontSize(metrics.fontSize);
    this.closeButton.setFixedSize(metrics.width, metrics.height);
    this.closeButton.setColor(UITheme.textColor);
    this.closeButton.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
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
    const visible = pageCount > 1;
    const buttonWidth = compact ? 74 : 86;
    const buttonHeight = compact ? 24 : 28;
    const fontSize = compact ? '10px' : UITheme.smallFontSize;

    this.prevPageButton.setVisible(visible);
    this.nextPageButton.setVisible(visible);
    this.pageText.setVisible(visible);

    if (!visible) {
      return;
    }

    this.prevPageButton.setText(this.t('settings.previousPage', 'Prev'));
    this.nextPageButton.setText(this.t('settings.nextPage', 'Next'));
    this.pageText.setText(`${this.t('settings.page', 'Page')} ${currentPage + 1}/${pageCount}`);
    this.pageText.setPosition(left + width / 2, y);
    this.pageText.setFontSize(fontSize);
    this.pageText.setColor(UITheme.mutedTextColor);

    this.layoutPageButton(this.prevPageButton, left + buttonWidth / 2, y, buttonWidth, buttonHeight, fontSize, currentPage > 0);
    this.layoutPageButton(this.nextPageButton, left + width - buttonWidth / 2, y, buttonWidth, buttonHeight, fontSize, currentPage < pageCount - 1);
  }

  private layoutPageButton(
    button: Phaser.GameObjects.Text,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: string,
    enabled: boolean,
  ): void {
    button.setPosition(x, y);
    button.setFontSize(fontSize);
    button.setFixedSize(width, height);
    button.setColor(enabled ? UITheme.textColor : UITheme.mutedTextColor);
    button.setAlpha(enabled ? 1 : 0.45);
    button.setBackgroundColor(toCssColor(enabled ? UITheme.buttonBgColor : UITheme.iconBgColor));
  }

  private layoutTabs(
    left: number,
    top: number,
    columns: number,
    tabWidth: number,
    tabHeight: number,
    gap: number,
  ): void {
    this.tabButtons.forEach((tab, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const selected = tab.id === this.selectedTab;
      tab.background.setSize(tabWidth, tabHeight);
      tab.background.setFillStyle(selected ? UITheme.buttonHoverColor : UITheme.buttonBgColor, 0.95);
      tab.background.setStrokeStyle(2, selected ? UITheme.successAccentColor : UITheme.panelBorderColor, selected ? 1 : 0.75);
      tab.container.setPosition(
        left + tabWidth / 2 + column * (tabWidth + gap),
        top + tabHeight / 2 + row * (tabHeight + gap),
      );
      tab.label.setText(this.getTabLabel(tab.id));
      tab.label.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
      tab.label.setWordWrapWidth(tabWidth - 8);
    });
  }

  private layoutToggleRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    const enabled = row.definition.getToggleValue?.() === true;

    row.track?.setVisible(true);
    row.knob?.setVisible(true);
    row.track?.setPosition(rowWidth / 2 - 48, rowHeight / 2);
    row.track?.setSize(54, 28);
    row.track?.setFillStyle(this.getToggleTrackColor(enabled), 1);
    row.knob?.setPosition(rowWidth / 2 - 48 + (enabled ? 13 : -13), rowHeight / 2);
  }

  private layoutSelectRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    row.value?.setVisible(true);
    row.rightArrow?.setVisible(true);
    row.value?.setText(this.getDisplayValue(row.definition));
    row.value?.setPosition(rowWidth / 2 - 28, rowHeight / 2);
    row.rightArrow?.setPosition(rowWidth / 2 - 12, rowHeight / 2);
    row.value?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    row.rightArrow?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
  }

  private layoutSliderRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    const valueText = row.value;
    const steps = row.definition.sliderSteps ?? [];
    const trackWidth = Math.min(170, Math.max(120, rowWidth - 210));
    const trackRightLocal = rowWidth / 2 - 16;
    const trackLeftLocal = trackRightLocal - trackWidth;
    const trackCenterX = trackLeftLocal + trackWidth / 2;

    row.track?.setSize(trackWidth, 10);
    row.track?.setPosition(trackCenterX, rowHeight / 2);
    row.value?.setText(this.getDisplayValue(row.definition));
    row.value?.setPosition(trackLeftLocal - 8, rowHeight / 2);
    row.value?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    row.value?.setAlign('right');
    row.value?.setOrigin(1, 0.5);

    const numericValue = this.getNumericRowValue(row.definition);
    const currentIndex = this.getSliderStepIndex(row.definition, numericValue, steps);
    const knobX = trackLeftLocal + (currentIndex / Math.max(1, steps.length - 1)) * trackWidth;
    row.knob?.setPosition(knobX, rowHeight / 2);

    row.sliderTrackLeft = row.container.x + trackLeftLocal;
    row.sliderTrackRight = row.container.x + trackLeftLocal + trackWidth;

    row.track?.setInteractive({ useHandCursor: true });
  }

  private setSliderFromWorldX(
    row: RowControl,
    worldX: number,
    commit: boolean,
  ): void {
    const steps = row.definition.sliderSteps ?? [];
    if (steps.length === 0) {
      return;
    }

    const minX = row.sliderTrackLeft;
    const maxX = row.sliderTrackRight;
    if (minX === undefined || maxX === undefined) {
      return;
    }

    const clampedX = Phaser.Math.Clamp(worldX, minX, maxX);
    const trackWidth = Math.max(1, maxX - minX);
    const normalized = (clampedX - minX) / trackWidth;
    const raw = normalized * (steps.length - 1);
    const nearest = Phaser.Math.Clamp(Math.round(raw), 0, steps.length - 1);
    const value = steps[nearest]!;
    const knobX = minX + ((nearest / (steps.length - 1)) * trackWidth);
    if (row.knob) {
      row.knob.setX(knobX - row.container.x);
    }

    if (row.value) {
      row.value.setText(this.getDisplayValue(row.definition, value));
    }

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

  private getNumericRowValue(definition: SettingRowDefinition): number {
    const value = definition.getValue?.();

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    return 0;
  }

  private getTabColumns(panelWidth: number, tabWidth: number, gap: number): number {
    if (this.screenManager.isLandscape() && panelWidth >= SETTINGS_TABS.length * tabWidth) {
      return SETTINGS_TABS.length;
    }

    return Math.max(2, Math.min(3, Math.floor((panelWidth + gap) / (tabWidth + gap))));
  }

  private createCloseButton(): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.scene.scale.width, this.scene.scale.height);
    const button = this.scene.add.text(0, 0, this.t('settings.back', I18n.t('common.close')), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      align: 'center',
      fixedWidth: metrics.width,
      fixedHeight: metrics.height,
      padding: {
        x: 0,
        y: Math.max(0, Math.floor((metrics.height - 22) / 2)),
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    button.on('pointerdown', () => {
      AudioManager.playUi(this.scene, 'ui_click');
      this.onClose();
    });

    return button;
  }

  private createPageButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.scene.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
      fixedWidth: 86,
      fixedHeight: 28,
      padding: { x: 0, y: 5 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      if (button.alpha >= 1) {
        button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
      }
    });
    button.on('pointerout', () => {
      if (button.alpha >= 1) {
        button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
      }
    });
    button.on('pointerdown', () => {
      if (button.alpha < 1) {
        return;
      }

      AudioManager.playUi(this.scene, 'ui_click');
      onClick();
    });
    button.setVisible(false);
    return button;
  }

  private getCurrentPage(): number {
    return this.pageByTab[this.selectedTab] ?? 0;
  }

  private setCurrentPage(page: number): void {
    this.pageByTab[this.selectedTab] = Math.max(0, page);
    this.applyLayout();
  }

  private getRowsForTab(tabId: SettingsTabId): SettingRowDefinition[] {
    switch (tabId) {
      case 'audio':
        return this.getAudioRows();
      case 'display':
        return this.getDisplayRows();
      case 'input':
        return this.getInputRows();
      case 'developer':
        return this.getDeveloperRows();
      case 'gameplay':
      default:
        return this.getGameplayRows();
    }
  }

  private getGameplayRows(): SettingRowDefinition[] {
    const gameplay = SettingsManager.getGameplay();

    return [
      this.toggleRow('autoMovement', this.t('settings.autoMovement', 'Auto Movement'), gameplay.autoMovement, () => {
        SettingsManager.updateGameplay({ autoMovement: !SettingsManager.getGameplay().autoMovement });
      }),
      this.toggleRow('autoUpgrade', this.t('settings.autoUpgrade', 'Auto Upgrade'), gameplay.autoUpgrade, () => {
        SettingsManager.updateGameplay({ autoUpgrade: !SettingsManager.getGameplay().autoUpgrade });
      }),
      this.toggleRow('autoOpenTreasure', this.t('settings.autoOpenTreasure', 'Auto Open Treasure'), gameplay.autoOpenTreasure, () => {
        SettingsManager.updateGameplay({ autoOpenTreasure: !SettingsManager.getGameplay().autoOpenTreasure });
      }),
      this.toggleRow('fastMode', this.t('settings.fastMode', 'Fast Mode'), gameplay.fastMode, () => {
        SettingsManager.updateGameplay({ fastMode: !SettingsManager.getGameplay().fastMode });
      }),
      this.toggleRow('endlessMode', this.t('settings.endlessMode', 'Endless Mode'), gameplay.endlessMode, () => {
        SettingsManager.updateGameplay({ endlessMode: !SettingsManager.getGameplay().endlessMode });
      }),
    ];
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
      this.toggleRow('minimap', this.t('settings.minimap', 'Minimap'), display.showMinimap, () => {
        SettingsManager.updateDisplay({ showMinimap: !SettingsManager.getDisplay().showMinimap });
      }),
      this.toggleRow('damageNumbers', this.t('settings.damageNumbers', 'Damage Numbers'), display.showDamageNumbers, () => {
        SettingsManager.updateDisplay({ showDamageNumbers: !SettingsManager.getDisplay().showDamageNumbers });
      }),
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

  private getDeveloperRows(): SettingRowDefinition[] {
    const developer = SettingsManager.getDeveloper();

    return [
      this.toggleRow('debugPanel', this.t('settings.debugPanel', 'Debug Panel'), developer.showDebugPanel, () => {
        SettingsManager.updateDeveloper({
          showDebugPanel: !SettingsManager.getDeveloper().showDebugPanel,
        });
      }),
      this.toggleRow('csvLogging', this.t('settings.csvLogging', 'CSV Logging'), developer.csvLoggingEnabled, () => {
        SettingsManager.updateDeveloper({
          csvLoggingEnabled: !SettingsManager.getDeveloper().csvLoggingEnabled,
        });
      }),
      this.toggleRow('autoRestart', this.t('settings.autoRestart', 'Auto Restart'), developer.autoRestartEnabled, () => {
        SettingsManager.updateDeveloper({
          autoRestartEnabled: !SettingsManager.getDeveloper().autoRestartEnabled,
        });
      }),
      this.toggleRow('debugLogs', this.t('settings.debugLogs', 'Debug Logs'), developer.showDebugLogs, () => {
        SettingsManager.updateDeveloper({
          showDebugLogs: !SettingsManager.getDeveloper().showDebugLogs,
        });
      }),
      this.toggleRow('debugPanelCompact', this.t('settings.debugPanelCompact', 'Compact Debug Panel'), developer.debugPanelCompact, () => {
        SettingsManager.updateDeveloper({
          debugPanelCompact: !SettingsManager.getDeveloper().debugPanelCompact,
        });
      }),
      this.sliderRow(
        'debugPanelOpacity',
        this.t('settings.debugPanelOpacity', 'Debug Panel Opacity'),
        () => SettingsManager.getDeveloper().debugPanelOpacity,
        [0.35, 0.5, 0.75, 1],
        (value) => {
          SettingsManager.updateDeveloper({ debugPanelOpacity: value as number });
        },
        (value) => `${Math.round((value as number) * 100)}%`,
      ),
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

  private getToggleTrackColor(enabled: boolean): number {
    return enabled ? UITheme.toggleOnColor : UITheme.toggleOffColor;
  }

  private cycleDisplayQuality(_current: DisplayQuality, _direction: 1 | -1): void {
    const current = SettingsManager.getDisplay().displayQuality;
    const next = this.getNextValue(DISPLAY_QUALITIES, current);
    SettingsManager.updateDisplay({ displayQuality: next });
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

  private getNextValue<T extends string>(values: readonly T[], current: T): T {
    const currentIndex = values.indexOf(current);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % values.length;

    return values[nextIndex] ?? values[0];
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
      case 'developer':
        return 'Developer';
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

  private coverImage(
    image: Phaser.GameObjects.Image | undefined,
    width: number,
    height: number,
  ): void {
    if (!image) {
      return;
    }

    const frame = image.texture.get();
    image.setScale(Math.max(width / frame.width, height / frame.height));
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
