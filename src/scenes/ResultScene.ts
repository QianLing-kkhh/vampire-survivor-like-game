import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { CharacterManager } from '../character/CharacterManager';
import { EndlessLeaderboardEntry } from '../endless/EndlessLeaderboard';
import { I18n } from '../i18n/I18n';
import type { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { PassiveLevel } from '../passive/PassiveItem';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { RANDOM_UNLOCKED_STAGE_ID, StageManager } from '../stage/StageManager';
import type { StrategyTelemetrySummary } from '../telemetry/StrategyTelemetry';
import { UIActionBar, UIActionBarAction } from '../ui/components/UIActionBar';
import { UIListRow, UIListRowTone } from '../ui/components/UIListRow';
import { PanelFrame } from '../ui/components/PanelFrame';
import { PanelHeader } from '../ui/components/PanelHeader';
import { UIStatRow } from '../ui/components/UIStatRow';
import { UITextBlock } from '../ui/components/UITextBlock';
import { DeveloperMenu } from '../ui/DeveloperMenu';
import { SelectionListPanel } from '../ui/SelectionListPanel';
import { SettingsMenu } from '../ui/SettingsMenu';
import { StatsBuildPanel } from '../ui/stats/StatsBuildPanel';
import { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import { UITheme } from '../ui/UITheme';

interface ResultSceneData {
  runId?: string;
  runSeed?: string;
  characterId?: string;
  stageId?: string;
  mapId?: string;
  difficultyId?: string;
  customStageId?: string;
  challengeId?: string;
  rulesetId?: string;
  seed?: string;
  leaderboardKey?: string;
  autoMode?: boolean;
  controlMode?: 'manual' | 'autoStrategy' | 'replay';
  autoChallengeType?: 'normal' | 'endless' | 'scoreAttack';
  strategyProfileId?: string;
  strategyProfileHash?: string;
  strategyControlType?: 'fixed' | 'live';
  allowRuntimeStrategyEdit?: boolean;
  runtimeStrategyEdited?: boolean;
  strategyEditCount?: number;
  runtimeStrategyFinalHash?: string;
  strategyEditTimeline?: string;
  simulationSpeedMultiplier?: number;
  speedBucket?: string;
  fastMode?: boolean;
  timeScale?: number;
  survivalTime?: number;
  survivalTimeSeconds?: number;
  resultType?: 'gameOver' | 'victory';
  finalLevel?: number;
  score?: number;
  normalEnemyScore?: number;
  miniBossScore?: number;
  finalBossScore?: number;
  treasureScore?: number;
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
  localLeaderboardRank?: number;
  localLeaderboardEntries?: LeaderboardRecord[];
  endlessBossSpawnCount?: number;
  endlessBossKillCount?: number;
  endlessBossIdsKilled?: string[];
  endlessBossSkillHitCount?: number;
  endlessBossSkillUseCount?: number;
  weaponIds?: string[];
  passiveItems?: PassiveLevel[];
  relicIds?: string[];
  relicNames?: string[];
  upgradePath?: string[];
  playtestCsv?: string;
  bufferedRunsCount?: number;
  strategyTelemetrySummary?: StrategyTelemetrySummary;
  unlockMessages?: string[];
  statsBuildSnapshot?: StatsBuildSnapshot;
}

type ResultSummaryLine = {
  label?: string;
  value?: string;
  text?: string;
  emphasis?: boolean;
};

type ResultLeaderboardRow = {
  label: string;
  value?: string;
  status?: string;
  tone?: UIListRowTone;
};

type ResultPrimaryActionId = 'restart';
type ResultSecondaryActionId =
  | 'selectCharacter'
  | 'selectStage'
  | 'statsBuild'
  | 'title'
  | 'settings'
  | 'developer';

export class ResultScene extends Phaser.Scene {
  private static readonly AUTO_RESTART_SECONDS = 10;

  private hasRestarted = false;
  private settingsText?: Phaser.GameObjects.Text;
  private csvLogText?: Phaser.GameObjects.Text;
  private autoRestartText?: UITextBlock;
  private autoRestartTimer?: Phaser.Time.TimerEvent;
  private autoRestartRemainingSeconds = ResultScene.AUTO_RESTART_SECONDS;
  private autoRestartCanceled = false;
  private settings = PlaytestSettings.get();
  private screenManager?: ScreenManager;
  private resizeTimer?: Phaser.Time.TimerEvent;
  private currentData?: ResultSceneData;
  private backgroundImage?: Phaser.GameObjects.Image;
  private settingsMenu?: SettingsMenu;
  private developerMenu?: DeveloperMenu;
  private selectionPanel?: SelectionListPanel;
  private statsBuildPanel?: StatsBuildPanel;
  private primaryActionBar?: UIActionBar<ResultPrimaryActionId>;
  private secondaryActionBar?: UIActionBar<ResultSecondaryActionId>;

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
    const playtestCsv = data.playtestCsv ?? '';

    const resultTitle = isEndlessResult
      ? I18n.t('result.endlessVictory')
      : isVictory ? I18n.t('result.victory') : I18n.t('result.gameOver');
    this.createResultShell(layout, resultTitle, isVictory);

    const summaryLines = this.getSummaryLines({
      data,
      resultTitle,
      survivalTimeSeconds,
      isEndlessResult,
      unlockMessages: data.unlockMessages ?? [],
      maxRows: layout.summaryMaxRows,
    });
    this.createInfoPanel(layout.summaryArea, 0.22);
    this.renderSummaryLines(layout.summaryArea, summaryLines, layout);

    if (isEndlessResult && data.endlessLeaderboardEntries?.length) {
      this.createInfoPanel(layout.leaderboardArea, 0.16);
      this.renderLeaderboardRows(
        layout.leaderboardArea,
        this.formatLeaderboardRows(data.endlessLeaderboardEntries, layout.leaderboardMaxRows),
      );
    } else if (data.localLeaderboardEntries?.length) {
      this.createInfoPanel(layout.leaderboardArea, 0.16);
      this.renderLeaderboardRows(
        layout.leaderboardArea,
        this.formatLocalLeaderboardRows(
          data.localLeaderboardEntries,
          data.localLeaderboardRank ?? 0,
          layout.leaderboardMaxRows,
        ),
      );
    }

    this.autoRestartText = new UITextBlock(this, {
      x: centerX,
      y: layout.autoRestartY,
      tone: 'muted',
      fontSize: layout.smallFontSize,
    });

    this.createActionBars(playtestCsv);
    this.layoutButtons();
    this.screenManager.onResize(() => {
      this.scheduleResponsiveRestart();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    if (data.autoMode && SettingsManager.getDeveloper().autoRestartEnabled) {
      this.startAutoRestartCountdown();
    }
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private createResultShell(
    layout: ReturnType<typeof LayoutConfig.getResultSceneLayout>,
    resultTitle: string,
    isVictory: boolean,
  ): void {
    if (!this.screenManager) {
      return;
    }

    const shellTop = Math.max(10, layout.headerY - (this.screenManager.isPortrait() ? 28 : 34));
    const shellBottom = Math.min(
      this.screenManager.height - 10,
      layout.buttonArea.y + layout.buttonArea.height + (this.screenManager.isPortrait() ? 8 : 10),
    );
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const shellWidth = Math.min(
      this.screenManager.width - (compact ? 20 : 32),
      layout.summaryArea.width + (compact ? 34 : 52),
      this.screenManager.isPortrait() ? 430 : density === 'spacious' ? 820 : 760,
    );
    const shellHeight = Math.max(compact ? 232 : 260, shellBottom - shellTop);
    const shellCenterY = shellTop + shellHeight / 2;

    const frame = PanelFrame.create(this, {
      x: this.screenManager.centerX,
      y: shellCenterY,
      width: shellWidth,
      height: shellHeight,
      alpha: UITheme.panelBgAlpha,
      variant: 'modal',
    });
    frame.setDepth(-10);

    const header = PanelHeader.create(this, {
      x: this.screenManager.centerX,
      y: layout.headerY,
      width: Math.max(240, shellWidth - 64),
      title: resultTitle,
      titleColor: isVictory ? UITheme.successTextColor : UITheme.dangerTextColor,
      titleFontSize: density === 'tiny' ? '24px' : compact ? '28px' : UITheme.titleFontSize,
    });
    header.setDepth(-5);
  }

  private createInfoPanel(rect: { x: number; y: number; width: number; height: number }, alpha: number): void {
    const panel = PanelFrame.create(this, {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      width: rect.width,
      height: rect.height,
      alpha,
      variant: 'card',
    });
    panel.setDepth(-7);
  }

  private renderSummaryLines(
    rect: { x: number; y: number; width: number; height: number },
    lines: ResultSummaryLine[],
    layout: ReturnType<typeof LayoutConfig.getResultSceneLayout>,
  ): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const rowHeight = density === 'tiny' ? 18 : compact ? 20 : 24;
    const rowGap = density === 'tiny' ? 3 : 4;
    const innerX = rect.x + 12;
    let y = rect.y + (compact ? 8 : 10);
    const rowWidth = rect.width - 24;
    const bottom = rect.y + rect.height - 8;

    lines.forEach((line) => {
      if (y + rowHeight > bottom) {
        return;
      }

      if (line.label !== undefined) {
        const row = UIStatRow.create(
          this,
          innerX + rowWidth / 2,
          y + rowHeight / 2,
          rowWidth,
          line.label,
          line.value ?? '',
          {
            height: rowHeight,
            fontSize: layout.smallFontSize,
            backgroundAlpha: 0.28,
            borderAlpha: 0.12,
          },
        );
        row.setDepth(1);
        y += rowHeight + rowGap;
        return;
      }

      const container = UIListRow.create(this, {
        x: innerX + rowWidth / 2,
        y: y + rowHeight / 2,
        width: rowWidth,
        height: rowHeight,
        label: line.text ?? '',
        tone: line.emphasis === false ? 'muted' : 'section',
        compact,
      });
      container.setDepth(1);
      y += rowHeight + rowGap;
    });
  }

  private renderLeaderboardRows(
    rect: { x: number; y: number; width: number; height: number },
    rows: ResultLeaderboardRow[],
  ): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const compact = density === 'compact' || density === 'tiny';
    const rowHeight = density === 'tiny' ? 18 : compact ? 20 : 24;
    const rowGap = density === 'tiny' ? 3 : 4;
    const rowWidth = rect.width - 20;
    const x = rect.x + rect.width / 2;
    let y = rect.y + (compact ? 8 : 10);
    const bottom = rect.y + rect.height - 8;

    rows.forEach((row) => {
      if (y + rowHeight > bottom) {
        return;
      }

      const container = UIListRow.create(this, {
        x,
        y: y + rowHeight / 2,
        width: rowWidth,
        height: rowHeight,
        label: row.label,
        value: row.value,
        status: row.status,
        tone: row.tone,
        compact,
      });
      container.setDepth(1);
      y += rowHeight + rowGap;
    });
  }

  private getSummaryLines(params: {
    data: ResultSceneData;
    resultTitle: string;
    survivalTimeSeconds: number;
    isEndlessResult: boolean;
    unlockMessages: string[];
    maxRows: number;
  }): ResultSummaryLine[] {
    const lines: ResultSummaryLine[] = [
      { label: I18n.t('result.result'), value: params.resultTitle },
      { label: I18n.t('result.survivalTime'), value: this.formatTime(params.survivalTimeSeconds) },
      ...(params.isEndlessResult ? [
        { label: I18n.t('result.endlessSurvivalTime'), value: this.formatTime(params.data.endlessSurvivalTime ?? 0) },
      ] : []),
      this.formatMetadataLine(params.data),
      ...this.getStrategyControlLines(params.data),
      { label: I18n.t('result.finalLevel'), value: `${params.data.finalLevel ?? 1}` },
      { label: I18n.t('result.killCount'), value: `${params.data.killCount ?? 0}` },
      { label: I18n.t('result.score'), value: `${params.data.score ?? 0}` },
      ...this.getStrategyTelemetryLines(params.data),
      ...params.unlockMessages.map((message) => ({ label: I18n.t('result.unlock'), value: message })),
      this.getBuildSummaryLine(params.data),
      { label: I18n.t('result.treasureOpens'), value: `${params.data.treasureOpenCount ?? 0}` },
      { label: I18n.t('result.chestUpgrades'), value: `${params.data.chestUpgradeCount ?? 0}` },
      { label: I18n.t('result.chestEvolutions'), value: `${params.data.chestEvolutionCount ?? 0}` },
      {
        label: I18n.t('result.bossDashes'),
        value: `${params.data.bossDashCount ?? 0} / ${I18n.t('result.bossDashHits')} ${params.data.bossDashHitCount ?? 0}`,
      },
      ...(params.isEndlessResult ? [
        {
          label: I18n.t('result.endlessBosses'),
          value: `${params.data.endlessBossKillCount ?? 0}/${params.data.endlessBossSpawnCount ?? 0} ${I18n.t('result.killed')}, ${I18n.t('result.skills')} ${params.data.endlessBossSkillHitCount ?? 0}/${params.data.endlessBossSkillUseCount ?? 0}`,
        },
      ] : []),
    ];

    if (lines.length <= params.maxRows) {
      return lines;
    }

    return [
      ...lines.slice(0, Math.max(1, params.maxRows - 1)),
      { text: I18n.t('result.more', { count: lines.length - params.maxRows + 1 }), emphasis: false },
    ];
  }

  private getBuildSummaryLine(data: ResultSceneData): ResultSummaryLine {
    const weaponCount = data.weaponIds?.length ?? 0;
    const passiveCount = data.passiveItems?.length ?? 0;
    const relicCount = data.relicNames?.length ?? data.relicIds?.length ?? 0;
    const evolutionCount = data.evolutionPath?.length ?? 0;

    return {
      label: I18n.t('ui.build'),
      value: [
      `${I18n.t('result.weapons')} ${weaponCount}`,
      `${I18n.t('result.passives')} ${passiveCount}`,
      `${I18n.t('result.relics')} ${relicCount}`,
      `${I18n.t('result.evolutionPath')} ${evolutionCount}`,
      ].join(' / '),
    };
  }

  private getStrategyControlLines(data: ResultSceneData): ResultSummaryLine[] {
    if (data.controlMode !== 'autoStrategy') {
      return [{ label: I18n.t('result.mode'), value: I18n.t('result.control.manual') }];
    }

    const controlLabel = data.strategyControlType === 'live'
      ? I18n.t('result.control.liveAutoStrategy')
      : I18n.t('result.control.fixedAutoStrategy');
    const baseHash = this.shortenHash(data.strategyProfileHash);
    const finalHash = this.shortenHash(data.runtimeStrategyFinalHash ?? data.strategyProfileHash);
    const details = [controlLabel];

    if (data.strategyControlType === 'live') {
      details.push(`${I18n.t('result.edits')} ${data.strategyEditCount ?? 0}`);

      if (data.runtimeStrategyEdited) {
        details.push(`${I18n.t('result.final')} ${finalHash}`);
      }
    }

    if (baseHash) {
      details.push(`${I18n.t('result.base')} ${baseHash}`);
    }

    return [
      { label: I18n.t('result.mode'), value: details.join(' / ') },
    ];
  }

  private formatMetadataLine(data: ResultSceneData): ResultSummaryLine {
    const stage = data.customStageId ?? data.stageId ?? '-';
    const character = data.characterId ?? '-';
    const seed = data.seed ?? data.runSeed ?? '';
    const shortSeed = seed.length > 14 ? `${seed.slice(0, 14)}...` : seed;

    return {
      label: I18n.t('result.stage'),
      value: `${stage} / ${I18n.t('result.character')} ${character}${shortSeed ? ` / ${I18n.t('result.seed')} ${shortSeed}` : ''}`,
    };
  }

  private getStrategyTelemetryLines(data: ResultSceneData): ResultSummaryLine[] {
    const summary = data.strategyTelemetrySummary;

    if (!summary) {
      return [];
    }

    return [
      { label: I18n.t('result.strategy'), value: summary.summary },
      {
        label: I18n.t('result.pace'),
        value: `${summary.killsPerMinute} ${I18n.t('result.kpm')} / ${summary.expPerMinute} ${I18n.t('result.expPerMinute')} / ${summary.damageTakenPerMinute} ${I18n.t('result.damagePerMinute')}`,
      },
      {
        label: I18n.t('result.choices'),
        value: `${summary.upgradeCount} ${I18n.t('result.upgrades')} / ${summary.evolutionCount} ${I18n.t('result.evolutions')} / ${summary.relicCount} ${I18n.t('result.relics')} / ${summary.treasuresOpenedPerMinute} ${I18n.t('result.chestsPerMinute')}`,
      },
    ];
  }

  private formatLeaderboardRows(entries: EndlessLeaderboardEntry[], maxRows: number): ResultLeaderboardRow[] {
    if (entries.length === 0) {
      return [{
        label: I18n.t('result.endlessLeaderboard', { state: I18n.t('result.none') }),
        tone: 'muted',
      }];
    }

    const visibleCount = Math.max(0, maxRows - 1);
    const visibleEntries = entries.slice(0, visibleCount);
    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

    return [
      {
        label: I18n.t('result.endlessLeaderboardTop', { count: maxRows }),
        tone: 'section',
      },
      ...visibleEntries.map((entry, index) => ({
        status: `#${index + 1}`,
        label: this.formatTime(entry.endlessSurvivalTime),
        value: `Lv${entry.finalLevel} / ${entry.killCount} ${I18n.t('result.kills')}`,
        tone: index === 0 ? 'success' as UIListRowTone : 'normal' as UIListRowTone,
      })),
      ...(hiddenCount > 0 ? [{
        label: I18n.t('result.more', { count: hiddenCount }),
        tone: 'muted' as UIListRowTone,
      }] : []),
    ];
  }

  private formatLocalLeaderboardRows(
    entries: LeaderboardRecord[],
    currentRank: number,
    maxRows: number,
  ): ResultLeaderboardRow[] {
    const visibleCount = Math.max(0, maxRows - 1);
    const visibleEntries = entries.slice(0, visibleCount);
    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
    const mode = entries[0]?.mode ?? 'normal';
    const control = this.formatLeaderboardControl(entries[0]);
    const currentRankText = currentRank > 0 ? ` / ${I18n.t('result.thisRunRank')} #${currentRank}` : '';

    return [
      {
        label: I18n.t('result.localLeaderboard'),
        value: `${control} ${mode}${currentRankText}`,
        tone: 'section',
      },
      ...visibleEntries.map((entry, index) => this.formatLocalLeaderboardEntryRow(entry, index + 1)),
      ...(hiddenCount > 0 ? [{
        label: I18n.t('result.more', { count: hiddenCount }),
        tone: 'muted' as UIListRowTone,
      }] : []),
    ];
  }

  private formatLeaderboardControl(entry: LeaderboardRecord | undefined): string {
    if (entry?.controlMode !== 'autoStrategy') {
      return I18n.t('result.control.manual');
    }

    return entry.strategyControlType === 'live'
      ? I18n.t('result.control.liveAuto')
      : I18n.t('result.control.fixedAuto');
  }

  private formatLocalLeaderboardEntryRow(entry: LeaderboardRecord, rank: number): ResultLeaderboardRow {
    if (entry.mode === 'scoreAttack') {
      return {
        status: `#${rank}`,
        label: `${entry.score ?? 0} ${I18n.t('result.score')}`,
        value: `Lv${entry.finalLevel} / ${entry.killCount} ${I18n.t('result.kills')}`,
        tone: rank === 1 ? 'success' : 'normal',
      };
    }

    return {
      status: `#${rank}`,
      label: this.formatTime(entry.survivalTime),
      value: `Lv${entry.finalLevel} / ${entry.killCount} ${I18n.t('result.kills')}`,
      tone: rank === 1 ? 'success' : 'normal',
    };
  }

  private shortenHash(hash: string | undefined): string {
    return hash ? hash.slice(0, 8) : '';
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

  private showDeveloperMenu(playtestCsv: string): void {
    this.developerMenu?.destroy();
    this.developerMenu = new DeveloperMenu(this, {
      currentCsv: playtestCsv,
      onClose: () => {
        this.developerMenu = undefined;
      },
      onOpenScene: (sceneKey) => {
        this.closeSelectionPanel();
        this.scene.start(sceneKey);
      },
    });
  }

  private showStatsBuildPanel(): void {
    const snapshot = this.currentData?.statsBuildSnapshot;

    if (!snapshot) {
      return;
    }

    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = new StatsBuildPanel(this, {
      snapshot,
      onClose: () => {
        this.statsBuildPanel?.destroy();
        this.statsBuildPanel = undefined;
      },
    });
  }

  private showCharacterSelection(): void {
    this.developerMenu?.destroy();
    this.developerMenu = undefined;
    this.closeSelectionPanel();

    const characterManager = new CharacterManager();
    const selection = SelectionManager.getSelection();
    this.selectionPanel = new SelectionListPanel(this, {
      title: I18n.t('characterSelect.title'),
      items: characterManager.listSelectableCharacters().map((character) => ({
        id: character.id,
        name: I18n.t(character.nameKey),
        description: character.id === 'random_unlocked'
          ? I18n.t('characterSelection.randomUnlocked')
          : I18n.t(character.descriptionKey),
        startingWeaponId: character.id === 'random_unlocked' ? undefined : character.startingWeaponId,
        startingWeaponIconKey: character.id === 'random_unlocked'
          ? undefined
          : (AssetKeyResolver.getWeaponIconKey(this, character.startingWeaponId) ?? undefined),
        damageReactionSkill: character.damageReactionSkill?.type,
        portraitKey: character.id === 'random_unlocked'
          ? undefined
          : AssetKeyResolver.getPlayerPortraitKey(this, character.skinId, character.id),
      })),
      selectedId: selection.characterId,
      onConfirm: (id) => {
        if (SelectionManager.setCharacterId(id)) {
          this.closeSelectionPanel();
        }
      },
      onBack: () => this.closeSelectionPanel(),
    });
  }

  private showStageSelection(): void {
    this.developerMenu?.destroy();
    this.developerMenu = undefined;
    this.closeSelectionPanel();

    const stageManager = new StageManager();
    const selection = SelectionManager.getSelection();
    const selectableStages = stageManager.listSelectableStages()
      .filter((stage) => stage.source === 'builtin' || stage.valid);

    this.selectionPanel = new SelectionListPanel(this, {
      title: I18n.t('stageSelect.title'),
      items: selectableStages.map((stage) => ({
        id: stage.id,
        name: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.name')
          : stage.name,
        description: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.description')
          : [
            stage.source === 'custom' ? I18n.t('stage.custom') : I18n.t('stage.builtIn'),
            `${I18n.t('selection.map')}: ${stage.mapId}`,
            stage.warnings && stage.warnings.length > 0
              ? I18n.t('stage.warningsCount', { count: stage.warnings.length })
              : '',
          ].filter(Boolean).join(' / '),
      })),
      selectedId: selection.customStageId ?? selection.stageId,
      onConfirm: (id) => {
        const selectedStage = selectableStages.find((stage) => stage.id === id);

        if (selectedStage?.source === 'custom' && selectedStage.customStageId) {
          SelectionManager.setCustomStageId(selectedStage.customStageId);
        } else if (selectedStage?.source === 'builtin') {
          SelectionManager.setStageId(selectedStage.id);
        }

        this.closeSelectionPanel();
      },
      onBack: () => this.closeSelectionPanel(),
    });
  }

  private closeSelectionPanel(): void {
    this.selectionPanel?.destroy();
    this.selectionPanel = undefined;
  }

  private restartGame(): void {
    if (this.hasRestarted) {
      return;
    }

    this.hasRestarted = true;
    this.autoRestartTimer?.remove(false);
    this.autoRestartTimer = undefined;
    this.scene.stop('UIScene');
    this.scene.start('RunPreloadScene');
  }

  private createActionBars(playtestCsv: string): void {
    const primaryActions: Array<UIActionBarAction<ResultPrimaryActionId>> = [{
      id: 'restart',
      label: I18n.t('result.restart'),
      onClick: () => {
        this.cancelAutoRestart();
        this.restartGame();
      },
    }];
    const secondaryActions: Array<UIActionBarAction<ResultSecondaryActionId>> = [
      {
        id: 'selectCharacter',
        label: I18n.t('title.selectCharacter'),
        onClick: () => {
          this.cancelAutoRestart();
          this.showCharacterSelection();
        },
      },
      {
        id: 'selectStage',
        label: I18n.t('title.selectStage'),
        onClick: () => {
          this.cancelAutoRestart();
          this.showStageSelection();
        },
      },
      {
        id: 'statsBuild',
        label: I18n.t('pause.statsBuild'),
        onClick: () => {
          this.cancelAutoRestart();
          this.showStatsBuildPanel();
        },
      },
      {
        id: 'title',
        label: I18n.t('common.returnToTitle'),
        onClick: () => {
          this.cancelAutoRestart();
          this.scene.stop('UIScene');
          this.scene.stop('GameScene');
          this.scene.start('TitleScene');
        },
      },
      {
        id: 'settings',
        label: I18n.t('result.settings'),
        onClick: () => {
          this.cancelAutoRestart();
          this.showSettingsMenu();
        },
      },
      {
        id: 'developer',
        label: I18n.t('developer.title'),
        onClick: () => {
          this.cancelAutoRestart();
          this.showDeveloperMenu(playtestCsv);
        },
      },
    ];

    this.primaryActionBar?.destroy();
    this.secondaryActionBar?.destroy();
    this.primaryActionBar = new UIActionBar(this, primaryActions);
    this.secondaryActionBar = new UIActionBar(this, secondaryActions);
    this.primaryActionBar.container.setDepth(100);
    this.secondaryActionBar.container.setDepth(100);
    this.primaryActionBar.container.setScrollFactor(0);
    this.secondaryActionBar.container.setScrollFactor(0);
  }

  private layoutButtons(): void {
    if (!this.screenManager) {
      return;
    }

    const layout = LayoutConfig.getResultSceneLayout(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const tinyLandscape = tiny && !this.screenManager.isPortrait();
    const primaryWidth = Math.min(
      layout.buttonArea.width - (tiny ? 20 : 32),
      tiny ? 190 : compact ? 228 : 260,
    );
    const primaryHeight = tinyLandscape ? 30 : tiny ? 32 : compact ? 36 : 42;
    const primaryY = layout.buttonArea.y + primaryHeight / 2;
    const secondaryTop = primaryY + primaryHeight / 2 + (tinyLandscape ? 3 : tiny ? 5 : 7);
    const secondaryFontSize = tiny ? '9px' : compact ? '10px' : '12px';

    this.layoutBackground();

    this.primaryActionBar?.layout(this.screenManager, {
      x: layout.buttonArea.x,
      y: primaryY - primaryHeight / 2,
      width: layout.buttonArea.width,
      height: primaryHeight,
    }, {
      columns: 1,
      compact,
      minWidth: Math.min(primaryWidth, 120),
      maxWidth: primaryWidth,
      minHeight: primaryHeight,
      maxHeight: primaryHeight,
      fontSize: tiny ? '12px' : compact ? '14px' : layout.fontSize,
    });

    this.secondaryActionBar?.layout(this.screenManager, {
      x: layout.buttonArea.x + (tiny ? 6 : 10),
      y: secondaryTop,
      width: layout.buttonArea.width - (tiny ? 12 : 20),
      height: Math.max(1, layout.buttonArea.y + layout.buttonArea.height - secondaryTop),
    }, {
      columns: this.screenManager.isPortrait() ? 2 : 3,
      compact,
      minWidth: tiny ? 82 : 102,
      maxWidth: tiny ? 132 : compact ? 158 : 180,
      minHeight: tinyLandscape ? 22 : tiny ? 24 : 28,
      maxHeight: tinyLandscape ? 24 : tiny ? 28 : compact ? 32 : 36,
      fontSize: secondaryFontSize,
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
    this.developerMenu?.destroy();
    this.developerMenu = undefined;
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = undefined;
    this.primaryActionBar?.destroy();
    this.primaryActionBar = undefined;
    this.secondaryActionBar?.destroy();
    this.secondaryActionBar = undefined;
    this.autoRestartText?.destroy();
    this.autoRestartText = undefined;
    this.closeSelectionPanel();
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }

}
