import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import {
  UITheme,
  getButtonMetrics,
  toCssColor,
} from './UITheme';

export interface SelectionListItem {
  id: string;
  name: string;
  description?: string;
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
  private readonly rowObjects: Phaser.GameObjects.Text[] = [];
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly confirmButton: Phaser.GameObjects.Text;
  private readonly backButton: Phaser.GameObjects.Text;
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
    this.container.setDepth(1000);
    this.background = scene.add.rectangle(0, 0, 400, 460, UITheme.panelBgColor, UITheme.panelBgAlpha);
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.9);
    this.titleText = scene.add.text(0, 0, config.title, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.confirmButton = this.createButton(I18n.t('selection.confirm'), () => {
      const item = this.config.items[this.selectedIndex];

      if (item) {
        this.config.onConfirm(item.id);
      }
    });
    this.backButton = this.createButton(I18n.t('selection.back'), this.config.onBack);
    this.container.add([
      this.background,
      this.titleText,
      this.confirmButton,
      this.backButton,
    ]);
    this.renderRows();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
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

  private renderRows(): void {
    this.rowObjects.forEach((row) => row.destroy());
    this.rowObjects.length = 0;

    const visibleItems = this.getVisibleItems();

    visibleItems.forEach((item, index) => {
      const row = this.scene.add.text(0, 0, this.formatRow(item), {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.bodyFontSize,
        fixedWidth: 340,
        fixedHeight: 42,
        padding: { x: 12, y: 10 },
      });
      row.setOrigin(0.5);
      row.setInteractive({ useHandCursor: item.id !== 'more' });
      row.on('pointerdown', () => {
        if (item.id === 'more') {
          return;
        }

        this.selectedIndex = index;
        this.applySelectionStyles();
      });
      this.rowObjects.push(row);
      this.container.add(row);
    });

    this.applySelectionStyles();
  }

  private applyLayout(): void {
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: this.screenManager.isPortrait() ? 360 : 560,
      maxHeight: this.screenManager.isPortrait() ? 560 : 500,
      padding: 24,
    });
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const buttonMode = this.screenManager.isPortrait() ? 'vertical' : 'twoColumn';
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: 2,
      centerX: this.screenManager.centerX,
      startY: panel.y + panel.height - metrics.height / 2 - 24,
      mode: buttonMode,
      gap: metrics.height + 8,
    });
    const rowStartY = panel.y + 92;
    const rowGap = this.screenManager.isPortrait() ? 48 : 50;

    this.background.setPosition(this.screenManager.centerX, this.screenManager.centerY);
    this.background.setSize(panel.width, panel.height);
    this.titleText.setPosition(this.screenManager.centerX, panel.y + 40);
    this.titleText.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);

    this.rowObjects.forEach((row, index) => {
      row.setPosition(this.screenManager.centerX, rowStartY + index * rowGap);
      row.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).body);
      row.setFixedSize(Math.min(panel.content.width, 420), 42);
    });

    [this.confirmButton, this.backButton].forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setPosition(position.x, position.y);
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
    });
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const button = this.scene.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      align: 'center',
      fixedWidth: metrics.width,
      fixedHeight: metrics.height,
      padding: { x: 0, y: Math.max(0, Math.floor((metrics.height - 22) / 2)) },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor)));
    button.on('pointerout', () => button.setBackgroundColor(toCssColor(UITheme.buttonBgColor)));
    button.on('pointerdown', onClick);
    return button;
  }

  private applySelectionStyles(): void {
    this.rowObjects.forEach((row, index) => {
      const isSelected = index === this.selectedIndex;
      row.setBackgroundColor(toCssColor(isSelected ? UITheme.buttonHoverColor : UITheme.buttonBgColor));
      row.setColor(isSelected ? UITheme.successTextColor : UITheme.textColor);
    });
  }

  private selectPrevious(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.applySelectionStyles();
  }

  private selectNext(): void {
    this.selectedIndex = Math.min(this.getSelectableItemCount() - 1, this.selectedIndex + 1);
    this.applySelectionStyles();
  }

  private confirmSelected(): void {
    const item = this.config.items[this.selectedIndex];

    if (item) {
      this.config.onConfirm(item.id);
    }
  }

  private getVisibleItems(): SelectionListItem[] {
    const maxItems = this.screenManager.isPortrait() ? 6 : 7;

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
    const maxItems = this.screenManager.isPortrait() ? 6 : 7;

    return this.config.items.length > maxItems
      ? maxItems - 1
      : this.config.items.length;
  }

  private formatRow(item: SelectionListItem): string {
    if (item.description) {
      return `${item.name}  ${item.description}`;
    }

    return `${item.name}  ${item.id}`;
  }
}
