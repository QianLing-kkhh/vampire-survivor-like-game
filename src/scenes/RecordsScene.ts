import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { AchievementListPanel } from '../ui/AchievementListPanel';
import { LeaderboardPanel } from '../ui/LeaderboardPanel';
import { RecordsPanel } from '../ui/RecordsPanel';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';
import { UnlocksPanel } from '../ui/UnlocksPanel';

type RecordsTab = 'achievements' | 'leaderboards' | 'unlocks';

export class RecordsScene extends Phaser.Scene {
  private screenManager?: ScreenManager;
  private recordsPanel?: RecordsPanel;
  private titleText?: Phaser.GameObjects.Text;
  private achievementsButton?: Phaser.GameObjects.Text;
  private leaderboardsButton?: Phaser.GameObjects.Text;
  private unlocksButton?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private activeTab: RecordsTab = 'achievements';
  private unsubscribeResize?: () => void;

  constructor() {
    super('RecordsScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);

    this.titleText = this.add.text(
      this.screenManager.centerX,
      42,
      I18n.t('records.title'),
      {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.titleFontSize,
        fontStyle: 'bold',
      },
    );
    this.titleText.setOrigin(0.5);

    this.achievementsButton = this.createButton(I18n.t('records.achievements'), () => {
      this.setActiveTab('achievements');
    });
    this.leaderboardsButton = this.createButton(I18n.t('records.leaderboards'), () => {
      this.setActiveTab('leaderboards');
    });
    this.unlocksButton = this.createButton(I18n.t('records.unlocks'), () => {
      this.setActiveTab('unlocks');
    });
    this.backButton = this.createButton(I18n.t('records.back'), () => {
      this.scene.start('TitleScene');
    });

    this.createOrUpdatePanel();
    this.applyLayout();
    this.renderActiveTab();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private createButton(
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.scale.width, this.scale.height);
    const button = this.add.text(0, 0, label, {
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
      button.setBackgroundColor(toCssColor(
        this.isActiveButton(button) ? UITheme.buttonHoverColor : UITheme.buttonBgColor,
      ));
    });
    button.on('pointerdown', onClick);

    return button;
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    this.titleText?.setPosition(this.screenManager.centerX, 38);
    this.titleText?.setFontSize(fonts.title);

    const buttons = [
      this.achievementsButton,
      this.leaderboardsButton,
      this.unlocksButton,
      this.backButton,
    ].filter((button): button is Phaser.GameObjects.Text => button !== undefined);
    const tabLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: buttons.length,
      startY: this.screenManager.isPortrait() ? 98 : 92,
      mode: this.screenManager.isPortrait() ? 'vertical' : 'twoColumn',
      gap: this.screenManager.isPortrait() ? 42 : 44,
    });

    buttons.forEach((button, index) => {
      const position = tabLayout.positions[index];
      button.setFontSize(tabLayout.fontSize);
      button.setFixedSize(tabLayout.width, tabLayout.height);
      button.setPosition(position.x, position.y);
    });

    this.createOrUpdatePanel();
  }

  private createOrUpdatePanel(): void {
    if (!this.screenManager) {
      return;
    }

    const topOffset = this.screenManager.isPortrait() ? 282 : 170;
    const panelLayout = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: 760,
      maxHeight: Math.max(220, this.screenManager.height - topOffset - 28),
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
    const pairs: Array<[RecordsTab, Phaser.GameObjects.Text | undefined]> = [
      ['achievements', this.achievementsButton],
      ['leaderboards', this.leaderboardsButton],
      ['unlocks', this.unlocksButton],
    ];

    for (const [tab, button] of pairs) {
      button?.setBackgroundColor(toCssColor(
        tab === this.activeTab ? UITheme.buttonHoverColor : UITheme.buttonBgColor,
      ));
    }
  }

  private isActiveButton(button: Phaser.GameObjects.Text): boolean {
    return (this.activeTab === 'achievements' && button === this.achievementsButton)
      || (this.activeTab === 'leaderboards' && button === this.leaderboardsButton)
      || (this.activeTab === 'unlocks' && button === this.unlocksButton);
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.recordsPanel?.destroy();
    this.recordsPanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
