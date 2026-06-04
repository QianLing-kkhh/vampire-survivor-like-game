import Phaser from 'phaser';

import { ChallengeManager } from '../challenge/ChallengeManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { ChallengeSummaryPanel } from '../ui/ChallengeSummaryPanel';
import { DailyChallengePanel } from '../ui/DailyChallengePanel';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

export class DailyChallengeScene extends Phaser.Scene {
  private readonly challengeManager = new ChallengeManager();
  private screenManager?: ScreenManager;
  private titleText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;
  private copySeedButton?: Phaser.GameObjects.Text;
  private recordsButton?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private summaryPanel?: ChallengeSummaryPanel;
  private detailPanel?: DailyChallengePanel;
  private unsubscribeResize?: () => void;

  constructor() {
    super('DailyChallengeScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);

    this.titleText = this.add.text(
      this.screenManager.centerX,
      38,
      I18n.t('dailyChallenge.title'),
      {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.titleFontSize,
        fontStyle: 'bold',
      },
    );
    this.titleText.setOrigin(0.5);

    this.startButton = this.createButton(I18n.t('dailyChallenge.start'), () => {
      this.startChallenge();
    });
    this.copySeedButton = this.createButton(I18n.t('dailyChallenge.copySeed'), () => {
      void this.copySeed();
    });
    this.recordsButton = this.createButton(I18n.t('title.records'), () => {
      this.scene.start('RecordsScene');
    });
    this.backButton = this.createButton(I18n.t('dailyChallenge.back'), () => {
      this.scene.start('TitleScene');
    });

    this.createOrUpdatePanels();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private createButton(
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.scale.width, this.scale.height);
    const button = this.add.text(0, 0, label, {
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
    button.on('pointerover', () => button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor)));
    button.on('pointerout', () => button.setBackgroundColor(toCssColor(UITheme.buttonBgColor)));
    button.on('pointerdown', onClick);

    return button;
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    this.titleText?.setPosition(this.screenManager.centerX, 38);
    this.titleText?.setFontSize(fonts.title);

    const buttons = [
      this.startButton,
      this.copySeedButton,
      this.recordsButton,
      this.backButton,
    ].filter((button): button is Phaser.GameObjects.Text => button !== undefined);
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: buttons.length,
      startY: this.screenManager.isPortrait() ? 92 : 86,
      mode: this.screenManager.isPortrait() ? 'vertical' : 'twoColumn',
      gap: this.screenManager.isPortrait() ? 42 : 44,
    });

    buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
      button.setPosition(position.x, position.y);
    });

    this.createOrUpdatePanels();
    this.render();
  }

  private createOrUpdatePanels(): void {
    if (!this.screenManager) {
      return;
    }

    const top = this.screenManager.isPortrait() ? 260 : 164;
    const margin = 18;
    const width = this.screenManager.width - margin * 2;
    const detailHeight = this.screenManager.isPortrait() ? 98 : 88;
    const summaryHeight = Math.max(
      240,
      this.screenManager.height - top - detailHeight - 42,
    );

    if (!this.summaryPanel) {
      this.summaryPanel = new ChallengeSummaryPanel(this, margin, top, width, summaryHeight);
      this.detailPanel = new DailyChallengePanel(
        this,
        margin,
        top + summaryHeight + 12,
        width,
        detailHeight,
      );
      return;
    }

    this.summaryPanel.updateLayout(margin, top, width, summaryHeight);
    this.detailPanel?.updateLayout(margin, top + summaryHeight + 12, width, detailHeight);
  }

  private render(): void {
    const challenge = this.challengeManager.getTodayChallenge();

    this.summaryPanel?.render(challenge);
    this.detailPanel?.render(challenge);
  }

  private startChallenge(): void {
    const challenge = this.challengeManager.getTodayChallenge();

    if (!challenge || !this.challengeManager.activateChallenge(challenge.id)) {
      this.detailPanel?.setMessage([I18n.t('dailyChallenge.noChallenge')]);
      return;
    }

    SettingsManager.updateGameplay({
      endlessMode: challenge.endlessMode === true,
    });
    this.scene.start('GameScene');
  }

  private async copySeed(): Promise<void> {
    const challenge = this.challengeManager.getTodayChallenge();

    if (!challenge) {
      this.detailPanel?.setMessage([I18n.t('dailyChallenge.noChallenge')]);
      return;
    }

    try {
      await globalThis.navigator?.clipboard?.writeText(challenge.seed);
      this.detailPanel?.setMessage([I18n.t('dailyChallenge.copySeed'), challenge.seed]);
    } catch {
      console.log(challenge.seed);
      this.detailPanel?.setMessage([
        I18n.t('dailyChallenge.copySeed'),
        'Clipboard unavailable; seed logged to console.',
      ]);
    }
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.summaryPanel?.destroy();
    this.summaryPanel = undefined;
    this.detailPanel?.destroy();
    this.detailPanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
