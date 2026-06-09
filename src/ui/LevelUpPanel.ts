import Phaser from 'phaser';

import { AssetFallbacks } from '../assets/AssetFallbacks';
import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { UpgradeDisplayInfo } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIBadge } from './components/UIBadge';
import { UICard } from './components/UICard';
import { UIIconFrame } from './components/UIIconFrame';
import { UIStatRow } from './components/UIStatRow';
import { attachIconTooltip } from './tooltip/UITooltipManager';
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

    const frame = PanelFrame.create(scene, {
      x: 0,
      y: 0,
      width: layout.panelWidth,
      height: layout.panelHeight,
      alpha: UITheme.levelUpPanelAlpha,
      variant: 'modal',
      dim: true,
    });
    this.container.add(frame);
    this.addPanelImage(scene, layout.panelWidth, layout.panelHeight);

    const header = PanelHeader.create(scene, {
      x: 0,
      y: -layout.panelHeight / 2 + 40,
      width: layout.panelWidth,
      title: I18n.t('levelUp.title').toUpperCase(),
      subtitle: I18n.t('levelUp.chooseUpgrade'),
    });
    this.container.add(header);

    if (this.options.length === 0) {
      const emptyText = scene.add.text(0, 8, I18n.t('levelUp.emptyMessage'), {
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
      ? -totalHeight / 2 + layout.cardHeight / 2 + index * (layout.cardHeight + layout.cardGap) + 58
      : 42;
    const card = new UICard(scene, {
      x,
      y,
      width: layout.cardWidth,
      height: layout.cardHeight,
      onClick: () => {
        AudioManager.playSfx(scene, 'upgrade_selected');
        this.onSelected(option);
      },
    });
    this.container.add(card.container);
    attachIconTooltip(scene, card.container, {
      kind: 'generic',
      id: option.id,
      title: this.getOptionLabel(option),
      descriptionKey: 'tooltip.generic.upgradeIcon',
    }, { lockOnClick: false });

    const badge = UIBadge.create(
      scene,
      x - layout.cardWidth / 2 + 56,
      y - layout.cardHeight / 2 + 20,
      this.getOptionKind(option),
      this.getOptionKindColor(option),
    );
    this.container.add(badge);

    const label = scene.add.text(x, y - layout.cardHeight / 2 + (layout.layoutMode === 'vertical' ? 32 : 40), this.getOptionLabel(option), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.fontSize,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: layout.cardWidth - 28 },
    });
    label.setOrigin(0.5, 0);

    const visibleRows = option.displayInfo?.rows.slice(0, this.screenManager.isPortrait() ? 3 : 4) ?? [];
    const iconStartY = y - layout.cardHeight / 2 + (layout.layoutMode === 'vertical' ? 58 : 76);
    const previewY = option.displayInfo
      ? this.addIconSummary(scene, x, iconStartY, layout.cardWidth, visibleRows) + 8
      : y - layout.cardHeight / 2 + 84;
    const deltaRowCount = Math.min(visibleRows.length, this.screenManager.isPortrait() ? 1 : 2);
    const statRowsTop = y + layout.cardHeight / 2 - 20 - Math.max(0, deltaRowCount - 1) * 30;
    const descriptionHeight = statRowsTop - previewY - 6;
    const description = scene.add.text(x - layout.cardWidth / 2 + 18, previewY, option.preview ?? option.description, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.descriptionFontSize,
      align: 'center',
      lineSpacing: this.screenManager.isPortrait() ? 2 : 4,
      wordWrap: { width: layout.cardWidth - 36 },
    });
    description.setMaxLines(Math.max(1, Math.floor(Math.max(16, descriptionHeight) / (this.screenManager.isPortrait() ? 14 : 17))));
    this.addDeltaRows(scene, x, statRowsTop, layout.cardWidth, visibleRows);
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

    const mainLevel = this.getLevelText(mainRow);
    this.addIcon(scene, centerX, mainY, mainIconSize, mainRow, mainLevel.startsWith('Lv') ? mainLevel : undefined);

    const auxRows = rows.slice(1, this.screenManager.isPortrait() ? 3 : 4);
    const auxY = mainY + mainIconSize / 2 + 34;
    const auxGap = 12;
    const totalAuxWidth = auxRows.length * auxIconSize + Math.max(0, auxRows.length - 1) * auxGap;
    const auxStartX = centerX - totalAuxWidth / 2 + auxIconSize / 2;

    auxRows.forEach((row, index) => {
      const iconX = auxStartX + index * (auxIconSize + auxGap);
      const levelText = this.getLevelText(row);
      this.addIcon(scene, iconX, auxY, auxIconSize, row, levelText.startsWith('Lv') ? levelText : undefined);
    });

    return auxRows.length > 0
      ? auxY + auxIconSize / 2 + 10
      : mainY + mainIconSize / 2 + 12;
  }

  private addIcon(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    row: { iconKey?: string; fallback: string; text: string },
    levelText?: string,
  ): void {
    const icon = UIIconFrame.create(scene, {
      x,
      y,
      size,
      textureKey: AssetFallbacks.hasTexture(scene, row.iconKey) ? row.iconKey : null,
      fallback: row.fallback,
      levelText,
      tooltip: {
        kind: 'generic',
        id: row.text,
        title: this.getTooltipTitle(row.text),
        descriptionKey: 'tooltip.generic.upgradeIcon',
      },
      tooltipLockOnClick: false,
      tooltipEnabled: false,
    });
    this.container.add(icon);
  }

  private getTooltipTitle(text: string): string {
    return text
      .replace(/\s+Lv\..*$/i, '')
      .replace(/\s+\d+\s*\/\s*\d+.*$/i, '')
      .trim() || I18n.t('levelUp.upgrade');
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
      return I18n.t('levelUp.newWeapon');
    }

    return label || I18n.t('levelUp.upgrade');
  }

  private getOptionKind(option: UpgradeOptionView): string {
    if (/evol/i.test(option.id) || /evol/i.test(option.name)) {
      return I18n.t('ui.evolution');
    }

    if (/passive|spinach|tome|bracer|clover|pummarola/i.test(option.id)) {
      return I18n.t('ui.passive');
    }

    if (/stat|endless|shield|speed|damage|cooldown|growth/i.test(option.id)) {
      return I18n.t('ui.stat');
    }

    return /^add_/i.test(option.id) ? I18n.t('ui.new') : I18n.t('ui.weapon');
  }

  private getOptionKindColor(option: UpgradeOptionView): number {
    const kind = this.getOptionKind(option);

    if (kind === I18n.t('ui.passive')) {
      return UITheme.colors.accentGold;
    }

    if (kind === I18n.t('ui.stat')) {
      return UITheme.successAccentColor;
    }

    return UITheme.colors.accentBlue;
  }

  private addDeltaRows(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    cardWidth: number,
    rows: Array<{ text: string }>,
  ): void {
    const visible = rows.slice(0, this.screenManager.isPortrait() ? 1 : 2);
    const rowWidth = cardWidth - 30;

    visible.forEach((row, index) => {
      const parsed = this.parseDeltaRow(row.text);
      const statRow = UIStatRow.create(
        scene,
        centerX,
        y + index * 30,
        rowWidth,
        parsed.label,
        parsed.value,
      );
      this.container.add(statRow);
    });
  }

  private parseDeltaRow(text: string): { label: string; value: string } {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (/no matching weapon owned/i.test(clean)) {
      return { label: I18n.t('ui.weapon'), value: '-' };
    }

    const levelMatch = /(Lv\.\d+\s*\/\s*\d+)/.exec(clean);
    if (levelMatch) {
      return {
        label: this.getDeltaLabel(clean),
        value: levelMatch[1].replace(/\s+/g, ''),
      };
    }

    const arrowMatch = /^(.+?)\s*(?:->|→)\s*(.+)$/.exec(clean);
    if (arrowMatch) {
      return {
        label: this.compactDeltaLabel(arrowMatch[1]),
        value: arrowMatch[2],
      };
    }

    const signMatch = /^(.+?)\s+([+\-].+)$/.exec(clean);
    if (signMatch) {
      return {
        label: this.compactDeltaLabel(signMatch[1]),
        value: signMatch[2],
      };
    }

    return {
      label: I18n.t('ui.stat'),
      value: this.compactDeltaValue(clean),
    };
  }

  private getDeltaLabel(text: string): string {
    if (/\b(Knife|Axe|Magic Wand|Garlic|Bible|Thousand Edge|Holy Wand|Death Spiral|Unholy Vespers|Soul Eater)\b/i.test(text)) {
      return I18n.t('ui.weapon');
    }

    if (/\b(Spinach|Empty Tome|Bracer|Clover|Pummarola)\b/i.test(text)) {
      return I18n.t('ui.passive');
    }

    return I18n.t('ui.stat');
  }

  private compactDeltaLabel(value: string): string {
    return value
      .replace(/\b(Knife|Axe|Magic Wand|Garlic|Bible|Thousand Edge|Holy Wand|Death Spiral|Unholy Vespers|Soul Eater|Spinach|Empty Tome|Bracer|Clover|Pummarola)\b/gi, '')
      .replace(/[:：]/g, '')
      .trim()
      || I18n.t('ui.stat');
  }

  private compactDeltaValue(value: string): string {
    return value
      .replace(/\b(Knife|Axe|Magic Wand|Garlic|Bible|Thousand Edge|Holy Wand|Death Spiral|Unholy Vespers|Soul Eater|Spinach|Empty Tome|Bracer|Clover|Pummarola)\b/gi, '')
      .trim()
      || '-';
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
