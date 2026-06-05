import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { ASSET_STYLES, AssetStyle, DISPLAY_QUALITIES, DisplayQuality } from '../visual/DisplayQuality';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type SettingsMenuHandler = () => void;
type SettingsTabId = 'gameplay' | 'audio' | 'display' | 'input' | 'developer';
type RowType = 'toggle' | 'cycle' | 'info';

interface SettingRowDefinition {
  id: string;
  label: string;
  type: RowType;
  getToggleValue?: () => boolean;
  getDisplayValue?: () => string;
  onToggle?: () => void;
  onCycleNext?: () => void;
  onCyclePrev?: () => void;
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
  track?: Phaser.GameObjects.Rectangle;
  knob?: Phaser.GameObjects.Arc;
  leftArrow?: Phaser.GameObjects.Text;
  rightArrow?: Phaser.GameObjects.Text;
  definition: SettingRowDefinition;
}

const SETTINGS_TABS: SettingsTabId[] = ['gameplay', 'audio', 'display', 'input', 'developer'];

export class SettingsMenu {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private readonly tabButtons: TabButton[] = [];
  private readonly rowControls: RowControl[] = [];
  private selectedTab: SettingsTabId = 'gameplay';
  private unsubscribeResize?: () => void;

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
    this.container.add([
      this.background,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
      this.closeButton,
    ]);
    this.createTabs();
    this.renderRows();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
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
        this.selectedTab = tabId;
        this.renderRows();
        this.applyLayout();
      });
      this.tabButtons.push({ id: tabId, container: tab, background, label });
      this.container.add(tab);
    }
  }

  private renderRows(): void {
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
    background.setInteractive({ useHandCursor: true });
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

    if (definition.type === 'cycle') {
      this.addCycleControl(row, control);
      background.on('pointerdown', () => this.activateCycleNext(definition));
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

  private addCycleControl(row: Phaser.GameObjects.Container, control: RowControl): void {
    const leftArrow = this.scene.add.text(0, 0, '<', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      fontStyle: 'bold',
    });
    const value = this.scene.add.text(0, 0, control.definition.getDisplayValue?.() ?? '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
    });
    const rightArrow = this.scene.add.text(0, 0, '>', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      fontStyle: 'bold',
    });

    for (const arrow of [leftArrow, rightArrow]) {
      arrow.setOrigin(0.5);
      arrow.setInteractive({ useHandCursor: true });
    }

    value.setOrigin(0.5);
    value.setInteractive({ useHandCursor: true });
    leftArrow.on('pointerdown', () => this.activateCyclePrev(control.definition));
    value.on('pointerdown', () => this.activateCycleNext(control.definition));
    rightArrow.on('pointerdown', () => this.activateCycleNext(control.definition));
    row.add([leftArrow, value, rightArrow]);
    control.leftArrow = leftArrow;
    control.value = value;
    control.rightArrow = rightArrow;
  }

  private activateToggle(definition: SettingRowDefinition): void {
    definition.onToggle?.();
    this.afterSettingChanged();
  }

  private activateCycleNext(definition: SettingRowDefinition): void {
    definition.onCycleNext?.();
    this.afterSettingChanged();
  }

  private activateCyclePrev(definition: SettingRowDefinition): void {
    definition.onCyclePrev?.();
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
    const contentBottom = closeY - (compact ? 34 : 42);
    const rowGap = compact ? 7 : 9;
    const rowHeight = compact ? 38 : 42;
    const maxRows = Math.max(1, Math.floor((contentBottom - contentTop + rowGap) / (rowHeight + rowGap)));
    const visibleRows = this.rowControls.slice(0, maxRows);
    const hiddenRows = Math.max(0, this.rowControls.length - visibleRows.length);
    const rowWidth = panel.content.width;

    this.background.setPosition(centerX, centerY);
    this.background.setSize(panel.width, panel.height);
    this.panelImage?.setPosition(centerX, centerY);
    this.coverImage(this.panelImage, panel.width, panel.height);
    this.title.setPosition(centerX, panel.content.y + 24);
    this.title.setFontSize(fonts.header);
    this.layoutTabs(panel.content.x, tabTop, tabColumns, tabWidth, tabHeight, tabGap);

    this.rowControls.forEach((row, index) => {
      if (index >= maxRows) {
        row.container.setVisible(false);
        return;
      }

      row.container.setVisible(true);
      row.label.setText(row.definition.label);
      row.container.setPosition(panel.content.x + rowWidth / 2, contentTop + index * (rowHeight + rowGap));
      row.background.setSize(rowWidth, rowHeight);
      row.label.setPosition(-rowWidth / 2 + 14, rowHeight / 2);
      row.label.setFontSize(row.definition.type === 'info' ? fonts.small : fonts.body);
      row.label.setWordWrapWidth(rowWidth - (row.definition.type === 'toggle' ? 96 : 178));
      row.track?.setVisible(row.definition.type === 'toggle');
      row.knob?.setVisible(row.definition.type === 'toggle');
      row.value?.setVisible(row.definition.type === 'cycle');
      row.leftArrow?.setVisible(row.definition.type === 'cycle');
      row.rightArrow?.setVisible(row.definition.type === 'cycle');

      if (row.definition.type === 'toggle') {
        this.layoutToggleRow(row, rowWidth, rowHeight);
      } else if (row.definition.type === 'cycle') {
        this.layoutCycleRow(row, rowWidth, rowHeight);
      }
    });

    if (hiddenRows > 0 && visibleRows.length > 0) {
      const lastRow = visibleRows[visibleRows.length - 1];
      lastRow.label.setText(`+${hiddenRows} more`);
      lastRow.label.setPosition(-rowWidth / 2 + 14, rowHeight / 2);
      lastRow.track?.setVisible(false);
      lastRow.knob?.setVisible(false);
      lastRow.value?.setVisible(false);
      lastRow.leftArrow?.setVisible(false);
      lastRow.rightArrow?.setVisible(false);
    }

    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    this.closeButton.setPosition(centerX, closeY);
    this.closeButton.setFontSize(metrics.fontSize);
    this.closeButton.setFixedSize(metrics.width, metrics.height);
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

  private layoutCycleRow(row: RowControl, rowWidth: number, rowHeight: number): void {
    row.leftArrow?.setVisible(true);
    row.value?.setVisible(true);
    row.rightArrow?.setVisible(true);
    row.value?.setText(row.definition.getDisplayValue?.() ?? '');
    row.leftArrow?.setPosition(rowWidth / 2 - 138, rowHeight / 2);
    row.value?.setPosition(rowWidth / 2 - 78, rowHeight / 2);
    row.value?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    row.value?.setFixedSize(92, rowHeight);
    row.rightArrow?.setPosition(rowWidth / 2 - 16, rowHeight / 2);
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
      this.volumeRow('bgmVolume', this.t('settings.bgmVolume', 'BGM Volume'), 'bgm'),
      this.volumeRow('sfxVolume', this.t('settings.sfxVolume', 'SFX Volume'), 'sfx'),
      this.volumeRow('weaponVolume', this.t('settings.weaponVolume', 'Weapon Volume'), 'weapon'),
      this.volumeRow('uiVolume', this.t('settings.uiVolume', 'UI Volume'), 'ui'),
    ];
  }

  private getDisplayRows(): SettingRowDefinition[] {
    const display = SettingsManager.getDisplay();
    const rows: SettingRowDefinition[] = [
      {
        id: 'graphicsQuality',
        label: this.t('settings.graphicsQuality', 'Graphics Quality'),
        type: 'cycle',
        getDisplayValue: () => this.formatDisplayQuality(SettingsManager.getDisplay().displayQuality),
        onCycleNext: () => this.cycleDisplayQuality(SettingsManager.getDisplay().displayQuality, 1),
        onCyclePrev: () => this.cycleDisplayQuality(SettingsManager.getDisplay().displayQuality, -1),
      },
      {
        id: 'assetStyle',
        label: this.t('settings.assetStyle', 'Asset Style'),
        type: 'cycle',
        getDisplayValue: () => this.formatAssetStyle(SettingsManager.getDisplay().assetStyle),
        onCycleNext: () => this.cycleAssetStyle(SettingsManager.getDisplay().assetStyle, 1),
        onCyclePrev: () => this.cycleAssetStyle(SettingsManager.getDisplay().assetStyle, -1),
      },
      this.numberCycleRow(
        'modelScale',
        this.t('settings.modelScale', 'Model Scale'),
        () => SettingsManager.getDisplay().visualModelScale,
        [1, 1.5, 2],
        (value) => SettingsManager.updateDisplay({
          visualModelScale: value === 1.5 || value === 2 ? value : 1,
        }),
        (value) => `${value}x`,
      ),
      this.toggleRow('shadows', this.t('settings.shadows', 'Shadows'), display.shadowsEnabled, () => {
        SettingsManager.updateDisplay({ shadowsEnabled: !SettingsManager.getDisplay().shadowsEnabled });
      }),
      this.toggleRow('damageNumbers', this.t('settings.damageNumbers', 'Damage Numbers'), display.showDamageNumbers, () => {
        SettingsManager.updateDisplay({ showDamageNumbers: !SettingsManager.getDisplay().showDamageNumbers });
      }),
      this.toggleRow('minimap', this.t('settings.minimap', 'Minimap'), display.showMinimap, () => {
        SettingsManager.updateDisplay({ showMinimap: !SettingsManager.getDisplay().showMinimap });
      }),
      this.toggleRow('debugOverlay', this.t('settings.debugOverlay', 'Debug Overlay'), display.showDebugOverlay, () => {
        SettingsManager.updateDisplay({ showDebugOverlay: !SettingsManager.getDisplay().showDebugOverlay });
      }),
      {
        id: 'language',
        label: this.t('settings.language', I18n.t('common.language')),
        type: 'cycle',
        getDisplayValue: () => I18n.getLocaleDisplayName(),
        onCycleNext: () => I18n.cycleLocale(),
        onCyclePrev: () => I18n.cycleLocale(),
      },
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
      this.numberCycleRow(
        'joystickSize',
        this.t('settings.joystickSize', 'Joystick Size'),
        () => SettingsManager.getInput().virtualJoystickSize,
        [0.75, 1, 1.25, 1.5],
        (value) => SettingsManager.updateInput({ virtualJoystickSize: value }),
      ),
      this.numberCycleRow(
        'joystickOpacity',
        this.t('settings.joystickOpacity', 'Joystick Opacity'),
        () => SettingsManager.getInput().virtualJoystickOpacity,
        [0.35, 0.5, 0.6, 0.75, 1],
        (value) => SettingsManager.updateInput({ virtualJoystickOpacity: value }),
        (value) => `${Math.round(value * 100)}%`,
      ),
      this.toggleRow('leftHandedMode', this.t('settings.leftHandedMode', 'Left Handed'), input.leftHandedMode, () => {
        SettingsManager.updateInput({ leftHandedMode: !SettingsManager.getInput().leftHandedMode });
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
      this.numberCycleRow(
        'debugPanelOpacity',
        this.t('settings.debugPanelOpacity', 'Debug Panel Opacity'),
        () => SettingsManager.getDeveloper().debugPanelOpacity,
        [0.35, 0.5, 0.75, 1],
        (value) => SettingsManager.updateDeveloper({ debugPanelOpacity: value }),
        (value) => `${Math.round(value * 100)}%`,
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

  private volumeRow(id: string, label: string, channel: 'bgm' | 'sfx' | 'weapon' | 'ui'): SettingRowDefinition {
    return {
      id,
      label,
      type: 'cycle',
      getDisplayValue: () => this.formatVolume(AudioManager.getChannelVolume(channel)),
      onCycleNext: () => this.cycleVolume(channel, 1),
      onCyclePrev: () => this.cycleVolume(channel, -1),
    };
  }

  private numberCycleRow(
    id: string,
    label: string,
    getValue: () => number,
    steps: number[],
    setValue: (value: number) => void,
    formatValue: (value: number) => string = (value) => value.toFixed(2).replace(/\.?0+$/, ''),
  ): SettingRowDefinition {
    const cycle = (direction: 1 | -1): void => {
      const current = getValue();
      const currentIndex = steps.findIndex((step) => Math.abs(step - current) < 0.01);
      const nextIndex = currentIndex < 0
        ? 0
        : (currentIndex + direction + steps.length) % steps.length;

      setValue(steps[nextIndex]);
    };

    return {
      id,
      label,
      type: 'cycle',
      getDisplayValue: () => formatValue(getValue()),
      onCycleNext: () => cycle(1),
      onCyclePrev: () => cycle(-1),
    };
  }

  private getToggleTrackColor(enabled: boolean): number {
    return enabled ? UITheme.toggleOnColor : UITheme.toggleOffColor;
  }

  private cycleDisplayQuality(current: DisplayQuality, direction: 1 | -1): void {
    SettingsManager.updateDisplay({
      displayQuality: this.getNextValue(DISPLAY_QUALITIES, current, direction),
    });
  }

  private cycleAssetStyle(current: AssetStyle, direction: 1 | -1): void {
    SettingsManager.updateDisplay({
      assetStyle: this.getNextValue(ASSET_STYLES, current, direction),
    });
  }

  private cycleVolume(channel: 'bgm' | 'sfx' | 'weapon' | 'ui', direction: 1 | -1): void {
    const currentVolume = AudioManager.getChannelVolume(channel);
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const currentIndex = steps.findIndex((step) => Math.abs(step - currentVolume) < 0.01);
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + steps.length) % steps.length;

    AudioManager.setChannelVolume(channel, steps[nextIndex]);
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

  private formatVolume(volume: number): string {
    return `${Math.round(volume * 100)}%`;
  }

  private getNextValue<T extends string>(values: readonly T[], current: T, direction: 1 | -1): T {
    const currentIndex = values.indexOf(current);
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + values.length) % values.length;

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
