import Phaser from 'phaser';

import { AssetFallbacks } from '../assets/AssetFallbacks';
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

    if (options.length === 0) {
      scene.time.delayedCall(900, () => {
        this.destroy();
      });
      return;
    }

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

    if (this.options.length === 0) {
      const emptyText = scene.add.text(0, 8, 'No upgrades available', {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: layout.fontSize,
      });
      emptyText.setOrigin(0.5);
      this.container.add(emptyText);
      return;
    }

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
    this.container.add(optionBackground);

    const label = scene.add.text(x, y - layout.cardHeight / 2 + 16, this.getOptionLabel(option), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.fontSize,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: layout.cardWidth - 28 },
    });
    label.setOrigin(0.5, 0);

    const visibleRows = option.displayInfo?.rows.slice(0, this.screenManager.isPortrait() ? 3 : 4) ?? [];
    const iconStartY = y - layout.cardHeight / 2 + 46;
    const previewY = option.displayInfo
      ? this.addIconSummary(scene, x, iconStartY, layout.cardWidth, visibleRows) + 8
      : y - layout.cardHeight / 2 + 50;
    const descriptionHeight = y + layout.cardHeight / 2 - previewY - 12;
    const description = scene.add.text(x - layout.cardWidth / 2 + 18, previewY, option.preview ?? option.description, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.descriptionFontSize,
      align: 'center',
      lineSpacing: this.screenManager.isPortrait() ? 2 : 4,
      wordWrap: { width: layout.cardWidth - 36 },
    });
    description.setMaxLines(Math.max(1, Math.floor(descriptionHeight / 16)));

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

    this.container.add([label, description]);
  }

  private addIconSummary(
    scene: Phaser.Scene,
    centerX: number,
    startY: number,
    cardWidth: number,
    rows: Array<{ iconKey?: string; fallback: string; text: string }>,
  ): number {
    const mainRow = rows[0];

    if (!mainRow) {
      return startY;
    }

    const mainIconSize = this.screenManager.isPortrait() ? 42 : 54;
    const auxIconSize = this.screenManager.isPortrait() ? 28 : 34;
    const mainY = startY + mainIconSize / 2;

    this.addIcon(scene, centerX, mainY, mainIconSize, mainRow);
    const mainLevel = scene.add.text(centerX, mainY + mainIconSize / 2 + 4, this.getLevelText(mainRow), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.screenManager.isPortrait() ? '11px' : '12px',
      align: 'center',
    });
    mainLevel.setOrigin(0.5, 0);
    this.container.add(mainLevel);

    const auxRows = rows.slice(1, this.screenManager.isPortrait() ? 3 : 4);
    const auxY = mainY + mainIconSize / 2 + 34;
    const auxGap = 12;
    const totalAuxWidth = auxRows.length * auxIconSize + Math.max(0, auxRows.length - 1) * auxGap;
    const auxStartX = centerX - totalAuxWidth / 2 + auxIconSize / 2;

    auxRows.forEach((row, index) => {
      const iconX = auxStartX + index * (auxIconSize + auxGap);
      this.addIcon(scene, iconX, auxY, auxIconSize, row);
      const level = scene.add.text(iconX, auxY + auxIconSize / 2 + 3, this.getLevelText(row), {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '10px',
        align: 'center',
        wordWrap: { width: Math.min(76, cardWidth / Math.max(1, auxRows.length)) },
      });
      level.setOrigin(0.5, 0);
      level.setMaxLines(1);
      this.container.add(level);
    });

    return auxRows.length > 0
      ? auxY + auxIconSize / 2 + 18
      : mainY + mainIconSize / 2 + 22;
  }

  private addIcon(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    row: { iconKey?: string; fallback: string; text: string },
  ): void {
    const iconBackground = scene.add.rectangle(x, y, size, size, UITheme.iconBgColor, 0.85);
    iconBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);
    this.container.add(iconBackground);

    if (AssetFallbacks.hasTexture(scene, row.iconKey)) {
      const icon = scene.add.image(x, y, row.iconKey);
      icon.setDisplaySize(size * 0.78, size * 0.78);
      this.container.add(icon);
      return;
    }

    const fallback = scene.add.text(x, y, row.fallback, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: `${Math.max(10, Math.floor(size * 0.28))}px`,
      fontStyle: 'bold',
      align: 'center',
    });
    fallback.setOrigin(0.5);
    this.container.add(fallback);
  }

  private getLevelText(row: { text: string }): string {
    return /(Lv\.\d+\s*\/\s*\d+)/.exec(row.text)?.[1] ?? row.text;
  }

  private getOptionLabel(option: UpgradeOptionView): string {
    const identityName = option.displayInfo?.rows[0]?.text.replace(/\s+Lv\..*$/, '').trim();
    let label = option.name;

    if (identityName) {
      label = label.replace(new RegExp(`^${this.escapeRegExp(identityName)}\\s+`, 'i'), '');
    }

    label = label
      .replace(/\b(Knife|Axe|Magic Wand|Garlic|Bible|Thousand Edge|Holy Wand|Death Spiral|Unholy Vespers|Soul Eater|Spinach|Empty Tome|Bracer|Clover|Pummarola)\b\s*/gi, '')
      .trim();

    if (/^add_/i.test(option.id)) {
      return 'New Weapon';
    }

    return label || 'Upgrade';
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    if (AssetFallbacks.hasTexture(scene, row.iconKey)) {
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
    text.setText(this.formatIconRowText(row, scene));
    this.container.add(text);
  }

  private formatIconRowText(
    row: { iconKey?: string; fallback: string; text: string },
    scene: Phaser.Scene,
  ): string {
    if (!AssetFallbacks.hasTexture(scene, row.iconKey)) {
      return row.text;
    }

    const levelMatch = /(Lv\.\d+\s*\/\s*\d+)/.exec(row.text);

    if (levelMatch) {
      return levelMatch[1];
    }

    return row.text
      .replace(/^[A-Za-z ]+:\s*/, '')
      .replace(/^[A-Za-z ]+\s+/, '');
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
