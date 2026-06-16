import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { PanelFrame } from './components/PanelFrame';
import { UIBadge } from './components/UIBadge';
import { UIBackplate } from './components/UIBackplate';
import { UILoadingBackdrop } from './components/UILoadingBackdrop';
import { UIProgressBar } from './components/UIProgressBar';
import { UIStatRow } from './components/UIStatRow';
import { UITextBlock } from './components/UITextBlock';
import { UITheme } from './UITheme';

export interface LoadingOverlayRunInfo {
  map: {
    id: string;
    name: string;
    worldWidth?: number;
    worldHeight?: number;
    gridSize?: number;
    landmarkSpacing?: number;
    mechanics?: string[];
  };
  character: {
    id: string;
    name: string;
    startingWeaponId: string;
    maxHp?: number;
    moveSpeed?: number;
    pickupRange?: number;
    expMultiplier?: number;
    growthSummary?: string;
    reactionSummary?: string;
    levelUpSummary?: string;
  };
  startingWeapon: {
    id: string;
    name: string;
    type?: string;
    behaviorType?: string;
    tags?: string[];
    stats?: Record<string, number | string>;
  };
}

export interface LoadingOverlayConfig {
  title: string;
  message: string;
  runInfo?: LoadingOverlayRunInfo;
}

type LoadingCardData = {
  title: string;
  accentColor: number;
  name: string;
  id: string;
  rows: LoadingStatRow[];
  badges: string[];
};

type LoadingStatRow = {
  label: string;
  value: string;
};

type LoadingCardView = {
  data: LoadingCardData;
  frame?: Phaser.GameObjects.Container;
  titleText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  idText: Phaser.GameObjects.Text;
  dynamicObjects: Phaser.GameObjects.GameObject[];
};

export class LoadingOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: UILoadingBackdrop;
  private legacyFrame?: Phaser.GameObjects.Container;
  private readonly progressBar: UIProgressBar;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly percentText: Phaser.GameObjects.Text;
  private readonly currentFileText: Phaser.GameObjects.Text;
  private readonly cardViews: LoadingCardView[] = [];
  private progress = 0;
  private currentFileLabel = '';
  private readonly onResize: () => void;

  constructor(private readonly scene: Phaser.Scene, private readonly config: LoadingOverlayConfig) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000);
    this.backdrop = new UILoadingBackdrop(scene);
    this.progressBar = new UIProgressBar(scene, {
      x: 0,
      y: 0,
      width: 320,
      height: 14,
      variant: 'loading',
      compact: false,
    });
    this.titleText = this.createText(config.title, '30px', '#f8fafc', true);
    this.messageText = this.createText(config.message, '16px', '#cbd5e1');
    this.percentText = this.createText('0%', '18px', '#facc15', true);
    this.currentFileText = this.createText('', '12px', '#94a3b8');
    this.currentFileText.setMaxLines(1);
    this.container.add([
      this.backdrop.graphics,
      this.progressBar.container,
      this.titleText,
      this.messageText,
      this.percentText,
      this.currentFileText,
    ]);

    if (config.runInfo) {
      this.createRunInfoObjects(config.runInfo);
    }

    this.onResize = () => this.render();
    scene.scale.on('resize', this.onResize);
    this.render();
  }

  setProgress(value: number): void {
    this.progress = Phaser.Math.Clamp(value, 0, 1);
    this.percentText.setText(`${Math.round(this.progress * 100)}%`);
    this.progressBar.setProgress(this.progress);
  }

  setCurrentFile(label: string): void {
    this.currentFileLabel = this.truncateText(this.getFileTail(label), 52);
    this.currentFileText.setText(this.currentFileLabel
      ? `${I18n.t('loading.currentFile')}: ${this.currentFileLabel}`
      : '');
  }

  setMessage(label: string): void {
    this.messageText.setText(label);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.onResize);
    this.container.destroy(true);
  }

  private createRunInfoObjects(runInfo: LoadingOverlayRunInfo): void {
    const cards = this.buildCardData(runInfo);

    for (const data of cards) {
      const view: LoadingCardView = {
        data,
        titleText: this.createText(data.title, '14px', '#f8fafc', true),
        nameText: this.createText(data.name, '20px', '#f8fafc', true),
        idText: this.createText(data.id, '11px', '#94a3b8'),
        dynamicObjects: [],
      };

      this.cardViews.push(view);
      this.container.add([
        view.titleText,
        view.nameText,
        view.idText,
      ]);
    }
  }

  private buildCardData(runInfo: LoadingOverlayRunInfo): LoadingCardData[] {
    const mechanics = runInfo.map.mechanics?.slice(0, 3) ?? [];
    const mapRows = [
      this.statRow(I18n.t('loading.mapSize'), this.formatSize(runInfo.map.worldWidth, runInfo.map.worldHeight)),
      this.statRow(I18n.t('loading.grid'), runInfo.map.gridSize),
      this.statRow(I18n.t('loading.landmarkSpacing'), runInfo.map.landmarkSpacing),
      this.statRow(I18n.t('loading.mechanics'), runInfo.map.mechanics?.length ?? 0),
      this.statRow(
        I18n.t('loading.mechanics'),
        mechanics.length > 0
          ? mechanics.map((mechanic) => this.toTitleCase(mechanic)).join(' / ')
          : I18n.t('loading.noSpecialMechanics'),
      ),
    ].filter((row): row is LoadingStatRow => Boolean(row));
    const characterRows = [
      this.statRow(I18n.t('loading.startingWeapon'), runInfo.character.startingWeaponId),
      this.statRow(I18n.t('loading.maxHp'), runInfo.character.maxHp),
      this.statRow(I18n.t('loading.moveSpeed'), runInfo.character.moveSpeed),
      this.statRow(I18n.t('loading.pickupRange'), runInfo.character.pickupRange),
      this.statRow(I18n.t('loading.expMultiplier'), runInfo.character.expMultiplier),
      runInfo.character.growthSummary ? this.statRow(I18n.t('loading.growth'), runInfo.character.growthSummary) : undefined,
      runInfo.character.reactionSummary ? this.statRow(I18n.t('loading.reaction'), runInfo.character.reactionSummary) : undefined,
      runInfo.character.levelUpSummary ? this.statRow(I18n.t('loading.levelUp'), runInfo.character.levelUpSummary) : undefined,
    ].filter((row): row is LoadingStatRow => Boolean(row));
    const weaponRows = [
      this.statRow(I18n.t('loading.weaponType'), runInfo.startingWeapon.type),
      this.statRow(I18n.t('loading.behavior'), runInfo.startingWeapon.behaviorType),
      ...Object.entries(runInfo.startingWeapon.stats ?? {})
        .map(([key, value]) => this.statRow(this.toTitleCase(key), value))
        .filter((row): row is LoadingStatRow => Boolean(row)),
    ].filter((row): row is LoadingStatRow => Boolean(row));

    return [
      {
        title: I18n.t('loading.map'),
        accentColor: 0x60a5fa,
        name: runInfo.map.name,
        id: runInfo.map.id,
        rows: mapRows,
        badges: mechanics.map((mechanic) => this.toTitleCase(mechanic)),
      },
      {
        title: I18n.t('loading.character'),
        accentColor: 0xfacc15,
        name: runInfo.character.name,
        id: runInfo.character.id,
        rows: characterRows,
        badges: [
          runInfo.character.reactionSummary,
          runInfo.character.levelUpSummary,
        ].filter((badge): badge is string => Boolean(badge)),
      },
      {
        title: I18n.t('loading.startingWeapon'),
        accentColor: 0x22c55e,
        name: runInfo.startingWeapon.name,
        id: runInfo.startingWeapon.id,
        rows: weaponRows,
        badges: runInfo.startingWeapon.tags?.slice(0, 4) ?? [],
      },
    ];
  }

  private render(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const portrait = height > width;
    const compact = width <= 860 || height <= 430;
    const centerX = width / 2;
    const topPadding = compact ? 18 : 28;
    const bottomPadding = compact ? 18 : 28;
    const bottomAreaHeight = compact ? 96 : 118;
    const progressWidth = Math.min(
      portrait ? width * 0.9 : width * 0.68,
      portrait ? width - 28 : 760,
    );
    const progressHeight = compact ? 14 : 18;
    const progressX = centerX - progressWidth / 2;
    const progressY = height - bottomPadding - (compact ? 42 : 52);

    this.backdrop.render(width, height);
    this.legacyFrame?.destroy();
    this.legacyFrame = undefined;
    this.renderRunInfo(width, height, topPadding, bottomAreaHeight, portrait, compact);
    this.renderProgress(progressX, progressY, progressWidth, progressHeight, compact);

    this.titleText.setPosition(centerX, topPadding + (compact ? 14 : 18));
    this.titleText.setFontSize(compact ? '22px' : '30px');
    this.messageText.setPosition(centerX, progressY - (compact ? 26 : 32));
    this.messageText.setFontSize(compact ? '12px' : '16px');
    this.percentText.setPosition(centerX, progressY + progressHeight / 2);
    this.percentText.setFontSize(compact ? '13px' : '18px');
    this.currentFileText.setPosition(centerX, progressY + progressHeight + (compact ? 16 : 22));
    this.currentFileText.setFontSize(compact ? '10px' : '12px');
    this.currentFileText.setWordWrapWidth(progressWidth);
  }

  private renderRunInfo(
    width: number,
    height: number,
    topPadding: number,
    bottomAreaHeight: number,
    portrait: boolean,
    compact: boolean,
  ): void {
    if (this.cardViews.length === 0) {
      this.renderLegacyPanel(width, height, compact);
      return;
    }

    const titleReserve = compact ? 58 : 82;
    const contentTop = topPadding + titleReserve;
    const contentBottom = height - bottomAreaHeight - topPadding;
    const availableHeight = Math.max(100, contentBottom - contentTop);
    const gap = compact ? 8 : 14;
    const sidePadding = portrait ? 14 : Math.max(24, width * 0.055);

    if (portrait) {
      const cardWidth = Math.min(width - sidePadding * 2, compact ? 340 : 380);
      const cardHeight = Math.max(104, Math.min(compact ? 148 : 168, (availableHeight - gap * 2) / 3));
      const totalHeight = cardHeight * this.cardViews.length + gap * Math.max(0, this.cardViews.length - 1);
      const startX = width / 2 - cardWidth / 2;
      const startY = contentTop + Math.max(0, (availableHeight - totalHeight) / 2);
      this.cardViews.forEach((card, index) => {
        this.renderCard(card, startX, startY + index * (cardHeight + gap), cardWidth, cardHeight, compact, portrait);
      });
      return;
    }

    const rawCardWidth = (width - sidePadding * 2 - gap * 2) / 3;
    const cardWidth = Math.min(rawCardWidth, compact ? 260 : 420);
    const totalWidth = cardWidth * this.cardViews.length + gap * Math.max(0, this.cardViews.length - 1);
    const cardHeight = Math.max(compact ? 130 : 168, Math.min(compact ? 190 : 260, availableHeight));
    const startX = width / 2 - totalWidth / 2;
    const startY = contentTop + Math.max(0, (availableHeight - cardHeight) / 2);
    this.cardViews.forEach((card, index) => {
      this.renderCard(card, startX + index * (cardWidth + gap), startY, cardWidth, cardHeight, compact, portrait);
    });
  }

  private renderLegacyPanel(width: number, height: number, compact: boolean): void {
    const panelWidth = Math.min(Math.max(300, width * 0.62), 620);
    const panelHeight = compact ? 118 : 148;
    const centerX = width / 2;
    const centerY = height / 2 - 28;

    this.legacyFrame = PanelFrame.create(this.scene, {
      x: centerX,
      y: centerY,
      width: panelWidth,
      height: panelHeight,
      variant: 'modal',
      alpha: UITheme.alpha.modal,
    });
    this.container.addAt(this.legacyFrame, 1);
  }

  private renderCard(
    card: LoadingCardView,
    x: number,
    y: number,
    width: number,
    height: number,
    compact: boolean,
    portrait: boolean,
  ): void {
    card.dynamicObjects.forEach((object) => object.destroy());
    card.dynamicObjects = [];

    const padding = compact ? 10 : 14;
    const titleSize = compact ? '11px' : '13px';
    const nameSize = compact ? '15px' : '20px';
    const rowSize = compact ? '10px' : '12px';
    const idSize = compact ? '9px' : '11px';
    const rowHeight = compact ? 18 : 22;
    const lineHeight = rowHeight + (compact ? 3 : 4);
    const maxRows = Math.max(2, Math.floor((height - (portrait ? 58 : 78)) / lineHeight));
    const shownRows = portrait
      ? Math.min(maxRows, compact ? 4 : 5)
      : Math.min(maxRows, compact ? 5 : 8);
    const badgeLimit = compact ? 2 : 4;

    card.frame?.destroy();
    card.frame = PanelFrame.create(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      variant: 'card',
      alpha: UITheme.alpha.card,
    });
    this.container.addAt(card.frame, 1);

    const accentLine = new UIBackplate(this.scene, {
      x: x + padding,
      y: y + padding,
      width: width - padding * 2,
      height: 2,
      fillColor: card.data.accentColor,
      fillAlpha: 0.72,
      borderWidth: 0,
    }).rectangle;
    this.container.add(accentLine);
    card.dynamicObjects.push(accentLine);

    card.titleText.setText(card.data.title);
    card.titleText.setPosition(x + padding, y + padding + 8);
    card.titleText.setOrigin(0, 0.5);
    card.titleText.setFontSize(titleSize);
    card.nameText.setText(this.truncateText(card.data.name, compact ? 24 : 34));
    card.nameText.setPosition(x + padding, y + padding + (compact ? 24 : 32));
    card.nameText.setOrigin(0, 0.5);
    card.nameText.setFontSize(nameSize);
    card.nameText.setWordWrapWidth(width - padding * 2);
    card.idText.setText(card.data.id);
    card.idText.setPosition(x + padding, y + padding + (compact ? 42 : 54));
    card.idText.setOrigin(0, 0.5);
    card.idText.setFontSize(idSize);
    card.idText.setWordWrapWidth(width - padding * 2);

    const rowStartY = y + padding + (compact ? 58 : 76);
    card.data.rows.slice(0, shownRows).forEach((row, index) => {
      const statRow = UIStatRow.create(
        this.scene,
        x + width / 2,
        rowStartY + index * lineHeight,
        width - padding * 2,
        this.truncateText(row.label, compact ? 18 : 24),
        this.truncateText(row.value, compact ? 24 : 34),
        {
          height: rowHeight,
          fontSize: rowSize,
          backgroundAlpha: 0.28,
          borderAlpha: 0.18,
        },
      );
      this.container.add(statRow);
      card.dynamicObjects.push(statRow);
    });

    card.data.badges.slice(0, badgeLimit).forEach((badgeLabel, index) => {
      if (height <= 138) {
        return;
      }

      const badgeText = this.truncateText(badgeLabel, compact ? 12 : 16);
      const badgeX = x + padding + 28 + index * Math.min(74, (width - padding * 2) / Math.max(1, badgeLimit));
      const badgeY = y + height - padding - 10;
      const badge = UIBadge.create(this.scene, badgeX, badgeY, badgeText, card.data.accentColor);
      badge.setScale(compact ? 0.82 : 0.92);
      this.container.add(badge);
      card.dynamicObjects.push(badge);
    });
  }

  private renderProgress(x: number, y: number, width: number, height: number, compact: boolean): void {
    this.progressBar.container.setPosition(x, y);
    this.progressBar.resize(width, height);
    this.progressBar.setProgress(this.progress);
    this.progressBar.setLabel(undefined);
  }

  private createText(text: string, fontSize: string, color: string, bold = false): Phaser.GameObjects.Text {
    const textObject = new UITextBlock(this.scene, {
      x: 0,
      y: 0,
      text,
      fontSize,
      fontStyle: bold ? 'bold' : '',
      align: 'center',
    }).text;
    textObject.setColor(color);
    return textObject;
  }

  private statRow(label: string, value: number | string | undefined): LoadingStatRow | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    return {
      label,
      value: this.formatStatValue(value),
    };
  }

  private formatSize(width: number | undefined, height: number | undefined): string | undefined {
    return width !== undefined && height !== undefined ? `${width} x ${height}` : undefined;
  }

  private formatStatValue(value: number | string): string {
    return typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2).replace(/\.?0+$/, '') : String(value);
  }

  private truncateText(value: string, maxLength: number): string {
    return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}...` : value;
  }

  private getFileTail(label: string): string {
    return label.split(/[\\/]/).filter((part) => part.length > 0).pop() ?? label;
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[_\s-]+/)
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
