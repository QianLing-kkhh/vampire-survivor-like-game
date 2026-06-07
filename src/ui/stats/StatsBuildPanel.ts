import Phaser from 'phaser';

import { AssetKeyResolver } from '../../assets/AssetKeyResolver';
import { I18n } from '../../i18n/I18n';
import { SafeArea } from '../../responsive/SafeArea';
import { ScreenManager } from '../../responsive/ScreenManager';
import { UIButton } from '../components/UIButton';
import { UICard } from '../components/UICard';
import { UIIconFrame } from '../components/UIIconFrame';
import { PanelFrame } from '../components/PanelFrame';
import { PanelHeader } from '../components/PanelHeader';
import { UITabBar } from '../components/UITabBar';
import { UIBadge } from '../components/UIBadge';
import { createModalBlocker, setRectangleHitArea } from '../input/UIInteraction';
import { UITheme } from '../UITheme';

import {
  StatsBuildCard,
  StatsBuildSnapshot,
  StatsBuildStatLine,
  StatsBuildTabId,
} from './StatsBuildSnapshot';

interface StatsBuildPanelConfig {
  snapshot: StatsBuildSnapshot;
  onClose: () => void;
}

type StatsBuildPanelItem =
  | { type: 'row'; row: StatsBuildStatLine }
  | { type: 'card'; card: StatsBuildCard };

const TAB_IDS: StatsBuildTabId[] = [
  'overview',
  'attributes',
  'weapons',
  'passives',
  'relics',
  'status',
  'run',
];

export class StatsBuildPanel {
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private readonly container: Phaser.GameObjects.Container;
  private readonly screen: ScreenManager;
  private readonly contentContainer: Phaser.GameObjects.Container;
  private readonly footerContainer: Phaser.GameObjects.Container;
  private tabBar?: UITabBar<StatsBuildTabId>;
  private selectedTab: StatsBuildTabId = 'overview';
  private readonly pageByTab = new Map<StatsBuildTabId, number>();
  private layout = {
    width: 860,
    height: 560,
    contentY: -180,
    contentHeight: 340,
    contentWidth: 760,
  };

  constructor(private readonly scene: Phaser.Scene, private readonly config: StatsBuildPanelConfig) {
    this.screen = new ScreenManager(scene);
    this.blocker = createModalBlocker(scene, 2399);
    this.container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2);
    this.container.setDepth(2400);
    this.contentContainer = scene.add.container(0, 0);
    this.footerContainer = scene.add.container(0, 0);
    this.renderShell();
  }

  destroy(): void {
    this.tabBar?.destroy();
    this.blocker.destroy();
    this.container.destroy(true);
    this.screen.dispose();
  }

  private renderShell(): void {
    this.container.removeAll(true);
    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    this.contentContainer.removeAll(true);
    this.footerContainer.removeAll(true);
    setRectangleHitArea(this.blocker, this.screen.width, this.screen.height);

    this.layout = this.calculateLayout();
    const frame = PanelFrame.create(this.scene, {
      x: 0,
      y: 0,
      width: this.layout.width,
      height: this.layout.height,
      dim: true,
      variant: 'modal',
    });
    const header = PanelHeader.create(this.scene, {
      x: 0,
      y: -this.layout.height / 2 + 42,
      width: this.layout.width - 34,
      title: this.config.snapshot.title,
      subtitle: I18n.t('statsBuild.subtitle', {
        time: this.formatTime(this.config.snapshot.createdAtSeconds),
      }),
    });
    this.tabBar = new UITabBar(this.scene, {
      x: 0,
      y: -this.layout.height / 2 + 82,
      width: this.layout.width - 52,
      items: TAB_IDS.map((id) => ({
        id,
        label: I18n.t(`statsBuild.tab.${id}`),
      })),
      selectedId: this.selectedTab,
      tabWidth: this.screen.isPortrait() ? 86 : 112,
      tabHeight: this.screen.isPortrait() ? 30 : 34,
      gap: this.screen.isPortrait() ? 5 : 7,
      onSelect: (tabId) => {
        this.selectedTab = tabId;
        this.tabBar?.setSelected(tabId);
        this.renderContent();
      },
    });
    this.layout.contentY = -this.layout.height / 2 + 92 + this.tabBar.height + 18;
    this.layout.contentHeight = this.layout.height / 2 - 58 - this.layout.contentY;
    this.layout.contentWidth = this.layout.width - 88;
    this.container.add([frame, header, this.tabBar.container, this.contentContainer, this.footerContainer]);
    this.renderContent();
  }

  private renderContent(): void {
    this.contentContainer.removeAll(true);
    this.footerContainer.removeAll(true);

    const pages = this.paginate(this.getItemsForTab(this.selectedTab), this.layout.contentHeight);
    const totalPages = Math.max(1, pages.length);
    const currentPage = Math.min(this.pageByTab.get(this.selectedTab) ?? 0, totalPages - 1);
    this.pageByTab.set(this.selectedTab, currentPage);
    const items = pages[currentPage] ?? [];
    let y = this.layout.contentY;

    if (items.length === 0) {
      this.renderEmpty(y);
    } else {
      for (const item of items) {
        if (item.type === 'row') {
          this.renderRow(item.row, y);
          y += this.getItemHeight(item);
        } else {
          this.renderCard(item.card, y);
          y += this.getItemHeight(item);
        }
      }
    }

    this.renderFooter(currentPage, totalPages);
  }

  private renderRow(row: StatsBuildStatLine, y: number): void {
    const width = this.layout.contentWidth;
    const background = this.scene.add.rectangle(
      0,
      y + 14,
      width,
      28,
      UITheme.colors.panelInner,
      0.58,
    );
    const label = this.scene.add.text(-width / 2 + 12, y + 4, row.label, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.screen.isPortrait() ? '13px' : '14px',
      fontStyle: 'bold',
      wordWrap: { width: width * 0.42 },
    });
    const value = this.scene.add.text(-width / 2 + width * 0.48, y + 4, row.value, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.screen.isPortrait() ? '13px' : '14px',
      wordWrap: { width: width * 0.48 },
    });
    this.contentContainer.add([background, label, value]);
  }

  private renderCard(card: StatsBuildCard, y: number): void {
    const width = this.layout.contentWidth;
    const height = this.getCardHeight(card);
    const cardUi = new UICard(this.scene, {
      x: 0,
      y: y + height / 2,
      width,
      height,
    });
    const icon = UIIconFrame.create(this.scene, {
      x: -width / 2 + 36,
      y: y + 36,
      size: 48,
      textureKey: this.resolveCardIconKey(card),
      fallback: card.fallback,
    });
    const title = this.scene.add.text(-width / 2 + 74, y + 14, card.title, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '16px',
      fontStyle: 'bold',
      wordWrap: { width: width - 156 },
    });
    const subtitle = this.scene.add.text(-width / 2 + 74, y + 38, card.subtitle ?? '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
      wordWrap: { width: width - 156 },
    });
    this.contentContainer.add([cardUi.container, icon, title, subtitle]);

    let badgeX = width / 2 - 20;
    for (const badgeLabel of card.badges ?? []) {
      const badge = UIBadge.create(this.scene, badgeX, y + 24, badgeLabel);
      badge.setScale(0.9);
      badgeX -= Math.max(64, badgeLabel.length * 8 + 16);
      this.contentContainer.add(badge);
    }

    let rowY = y + 70;
    if (card.description) {
      const description = this.scene.add.text(-width / 2 + 18, rowY, card.description, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '12px',
        wordWrap: { width: width - 36 },
      });
      this.contentContainer.add(description);
      rowY += Math.max(22, description.height + 8);
    }

    for (const row of card.rows) {
      const label = this.scene.add.text(-width / 2 + 18, rowY, row.label, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '12px',
        fontStyle: 'bold',
        wordWrap: { width: width * 0.34 },
      });
      const value = this.scene.add.text(-width / 2 + width * 0.42, rowY, row.value, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '12px',
        wordWrap: { width: width * 0.52 },
      });
      this.contentContainer.add([label, value]);
      rowY += Math.max(22, label.height, value.height);
    }

    if (card.relatedIcons?.length) {
      let iconX = -width / 2 + 22;
      const iconY = y + height - 26;
      for (const related of card.relatedIcons.slice(0, 6)) {
        const relatedIcon = UIIconFrame.create(this.scene, {
          x: iconX + 16,
          y: iconY,
          size: 32,
          textureKey: this.resolveRelatedIconKey(related),
          fallback: related.fallback,
        });
        this.contentContainer.add(relatedIcon);
        iconX += 38;
      }
    }
  }

  private renderEmpty(y: number): void {
    const text = this.scene.add.text(0, y + 32, I18n.t('statsBuild.empty'), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '16px',
      align: 'center',
    });
    text.setOrigin(0.5);
    this.contentContainer.add(text);
  }

  private resolveCardIconKey(card: StatsBuildCard): string | undefined {
    if (this.selectedTab === 'weapons') {
      return AssetKeyResolver.getWeaponIconKey(this.scene, card.id)
        ?? card.iconKey;
    }

    if (this.selectedTab === 'passives') {
      return AssetKeyResolver.getPassiveIconKey(this.scene, card.id)
        ?? card.iconKey;
    }

    return card.iconKey;
  }

  private resolveRelatedIconKey(related: { id: string; iconKey?: string }): string | undefined {
    if (this.selectedTab === 'weapons') {
      return AssetKeyResolver.getPassiveIconKey(this.scene, related.id)
        ?? related.iconKey;
    }

    if (this.selectedTab === 'passives') {
      return AssetKeyResolver.getWeaponIconKey(this.scene, related.id)
        ?? related.iconKey;
    }

    return related.iconKey;
  }

  private renderFooter(currentPage: number, totalPages: number): void {
    const y = this.layout.height / 2 - 32;
    const buttonWidth = this.screen.isPortrait() ? 110 : 132;
    const prev = new UIButton(this.scene, {
      x: -this.layout.width / 2 + buttonWidth / 2 + 44,
      y,
      width: buttonWidth,
      height: 36,
      size: 'small',
      label: I18n.t('settings.previousPage'),
      disabled: currentPage <= 0,
      onClick: () => {
        this.pageByTab.set(this.selectedTab, Math.max(0, currentPage - 1));
        this.renderContent();
      },
    });
    const next = new UIButton(this.scene, {
      x: this.layout.width / 2 - buttonWidth / 2 - 44,
      y,
      width: buttonWidth,
      height: 36,
      size: 'small',
      label: I18n.t('settings.nextPage'),
      disabled: currentPage >= totalPages - 1,
      onClick: () => {
        this.pageByTab.set(this.selectedTab, Math.min(totalPages - 1, currentPage + 1));
        this.renderContent();
      },
    });
    const close = new UIButton(this.scene, {
      x: 0,
      y,
      width: this.screen.isPortrait() ? 144 : 180,
      height: 40,
      size: 'medium',
      label: I18n.t('common.close'),
      onClick: () => this.config.onClose(),
    });
    const pageText = this.scene.add.text(0, y - 34, I18n.t('statsBuild.page', {
      page: currentPage + 1,
      total: totalPages,
    }), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
      align: 'center',
    });
    pageText.setOrigin(0.5);
    this.footerContainer.add([prev.container, next.container, close.container, pageText]);
  }

  private getItemsForTab(tabId: StatsBuildTabId): StatsBuildPanelItem[] {
    switch (tabId) {
      case 'overview':
        return this.config.snapshot.overview.map((row) => ({ type: 'row', row }));
      case 'attributes':
        return this.config.snapshot.attributes.map((row) => ({ type: 'row', row }));
      case 'weapons':
        return this.config.snapshot.weapons.map((card) => ({ type: 'card', card }));
      case 'passives':
        return this.config.snapshot.passives.map((card) => ({ type: 'card', card }));
      case 'relics':
        return this.config.snapshot.relics.map((card) => ({ type: 'card', card }));
      case 'status':
        return this.config.snapshot.status.map((card) => ({ type: 'card', card }));
      case 'run':
        return this.config.snapshot.run.map((row) => ({ type: 'row', row }));
      default:
        return [];
    }
  }

  private paginate(items: StatsBuildPanelItem[], maxHeight: number): StatsBuildPanelItem[][] {
    const pages: StatsBuildPanelItem[][] = [];
    let page: StatsBuildPanelItem[] = [];
    let usedHeight = 0;

    for (const item of items) {
      const itemHeight = this.getItemHeight(item);
      if (page.length > 0 && usedHeight + itemHeight > maxHeight) {
        pages.push(page);
        page = [];
        usedHeight = 0;
      }
      page.push(item);
      usedHeight += itemHeight;
    }

    if (page.length > 0) {
      pages.push(page);
    }

    return pages;
  }

  private getItemHeight(item: StatsBuildPanelItem): number {
    if (item.type === 'row') {
      return 34;
    }

    return this.getCardHeight(item.card) + 10;
  }

  private getCardHeight(card: StatsBuildCard): number {
    const descriptionHeight = card.description ? 42 : 0;
    const relatedHeight = card.relatedIcons?.length ? 36 : 0;
    return Math.max(106, 78 + descriptionHeight + card.rows.length * 23 + relatedHeight);
  }

  private calculateLayout(): typeof this.layout {
    const safe = SafeArea.getInsets(this.screen);
    const availableWidth = this.screen.width - safe.left - safe.right;
    const availableHeight = this.screen.height - safe.top - safe.bottom;
    const isPortrait = this.screen.isPortrait();
    const width = isPortrait
      ? Math.min(availableWidth * 0.96, 720)
      : Math.min(availableWidth * 0.78, 1080);
    const height = isPortrait
      ? Math.min(availableHeight * 0.9, 760)
      : Math.min(availableHeight * 0.82, 640);

    return {
      width,
      height,
      contentY: -height / 2 + 140,
      contentHeight: height - 220,
      contentWidth: width - 88,
    };
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(timeSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
