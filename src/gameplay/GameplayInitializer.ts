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
import { GameEventBridge } from '../events/GameEventBridge';
import { GameEventBus } from '../events/GameEventBus';
import { GameEventRecorder } from '../events/GameEventRecorder';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { createLeaderboardKey, serializeLeaderboardKey } from '../leaderboard/LeaderboardKey';
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
import { RandomManager } from '../random/RandomManager';
import { RelicManager } from '../relic/RelicManager';
import { ReplayRecorder } from '../replay/ReplayRecorder';
import { RunSeed } from '../random/RunSeed';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeFlow } from '../progression/UpgradeFlow';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import { RunState } from '../run/RunState';
import { DifficultyManager } from '../rules/DifficultyManager';
import { MutatorFactory } from '../rules/MutatorFactory';
import { MutatorContext } from '../rules/MutatorContext';
import { RunRuleSet } from '../rules/RunRuleSet';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { RuntimeSpawnWave, SpawnDirector } from '../spawn/SpawnDirector';
import { StageManager } from '../stage/StageManager';
import { RunStats } from '../stats/RunStats';
import { TutorialManager } from '../tutorial/TutorialManager';
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { UnlockManager } from '../unlock/UnlockManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { MapManager } from '../map/MapManager';
import { getCurrentVersionInfo } from '../version/VersionInfo';

import { GameplayContext } from './GameplayContext';

export interface GameplayInitializerCallbacks {
  onPauseRequested(): void;
  getUpgradeSelectionContext(): UpgradeSelectionContext;
  getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext;
  onUpgradeApplied(): void;
  onChestDropped(): void;
  onChestOpened(): void;
  onEnemySpawned(enemy: Enemy): void;
  onBossSpawned(boss: Enemy): void;
  onCenterMessage(message: string): void;
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
  initialize(config: GameplayInitializerConfig): GameplayContext {
    ContentBootstrap.ensureInitialized();
    UnlockManager.initialize();
    const characterManager = new CharacterManager();
    const stageManager = new StageManager();
    const mapManager = new MapManager();
    const difficultyManager = new DifficultyManager();
    const selection = SelectionManager.getSelection();
    const runSeed = RunSeed.createSeedFromSelection(selection);
    const randomManager = new RandomManager(runSeed);
    const performanceMonitor = new PerformanceMonitor();
    const poolManager = new PoolManager();
    const versionInfo = getCurrentVersionInfo();
    const gameEventBus = new GameEventBus();
    const gameEventRecorder = new GameEventRecorder();
    const replayRecorder = new ReplayRecorder();
    const gameEventBridge = new GameEventBridge({
      sourceEventBus: config.eventBus,
      gameEventBus,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      getRunId: () => config.runId,
    });

    gameEventBus.subscribeAll((event) => {
      gameEventRecorder.record(event);
      replayRecorder.recordEvent(event);
      config.runState.recordGameEvent();
    });
    const selectedCharacter = characterManager.getSelectedCharacter();
    const selectedStageRuntime = stageManager.getSelectedStageRuntimeDefinition();
    const selectedStage = selectedStageRuntime.stage;
    const selectedMap = mapManager.getSelectedMap();
    const selectedDifficulty = selectedStage.difficultyId
      ? difficultyManager.getDifficulty(selectedStage.difficultyId)
      : difficultyManager.getSelectedDifficulty();
    const mutatorConfigs = selectedStage.mutators ?? [];
    const mutators = MutatorFactory.createMany(mutatorConfigs);
    const mutatorContext: MutatorContext = {
      difficultyId: selectedDifficulty.id,
      characterId: selectedCharacter.id,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      mode: 'normal',
      seed: selection.seed,
      contentSource: selectedStageRuntime.source,
    };
    const runRuleSet = new RunRuleSet(
      selectedDifficulty,
      mutators,
      mutatorConfigs,
      mutatorContext,
    );
    const relicManager = new RelicManager({
      gameEventBus,
      runRuleSet,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
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
      : ContentRegistry.getWaveSet(DEFAULT_CONTENT_IDS.waveSet) ?? [];
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
    );
    const virtualJoystick = new VirtualJoystick(config.scene, config.callbacks.onPauseRequested);
    const expManager = new ExpManager(config.eventBus);
    const levelManager = new LevelManager(expManager, config.eventBus);
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
      runState: config.runState,
      gameEventBus,
      getRunId: () => config.runId,
      getUpgradeSelectionContext: config.callbacks.getUpgradeSelectionContext,
      getAutoUpgradeSelectionContext: config.callbacks.getAutoUpgradeSelectionContext,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
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
    );
    const enemyFactory = new EnemyFactory(config.scene, enemyConfigs, runRuleSet);
    const bossFactory = new BossFactory(config.scene, enemyConfigs, runRuleSet);
    const enemiesList: Enemy[] = [];
    config.runState.endlessMode = config.playtestSettings.endlessMode;
    config.runState.setRuleSetInfo(
      runRuleSet.difficulty.id,
      runRuleSet.getMutatorIds(),
      runRuleSet.rulesetId,
    );
    config.runState.setReplayId(config.runId);
    const leaderboardKey = serializeLeaderboardKey(createLeaderboardKey({
      mode: selection.challengeId
        ? 'challenge'
        : selection.customStageId ? 'custom' : config.playtestSettings.endlessMode ? 'endless' : 'normal',
      characterId: selectedCharacter.id,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      difficultyId: selectedDifficulty.id,
      seed: selection.seed,
      challengeId: selection.challengeId,
      customStageId: selection.customStageId,
      rulesetId: runRuleSet.rulesetId,
    }));
    config.runState.setRunMetadata({
      runId: config.runId,
      runSeed,
      gameVersion: versionInfo.gameVersion,
      contentHash: versionInfo.contentHash,
      saveSchemaVersion: versionInfo.saveSchemaVersion,
      csvSchemaVersion: versionInfo.csvSchemaVersion,
      replaySchemaVersion: versionInfo.replaySchemaVersion,
      customStageSchemaVersion: versionInfo.customStageSchemaVersion,
      characterId: selectedCharacter.id,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      difficultyId: selectedDifficulty.id,
      customStageId: selection.customStageId,
      challengeId: selection.challengeId,
      rulesetId: runRuleSet.rulesetId,
      seed: selection.seed,
      leaderboardKey,
    });
    replayRecorder.start({
      runId: config.runId,
      runSeed,
      selection: {
        characterId: selectedCharacter.id,
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
      characterRuntime,
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

    return {
      scene: config.scene,
      runId: config.runId,
      playtestSettings: config.playtestSettings,
      autoMode: config.playtestSettings.autoMode,
      autoMovementEnabled: config.playtestSettings.autoMovement,
      autoUpgradeEnabled: config.playtestSettings.autoUpgrade,
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
    };
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
}
