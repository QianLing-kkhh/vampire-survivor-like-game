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
import { PanelFrame } from '../ui/components/PanelFrame';
import { SceneHeader } from '../ui/components/SceneHeader';
import { UIActionBar, UIActionBarAction } from '../ui/components/UIActionBar';
import { UITextBlock } from '../ui/components/UITextBlock';
import { DeveloperMenu } from '../ui/DeveloperMenu';
import { HelpOverlay } from '../ui/HelpOverlay';
import { SettingsMenu } from '../ui/SettingsMenu';
import { UITheme } from '../ui/UITheme';

type TitlePrimaryActionId = 'start';
type TitleSecondaryActionId =
  | 'selectCharacter'
  | 'selectStage'
  | 'settings'
  | 'help'
  | 'developer';

export class TitleScene extends Phaser.Scene {
  private static readonly AUTO_START_SECONDS = 10;
  private static autoStartCountdownConsumed = false;

  private statusText?: UITextBlock;
  private selectionText?: UITextBlock;
  private titleHeader?: SceneHeader;
  private menuFrame?: Phaser.GameObjects.Container;
  private primaryActionBar?: UIActionBar<TitlePrimaryActionId>;
  private secondaryActionBar?: UIActionBar<TitleSecondaryActionId>;
  private backgroundImage?: Phaser.GameObjects.Image;
  private autoStartText?: UITextBlock;
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

    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('title.gameTitle'),
      depth: 30,
    });

    this.statusText = new UITextBlock(this, {
      x: centerX,
      y: centerY - 92,
      text: this.formatStatus(),
      tone: 'muted',
      fontSize: UITheme.bodyFontSize,
      lineSpacing: 8,
    });

    this.selectionText = new UITextBlock(this, {
      x: centerX,
      y: centerY - 122,
      text: this.formatSelectionSummary(),
      tone: 'primary',
      fontSize: UITheme.smallFontSize,
    });

    this.autoStartText = new UITextBlock(this, {
      x: centerX,
      y: centerY - 44,
      tone: 'muted',
      fontSize: UITheme.bodyFontSize,
    });

    this.createActionBars();

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

  private createActionBars(): void {
    this.primaryActionBar?.destroy();
    this.secondaryActionBar?.destroy();

    const primaryActions: Array<UIActionBarAction<TitlePrimaryActionId>> = [
      {
        id: 'start',
        label: I18n.t('title.startGame'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          SelectionManager.clearChallengeSelection();
          PlaytestSettings.setAutoMode(false);
          PlaytestSettings.setFastMode(false);
          this.refreshStatus();
          this.scene.start('RunPreloadScene');
        },
      },
    ];
    const secondaryActions: Array<UIActionBarAction<TitleSecondaryActionId>> = [
      {
        id: 'selectCharacter',
        label: I18n.t('title.selectCharacter'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          this.scene.start('CharacterSelectScene');
        },
      },
      {
        id: 'selectStage',
        label: I18n.t('title.selectStage'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          this.scene.start('StageSelectScene');
        },
      },
      {
        id: 'settings',
        label: I18n.t('title.settings'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          this.showSettingsMenu();
        },
      },
      {
        id: 'help',
        label: I18n.t('common.help'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          this.showHelpOverlay();
        },
      },
      {
        id: 'developer',
        label: I18n.t('developer.title'),
        onClick: () => {
          this.cancelAutoStartCountdown();
          this.showDeveloperMenu();
        },
      },
    ];

    this.primaryActionBar = new UIActionBar(this, primaryActions);
    this.secondaryActionBar = new UIActionBar(this, secondaryActions);
    this.primaryActionBar.container.setDepth(40);
    this.secondaryActionBar.container.setDepth(40);
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const layout = LayoutConfig.getTitleLayout(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const buttonRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    const primaryWidth = Math.min(
      this.screenManager.width - (tiny ? 24 : 36),
      tiny ? 220 : compact ? 260 : 300,
    );
    const primaryHeight = tiny ? 34 : compact ? 38 : 44;
    const primaryFontSize = tiny ? '13px' : compact ? '15px' : layout.fontSize;

    if (this.primaryActionBar) {
      const primaryLayout = this.primaryActionBar.layout(
        this.screenManager,
        {
          x: this.screenManager.centerX - primaryWidth / 2,
          y: layout.buttonStartY - primaryHeight / 2,
          width: primaryWidth,
          height: primaryHeight,
        },
        {
          columns: 1,
          compact,
          minWidth: primaryWidth,
          maxWidth: primaryWidth,
          minHeight: primaryHeight,
          maxHeight: primaryHeight,
          fontSize: primaryFontSize,
        },
      );
      const position = primaryLayout.positions[0];
      buttonRects.push({
        x: position.x - primaryLayout.width / 2,
        y: position.y - primaryLayout.height / 2,
        width: primaryLayout.width,
        height: primaryLayout.height,
      });
    }

    const secondaryTop = layout.buttonStartY + primaryHeight / 2 + (tiny ? 8 : 10);
    this.layoutBackground();

    this.titleHeader?.setLayout(
      layout.titlePosition.x,
      layout.titlePosition.y,
      Math.min(this.screenManager.width - (tiny ? 24 : 48), compact ? 520 : 760),
      {
        titleFontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).title,
      },
    );
    this.selectionText?.setPosition(layout.statusPosition.x, layout.statusPosition.y - 30);
    this.selectionText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.statusText?.setPosition(layout.statusPosition.x, layout.statusPosition.y);
    this.statusText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.autoStartText?.setPosition(layout.countdownPosition.x, layout.countdownPosition.y);
    this.autoStartText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);

    if (this.secondaryActionBar) {
      const secondaryColumns = this.screenManager.isPortrait() ? 2 : 3;
      const secondaryButtonHeight = tiny ? 30 : compact ? 34 : 38;
      const secondaryRows = Math.ceil(5 / secondaryColumns);
      const secondaryGap = tiny ? 4 : compact ? 6 : 8;
      const secondaryAreaHeight = secondaryRows * secondaryButtonHeight
        + Math.max(0, secondaryRows - 1) * secondaryGap
        + (tiny ? 4 : 6);
      const secondaryLayout = this.secondaryActionBar.layout(
        this.screenManager,
        {
          x: tiny ? 10 : 14,
          y: secondaryTop,
          width: this.screenManager.width - (tiny ? 20 : 28),
          height: Math.max(
            1,
            Math.min(
              this.screenManager.height - secondaryTop - (tiny ? 10 : 16),
              secondaryAreaHeight,
            ),
          ),
        },
        {
          columns: secondaryColumns,
          compact,
          minWidth: tiny ? 86 : 104,
          maxWidth: tiny ? 126 : compact ? 152 : 172,
          minHeight: tiny ? 26 : 30,
          maxHeight: secondaryButtonHeight,
          fontSize: tiny ? '10px' : compact ? '11px' : '13px',
        },
      );
      secondaryLayout.positions.forEach((position) => {
        buttonRects.push({
          x: position.x - secondaryLayout.width / 2,
          y: position.y - secondaryLayout.height / 2,
          width: secondaryLayout.width,
          height: secondaryLayout.height,
        });
      });
    }
    this.layoutMenuFrame(layout, buttonRects);
  }

  private layoutMenuFrame(
    layout: ReturnType<typeof LayoutConfig.getTitleLayout>,
    buttonRects: Array<{ x: number; y: number; width: number; height: number }>,
  ): void {
    this.menuFrame?.destroy(true);
    this.menuFrame = undefined;

    if (!this.screenManager || buttonRects.length === 0) {
      return;
    }

    const buttonLeft = Math.min(...buttonRects.map((rect) => rect.x));
    const buttonRight = Math.max(...buttonRects.map((rect) => rect.x + rect.width));
    const buttonBottom = Math.max(...buttonRects.map((rect) => rect.y + rect.height));
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const top = layout.statusPosition.y - (compact ? 28 : 34);
    const bottom = buttonBottom + (compact ? 10 : 14);
    const width = Math.min(
      this.screenManager.width - 24,
      Math.max(buttonRight - buttonLeft + (compact ? 34 : 44), this.screenManager.isPortrait() ? 286 : 460),
    );
    const height = Math.max(compact ? 142 : 164, bottom - top);
    this.menuFrame = PanelFrame.create(this, {
      x: this.screenManager.centerX,
      y: top + height / 2,
      width,
      height,
      alpha: UITheme.hudPanelAlpha,
      variant: 'modal',
    });
    this.menuFrame.setDepth(-20);
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
    this.titleHeader?.setText(I18n.t('title.gameTitle'));
    this.createActionBars();
    this.selectionText?.setText(this.formatSelectionSummary());
    this.refreshStatus();

    if (this.autoStartCanceled) {
      this.autoStartText?.setText(I18n.t('title.autoTestCanceled'));
      this.applyLayout();
      return;
    }

    this.updateAutoStartText();
    this.applyLayout();
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
      `${I18n.t('settings.autoMovement')} ${settings.autoMovement ? I18n.t('common.on') : I18n.t('common.off')} / ${I18n.t('settings.autoUpgrade')} ${settings.autoUpgrade ? I18n.t('common.on') : I18n.t('common.off')}`,
      `${I18n.t('common.fastMode')} ${settings.fastMode ? I18n.t('common.on') : I18n.t('common.off')} / ${I18n.t('settings.endlessMode')} ${settings.endlessMode ? I18n.t('common.on') : I18n.t('common.off')} / ${I18n.t('common.timeScale')} ${this.getDisplayedTimeScale(settings)}x`,
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
    this.primaryActionBar?.destroy();
    this.primaryActionBar = undefined;
    this.secondaryActionBar?.destroy();
    this.secondaryActionBar = undefined;
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.menuFrame?.destroy(true);
    this.menuFrame = undefined;
    this.statusText?.destroy();
    this.statusText = undefined;
    this.selectionText?.destroy();
    this.selectionText = undefined;
    this.autoStartText?.destroy();
    this.autoStartText = undefined;
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
