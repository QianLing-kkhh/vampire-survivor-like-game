import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

export class HelpOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly dimmer: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly closeButton: Phaser.GameObjects.Text;
  private unsubscribeResize?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.screenManager = new ScreenManager(scene);
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(1400);

    this.dimmer = scene.add.rectangle(
      centerX,
      centerY,
      scene.scale.width,
      scene.scale.height,
      0x000000,
      0.48,
    );
    this.dimmer.setInteractive();

    this.panel = scene.add.rectangle(
      centerX,
      centerY,
      720,
      500,
      UITheme.panelBgColor,
      0.96,
    );
    this.panel.setStrokeStyle(2, UITheme.panelBorderColor, 0.9);
    this.panel.setAlpha(scene.textures.exists('art_ui_help_panel_bg') ? 0.25 : 0.96);
    this.panelImage = scene.textures.exists('art_ui_help_panel_bg')
      ? scene.add.image(centerX, centerY, 'art_ui_help_panel_bg')
      : undefined;
    this.panelImage?.setAlpha(UITheme.helpPanelAlpha);

    this.title = scene.add.text(centerX, centerY - 205, I18n.t('help.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);

    this.body = scene.add.text(
      centerX - 300,
      centerY - 150,
      [
        I18n.t('help.moveKeyboard'),
        I18n.t('help.moveMouse'),
        I18n.t('help.pause'),
        I18n.t('help.collectExp'),
        I18n.t('help.chooseUpgrade'),
        I18n.t('help.openTreasure'),
        I18n.t('help.evolution'),
        I18n.t('help.surviveBoss'),
        I18n.t('help.defeatBoss'),
      ],
      {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.bodyFontSize,
        lineSpacing: 8,
      },
    );

    this.closeButton = scene.add.text(centerX, centerY + 205, I18n.t('common.close'), {
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
      this.body,
      this.closeButton,
    ]);
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

  private applyLayout(): void {
    const layout = LayoutConfig.getHelpLayout(this.screenManager);
    const center = layout.panelCenter;

    this.dimmer.setPosition(center.x, center.y);
    this.dimmer.setSize(this.screenManager.width, this.screenManager.height);
    this.panel.setPosition(center.x, center.y);
    this.panel.setSize(layout.panelWidth, layout.panelHeight);
    this.panelImage?.setPosition(center.x, center.y);
    this.coverImage(this.panelImage, layout.panelWidth, layout.panelHeight);
    this.title.setPosition(center.x, center.y - layout.panelHeight / 2 + 42);
    this.title.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);
    this.body.setPosition(center.x - layout.bodyWidth / 2, center.y - layout.panelHeight / 2 + 88);
    this.body.setFontSize(layout.fontSize);
    this.body.setLineSpacing(this.screenManager.isPortrait() ? 5 : 8);
    this.body.setWordWrapWidth(layout.bodyWidth);
    this.body.setMaxLines(this.screenManager.isPortrait() ? 9 : 12);
    this.closeButton.setPosition(center.x, center.y + layout.panelHeight / 2 - 44);
    this.closeButton.setFontSize(getButtonMetrics(this.screenManager.width, this.screenManager.height).fontSize);
    this.closeButton.setFixedSize(
      getButtonMetrics(this.screenManager.width, this.screenManager.height).width,
      getButtonMetrics(this.screenManager.width, this.screenManager.height).height,
    );
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
