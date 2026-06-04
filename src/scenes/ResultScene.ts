import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { EndlessLeaderboardEntry } from '../endless/EndlessLeaderboard';
import { I18n } from '../i18n/I18n';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { PassiveLevel } from '../passive/PassiveItem';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsMenu } from '../ui/SettingsMenu';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

interface ResultSceneData {
  runId?: string;
  autoMode?: boolean;
  fastMode?: boolean;
  timeScale?: number;
  survivalTime?: number;
  survivalTimeSeconds?: number;
  resultType?: 'gameOver' | 'victory';
  finalLevel?: number;
  killCount?: number;
  treasureDropCount?: number;
  treasureOpenCount?: number;
  treasureUpgradePath?: string[];
  chestUpgradeCount?: number;
  chestEvolutionCount?: number;
  totalRewardCount?: number;
  evolutionPath?: string[];
  bossSpawned?: boolean;
  bossKilled?: boolean;
  bossSpawnTime?: number;
  bossKillTime?: number;
  bossFightDuration?: number;
  bossDashCount?: number;
  bossDashHitCount?: number;
  endlessMode?: boolean;
  endlessStarted?: boolean;
  endlessSurvivalTime?: number;
  endlessEnemyKills?: number;
  endlessDamageTaken?: number;
  endlessLeaderboardRank?: number;
  endlessLeaderboardEntries?: EndlessLeaderboardEntry[];
  weaponIds?: string[];
  passiveItems?: PassiveLevel[];
  upgradePath?: string[];
  playtestCsv?: string;
  bufferedRunsCount?: number;
}

export class ResultScene extends Phaser.Scene {
  private static readonly AUTO_RESTART_SECONDS = 10;

  private hasRestarted = false;
  private settingsText?: Phaser.GameObjects.Text;
  private csvLogText?: Phaser.GameObjects.Text;
  private autoRestartText?: Phaser.GameObjects.Text;
  private autoRestartTimer?: Phaser.Time.TimerEvent;
  private autoRestartRemainingSeconds = ResultScene.AUTO_RESTART_SECONDS;
  private autoRestartCanceled = false;
  private settings = PlaytestSettings.get();
  private screenManager?: ScreenManager;
  private resizeTimer?: Phaser.Time.TimerEvent;
  private currentData?: ResultSceneData;
  private backgroundImage?: Phaser.GameObjects.Image;
  private settingsMenu?: SettingsMenu;

  constructor() {
    super('ResultScene');
  }

  create(data: ResultSceneData): void {
    this.currentData = data;
    this.screenManager = new ScreenManager(this);
    this.backgroundImage = this.createBackgroundImage();
    this.hasRestarted = false;
    this.settings = PlaytestSettings.get();
    AudioManager.playBgm(this, 'result_bgm');
    AudioManager.playSfx(this, data.resultType === 'victory' ? 'victory' : 'game_over');
    const layout = LayoutConfig.getResultSceneLayout(this.screenManager);
    const centerX = this.screenManager.centerX;
    const survivalTimeSeconds = data.survivalTime ?? data.survivalTimeSeconds ?? 0;
    const isVictory = data.resultType === 'victory';
    const isEndlessResult = data.endlessStarted === true;
    const weaponText = data.weaponIds && data.weaponIds.length > 0
      ? this.truncateList(data.weaponIds)
      : I18n.t('common.none');
    const passiveText = data.passiveItems && data.passiveItems.length > 0
      ? this.truncateList(data.passiveItems
        .map((passive) => `${passive.name} Lv${passive.level}`)
        , 4)
      : I18n.t('common.none');
    const evolutionPathText = data.evolutionPath && data.evolutionPath.length > 0
      ? this.truncateList(data.evolutionPath, 3)
      : I18n.t('common.none');
    const playtestCsv = data.playtestCsv ?? '';

    const resultTitle = isEndlessResult
      ? 'Endless Victory'
      : isVictory ? I18n.t('result.victory') : I18n.t('result.gameOver');
    const title = this.add.text(centerX, layout.headerY, resultTitle, {
      color: isVictory ? UITheme.successTextColor : UITheme.dangerTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: this.screenManager.isPortrait() ? '28px' : UITheme.titleFontSize,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const summaryLines = this.getSummaryLines({
      data,
      resultTitle,
      survivalTimeSeconds,
      isEndlessResult,
      weaponText,
      passiveText,
      evolutionPathText,
      maxRows: layout.summaryMaxRows,
    });
    const result = this.add.text(
      layout.summaryArea.x + layout.summaryArea.width / 2,
      layout.summaryArea.y,
      summaryLines,
      {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: layout.fontSize,
        align: 'center',
        lineSpacing: this.screenManager.isPortrait() ? 2 : 4,
        wordWrap: { width: layout.summaryArea.width },
      },
    );
    result.setOrigin(0.5, 0);

    if (isEndlessResult && data.endlessLeaderboardEntries?.length) {
      const leaderboard = this.add.text(
        layout.leaderboardArea.x + layout.leaderboardArea.width / 2,
        layout.leaderboardArea.y,
        this.formatLeaderboardLines(data.endlessLeaderboardEntries, layout.leaderboardMaxRows),
        {
          color: UITheme.mutedTextColor,
          fontFamily: UITheme.fontFamily,
          fontSize: layout.smallFontSize,
          align: 'center',
          lineSpacing: 2,
          wordWrap: { width: layout.leaderboardArea.width },
        },
      );
      leaderboard.setOrigin(0.5, 0);
    }

    this.autoRestartText = this.add.text(centerX, layout.autoRestartY, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.smallFontSize,
      align: 'center',
    });
    this.autoRestartText.setOrigin(0.5);

    const currentCsvButton = this.add.text(centerX, 0, I18n.t('result.downloadCurrentCsv'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    currentCsvButton.setOrigin(0.5);
    currentCsvButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(currentCsvButton);
    currentCsvButton.on('pointerdown', () => {
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.downloadCsv(this.createCurrentCsvFilename(), playtestCsv);
    });

    const downloadAllButton = this.add.text(centerX, 0, I18n.t('result.downloadAllCsv'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    downloadAllButton.setOrigin(0.5);
    downloadAllButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(downloadAllButton);
    downloadAllButton.on('pointerdown', () => {
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.downloadAllCsv();
    });

    const settingsButton = this.add.text(centerX, 0, this.t('result.settings', 'Settings'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    settingsButton.setOrigin(0.5);
    settingsButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(settingsButton);
    settingsButton.on('pointerdown', () => {
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showSettingsMenu();
    });

    const restartButton = this.add.text(centerX, 0, I18n.t('result.restart'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 16,
        y: 8,
      },
    });
    restartButton.setOrigin(0.5);
    restartButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(restartButton);
    restartButton.on('pointerdown', () => {
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.restartGame();
    });

    const titleButton = this.add.text(centerX, 0, I18n.t('common.returnToTitle'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 16,
        y: 8,
      },
    });
    titleButton.setOrigin(0.5);
    titleButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(titleButton);
    titleButton.on('pointerdown', () => {
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('TitleScene');
    });

    this.layoutButtons([
      currentCsvButton,
      downloadAllButton,
      restartButton,
      titleButton,
      settingsButton,
    ]);
    this.screenManager.onResize(() => {
      this.scheduleResponsiveRestart();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    if (data.autoMode) {
      this.startAutoRestartCountdown();
    }
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private truncateList(items: readonly string[], maxItems = 5): string {
    if (items.length <= maxItems) {
      return items.join(', ');
    }

    return `${items.slice(0, maxItems).join(', ')} +${items.length - maxItems} more`;
  }

  private getSummaryLines(params: {
    data: ResultSceneData;
    resultTitle: string;
    survivalTimeSeconds: number;
    isEndlessResult: boolean;
    weaponText: string;
    passiveText: string;
    evolutionPathText: string;
    maxRows: number;
  }): string[] {
    const lines = [
      `${I18n.t('result.result')}: ${params.resultTitle}`,
      `${I18n.t('result.survivalTime')}: ${this.formatTime(params.survivalTimeSeconds)}`,
      ...(params.isEndlessResult ? [
        `Endless Survival Time: ${this.formatTime(params.data.endlessSurvivalTime ?? 0)}`,
      ] : []),
      `${I18n.t('result.finalLevel')}: ${params.data.finalLevel ?? 1}`,
      `${I18n.t('result.killCount')}: ${params.data.killCount ?? 0}`,
      `${I18n.t('result.weapons')}: ${params.weaponText}`,
      `${I18n.t('result.passives')}: ${params.passiveText}`,
      `${I18n.t('result.evolutionPath')}: ${params.evolutionPathText}`,
      `${I18n.t('result.treasureOpens')}: ${params.data.treasureOpenCount ?? 0}`,
      `${I18n.t('result.chestUpgrades')}: ${params.data.chestUpgradeCount ?? 0}`,
      `${I18n.t('result.chestEvolutions')}: ${params.data.chestEvolutionCount ?? 0}`,
      `${I18n.t('result.bossDashes')}: ${params.data.bossDashCount ?? 0} / ${I18n.t('result.bossDashHits')}: ${params.data.bossDashHitCount ?? 0}`,
    ];

    if (lines.length <= params.maxRows) {
      return lines;
    }

    return [
      ...lines.slice(0, Math.max(1, params.maxRows - 1)),
      `+${lines.length - params.maxRows + 1} more`,
    ];
  }

  private formatLeaderboardLines(entries: EndlessLeaderboardEntry[], maxRows: number): string[] {
    if (entries.length === 0) {
      return ['Endless Leaderboard: None'];
    }

    const visibleCount = Math.max(0, maxRows);
    const visibleEntries = entries.slice(0, visibleCount);
    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

    return [
      'Endless Leaderboard Top 10',
      ...visibleEntries.map((entry, index) => (
        `#${index + 1} ${this.formatTime(entry.endlessSurvivalTime)}  Lv.${entry.finalLevel}  Kills ${entry.killCount}`
      )),
      ...(hiddenCount > 0 ? [`+${hiddenCount} more`] : []),
    ];
  }

  private addButtonHover(
    button: Phaser.GameObjects.Text,
    backgroundColor = toCssColor(UITheme.buttonBgColor),
    hoverColor = toCssColor(UITheme.buttonHoverColor),
  ): void {
    button.on('pointerover', () => {
      button.setBackgroundColor(hoverColor);
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(backgroundColor);
    });
  }

  private formatSettingsText(): string {
    return [
      `${I18n.t('common.autoMode')}: ${this.settings.autoMode ? I18n.t('common.on') : I18n.t('common.off')}`,
      `${I18n.t('common.fastMode')}: ${this.settings.fastMode ? I18n.t('common.on') : I18n.t('common.off')}`,
      `${I18n.t('common.timeScale')}: ${this.getDisplayedTimeScale(this.settings)}x`,
    ].join('   ');
  }

  private getDisplayedTimeScale(settings: PlaytestSettingsState): number {
    if (!settings.autoMode || !settings.fastMode) {
      return 1;
    }

    return settings.autoTimeScale;
  }

  private updateSettingsText(): void {
    this.settingsText?.setText(this.formatSettingsText());
  }

  private formatCsvLogText(): string[] {
    return [
      I18n.t('result.csvHidden'),
      `${I18n.t('result.bufferedRunsCount')}: ${PlaytestLogBuffer.getCount()}`,
    ];
  }

  private updateCsvLogText(): void {
    this.csvLogText?.setText(this.formatCsvLogText());
  }

  private startAutoRestartCountdown(): void {
    this.autoRestartRemainingSeconds = ResultScene.AUTO_RESTART_SECONDS;
    this.autoRestartCanceled = false;
    this.updateAutoRestartText();

    this.autoRestartTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.autoRestartCanceled) {
          return;
        }

        this.autoRestartRemainingSeconds -= 1;
        this.updateAutoRestartText();

        if (this.autoRestartRemainingSeconds > 0) {
          return;
        }

        this.restartGame();
      },
    });
  }

  private cancelAutoRestart(): void {
    this.autoRestartCanceled = true;
    this.autoRestartTimer?.remove(false);
    this.autoRestartTimer = undefined;
    this.autoRestartText?.setText(I18n.t('result.autoRestartCanceled'));
  }

  private updateAutoRestartText(): void {
    this.autoRestartText?.setText(
      I18n.t('result.autoRestart', { seconds: this.autoRestartRemainingSeconds }),
    );
  }

  private copyCsv(playtestCsv: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(playtestCsv).catch(() => {
        console.log('Playtest CSV:', playtestCsv);
      });
      return;
    }

    console.log('Playtest CSV:', playtestCsv);
  }

  private downloadAllCsv(): void {
    if (!PlaytestLogBuffer.hasRows()) {
      console.warn('No buffered playtest CSV rows to download');
      return;
    }

    this.downloadCsv(
      this.createCsvFilename(),
      PlaytestLogBuffer.getAllCsvWithHeader(),
    );
  }

  private downloadCsv(filename: string, csv: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private createCsvFilename(): string {
    const stamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');

    return `playtest_results_${stamp}.csv`;
  }

  private createCurrentCsvFilename(): string {
    const stamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');

    return `playtest_current_${stamp}.csv`;
  }

  private showSettingsMenu(): void {
    this.settingsMenu?.destroy();
    this.settingsMenu = new SettingsMenu(this, () => {
      this.settingsMenu?.destroy();
      this.settingsMenu = undefined;
      this.settings = PlaytestSettings.get();
      this.updateSettingsText();
    }, () => {
      this.settings = PlaytestSettings.get();
      this.updateSettingsText();
    });
  }

  private restartGame(): void {
    if (this.hasRestarted) {
      return;
    }

    this.hasRestarted = true;
    this.autoRestartTimer?.remove(false);
    this.autoRestartTimer = undefined;
    this.scene.stop('UIScene');
    this.scene.start('GameScene');
  }

  private layoutButtons(buttons: Phaser.GameObjects.Text[]): void {
    if (!this.screenManager) {
      return;
    }

    const layout = LayoutConfig.getResultSceneLayout(this.screenManager);
    const buttonLayout = layout.buttonLayout;
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);

    this.layoutBackground();

    buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      const x = buttonLayout.mode === 'twoColumn' && buttons.length % 2 === 1 && index === buttons.length - 1
        ? this.screenManager?.centerX ?? position.x
        : position.x;

      button.setFontSize(metrics.fontSize);
      button.setFixedSize(metrics.width, metrics.height);
      button.setAlign('center');
      button.setPosition(x, position.y);
    });
  }

  private createBackgroundImage(): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists('art_ui_result_bg')) {
      this.cameras.main.setBackgroundColor('#020617');
      return undefined;
    }

    const image = this.add.image(this.scale.width / 2, this.scale.height / 2, 'art_ui_result_bg');
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
    const frame = image.texture.get();
    image.setScale(Math.max(width / frame.width, height / frame.height));
  }

  private scheduleResponsiveRestart(): void {
    if (!this.currentData) {
      return;
    }

    this.resizeTimer?.remove(false);
    this.resizeTimer = this.time.delayedCall(80, () => {
      this.scene.restart(this.currentData);
    });
  }

  private cleanup(): void {
    this.resizeTimer?.remove(false);
    this.resizeTimer = undefined;
    this.settingsMenu?.destroy();
    this.settingsMenu = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
