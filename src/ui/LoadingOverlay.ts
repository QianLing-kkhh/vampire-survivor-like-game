import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { UIProgressBar } from './components/UIProgressBar';

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
  rows: string[];
  badges: string[];
};

type LoadingCardView = {
  data: LoadingCardData;
  titleText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  idText: Phaser.GameObjects.Text;
  rowTexts: Phaser.GameObjects.Text[];
  badgeTexts: Phaser.GameObjects.Text[];
};

export class LoadingOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly panel: Phaser.GameObjects.Graphics;
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
    this.background = scene.add.graphics();
    this.panel = scene.add.graphics();
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
      this.background,
      this.panel,
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
    this.render();
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
        rowTexts: data.rows.map((row) => this.createText(row, '12px', '#cbd5e1')),
        badgeTexts: data.badges.slice(0, 4).map((badge) => this.createText(badge, '10px', '#dbeafe', true)),
      };

      this.cardViews.push(view);
      this.container.add([
        view.titleText,
        view.nameText,
        view.idText,
        ...view.rowTexts,
        ...view.badgeTexts,
      ]);
    }
  }

  private buildCardData(runInfo: LoadingOverlayRunInfo): LoadingCardData[] {
    const mechanics = runInfo.map.mechanics?.slice(0, 3) ?? [];
    const mapRows = [
      this.statLine(I18n.t('loading.mapSize'), this.formatSize(runInfo.map.worldWidth, runInfo.map.worldHeight)),
      this.statLine(I18n.t('loading.grid'), runInfo.map.gridSize),
      this.statLine(I18n.t('loading.landmarkSpacing'), runInfo.map.landmarkSpacing),
      this.statLine(I18n.t('loading.mechanics'), runInfo.map.mechanics?.length ?? 0),
      mechanics.length > 0
        ? mechanics.map((mechanic) => this.toTitleCase(mechanic)).join(' / ')
        : I18n.t('loading.noSpecialMechanics'),
    ].filter((row): row is string => Boolean(row));
    const characterRows = [
      this.statLine(I18n.t('loading.startingWeapon'), runInfo.character.startingWeaponId),
      this.statLine(I18n.t('loading.maxHp'), runInfo.character.maxHp),
      this.statLine(I18n.t('loading.moveSpeed'), runInfo.character.moveSpeed),
      this.statLine(I18n.t('loading.pickupRange'), runInfo.character.pickupRange),
      this.statLine(I18n.t('loading.expMultiplier'), runInfo.character.expMultiplier),
      runInfo.character.growthSummary ? this.statLine(I18n.t('loading.growth'), runInfo.character.growthSummary) : undefined,
      runInfo.character.reactionSummary ? this.statLine(I18n.t('loading.reaction'), runInfo.character.reactionSummary) : undefined,
      runInfo.character.levelUpSummary ? this.statLine(I18n.t('loading.levelUp'), runInfo.character.levelUpSummary) : undefined,
    ].filter((row): row is string => Boolean(row));
    const weaponRows = [
      this.statLine(I18n.t('loading.weaponType'), runInfo.startingWeapon.type),
      this.statLine(I18n.t('loading.behavior'), runInfo.startingWeapon.behaviorType),
      ...Object.entries(runInfo.startingWeapon.stats ?? {})
        .map(([key, value]) => this.statLine(this.toTitleCase(key), value))
        .filter((row): row is string => Boolean(row)),
    ].filter((row): row is string => Boolean(row));

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

    this.drawBackground(width, height);
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

  private drawBackground(width: number, height: number): void {
    this.background.clear();
    this.background.fillStyle(0x020617, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x0b1220, 0.86);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x1e3a8a, 0.1);
    this.background.fillCircle(width * 0.22, height * 0.22, Math.min(width, height) * 0.34);
    this.background.fillStyle(0xfacc15, 0.06);
    this.background.fillCircle(width * 0.82, height * 0.18, Math.min(width, height) * 0.22);
  }

  private renderRunInfo(
    width: number,
    height: number,
    topPadding: number,
    bottomAreaHeight: number,
    portrait: boolean,
    compact: boolean,
  ): void {
    this.panel.clear();

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
      const cardWidth = width - sidePadding * 2;
      const cardHeight = Math.max(104, Math.min(174, (availableHeight - gap * 2) / 3));
      this.cardViews.forEach((card, index) => {
        this.renderCard(card, sidePadding, contentTop + index * (cardHeight + gap), cardWidth, cardHeight, compact, portrait);
      });
      return;
    }

    const cardWidth = (width - sidePadding * 2 - gap * 2) / 3;
    const cardHeight = Math.max(130, availableHeight);
    this.cardViews.forEach((card, index) => {
      this.renderCard(card, sidePadding + index * (cardWidth + gap), contentTop, cardWidth, cardHeight, compact, portrait);
    });
  }

  private renderLegacyPanel(width: number, height: number, compact: boolean): void {
    const panelWidth = Math.min(Math.max(300, width * 0.62), 620);
    const panelHeight = compact ? 118 : 148;
    const centerX = width / 2;
    const centerY = height / 2 - 28;

    this.panel.fillStyle(0x0f172a, 0.92);
    this.panel.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 10);
    this.panel.lineStyle(2, 0x5b7fa8, 0.74);
    this.panel.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 10);
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
    const padding = compact ? 10 : 14;
    const titleSize = compact ? '11px' : '13px';
    const nameSize = compact ? '15px' : '20px';
    const rowSize = compact ? '10px' : '12px';
    const idSize = compact ? '9px' : '11px';
    const lineHeight = compact ? 15 : 18;
    const maxRows = Math.max(2, Math.floor((height - (portrait ? 58 : 78)) / lineHeight));
    const shownRows = portrait
      ? Math.min(maxRows, compact ? 4 : 5)
      : Math.min(maxRows, compact ? 5 : 8);
    const badgeLimit = compact ? 2 : 4;

    this.panel.fillStyle(0x0f172a, 0.82);
    this.panel.fillRoundedRect(x, y, width, height, 8);
    this.panel.lineStyle(1, 0x5b7fa8, 0.72);
    this.panel.strokeRoundedRect(x, y, width, height, 8);
    this.panel.lineStyle(2, card.data.accentColor, 0.72);
    this.panel.lineBetween(x + padding, y + padding, x + width - padding, y + padding);

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
    card.rowTexts.forEach((text, index) => {
      const visible = index < shownRows;
      text.setVisible(visible);
      if (!visible) {
        return;
      }

      text.setText(this.truncateText(card.data.rows[index], compact ? 44 : 62));
      text.setPosition(x + padding, rowStartY + index * lineHeight);
      text.setOrigin(0, 0.5);
      text.setFontSize(rowSize);
      text.setWordWrapWidth(width - padding * 2);
    });

    card.badgeTexts.forEach((badge, index) => {
      const visible = index < badgeLimit && height > 138;
      badge.setVisible(visible);
      if (!visible) {
        return;
      }

      const badgeText = this.truncateText(card.data.badges[index], compact ? 12 : 16);
      const badgeX = x + padding + index * Math.min(74, (width - padding * 2) / Math.max(1, badgeLimit));
      const badgeY = y + height - padding - 10;
      badge.setText(badgeText);
      badge.setPosition(badgeX, badgeY);
      badge.setOrigin(0, 0.5);
      badge.setFontSize(compact ? '9px' : '10px');
      this.panel.fillStyle(card.data.accentColor, 0.24);
      this.panel.fillRoundedRect(badgeX - 5, badgeY - 10, Math.min(66, Math.max(32, badgeText.length * 7)), 20, 7);
    });
  }

  private renderProgress(x: number, y: number, width: number, height: number, compact: boolean): void {
    this.progressBar.container.setPosition(x, y);
    this.progressBar.resize(width, height);
    this.progressBar.setProgress(this.progress);
    this.progressBar.setLabel(compact ? undefined : this.percentText.text);
  }

  private createText(text: string, fontSize: string, color: string, bold = false): Phaser.GameObjects.Text {
    const textObject = this.scene.add.text(0, 0, text, {
      color,
      fontFamily: 'Noto Sans, Arial, sans-serif',
      fontSize,
      fontStyle: bold ? 'bold' : '',
      align: 'center',
    });

    textObject.setOrigin(0.5);
    return textObject;
  }

  private statLine(label: string, value: number | string | undefined): string | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    return `${label}: ${this.formatStatValue(value)}`;
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
