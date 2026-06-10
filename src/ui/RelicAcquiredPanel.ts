import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
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
    const title = this.scene.add.text(0, -96, I18n.t('relic.acquiredTitle'), {
      color: '#facc15',
      fontFamily: UITheme.fontFamily,
      fontSize: '24px',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    const bg = this.scene.add.graphics();
    const glow = this.scene.add.graphics();
    const iconFrame = this.scene.add.rectangle(-96, -12, 72, 72, UITheme.iconBgColor, 0.94);
    iconFrame.setStrokeStyle(2, this.getRarityColor(), 0.9);

    const icon = this.createIconObject(-96, -12);
    const nameText = this.scene.add.text(-42, -38, this.resolveText(this.config.name), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '20px',
      fontStyle: 'bold',
      wordWrap: { width: 260 },
    });
    nameText.setOrigin(0, 0.5);

    const rarityText = this.scene.add.text(-42, -10, this.getRarityLabel(), {
      color: '#020617',
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
      fontStyle: 'bold',
      padding: { x: 8, y: 3 },
      backgroundColor: this.getRarityCssColor(),
    });
    rarityText.setOrigin(0, 0.5);

    const description = this.scene.add.text(-150, 50, this.getDescriptionText(), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '14px',
      lineSpacing: 4,
      wordWrap: { width: 300 },
    });
    description.setOrigin(0, 0);

    this.container.add([glow, bg, title, iconFrame, icon, nameText, rarityText, description]);
    this.drawPanelBackground(bg, glow);
  }

  private layout(): void {
    this.container.setPosition(this.scene.scale.width / 2, this.scene.scale.height * 0.34);
  }

  private complete(): void {
    if (this.completed) {
      return;
    }

    this.completed = true;
    this.config.onComplete?.();
  }

  private drawPanelBackground(
    bg: Phaser.GameObjects.Graphics,
    glow: Phaser.GameObjects.Graphics,
  ): void {
    const width = 380;
    const height = 210;
    const x = -width / 2;
    const y = -height / 2;

    glow.clear();
    glow.fillStyle(this.getRarityColor(), 0.16);
    glow.fillRoundedRect(x - 10, y - 10, width + 20, height + 20, 16);

    bg.clear();
    bg.fillStyle(0x020617, 0.62);
    bg.fillRoundedRect(x - 18, y - 18, width + 36, height + 36, 18);
    bg.fillStyle(UITheme.panelBgColor, 0.94);
    bg.fillRoundedRect(x, y, width, height, 12);
    bg.lineStyle(2, UITheme.panelBorderColor, 0.86);
    bg.strokeRoundedRect(x, y, width, height, 12);
    bg.lineStyle(1, this.getRarityColor(), 0.92);
    bg.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 8);
  }

  private createIconObject(x: number, y: number): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
    const key = this.config.iconKey;

    if (key && this.scene.textures.exists(key)) {
      const image = this.scene.add.image(x, y, key);
      image.setDisplaySize(54, 54);
      return image;
    }

    const fallback = this.scene.add.text(x, y, this.getFallbackText(), {
      color: '#f8fafc',
      fontFamily: UITheme.fontFamily,
      fontSize: '24px',
      fontStyle: 'bold',
    });
    fallback.setOrigin(0.5);
    return fallback;
  }

  private getDescriptionText(): string {
    const text = this.resolveText(this.config.description ?? '');

    if (text.length <= 120) {
      return text;
    }

    return `${text.slice(0, 117)}...`;
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

  private getRarityCssColor(): string {
    return `#${this.getRarityColor().toString(16).padStart(6, '0')}`;
  }

  private getFallbackText(): string {
    return this.config.id
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || '?';
  }
}
