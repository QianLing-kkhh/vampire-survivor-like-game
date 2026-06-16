import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { SafeArea } from '../responsive/SafeArea';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIBadge } from './components/UIBadge';
import { UIActionBar, UIActionBarAction } from './components/UIActionBar';
import { UICard } from './components/UICard';
import { UIIconFrame } from './components/UIIconFrame';
import { UIPager } from './components/UIPager';
import { UIStatRow } from './components/UIStatRow';
import { UITextBlock } from './components/UITextBlock';
import { truncateTextToWidth } from './components/UITextUtils';
import { createModalBlocker, setRectangleHitArea } from './input/UIInteraction';
import { attachIconTooltip } from './tooltip/UITooltipManager';
import { UITheme } from './UITheme';

export interface SelectionListItem {
  id: string;
  name: string;
  description?: string;
  kind?: 'character' | 'stage' | 'generic';
  portraitKey?: string | null;
  startingWeaponId?: string;
  startingWeaponIconKey?: string;
  damageReactionSkill?: string;
  roleLabels?: string[];
  badges?: string[];
  detailRows?: Array<{ label: string; value: string }>;
}

export interface SelectionListPanelConfig {
  title: string;
  items: SelectionListItem[];
  selectedId: string;
  onConfirm(id: string): void;
  onBack(): void;
}

export class SelectionListPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private readonly screenManager: ScreenManager;
  private readonly pageItems: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeResize?: () => void;
  private selectedIndex: number;
  private listPage = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: SelectionListPanelConfig,
  ) {
    this.screenManager = new ScreenManager(scene);
    this.selectedIndex = Math.max(
      0,
      config.items.findIndex((item) => item.id === config.selectedId),
    );
    this.blocker = createModalBlocker(scene, UITheme.depth.modal - 1);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(UITheme.depth.modal);
    this.render();
    this.unsubscribeResize = this.screenManager.onResize(() => this.render());
    this.scene.input.keyboard?.on('keydown-UP', this.selectPrevious, this);
    this.scene.input.keyboard?.on('keydown-DOWN', this.selectNext, this);
    this.scene.input.keyboard?.on('keydown-ENTER', this.confirmSelected, this);
    this.scene.input.keyboard?.on('keydown-ESC', this.config.onBack);
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown-UP', this.selectPrevious, this);
    this.scene.input.keyboard?.off('keydown-DOWN', this.selectNext, this);
    this.scene.input.keyboard?.off('keydown-ENTER', this.confirmSelected, this);
    this.scene.input.keyboard?.off('keydown-ESC', this.config.onBack);
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    this.container.destroy(true);
  }

  private render(): void {
    this.container.removeAll(true);
    this.pageItems.length = 0;
    this.syncPageToSelection();
    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);

    const safe = SafeArea.getInsets(this.screenManager);
    const portrait = this.screenManager.isPortrait();
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const availableWidth = this.screenManager.width - safe.left - safe.right;
    const availableHeight = this.screenManager.height - safe.top - safe.bottom;
    const panelWidth = Math.min(
      portrait
        ? availableWidth * (tiny ? 0.84 : 0.82)
        : availableWidth * (compact ? 0.64 : 0.56),
      portrait ? (tiny ? 316 : 370) : compact ? 680 : 720,
      availableWidth,
    );
    const panelHeight = Math.min(
      portrait
        ? availableHeight * (tiny ? 0.72 : 0.7)
        : availableHeight * (compact ? 0.62 : 0.56),
      portrait ? (tiny ? 540 : 600) : compact ? 420 : 450,
      availableHeight,
    );
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const top = centerY - panelHeight / 2;
    const left = centerX - panelWidth / 2;
    const frame = PanelFrame.create(this.scene, {
      x: centerX,
      y: centerY,
      width: panelWidth,
      height: panelHeight,
      alpha: UITheme.panelBgAlpha,
      variant: 'modal',
    });
    const header = PanelHeader.create(this.scene, {
      x: centerX,
      y: top + (compact ? 30 : 34),
      width: panelWidth,
      title: this.config.title,
    });
    this.container.add([frame, header]);

    const contentTop = top + (compact ? 60 : portrait ? 66 : 76);
    const buttonHeight = LayoutConfig.getButtonLayout(this.screenManager, 1).height;
    const buttonY = top + panelHeight - buttonHeight / 2 - (compact ? 10 : 14);
    const contentBottom = buttonY - buttonHeight / 2 - (compact ? 8 : 12);

    if (portrait) {
      const sideInset = compact ? 14 : 18;
      const listHeight = Math.max(104, Math.floor((contentBottom - contentTop) * (compact ? 0.42 : 0.46)));
      this.renderList(left + sideInset, contentTop, panelWidth - sideInset * 2, listHeight);
      this.renderDetail(
        left + sideInset,
        contentTop + listHeight + (compact ? 8 : 12),
        panelWidth - sideInset * 2,
        contentBottom - contentTop - listHeight - (compact ? 8 : 12),
      );
    } else {
      const sideInset = compact ? 18 : 24;
      const columnGap = compact ? 22 : 32;
      const listWidth = Math.min(compact ? 260 : 300, panelWidth * 0.38);
      this.renderList(left + sideInset, contentTop, listWidth, contentBottom - contentTop);
      this.renderDetail(left + listWidth + sideInset + columnGap, contentTop, panelWidth - listWidth - sideInset * 2 - columnGap, contentBottom - contentTop);
    }

    this.renderButtons(centerX, buttonY, panelWidth);
  }

  private renderList(x: number, y: number, width: number, height: number): void {
    const pageInfo = this.getVisiblePageInfo(this.getListPageSize(height));
    const visibleItems = pageInfo.items;
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const pagerHeight = pageInfo.totalPages > 1 ? compact ? 32 : 36 : 0;
    const listHeight = Math.max(72, height - pagerHeight);
    const rowGap = compact ? 6 : 8;
    const rowHeight = Math.min(
      this.screenManager.isPortrait() ? (compact ? 50 : 56) : (compact ? 52 : 60),
      Math.max(
        this.screenManager.isPortrait() ? 36 : 40,
        (listHeight - rowGap * (visibleItems.length - 1)) / Math.max(1, visibleItems.length),
      ),
    );
    const iconSize = Math.min(compact ? 32 : 38, rowHeight - 8);
    const iconX = x + iconSize / 2 + (compact ? 8 : 10);
    const textX = iconX + iconSize / 2 + (compact ? 10 : 12);

    visibleItems.forEach((item, index) => {
      const rowY = y + rowHeight / 2 + index * (rowHeight + rowGap);
      const itemIndex = pageInfo.startIndex + index;
      const selected = itemIndex === this.selectedIndex;
      const card = new UICard(this.scene, {
        x: x + width / 2,
        y: rowY,
        width,
        height: rowHeight,
        selected,
        onClick: () => {
          this.selectedIndex = itemIndex;
          this.render();
        },
      });
      const icon = UIIconFrame.create(this.scene, {
        x: iconX,
        y: rowY,
        size: iconSize,
        textureKey: item.portraitKey,
        fallback: item.id === 'random_unlocked' ? '?' : this.getInitials(item.name),
        tooltip: {
          kind: item.kind === 'stage' ? 'generic' : 'character',
          id: item.id,
          title: item.name,
          description: item.description,
        },
        tooltipEnabled: false,
      });
      attachIconTooltip(this.scene, card.container, {
        kind: item.kind === 'stage' ? 'generic' : 'character',
        id: item.id,
        title: item.name,
        description: item.description,
      }, { lockOnClick: false });
      const textWidth = Math.max(60, x + width - textX - 8);
      const nameFontSize = compact
        ? LayoutConfig.getResponsiveFontSizes(this.screenManager).small
        : LayoutConfig.getResponsiveFontSizes(this.screenManager).body;
      const descFontSize = LayoutConfig.getResponsiveFontSizes(this.screenManager).small;
      const name = new UITextBlock(this.scene, {
        x: textX,
        y: rowY - (compact ? 12 : 13),
        text: truncateTextToWidth(item.name, textWidth, nameFontSize),
        tone: selected ? 'accent' : 'primary',
        fontSize: nameFontSize,
        fontStyle: 'bold',
        align: 'left',
        width: textWidth,
      }).text;
      const descSource = item.description ?? item.id;
      const desc = new UITextBlock(this.scene, {
        x: textX,
        y: rowY + (compact ? 5 : 8),
        text: truncateTextToWidth(descSource, textWidth, descFontSize),
        tone: 'muted',
        fontSize: descFontSize,
        align: 'left',
        width: textWidth,
      }).text;
      desc.setMaxLines(1);
      this.container.add([card.container, icon, name, desc]);
      this.pageItems.push(card.container, icon, name, desc);
    });

    if (pageInfo.totalPages > 1) {
      const pager = new UIPager(this.scene, {
        x: x + width / 2,
        y: y + height - (compact ? 14 : 16),
        width: Math.min(width, this.screenManager.isPortrait() ? 230 : 280),
        currentPage: pageInfo.pageIndex,
        totalPages: pageInfo.totalPages,
        compact: true,
        onPageChanged: (page) => {
          this.listPage = page;
          const pageSize = pageInfo.pageSize;
          this.selectedIndex = Phaser.Math.Clamp(
            page * pageSize,
            0,
            Math.max(0, this.config.items.length - 1),
          );
          this.render();
        },
      });
      this.container.add(pager.container);
      this.pageItems.push(pager.container);
    }
  }

  private renderDetail(x: number, y: number, width: number, height: number): void {
    const item = this.getSelectedItem();

    if (!item) {
      return;
    }

    const card = new UICard(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      selected: true,
    });
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const portraitSize = Math.min(
      this.screenManager.isPortrait() ? compact ? 58 : 68 : compact ? 82 : 104,
      height - (compact ? 48 : 58),
      width * (this.screenManager.isPortrait() ? 0.24 : 0.28),
    );
    const portraitX = this.screenManager.isPortrait() ? x + portraitSize / 2 + 14 : x + portraitSize / 2 + (compact ? 18 : 22);
    const portraitY = y + portraitSize / 2 + (compact ? 16 : 20);
    const portrait = UIIconFrame.create(this.scene, {
      x: portraitX,
      y: portraitY,
      size: portraitSize,
      textureKey: item.portraitKey,
      fallback: item.id === 'random_unlocked' ? '?' : this.getInitials(item.name),
      tooltip: {
        kind: item.kind === 'stage' ? 'generic' : 'character',
        id: item.id,
        title: item.name,
        description: item.description,
      },
    });
    const textX = portraitX + portraitSize / 2 + (compact ? 14 : 18);
    const detailTextWidth = Math.max(80, x + width - textX - 16);
    const titleFontSize = compact
      ? LayoutConfig.getResponsiveFontSizes(this.screenManager).body
      : LayoutConfig.getResponsiveFontSizes(this.screenManager).header;
    const title = new UITextBlock(this.scene, {
      x: textX,
      y: y + (compact ? 18 : 22),
      text: truncateTextToWidth(item.name, detailTextWidth, titleFontSize),
      fontSize: titleFontSize,
      fontStyle: 'bold',
      align: 'left',
      width: detailTextWidth,
    }).text;
    const random = item.id === 'random_unlocked';
    const badges = this.getDetailBadges(item);
    const badgeY = y + (compact ? 52 : this.screenManager.isPortrait() ? 62 : 70);
    const badgeScale = compact ? 0.68 : 0.78;
    badges.forEach((label, index) => {
      const badge = UIBadge.create(
        this.scene,
        textX + (compact ? 28 : 34) + index * (compact ? 54 : 66),
        badgeY,
        label,
        random ? UITheme.colors.accentGold : UITheme.colors.accentBlue,
      );
      badge.setScale(badgeScale);
      this.container.add(badge);
      this.pageItems.push(badge);
    });
    const descriptionY = badges.length > 0
      ? badgeY + (compact ? 14 : 18)
      : y + (compact ? 48 : 56);
    const descriptionText = random ? I18n.t('ui.randomUnlockedEachRun') : item.description ?? item.id;
    const descriptionWidth = Math.max(100, x + width - textX - 18);
    const descriptionFontSize = compact
      ? LayoutConfig.getResponsiveFontSizes(this.screenManager).small
      : LayoutConfig.getResponsiveFontSizes(this.screenManager).body;
    const description = new UITextBlock(this.scene, {
      x: textX,
      y: descriptionY,
      text: descriptionText,
      tone: 'muted',
      fontSize: descriptionFontSize,
      lineSpacing: compact ? 2 : 4,
      align: 'left',
      width: descriptionWidth,
    }).text;
    description.setMaxLines(compact ? 2 : this.screenManager.isPortrait() ? 2 : 3);

    const statsTop = y + height - (this.screenManager.isPortrait() ? (compact ? 52 : 62) : (compact ? 70 : 86));
    const rowWidth = Math.min(width - 32, 440);
    const statRows = this.getDetailRows(item);
    const rowHeight = compact ? 20 : 24;
    statRows.slice(0, this.screenManager.isPortrait() ? 2 : 3).forEach((row, index) => {
      const stat = UIStatRow.create(this.scene, x + width / 2, statsTop + index * rowHeight, rowWidth, row.label, row.value, {
        height: rowHeight - 2,
        fontSize: compact ? '10px' : '11px',
        backgroundAlpha: 0.28,
        borderAlpha: 0.12,
        labelRatio: 0.38,
      });
      this.container.add(stat);
      this.pageItems.push(stat);
      stat.setScale(Math.min(1, rowWidth / 440), 1);
    });

    if (!random && item.startingWeaponIconKey) {
      const rowIndex = this.screenManager.isPortrait() ? 2 : 3;
      this.renderWeaponStatLine(
        x + 14,
        statsTop + rowIndex * rowHeight,
        item,
        I18n.t('selection.shortLabelAvailable'),
        I18n.t('selection.startingWeapon'),
        I18n.t('selection.startingWeaponLabel'),
        item.startingWeaponIconKey,
      );
    }

    this.container.add([card.container, portrait, title, description]);
    this.pageItems.push(card.container, portrait, title, description);
  }

  private renderWeaponStatLine(
    textX: number,
    rowY: number,
    item: SelectionListItem,
    fallback: string,
    label: string,
    value: string,
    iconKey?: string,
  ): void {
    const group = this.scene.add.container(0, 0);
    const iconFrame = UIIconFrame.create(this.scene, {
      x: textX - 8,
      y: rowY,
      size: 20,
      textureKey: iconKey,
      fallback,
      tooltip: {
        kind: 'generic',
        id: item.startingWeaponId ?? item.id,
        title: label,
      },
      tooltipEnabled: false,
    });
    group.add(iconFrame);

    const availableWidth = Math.max(72, this.screenManager.width - (textX + 28));
    const fontSize = LayoutConfig.getResponsiveFontSizes(this.screenManager).body;
    const labelText = new UITextBlock(this.scene, {
      x: textX + 14,
      y: rowY - 5,
      text: truncateTextToWidth(`${label}: ${value}`, availableWidth, fontSize),
      fontSize,
      align: 'left',
      width: availableWidth,
    }).text;
    labelText.setMaxLines(1);
    group.add(labelText);

    this.pageItems.push(group);
    this.container.add(group);
  }

  private renderButtons(centerX: number, y: number, panelWidth: number): void {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const buttonHeight = tiny ? 26 : compact ? 30 : 34;
    const horizontalInset = tiny ? 12 : compact ? 16 : 22;
    const buttonArea = {
      x: centerX - panelWidth / 2 + horizontalInset,
      y: y - buttonHeight / 2,
      width: panelWidth - horizontalInset * 2,
      height: buttonHeight,
    };
    const actions: UIActionBarAction<'confirm' | 'back'>[] = [
      {
        id: 'confirm',
        label: I18n.t('selection.confirm'),
        onClick: () => this.confirmSelected(),
      },
      {
        id: 'back',
        label: I18n.t('selection.back'),
        onClick: this.config.onBack,
      },
    ];
    const actionBar = new UIActionBar(this.scene, actions);
    actionBar.layout(this.screenManager, buttonArea, {
      columns: 2,
      compact,
      minWidth: tiny ? 82 : 98,
      maxWidth: Math.min(tiny ? 126 : compact ? 148 : 172, panelWidth / 2 - horizontalInset - 4),
      minHeight: tiny ? 24 : 28,
      maxHeight: buttonHeight,
      fontSize: tiny ? '10px' : compact ? '11px' : '13px',
    });
    this.container.add(actionBar.container);
  }

  private selectPrevious(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.syncPageToSelection();
    this.render();
  }

  private selectNext(): void {
    this.selectedIndex = Math.min(this.getSelectableItemCount() - 1, this.selectedIndex + 1);
    this.syncPageToSelection();
    this.render();
  }

  private confirmSelected(): void {
    const item = this.config.items[this.selectedIndex];

    if (item) {
      this.config.onConfirm(item.id);
    }
  }

  private getSelectedItem(): SelectionListItem | undefined {
    return this.config.items[this.selectedIndex];
  }

  private getVisiblePageInfo(pageSize = this.getListPageSize()): {
    items: SelectionListItem[];
    startIndex: number;
    pageIndex: number;
    pageSize: number;
    totalPages: number;
  } {
    const totalPages = Math.max(1, Math.ceil(this.config.items.length / pageSize));
    const selectedPage = Math.floor(this.selectedIndex / pageSize);
    const currentPageStart = this.listPage * pageSize;
    const selectedVisible = this.selectedIndex >= currentPageStart
      && this.selectedIndex < currentPageStart + pageSize;
    const pageIndex = Phaser.Math.Clamp(
      selectedVisible ? this.listPage : selectedPage,
      0,
      totalPages - 1,
    );
    this.listPage = pageIndex;
    const startIndex = pageIndex * pageSize;

    return {
      items: this.config.items.slice(startIndex, startIndex + pageSize),
      startIndex,
      pageIndex,
      pageSize,
      totalPages,
    };
  }

  private getSelectableItemCount(): number {
    return this.config.items.length;
  }

  private getListPageSize(availableHeight?: number): number {
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const base = this.screenManager.isPortrait() ? compact ? 4 : 5 : compact ? 5 : 6;

    if (availableHeight === undefined) {
      return base;
    }

    const pagerReserve = 42;
    const rowBudget = Math.max(1, availableHeight - pagerReserve);
    const targetRowHeight = this.screenManager.isPortrait() ? compact ? 44 : 50 : compact ? 48 : 54;
    const heightBased = Math.max(1, Math.floor(rowBudget / targetRowHeight));

    return Math.max(1, Math.min(base, heightBased));
  }

  private syncPageToSelection(): void {
    const pageSize = this.getListPageSize();
    this.listPage = Math.floor(this.selectedIndex / pageSize);
  }

  private getDetailBadges(item: SelectionListItem): string[] {
    if (item.badges) {
      return item.badges;
    }

    if (item.kind === 'stage') {
      return [];
    }

    return this.getRoleBadges(item.id);
  }

  private getRoleBadges(id: string): string[] {
    switch (id) {
      case 'assassin':
        return [
          I18n.t('ui.role.assassin.m1'),
          I18n.t('ui.role.assassin.m2'),
          I18n.t('ui.role.assassin.m3'),
        ];
      case 'witch':
        return [
          I18n.t('ui.role.witch.m1'),
          I18n.t('ui.role.witch.m2'),
          I18n.t('ui.role.witch.m3'),
        ];
      case 'priest':
        return [
          I18n.t('ui.role.priest.m1'),
          I18n.t('ui.role.priest.m2'),
          I18n.t('ui.role.priest.m3'),
        ];
      case 'warrior':
        return [
          I18n.t('ui.role.warrior.m1'),
          I18n.t('ui.role.warrior.m2'),
          I18n.t('ui.role.warrior.m3'),
        ];
      case 'random_unlocked':
        return [I18n.t('ui.random')];
      default:
        return [I18n.t('ui.summary')];
    }
  }

  private getDetailRows(item: SelectionListItem): Array<{ label: string; value: string }> {
    if (item.detailRows && item.detailRows.length > 0) {
      return item.detailRows;
    }

    if (item.kind === 'stage') {
      return [
        { label: I18n.t('selection.stage'), value: item.name },
        { label: I18n.t('selection.map'), value: item.description ?? item.id },
      ];
    }

    if (item.id === 'random_unlocked') {
      return [
        { label: I18n.t('ui.random'), value: I18n.t('ui.unlocked') },
        { label: I18n.t('ui.build'), value: I18n.t('ui.randomUnlockedEachRun') },
      ];
    }

    return [
      { label: I18n.t('selection.role'), value: this.getRoleBadges(item.id).join(' / ') },
      { label: I18n.t('selection.startingWeapon'), value: I18n.t('selection.iconShown') },
      {
        label: I18n.t('selection.damageReaction'),
        value: item.damageReactionSkill
          ? I18n.t('selection.damageReactionKeyed', { id: item.damageReactionSkill })
          : I18n.t('selection.damageReactionUnknown'),
      },
    ];
  }

  private getInitials(value: string): string {
    return value
      .split(/\s|_/)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }
}
