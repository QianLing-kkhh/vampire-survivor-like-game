import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { HelpContentBuilder } from './help/HelpContentBuilder';
import { HelpLine } from './help/HelpSection';
import { HelpTabDefinition } from './help/HelpTabDefinition';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type TabButton = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  tab: HelpTabDefinition;
};

type PageRange = {
  start: number;
  end: number;
};

export class HelpOverlay {
  private static readonly TAB_SIZE = 42;
  private static readonly CONTENT_ICON_SIZE = 24;

  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private readonly prevPageButton: Phaser.GameObjects.Text;
  private readonly nextPageButton: Phaser.GameObjects.Text;
  private readonly pageText: Phaser.GameObjects.Text;
  private readonly tabs: HelpTabDefinition[];
  private readonly tabButtons: TabButton[] = [];
  private readonly contentItems: Phaser.GameObjects.Container[] = [];
  private selectedTabIndex = 0;
  private pageByTab: Record<string, number> = {};
  private unsubscribeResize?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.screenManager = new ScreenManager(scene);
    this.tabs = new HelpContentBuilder().buildTabs();
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1400);

    this.dimmer = scene.add.rectangle(
      this.screenManager.centerX,
      this.screenManager.centerY,
      scene.scale.width,
      scene.scale.height,
      0x000000,
      0.48,
    );
    this.dimmer.setInteractive();

    this.panel = scene.add.rectangle(
      this.screenManager.centerX,
      this.screenManager.centerY,
      720,
      500,
      UITheme.panelBgColor,
      0.96,
    );
    this.panel.setStrokeStyle(2, UITheme.panelBorderColor, 0.9);
    this.panel.setAlpha(scene.textures.exists('art_ui_help_panel_bg') ? 0.25 : 0.96);
    this.panelImage = scene.textures.exists('art_ui_help_panel_bg')
      ? scene.add.image(this.screenManager.centerX, this.screenManager.centerY, 'art_ui_help_panel_bg')
      : undefined;
    this.panelImage?.setAlpha(UITheme.helpPanelAlpha);

    this.title = scene.add.text(0, 0, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);

    this.closeButton = this.createTextButton(scene, I18n.t('common.close'), () => {
      this.destroy();
      onClose?.();
    });
    this.prevPageButton = this.createTextButton(scene, I18n.t('settings.previousPage'), () => {
      this.changePage(scene, -1);
    });
    this.nextPageButton = this.createTextButton(scene, I18n.t('settings.nextPage'), () => {
      this.changePage(scene, 1);
    });
    this.pageText = scene.add.text(0, 0, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
    });
    this.pageText.setOrigin(0.5);

    this.container.add([
      this.dimmer,
      this.panel,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
      this.closeButton,
      this.prevPageButton,
      this.nextPageButton,
      this.pageText,
    ]);

    this.createTabs(scene);
    this.renderContent(scene);
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private createTextButton(
    scene: Phaser.Scene,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(scene.scale.width, scene.scale.height);
    const button = scene.add.text(0, 0, label, {
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
      if (button.alpha >= 1) {
        button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
      }
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    button.on('pointerdown', () => {
      if (button.alpha < 1) {
        return;
      }

      AudioManager.playUi(scene, 'ui_click');
      onClick();
    });

    return button;
  }

  private createTabs(scene: Phaser.Scene): void {
    for (const tabDefinition of this.tabs) {
      const tab = scene.add.container(0, 0);
      const background = scene.add.rectangle(
        0,
        0,
        HelpOverlay.TAB_SIZE,
        HelpOverlay.TAB_SIZE,
        UITheme.buttonBgColor,
        0.95,
      );
      background.setStrokeStyle(1, UITheme.panelBorderColor, 0.75);
      background.setInteractive({ useHandCursor: true });
      tab.add(background);

      if (tabDefinition.iconKey && scene.textures.exists(tabDefinition.iconKey)) {
        const icon = scene.add.image(0, -3, tabDefinition.iconKey);
        icon.setDisplaySize(28, 28);
        tab.add(icon);
      } else {
        const fallback = scene.add.text(0, -5, tabDefinition.fallback, {
          color: UITheme.textColor,
          fontFamily: UITheme.fontFamily,
          fontSize: '12px',
          fontStyle: 'bold',
        });
        fallback.setOrigin(0.5);
        tab.add(fallback);
      }

      const shortLabel = scene.add.text(0, 13, tabDefinition.fallback, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '9px',
      });
      shortLabel.setOrigin(0.5);
      tab.add(shortLabel);

      background.on('pointerdown', () => {
        AudioManager.playUi(scene, 'ui_click');
        this.selectedTabIndex = this.tabs.indexOf(tabDefinition);
        this.pageByTab[tabDefinition.id] = 0;
        this.renderContent(scene);
        this.applyLayout();
      });

      this.tabButtons.push({ container: tab, background, tab: tabDefinition });
      this.container.add(tab);
    }
  }

  private renderContent(scene: Phaser.Scene): void {
    for (const item of this.contentItems) {
      item.destroy();
    }

    this.contentItems.length = 0;
    const tab = this.tabs[this.selectedTabIndex];
    this.title.setText(tab.title);

    for (const section of tab.sections) {
      this.addContentItem(scene, { type: 'subtitle', text: section.title });
      for (const line of section.lines) {
        this.addContentItem(scene, line);
      }
      this.addContentItem(scene, { type: 'divider' });
    }
  }

  private addContentItem(scene: Phaser.Scene, line: HelpLine): void {
    const row = scene.add.container(0, 0);
    const height = this.getLineHeight(line.type);
    row.setData('lineType', line.type);
    row.setData('height', height);

    if (line.type === 'divider') {
      const divider = scene.add.rectangle(0, 0, 1, 1, UITheme.panelBorderColor, 0.45);
      divider.setOrigin(0, 0.5);
      row.add(divider);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'subtitle') {
      const label = scene.add.text(0, 0, line.text ?? '', {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.bodyFontSize,
        fontStyle: 'bold',
      });
      row.add(label);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'statRow') {
      const label = scene.add.text(0, 0, line.label ?? '', {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        fontStyle: 'bold',
      });
      const value = scene.add.text(150, 0, line.value ?? '', {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        wordWrap: { width: 360 },
      });
      row.add([label, value]);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    if (line.type === 'paragraph' || line.type === 'bullet') {
      const text = scene.add.text(0, 0, line.type === 'bullet' ? `- ${line.text ?? ''}` : line.text ?? '', {
        color: line.type === 'bullet' ? UITheme.textColor : UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        wordWrap: { width: 520 },
      });
      text.setMaxLines(line.type === 'bullet' ? 2 : 3);
      row.add(text);
      this.contentItems.push(row);
      this.container.add(row);
      return;
    }

    const bg = scene.add.rectangle(
      0,
      0,
      HelpOverlay.CONTENT_ICON_SIZE,
      HelpOverlay.CONTENT_ICON_SIZE,
      UITheme.iconBgColor,
      0.78,
    );
    bg.setStrokeStyle(1, UITheme.panelBorderColor, 0.4);
    row.add(bg);

    if (line.iconKey && scene.textures.exists(line.iconKey)) {
      const icon = scene.add.image(0, 0, line.iconKey);
      icon.setDisplaySize(20, 20);
      row.add(icon);
    } else {
      const fallback = scene.add.text(0, 0, line.fallback ?? '?', {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '10px',
        fontStyle: 'bold',
      });
      fallback.setOrigin(0.5);
      row.add(fallback);
    }

    const text = scene.add.text(20, -9, line.text ?? '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      wordWrap: { width: 520 },
    });
    text.setMaxLines(3);
    row.add(text);
    this.contentItems.push(row);
    this.container.add(row);
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getHelpLayout(this.screenManager);
    const center = layout.panelCenter;
    const top = center.y - layout.panelHeight / 2;
    const left = center.x - layout.panelWidth / 2;
    const tabGap = 8;
    const verticalTabs = this.usesVerticalTabs(layout.panelHeight);
    const tabRows = verticalTabs
      ? this.tabButtons.length
      : this.getTabRows(layout.panelWidth, tabGap);
    const tabAreaTop = top + (verticalTabs ? 90 : 78);
    const tabAreaHeight = tabRows * HelpOverlay.TAB_SIZE + Math.max(0, tabRows - 1) * tabGap;
    const contentLeft = verticalTabs
      ? left + 96
      : left + 34;
    const contentTop = verticalTabs
      ? top + 92
      : tabAreaTop + tabAreaHeight + 18;
    const bodyWidth = verticalTabs
      ? layout.panelWidth - 132
      : layout.panelWidth - 68;
    const closeY = center.y + layout.panelHeight / 2 - 44;
    const pageControlY = closeY - 44;
    const contentBottom = pageControlY - 22;
    const availableHeight = Math.max(80, contentBottom - contentTop);

    this.dimmer.setPosition(center.x, center.y);
    this.dimmer.setSize(this.screenManager.width, this.screenManager.height);
    this.panel.setPosition(center.x, center.y);
    this.panel.setSize(layout.panelWidth, layout.panelHeight);
    this.panelImage?.setPosition(center.x, center.y);
    this.coverImage(this.panelImage, layout.panelWidth, layout.panelHeight);
    this.title.setPosition(center.x, top + 42);
    this.title.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);
    this.layoutTabs(left, top, layout.panelWidth, layout.panelHeight, tabGap);
    this.layoutContent(contentLeft, contentTop, bodyWidth, availableHeight, layout.fontSize);
    this.layoutPageControls(center.x, pageControlY, closeY);
  }

  private layoutContent(
    contentLeft: number,
    contentTop: number,
    bodyWidth: number,
    availableHeight: number,
    fontSize: string,
  ): void {
    this.contentItems.forEach((item) => {
      this.updateContentItemMetrics(item, bodyWidth, fontSize);
    });

    const pages = this.buildPages(availableHeight);
    const tab = this.tabs[this.selectedTabIndex];
    const pageIndex = Phaser.Math.Clamp(this.pageByTab[tab.id] ?? 0, 0, Math.max(0, pages.length - 1));
    this.pageByTab[tab.id] = pageIndex;
    const page = pages[pageIndex] ?? { start: 0, end: this.contentItems.length };
    let y = contentTop;

    this.contentItems.forEach((item, index) => {
      const visible = index >= page.start && index < page.end;
      item.setVisible(visible);

      if (!visible) {
        return;
      }

      const type = item.getData('lineType') as HelpLine['type'];
      item.setPosition(contentLeft + (type === 'iconRow' ? 12 : 0), y);
      y += (item.getData('height') as number) + 7;
    });

    const pageCount = Math.max(1, pages.length);
    this.pageText.setText(`${I18n.t('settings.page')} ${pageIndex + 1}/${pageCount}`);
    this.setPagingButtonEnabled(this.prevPageButton, pageIndex > 0);
    this.setPagingButtonEnabled(this.nextPageButton, pageIndex < pageCount - 1);
  }

  private updateContentItemMetrics(
    item: Phaser.GameObjects.Container,
    bodyWidth: number,
    fontSize: string,
  ): void {
    const type = item.getData('lineType') as HelpLine['type'];
    for (const child of item.list) {
      if (child instanceof Phaser.GameObjects.Text) {
        child.setFontSize(type === 'subtitle' ? UITheme.bodyFontSize : fontSize);
        if (type === 'statRow' && child.x > 0) {
          child.setX(Math.min(150, Math.floor(bodyWidth * 0.34)));
          child.setWordWrapWidth(Math.max(160, bodyWidth - child.x));
        } else if (type !== 'subtitle') {
          child.setWordWrapWidth(Math.max(160, bodyWidth - (type === 'iconRow' ? 44 : 0)));
        }
      } else if (child instanceof Phaser.GameObjects.Rectangle && type === 'divider') {
        child.setSize(bodyWidth, 1);
      }
    }
  }

  private buildPages(availableHeight: number): PageRange[] {
    const pages: PageRange[] = [];
    let start = 0;
    let usedHeight = 0;

    this.contentItems.forEach((item, index) => {
      const height = (item.getData('height') as number) + 7;
      if (index > start && usedHeight + height > availableHeight) {
        pages.push({ start, end: index });
        start = index;
        usedHeight = 0;
      }

      usedHeight += height;
    });

    pages.push({ start, end: this.contentItems.length });
    return pages.filter((page) => page.end > page.start);
  }

  private layoutPageControls(centerX: number, pageControlY: number, closeY: number): void {
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const pageButtonWidth = Math.max(72, Math.floor(metrics.width * 0.58));
    this.prevPageButton.setPosition(centerX - pageButtonWidth - 54, pageControlY);
    this.nextPageButton.setPosition(centerX + pageButtonWidth + 54, pageControlY);
    this.pageText.setPosition(centerX, pageControlY);

    for (const button of [this.prevPageButton, this.nextPageButton]) {
      button.setFontSize(Math.max(11, Number.parseInt(`${metrics.fontSize}`, 10) - 1));
      button.setFixedSize(pageButtonWidth, Math.max(30, metrics.height - 8));
      button.setPadding(0, Math.max(0, Math.floor((Math.max(30, metrics.height - 8) - 22) / 2)), 0, 0);
    }

    this.closeButton.setPosition(centerX, closeY);
    this.closeButton.setFontSize(metrics.fontSize);
    this.closeButton.setFixedSize(metrics.width, metrics.height);
  }

  private setPagingButtonEnabled(button: Phaser.GameObjects.Text, enabled: boolean): void {
    button.setAlpha(enabled ? 1 : 0.35);
    button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
  }

  private changePage(scene: Phaser.Scene, delta: number): void {
    const tab = this.tabs[this.selectedTabIndex];
    this.pageByTab[tab.id] = Math.max(0, (this.pageByTab[tab.id] ?? 0) + delta);
    this.applyLayout();
  }

  private layoutTabs(
    left: number,
    top: number,
    panelWidth: number,
    panelHeight: number,
    gap: number,
  ): void {
    const verticalTabs = this.usesVerticalTabs(panelHeight);

    this.tabButtons.forEach((tab, index) => {
      const selected = index === this.selectedTabIndex;
      tab.background.setFillStyle(selected ? UITheme.buttonHoverColor : UITheme.buttonBgColor, 0.95);
      tab.background.setStrokeStyle(2, selected ? UITheme.colors.accentBlue : UITheme.panelBorderColor, selected ? 1 : 0.75);

      if (verticalTabs) {
        tab.container.setPosition(left + 46, top + 90 + index * (HelpOverlay.TAB_SIZE + gap));
        return;
      }

      const columns = Math.max(1, Math.floor((panelWidth - 56) / (HelpOverlay.TAB_SIZE + gap)));
      const row = Math.floor(index / columns);
      const column = index % columns;
      tab.container.setPosition(
        left + 32 + column * (HelpOverlay.TAB_SIZE + gap) + HelpOverlay.TAB_SIZE / 2,
        top + 82 + row * (HelpOverlay.TAB_SIZE + gap),
      );
    });
  }

  private usesVerticalTabs(panelHeight: number): boolean {
    return this.screenManager.isLandscape()
      && panelHeight >= 560
      && this.tabButtons.length * (HelpOverlay.TAB_SIZE + 8) <= panelHeight - 110;
  }

  private getTabRows(panelWidth: number, gap: number): number {
    const columns = Math.max(1, Math.floor((panelWidth - 56) / (HelpOverlay.TAB_SIZE + gap)));

    return Math.ceil(this.tabButtons.length / columns);
  }

  private getLineHeight(type: HelpLine['type']): number {
    switch (type) {
      case 'subtitle':
        return 28;
      case 'paragraph':
        return 48;
      case 'bullet':
      case 'iconRow':
        return 40;
      case 'statRow':
        return 36;
      case 'divider':
        return 10;
      case 'title':
      default:
        return 32;
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
}
