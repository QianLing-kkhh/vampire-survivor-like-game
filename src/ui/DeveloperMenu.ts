import Phaser from 'phaser';

import { DeveloperLocalResetService } from '../developer/DeveloperLocalResetService';
import { I18n } from '../i18n/I18n';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SaveManager } from '../save/SaveManager';
import { SettingsManager } from '../settings/SettingsManager';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIButton } from './components/UIButton';
import { UIPager } from './components/UIPager';
import { UITabBar } from './components/UITabBar';
import {
  createModalBlocker,
  setRectangleHitArea,
} from './input/UIInteraction';
import { UITheme } from './UITheme';

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
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly pager: UIPager;
  private tabBar?: UITabBar<DeveloperTabId>;
  private readonly rows: UIButton[] = [];
  private selectedTab: DeveloperTabId = 'automation';
  private readonly pageByTab: Record<DeveloperTabId, number> = {
    automation: 0,
    tools: 0,
    data: 0,
    debug: 0,
  };
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
    this.pager = new UIPager(scene, {
      x: 0,
      y: 0,
      width: 420,
      compact: true,
      closeLabel: I18n.t('common.close'),
      onPageChanged: (page) => {
        this.pageByTab[this.selectedTab] = page;
        this.applyLayout();
      },
      onClose: () => this.destroy(),
    });
    this.container = scene.add.container(0, 0, [this.pager.container]);
    this.container.setDepth(1600);
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
    this.tabBar?.destroy();
    this.tabBar = undefined;
    if (options.notifyClose !== false) {
      this.config.onClose?.();
    }
    this.container.destroy(true);
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
      }, row.kind === 'toggle' && row.value?.() === true);
      this.rows.push(text);
      this.container.add(text.container);
    }
  }

  private getRows(): DeveloperRow[] {
    switch (this.selectedTab) {
      case 'tools':
        return [
          this.sceneRow('strategyEditor', 'strategyPanel.title', 'StrategyEditorScene'),
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

  private createTextButton(label: string, onClick: () => void, selected = false): UIButton {
    return new UIButton(this.scene, {
      x: 0,
      y: 0,
      label,
      size: 'medium',
      selected,
      onClick,
    });
  }

  private applyLayout(): void {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const portrait = this.screenManager.isPortrait();
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: portrait
        ? tiny ? 300 : 340
        : tiny ? 460 : compact ? 560 : 640,
      maxHeight: portrait
        ? tiny ? 500 : compact ? 540 : 580
        : tiny ? 340 : compact ? 390 : 440,
      padding: tiny ? 14 : compact ? 18 : 22,
    });
    const width = panel.width;
    const height = panel.height;
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const buttonHeight = tiny ? 30 : compact ? 34 : 38;
    const rowWidth = Math.min(tiny ? 194 : compact ? 218 : 246, width - 64);
    const fontSize = tiny ? '10px' : compact ? UITheme.smallButtonFontSize : '13px';

    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.frame?.destroy(true);
    this.header?.destroy();
    this.frame = PanelFrame.create(this.scene, {
      x: centerX,
      y: centerY,
      width,
      height,
      variant: 'modal',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: centerX,
      y: centerY - height / 2 + (tiny ? 24 : compact ? 28 : 32),
      width: Math.max(tiny ? 190 : 220, width - 60),
      title: I18n.t('developer.title'),
    });
    this.container.add(this.header);
    const tabWidth = Math.min(tiny ? 70 : compact ? 92 : 110, Math.max(64, (width - 52) / TABS.length));
    const tabHeight = tiny ? 24 : compact ? 27 : 30;
    const tabY = centerY - height / 2 + (tiny ? 58 : compact ? 68 : 74);
    this.renderTabBar(centerX, tabY, width - (tiny ? 38 : 54), tabWidth, tabHeight, tiny ? 4 : compact ? 5 : 6);

    const rowStartY = tabY + (tiny ? 38 : compact ? 44 : 50);
    const closeY = centerY + height / 2 - (tiny ? 24 : compact ? 28 : 32);
    const pagerY = closeY - (tiny || compact ? 36 : 40);
    const rowAreaBottom = pagerY - (tiny ? 18 : compact ? 20 : 24);
    const rowGap = tiny ? 4 : compact ? 5 : 6;
    const columns = portrait ? 1 : 2;
    const availableRows = Math.max(1, Math.floor((rowAreaBottom - rowStartY + rowGap) / (buttonHeight + rowGap)));
    const rowsPerPage = Math.max(1, availableRows * columns);
    const pageCount = Math.max(1, Math.ceil(this.rows.length / rowsPerPage));
    const currentPage = Phaser.Math.Clamp(this.pageByTab[this.selectedTab] ?? 0, 0, pageCount - 1);
    this.pageByTab[this.selectedTab] = currentPage;
    const pageStart = currentPage * rowsPerPage;
    const visibleRows = this.rows.slice(pageStart, pageStart + rowsPerPage);
    const pagerVisible = pageCount > 1;
    const rowAreaHeight = Math.max(buttonHeight, rowAreaBottom - rowStartY - (pagerVisible ? 38 : 0));
    const rowLayout = LayoutConfig.getActionGridLayout(this.screenManager, visibleRows.length, {
      area: {
        x: panel.content.x,
        y: rowStartY,
        width: panel.content.width,
        height: rowAreaHeight,
      },
      maxColumns: portrait ? 1 : 2,
      compact,
    });

    this.rows.forEach((row, index) => {
      const visibleIndex = index - pageStart;
      const visible = visibleIndex >= 0 && visibleIndex < visibleRows.length;
      row.setVisible(visible);

      if (!visible) {
        return;
      }

      const position = rowLayout.positions[visibleIndex];
      row.setPosition(position.x, position.y);
      row.setFontSize(fontSize);
      row.setSize(
        Math.min(rowWidth, rowLayout.width),
        Math.min(buttonHeight, rowLayout.height),
      );
    });
    this.pager.container.setVisible(true);
    this.pager.prevButton.container.setVisible(pagerVisible);
    this.pager.nextButton.container.setVisible(pagerVisible);
    this.pager.pageText.setVisible(pagerVisible);
    this.pager.setPosition(centerX, pagerY);
    this.pager.setSize(Math.min(panel.content.width, tiny ? 240 : compact ? 300 : 360), compact);
    this.pager.setPage(currentPage, pageCount);
  }

  private renderTabBar(
    x: number,
    y: number,
    width: number,
    tabWidth: number,
    tabHeight: number,
    gap: number,
  ): void {
    this.tabBar?.destroy();
    this.tabBar = new UITabBar(this.scene, {
      x,
      y,
      width,
      items: TABS.map((id) => ({
        id,
        label: I18n.t(`developer.tab.${id}`),
      })),
      selectedId: this.selectedTab,
      tabWidth,
      tabHeight,
      gap,
      onSelect: (tabId) => {
        this.selectedTab = tabId;
        this.pageByTab[tabId] = 0;
        this.resetAllLocalDataConfirm = false;
        this.resetAllLocalDataDone = false;
        this.renderRows();
        this.applyLayout();
      },
    });
    this.container.add(this.tabBar.container);
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
