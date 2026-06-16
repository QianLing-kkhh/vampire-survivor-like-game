import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIBadge } from './components/UIBadge';
import { UIGlowAccent } from './components/UIGlowAccent';
import { UIIconFrame } from './components/UIIconFrame';
import { UITextBlock } from './components/UITextBlock';
import { truncateTextToWidth } from './components/UITextUtils';
import { UITheme } from './UITheme';

export type RelicAcquiredPanelConfig = {
  id: string;
  name: string;
  description?: string;
  rarity?: string;
  iconKey?: string;
  durationMs?: number;
  onComplete?: () => void;
};

export class RelicAcquiredPanel {
  private static readonly PANEL_WIDTH = 340;
  private static readonly PANEL_HEIGHT = 166;
  private static readonly MIN_SCALE = 0.76;

  private readonly container: Phaser.GameObjects.Container;
  private readonly resizeHandler = () => this.layout();
  private completed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: RelicAcquiredPanelConfig,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1150);
    this.container.setScrollFactor(0);

    this.build();
    this.layout();
    this.scene.scale.on('resize', this.resizeHandler);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      delay: Math.max(800, (config.durationMs ?? 2200) - 420),
      duration: 420,
      ease: 'Sine.easeInOut',
      onComplete: () => this.complete(),
    });
  }

  destroy(): void {
    this.scene.scale.off('resize', this.resizeHandler);
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private build(): void {
    const glow = UIGlowAccent.create(this.scene, {
      width: RelicAcquiredPanel.PANEL_WIDTH,
      height: RelicAcquiredPanel.PANEL_HEIGHT,
      color: this.getRarityColor(),
      alpha: 0.16,
      padding: 10,
    });

    const frame = PanelFrame.create(this.scene, {
      x: 0,
      y: 0,
      width: RelicAcquiredPanel.PANEL_WIDTH,
      height: RelicAcquiredPanel.PANEL_HEIGHT,
      variant: 'modal',
      alpha: UITheme.alpha.modal,
    });
    const header = PanelHeader.create(this.scene, {
      x: 0,
      y: -61,
      width: RelicAcquiredPanel.PANEL_WIDTH - 48,
      title: I18n.t('relic.acquiredTitle'),
      align: 'center',
      titleFontSize: '18px',
    });

    const icon = UIIconFrame.create(this.scene, {
      x: -92,
      y: -4,
      size: 56,
      textureKey: this.config.iconKey,
      fallback: this.getFallbackText(),
      fillAlpha: 0.92,
      borderColor: this.getRarityColor(),
      borderAlpha: 0.92,
      tooltip: {
        kind: 'relic',
        id: this.config.id,
        title: this.resolveText(this.config.name),
        description: this.getDescriptionText(),
      },
    });
    const nameFontSize = '18px';
    const nameText = new UITextBlock(this.scene, {
      x: -48,
      y: -27,
      text: truncateTextToWidth(this.resolveText(this.config.name), 220, nameFontSize),
      fontSize: nameFontSize,
      fontStyle: 'bold',
      align: 'left',
      width: 220,
    }).text;
    nameText.setMaxLines(2);

    const rarityBadge = UIBadge.create(this.scene, 0, 0, this.getRarityLabel(), this.getRarityColor());
    rarityBadge.setPosition(-48 + rarityBadge.getBounds().width / 2, -2);

    const description = new UITextBlock(this.scene, {
      x: -140,
      y: 38,
      text: this.getDescriptionText(),
      tone: 'muted',
      fontSize: '12px',
      lineSpacing: 2,
      align: 'left',
      width: 280,
    }).text;
    description.setMaxLines(2);

    this.container.add([glow, frame, header, icon, nameText, rarityBadge, description]);
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const scale = this.getResponsiveScale(width, height);
    const scaledPanelHeight = RelicAcquiredPanel.PANEL_HEIGHT * scale;
    const y = Phaser.Math.Clamp(
      height * (height > width ? 0.22 : 0.24),
      scaledPanelHeight / 2 + 16,
      height - scaledPanelHeight / 2 - 96,
    );

    this.container.setScale(scale);
    this.container.setPosition(width / 2, y);
  }

  private complete(): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.config.onComplete?.();
  }

  private getResponsiveScale(width: number, height: number): number {
    const widthScale = (width - 32) / RelicAcquiredPanel.PANEL_WIDTH;
    const heightScale = (height * 0.42) / RelicAcquiredPanel.PANEL_HEIGHT;
    return Phaser.Math.Clamp(
      Math.min(1, widthScale, heightScale),
      RelicAcquiredPanel.MIN_SCALE,
      1,
    );
  }

  private getDescriptionText(): string {
    const text = this.resolveText(this.config.description ?? '');

    if (text.length <= 96) {
      return text;
    }

    return `${text.slice(0, 93)}...`;
  }

  private resolveText(value: string): string {
    if (!value) {
      return '';
    }

    const translated = I18n.t(value);
    return translated === value ? value : translated;
  }

  private getRarityLabel(): string {
    return I18n.t(`relic.rarity.${this.getRarity()}`);
  }

  private getRarity(): string {
    return this.config.rarity ?? 'common';
  }

  private getRarityColor(): number {
    switch (this.getRarity()) {
      case 'legendary':
        return 0xf97316;
      case 'epic':
        return 0xa78bfa;
      case 'rare':
        return 0x60a5fa;
      case 'common':
      default:
        return 0x94a3b8;
    }
  }

  private getFallbackText(): string {
    return this.config.id
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || '?';
  }
}
