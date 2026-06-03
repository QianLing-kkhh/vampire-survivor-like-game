import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { UpgradeDisplayInfo } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { UITheme } from './UITheme';

type UpgradeSelectedHandler = (option: UpgradeOption) => void;
type UpgradeOptionView = UpgradeOption & {
  preview?: string;
  displayInfo?: UpgradeDisplayInfo;
};
export interface LevelUpPanelConfig {
  autoSelectOptionId?: string;
  autoSelectDelayMs?: number;
}

export class LevelUpPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly options: readonly UpgradeOptionView[];
  private readonly onSelected: UpgradeSelectedHandler;
  private readonly config: LevelUpPanelConfig;
  private unsubscribeResize?: () => void;
  private autoSelectTimer?: Phaser.Time.TimerEvent;

  constructor(
    scene: Phaser.Scene,
    options: readonly UpgradeOptionView[],
    onSelected: UpgradeSelectedHandler,
    config: LevelUpPanelConfig = {},
  ) {
    this.options = options;
    this.onSelected = onSelected;
    this.config = config;
    this.screenManager = new ScreenManager(scene);
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.layout(scene);
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.layout(scene);
    });
    this.scheduleAutoSelect(scene, options, onSelected, config);
  }

  destroy(): void {
    this.autoSelectTimer?.remove(false);
    this.autoSelectTimer = undefined;
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private layout(scene: Phaser.Scene): void {
    const layout = LayoutConfig.getLevelUpPanelLayout(this.screenManager);
    this.container.removeAll(true);
    this.container.setPosition(layout.panelCenter.x, layout.panelCenter.y);

    const background = scene.add.rectangle(0, 0, layout.panelWidth, layout.panelHeight, UITheme.panelBgColor, UITheme.levelUpPanelAlpha);
    background.setStrokeStyle(2, UITheme.panelBorderColor, 1);
    this.container.add(background);
    this.addPanelImage(scene, layout.panelWidth, layout.panelHeight);

    const title = scene.add.text(0, -layout.panelHeight / 2 + 32, I18n.t('levelUp.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    this.options.forEach((option, index) => {
      this.addOption(scene, option, index);
    });
  }

  private addOption(
    scene: Phaser.Scene,
    option: UpgradeOptionView,
    index: number,
  ): void {
    const layout = LayoutConfig.getLevelUpPanelLayout(this.screenManager);
    const totalWidth = layout.cardWidth * this.options.length
      + layout.cardGap * Math.max(0, this.options.length - 1);
    const totalHeight = layout.cardHeight * this.options.length
      + layout.cardGap * Math.max(0, this.options.length - 1);
    const x = layout.layoutMode === 'horizontal'
      ? -totalWidth / 2 + layout.cardWidth / 2 + index * (layout.cardWidth + layout.cardGap)
      : 0;
    const y = layout.layoutMode === 'vertical'
      ? -totalHeight / 2 + layout.cardHeight / 2 + index * (layout.cardHeight + layout.cardGap) + 26
      : 28;
    const optionBackground = scene.add.rectangle(x, y, layout.cardWidth, layout.cardHeight, UITheme.buttonBgColor, 1);
    optionBackground.setStrokeStyle(1, UITheme.panelBorderColor, 1);
    optionBackground.setInteractive({ useHandCursor: true });

    const name = scene.add.text(x - layout.cardWidth / 2 + 18, y - layout.cardHeight / 2 + 16, option.name, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.fontSize,
      fontStyle: 'bold',
      wordWrap: { width: layout.cardWidth - 36 },
    });

    const rowStartY = y - layout.cardHeight / 2 + 48;
    option.displayInfo?.rows.slice(0, 3).forEach((row, rowIndex) => {
      this.addInfoRow(
        scene,
        x - layout.cardWidth / 2 + 18,
        rowStartY + rowIndex * 24,
        layout.cardWidth - 36,
        row,
      );
    });
    const previewY = rowStartY + Math.max(1, option.displayInfo?.rows.length ?? 0) * 24 + 4;
    const description = scene.add.text(x - layout.cardWidth / 2 + 18, y - layout.cardHeight / 2 + 48, option.preview ?? option.description, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.descriptionFontSize,
      lineSpacing: 4,
      wordWrap: { width: layout.cardWidth - 36 },
    });
    description.setPosition(x - layout.cardWidth / 2 + 18, option.displayInfo ? previewY : y - layout.cardHeight / 2 + 48);

    optionBackground.on('pointerover', () => {
      optionBackground.setFillStyle(UITheme.buttonHoverColor, 1);
    });

    optionBackground.on('pointerout', () => {
      optionBackground.setFillStyle(UITheme.buttonBgColor, 1);
    });

    optionBackground.on('pointerdown', () => {
      AudioManager.playUi(scene, 'ui_click');
      AudioManager.playSfx(scene, 'upgrade_selected');
      this.onSelected(option);
    });

    this.container.add([optionBackground, name, description]);
  }

  private addPanelImage(
    scene: Phaser.Scene,
    width: number,
    height: number,
  ): void {
    if (!scene.textures.exists('art_ui_levelup_panel_bg')) {
      return;
    }

    const image = scene.add.image(0, 0, 'art_ui_levelup_panel_bg');
    const frame = image.texture.get();
    image.setScale(Math.max(width / frame.width, height / frame.height));
    image.setAlpha(UITheme.levelUpPanelAlpha);
    this.container.add(image);
  }

  private addInfoRow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    row: { iconKey?: string; fallback: string; text: string },
  ): void {
    const iconBackground = scene.add.rectangle(x + 10, y + 10, 20, 20, UITheme.iconBgColor, 0.8);
    iconBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.45);
    this.container.add(iconBackground);

    if (row.iconKey && scene.textures.exists(row.iconKey)) {
      const icon = scene.add.image(x + 10, y + 10, row.iconKey);
      icon.setDisplaySize(16, 16);
      this.container.add(icon);
    } else {
      const fallback = scene.add.text(x + 10, y + 10, row.fallback, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '10px',
        fontStyle: 'bold',
      });
      fallback.setOrigin(0.5);
      this.container.add(fallback);
    }

    const text = scene.add.text(x + 26, y + 1, row.text, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
      wordWrap: { width: width - 30 },
    });
    this.container.add(text);
  }

  private scheduleAutoSelect(
    scene: Phaser.Scene,
    options: readonly UpgradeOptionView[],
    onSelected: UpgradeSelectedHandler,
    config: LevelUpPanelConfig,
  ): void {
    if (!config.autoSelectOptionId || config.autoSelectDelayMs === undefined) {
      return;
    }

    const selectedOption = options.find((option) => option.id === config.autoSelectOptionId);

    if (!selectedOption) {
      return;
    }

    this.autoSelectTimer = scene.time.delayedCall(config.autoSelectDelayMs, () => {
      AudioManager.playSfx(scene, 'upgrade_selected');
      onSelected(selectedOption);
    });
  }
}
