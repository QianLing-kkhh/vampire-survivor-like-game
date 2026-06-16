import Phaser from 'phaser';

import { AssetKeyResolver } from '../../assets/AssetKeyResolver';
import { I18n } from '../../i18n/I18n';
import { LayoutConfig } from '../../responsive/LayoutConfig';
import { SafeArea } from '../../responsive/SafeArea';
import { ScreenManager } from '../../responsive/ScreenManager';
import { UIButton } from '../components/UIButton';
import { UICard } from '../components/UICard';
import { UIIconFrame } from '../components/UIIconFrame';
import { UIPager } from '../components/UIPager';
import { UIStatRow } from '../components/UIStatRow';
import { PanelFrame } from '../components/PanelFrame';
import { PanelHeader } from '../components/PanelHeader';
import { UITabBar } from '../components/UITabBar';
import { UIBadge } from '../components/UIBadge';
import { UITextBlock } from '../components/UITextBlock';
import { createModalBlocker, setRectangleHitArea } from '../input/UIInteraction';
import { IconTooltipData } from '../tooltip/IconTooltipTypes';
import { UITheme } from '../UITheme';

import {
  StatsBuildCard,
  StatsBuildIconRef,
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
      y: -this.layout.height / 2 + this.getHeaderOffsetY(),
      width: this.layout.width - 34,
      title: this.config.snapshot.title,
      subtitle: I18n.t('statsBuild.subtitle', {
        time: this.formatTime(this.config.snapshot.createdAtSeconds),
      }),
      titleFontSize: this.getTitleFontSize(),
      subtitleFontSize: this.getSmallFontSize(),
    });
    const tabMetrics = this.getTabMetrics();
    this.tabBar = new UITabBar(this.scene, {
      x: 0,
      y: -this.layout.height / 2 + tabMetrics.y,
      width: this.layout.width - 52,
      items: TAB_IDS.map((id) => ({
        id,
        label: I18n.t(`statsBuild.tab.${id}`),
      })),
      selectedId: this.selectedTab,
      tabWidth: tabMetrics.width,
      tabHeight: tabMetrics.height,
      gap: tabMetrics.gap,
      onSelect: (tabId) => {
        this.selectedTab = tabId;
        this.tabBar?.setSelected(tabId);
        this.renderContent();
      },
    });
    this.layout.contentY = -this.layout.height / 2 + tabMetrics.y + this.tabBar.height + this.getContentTopGap();
    this.layout.contentHeight = this.layout.height / 2 - this.getFooterReserve() - this.layout.contentY;
    this.layout.contentWidth = this.layout.width - this.getHorizontalContentInset() * 2;
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
    const rowHeight = this.getRowHeight();
    const statRow = UIStatRow.create(this.scene, 0, y + rowHeight / 2, this.layout.contentWidth, row.label, row.value, {
      height: Math.max(22, rowHeight - 6),
      fontSize: this.getSmallFontSize(),
      backgroundAlpha: 0.34,
    });
    this.contentContainer.add(statRow);
  }

  private renderCard(card: StatsBuildCard, y: number): void {
    const width = this.layout.contentWidth;
    const height = this.getCardHeight(card);
    const density = LayoutConfig.getContentDensity(this.screen);
    const tiny = density === 'tiny';
    const compact = tiny || density === 'compact' || this.screen.isPortrait();
    const iconSize = tiny ? 30 : compact ? 36 : 40;
    const cardPaddingX = tiny ? 10 : compact ? 12 : 16;
    const titleX = -width / 2 + cardPaddingX + iconSize + (tiny ? 10 : 14);
    const cardUi = new UICard(this.scene, {
      x: 0,
      y: y + height / 2,
      width,
      height,
    });
    const icon = UIIconFrame.create(this.scene, {
      x: -width / 2 + cardPaddingX + iconSize / 2,
      y: y + cardPaddingX + iconSize / 2,
      size: iconSize,
      textureKey: this.resolveCardIconKey(card),
      fallback: card.fallback,
      tooltip: this.getCardTooltip(card),
    });
    const title = new UITextBlock(this.scene, {
      x: titleX,
      y: y + cardPaddingX - 2,
      text: card.title,
      fontSize: compact ? '13px' : '15px',
      fontStyle: 'bold',
      align: 'left',
      width: width - (titleX + width / 2) - 72,
    }).text;
    const subtitle = new UITextBlock(this.scene, {
      x: titleX,
      y: y + cardPaddingX + (compact ? 18 : 22),
      text: card.subtitle ?? '',
      tone: 'muted',
      fontSize: this.getSmallFontSize(),
      align: 'left',
      width: width - (titleX + width / 2) - 72,
    }).text;
    this.contentContainer.add([cardUi.container, icon, title, subtitle]);

    let badgeX = width / 2 - 20;
    for (const badgeLabel of card.badges ?? []) {
      const badge = UIBadge.create(this.scene, badgeX, y + (compact ? 16 : 21), badgeLabel);
      badge.setScale(compact ? 0.72 : 0.82);
      badgeX -= Math.max(compact ? 48 : 58, badgeLabel.length * (compact ? 6 : 7) + 14);
      this.contentContainer.add(badge);
    }

    let rowY = y + (compact ? 50 : 62);
    if (card.description) {
      const description = new UITextBlock(this.scene, {
        x: -width / 2 + cardPaddingX,
        y: rowY,
        text: card.description,
        tone: 'muted',
        fontSize: this.getSmallFontSize(),
        align: 'left',
        width: width - cardPaddingX * 2,
      }).text;
      description.setMaxLines(compact ? 2 : 2);
      this.contentContainer.add(description);
      rowY += Math.max(compact ? 16 : 20, description.height + (compact ? 4 : 6));
    }

    for (const row of card.rows) {
      const detailRowHeight = compact ? 18 : 22;
      const statRow = UIStatRow.create(
        this.scene,
        0,
        rowY + detailRowHeight / 2,
        width - cardPaddingX * 2,
        row.label,
        row.value,
        {
          height: detailRowHeight,
          fontSize: this.getSmallFontSize(),
          backgroundAlpha: 0.24,
          borderAlpha: 0.12,
          labelRatio: 0.36,
          truncate: true,
          valueFontStyle: 'normal',
        },
      );
      this.contentContainer.add(statRow);
      rowY += detailRowHeight + (compact ? 2 : 3);
    }

    if (card.relatedIcons?.length) {
      let iconX = -width / 2 + cardPaddingX;
      const iconY = y + height - (compact ? 17 : 22);
      const relatedSize = compact ? 22 : 28;
      for (const related of card.relatedIcons.slice(0, compact ? 4 : 6)) {
        const relatedIcon = UIIconFrame.create(this.scene, {
          x: iconX + relatedSize / 2,
          y: iconY,
          size: relatedSize,
          textureKey: this.resolveRelatedIconKey(related),
          fallback: related.fallback,
          tooltip: this.getRelatedIconTooltip(related),
        });
        this.contentContainer.add(relatedIcon);
        iconX += relatedSize + 6;
      }
    }
  }

  private renderEmpty(y: number): void {
    const text = new UITextBlock(this.scene, {
      x: 0,
      y: y + 32,
      text: I18n.t('statsBuild.empty'),
      tone: 'muted',
      fontSize: '16px',
      align: 'center',
    }).text;
    this.contentContainer.add(text);
  }

  private resolveCardIconKey(card: StatsBuildCard): string | undefined {
    if (this.selectedTab === 'weapons') {
      return AssetKeyResolver.getWeaponIconKey(
        this.scene,
        card.id,
        this.getVisualTierFromCard(card),
      )
        ?? card.iconKey;
    }

    if (this.selectedTab === 'passives') {
      return AssetKeyResolver.getPassiveIconKey(
        this.scene,
        card.id,
        this.getVisualTierFromCard(card),
      )
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

  private getVisualTierFromCard(card: StatsBuildCard): { level?: number; maxLevel?: number; evolved?: boolean } {
    const joinedBadges = (card.badges ?? []).join(' ');
    const levelMatch = /Lv\.(\d+)\s*\/\s*(\d+)/i.exec(joinedBadges);

    return {
      level: levelMatch ? Number(levelMatch[1]) : undefined,
      maxLevel: levelMatch ? Number(levelMatch[2]) : undefined,
      evolved: /\bEvolved\b/i.test(joinedBadges),
    };
  }

  private getCardTooltip(card: StatsBuildCard): IconTooltipData | undefined {
    switch (this.selectedTab) {
      case 'weapons':
        return { kind: 'weapon', id: card.id, title: card.title };
      case 'passives':
        return { kind: 'passive', id: card.id, title: card.title };
      case 'relics':
        return { kind: 'relic', id: card.id, title: card.title, description: card.description };
      case 'status':
        return { kind: 'status', id: card.id, title: card.title, description: card.description };
      default:
        return undefined;
    }
  }

  private getRelatedIconTooltip(related: StatsBuildIconRef): IconTooltipData {
    if (this.selectedTab === 'weapons') {
      return { kind: 'passive', id: related.id, title: related.label };
    }

    if (this.selectedTab === 'passives') {
      return { kind: 'weapon', id: related.id, title: related.label };
    }

    return { kind: 'generic', id: related.id, title: related.label };
  }

  private renderFooter(currentPage: number, totalPages: number): void {
    const density = LayoutConfig.getContentDensity(this.screen);
    const compact = density === 'tiny' || density === 'compact' || this.screen.isPortrait();
    const y = this.layout.height / 2 - (compact ? 42 : 48);
    const pager = new UIPager(this.scene, {
      x: 0,
      y,
      width: this.layout.width - this.getHorizontalContentInset() * 2,
      currentPage,
      totalPages,
      compact,
      closeLabel: I18n.t('common.close'),
      onPageChanged: (page) => {
        this.pageByTab.set(this.selectedTab, page);
        this.renderContent();
      },
      onClose: () => this.config.onClose(),
    });
    pager.pageText.setPosition(0, compact ? -24 : -28);
    this.footerContainer.add(pager.container);
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
      return this.getRowHeight();
    }

    return this.getCardHeight(item.card) + this.getItemGap();
  }

  private getCardHeight(card: StatsBuildCard): number {
    const density = LayoutConfig.getContentDensity(this.screen);
    const tiny = density === 'tiny';
    const compact = tiny || density === 'compact' || this.screen.isPortrait();
    const descriptionHeight = card.description ? compact ? 28 : 34 : 0;
    const relatedHeight = card.relatedIcons?.length ? compact ? 24 : 30 : 0;
    const rowHeight = compact ? 20 : 25;

    return Math.max(
      tiny ? 76 : compact ? 86 : 98,
      (compact ? 52 : 66) + descriptionHeight + card.rows.length * rowHeight + relatedHeight,
    );
  }

  private calculateLayout(): typeof this.layout {
    const safe = SafeArea.getInsets(this.screen);
    const availableWidth = this.screen.width - safe.left - safe.right;
    const availableHeight = this.screen.height - safe.top - safe.bottom;
    const isPortrait = this.screen.isPortrait();
    const density = LayoutConfig.getContentDensity(this.screen);
    const tiny = density === 'tiny';
    const compact = tiny || density === 'compact';
    const width = isPortrait
      ? Math.min(availableWidth * 0.84, tiny ? 304 : 440)
      : Math.min(availableWidth * (compact ? 0.62 : 0.56), compact ? 640 : 740);
    const height = isPortrait
      ? Math.min(availableHeight * (tiny ? 0.68 : 0.72), tiny ? 460 : 540)
      : Math.min(availableHeight * (compact ? 0.68 : 0.58), compact ? 400 : 460);
    const headerReserve = tiny ? 86 : compact || isPortrait ? 98 : 118;
    const footerReserve = tiny ? 58 : compact || isPortrait ? 68 : 86;
    const horizontalInset = tiny ? 18 : compact || isPortrait ? 24 : 32;

    return {
      width,
      height,
      contentY: -height / 2 + headerReserve,
      contentHeight: Math.max(60, height - headerReserve - footerReserve),
      contentWidth: width - horizontalInset * 2,
    };
  }

  private getHeaderOffsetY(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return 22;
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return 26;
    }

    return 30;
  }

  private getTitleFontSize(): string | undefined {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return '18px';
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return '20px';
    }

    return undefined;
  }

  private getSmallFontSize(): string {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return '10px';
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return '11px';
    }

    return '12px';
  }

  private getTabMetrics(): { y: number; width: number; height: number; gap: number } {
    const density = LayoutConfig.getContentDensity(this.screen);
    const tiny = density === 'tiny';
    const compact = tiny || density === 'compact' || this.screen.isPortrait();

    return {
      y: tiny ? 46 : compact ? 54 : 64,
      width: tiny ? 58 : compact ? 68 : 88,
      height: tiny ? 22 : compact ? 24 : 28,
      gap: tiny ? 2 : compact ? 3 : 5,
    };
  }

  private getContentTopGap(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return 6;
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return 8;
    }

    return 12;
  }

  private getFooterReserve(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return 58;
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return 68;
    }

    return 86;
  }

  private getHorizontalContentInset(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return 18;
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return 24;
    }

    return 32;
  }

  private getRowHeight(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    if (density === 'tiny') {
      return 22;
    }

    if (density === 'compact' || this.screen.isPortrait()) {
      return 26;
    }

    return 30;
  }

  private getItemGap(): number {
    const density = LayoutConfig.getContentDensity(this.screen);

    return density === 'tiny' ? 4 : density === 'compact' || this.screen.isPortrait() ? 6 : 8;
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(timeSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
