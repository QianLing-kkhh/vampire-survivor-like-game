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
import { UITextBlock } from './components/UITextBlock';
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
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
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
      y: -layout.panelHeight / 2 + (tiny ? 28 : compact ? 32 : 40),
      width: Math.max(220, layout.panelWidth - (compact ? 42 : 56)),
      title: I18n.t('levelUp.title').toUpperCase(),
      subtitle: I18n.t('levelUp.chooseUpgrade'),
      titleFontSize: tiny ? '22px' : compact ? '24px' : undefined,
      subtitleFontSize: tiny ? '10px' : compact ? '11px' : undefined,
    });
    this.container.add(header);

    if (this.options.length === 0) {
      const emptyText = new UITextBlock(scene, {
        x: 0,
        y: 8,
        text: I18n.t('levelUp.emptyMessage'),
        fontSize: layout.fontSize,
        align: 'center',
      }).text;
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
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const totalWidth = layout.cardWidth * this.options.length
      + layout.cardGap * Math.max(0, this.options.length - 1);
    const totalHeight = layout.cardHeight * this.options.length
      + layout.cardGap * Math.max(0, this.options.length - 1);
    const x = layout.layoutMode === 'horizontal'
      ? -totalWidth / 2 + layout.cardWidth / 2 + index * (layout.cardWidth + layout.cardGap)
      : 0;
    const y = layout.layoutMode === 'vertical'
      ? -totalHeight / 2 + layout.cardHeight / 2 + index * (layout.cardHeight + layout.cardGap) + (tiny ? 40 : 46)
      : compact ? 34 : 42;
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
      x - layout.cardWidth / 2 + (tiny ? 42 : 52),
      y - layout.cardHeight / 2 + (tiny ? 16 : 20),
      this.getOptionKind(option),
      this.getOptionKindColor(option),
    );
    this.container.add(badge);

    const cardTop = y - layout.cardHeight / 2;
    const cardBottom = y + layout.cardHeight / 2;
    const titleY = cardTop + (layout.layoutMode === 'vertical' ? tiny ? 24 : 28 : compact ? 30 : 34);
    const titleBlockHeight = layout.layoutMode === 'vertical'
      ? tiny ? 28 : 32
      : compact ? 34 : 40;
    const label = new UITextBlock(scene, {
      x,
      y: titleY,
      text: this.getOptionLabel(option),
      fontSize: layout.fontSize,
      fontStyle: 'bold',
      align: 'center',
      width: layout.cardWidth - (tiny ? 24 : 30),
    }).text;
    label.setOrigin(0.5, 0);

    const portrait = this.screenManager.isPortrait();
    const visibleRows = option.displayInfo?.rows.slice(0, portrait ? 2 : compact ? 3 : 4) ?? [];
    const footerRows = option.displayInfo?.rows.slice(0, 1) ?? [];
    const iconStartY = Math.max(
      titleY + titleBlockHeight,
      cardTop + (layout.layoutMode === 'vertical' ? tiny ? 44 : 50 : compact ? 58 : 68),
    );
    const previewY = option.displayInfo
      ? this.addIconSummary(scene, x, iconStartY, layout.cardWidth, visibleRows) + 8
      : iconStartY + (layout.layoutMode === 'vertical' ? 38 : 48);
    const deltaRowCount = Math.min(footerRows.length, 1);
    const statRowHeight = tiny ? 17 : compact ? 19 : 21;
    const statRowsTop = cardBottom - statRowHeight / 2 - (tiny ? 7 : 9) - Math.max(0, deltaRowCount - 1) * (statRowHeight + 4);
    const descriptionHeight = statRowsTop - previewY - 6;
    label.setMaxLines(2);
    const descriptionMinHeight = tiny ? 12 : portrait ? 14 : 16;
    const description = descriptionHeight >= descriptionMinHeight
      ? new UITextBlock(scene, {
        x: x - layout.cardWidth / 2 + (tiny ? 14 : 18),
        y: previewY,
        text: option.preview ?? option.description,
        tone: 'muted',
        fontSize: layout.descriptionFontSize,
        align: 'left',
        lineSpacing: tiny ? 0 : portrait ? 1 : 2,
        width: layout.cardWidth - (tiny ? 28 : 36),
      }).text
      : undefined;
    description?.setMaxLines(Math.max(1, Math.floor(descriptionHeight / (portrait ? 13 : 15))));
    this.addDeltaRows(scene, x, statRowsTop, layout.cardWidth, footerRows, statRowHeight);
    this.container.add(description ? [label, description] : [label]);
  }

  private addIconSummary(
    scene: Phaser.Scene,
    centerX: number,
    startY: number,
    cardWidth: number,
    rows: Array<{ iconKey?: string; iconFallbackKeys?: string[]; fallback: string; text: string }>,
  ): number {
    const mainRow = rows[0];

    if (!mainRow) {
      return startY;
    }

    const portrait = this.screenManager.isPortrait();
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const mainIconSize = portrait ? tiny ? 30 : 34 : compact ? 40 : 48;
    const auxIconSize = portrait ? 20 : compact ? 26 : 30;
    const mainY = startY + mainIconSize / 2;

    const mainLevel = this.getLevelText(mainRow);
    this.addIcon(scene, centerX, mainY, mainIconSize, mainRow, mainLevel.startsWith('Lv') ? mainLevel : undefined);

    const auxRows = portrait ? [] : rows.slice(1, 4);
    const auxY = mainY + mainIconSize / 2 + (compact ? 26 : 34);
    const auxGap = compact ? 8 : 12;
    const totalAuxWidth = auxRows.length * auxIconSize + Math.max(0, auxRows.length - 1) * auxGap;
    const auxStartX = centerX - totalAuxWidth / 2 + auxIconSize / 2;

    auxRows.forEach((row, index) => {
      const iconX = auxStartX + index * (auxIconSize + auxGap);
      const levelText = this.getLevelText(row);
      this.addIcon(scene, iconX, auxY, auxIconSize, row, levelText.startsWith('Lv') ? levelText : undefined);
    });

    return auxRows.length > 0
      ? auxY + auxIconSize / 2 + (compact ? 6 : 8)
      : mainY + mainIconSize / 2 + (compact ? 6 : 8);
  }

  private addIcon(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    row: { iconKey?: string; iconFallbackKeys?: string[]; fallback: string; text: string },
    levelText?: string,
  ): void {
    const icon = UIIconFrame.create(scene, {
      x,
      y,
      size,
      textureKey: this.resolveIconKey(scene, row),
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
    const match = /Lv\.(\d+)\s*\/\s*(\d+)/.exec(row.text);
    if (!match) {
      return row.text;
    }

    return this.formatLevelText(Number(match[1]), Number(match[2]));
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
    rowHeight: number,
  ): void {
    const visible = rows.slice(0, this.screenManager.isPortrait() ? 1 : 2);
    const rowWidth = cardWidth - 30;
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';

    visible.forEach((row, index) => {
      const parsed = this.parseDeltaRow(row.text);
      const statRow = UIStatRow.create(
        scene,
        centerX,
        y + index * (rowHeight + 4),
        rowWidth,
        parsed.label,
        parsed.value,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          backgroundAlpha: 0.32,
          borderAlpha: 0.18,
          labelRatio: 0.38,
        },
      );
      this.container.add(statRow);
    });
  }

  private resolveIconKey(
    scene: Phaser.Scene,
    row: { iconKey?: string; iconFallbackKeys?: string[] },
  ): string | null {
    return [
      row.iconKey,
      ...(row.iconFallbackKeys ?? []),
    ].find((key) => AssetFallbacks.hasTexture(scene, key)) ?? null;
  }

  private parseDeltaRow(text: string): { label: string; value: string } {
    const clean = text.replace(/\u2192/g, '->').replace(/\s+/g, ' ').trim();
    if (/no matching weapon owned/i.test(clean)) {
      return { label: I18n.t('ui.weapon'), value: '-' };
    }

    const levelMatch = /Lv\.(\d+)\s*\/\s*(\d+)/.exec(clean);
    if (levelMatch) {
      return {
        label: this.getDeltaLabel(clean),
        value: this.formatLevelText(Number(levelMatch[1]), Number(levelMatch[2])),
      };
    }

    const arrowMatch = /^(.+?)\s*->\s*(.+)$/.exec(clean);
    if (arrowMatch) {
      return {
        label: this.compactDeltaLabel(arrowMatch[1]),
        value: this.compactDeltaValue(arrowMatch[2]),
      };
    }

    const signMatch = /^(.+?)\s+([+\-].+)$/.exec(clean);
    if (signMatch) {
      return {
        label: this.compactDeltaLabel(signMatch[1]),
        value: this.compactDeltaValue(signMatch[2]),
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

  private formatLevelText(level: number, maxLevel: number): string {
    const safeLevel = Number.isFinite(level) ? level : 0;
    const safeMaxLevel = Number.isFinite(maxLevel) ? maxLevel : 0;

    return safeMaxLevel > 0 && safeLevel >= safeMaxLevel
      ? `Lv.${safeLevel}Max`
      : `Lv.${safeLevel}`;
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
