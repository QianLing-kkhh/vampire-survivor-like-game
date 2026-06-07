import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { DeveloperLocalResetService } from '../developer/DeveloperLocalResetService';
import { I18n } from '../i18n/I18n';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { ScreenManager } from '../responsive/ScreenManager';
import { SaveManager } from '../save/SaveManager';
import { SettingsManager } from '../settings/SettingsManager';

import {
  createModalBlocker,
  setRectangleHitArea,
  setTextHitArea,
  stopPointerEvent,
} from './input/UIInteraction';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type DeveloperTabId = 'automation' | 'tools' | 'data' | 'debug';
type DeveloperRow = {
  id: string;
  label: string;
  kind: 'button' | 'toggle';
  value?: () => boolean;
  onClick: () => void;
};

export interface DeveloperMenuConfig {
  onClose?: () => void;
  onStartAutoTest?: () => void;
  onOpenScene?: (sceneKey: string) => void;
  currentCsv?: string;
}

const TABS: DeveloperTabId[] = ['automation', 'tools', 'data', 'debug'];

export class DeveloperMenu {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private readonly tabButtons: Array<{
    id: DeveloperTabId;
    background: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
  }> = [];
  private readonly rows: Phaser.GameObjects.Text[] = [];
  private selectedTab: DeveloperTabId = 'automation';
  private unsubscribeResize?: () => void;
  private destroyed = false;
  private resetAllLocalDataConfirm = false;
  private resetAllLocalDataDone = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: DeveloperMenuConfig = {},
  ) {
    this.screenManager = new ScreenManager(scene);
    this.blocker = createModalBlocker(scene, 1599);
    this.background = scene.add.rectangle(0, 0, 720, 460, UITheme.panelBgColor, 0.94);
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.86);
    this.title = scene.add.text(0, 0, I18n.t('developer.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);
    this.closeButton = this.createTextButton(I18n.t('common.close'), () => this.destroy());
    this.container = scene.add.container(0, 0, [
      this.background,
      this.title,
      this.closeButton,
    ]);
    this.container.setDepth(1600);
    this.createTabs();
    this.renderRows();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
  }

  destroy(options: { notifyClose?: boolean } = {}): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    if (options.notifyClose !== false) {
      this.config.onClose?.();
    }
    this.container.destroy(true);
  }

  private createTabs(): void {
    for (const tabId of TABS) {
      const background = this.scene.add.rectangle(0, 0, 126, 34, UITheme.buttonBgColor, 0.94);
      background.setStrokeStyle(1, UITheme.panelBorderColor, 0.75);
      background.setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(0, 0, I18n.t(`developer.tab.${tabId}`), {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        align: 'center',
      });
      label.setOrigin(0.5);
      background.on('pointerdown', (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        stopPointerEvent(event);
        AudioManager.playUi(this.scene, 'ui_click');
        this.selectedTab = tabId;
        this.resetAllLocalDataConfirm = false;
        this.resetAllLocalDataDone = false;
        this.renderRows();
        this.applyLayout();
      });
      this.tabButtons.push({ id: tabId, background, label });
      this.container.add([background, label]);
    }
  }

  private renderRows(): void {
    this.rows.forEach((row) => row.destroy());
    this.rows.length = 0;

    for (const row of this.getRows()) {
      const text = this.createTextButton(this.formatRowLabel(row), () => {
        if (row.id !== 'resetAllLocalData') {
          this.resetAllLocalDataConfirm = false;
          this.resetAllLocalDataDone = false;
        }
        row.onClick();
        if (this.destroyed || !this.scene.scene.isActive()) {
          return;
        }
        this.renderRows();
        this.applyLayout();
      });
      this.rows.push(text);
      this.container.add(text);
    }
  }

  private getRows(): DeveloperRow[] {
    switch (this.selectedTab) {
      case 'tools':
        return [
          this.sceneRow('customStageTool', 'title.customStageTool', 'CustomStageToolScene'),
          this.sceneRow('customStageEditor', 'customStage.editorTitle', 'CustomStageEditorLiteScene'),
          this.sceneRow('records', 'title.records', 'RecordsScene'),
          this.sceneRow('replayTool', 'title.replayTool', 'ReplayToolScene'),
          this.sceneRow('dailyChallenge', 'title.dailyChallenge', 'DailyChallengeScene'),
        ];
      case 'data':
        return [
          ...(this.config.currentCsv !== undefined ? [{
            id: 'downloadCurrentCsv',
            label: I18n.t('result.downloadCurrentCsv'),
            kind: 'button' as const,
            onClick: () => this.downloadCsv(this.createCsvFilename('playtest_current'), this.config.currentCsv ?? ''),
          }] : []),
          {
            id: 'downloadAllCsv',
            label: I18n.t('result.downloadAllCsv'),
            kind: 'button',
            onClick: () => this.downloadAllCsv(),
          },
        ];
      case 'debug':
        return this.getDebugRows();
      case 'automation':
      default:
        return this.getAutomationRows();
    }
  }

  private getAutomationRows(): DeveloperRow[] {
    const gameplay = SettingsManager.getGameplay();
    const developer = SettingsManager.getDeveloper();

    return [
      ...(this.config.onStartAutoTest ? [{
        id: 'startAutoTest',
        label: I18n.t('title.startAutoTest'),
        kind: 'button' as const,
        onClick: () => this.config.onStartAutoTest?.(),
      }] : []),
      this.toggleRow('autoMovement', I18n.t('settings.autoMovement'), gameplay.autoMovement, () => {
        SettingsManager.updateGameplay({ autoMovement: !SettingsManager.getGameplay().autoMovement });
      }),
      this.toggleRow('autoUpgrade', I18n.t('settings.autoUpgrade'), gameplay.autoUpgrade, () => {
        SettingsManager.updateGameplay({ autoUpgrade: !SettingsManager.getGameplay().autoUpgrade });
      }),
      this.toggleRow('autoOpenTreasure', I18n.t('settings.autoOpenTreasure'), gameplay.autoOpenTreasure, () => {
        SettingsManager.updateGameplay({ autoOpenTreasure: !SettingsManager.getGameplay().autoOpenTreasure });
      }),
      this.toggleRow('fastMode', I18n.t('settings.fastMode'), gameplay.fastMode, () => {
        SettingsManager.updateGameplay({ fastMode: !SettingsManager.getGameplay().fastMode });
      }),
      this.toggleRow('autoRestart', I18n.t('settings.autoRestart'), developer.autoRestartEnabled, () => {
        SettingsManager.updateDeveloper({ autoRestartEnabled: !SettingsManager.getDeveloper().autoRestartEnabled });
      }),
    ];
  }

  private getDebugRows(): DeveloperRow[] {
    const developer = SettingsManager.getDeveloper();

    return [
      this.toggleRow('debugPanel', I18n.t('settings.debugPanel'), developer.showDebugPanel, () => {
        SettingsManager.updateDeveloper({ showDebugPanel: !SettingsManager.getDeveloper().showDebugPanel });
      }),
      this.toggleRow('csvLogging', I18n.t('settings.csvLogging'), developer.csvLoggingEnabled, () => {
        SettingsManager.updateDeveloper({ csvLoggingEnabled: !SettingsManager.getDeveloper().csvLoggingEnabled });
      }),
      this.toggleRow('debugLogs', I18n.t('settings.debugLogs'), developer.showDebugLogs, () => {
        SettingsManager.updateDeveloper({ showDebugLogs: !SettingsManager.getDeveloper().showDebugLogs });
      }),
      this.toggleRow('debugPanelCompact', I18n.t('settings.debugPanelCompact'), developer.debugPanelCompact, () => {
        SettingsManager.updateDeveloper({ debugPanelCompact: !SettingsManager.getDeveloper().debugPanelCompact });
      }),
      {
        id: 'resetProgressionDefaults',
        label: I18n.t('developer.resetProgressionDefaults'),
        kind: 'button',
        onClick: () => SaveManager.resetProgressionUnlocksToDefaults(),
      },
      {
        id: 'resetAllLocalData',
        label: this.getResetAllLocalDataLabel(),
        kind: 'button',
        onClick: () => this.handleResetAllLocalData(),
      },
      {
        id: 'debugPanelOpacity',
        label: `${I18n.t('settings.debugPanelOpacity')} ${Math.round(developer.debugPanelOpacity * 100)}%`,
        kind: 'button',
        onClick: () => this.cycleDebugOpacity(),
      },
    ];
  }

  private toggleRow(id: string, label: string, value: boolean, onClick: () => void): DeveloperRow {
    return {
      id,
      label,
      kind: 'toggle',
      value: () => value,
      onClick,
    };
  }

  private sceneRow(id: string, labelKey: string, sceneKey: string): DeveloperRow {
    return {
      id,
      label: I18n.t(labelKey),
      kind: 'button',
      onClick: () => this.config.onOpenScene?.(sceneKey),
    };
  }

  private formatRowLabel(row: DeveloperRow): string {
    if (row.kind !== 'toggle') {
      return row.label;
    }

    return `${row.label}: ${row.value?.() ? I18n.t('common.on') : I18n.t('common.off')}`;
  }

  private createTextButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.scene.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      align: 'center',
      padding: { x: 12, y: 8 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor)));
    button.on('pointerout', () => button.setBackgroundColor(toCssColor(UITheme.buttonBgColor)));
    button.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this.scene, 'ui_click');
      onClick();
    });
    return button;
  }

  private applyLayout(): void {
    const safeMargin = Math.max(16, Math.min(this.screenManager.width, this.screenManager.height) * 0.04);
    const width = Math.min(760, this.screenManager.width - safeMargin * 2);
    const height = Math.min(520, this.screenManager.height - safeMargin * 2);
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);

    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.background.setPosition(centerX, centerY);
    this.background.setSize(width, height);
    this.title.setPosition(centerX, centerY - height / 2 + 34);
    this.closeButton.setPosition(centerX, centerY + height / 2 - 36);
    setTextHitArea(this.closeButton, metrics.width, metrics.height);

    const tabWidth = Math.min(132, Math.max(92, (width - 72) / TABS.length));
    const tabY = centerY - height / 2 + 82;
    const tabStartX = centerX - ((tabWidth + 8) * TABS.length - 8) / 2 + tabWidth / 2;

    this.tabButtons.forEach((tab, index) => {
      const selected = tab.id === this.selectedTab;
      const x = tabStartX + index * (tabWidth + 8);

      tab.background.setPosition(x, tabY);
      setRectangleHitArea(tab.background, tabWidth, 34);
      tab.background.setFillStyle(selected ? UITheme.buttonHoverColor : UITheme.buttonBgColor, 0.95);
      tab.background.setStrokeStyle(2, selected ? UITheme.successAccentColor : UITheme.panelBorderColor, 0.9);
      tab.label.setText(I18n.t(`developer.tab.${tab.id}`));
      tab.label.setPosition(x, tabY);
      tab.label.setWordWrapWidth(tabWidth - 8);
    });

    const rowStartY = tabY + 58;
    const rowGap = this.screenManager.isPortrait() ? 44 : 48;
    const rowWidth = Math.min(metrics.width, width - 90);

    this.rows.forEach((row, index) => {
      row.setPosition(centerX, rowStartY + index * rowGap);
      row.setFontSize(metrics.fontSize);
      setTextHitArea(row, rowWidth, metrics.height);
    });
  }

  private cycleDebugOpacity(): void {
    const values = [0.35, 0.5, 0.75, 1];
    const current = SettingsManager.getDeveloper().debugPanelOpacity;
    const currentIndex = values.findIndex((value) => value >= current);
    const next = values[(currentIndex + 1) % values.length];

    SettingsManager.updateDeveloper({ debugPanelOpacity: next });
  }

  private getResetAllLocalDataLabel(): string {
    if (this.resetAllLocalDataDone) {
      return I18n.t('developer.resetAllLocalDataDone');
    }

    if (this.resetAllLocalDataConfirm) {
      return I18n.t('developer.confirmResetAllLocalData');
    }

    return I18n.t('developer.resetAllLocalData');
  }

  private handleResetAllLocalData(): void {
    if (!this.resetAllLocalDataConfirm) {
      this.resetAllLocalDataConfirm = true;
      this.resetAllLocalDataDone = false;
      return;
    }

    DeveloperLocalResetService.resetAllLocalData();
    this.resetAllLocalDataConfirm = false;
    this.resetAllLocalDataDone = true;
  }

  private downloadAllCsv(): void {
    if (!PlaytestLogBuffer.hasRows()) {
      console.warn('No buffered playtest CSV rows to download');
      return;
    }

    this.downloadCsv(this.createCsvFilename('playtest_results'), PlaytestLogBuffer.getAllCsvWithHeader());
  }

  private downloadCsv(filename: string, csv: string): void {
    if (!csv) {
      console.warn('No playtest CSV rows to download');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private createCsvFilename(prefix: string): string {
    const stamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');

    return `${prefix}_${stamp}.csv`;
  }
}
