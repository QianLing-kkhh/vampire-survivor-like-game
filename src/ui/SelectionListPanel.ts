import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { SafeArea } from '../responsive/SafeArea';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIBadge } from './components/UIBadge';
import { UIButton } from './components/UIButton';
import { UICard } from './components/UICard';
import { UIIconFrame } from './components/UIIconFrame';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export interface SelectionListItem {
  id: string;
  name: string;
  description?: string;
  portraitKey?: string | null;
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
  private readonly screenManager: ScreenManager;
  private readonly pageItems: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeResize?: () => void;
  private selectedIndex: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: SelectionListPanelConfig,
  ) {
    this.screenManager = new ScreenManager(scene);
    this.selectedIndex = Math.max(
      0,
      config.items.findIndex((item) => item.id === config.selectedId),
    );
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
    this.container.destroy(true);
  }

  private render(): void {
    this.container.removeAll(true);
    this.pageItems.length = 0;

    const safe = SafeArea.getInsets(this.screenManager);
    const portrait = this.screenManager.isPortrait();
    const panelWidth = Math.min(
      portrait ? this.screenManager.width - safe.left - safe.right - 8 : 940,
      this.screenManager.width - safe.left - safe.right,
    );
    const panelHeight = Math.min(
      portrait ? this.screenManager.height - safe.top - safe.bottom : 620,
      this.screenManager.height - safe.top - safe.bottom,
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
      y: top + 40,
      width: panelWidth,
      title: this.config.title,
      subtitle: this.getSelectedItem()?.description,
    });
    this.container.add([frame, header]);

    const contentTop = top + (portrait ? 92 : 96);
    const buttonHeight = LayoutConfig.getButtonLayout(this.screenManager, 1).height;
    const buttonY = top + panelHeight - buttonHeight / 2 - 24;
    const contentBottom = buttonY - buttonHeight / 2 - 18;

    if (portrait) {
      const listHeight = Math.max(150, Math.floor((contentBottom - contentTop) * 0.52));
      this.renderList(left + 18, contentTop, panelWidth - 36, listHeight);
      this.renderDetail(left + 18, contentTop + listHeight + 14, panelWidth - 36, contentBottom - contentTop - listHeight - 14);
    } else {
      const listWidth = Math.min(360, panelWidth * 0.38);
      this.renderList(left + 24, contentTop, listWidth, contentBottom - contentTop);
      this.renderDetail(left + listWidth + 40, contentTop, panelWidth - listWidth - 64, contentBottom - contentTop);
    }

    this.renderButtons(centerX, buttonY, panelWidth);
  }

  private renderList(x: number, y: number, width: number, height: number): void {
    const visibleItems = this.getVisibleItems();
    const rowGap = 10;
    const rowHeight = Math.min(72, Math.max(48, (height - rowGap * (visibleItems.length - 1)) / Math.max(1, visibleItems.length)));

    visibleItems.forEach((item, index) => {
      const rowY = y + rowHeight / 2 + index * (rowHeight + rowGap);
      const selected = index === this.selectedIndex;
      const card = new UICard(this.scene, {
        x: x + width / 2,
        y: rowY,
        width,
        height: rowHeight,
        selected,
        disabled: item.id === 'more',
        onClick: () => {
          if (item.id !== 'more') {
            this.selectedIndex = index;
            this.render();
          }
        },
      });
      const icon = UIIconFrame.create(this.scene, {
        x: x + 32,
        y: rowY,
        size: Math.min(48, rowHeight - 12),
        textureKey: item.portraitKey,
        fallback: item.id === 'random_unlocked' ? '?' : this.getInitials(item.name),
      });
      const name = this.scene.add.text(x + 66, rowY - 13, item.name, {
        color: selected ? UITheme.colors.accentGoldCss : UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).body,
        fontStyle: 'bold',
        wordWrap: { width: width - 84 },
      });
      const desc = this.scene.add.text(x + 66, rowY + 8, item.description ?? item.id, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).small,
        wordWrap: { width: width - 84 },
      });
      desc.setMaxLines(1);
      this.container.add([card.container, icon, name, desc]);
      this.pageItems.push(card.container, icon, name, desc);
    });
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
    const portraitSize = Math.min(this.screenManager.isPortrait() ? 86 : 140, height - 64, width * 0.32);
    const portraitX = this.screenManager.isPortrait() ? x + portraitSize / 2 + 18 : x + portraitSize / 2 + 26;
    const portraitY = y + portraitSize / 2 + 24;
    const portrait = UIIconFrame.create(this.scene, {
      x: portraitX,
      y: portraitY,
      size: portraitSize,
      textureKey: item.portraitKey,
      fallback: item.id === 'random_unlocked' ? '?' : this.getInitials(item.name),
    });
    const textX = portraitX + portraitSize / 2 + 22;
    const title = this.scene.add.text(textX, y + 26, item.name, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).header,
      fontStyle: 'bold',
      wordWrap: { width: Math.max(80, x + width - textX - 16) },
    });
    const random = item.id === 'random_unlocked';
    const badges = this.getRoleBadges(item.id);
    const badgeY = y + (this.screenManager.isPortrait() ? 76 : 82);
    badges.forEach((label, index) => {
      const badge = UIBadge.create(this.scene, textX + 44 + index * 88, badgeY, label, random ? UITheme.colors.accentGold : UITheme.colors.accentBlue);
      this.container.add(badge);
      this.pageItems.push(badge);
    });
    const description = this.scene.add.text(textX, badgeY + 22, random ? I18n.t('ui.randomUnlockedEachRun') : item.description ?? item.id, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).body,
      lineSpacing: 4,
      wordWrap: { width: Math.max(100, x + width - textX - 18) },
    });
    description.setMaxLines(this.screenManager.isPortrait() ? 2 : 3);

    const statsTop = y + height - (this.screenManager.isPortrait() ? 74 : 104);
    const rowWidth = Math.min(width - 32, 440);
    const statRows = this.getDetailRows(item);
    statRows.slice(0, this.screenManager.isPortrait() ? 2 : 3).forEach((row, index) => {
      const stat = UIStatRow.create(this.scene, x + width / 2, statsTop + index * 30, rowWidth, row.label, row.value);
      this.container.add(stat);
      this.pageItems.push(stat);
      stat.setScale(Math.min(1, rowWidth / 440), 1);
    });

    this.container.add([card.container, portrait, title, description]);
    this.pageItems.push(card.container, portrait, title, description);
  }

  private renderButtons(centerX: number, y: number, panelWidth: number): void {
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: 2,
      centerX,
      startY: y,
      mode: this.screenManager.isPortrait() ? 'vertical' : 'twoColumn',
      gap: LayoutConfig.getButtonLayout(this.screenManager, 1).height + 8,
    });
    const confirm = new UIButton(this.scene, {
      x: buttonLayout.positions[0].x,
      y: buttonLayout.positions[0].y,
      label: I18n.t('selection.confirm'),
      width: Math.min(buttonLayout.width, panelWidth / (this.screenManager.isPortrait() ? 1.4 : 2.4)),
      height: buttonLayout.height,
      onClick: () => this.confirmSelected(),
    });
    const back = new UIButton(this.scene, {
      x: buttonLayout.positions[1].x,
      y: buttonLayout.positions[1].y,
      label: I18n.t('selection.back'),
      width: Math.min(buttonLayout.width, panelWidth / (this.screenManager.isPortrait() ? 1.4 : 2.4)),
      height: buttonLayout.height,
      onClick: this.config.onBack,
    });
    this.container.add([confirm.container, back.container]);
  }

  private selectPrevious(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.render();
  }

  private selectNext(): void {
    this.selectedIndex = Math.min(this.getSelectableItemCount() - 1, this.selectedIndex + 1);
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

  private getVisibleItems(): SelectionListItem[] {
    const maxItems = this.screenManager.isPortrait() ? 5 : 7;

    if (this.config.items.length <= maxItems) {
      return this.config.items;
    }

    return [
      ...this.config.items.slice(0, maxItems - 1),
      {
        id: 'more',
        name: `+${this.config.items.length - maxItems + 1} more`,
      },
    ];
  }

  private getSelectableItemCount(): number {
    const maxItems = this.screenManager.isPortrait() ? 5 : 7;

    return this.config.items.length > maxItems
      ? maxItems - 1
      : this.config.items.length;
  }

  private getRoleBadges(id: string): string[] {
    switch (id) {
      case 'assassin':
        return ['Mobility', 'Crit', 'Knife'];
      case 'witch':
        return ['Magic', 'Slow', 'Explosion'];
      case 'priest':
        return ['Shield', 'Heal', 'Orbit'];
      case 'warrior':
        return ['Armor', 'Knockback', 'Axe'];
      case 'random_unlocked':
        return [I18n.t('ui.random')];
      default:
        return [I18n.t('ui.summary')];
    }
  }

  private getDetailRows(item: SelectionListItem): Array<{ label: string; value: string }> {
    if (item.id === 'random_unlocked') {
      return [
        { label: I18n.t('ui.random'), value: I18n.t('ui.unlocked') },
        { label: I18n.t('ui.build'), value: I18n.t('ui.randomUnlockedEachRun') },
      ];
    }

    return [
      { label: 'Role', value: this.getRoleBadges(item.id).join(' / ') },
      { label: 'Starting Weapon', value: this.getRoleBadges(item.id)[this.getRoleBadges(item.id).length - 1] ?? '-' },
      { label: 'Damage Reaction', value: item.id },
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
