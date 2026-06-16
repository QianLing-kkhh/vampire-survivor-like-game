import Phaser from 'phaser';

import { ChallengeManager } from '../challenge/ChallengeManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { ChallengeSummaryPanel } from '../ui/ChallengeSummaryPanel';
import { UIActionBar } from '../ui/components/UIActionBar';
import { SceneHeader } from '../ui/components/SceneHeader';
import { DailyChallengePanel } from '../ui/DailyChallengePanel';

type DailyChallengeActionId = 'start' | 'copySeed' | 'records' | 'back';

export class DailyChallengeScene extends Phaser.Scene {
  private readonly challengeManager = new ChallengeManager();
  private screenManager?: ScreenManager;
  private titleHeader?: SceneHeader;
  private actionBar?: UIActionBar<DailyChallengeActionId>;
  private summaryPanel?: ChallengeSummaryPanel;
  private detailPanel?: DailyChallengePanel;
  private unsubscribeResize?: () => void;

  constructor() {
    super('DailyChallengeScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);

    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('dailyChallenge.title'),
    });

    this.actionBar = new UIActionBar<DailyChallengeActionId>(this, [
      { id: 'start', label: I18n.t('dailyChallenge.start'), onClick: () => this.startChallenge() },
      { id: 'copySeed', label: I18n.t('dailyChallenge.copySeed'), onClick: () => { void this.copySeed(); } },
      { id: 'records', label: I18n.t('title.records'), onClick: () => this.scene.start('RecordsScene') },
      { id: 'back', label: I18n.t('dailyChallenge.back'), onClick: () => this.scene.start('TitleScene') },
    ]);

    this.createOrUpdatePanels();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const safeMargin = tiny ? 10 : compact ? 12 : 16;
    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      tiny ? 24 : compact ? 30 : 38,
      Math.min(this.screenManager.width - 24, 760),
      { titleFontSize: fonts.title },
    );

    this.layoutActionButtons(compact, tiny, safeMargin);
    this.createOrUpdatePanels();
    this.render();
  }

  private layoutActionButtons(compact: boolean, tiny: boolean, safeMargin: number): void {
    if (!this.screenManager || !this.actionBar) {
      return;
    }

    this.actionBar.layout(
      this.screenManager,
      {
        x: safeMargin,
        y: this.getActionAreaTop(tiny, compact, safeMargin),
        width: this.screenManager.width - safeMargin * 2,
        height: this.getActionAreaHeight(tiny, compact),
      },
      {
        columns: this.screenManager.isPortrait() ? 2 : 4,
        compact,
        minWidth: tiny ? 78 : 98,
        maxWidth: tiny ? 120 : compact ? 150 : 176,
        minHeight: tiny ? 24 : 28,
        maxHeight: tiny ? 28 : compact ? 32 : 36,
        fontSize: tiny ? '9px' : compact ? '10px' : '12px',
      },
    );
  }

  private createOrUpdatePanels(): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const margin = tiny ? 10 : compact ? 12 : 18;
    const top = tiny ? 58 : compact ? 68 : 82;
    const width = this.screenManager.width - margin * 2;
    const bottom = this.getActionAreaTop(tiny, compact, margin) - (tiny ? 8 : 12);
    const gap = tiny ? 8 : 12;
    const availableHeight = Math.max(tiny ? 170 : 220, bottom - top);
    const detailHeight = Phaser.Math.Clamp(
      availableHeight * (this.screenManager.isPortrait() ? 0.28 : 0.24),
      this.screenManager.isPortrait() ? tiny ? 112 : 128 : tiny ? 64 : 78,
      this.screenManager.isPortrait() ? tiny ? 220 : 240 : compact ? 128 : 240,
    );
    const summaryHeight = Math.max(tiny ? 120 : compact ? 150 : 190, availableHeight - detailHeight - gap);

    if (!this.summaryPanel) {
      this.summaryPanel = new ChallengeSummaryPanel(this, margin, top, width, summaryHeight);
      this.detailPanel = new DailyChallengePanel(
        this,
        margin,
        top + summaryHeight + gap,
        width,
        detailHeight,
      );
      return;
    }

    this.summaryPanel.updateLayout(margin, top, width, summaryHeight);
    this.detailPanel?.updateLayout(margin, top + summaryHeight + gap, width, detailHeight);
  }

  private getActionAreaTop(tiny: boolean, compact: boolean, margin: number): number {
    if (!this.screenManager) {
      return 0;
    }

    return this.screenManager.height - margin - this.getActionAreaHeight(tiny, compact);
  }

  private getActionAreaHeight(tiny: boolean, compact: boolean): number {
    if (!this.screenManager) {
      return 0;
    }

    if (this.screenManager.isPortrait()) {
      return tiny ? 64 : compact ? 72 : 84;
    }

    return tiny ? 30 : compact ? 36 : 42;
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
    this.scene.start('RunPreloadScene');
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
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
    this.summaryPanel?.destroy();
    this.summaryPanel = undefined;
    this.detailPanel?.destroy();
    this.detailPanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
