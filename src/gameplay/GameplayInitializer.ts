import Phaser from 'phaser';

import { AchievementManager } from '../achievement/AchievementManager';
import { AutoPlayer } from '../auto/AutoPlayer';
import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { BossFactory } from '../boss/BossFactory';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { CharacterManager } from '../character/CharacterManager';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { DamageCalculator } from '../combat/DamageCalculator';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { CustomWaveDefinition } from '../custom/CustomStageSchema';
import { EventBus } from '../core/EventBus';
import { TimeManager } from '../core/TimeManager';
import { Enemy, GameEventMap } from '../enemy/Enemy';
import { BossController } from '../enemy/BossController';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyFlow } from '../enemy/EnemyFlow';
import { EnemyMovement } from '../enemy/EnemyMovement';
import { EndlessBossManager } from '../endless/EndlessBossManager';
import { EndlessManager } from '../endless/EndlessManager';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { LeaderboardKeyFactory } from '../leaderboard/LeaderboardKeyFactory';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { PickupManager } from '../pickup/PickupManager';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { PoolManager } from '../performance/PoolManager';
import { TreasureManager } from '../pickup/TreasureManager';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { RelicManager } from '../relic/RelicManager';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeFlow } from '../progression/UpgradeFlow';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import type { RunMetadata } from '../run/RunMetadata';
import { RunState } from '../run/RunState';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import {
  createAutoStrategyRunModeConfig,
  createManualRunModeConfig,
} from '../runtime/RunModeConfig';
import { RuntimeSpawnWave, SpawnDirector } from '../spawn/SpawnDirector';
import { RunStats } from '../stats/RunStats';
import { StrategyHasher } from '../strategy/hash/StrategyHasher';
import { RuntimeStrategyState } from '../strategy/runtime/RuntimeStrategyState';
import { cloneAutoStrategyProfile } from '../strategy/profile/AutoStrategyClone';
import { PLAYTEST_AUTO_STRATEGY_PROFILE } from '../strategy/profile/AutoStrategyDefaults';
import { StrategyProfileRepository } from '../strategy/profile/StrategyProfileRepository';
import { TutorialManager } from '../tutorial/TutorialManager';
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { UnlockManager } from '../unlock/UnlockManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { MapMechanicRuntime } from '../map/mechanics/MapMechanicRuntime';
import { getCurrentVersionInfo } from '../version/VersionInfo';

import { GameplayContextAssembler } from './bootstrap/GameplayContextAssembler';
import { RunRuleSetFactory } from './bootstrap/RunRuleSetFactory';
import { RunSelectionResolver } from './bootstrap/RunSelectionResolver';
import { RuntimeEventFactory } from './bootstrap/RuntimeEventFactory';
import { GameplayContext } from './GameplayContext';

export interface GameplayInitializerCallbacks {
  onPauseRequested(): void;
  getUpgradeSelectionContext(): UpgradeSelectionContext;
  getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext;
  onUpgradeApplied(): void;
  onChestDropped(): void;
  onChestOpened(): void;
  onTreasureRewardRequested(): void;
  onEnemySpawned(enemy: Enemy): void;
  onBossSpawned(boss: Enemy): void;
  onCenterMessage(message: string, options?: { kind?: 'normal' | 'boss'; durationMs?: number }): void;
  shouldShowDamageNumbers(): boolean;
}

export interface GameplayInitializerConfig {
  scene: Phaser.Scene;
  eventBus: EventBus<GameEventMap>;
  runId: string;
  autoPlayer: AutoPlayer;
  autoUpgradeSelector: AutoUpgradeSelector;
  damageCalculator: DamageCalculator;
  enemyMovement: EnemyMovement;
  timeManager: TimeManager;
  runState: RunState;
  playtestSettings: PlaytestSettingsState;
  centerX: number;
  centerY: number;
  worldWidth: number;
  worldHeight: number;
  finalBossId: string;
  finalBossWarningSeconds: number;
  finalBossTimeSeconds: number;
  playerHitRadius: number;
  contactDamageCooldownMs: number;
  bossDashHitRadius: number;
  bossDashImpactRadius: number;
  bossDashImpactDamage: number;
  bossDashKnockbackDistance: number;
  callbacks: GameplayInitializerCallbacks;
}

export class GameplayInitializer {
  private static readonly PRE_ENDLESS_NORMAL_ENEMY_BASE_CAP = 18;
  private static readonly PRE_ENDLESS_NORMAL_ENEMY_CAP_PER_MINUTE = 8;

  private readonly contextAssembler = new GameplayContextAssembler();
  private readonly eventFactory = new RuntimeEventFactory();
  private readonly ruleSetFactory = new RunRuleSetFactory();
  private readonly selectionResolver = new RunSelectionResolver();

  initialize(config: GameplayInitializerConfig): GameplayContext {
    ContentBootstrap.ensureInitialized();
    UnlockManager.initialize();
    const {
      selection,
      runSeed,
      randomManager,
      selectedCharacter,
      characterSelectionMode,
      selectedStageRuntime,
      selectedStage,
      stageSelectionMode,
      selectedMap,
      selectedDifficulty,
    } = this.selectionResolver.resolve();
    const performanceMonitor = new PerformanceMonitor();
    const poolManager = new PoolManager();
    const versionInfo = getCurrentVersionInfo();
    const strategyProfile = SettingsManager.getDeveloper().playtestMode
      ? cloneAutoStrategyProfile(PLAYTEST_AUTO_STRATEGY_PROFILE)
      : StrategyProfileRepository.getSelectedProfile();
    const strategyProfileHash = StrategyHasher.hash(strategyProfile);
    const autoStrategyEnabled = config.playtestSettings.autoMovement
      || config.playtestSettings.autoUpgrade
      || config.playtestSettings.autoOpenTreasure;
    const runtimeStrategyState = autoStrategyEnabled
      ? new RuntimeStrategyState(strategyProfile, strategyProfileHash)
      : undefined;
    const simulationSpeedMultiplier = config.playtestSettings.fastMode
      ? config.playtestSettings.autoTimeScale
      : 1;
    const runModeConfig = autoStrategyEnabled
      ? createAutoStrategyRunModeConfig({
        autoChallengeType: config.playtestSettings.endlessMode ? 'endless' : 'normal',
        strategyProfileId: strategyProfile.id,
        strategyProfileHash,
        strategyProfile,
        strategyControlType: config.playtestSettings.strategyControlType,
        allowRuntimeStrategyEdit: config.playtestSettings.strategyControlType === 'live',
        simulationSpeedMultiplier,
      })
      : createManualRunModeConfig(simulationSpeedMultiplier);
    const {
      gameEventBus,
      gameEventRecorder,
      replayRecorder,
      gameEventBridge,
    } = this.eventFactory.create({
      eventBus: config.eventBus,
      timeManager: config.timeManager,
      runId: config.runId,
      runState: config.runState,
    });
    const { runRuleSet } = this.ruleSetFactory.create({
      selectedDifficulty,
      selectedCharacter,
      selectedStage,
      selectedMap,
      selectedStageRuntime,
      selection,
    });
    const relicManager = new RelicManager({
      gameEventBus,
      runRuleSet,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      runState: config.runState,
    });
    const achievementManager = new AchievementManager({
      characterId: selectedCharacter.id,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      difficultyId: selectedDifficulty.id,
      customStageId: selection.customStageId,
      seed: selection.seed,
    });

    achievementManager.initialize(gameEventBus);
    new TutorialManager({ gameEventBus });
    const weaponConfigs = ContentRegistry.listWeapons();
    const enemyConfigs = ContentRegistry.listEnemies();
    const passiveItems = ContentRegistry.listPassives();
    const upgradeOptions = ContentRegistry.getUpgradeOptions();
    const waveSet = selectedStageRuntime.customStagePackage
      ? this.toSpawnWaves(selectedStageRuntime.customStagePackage.waves)
      : ContentRegistry.getWaveSet(selectedStage.waveSetId ?? DEFAULT_CONTENT_IDS.waveSet) ?? [];
    const characterRuntime = new CharacterRuntime(selectedCharacter);
    const playerStats = PlayerStats.fromConfig(characterRuntime.getBaseStats());
    const runStats = new RunStats(playerStats.maxHp);
    const weaponFactory = new WeaponFactory(config.scene, weaponConfigs);
    const weaponManager = new WeaponManager(runStats, weaponFactory);
    const passiveManager = new PassiveManager(passiveItems);
    const playerHealth = new PlayerHealth(playerStats.maxHp);
    const upgradeApplier = new UpgradeApplier(
      playerStats,
      playerHealth,
      weaponManager,
      weaponFactory,
      runStats,
      passiveManager,
    );
    const floatingTextManager = new FloatingTextManager(
      config.scene,
      performanceMonitor,
      poolManager,
    );
    const player = new PlayerController(
      config.scene,
      playerStats,
      config.centerX,
      config.centerY,
      selectedCharacter.id,
      selectedCharacter.skinId,
    );
    const virtualJoystick = new VirtualJoystick(config.scene, config.callbacks.onPauseRequested);
    relicManager.setContext({
      scene: config.scene,
      weaponManager,
      player,
      playerHealth,
      runState: config.runState,
      enemies: [],
      damageCalculator: config.damageCalculator,
      floatingTextManager,
    });
    weaponManager.setRelicDamageMultiplierProvider((weaponId) => (
      relicManager.modifyWeaponDamage(weaponId, 1)
    ));
    const expManager = new ExpManager(config.eventBus);
    const levelManager = new LevelManager(expManager, config.eventBus);
    config.autoPlayer.setStrategyProfile(strategyProfile);
    config.autoUpgradeSelector.setStrategyProfile(strategyProfile);
    config.autoUpgradeSelector.setRandomSource(randomManager.getUpgradeRandom());
    const upgradeSelector = new UpgradeSelector(
      [...upgradeOptions, ...passiveItems],
      randomManager.getUpgradeRandom(),
    );
    const evolutionManager = new EvolutionManager(EVOLUTION_RULES);
    const upgradeFlow = new UpgradeFlow({
      upgradeSelector,
      upgradeApplier,
      autoUpgradeSelector: config.autoUpgradeSelector,
      evolutionManager,
      weaponManager,
      passiveManager,
      rewardRandom: randomManager.getUpgradeRandom(),
      runState: config.runState,
      gameEventBus,
      getRunId: () => config.runId,
      getUpgradeSelectionContext: config.callbacks.getUpgradeSelectionContext,
      getAutoUpgradeSelectionContext: config.callbacks.getAutoUpgradeSelectionContext,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      applyTemporaryPickupRangeMultiplier: (multiplier, durationMs, source) => {
        characterRuntime.applyTemporaryPickupRangeMultiplier(multiplier, durationMs, source);
      },
      onUpgradeApplied: config.callbacks.onUpgradeApplied,
    });
    const pickupManager = new PickupManager(config.scene, config.eventBus, expManager);
    const treasureManager = new TreasureManager(
      config.scene,
      config.eventBus,
      upgradeFlow,
      config.callbacks.onChestDropped,
      config.callbacks.onChestOpened,
      () => (config.runState.endlessStarted ? config.runState.endlessSurvivalTime : null),
      runRuleSet,
      randomManager.getTreasureRandom(),
      gameEventBus,
      () => config.timeManager.gameTimeSeconds,
      () => config.runId,
      config.callbacks.onTreasureRewardRequested,
    );
    const enemyFactory = new EnemyFactory(config.scene, enemyConfigs, runRuleSet);
    const bossFactory = new BossFactory(config.scene, enemyConfigs, runRuleSet);
    const enemiesList: Enemy[] = [];
    relicManager.setContext({
      enemies: enemiesList,
    });
    const mapMechanicRuntime = new MapMechanicRuntime(selectedMap.mechanics, {
      scene: config.scene,
      player,
      enemies: enemiesList,
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
    });
    config.runState.endlessMode = config.playtestSettings.endlessMode;
    config.runState.setRuleSetInfo(
      runRuleSet.difficulty.id,
      runRuleSet.getMutatorIds(),
      runRuleSet.rulesetId,
    );
    config.runState.setReplayId(config.runId);
    const runMetadata: RunMetadata = {
      runId: config.runId,
      runSeed,
      gameVersion: versionInfo.gameVersion,
      contentHash: versionInfo.contentHash,
      saveSchemaVersion: versionInfo.saveSchemaVersion,
      csvSchemaVersion: versionInfo.csvSchemaVersion,
      replaySchemaVersion: versionInfo.replaySchemaVersion,
      customStageSchemaVersion: versionInfo.customStageSchemaVersion,
      selectedCharacterId: selection.characterId,
      characterSelectionMode,
      characterId: selectedCharacter.id,
      selectedStageId: selection.stageId,
      stageSelectionMode,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      difficultyId: selectedDifficulty.id,
      customStageId: selection.customStageId,
      challengeId: selection.challengeId,
      rulesetId: runRuleSet.rulesetId,
      seed: selection.seed,
      controlMode: runModeConfig.controlMode,
      autoChallengeType: runModeConfig.autoChallengeType,
      strategyProfileId: autoStrategyEnabled ? runModeConfig.strategyProfileId : undefined,
      strategyProfileHash: autoStrategyEnabled ? runModeConfig.strategyProfileHash : undefined,
      strategyControlType: runModeConfig.strategyControlType,
      allowRuntimeStrategyEdit: runModeConfig.allowRuntimeStrategyEdit,
      simulationSpeedMultiplier: runModeConfig.simulationSpeedMultiplier,
      speedBucket: runModeConfig.speedBucket,
    };
    const leaderboardKey = LeaderboardKeyFactory.serializeFromMetadata(runMetadata, {
      mode: selection.challengeId
        ? 'challenge'
        : selection.customStageId ? 'custom' : config.playtestSettings.endlessMode ? 'endless' : 'normal',
    });

    config.runState.setRunMetadata({
      ...runMetadata,
      leaderboardKey,
    });
    replayRecorder.start({
      runId: config.runId,
      runSeed,
      selection: {
        selectedCharacterId: selection.characterId,
        characterSelectionMode,
        characterId: selectedCharacter.id,
        selectedStageId: selection.stageId,
        stageSelectionMode,
        stageId: selectedStage.id,
        mapId: selectedMap.id,
        difficultyId: selectedDifficulty.id,
        customStageId: selection.customStageId,
        challengeId: selection.challengeId,
        seed: selection.seed,
        rulesetId: runRuleSet.rulesetId,
      },
      settingsSnapshot: {
        autoMovement: config.playtestSettings.autoMovement,
        autoUpgrade: config.playtestSettings.autoUpgrade,
        fastMode: config.playtestSettings.fastMode,
        endlessMode: config.playtestSettings.endlessMode,
        controlMode: runModeConfig.controlMode,
        strategyProfileId: autoStrategyEnabled ? runModeConfig.strategyProfileId : undefined,
        strategyProfileHash: autoStrategyEnabled ? runModeConfig.strategyProfileHash : undefined,
        strategyControlType: runModeConfig.strategyControlType,
        allowRuntimeStrategyEdit: runModeConfig.allowRuntimeStrategyEdit,
        simulationSpeedMultiplier: runModeConfig.simulationSpeedMultiplier,
        speedBucket: runModeConfig.speedBucket,
      },
      metadata: config.runState.getRunMetadata(),
      versionInfo,
    });
    const spawnDirector = new SpawnDirector(
      waveSet,
      enemyFactory,
      () => player.body,
      () => ({ width: config.scene.scale.width, height: config.scene.scale.height }),
      (enemy) => {
        config.callbacks.onEnemySpawned(enemy);
      },
      runRuleSet,
      randomManager.getSpawnRandom(),
      () => enemiesList.filter((enemy) => !enemy.isDead).length,
      () => (
        config.runState.endlessStarted
          ? 200
          : GameplayInitializer.getPreEndlessNormalEnemyCap(config.timeManager.gameTimeSeconds)
      ),
      () => enemiesList.filter((enemy) => (
        !enemy.isDead
        && !enemy.bossLike
        && enemy.id !== 'boss'
        && !enemy.id.endsWith('_boss')
        && !enemy.id.startsWith('endless_')
      )).length,
    );
    const bossSpawnDirector = new BossSpawnDirector(
      bossFactory,
      () => player.body,
      () => ({
        width: config.worldWidth,
        height: config.worldHeight,
      }),
      (boss) => {
        config.callbacks.onBossSpawned(boss);
      },
    );
    const endlessManager = new EndlessManager({
      scene: config.scene,
      enemyFactory,
      enemies: enemiesList,
      getPlayerPosition: () => player.body,
      getWorldSize: () => ({
        width: config.worldWidth,
        height: config.worldHeight,
      }),
      onEnemySpawned: (enemy) => {
        config.callbacks.onEnemySpawned(enemy);
      },
      runRuleSet,
      random: randomManager.getEndlessRandom(),
    });
    let bossController: BossController;
    const enemyFlow = new EnemyFlow({
      scene: config.scene,
      enemies: enemiesList,
      eventBus: config.eventBus,
      enemyMovement: config.enemyMovement,
      damageCalculator: config.damageCalculator,
      player,
      playerHealth,
      playerStats,
      runState: config.runState,
      runStats,
      gameEventBus,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      getRunId: () => config.runId,
      floatingTextManager,
      playtestSettings: config.playtestSettings,
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      playerHitRadius: config.playerHitRadius,
      contactDamageCooldownMs: config.contactDamageCooldownMs,
      finalBossId: config.finalBossId,
      characterRuntime,
      mapMechanicRuntime,
      shouldShowDamageNumbers: config.callbacks.shouldShowDamageNumbers,
      isBossPhaseActive: () => bossController?.hasBossSpawned() === true,
      onEnemyKilled: (event) => bossController?.handleEnemyKilled(
        event,
        config.timeManager.gameTimeSeconds,
      ),
    });
    bossController = new BossController({
      scene: config.scene,
      eventBus: config.eventBus,
      enemies: enemiesList,
      enemyFactory,
      enemyMovement: config.enemyMovement,
      bossSpawnDirector,
      enemyFlow,
      player,
      playerHealth,
      runState: config.runState,
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      warningTimeSeconds: config.finalBossWarningSeconds,
      finalBossTimeSeconds: runRuleSet.applyFinalBossSpawnTime(
        config.finalBossTimeSeconds,
      ),
      finalBossId: config.finalBossId,
      dashHitRadius: config.bossDashHitRadius,
      dashImpactRadius: config.bossDashImpactRadius,
      dashImpactDamage: config.bossDashImpactDamage,
      dashKnockbackDistance: config.bossDashKnockbackDistance,
      contactDamageCooldownMs: config.contactDamageCooldownMs,
      onCenterMessage: config.callbacks.onCenterMessage,
    });
    const endlessBossManager = new EndlessBossManager({
      scene: config.scene,
      enemyFactory,
      enemies: enemiesList,
      enemyFlow,
      runState: config.runState,
      getPlayerPosition: () => new Phaser.Math.Vector2(player.body.x, player.body.y),
      getWorldSize: () => ({
        width: config.worldWidth,
        height: config.worldHeight,
      }),
      onEnemySpawned: (enemy) => {
        config.callbacks.onEnemySpawned(enemy);
      },
      random: randomManager.getBossRandom(),
    });

    weaponManager.addWeapon(weaponFactory.create(characterRuntime.getStartingWeaponId()));
    this.syncPassiveEffects(passiveManager, weaponManager, treasureManager, playerStats);

    return this.contextAssembler.assemble({
      scene: config.scene,
      runId: config.runId,
      playtestSettings: config.playtestSettings,
      autoMode: config.playtestSettings.autoMode,
      autoMovementEnabled: config.playtestSettings.autoMovement,
      autoUpgradeEnabled: config.playtestSettings.autoUpgrade,
      runtimeStrategyState,
      fastMode: config.playtestSettings.fastMode,
      endlessMode: config.playtestSettings.endlessMode,
      timeScale: config.playtestSettings.fastMode
        ? config.playtestSettings.autoTimeScale
        : 1,
      effectiveTimeScale: config.playtestSettings.fastMode
        ? config.playtestSettings.autoTimeScale
        : 1,
      eventBus: config.eventBus,
      gameEventBus,
      gameEventRecorder,
      gameEventBridge,
      autoPlayer: config.autoPlayer,
      damageCalculator: config.damageCalculator,
      enemyMovement: config.enemyMovement,
      timeManager: config.timeManager,
      randomManager,
      performanceMonitor,
      poolManager,
      runSeed,
      replayRecorder,
      runRuleSet,
      relicManager,
      characterRuntime,
      mapMechanicRuntime,
      syncCharacterCombatModifiers: () => {
        weaponManager.setCharacterStatModifiers(playerStats.getCombatModifierSnapshot());
      },
      runState: config.runState,
      runStats,
      player,
      playerStats,
      playerHealth,
      playerPickupRange: playerStats.pickupRange * 48,
      enemies: enemiesList,
      enemyFlow,
      bossController,
      endlessManager,
      endlessBossManager,
      enemyFactory,
      weaponManager,
      pickupManager,
      treasureManager,
      evolutionManager,
      passiveManager,
      expManager,
      levelManager,
      expRequirementMultiplier: 1,
      upgradeSelector,
      upgradeApplier,
      upgradeFlow,
      spawnDirector,
      bossSpawnDirector,
      floatingTextManager,
      virtualJoystick,
    });
  }

  private syncPassiveEffects(
    passiveManager: PassiveManager,
    weaponManager: WeaponManager,
    treasureManager: TreasureManager,
    playerStats: PlayerStats,
  ): void {
    const effects = passiveManager.getEffects();

    weaponManager.setPassiveModifiers({
      damageMultiplier: effects.damageMultiplier,
      cooldownMultiplier: effects.cooldownMultiplier,
      projectileSpeedMultiplier: effects.projectileSpeedMultiplier,
    });
    weaponManager.setCharacterStatModifiers(playerStats.getCombatModifierSnapshot());
    treasureManager.setBonusDropChance(effects.treasureDropBonus);
  }

  private toSpawnWaves(customWaves: readonly CustomWaveDefinition[]): RuntimeSpawnWave[] {
    return customWaves.map((wave) => {
      const batchCount = Math.max(1, Math.floor(wave.count));
      const durationSpawnCount = wave.duration === undefined
        ? batchCount
        : Math.max(batchCount, Math.ceil(wave.duration / wave.interval) * batchCount);
      const interval = wave.duration === undefined
        ? wave.interval
        : Math.max(0.001, wave.interval / batchCount);

      return {
        time: wave.startTime,
        enemy: wave.enemyId,
        count: durationSpawnCount,
        interval,
        modifiers: wave.modifiers,
      };
    });
  }

  private static getPreEndlessNormalEnemyCap(gameTimeSeconds: number): number {
    const minuteIndex = Math.max(0, Math.floor(gameTimeSeconds / 60));

    return GameplayInitializer.PRE_ENDLESS_NORMAL_ENEMY_BASE_CAP
      + GameplayInitializer.PRE_ENDLESS_NORMAL_ENEMY_CAP_PER_MINUTE * minuteIndex;
  }
}
