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
import { VirtualJoystick } from '../input/VirtualJoystick';
import { PickupManager } from '../pickup/PickupManager';
import { TreasureManager } from '../pickup/TreasureManager';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { RandomManager } from '../random/RandomManager';
import { RelicManager } from '../relic/RelicManager';
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
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { UnlockManager } from '../unlock/UnlockManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { MapManager } from '../map/MapManager';

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
  damageReactionRadius: number;
  damageReactionDamage: number;
  damageReactionKnockbackDistance: number;
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
    const gameEventBus = new GameEventBus();
    const gameEventRecorder = new GameEventRecorder();
    const gameEventBridge = new GameEventBridge({
      sourceEventBus: config.eventBus,
      gameEventBus,
      getGameTimeSeconds: () => config.timeManager.gameTimeSeconds,
      getRunId: () => config.runId,
    });

    gameEventBus.subscribeAll((event) => {
      gameEventRecorder.record(event);
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
    const weaponConfigs = ContentRegistry.listWeapons();
    const enemyConfigs = ContentRegistry.listEnemies();
    const passiveItems = ContentRegistry.listPassives();
    const upgradeOptions = ContentRegistry.getUpgradeOptions();
    const waveSet = selectedStageRuntime.customStagePackage
      ? this.toSpawnWaves(selectedStageRuntime.customStagePackage.waves)
      : ContentRegistry.getWaveSet(DEFAULT_CONTENT_IDS.waveSet) ?? [];
    const playerStats = PlayerStats.fromConfig(selectedCharacter.baseStats);
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
    const floatingTextManager = new FloatingTextManager(config.scene);
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
    config.runState.setRunSeed(runSeed);
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
      damageReactionRadius: config.damageReactionRadius,
      damageReactionDamage: config.damageReactionDamage,
      damageReactionKnockbackDistance: config.damageReactionKnockbackDistance,
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

    weaponManager.addWeapon(weaponFactory.create(selectedCharacter.startingWeaponId));
    this.syncPassiveEffects(passiveManager, weaponManager, treasureManager);

    return {
      scene: config.scene,
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
      runSeed,
      runRuleSet,
      relicManager,
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
  ): void {
    const effects = passiveManager.getEffects();

    weaponManager.setPassiveModifiers({
      damageMultiplier: effects.damageMultiplier,
      cooldownMultiplier: effects.cooldownMultiplier,
      projectileSpeedMultiplier: effects.projectileSpeedMultiplier,
    });
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
