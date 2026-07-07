import Phaser from 'phaser';

import { AutoPlayer } from '../auto/AutoPlayer';
import { AutoUpgradeSelectionContext, AutoUpgradeSelector } from '../auto/AutoUpgradeSelector';
import { BossAttackController } from '../boss/BossAttackController';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { TimeManager } from '../core/TimeManager';
import { Enemy, GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyMovement } from '../enemy/EnemyMovement';
import { SpawnEventReporter, type SpawnEventReporterContext } from '../enemy/SpawnEventReporter';
import { EndlessBossManager } from '../endless/EndlessBossManager';
import { EndlessManager } from '../endless/EndlessManager';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { GameplayContext } from '../gameplay/GameplayContext';
import { GameplayInitializer } from '../gameplay/GameplayInitializer';
import { GameplayUpdater } from '../gameplay/GameplayUpdater';
import { GameSceneInputBindings, type GameSceneInputBindingHandlers } from './GameSceneInputBindings';
import {
  createGameSceneGameplayInitializerConfig,
  type GameSceneGameplayInitializerStaticConfig,
  type GameSceneGameplayInitializerScenePort,
} from './GameSceneGameplayInitializerConfig';
import {
  createGameSceneInputBindingHandlers,
  type GameSceneInputBindingScenePort,
} from './GameSceneInputBindingHandlerFactory';
import { GameSceneBgmContextAdapter, type GameSceneBgmScenePort } from './GameSceneBgmContextAdapter';
import { GameSceneBgmSynchronizer } from './GameSceneBgmSynchronizer';
import {
  GameSceneBossDamageContextAdapter,
  type GameSceneBossDamageScenePort,
} from './GameSceneBossDamageContextAdapter';
import { GameSceneBossDamageUpdater, type GameSceneBossDamageContext } from './GameSceneBossDamageUpdater';
import { GameSceneChestOpenAdapter, type GameSceneChestOpenScenePort } from './GameSceneChestOpenAdapter';
import { GameSceneChestOpenHandler } from './GameSceneChestOpenHandler';
import { GameSceneCleanupCoordinator, type GameSceneCleanupPort } from './GameSceneCleanupCoordinator';
import {
  GameSceneDebugPanelAdapter,
  type GameSceneDebugPanelScenePort,
} from './GameSceneDebugPanelAdapter';
import {
  GameSceneEnemyDamageFeedbackAdapter,
  type GameSceneEnemyDamageFeedbackScenePort,
} from './GameSceneEnemyDamageFeedbackAdapter';
import {
  GameSceneEvolutionCandidateStatsAdapter,
  type GameSceneEvolutionCandidateStatsScenePort,
} from './GameSceneEvolutionCandidateStatsAdapter';
import {
  GameSceneFrameUpdateAdapter,
  type GameSceneFrameUpdateScenePort,
} from './GameSceneFrameUpdateAdapter';
import {
  GameSceneEndlessStartAdapter,
  type GameSceneEndlessStartScenePort,
} from './GameSceneEndlessStartAdapter';
import {
  GameSceneGameplayContextApplier,
  type GameSceneGameplayContextScenePort,
} from './GameSceneGameplayContextApplier';
import { GameSceneHudContextAdapter, type GameSceneHudScenePort } from './GameSceneHudContextAdapter';
import { GameSceneHudEmitter } from './GameSceneHudEmitter';
import {
  GameSceneLevelUpAutoSelectionAdapter,
  type GameSceneLevelUpAutoSelectionScenePort,
} from './GameSceneLevelUpAutoSelectionAdapter';
import {
  GameSceneLiveStrategyPanelContextAdapter,
  type GameSceneLiveStrategyPanelScenePort,
} from './GameSceneLiveStrategyPanelContextAdapter';
import {
  GameScenePauseFlowContextAdapter,
  type GameScenePauseFlowScenePort,
} from './GameScenePauseFlowContextAdapter';
import {
  GameScenePlayerMovementContextAdapter,
  type GameScenePlayerMovementScenePort,
} from './GameScenePlayerMovementContextAdapter';
import {
  GameScenePlayerPresentationSetupAdapter,
  type GameScenePlayerPresentationSetupScenePort,
} from './GameScenePlayerPresentationSetupAdapter';
import {
  GameScenePlayerDamageRecordAdapter,
  type GameScenePlayerDamageRecordScenePort,
} from './GameScenePlayerDamageRecordAdapter';
import {
  GameScenePlayerHitRangeAdapter,
  type GameScenePlayerHitRangeScenePort,
} from './GameScenePlayerHitRangeAdapter';
import {
  GameScenePostInitializeAdapter,
  type GameScenePostInitializeScenePort,
} from './GameScenePostInitializeAdapter';
import {
  GameSceneProgressionEffectContextAdapter,
  type GameSceneProgressionEffectScenePort,
} from './GameSceneProgressionEffectContextAdapter';
import { GameSceneRunContentResolver } from './GameSceneRunContentResolver';
import { GameSceneRunEventEmitter, type GameSceneRunEventEmitterScenePort } from './GameSceneRunEventEmitter';
import { GameSceneRunEndAdapter, type GameSceneRunEndScenePort } from './GameSceneRunEndAdapter';
import { GameSceneResizeAdapter, type GameSceneResizeScenePort } from './GameSceneResizeAdapter';
import {
  GameSceneRuntimeSettingsChangeAdapter,
  type GameSceneRuntimeSettingsScenePort,
} from './GameSceneRuntimeSettingsChangeAdapter';
import {
  GameSceneRunResetAdapter,
  type GameSceneRunResetScenePort,
} from './GameSceneRunResetAdapter';
import { GameSceneRuntimeStrategyProfileSynchronizer } from './GameSceneRuntimeStrategyProfileSynchronizer';
import {
  GameSceneRuntimeTextureGuard,
  type GameSceneRuntimeTextureGuardScenePort,
} from './GameSceneRuntimeTextureGuard';
import {
  GameSceneSpawnEventReporterContextAdapter,
  type GameSceneSpawnEventReporterScenePort,
} from './GameSceneSpawnEventReporterContextAdapter';
import {
  GameSceneStatsSnapshotAdapter,
  type GameSceneStatsSnapshotScenePort,
} from './GameSceneStatsSnapshotAdapter';
import { GameSceneStatsSnapshotBuilder } from './GameSceneStatsSnapshotBuilder';
import {
  GameSceneUpgradeSelectionFlowContextAdapter,
  type GameSceneUpgradeSelectionFlowScenePort,
} from './GameSceneUpgradeSelectionFlowContextAdapter';
import {
  GameSceneUpgradeSelectionProviderContextAdapter,
  type GameSceneUpgradeSelectionProviderScenePort,
} from './GameSceneUpgradeSelectionProviderContextAdapter';
import {
  GameSceneUiBindingAdapter,
  type GameSceneUiBindingScenePort,
} from './GameSceneUiBindingAdapter';
import {
  GameSceneVirtualJoystickActivityAdapter,
  type GameSceneVirtualJoystickActivityScenePort,
} from './GameSceneVirtualJoystickActivityAdapter';
import {
  GameSceneWorldSetupAdapter,
  type GameSceneWorldSetupScenePort,
} from './GameSceneWorldSetupAdapter';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { PlaytestLog } from '../logging/PlaytestLog';
import { MapDefinition } from '../map/MapDefinition';
import { MapManager } from '../map/MapManager';
import { PickupManager } from '../pickup/PickupManager';
import { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import { TreasureManager } from '../pickup/TreasureManager';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerMovementUpdater, type PlayerMovementUpdateContext } from '../player/PlayerMovementUpdater';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { LevelUpEventHandler } from '../progression/LevelUpEventHandler';
import { LevelUpSubscriptionBinder } from '../progression/LevelUpSubscriptionBinder';
import {
  ProgressionEffectSynchronizer,
  type ProgressionEffectSyncContext,
} from '../progression/ProgressionEffectSynchronizer';
import { RelicRewardSelector } from '../relic/RelicRewardSelector';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeFlow } from '../progression/UpgradeFlow';
import {
  UpgradeSelectionContextProvider,
  type UpgradeSelectionProviderContext,
} from '../progression/UpgradeSelectionContextProvider';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import {
  UpgradeSelectionFlowHandler,
  type UpgradeSelectionFlowContext,
} from '../progression/UpgradeSelectionFlowHandler';
import { UpgradeSelectionState } from '../progression/UpgradeSelectionState';
import { RunEndFlowController } from '../run/RunEndFlowController';
import { RunState } from '../run/RunState';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { SpawnDirector } from '../spawn/SpawnDirector';
import { StageDefinition } from '../stage/StageDefinition';
import { StageManager } from '../stage/StageManager';
import { RunStats } from '../stats/RunStats';
import { AutoTreasurePolicy } from '../strategy/policies/AutoTreasurePolicy';
import { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import {
  LiveStrategyControlHandler,
  type LiveStrategyPanelContext,
} from '../strategy/runtime/LiveStrategyControlHandler';
import { TreasureRewardCoordinator } from '../treasure/TreasureRewardCoordinator';
import { CenterMessageController } from '../ui/CenterMessageController';
import {
  EnemyDamageFeedbackController,
  EnemyDamageFeedbackPayload,
} from '../ui/EnemyDamageFeedbackController';
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { LevelUpOptionsPresenter } from '../ui/LevelUpOptionsPresenter';
import { OrientationOverlayController } from '../ui/OrientationOverlayController';
import { PlayerFeedbackController } from '../ui/PlayerFeedbackController';
import { TreasureRewardFeedbackController } from '../ui/TreasureRewardFeedbackController';
import { PauseFlowHandler, type PauseFlowHandlerContext } from '../ui/pause/PauseFlowHandler';
import { RelicAcquiredPresenter } from '../ui/relic/RelicAcquiredPresenter';
import { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import { WeaponManager } from '../weapon/WeaponManager';
import { MapVisibilityController } from '../world/MapVisibilityController';

type GameSceneData = {
  runtimeAssetsReady?: boolean;
};

export class GameScene extends Phaser.Scene {
  private static readonly GAMEPLAY_INITIALIZER_STATIC_CONFIG: GameSceneGameplayInitializerStaticConfig = {
    PLAYER_HIT_RADIUS: 28,
    CONTACT_DAMAGE_COOLDOWN_MS: 1000,
    BOSS_DASH_HIT_RADIUS: 110,
    BOSS_DASH_IMPACT_RADIUS: 140,
    BOSS_DASH_IMPACT_DAMAGE: 30,
    BOSS_DASH_KNOCKBACK_DISTANCE: 120,
  };

  private static readonly PLAYER_HIT_RADIUS =
    GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG.PLAYER_HIT_RADIUS;
  private static readonly CONTACT_DAMAGE_COOLDOWN_MS =
    GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG.CONTACT_DAMAGE_COOLDOWN_MS;
  private static readonly BOSS_DASH_IMPACT_RADIUS =
    GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG.BOSS_DASH_IMPACT_RADIUS;
  private static readonly BOSS_DASH_IMPACT_DAMAGE =
    GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG.BOSS_DASH_IMPACT_DAMAGE;
  private static readonly BOSS_DASH_KNOCKBACK_DISTANCE =
    GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG.BOSS_DASH_KNOCKBACK_DISTANCE;

  private eventBus = new EventBus<GameEventMap>();
  private readonly autoPlayer = new AutoPlayer();
  private readonly autoUpgradeSelector = new AutoUpgradeSelector();
  private readonly autoTreasurePolicy = new AutoTreasurePolicy();
  private readonly bgmContextAdapter = new GameSceneBgmContextAdapter();
  private readonly bgmSynchronizer = new GameSceneBgmSynchronizer();
  private readonly bossDamageContextAdapter = new GameSceneBossDamageContextAdapter();
  private readonly bossDamageUpdater = new GameSceneBossDamageUpdater();
  private readonly chestOpenAdapter = new GameSceneChestOpenAdapter();
  private readonly chestOpenHandler = new GameSceneChestOpenHandler();
  private readonly damageCalculator = new DamageCalculator();
  private readonly enemyDamageFeedbackAdapter = new GameSceneEnemyDamageFeedbackAdapter();
  private readonly spawnEventReporter = new SpawnEventReporter();
  private readonly evolutionCandidateStatsAdapter = new GameSceneEvolutionCandidateStatsAdapter();
  private readonly cleanupCoordinator = new GameSceneCleanupCoordinator();
  private readonly gameplayContextApplier = new GameSceneGameplayContextApplier();
  private readonly gameplayInitializer = new GameplayInitializer();
  private readonly gameplayUpdater = new GameplayUpdater();
  private readonly runtimeSettingsChangeAdapter = new GameSceneRuntimeSettingsChangeAdapter();
  private readonly runtimeTimeScale = new PhaserRuntimeTimeScale();
  private readonly runtimeTextureGuard = new GameSceneRuntimeTextureGuard();
  private readonly spawnEventReporterContextAdapter =
    new GameSceneSpawnEventReporterContextAdapter();
  private readonly frameUpdateAdapter = new GameSceneFrameUpdateAdapter();
  private readonly inputBindings = new GameSceneInputBindings();
  private readonly hudContextAdapter = new GameSceneHudContextAdapter();
  private readonly hudEmitter = new GameSceneHudEmitter();
  private readonly liveStrategyPanelContextAdapter =
    new GameSceneLiveStrategyPanelContextAdapter();
  private readonly pauseFlowContextAdapter = new GameScenePauseFlowContextAdapter();
  private readonly playerMovementContextAdapter = new GameScenePlayerMovementContextAdapter();
  private readonly playerDamageRecordAdapter = new GameScenePlayerDamageRecordAdapter();
  private readonly playerPresentationSetupAdapter = new GameScenePlayerPresentationSetupAdapter();
  private readonly postInitializeAdapter = new GameScenePostInitializeAdapter();
  private readonly progressionEffectContextAdapter =
    new GameSceneProgressionEffectContextAdapter();
  private readonly resizeAdapter = new GameSceneResizeAdapter();
  private readonly runContentResolver = new GameSceneRunContentResolver();
  private readonly runEndAdapter = new GameSceneRunEndAdapter();
  private readonly runEventEmitter = new GameSceneRunEventEmitter();
  private readonly runResetAdapter = new GameSceneRunResetAdapter();
  private readonly debugPanelAdapter = new GameSceneDebugPanelAdapter();
  private readonly statsSnapshotAdapter = new GameSceneStatsSnapshotAdapter();
  private readonly statsSnapshotBuilder = new GameSceneStatsSnapshotBuilder();
  private readonly upgradeSelectionFlowContextAdapter =
    new GameSceneUpgradeSelectionFlowContextAdapter();
  private readonly upgradeSelectionContextProvider = new UpgradeSelectionContextProvider();
  private readonly upgradeSelectionProviderContextAdapter =
    new GameSceneUpgradeSelectionProviderContextAdapter();
  private readonly uiBindingAdapter = new GameSceneUiBindingAdapter();
  private readonly virtualJoystickActivityAdapter = new GameSceneVirtualJoystickActivityAdapter();
  private readonly relicRewardSelector = new RelicRewardSelector();
  private readonly treasureRewardCoordinator = new TreasureRewardCoordinator();
  private readonly runtimeStrategyProfileSynchronizer =
    new GameSceneRuntimeStrategyProfileSynchronizer();
  private readonly stageManager = new StageManager();
  private readonly mapManager = new MapManager();
  private readonly worldSetupAdapter = new GameSceneWorldSetupAdapter();
  private readonly endlessStartAdapter = new GameSceneEndlessStartAdapter();
  private readonly levelUpAutoSelectionAdapter = new GameSceneLevelUpAutoSelectionAdapter();
  private readonly levelUpEventHandler = new LevelUpEventHandler();
  private readonly levelUpSubscriptionBinder = new LevelUpSubscriptionBinder();
  private readonly progressionEffectSynchronizer = new ProgressionEffectSynchronizer();
  private playtestSettings: PlaytestSettingsState = PlaytestSettings.get();
  private currentStage: StageDefinition = this.stageManager.getSelectedStage();
  private currentMap: MapDefinition = this.mapManager.getSelectedMap();
  private currentCharacterId = '';
  private gameplayContext?: GameplayContext;
  private player?: PlayerController;
  private playerHealth?: PlayerHealth;
  private enemies: Enemy[] = [];
  private enemyMovement = new EnemyMovement();
  private readonly mapVisibilityController = new MapVisibilityController(this);
  private weaponManager?: WeaponManager;
  private pickupManager?: PickupManager;
  private treasureManager?: TreasureManager;
  private evolutionManager?: EvolutionManager;
  private passiveManager?: PassiveManager;
  private expManager?: ExpManager;
  private levelManager?: LevelManager;
  private playerStats?: PlayerStats;
  private upgradeApplier?: UpgradeApplier;
  private upgradeFlow?: UpgradeFlow;
  private spawnDirector?: SpawnDirector;
  private bossSpawnDirector?: BossSpawnDirector;
  private bossAttackController?: BossAttackController;
  private endlessManager?: EndlessManager;
  private endlessBossManager?: EndlessBossManager;
  private enemyFactory?: EnemyFactory;
  private floatingTextManager?: FloatingTextManager;
  private virtualJoystick?: VirtualJoystick;
  private readonly orientationOverlayController = new OrientationOverlayController(this);
  private readonly centerMessageController = new CenterMessageController(this);
  private readonly enemyDamageFeedbackController = new EnemyDamageFeedbackController(this);
  private readonly playerFeedbackController = new PlayerFeedbackController(this);
  private readonly playerMovementUpdater = new PlayerMovementUpdater();
  private readonly playerHitRangeAdapter = new GameScenePlayerHitRangeAdapter(
    this,
    GameScene.PLAYER_HIT_RADIUS,
  );
  private readonly treasureRewardFeedbackController = new TreasureRewardFeedbackController();
  private readonly levelUpOptionsPresenter = new LevelUpOptionsPresenter(() => this.uiScene);
  private readonly upgradeSelectionFlowHandler = new UpgradeSelectionFlowHandler();
  private readonly relicAcquiredPresenter = new RelicAcquiredPresenter(
    () => this.uiScene,
    this.centerMessageController,
  );
  private readonly timeManager = new TimeManager();
  private readonly contactDamageCooldowns = new Map<Enemy, number>();
  private unsubscribeLevelUp?: () => void;
  private unsubscribeEnemyKilled?: () => void;
  private unsubscribeSettings?: () => void;
  private uiScene?: Phaser.Scene;
  private playerPickupRange = 0;
  private readonly runState = new RunState();
  private readonly runEndFlowController = new RunEndFlowController(this);
  private readonly pauseFlowHandler = new PauseFlowHandler(this);
  private readonly liveStrategyControlHandler = new LiveStrategyControlHandler();
  private runId = PlaytestLog.createRunId();
  private runStats = new RunStats();
  private isGameplayPaused = false;
  private strategyTacticsPanelEnabledForRun = false;
  private isPauseMenuOpen = false;
  private isGameOver = false;
  private readonly upgradeSelectionState = new UpgradeSelectionState();
  private readonly inputBindingHandlers: GameSceneInputBindingHandlers =
    createGameSceneInputBindingHandlers(this as unknown as GameSceneInputBindingScenePort);

  constructor() {
    super('GameScene');
  }

  private get worldWidth(): number {
    return this.currentMap.worldWidth;
  }

  private get worldHeight(): number {
    return this.currentMap.worldHeight;
  }

  private get finalBossWarningTimeSeconds(): number {
    return this.stageManager.getFinalBossWarningTimeSeconds(this.currentStage);
  }

  create(data: GameSceneData = {}): void {
    this.resolveCurrentRunContent();

    if (this.runtimeTextureGuard.redirectToPreloadIfNeeded(
      this as unknown as GameSceneRuntimeTextureGuardScenePort,
      data,
    )) {
      return;
    }

    this.runResetAdapter.reset(this as unknown as GameSceneRunResetScenePort);

    this.bgmSynchronizer.playGameplayBgm(this);
    this.worldSetupAdapter.setup(this as unknown as GameSceneWorldSetupScenePort);

    this.scene.launch('UIScene');
    const context = this.gameplayInitializer.initialize(
      createGameSceneGameplayInitializerConfig(
        this as unknown as GameSceneGameplayInitializerScenePort,
        GameScene.GAMEPLAY_INITIALIZER_STATIC_CONFIG,
      ),
    );
    this.applyGameplayContext(context);
    this.postInitializeAdapter.apply(this as unknown as GameScenePostInitializeScenePort, context);
    this.runEventEmitter.emitRunStartedFromScene(
      this as unknown as GameSceneRunEventEmitterScenePort,
    );
    this.unsubscribeSettings = this.runtimeSettingsChangeAdapter.subscribe(
      this as unknown as GameSceneRuntimeSettingsScenePort,
    );
    this.playerPresentationSetupAdapter.setup(
      this as unknown as GameScenePlayerPresentationSetupScenePort,
      context,
    );
    this.uiBindingAdapter.bind(this as unknown as GameSceneUiBindingScenePort);
  }

  update(_time: number, delta: number): void {
    this.frameUpdateAdapter.update(this as unknown as GameSceneFrameUpdateScenePort, delta);
  }

  getPlayerHealth(): PlayerHealth | undefined {
    return this.playerHealth;
  }

  private applyGameplayContext(context: GameplayContext): void {
    this.gameplayContextApplier.apply(
      this as unknown as GameSceneGameplayContextScenePort,
      context,
    );
  }

  private syncRuntimeStrategyProfile(profile?: AutoStrategyProfile): void {
    this.runtimeStrategyProfileSynchronizer.sync(profile, {
      gameTimeSeconds: this.timeManager.gameTimeSeconds,
      autoPlayer: this.autoPlayer,
      autoUpgradeSelector: this.autoUpgradeSelector,
      autoTreasurePolicy: this.autoTreasurePolicy,
    });
  }

  private resolveCurrentRunContent(): void {
    const content = this.runContentResolver.resolve(this.stageManager, this.mapManager);

    this.currentStage = content.stage;
    this.currentMap = content.map;
    this.currentCharacterId = content.characterId;
  }

  private refreshLevelUpPanelAutoSelection(): void {
    this.levelUpAutoSelectionAdapter.refresh(
      this as unknown as GameSceneLevelUpAutoSelectionScenePort,
    );
  }

  private startEndlessIfBossAlreadyKilled(): void {
    this.endlessStartAdapter.startIfBossAlreadyKilled(
      this as unknown as GameSceneEndlessStartScenePort,
    );
  }

  private syncCurrentBgm(): void {
    this.bgmSynchronizer.syncCurrent(
      this.bgmContextAdapter.build(this as unknown as Phaser.Scene & GameSceneBgmScenePort),
    );
  }

  private emitHUDState(): void {
    this.hudEmitter.emit(
      this.hudContextAdapter.build(this as unknown as Phaser.Scene & GameSceneHudScenePort),
    );
  }

  private emitDebugPanelData(): void {
    this.debugPanelAdapter.emit(this as unknown as Phaser.Scene & GameSceneDebugPanelScenePort);
  }

  private toggleDebugPanel(): void {
    this.debugPanelAdapter.toggle();
  }

  private handleChestOpened(): void {
    this.chestOpenAdapter.handle(this as unknown as GameSceneChestOpenScenePort);
  }

  private applyBossProjectileDamage(damage: number): void {
    this.bossDamageUpdater.applyProjectileDamage(damage, this.getBossDamageContext());
  }

  private updateBossDashImpacts(): void {
    this.bossDamageUpdater.updateDashImpacts(this.getBossDamageContext());
  }

  private recordPlayerDamage(actualDamage: number): void {
    this.playerDamageRecordAdapter.record(
      actualDamage,
      this as unknown as GameScenePlayerDamageRecordScenePort,
    );
  }

  private updateAutoPlayer(deltaMs: number): void {
    this.playerMovementUpdater.updateAutoPlayer(this.getPlayerMovementUpdateContext(deltaMs));
  }

  private updatePlayerFromVirtualJoystick(deltaMs: number): void {
    this.playerMovementUpdater.updatePlayerFromVirtualJoystick(
      this.getPlayerMovementUpdateContext(deltaMs),
    );
  }

  private getPlayerMovementUpdateContext(deltaMs: number): PlayerMovementUpdateContext {
    return this.playerMovementContextAdapter.build(
      this as unknown as GameScenePlayerMovementScenePort,
      deltaMs,
      {
        playerHitRadiusPx: GameScene.PLAYER_HIT_RADIUS,
      },
    );
  }

  private updatePlayerHitRange(): void {
    this.playerHitRangeAdapter.update(this as unknown as GameScenePlayerHitRangeScenePort);
  }

  private endGame(resultType: 'gameOver' | 'victory'): void {
    this.runEndAdapter.endGame(this as unknown as GameSceneRunEndScenePort, resultType);
  }

  private buildStatsBuildSnapshot(): StatsBuildSnapshot {
    return this.statsSnapshotAdapter.build(
      this as unknown as GameSceneStatsSnapshotScenePort,
    );
  }

  private handleResize(): void {
    this.resizeAdapter.resize(this as unknown as Phaser.Scene & GameSceneResizeScenePort);
  }

  private getPauseFlowContext(): PauseFlowHandlerContext {
    return this.pauseFlowContextAdapter.build(
      this as unknown as GameScenePauseFlowScenePort,
    );
  }

  private getUpgradeSelectionFlowContext(): UpgradeSelectionFlowContext {
    return this.upgradeSelectionFlowContextAdapter.build(
      this as unknown as GameSceneUpgradeSelectionFlowScenePort,
    );
  }

  private showEnemyDamageFloatingText(payload: EnemyDamageFeedbackPayload): void {
    this.enemyDamageFeedbackAdapter.show(
      this as unknown as GameSceneEnemyDamageFeedbackScenePort,
      payload,
    );
  }

  private shouldVirtualJoystickBeActive(): boolean {
    return this.virtualJoystickActivityAdapter.shouldBeActive(
      this as unknown as GameSceneVirtualJoystickActivityScenePort,
    );
  }

  private getUpgradeSelectionContext(): UpgradeSelectionContext {
    return this.upgradeSelectionContextProvider.buildManualContext(
      this.getUpgradeSelectionProviderContext(),
    );
  }

  private getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext {
    return this.upgradeSelectionContextProvider.buildAutoContext(
      this.getUpgradeSelectionProviderContext(),
    );
  }

  private getEvolutionCandidateStats(): string {
    return this.evolutionCandidateStatsAdapter.format(
      this as unknown as GameSceneEvolutionCandidateStatsScenePort,
    );
  }

  private getProgressionEffectSyncContext(): ProgressionEffectSyncContext {
    return this.progressionEffectContextAdapter.build(
      this as unknown as GameSceneProgressionEffectScenePort,
    );
  }

  private getUpgradeSelectionProviderContext(): UpgradeSelectionProviderContext {
    return this.upgradeSelectionProviderContextAdapter.build(
      this as unknown as GameSceneUpgradeSelectionProviderScenePort,
    );
  }

  private getBossDamageContext(): GameSceneBossDamageContext {
    return this.bossDamageContextAdapter.build(
      this as unknown as GameSceneBossDamageScenePort,
      {
        dashImpactRadius: GameScene.BOSS_DASH_IMPACT_RADIUS,
        dashImpactDamage: GameScene.BOSS_DASH_IMPACT_DAMAGE,
        dashKnockbackDistance: GameScene.BOSS_DASH_KNOCKBACK_DISTANCE,
        contactDamageCooldownMs: GameScene.CONTACT_DAMAGE_COOLDOWN_MS,
      },
    );
  }

  private getSpawnEventReporterContext(): SpawnEventReporterContext {
    return this.spawnEventReporterContextAdapter.build(
      this as unknown as GameSceneSpawnEventReporterScenePort,
    );
  }

  private getLiveStrategyPanelContext(): LiveStrategyPanelContext {
    return this.liveStrategyPanelContextAdapter.build(
      this as unknown as GameSceneLiveStrategyPanelScenePort,
    );
  }

  private cleanup(): void {
    this.cleanupCoordinator.cleanup(this as unknown as GameSceneCleanupPort);
  }
}
