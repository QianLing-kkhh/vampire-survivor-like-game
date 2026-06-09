import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { CharacterManager } from '../character/CharacterManager';
import { EndlessLeaderboardEntry } from '../endless/EndlessLeaderboard';
import { I18n } from '../i18n/I18n';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { PassiveLevel } from '../passive/PassiveItem';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { RANDOM_UNLOCKED_STAGE_ID, StageManager } from '../stage/StageManager';
import type { StrategyTelemetrySummary } from '../telemetry/StrategyTelemetry';
import { DeveloperMenu } from '../ui/DeveloperMenu';
import { SelectionListPanel } from '../ui/SelectionListPanel';
import { SettingsMenu } from '../ui/SettingsMenu';
import { setTextHitArea, stopPointerEvent } from '../ui/input/UIInteraction';
import { StatsBuildPanel } from '../ui/stats/StatsBuildPanel';
import { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

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
  private developerMenu?: DeveloperMenu;
  private selectionPanel?: SelectionListPanel;
  private statsBuildPanel?: StatsBuildPanel;

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
    const relicText = data.relicNames && data.relicNames.length > 0
      ? this.truncateList(data.relicNames, 4)
      : data.relicIds && data.relicIds.length > 0
        ? this.truncateList(data.relicIds, 4)
        : I18n.t('common.none');
    const evolutionPathText = data.evolutionPath && data.evolutionPath.length > 0
      ? this.truncateList(data.evolutionPath, 3)
      : I18n.t('common.none');
    const playtestCsv = data.playtestCsv ?? '';

    const resultTitle = isEndlessResult
      ? I18n.t('result.endlessVictory')
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
      relicText,
      evolutionPathText,
      unlockMessages: data.unlockMessages ?? [],
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

    const selectCharacterButton = this.add.text(centerX, 0, I18n.t('title.selectCharacter'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    selectCharacterButton.setOrigin(0.5);
    selectCharacterButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(selectCharacterButton);
    selectCharacterButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showCharacterSelection();
    });

    const selectStageButton = this.add.text(centerX, 0, I18n.t('title.selectStage'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    selectStageButton.setOrigin(0.5);
    selectStageButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(selectStageButton);
    selectStageButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showStageSelection();
    });

    const statsBuildButton = this.add.text(centerX, 0, I18n.t('pause.statsBuild'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    statsBuildButton.setOrigin(0.5);
    statsBuildButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(statsBuildButton);
    statsBuildButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showStatsBuildPanel();
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
    restartButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
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
    titleButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('TitleScene');
    });

    const settingsButton = this.add.text(centerX, 0, I18n.t('result.settings'), {
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
    settingsButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showSettingsMenu();
    });

    const developerButton = this.add.text(centerX, 0, I18n.t('developer.title'), {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: layout.buttonLayout.fontSize,
      padding: {
        x: 12,
        y: 8,
      },
    });
    developerButton.setOrigin(0.5);
    developerButton.setInteractive({ useHandCursor: true });
    this.addButtonHover(developerButton);
    developerButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this, 'ui_click');
      this.cancelAutoRestart();
      this.showDeveloperMenu(playtestCsv);
    });

    this.layoutButtons([
      selectCharacterButton,
      selectStageButton,
      statsBuildButton,
      restartButton,
      titleButton,
      settingsButton,
      developerButton,
    ]);
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

  private truncateList(items: readonly string[], maxItems = 5): string {
    if (items.length <= maxItems) {
      return items.join(', ');
    }

    return `${items.slice(0, maxItems).join(', ')} ${I18n.t('result.more', { count: items.length - maxItems })}`;
  }

  private getSummaryLines(params: {
    data: ResultSceneData;
    resultTitle: string;
    survivalTimeSeconds: number;
    isEndlessResult: boolean;
    weaponText: string;
    passiveText: string;
    relicText: string;
    evolutionPathText: string;
    unlockMessages: string[];
    maxRows: number;
  }): string[] {
    const lines = [
      `${I18n.t('result.result')}: ${params.resultTitle}`,
      `${I18n.t('result.survivalTime')}: ${this.formatTime(params.survivalTimeSeconds)}`,
      ...(params.isEndlessResult ? [
        `${I18n.t('result.endlessSurvivalTime')}: ${this.formatTime(params.data.endlessSurvivalTime ?? 0)}`,
      ] : []),
      this.formatMetadataLine(params.data),
      `${I18n.t('result.finalLevel')}: ${params.data.finalLevel ?? 1}`,
      `${I18n.t('result.killCount')}: ${params.data.killCount ?? 0}`,
      `${I18n.t('result.score')}: ${params.data.score ?? 0}`,
      ...this.getStrategyTelemetryLines(params.data),
      ...params.unlockMessages.map((message) => `${I18n.t('result.unlock')}: ${message}`),
      `${I18n.t('result.weapons')}: ${params.weaponText}`,
      `${I18n.t('result.passives')}: ${params.passiveText}`,
      `${I18n.t('result.relics')}: ${params.relicText}`,
      `${I18n.t('result.evolutionPath')}: ${params.evolutionPathText}`,
      `${I18n.t('result.treasureOpens')}: ${params.data.treasureOpenCount ?? 0}`,
      `${I18n.t('result.chestUpgrades')}: ${params.data.chestUpgradeCount ?? 0}`,
      `${I18n.t('result.chestEvolutions')}: ${params.data.chestEvolutionCount ?? 0}`,
      `${I18n.t('result.bossDashes')}: ${params.data.bossDashCount ?? 0} / ${I18n.t('result.bossDashHits')}: ${params.data.bossDashHitCount ?? 0}`,
      ...(params.isEndlessResult ? [
        `${I18n.t('result.endlessBosses')}: ${params.data.endlessBossKillCount ?? 0}/${params.data.endlessBossSpawnCount ?? 0} ${I18n.t('result.killed')}, ${I18n.t('result.skills')}: ${params.data.endlessBossSkillHitCount ?? 0}/${params.data.endlessBossSkillUseCount ?? 0}`,
      ] : []),
    ];

    if (lines.length <= params.maxRows) {
      return lines;
    }

    return [
      ...lines.slice(0, Math.max(1, params.maxRows - 1)),
      I18n.t('result.more', { count: lines.length - params.maxRows + 1 }),
    ];
  }

  private formatMetadataLine(data: ResultSceneData): string {
    const stage = data.customStageId ?? data.stageId ?? '-';
    const character = data.characterId ?? '-';
    const seed = data.seed ?? data.runSeed ?? '';
    const shortSeed = seed.length > 14 ? `${seed.slice(0, 14)}...` : seed;

    return `${I18n.t('result.stage')}: ${stage}  ${I18n.t('result.character')}: ${character}${shortSeed ? `  ${I18n.t('result.seed')}: ${shortSeed}` : ''}`;
  }

  private getStrategyTelemetryLines(data: ResultSceneData): string[] {
    const summary = data.strategyTelemetrySummary;

    if (!summary) {
      return [];
    }

    return [
      `Strategy: ${summary.summary}`,
      `Pace: ${summary.killsPerMinute} KPM / ${summary.expPerMinute} EXP/min / ${summary.damageTakenPerMinute} dmg/min`,
      `Choices: ${summary.upgradeCount} upgrades / ${summary.evolutionCount} evolutions / ${summary.relicCount} relics / ${summary.treasuresOpenedPerMinute} chests/min`,
    ];
  }

  private formatLeaderboardLines(entries: EndlessLeaderboardEntry[], maxRows: number): string[] {
    if (entries.length === 0) {
      return [I18n.t('result.endlessLeaderboard', { state: I18n.t('result.none') })];
    }

    const visibleCount = Math.max(0, maxRows);
    const visibleEntries = entries.slice(0, visibleCount);
    const hiddenCount = Math.max(0, entries.length - visibleEntries.length);

    return [
      I18n.t('result.endlessLeaderboardTop', { count: maxRows }),
      ...visibleEntries.map((entry, index) => (
        I18n.t('result.leaderboardEntry', {
          rank: index + 1,
          time: this.formatTime(entry.endlessSurvivalTime),
          level: entry.finalLevel,
          kills: entry.killCount,
        })
      )),
      ...(hiddenCount > 0 ? [I18n.t('result.more', { count: hiddenCount })] : []),
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
      setTextHitArea(button, metrics.width, metrics.height);
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
    this.developerMenu?.destroy();
    this.developerMenu = undefined;
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = undefined;
    this.closeSelectionPanel();
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }

}
