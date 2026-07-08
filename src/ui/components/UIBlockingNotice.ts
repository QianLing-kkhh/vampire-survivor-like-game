import Phaser from 'phaser';

import { I18n } from '../../i18n/I18n';
import { setRectangleHitArea } from '../input/UIInteraction';
import { UITheme } from '../UITheme';
import { PanelFrame } from './PanelFrame';

export interface UIBlockingNoticeConfig {
  message: string;
  depth?: number;
}

export class UIBlockingNotice {
  readonly container: Phaser.GameObjects.Container;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly messageText: Phaser.GameObjects.Text;
  private frame?: Phaser.GameObjects.Container;

  constructor(private readonly scene: Phaser.Scene, private readonly config: UIBlockingNoticeConfig) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(config.depth ?? 20000);
    this.container.setScrollFactor(0);

    this.backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, UITheme.colors.backgroundOverlay, 0.86);
    this.backdrop.setOrigin(0, 0);
    this.backdrop.setScrollFactor(0);

    this.messageText = scene.add.text(0, 0, config.message, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '24px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: 360 },
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setScrollFactor(0);

    this.container.add([this.backdrop, this.messageText]);
    this.resize(scene.scale.width, scene.scale.height);
    this.setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  resize(width: number, height: number): void {
    setRectangleHitArea(this.backdrop, width, height);
    this.frame?.destroy(true);
    const compact = width <= 640 || height <= 420;
    const frameWidth = Math.min(width - 32, compact ? 360 : 460);
    const frameHeight = compact ? 118 : 142;
    const centerX = width / 2;
    const centerY = height / 2;

    this.frame = PanelFrame.create(this.scene, {
      x: centerX,
      y: centerY,
      width: frameWidth,
      height: frameHeight,
      variant: 'modal',
      alpha: UITheme.alpha.modal,
    });
    this.container.addAt(this.frame, 1);

    this.messageText.setPosition(centerX, centerY);
    this.messageText.setFontSize(compact ? '18px' : '24px');
    this.messageText.setWordWrapWidth(frameWidth - 48);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  static createRotateNotice(scene: Phaser.Scene): UIBlockingNotice {
    return new UIBlockingNotice(scene, {
      message: I18n.t('game.rotateForBetterPlay'),
    });
  }
}
