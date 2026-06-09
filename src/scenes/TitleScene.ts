import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { DeveloperPlaytestPreset } from '../developer/DeveloperPlaytestPreset';
import { I18n } from '../i18n/I18n';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { UnlockManager } from '../unlock/UnlockManager';
import { DeveloperMenu } from '../ui/DeveloperMenu';
import { HelpOverlay } from '../ui/HelpOverlay';
import { SettingsMenu } from '../ui/SettingsMenu';
import { setTextHitArea, stopPointerEvent } from '../ui/input/UIInteraction';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

export class TitleScene extends Phaser.Scene {
  private static readonly AUTO_START_SECONDS = 10;
  private static autoStartCountdownConsumed = false;

  private statusText?: Phaser.GameObjects.Text;
  private selectionText?: Phaser.GameObjects.Text;
  private titleText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;
  private selectCharacterButton?: Phaser.GameObjects.Text;
  private selectStageButton?: Phaser.GameObjects.Text;
  private strategyButton?: Phaser.GameObjects.Text;
  private settingsButton?: Phaser.GameObjects.Text;
  private helpButton?: Phaser.GameObjects.Text;
  private developerButton?: Phaser.GameObjects.Text;
  private backgroundImage?: Phaser.GameObjects.Image;
  private autoStartText?: Phaser.GameObjects.Text;
  private autoStartTimer?: Phaser.Time.TimerEvent;
  private autoStartRemainingSeconds = TitleScene.AUTO_START_SECONDS;
  private autoStartCanceled = false;
  private helpOverlay?: HelpOverlay;
  private settingsMenu?: SettingsMenu;
  private developerMenu?: DeveloperMenu;
  private screenManager?: ScreenManager;
  private unsubscribeResize?: () => void;
  private cleaningUp = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cleaningUp = false;
    UnlockManager.clearTemporaryUnlocks();
    SettingsManager.clearVisualRestartRequired();
    PlaytestLogBuffer.clear();
    console.info('Playtest CSV buffer cleared on TitleScene entry.');
    this.screenManager = new ScreenManager(this);
    const centerX = this.screenManager.centerX;
    const centerY = this.screenManager.centerY;
    this.backgroundImage = this.createBackgroundImage();
    AudioManager.playBgm(this, 'title_bgm');

    this.titleText = this.add.text(centerX, centerY - 170, I18n.t('title.gameTitle'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.titleFontSize,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    this.statusText = this.add.text(centerX, centerY - 92, this.formatStatus(), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      align: 'center',
      lineSpacing: 8,
    });
    this.statusText.setOrigin(0.5);

    this.selectionText = this.add.text(centerX, centerY - 122, this.formatSelectionSummary(), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
    });
    this.selectionText.setOrigin(0.5);

    this.autoStartText = this.add.text(centerX, centerY - 44, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      align: 'center',
    });
    this.autoStartText.setOrigin(0.5);

    this.startButton = this.createButton(centerX, centerY - 8, I18n.t('title.startGame'), () => {
      this.cancelAutoStartCountdown();
      SelectionManager.clearChallengeSelection();
      PlaytestSettings.setAutoMode(false);
      PlaytestSettings.setFastMode(false);
      this.refreshStatus();
      this.scene.start('RunPreloadScene');
    });

    this.selectCharacterButton = this.createButton(centerX, centerY + 106, I18n.t('title.selectCharacter'), () => {
      this.cancelAutoStartCountdown();
      this.scene.start('CharacterSelectScene');
    });

    this.selectStageButton = this.createButton(centerX, centerY + 154, I18n.t('title.selectStage'), () => {
      this.cancelAutoStartCountdown();
      this.scene.start('StageSelectScene');
    });

    this.strategyButton = this.createButton(centerX, centerY + 202, 'Auto Strategy', () => {
      this.cancelAutoStartCountdown();
      this.scene.start('StrategyEditorScene');
    });

    this.settingsButton = this.createButton(centerX - 140, centerY + 132, I18n.t('title.settings'), () => {
      this.cancelAutoStartCountdown();
      this.showSettingsMenu();
    });

    this.helpButton = this.createButton(centerX + 140, centerY + 132, I18n.t('common.help'), () => {
      this.cancelAutoStartCountdown();
      this.showHelpOverlay();
    });

    this.developerButton = this.createButton(centerX, centerY + 132, I18n.t('developer.title'), () => {
      this.cancelAutoStartCountdown();
      this.showDeveloperMenu();
    });

    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    if (!TitleScene.autoStartCountdownConsumed) {
      this.startAutoStartCountdown();
    } else {
      this.autoStartCanceled = true;
      this.autoStartText?.setText('');
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const fontSize = this.screenManager
      ? LayoutConfig.getTitleLayout(this.screenManager).fontSize
      : '22px';
    const metrics = getButtonMetrics(this.scale.width, this.scale.height);
    const button = this.add.text(x, y, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize,
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
    button.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      onClick();
    });

    return button;
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const layout = LayoutConfig.getTitleLayout(this.screenManager);
    const buttons = [
      this.startButton,
      this.selectCharacterButton,
      this.selectStageButton,
      this.strategyButton,
      this.settingsButton,
      this.helpButton,
      this.developerButton,
    ].filter((button): button is Phaser.GameObjects.Text => button !== undefined);
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: buttons.length,
      startY: layout.buttonStartY,
      mode: this.screenManager.isPortrait() && buttons.length <= 8 ? 'vertical' : 'twoColumn',
      gap: layout.buttonGap,
    });
    this.layoutBackground();

    this.titleText?.setPosition(layout.titlePosition.x, layout.titlePosition.y);
    this.titleText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).title);
    this.selectionText?.setPosition(layout.statusPosition.x, layout.statusPosition.y - 30);
    this.selectionText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.statusText?.setPosition(layout.statusPosition.x, layout.statusPosition.y);
    this.statusText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.autoStartText?.setPosition(layout.countdownPosition.x, layout.countdownPosition.y);
    this.autoStartText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);

    buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setFontSize(buttonLayout.fontSize);
      setTextHitArea(button, buttonLayout.width, buttonLayout.height);
      button.setPosition(position.x, position.y);
    });
  }

  private createBackgroundImage(): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists('art_ui_title_bg')) {
      this.cameras.main.setBackgroundColor('#020617');
      return undefined;
    }

    const image = this.add.image(this.scale.width / 2, this.scale.height / 2, 'art_ui_title_bg');
    image.setDepth(-1000);
    this.coverImage(image, this.scale.width, this.scale.height);
    return image;
  }

  private layoutBackground(): void {
    if (!this.backgroundImage) {
      return;
    }

    this.backgroundImage.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.coverImage(this.backgroundImage, this.scale.width, this.scale.height);
  }

  private coverImage(
    image: Phaser.GameObjects.Image,
    width: number,
    height: number,
  ): void {
    const texture = image.texture;
    const frame = texture.get();
    const scale = Math.max(width / frame.width, height / frame.height);
    image.setScale(scale);
  }

  private refreshStatus(): void {
    this.statusText?.setText(this.formatStatus());
  }

  private refreshTexts(): void {
    this.titleText?.setText(I18n.t('title.gameTitle'));
    this.startButton?.setText(I18n.t('title.startGame'));
    this.selectCharacterButton?.setText(I18n.t('title.selectCharacter'));
    this.selectStageButton?.setText(I18n.t('title.selectStage'));
    this.strategyButton?.setText('Auto Strategy');
    this.settingsButton?.setText(I18n.t('title.settings'));
    this.helpButton?.setText(I18n.t('common.help'));
    this.developerButton?.setText(I18n.t('developer.title'));
    this.selectionText?.setText(this.formatSelectionSummary());
    this.refreshStatus();

    if (this.autoStartCanceled) {
      this.autoStartText?.setText(I18n.t('title.autoTestCanceled'));
      return;
    }

    this.updateAutoStartText();
  }

  private startAutoStartCountdown(): void {
    this.autoStartRemainingSeconds = TitleScene.AUTO_START_SECONDS;
    this.autoStartCanceled = false;
    TitleScene.autoStartCountdownConsumed = true;
    this.updateAutoStartText();

    this.autoStartTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.autoStartCanceled) {
          return;
        }

        this.autoStartRemainingSeconds -= 1;
        this.updateAutoStartText();

        if (this.autoStartRemainingSeconds > 0) {
          return;
        }

        this.startAutoTest();
      },
    });
  }

  private cancelAutoStartCountdown(): void {
    this.autoStartCanceled = true;
    TitleScene.autoStartCountdownConsumed = true;
    this.autoStartTimer?.remove(false);
    this.autoStartTimer = undefined;
    this.autoStartText?.setText(I18n.t('title.autoTestCanceled'));
  }

  private updateAutoStartText(): void {
    this.autoStartText?.setText(
      I18n.t('title.autoStartCountdown', { seconds: this.autoStartRemainingSeconds }),
    );
  }

  private startAutoTest(): void {
    this.autoStartTimer?.remove(false);
    this.autoStartTimer = undefined;
    DeveloperPlaytestPreset.startFullAutoTestRun(this);
  }

  private showHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this, () => {
      this.helpOverlay = undefined;
    });
  }

  private showSettingsMenu(): void {
    this.settingsMenu?.destroy();
    this.settingsMenu = new SettingsMenu(this, () => {
      this.settingsMenu?.destroy();
      this.settingsMenu = undefined;
      this.refreshTexts();
    }, () => this.refreshTexts());
  }

  private showDeveloperMenu(): void {
    this.developerMenu?.destroy();
    this.developerMenu = new DeveloperMenu(this, {
      onClose: () => {
        this.developerMenu = undefined;
        if (this.cleaningUp || !this.scene.isActive()) {
          return;
        }
        this.refreshTexts();
      },
      onStartAutoTest: () => {
        this.cancelAutoStartCountdown();
        DeveloperPlaytestPreset.startFullAutoTestRun(this);
      },
      onOpenScene: (sceneKey) => {
        this.cancelAutoStartCountdown();
        this.scene.start(sceneKey);
      },
    });
  }

  private formatStatus(): string {
    const settings = PlaytestSettings.get();

    return [
      `Auto Move ${settings.autoMovement ? I18n.t('common.on') : I18n.t('common.off')} / Auto Upgrade ${settings.autoUpgrade ? I18n.t('common.on') : I18n.t('common.off')}`,
      `${I18n.t('common.fastMode')} ${settings.fastMode ? I18n.t('common.on') : I18n.t('common.off')} / Endless ${settings.endlessMode ? I18n.t('common.on') : I18n.t('common.off')} / ${I18n.t('common.timeScale')} ${this.getDisplayedTimeScale(settings)}x`,
    ].join('\n');
  }

  private formatSelectionSummary(): string {
    const summary = SelectionManager.getSummary();

    return I18n.t('title.currentSelection', {
      character: summary.characterName,
      stage: summary.stageName,
      map: summary.mapName,
    });
  }

  private getDisplayedTimeScale(settings: PlaytestSettingsState): number {
    if (!settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }

  private cleanup(): void {
    this.cleaningUp = true;
    this.autoStartTimer?.remove(false);
    this.autoStartTimer = undefined;
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
    this.settingsMenu?.destroy();
    this.settingsMenu = undefined;
    this.developerMenu?.destroy({ notifyClose: false });
    this.developerMenu = undefined;
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
