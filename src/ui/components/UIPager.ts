import Phaser from 'phaser';

import { I18n } from '../../i18n/I18n';
import { UITheme } from '../UITheme';
import { UIButton } from './UIButton';

export interface UIPagerConfig {
  x: number;
  y: number;
  width: number;
  currentPage?: number;
  totalPages?: number;
  compact?: boolean;
  closeLabel?: string;
  onPageChanged?: (page: number) => void;
  onClose?: () => void;
}

export class UIPager {
  readonly container: Phaser.GameObjects.Container;
  readonly prevButton: UIButton;
  readonly nextButton: UIButton;
  readonly closeButton?: UIButton;
  readonly pageText: Phaser.GameObjects.Text;
  private currentPage: number;
  private totalPages: number;
  private width: number;
  private compact: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly config: UIPagerConfig) {
    this.currentPage = Math.max(0, config.currentPage ?? 0);
    this.totalPages = Math.max(1, config.totalPages ?? 1);
    this.width = config.width;
    this.compact = config.compact === true;
    this.container = scene.add.container(config.x, config.y);
    const buttonWidth = this.compact ? 96 : 132;
    const buttonHeight = this.compact ? 32 : 36;
    this.prevButton = new UIButton(scene, {
      x: -this.width / 2 + buttonWidth / 2,
      y: 0,
      width: buttonWidth,
      height: buttonHeight,
      size: 'small',
      label: I18n.t('settings.previousPage'),
      onClick: () => this.changePage(-1),
    });
    this.nextButton = new UIButton(scene, {
      x: this.width / 2 - buttonWidth / 2,
      y: 0,
      width: buttonWidth,
      height: buttonHeight,
      size: 'small',
      label: I18n.t('settings.nextPage'),
      onClick: () => this.changePage(1),
    });
    this.pageText = scene.add.text(0, 0, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.compact ? '10px' : '12px',
      align: 'center',
    });
    this.pageText.setOrigin(0.5);
    this.container.add([this.prevButton.container, this.nextButton.container, this.pageText]);

    if (config.onClose) {
      this.closeButton = new UIButton(scene, {
        x: 0,
        y: this.compact ? 40 : 44,
        width: this.compact ? 144 : 180,
        height: this.compact ? 36 : 40,
        size: 'medium',
        label: config.closeLabel ?? I18n.t('common.close'),
        onClick: config.onClose,
      });
      this.container.add(this.closeButton.container);
    }

    this.render();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setSize(width: number, compact = this.compact): void {
    this.width = width;
    this.compact = compact;
    const buttonWidth = this.compact ? 96 : 132;
    const buttonHeight = this.compact ? 32 : 36;
    this.prevButton.setSize(buttonWidth, buttonHeight);
    this.nextButton.setSize(buttonWidth, buttonHeight);
    this.prevButton.setPosition(-width / 2 + buttonWidth / 2, 0);
    this.nextButton.setPosition(width / 2 - buttonWidth / 2, 0);
    this.pageText.setFontSize(this.compact ? '10px' : '12px');
  }

  setPage(currentPage: number, totalPages: number): void {
    this.currentPage = Phaser.Math.Clamp(currentPage, 0, Math.max(0, totalPages - 1));
    this.totalPages = Math.max(1, totalPages);
    this.render();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private changePage(delta: number): void {
    const nextPage = Phaser.Math.Clamp(this.currentPage + delta, 0, this.totalPages - 1);
    if (nextPage === this.currentPage) {
      return;
    }

    this.currentPage = nextPage;
    this.render();
    this.config.onPageChanged?.(nextPage);
  }

  private render(): void {
    this.prevButton.setDisabled(this.currentPage <= 0);
    this.nextButton.setDisabled(this.currentPage >= this.totalPages - 1);
    this.pageText.setText(`${I18n.t('settings.page')} ${this.currentPage + 1}/${this.totalPages}`);
  }
}
