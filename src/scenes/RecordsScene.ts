import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { AchievementListPanel } from '../ui/AchievementListPanel';
import { UIActionBar } from '../ui/components/UIActionBar';
import { SceneHeader } from '../ui/components/SceneHeader';
import { UITabBar } from '../ui/components/UITabBar';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { RecordsPanel } from '../ui/RecordsPanel';
import { UnlocksPanel } from '../ui/UnlocksPanel';

type RecordsTab = 'achievements' | 'leaderboards' | 'unlocks';
type RecordsActionId = 'back';

export class RecordsScene extends Phaser.Scene {
  private screenManager?: ScreenManager;
  private recordsPanel?: RecordsPanel;
  private titleHeader?: SceneHeader;
  private tabBar?: UITabBar<RecordsTab>;
  private actionBar?: UIActionBar<RecordsActionId>;
  private activeTab: RecordsTab = 'achievements';
  private unsubscribeResize?: () => void;

  constructor() {
    super('RecordsScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);

    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('records.title'),
    });
    this.actionBar = new UIActionBar<RecordsActionId>(this, [
      { id: 'back', label: I18n.t('records.back'), onClick: () => this.scene.start('TitleScene') },
    ]);

    this.createOrUpdatePanel();
    this.applyLayout();
    this.renderActiveTab();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const safeMargin = tiny ? 10 : compact ? 14 : 18;
    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      tiny ? 24 : compact ? 30 : 38,
      Math.min(this.screenManager.width - 24, 760),
      { titleFontSize: fonts.title },
    );

    this.layoutTabs(compact, tiny, safeMargin);
    this.layoutActionBar(compact, tiny, safeMargin);

    this.createOrUpdatePanel();
  }

  private layoutTabs(compact: boolean, tiny: boolean, safeMargin: number): void {
    if (!this.screenManager) {
      return;
    }

    this.tabBar?.destroy();
    const tabWidth = Math.min(
      tiny ? 104 : compact ? 126 : 148,
      Math.max(82, (this.screenManager.width - safeMargin * 2 - 16) / (this.screenManager.isPortrait() ? 2 : 3)),
    );
    const tabHeight = tiny ? 28 : compact ? 30 : 34;
    const tabAreaWidth = Math.min(this.screenManager.width - safeMargin * 2, this.screenManager.isPortrait() ? 330 : 520);
    const tabY = this.screenManager.isPortrait() ? tiny ? 56 : compact ? 66 : 80 : compact ? 62 : 76;

    this.tabBar = new UITabBar(this, {
      x: this.screenManager.centerX,
      y: tabY,
      width: tabAreaWidth,
      items: [
        { id: 'achievements', label: I18n.t('records.achievements') },
        { id: 'leaderboards', label: I18n.t('records.leaderboards') },
        { id: 'unlocks', label: I18n.t('records.unlocks') },
      ],
      selectedId: this.activeTab,
      tabWidth,
      tabHeight,
      gap: tiny ? 5 : 7,
      onSelect: (id) => this.setActiveTab(id),
    });
  }

  private layoutActionBar(compact: boolean, tiny: boolean, safeMargin: number): void {
    if (!this.screenManager || !this.actionBar) {
      return;
    }

    this.actionBar.layout(
      this.screenManager,
      {
        x: safeMargin,
        y: this.getActionAreaTop(tiny, compact, safeMargin),
        width: this.screenManager.width - safeMargin * 2,
        height: this.getActionAreaHeight(tiny, compact),
      },
      {
        columns: 1,
        compact,
        minWidth: tiny ? 120 : 150,
        maxWidth: tiny ? 150 : compact ? 180 : 220,
        minHeight: tiny ? 26 : 30,
        maxHeight: tiny ? 28 : compact ? 32 : 38,
        fontSize: tiny ? '11px' : compact ? '12px' : '14px',
      },
    );
  }

  private createOrUpdatePanel(): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const tabBottom = (this.tabBar?.container.y ?? (compact ? 66 : 82)) + (this.tabBar?.height ?? 34);
    const actionTop = this.getActionAreaTop(tiny, compact, tiny ? 10 : compact ? 14 : 18);
    const topOffset = tabBottom + (tiny ? 10 : compact ? 12 : 16);
    const maxPanelHeight = Math.min(
      Math.max(160, actionTop - topOffset - (tiny ? 8 : 12)),
      this.screenManager.height * (this.screenManager.isPortrait() ? tiny ? 0.66 : 0.68 : 0.72),
    );
    const panelLayout = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: 760,
      maxHeight: maxPanelHeight,
      padding: 0,
    });
    const y = Math.max(topOffset, panelLayout.y);

    if (!this.recordsPanel) {
      this.recordsPanel = new RecordsPanel(
        this,
        panelLayout.x,
        y,
        panelLayout.width,
        panelLayout.height,
      );
      return;
    }

    this.recordsPanel.updateLayout(panelLayout.x, y, panelLayout.width, panelLayout.height);
  }

  private setActiveTab(tab: RecordsTab): void {
    this.activeTab = tab;
    this.renderActiveTab();
    this.refreshButtonStyles();
  }

  private renderActiveTab(): void {
    if (!this.recordsPanel) {
      return;
    }

    switch (this.activeTab) {
      case 'leaderboards':
        new LeaderboardPanel().render(this.recordsPanel);
        break;
      case 'unlocks':
        new UnlocksPanel().render(this.recordsPanel);
        break;
      case 'achievements':
      default:
        new AchievementListPanel().render(this.recordsPanel);
        break;
    }

    this.refreshButtonStyles();
  }

  private refreshButtonStyles(): void {
    this.tabBar?.setSelected(this.activeTab);
  }

  private getActionAreaTop(tiny: boolean, compact: boolean, margin: number): number {
    if (!this.screenManager) {
      return 0;
    }

    return this.screenManager.height - margin - this.getActionAreaHeight(tiny, compact);
  }

  private getActionAreaHeight(tiny: boolean, compact: boolean): number {
    if (this.screenManager?.isPortrait()) {
      return tiny ? 34 : compact ? 38 : 44;
    }

    return tiny ? 30 : compact ? 36 : 42;
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.tabBar?.destroy();
    this.tabBar = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
    this.recordsPanel?.destroy();
    this.recordsPanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
