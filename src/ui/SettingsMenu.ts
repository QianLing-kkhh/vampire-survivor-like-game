import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { ASSET_STYLES, AssetStyle, DISPLAY_QUALITIES, DisplayQuality } from '../visual/DisplayQuality';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

type SettingsMenuHandler = () => void;

export class SettingsMenu {
  private readonly screenManager: ScreenManager;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly visualRestartNotice: Phaser.GameObjects.Text;
  private readonly buttons: Phaser.GameObjects.Text[] = [];
  private unsubscribeResize?: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onClose: SettingsMenuHandler,
    private readonly onSettingsChanged: SettingsMenuHandler = () => {},
  ) {
    this.screenManager = new ScreenManager(scene);
    this.background = scene.add.rectangle(
      this.screenManager.centerX,
      this.screenManager.centerY,
      420,
      420,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.85);
    this.panelImage = scene.textures.exists('art_ui_pause_panel_bg')
      ? scene.add.image(this.screenManager.centerX, this.screenManager.centerY, 'art_ui_pause_panel_bg')
      : undefined;
    this.panelImage?.setAlpha(UITheme.pausePanelAlpha);

    this.title = scene.add.text(0, 0, this.t('settings.title', 'Settings'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.title.setOrigin(0.5);
    this.visualRestartNotice = scene.add.text(0, 0, '', {
      color: UITheme.successTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
      wordWrap: { width: 330 },
    });
    this.visualRestartNotice.setOrigin(0.5);

    this.container = scene.add.container(0, 0, [
      this.background,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
      this.visualRestartNotice,
    ]);
    this.container.setDepth(2200);
    this.renderButtons();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private renderButtons(): void {
    for (const button of this.buttons) {
      button.destroy();
    }

    this.buttons.length = 0;
    this.title.setText(this.t('settings.title', 'Settings'));
    const settings = PlaytestSettings.get();
    const display = SettingsManager.getDisplay();
    const showVisualRestartNotice = SettingsManager.isVisualRestartRequired();

    this.visualRestartNotice.setText(
      showVisualRestartNotice
        ? this.t(
          'settings.visualRestartRequired',
          'Some visual settings apply after restart or next run.',
        )
        : '',
    );
    this.visualRestartNotice.setVisible(showVisualRestartNotice);
    const entries = [
      {
        label: `${this.t('settings.autoMovement', 'Auto Movement')}: ${this.formatOnOff(settings.autoMovement)}`,
        action: () => this.toggle(() => PlaytestSettings.toggleAutoMovement()),
      },
      {
        label: `${this.t('settings.autoUpgrade', 'Auto Upgrade')}: ${this.formatOnOff(settings.autoUpgrade)}`,
        action: () => this.toggle(() => PlaytestSettings.toggleAutoUpgrade()),
      },
      {
        label: `${this.t('settings.fastMode', I18n.t('common.fastMode'))}: ${this.formatOnOff(settings.fastMode)}`,
        action: () => this.toggle(() => PlaytestSettings.toggleFastMode()),
      },
      {
        label: `${this.t('settings.endlessMode', 'Endless Mode')}: ${this.formatOnOff(settings.endlessMode)}`,
        action: () => this.toggle(() => PlaytestSettings.toggleEndlessMode()),
      },
      {
        label: `${this.t('settings.audio', 'Audio')}: ${this.formatOnOff(settings.audioEnabled)}`,
        action: () => this.toggle(() => AudioManager.setAudioEnabled(!AudioManager.isAudioEnabled())),
      },
      {
        label: `${this.t('settings.bgmVolume', 'BGM Volume')}: ${this.formatVolume(settings.bgmVolume)}`,
        action: () => this.toggle(() => this.cycleVolume('bgm')),
      },
      {
        label: `${this.t('settings.sfxVolume', 'SFX Volume')}: ${this.formatVolume(settings.sfxVolume)}`,
        action: () => this.toggle(() => this.cycleVolume('sfx')),
      },
      {
        label: `${this.t('settings.weaponVolume', 'Weapon Volume')}: ${this.formatVolume(settings.weaponVolume)}`,
        action: () => this.toggle(() => this.cycleVolume('weapon')),
      },
      {
        label: `${this.t('settings.uiVolume', 'UI Volume')}: ${this.formatVolume(settings.uiVolume)}`,
        action: () => this.toggle(() => this.cycleVolume('ui')),
      },
      {
        label: `${this.t('settings.graphicsQuality', 'Graphics Quality')}: ${this.formatDisplayQuality(display.displayQuality)}`,
        action: () => this.toggle(() => this.cycleDisplayQuality(display.displayQuality)),
      },
      {
        label: `${this.t('settings.assetStyle', 'Asset Style')}: ${this.formatAssetStyle(display.assetStyle)}`,
        action: () => this.toggle(() => this.cycleAssetStyle(display.assetStyle)),
      },
      {
        label: `${this.t('settings.shadows', 'Shadows')}: ${this.formatOnOff(display.shadowsEnabled)}`,
        action: () => this.toggle(() => SettingsManager.updateDisplay({
          shadowsEnabled: !SettingsManager.getDisplay().shadowsEnabled,
        })),
      },
      {
        label: `${this.t('settings.language', I18n.t('common.language'))}: ${I18n.getLocaleDisplayName()}`,
        action: () => {
          I18n.cycleLocale();
          this.onSettingsChanged();
          this.renderButtons();
          this.applyLayout();
        },
      },
      {
        label: this.t('settings.back', I18n.t('common.close')),
        action: () => {
          AudioManager.playUi(this.scene, 'ui_click');
          this.onClose();
        },
      },
    ];

    for (const entry of entries) {
      const button = this.createButton(entry.label, entry.action);
      this.buttons.push(button);
      this.container.add(button);
    }
  }

  private toggle(action: () => void): void {
    action();
    this.syncSceneBgm();
    this.onSettingsChanged();
    this.renderButtons();
    this.applyLayout();
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const button = this.scene.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      align: 'center',
      fixedWidth: metrics.width,
      fixedHeight: metrics.height,
      padding: {
        x: 0,
        y: Math.max(0, Math.floor((metrics.height - 22) / 2)),
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    button.on('pointerdown', () => {
      AudioManager.playUi(this.scene, 'ui_click');
      onClick();
    });

    return button;
  }

  private applyLayout(): void {
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: this.screenManager.isPortrait() ? 360 : 480,
      maxHeight: this.screenManager.isPortrait() ? 720 : 660,
      padding: 28,
    });
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const useTwoColumn = this.screenManager.isLandscape() && this.screenManager.height <= 520;
    const rows = useTwoColumn ? Math.ceil(this.buttons.length / 2) : this.buttons.length;
    const noticeVisible = this.visualRestartNotice.visible;
    const availableHeight = panel.content.height - (noticeVisible ? 112 : 78);
    const gap = Math.min(
      metrics.gap,
      Math.max(metrics.height + 4, availableHeight / Math.max(rows - 1, 1)),
    );
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: this.buttons.length,
      centerX,
      startY: panel.content.y + (noticeVisible ? 94 : 64),
      mode: useTwoColumn ? 'twoColumn' : 'vertical',
      gap,
    });

    this.background.setPosition(centerX, centerY);
    this.background.setSize(panel.width, panel.height);
    this.panelImage?.setPosition(centerX, centerY);
    this.coverImage(this.panelImage, panel.width, panel.height);
    this.title.setPosition(centerX, panel.content.y + 26);
    this.title.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);
    this.visualRestartNotice.setPosition(centerX, panel.content.y + 60);
    this.visualRestartNotice.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.visualRestartNotice.setWordWrapWidth(panel.content.width - 12);

    this.buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setPosition(position.x, position.y);
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
    });
  }

  private coverImage(
    image: Phaser.GameObjects.Image | undefined,
    width: number,
    height: number,
  ): void {
    if (!image) {
      return;
    }

    const frame = image.texture.get();
    image.setScale(Math.max(width / frame.width, height / frame.height));
  }

  private formatOnOff(enabled: boolean): string {
    return enabled ? I18n.t('common.on') : I18n.t('common.off');
  }

  private cycleVolume(channel: 'bgm' | 'sfx' | 'weapon' | 'ui'): void {
    const currentVolume = AudioManager.getChannelVolume(channel);
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const currentIndex = steps.findIndex((step) => Math.abs(step - currentVolume) < 0.01);
    const nextVolume = steps[(currentIndex + 1) % steps.length];

    AudioManager.setChannelVolume(channel, nextVolume);
  }

  private formatVolume(volume: number): string {
    return `${Math.round(volume * 100)}%`;
  }

  private cycleDisplayQuality(current: DisplayQuality): void {
    const nextQuality = this.getNextValue(DISPLAY_QUALITIES, current);

    SettingsManager.updateDisplay({ displayQuality: nextQuality });
  }

  private cycleAssetStyle(current: AssetStyle): void {
    const nextStyle = this.getNextValue(ASSET_STYLES, current);

    SettingsManager.updateDisplay({ assetStyle: nextStyle });
  }

  private formatDisplayQuality(quality: DisplayQuality): string {
    switch (quality) {
      case 'medium':
        return this.t('settings.qualityMedium', 'Medium');
      case 'low':
        return this.t('settings.qualityLow', 'Low');
      case 'minimal':
        return this.t('settings.qualityMinimal', 'Minimal');
      case 'high':
      default:
        return this.t('settings.qualityHigh', 'High');
    }
  }

  private formatAssetStyle(assetStyle: AssetStyle): string {
    switch (assetStyle) {
      case 'legacy':
        return this.t('settings.assetStyleLegacy', 'Legacy');
      case 'graphics':
        return this.t('settings.assetStyleGraphics', 'Graphics');
      case 'newArt':
      default:
        return this.t('settings.assetStyleNew', 'New');
    }
  }

  private getNextValue<T extends string>(values: readonly T[], current: T): T {
    const currentIndex = values.indexOf(current);

    return values[(currentIndex + 1) % values.length] ?? values[0];
  }

  private syncSceneBgm(): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      return;
    }

    switch (this.scene.scene.key) {
      case 'TitleScene':
        AudioManager.playBgm(this.scene, 'title_bgm');
        break;
      case 'ResultScene':
        AudioManager.playBgm(this.scene, 'result_bgm');
        break;
      default:
        break;
    }
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
