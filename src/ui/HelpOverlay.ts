import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { HelpContentBuilder } from '../help/HelpContentBuilder';
import { HelpSection } from '../help/HelpTab';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type TabButton = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  section: HelpSection;
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
  private readonly sections: HelpSection[];
  private readonly tabButtons: TabButton[] = [];
  private readonly contentItems: Phaser.GameObjects.Container[] = [];
  private selectedSectionIndex = 0;
  private unsubscribeResize?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.screenManager = new ScreenManager(scene);
    this.sections = new HelpContentBuilder().buildSections();
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

    this.closeButton = scene.add.text(0, 0, 'Close', {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      align: 'center',
      fixedWidth: getButtonMetrics(scene.scale.width, scene.scale.height).width,
      fixedHeight: getButtonMetrics(scene.scale.width, scene.scale.height).height,
      padding: {
        x: 0,
        y: Math.max(0, Math.floor((getButtonMetrics(scene.scale.width, scene.scale.height).height - 22) / 2)),
      },
    });
    this.closeButton.setOrigin(0.5);
    this.closeButton.setInteractive({ useHandCursor: true });
    this.closeButton.on('pointerover', () => {
      this.closeButton.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    this.closeButton.on('pointerout', () => {
      this.closeButton.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    this.closeButton.on('pointerdown', () => {
      AudioManager.playUi(scene, 'ui_click');
      this.destroy();
      onClose?.();
    });

    this.container.add([
      this.dimmer,
      this.panel,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
      this.closeButton,
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

  private createTabs(scene: Phaser.Scene): void {
    for (const section of this.sections) {
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

      if (section.iconKey && scene.textures.exists(section.iconKey)) {
        const icon = scene.add.image(0, -3, section.iconKey);
        icon.setDisplaySize(28, 28);
        tab.add(icon);
      } else {
        const fallback = scene.add.text(0, -5, section.fallback, {
          color: UITheme.textColor,
          fontFamily: UITheme.fontFamily,
          fontSize: '12px',
          fontStyle: 'bold',
        });
        fallback.setOrigin(0.5);
        tab.add(fallback);
      }

      const shortLabel = scene.add.text(0, 13, section.fallback, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '9px',
      });
      shortLabel.setOrigin(0.5);
      tab.add(shortLabel);

      background.on('pointerdown', () => {
        AudioManager.playUi(scene, 'ui_click');
        this.selectedSectionIndex = this.sections.indexOf(section);
        this.renderContent(scene);
        this.applyLayout();
      });

      this.tabButtons.push({ container: tab, background, section });
      this.container.add(tab);
    }
  }

  private renderContent(scene: Phaser.Scene): void {
    for (const item of this.contentItems) {
      item.destroy();
    }

    this.contentItems.length = 0;
    const section = this.sections[this.selectedSectionIndex];
    this.title.setText(section.title);

    for (const line of section.lines) {
      const row = scene.add.container(0, 0);
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
        const fallback = scene.add.text(0, 0, line.fallback, {
          color: UITheme.textColor,
          fontFamily: UITheme.fontFamily,
          fontSize: '10px',
          fontStyle: 'bold',
        });
        fallback.setOrigin(0.5);
        row.add(fallback);
      }

      const text = scene.add.text(20, -9, line.text, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        wordWrap: { width: 520 },
      });
      row.add(text);
      this.contentItems.push(row);
      this.container.add(row);
    }
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
    const contentBottom = center.y + layout.panelHeight / 2 - 82;
    const rowGap = this.screenManager.isPortrait() ? 30 : 32;
    const maxRows = Math.max(1, Math.floor((contentBottom - contentTop) / rowGap));

    this.dimmer.setPosition(center.x, center.y);
    this.dimmer.setSize(this.screenManager.width, this.screenManager.height);
    this.panel.setPosition(center.x, center.y);
    this.panel.setSize(layout.panelWidth, layout.panelHeight);
    this.panelImage?.setPosition(center.x, center.y);
    this.coverImage(this.panelImage, layout.panelWidth, layout.panelHeight);
    this.title.setPosition(center.x, top + 42);
    this.title.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);
    this.layoutTabs(left, top, layout.panelWidth, layout.panelHeight, tabGap);

    this.contentItems.forEach((item, index) => {
      if (index >= maxRows) {
        item.setVisible(false);
        return;
      }

      item.setVisible(true);
      item.setPosition(contentLeft + 12, contentTop + index * rowGap);

      const text = item.list
        .find((child) => child instanceof Phaser.GameObjects.Text && child.x === 20);

      if (text instanceof Phaser.GameObjects.Text) {
        text.setFontSize(layout.fontSize);
        text.setWordWrapWidth(bodyWidth - 44);
      }
    });

    if (this.contentItems.length > maxRows) {
      this.showOverflowHint(contentLeft, contentTop + (maxRows - 1) * rowGap, bodyWidth);
    }

    this.closeButton.setPosition(center.x, center.y + layout.panelHeight / 2 - 44);
    this.closeButton.setFontSize(getButtonMetrics(this.screenManager.width, this.screenManager.height).fontSize);
    this.closeButton.setFixedSize(
      getButtonMetrics(this.screenManager.width, this.screenManager.height).width,
      getButtonMetrics(this.screenManager.width, this.screenManager.height).height,
    );
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
      const selected = index === this.selectedSectionIndex;
      tab.background.setFillStyle(selected ? UITheme.buttonHoverColor : UITheme.buttonBgColor, 0.95);
      tab.background.setStrokeStyle(2, selected ? 0x22c55e : UITheme.panelBorderColor, selected ? 1 : 0.75);

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
      && panelHeight >= 460
      && this.tabButtons.length * (HelpOverlay.TAB_SIZE + 8) <= panelHeight - 110;
  }

  private getTabRows(panelWidth: number, gap: number): number {
    const columns = Math.max(1, Math.floor((panelWidth - 56) / (HelpOverlay.TAB_SIZE + gap)));

    return Math.ceil(this.tabButtons.length / columns);
  }

  private showOverflowHint(x: number, y: number, width: number): void {
    const lastVisibleItem = this.contentItems.find((item) => item.visible);

    if (!lastVisibleItem) {
      return;
    }

    const text = lastVisibleItem.list
      .find((child) => child instanceof Phaser.GameObjects.Text && child.x === 20);

    if (text instanceof Phaser.GameObjects.Text) {
      text.setText('...');
      text.setWordWrapWidth(width - 44);
    }

    lastVisibleItem.setPosition(x + 12, y);
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
