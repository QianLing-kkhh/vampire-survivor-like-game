import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { AutoPlayer } from '../auto/AutoPlayer';
import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { BossAttackController } from '../boss/BossAttackController';
import { BossFactory } from '../boss/BossFactory';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { TimeManager } from '../core/TimeManager';
import { Enemy, GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyMovement } from '../enemy/EnemyMovement';
import { EndlessManager } from '../endless/EndlessManager';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { GameplayContext } from '../gameplay/GameplayContext';
import { GameplayInitializer } from '../gameplay/GameplayInitializer';
import { GameplayUpdater } from '../gameplay/GameplayUpdater';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { PlaytestLog } from '../logging/PlaytestLog';
import { PickupManager } from '../pickup/PickupManager';
import { TreasureManager } from '../pickup/TreasureManager';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeFlow } from '../progression/UpgradeFlow';
import { UpgradeOption } from '../progression/UpgradeOption';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import { RunResultBuilder } from '../run/RunResultBuilder';
import { RunState } from '../run/RunState';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SpawnDirector } from '../spawn/SpawnDirector';
import { RunStats } from '../stats/RunStats';
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { PauseMenuStatsData } from '../ui/PauseMenu';
import { WeaponManager } from '../weapon/WeaponManager';
import { WorldConfig } from '../world/WorldConfig';
import { WorldRenderer } from '../world/WorldRenderer';

export class GameScene extends Phaser.Scene {
  private static readonly INITIAL_WEAPON_ID = 'knife';
  private static readonly VICTORY_TIME_SECONDS = 300;
  private static readonly FINAL_BOSS_WARNING_SECONDS = 270;
  private static readonly FINAL_BOSS_ID = 'boss';
  private static readonly WORLD_WIDTH = WorldConfig.width;
  private static readonly WORLD_HEIGHT = WorldConfig.height;
  private static readonly PLAYER_HIT_RADIUS = 28;
  private static readonly CONTACT_DAMAGE_COOLDOWN_MS = 1000;
  private static readonly DAMAGE_REACTION_RADIUS = 120;
  private static readonly DAMAGE_REACTION_DAMAGE = 20;
  private static readonly DAMAGE_REACTION_KNOCKBACK_DISTANCE = 80;
  private static readonly BOSS_DASH_HIT_RADIUS = 110;
  private static readonly BOSS_DASH_IMPACT_RADIUS = 140;
  private static readonly BOSS_DASH_IMPACT_DAMAGE = 30;
  private static readonly BOSS_DASH_KNOCKBACK_DISTANCE = 120;
  private static readonly LEVEL_UP_HEAL_LOST_HP_RATIO = 0.2;

  private eventBus = new EventBus<GameEventMap>();
  private readonly autoPlayer = new AutoPlayer();
  private readonly autoUpgradeSelector = new AutoUpgradeSelector();
  private readonly damageCalculator = new DamageCalculator();
  private readonly gameplayInitializer = new GameplayInitializer();
  private readonly gameplayUpdater = new GameplayUpdater();
  private playtestSettings: PlaytestSettingsState = PlaytestSettings.get();
  private gameplayContext?: GameplayContext;
  private player?: PlayerController;
  private playerHitRange?: Phaser.GameObjects.Arc;
  private playerHealth?: PlayerHealth;
  private enemies: Enemy[] = [];
  private enemyMovement = new EnemyMovement();
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
  private enemyFactory?: EnemyFactory;
  private floatingTextManager?: FloatingTextManager;
  private virtualJoystick?: VirtualJoystick;
  private orientationOverlay?: Phaser.GameObjects.Container;
  private readonly timeManager = new TimeManager();
  private readonly contactDamageCooldowns = new Map<Enemy, number>();
  private readonly centerMessages = new Set<Phaser.GameObjects.Text>();
  private unsubscribeLevelUp?: () => void;
  private unsubscribeEnemyKilled?: () => void;
  private uiScene?: Phaser.Scene;
  private playerPickupRange = 0;
  private readonly runState = new RunState();
  private readonly runResultBuilder = new RunResultBuilder();
  private runId = PlaytestLog.createRunId();
  private runStats = new RunStats();
  private isGameplayPaused = false;
  private isLevelUpSelectionActive = false;
  private isPauseMenuOpen = false;
  private isGameOver = false;
  private finalBossWarningShown = false;
  private finalBossSpawned = false;
  private finalBossDefeated = false;
  private finalBossSpawnTime = 0;
  private finalBossKillTime = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.enemies = [];
    this.contactDamageCooldowns.clear();
    this.timeManager.reset();
    this.centerMessages.clear();
    this.eventBus = new EventBus<GameEventMap>();
    this.unsubscribeLevelUp = undefined;
    this.unsubscribeEnemyKilled = undefined;
    this.playtestSettings = PlaytestSettings.get();
    this.runState.reset();
    this.runId = PlaytestLog.createRunId();
    this.player = undefined;
    this.playerHitRange = undefined;
    this.playerHealth = undefined;
    this.expManager = undefined;
    this.levelManager = undefined;
    this.playerStats = undefined;
    this.upgradeApplier = undefined;
    this.upgradeFlow = undefined;
    this.isGameplayPaused = false;
    this.isLevelUpSelectionActive = false;
    this.isPauseMenuOpen = false;
    this.isGameOver = false;
    this.spawnDirector = undefined;
    this.bossSpawnDirector = undefined;
    this.bossAttackController = undefined;
    this.endlessManager = undefined;
    this.enemyFactory = undefined;
    this.floatingTextManager = undefined;
    this.virtualJoystick = undefined;
    this.orientationOverlay = undefined;
    this.weaponManager = undefined;
    this.pickupManager = undefined;
    this.treasureManager = undefined;
    this.evolutionManager = undefined;
    this.passiveManager = undefined;
    this.finalBossWarningShown = false;
    this.finalBossSpawned = false;
    this.finalBossDefeated = false;
    this.finalBossSpawnTime = 0;
    this.finalBossKillTime = 0;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.physics.world.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    new WorldRenderer(this).render();
    this.scene.launch('UIScene');
    const context = this.gameplayInitializer.initialize({
      scene: this,
      eventBus: this.eventBus,
      autoPlayer: this.autoPlayer,
      autoUpgradeSelector: this.autoUpgradeSelector,
      damageCalculator: this.damageCalculator,
      enemyMovement: this.enemyMovement,
      timeManager: this.timeManager,
      runState: this.runState,
      playtestSettings: this.playtestSettings,
      initialWeaponId: GameScene.INITIAL_WEAPON_ID,
      centerX,
      centerY,
      worldWidth: GameScene.WORLD_WIDTH,
      worldHeight: GameScene.WORLD_HEIGHT,
      finalBossId: GameScene.FINAL_BOSS_ID,
      finalBossWarningSeconds: GameScene.FINAL_BOSS_WARNING_SECONDS,
      finalBossTimeSeconds: GameScene.VICTORY_TIME_SECONDS,
      playerHitRadius: GameScene.PLAYER_HIT_RADIUS,
      contactDamageCooldownMs: GameScene.CONTACT_DAMAGE_COOLDOWN_MS,
      damageReactionRadius: GameScene.DAMAGE_REACTION_RADIUS,
      damageReactionDamage: GameScene.DAMAGE_REACTION_DAMAGE,
      damageReactionKnockbackDistance: GameScene.DAMAGE_REACTION_KNOCKBACK_DISTANCE,
      bossDashHitRadius: GameScene.BOSS_DASH_HIT_RADIUS,
      bossDashImpactRadius: GameScene.BOSS_DASH_IMPACT_RADIUS,
      bossDashImpactDamage: GameScene.BOSS_DASH_IMPACT_DAMAGE,
      bossDashKnockbackDistance: GameScene.BOSS_DASH_KNOCKBACK_DISTANCE,
      callbacks: {
        onPauseRequested: () => this.handleEscapePressed(),
        getUpgradeSelectionContext: () => this.getUpgradeSelectionContext(),
        getAutoUpgradeSelectionContext: () => this.getAutoUpgradeSelectionContext(),
        onUpgradeApplied: () => this.handleUpgradeApplied(),
        onChestDropped: () => {
          this.runState.recordTreasureDrop();
        },
        onChestOpened: () => {
          this.runState.recordTreasureOpen();
        },
        onEnemySpawned: (enemy) => {
          enemy.setEventBus(this.eventBus);
          this.enemies.push(enemy);
        },
        onBossSpawned: (boss) => {
          boss.setEventBus(this.eventBus);
          this.enemies.push(boss);
          AudioManager.play(this, 'boss_spawn');
          this.showCenterMessage('Boss Appears!');
        },
        onCenterMessage: (message) => this.showCenterMessage(message),
      },
    });
    this.applyGameplayContext(context);
    context.virtualJoystick.setGameplayActive(!this.playtestSettings.autoMode);
    this.createOrientationOverlay();
    this.scale.on('resize', this.handleResize, this);
    this.playerHitRange = this.add.circle(
      context.player.body.x,
      context.player.body.y,
      GameScene.PLAYER_HIT_RADIUS,
      0xffffff,
      0.08,
    );
    this.playerHitRange.setStrokeStyle(1, 0xffffff, 0.45);
    this.playerHitRange.setDepth(20);
    this.cameras.main.startFollow(context.player.body, true, 0.08, 0.08);
    const uiScene = this.scene.get('UIScene');
    this.uiScene = uiScene;

    this.unsubscribeLevelUp = this.eventBus.subscribe('LevelUp', (event) => {
      console.log('LevelUp', event);
      AudioManager.play(this, 'level_up');
      const healAmount = this.playerHealth?.healLostHpRatio(
        GameScene.LEVEL_UP_HEAL_LOST_HP_RATIO,
      ) ?? 0;

      if (healAmount > 0 && this.player) {
        this.floatingTextManager?.showPlayerHeal(
          this.player.body.x,
          this.player.body.y,
          healAmount,
        );
      }

      this.emitHUDState();
      this.isGameplayPaused = true;
      this.isLevelUpSelectionActive = true;
      const selectedOptions = (this.upgradeFlow?.getLevelUpOptions() ?? [])
        .map((option) => ({
          ...option,
          displayInfo: this.upgradeApplier?.getUpgradeDisplayInfo(
            option,
            this.evolutionManager,
          ),
        }));
      const autoSelectedOption = this.playtestSettings.autoMode
        ? this.upgradeFlow?.chooseAutoUpgrade(selectedOptions)
        : undefined;

      uiScene.events.emit(
        'ShowLevelUpOptions',
        this.playtestSettings.autoMode
          ? {
            options: selectedOptions,
            autoSelectOptionId: autoSelectedOption?.id,
            autoSelectDelayMs: 300,
          }
          : selectedOptions,
      );
    });
    uiScene.events.on('UpgradeSelected', this.handleUpgradeSelected, this);
    uiScene.events.on('PauseResume', this.resumeFromPauseMenu, this);
    uiScene.events.on('PauseRestart', this.restartFromPauseMenu, this);
    uiScene.events.on('PauseBackToTitle', this.backToTitleFromPauseMenu, this);
    this.events.on('EnemyDamagedFloatingText', this.showEnemyDamageFloatingText, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEscapePressed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) {
      return;
    }

    if (this.updateOrientationOverlay()) {
      this.virtualJoystick?.setGameplayActive(false);
      this.emitHUDState();
      return;
    }

    if (this.isGameplayPaused) {
      this.virtualJoystick?.setGameplayActive(false);
      this.emitHUDState();
      return;
    }

    if (!this.gameplayContext) {
      return;
    }

    this.gameplayUpdater.update(this.gameplayContext, {
      deltaMs: delta,
      isLevelUpSelectionActive: this.isLevelUpSelectionActive,
      isAutoMode: this.playtestSettings.autoMode,
      worldWidth: GameScene.WORLD_WIDTH,
      worldHeight: GameScene.WORLD_HEIGHT,
      callbacks: {
        getGameplayTimeScale: () => this.getGameplayTimeScale(),
        updateAutoPlayer: (deltaMs) => this.updateAutoPlayer(deltaMs),
        updatePlayerFromVirtualJoystick: (deltaMs) => (
          this.updatePlayerFromVirtualJoystick(deltaMs)
        ),
        updatePlayerHitRange: () => this.updatePlayerHitRange(),
        isPlayerDead: () => this.playerHealth?.isDead === true,
        isFinalBossDefeated: () => (
          this.gameplayContext?.bossController.hasBossBeenKilled() === true
        ),
        endGame: (resultType) => this.endGame(resultType),
        emitHUDState: () => this.emitHUDState(),
      },
    });
  }

  getPlayerHealth(): PlayerHealth | undefined {
    return this.playerHealth;
  }

  private applyGameplayContext(context: GameplayContext): void {
    this.gameplayContext = context;
    this.playtestSettings = context.playtestSettings;
    this.runStats = context.runStats;
    this.player = context.player;
    this.playerHealth = context.playerHealth;
    this.enemies = context.enemies;
    this.weaponManager = context.weaponManager;
    this.pickupManager = context.pickupManager;
    this.treasureManager = context.treasureManager;
    this.evolutionManager = context.evolutionManager;
    this.passiveManager = context.passiveManager;
    this.expManager = context.expManager;
    this.levelManager = context.levelManager;
    this.playerStats = context.playerStats;
    this.upgradeApplier = context.upgradeApplier;
    this.upgradeFlow = context.upgradeFlow;
    this.spawnDirector = context.spawnDirector;
    this.bossSpawnDirector = context.bossSpawnDirector;
    this.bossAttackController = context.bossAttackController;
    this.endlessManager = context.endlessManager;
    this.enemyFactory = context.enemyFactory;
    this.floatingTextManager = context.floatingTextManager;
    this.virtualJoystick = context.virtualJoystick;
    this.playerPickupRange = context.playerPickupRange;
  }

  private emitHUDState(): void {
    if (!this.playerHealth || !this.levelManager || !this.expManager || !this.playerStats) {
      return;
    }

    this.scene.get('UIScene').events.emit('UpdateHUD', {
      currentHp: this.playerHealth.currentHp,
      maxHp: this.playerHealth.maxHp,
      level: this.levelManager.currentLevel,
      currentExp: this.expManager.currentExp,
      requiredExp: this.levelManager.requiredExp,
      timeSeconds: this.timeManager.gameTimeSeconds,
      targetTimeSeconds: GameScene.VICTORY_TIME_SECONDS,
      weaponIds: this.weaponManager?.getWeaponIds() ?? [],
      weaponHudInfo: this.weaponManager?.getWeaponHudInfo() ?? [],
      weaponBuildHudInfo: this.weaponManager?.getWeaponBuildHudInfo({
        getPassiveLevel: (passiveId) => this.passiveManager?.getPassiveLevel(passiveId) ?? 0,
        getPassiveName: (passiveId) => this.passiveManager?.getPassiveName(passiveId) ?? passiveId,
        getPassiveMaxLevel: (passiveId) => this.passiveManager?.getPassiveMaxLevel(passiveId) ?? 5,
        getRequiredPassiveForWeapon: (weaponId) => (
          this.evolutionManager?.getRequiredPassiveForWeapon(weaponId)
        ),
      }) ?? [],
      passiveItems: this.passiveManager?.getPassiveLevels() ?? [],
      autoMode: this.playtestSettings.autoMode,
      evolutionCandidateStats: this.getEvolutionCandidateStats(),
      moveSpeed: this.playerStats.moveSpeed,
      pickupRange: this.playerStats.pickupRange,
      playerMaxHp: this.playerHealth.maxHp,
      worldWidth: GameScene.WORLD_WIDTH,
      worldHeight: GameScene.WORLD_HEIGHT,
      playerPosition: this.player
        ? { x: this.player.body.x, y: this.player.body.y }
        : { x: 0, y: 0 },
      enemyPositions: this.enemies
        .filter((enemy) => !enemy.isDead)
        .slice(0, 50)
        .map((enemy) => ({ x: enemy.body.x, y: enemy.body.y })),
      message: this.getHUDMessage(),
      endlessMode: this.playtestSettings.endlessMode,
      endlessStarted: this.runState.endlessStarted,
      endlessTimeSeconds: this.runState.endlessSurvivalTime,
    });
  }

  private updateFinalBossEvent(): void {
    if (
      !this.finalBossWarningShown
      && this.timeManager.gameTimeSeconds >= GameScene.FINAL_BOSS_WARNING_SECONDS
    ) {
      this.finalBossWarningShown = true;
      this.showCenterMessage('Boss Coming');
    }

    if (
      !this.finalBossSpawned
      && this.timeManager.gameTimeSeconds >= GameScene.VICTORY_TIME_SECONDS
    ) {
      this.spawnFinalBoss();
    }
  }

  private spawnFinalBoss(): void {
    if (!this.enemyFactory) {
      return;
    }

    const position = this.getFinalBossSpawnPosition();
    const boss = this.enemyFactory.create(
      GameScene.FINAL_BOSS_ID,
      position.x,
      position.y,
    );

    boss.setEventBus(this.eventBus);
    this.enemies.push(boss);
    this.finalBossSpawned = true;
    this.finalBossSpawnTime = this.timeManager.gameTimeSeconds;
    this.runState.setBossPhaseInitialHp(this.playerHealth?.currentHp ?? 0);
    this.bossAttackController = new BossAttackController(this, boss);
    if (this.gameplayContext) {
      this.gameplayContext.bossAttackController = this.bossAttackController;
    }
    AudioManager.play(this, 'boss_spawn');
    this.showCenterMessage('Boss Appears!');
  }

  private getFinalBossSpawnPosition(): { x: number; y: number } {
    if (!this.player) {
      return {
        x: GameScene.WORLD_WIDTH / 2,
        y: GameScene.WORLD_HEIGHT / 2,
      };
    }

    const padding = 120;
    const candidates = [
      { x: GameScene.WORLD_WIDTH / 2, y: padding },
      { x: GameScene.WORLD_WIDTH - padding, y: GameScene.WORLD_HEIGHT / 2 },
      { x: GameScene.WORLD_WIDTH / 2, y: GameScene.WORLD_HEIGHT - padding },
      { x: padding, y: GameScene.WORLD_HEIGHT / 2 },
    ];

    let farthestPosition = candidates[0];
    let farthestDistance = -1;

    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        this.player.body.x,
        this.player.body.y,
        candidate.x,
        candidate.y,
      );

      if (distance <= farthestDistance) {
        continue;
      }

      farthestPosition = candidate;
      farthestDistance = distance;
    }

    return farthestPosition;
  }

  private getHUDMessage(): string | undefined {
    return this.gameplayContext?.bossController.getHUDMessage();
  }

  private applyBossProjectileDamage(damage: number): void {
    if (!this.playerHealth) {
      return;
    }

    const actualDamage = this.playerHealth.takeDamage(damage);

    if (actualDamage <= 0) {
      return;
    }

    this.recordPlayerDamage(actualDamage);
  }

  private updateContactDamage(deltaMs: number): void {
    if (!this.player || !this.playerHealth) {
      return;
    }

    for (const [enemy, cooldownMs] of this.contactDamageCooldowns) {
      const nextCooldownMs = cooldownMs - deltaMs;

      if (nextCooldownMs > 0 && !enemy.isDead) {
        this.contactDamageCooldowns.set(enemy, nextCooldownMs);
        continue;
      }

      this.contactDamageCooldowns.delete(enemy);
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const isDashHit = enemy.isDashing();

      if (!isDashHit && this.contactDamageCooldowns.has(enemy)) {
        continue;
      }

      if (!this.isPlayerHitByEnemy(enemy, isDashHit)) {
        continue;
      }

      if (isDashHit && !enemy.consumeDashHit()) {
        continue;
      }

      const hpBeforeDamage = this.playerHealth.currentHp;
      const damage = isDashHit
        ? enemy.damage * enemy.dashDamageMultiplier
        : enemy.damage;
      const actualDamage = this.playerHealth.takeDamage(damage);
      this.contactDamageCooldowns.set(enemy, GameScene.CONTACT_DAMAGE_COOLDOWN_MS);

      if (actualDamage > 0) {
        if (isDashHit) {
          this.runState.recordBossDashHit();
          this.knockPlayerBack(enemy.getDashDirection());
        }

        this.recordPlayerDamage(actualDamage);
      }

      if (this.playerHealth.currentHp < hpBeforeDamage) {
        this.triggerDamageReaction();
      }
    }
  }

  private updateBossDashImpacts(): void {
    if (!this.player || !this.playerHealth) {
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const impactPosition = enemy.consumeDashImpact();

      if (!impactPosition) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.body.x,
        this.player.body.y,
        impactPosition.x,
        impactPosition.y,
      );

      if (
        distance > GameScene.BOSS_DASH_IMPACT_RADIUS
        || !enemy.consumeDashHit()
      ) {
        continue;
      }

      const actualDamage = this.playerHealth.takeDamage(
        GameScene.BOSS_DASH_IMPACT_DAMAGE,
      );

      if (actualDamage <= 0) {
        continue;
      }

      this.runState.recordBossDashHit();
      this.recordPlayerDamage(actualDamage);
      this.knockPlayerBackFromPoint(impactPosition);
      this.contactDamageCooldowns.set(enemy, GameScene.CONTACT_DAMAGE_COOLDOWN_MS);
    }
  }

  private isPlayerHitByEnemy(enemy: Enemy, isDashHit: boolean): boolean {
    if (!this.player) {
      return false;
    }

    if (isDashHit) {
      const dashSegment = enemy.getDashSegment();

      if (!dashSegment) {
        return false;
      }

      return this.getPointToSegmentDistance(
        this.player.body.x,
        this.player.body.y,
        dashSegment.start.x,
        dashSegment.start.y,
        dashSegment.end.x,
        dashSegment.end.y,
      ) <= GameScene.BOSS_DASH_HIT_RADIUS;
    }

    return Phaser.Math.Distance.Between(
      this.player.body.x,
      this.player.body.y,
      enemy.body.x,
      enemy.body.y,
    ) <= GameScene.PLAYER_HIT_RADIUS;
  }

  private getPointToSegmentDistance(
    pointX: number,
    pointY: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): number {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSq === 0) {
      return Phaser.Math.Distance.Between(pointX, pointY, startX, startY);
    }

    const rawT = (
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY)
      / segmentLengthSq
    );
    const t = Phaser.Math.Clamp(rawT, 0, 1);
    const closestX = startX + segmentX * t;
    const closestY = startY + segmentY * t;

    return Phaser.Math.Distance.Between(pointX, pointY, closestX, closestY);
  }

  private recordPlayerDamage(actualDamage: number): void {
    if (!this.playerHealth) {
      return;
    }

    AudioManager.play(this, 'player_hit');

    if (this.player) {
      this.floatingTextManager?.showPlayerDamage(
        this.player.body.x,
        this.player.body.y,
        actualDamage,
      );
    }

    this.runStats.recordDamageTaken(actualDamage, this.playerHealth.currentHp);

    if (this.finalBossSpawned) {
      this.runState.recordBossPhaseDamage(actualDamage, this.playerHealth.currentHp);
    }
  }

  private knockPlayerBack(direction: Phaser.Math.Vector2): void {
    if (!this.player) {
      return;
    }

    const knockbackDirection = direction.clone();

    if (knockbackDirection.lengthSq() === 0) {
      knockbackDirection.set(1, 0);
    }

    knockbackDirection.normalize().scale(GameScene.BOSS_DASH_KNOCKBACK_DISTANCE);

    this.player.applyExternalDisplacement(knockbackDirection);
  }

  private knockPlayerBackFromPoint(point: Phaser.Math.Vector2): void {
    if (!this.player) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      this.player.body.x - point.x,
      this.player.body.y - point.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    this.knockPlayerBack(direction);
  }

  private updateAutoPlayer(deltaMs: number): void {
    if (!this.player || !this.playerStats) {
      return;
    }

    const direction = this.autoPlayer.getMoveDirection({
      playerPosition: this.player.body,
      enemyPositions: this.enemies
        .filter((enemy) => !enemy.isDead)
        .map((enemy) => enemy.body),
      pickupPositions: this.getPickupPositions(),
      treasurePositions: this.getTreasurePositions(),
      pickupRangePx: this.playerPickupRange,
      weaponContext: this.weaponManager?.getAutoWeaponContext(),
      worldBounds: {
        width: GameScene.WORLD_WIDTH,
        height: GameScene.WORLD_HEIGHT,
      },
    });

    this.player.moveWithDirection(direction, deltaMs, 'auto');
  }

  private updatePlayerFromVirtualJoystick(deltaMs: number): void {
    if (!this.player || !this.playerStats || !this.virtualJoystick) {
      return;
    }

    const direction = this.virtualJoystick.getDirection();

    this.player.moveWithDirection(direction, deltaMs, 'virtualJoystick');
  }

  private getPickupPositions(): Array<{ x: number; y: number }> {
    const pickupManager = this.pickupManager as unknown as {
      pickups?: Array<{
        body: {
          x: number;
          y: number;
        };
      }>;
    };

    return pickupManager.pickups?.map((pickup) => pickup.body) ?? [];
  }

  private getTreasurePositions(): Array<{ x: number; y: number }> {
    return this.treasureManager?.getChests() ?? [];
  }

  private triggerDamageReaction(): void {
    if (!this.player) {
      return;
    }

    this.showDamageReactionFeedback(this.player.body.x, this.player.body.y);

    const hitResult = this.damageCalculator.calculateDamage(
      GameScene.DAMAGE_REACTION_DAMAGE,
    );

    for (const enemy of this.enemies) {
      if (enemy.isDead || !this.isEnemyInDamageReactionRange(enemy)) {
        continue;
      }

      enemy.takeDamage(hitResult);

      if (enemy.isDead) {
        enemy.destroy();
        continue;
      }

      this.knockEnemyBack(enemy);
    }
  }

  private isEnemyInDamageReactionRange(enemy: Enemy): boolean {
    if (!this.player) {
      return false;
    }

    return Phaser.Math.Distance.Between(
      this.player.body.x,
      this.player.body.y,
      enemy.body.x,
      enemy.body.y,
    ) <= GameScene.DAMAGE_REACTION_RADIUS;
  }

  private knockEnemyBack(enemy: Enemy): void {
    if (!this.player) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      enemy.body.x - this.player.body.x,
      enemy.body.y - this.player.body.y,
    );

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(GameScene.DAMAGE_REACTION_KNOCKBACK_DISTANCE);

    const enemyRadius = this.getEnemyRadius(enemy);
    enemy.body.x = Phaser.Math.Clamp(
      enemy.body.x + direction.x,
      enemyRadius,
      GameScene.WORLD_WIDTH - enemyRadius,
    );
    enemy.body.y = Phaser.Math.Clamp(
      enemy.body.y + direction.y,
      enemyRadius,
      GameScene.WORLD_HEIGHT - enemyRadius,
    );
  }

  private getEnemyRadius(enemy: Enemy): number {
    const body = enemy.body as Phaser.GameObjects.GameObject & { radius?: number };

    return body.radius ?? 12;
  }

  private showDamageReactionFeedback(x: number, y: number): void {
    const feedback = this.add.circle(
      x,
      y,
      GameScene.DAMAGE_REACTION_RADIUS,
      0x60a5fa,
      0.18,
    );

    feedback.setStrokeStyle(2, 0xbfdbfe, 0.8);
    feedback.setDepth(25);

    this.tweens.add({
      targets: feedback,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 180,
      onComplete: () => {
        feedback.destroy();
      },
    });
  }

  private showCenterMessage(message: string): void {
    const camera = this.cameras.main;
    const text = this.add.text(
      camera.scrollX + camera.width / 2,
      camera.scrollY + camera.height / 2,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#111827',
        strokeThickness: 6,
      },
    );

    text.setOrigin(0.5);
    text.setDepth(100);
    this.centerMessages.add(text);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 28,
      duration: 1600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.centerMessages.delete(text);
        if (text.active) {
          text.destroy();
        }
      },
    });
  }

  private updatePlayerHitRange(): void {
    if (!this.player || !this.playerHitRange) {
      return;
    }

    this.playerHitRange.setPosition(this.player.body.x, this.player.body.y);
  }

  private endGame(resultType: 'gameOver' | 'victory'): void {
    this.isGameOver = true;
    AudioManager.play(this, resultType === 'victory' ? 'victory' : 'game_over');
    this.emitHUDState();
    const survivalTime = this.timeManager.gameTimeSeconds;
    const resultData = this.runResultBuilder.build({
      runId: this.runId,
      autoMode: this.playtestSettings.autoMode,
      fastMode: this.playtestSettings.fastMode,
      timeScale: this.getGameplayTimeScale(),
      upgradeSelectionMode: this.autoUpgradeSelector.mode,
      resultType,
      survivalTime,
      evolutionCandidateStats: this.getEvolutionCandidateStats(),
      runState: this.runState,
      runStats: this.runStats,
      weaponManager: this.weaponManager,
      passiveManager: this.passiveManager,
      playerStats: this.playerStats,
      playerHealth: this.playerHealth,
      levelManager: this.levelManager,
      expManager: this.expManager,
      bossState: {
        bossSpawned: this.gameplayContext?.bossController.hasBossSpawned() ?? false,
        bossKilled: this.gameplayContext?.bossController.hasBossBeenKilled() ?? false,
        bossSpawnTime: this.gameplayContext?.bossController.getBossSpawnTime() ?? 0,
        bossKillTime: this.gameplayContext?.bossController.getBossKillTime() ?? 0,
      },
    });

    this.cleanup();
    this.scene.stop('UIScene');
    this.scene.start('ResultScene', resultData);
  }

  private handleUpgradeSelected(option: UpgradeOption): void {
    this.upgradeFlow?.applyLevelUpUpgrade(option);
    this.isLevelUpSelectionActive = false;
    this.isGameplayPaused = false;
    this.virtualJoystick?.setGameplayActive(!this.playtestSettings.autoMode);
  }

  private handleUpgradeApplied(): void {
    this.syncPassiveEffects();
    this.updatePlayerPickupRangeFromStats();
  }

  private handleEscapePressed(): void {
    if (this.isGameOver || this.isLevelUpSelectionActive) {
      return;
    }

    if (this.isPauseMenuOpen) {
      this.resumeFromPauseMenu();
      return;
    }

    this.isPauseMenuOpen = true;
    this.isGameplayPaused = true;
    this.virtualJoystick?.setGameplayActive(false);
    this.scene.get('UIScene').events.emit('ShowPauseMenu', this.buildPauseMenuStatsData());
  }

  private buildPauseMenuStatsData(): PauseMenuStatsData {
    const runStatsSummary = this.runStats.getSummary();

    return {
      character: {
        currentHp: this.playerHealth?.currentHp ?? 0,
        maxHp: this.playerHealth?.maxHp ?? this.playerStats?.maxHp ?? 0,
        moveSpeed: this.playerStats?.moveSpeed ?? 0,
        pickupRange: this.playerStats?.pickupRange ?? 0,
        expMultiplier: 1,
        level: this.levelManager?.currentLevel ?? 1,
        currentExp: this.expManager?.currentExp ?? 0,
        requiredExp: this.levelManager?.requiredExp ?? 1,
        damageTaken: runStatsSummary.damageTaken,
        killCount: this.runState.killCount,
        treasureOpenCount: this.runState.treasureOpenCount,
        bossPhaseDamageTaken: this.runState.bossPhaseDamageTaken,
        endlessMode: this.playtestSettings.endlessMode,
        endlessStarted: this.runState.endlessStarted,
        endlessTimeSeconds: this.runState.endlessSurvivalTime,
      },
      weapons: this.weaponManager?.getWeaponDetailInfo({
        getPassiveLevel: (passiveId) => this.passiveManager?.getPassiveLevel(passiveId) ?? 0,
        getPassiveName: (passiveId) => this.passiveManager?.getPassiveName(passiveId) ?? passiveId,
        getRequiredPassiveForWeapon: (weaponId) => (
          this.evolutionManager?.getRequiredPassiveForWeapon(weaponId)
        ),
      }) ?? [],
      passives: this.passiveManager?.getPassiveDetailInfo({
        getRelatedWeaponIds: (passiveId) => (
          this.evolutionManager?.getWeaponsForPassive(passiveId)
            .map((rule) => this.weaponManager?.getUpgradeTargetWeaponId(rule.baseWeaponId)
              ?? rule.baseWeaponId) ?? []
        ),
      }) ?? [],
    };
  }

  private createOrientationOverlay(): void {
    const overlay = this.add.container(0, 0);
    overlay.setDepth(20000);
    overlay.setScrollFactor(0);
    const background = this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      0x020617,
      0.86,
    );
    background.setOrigin(0, 0);
    background.setScrollFactor(0);
    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'Rotate your device for better play',
      {
        color: '#f8fafc',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '30px',
        align: 'center',
        wordWrap: { width: 520 },
      },
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    overlay.add([background, text]);
    overlay.setVisible(false);
    this.orientationOverlay = overlay;
  }

  private updateOrientationOverlay(): boolean {
    const shouldShow = this.shouldShowOrientationOverlay();

    this.orientationOverlay?.setVisible(shouldShow);
    return shouldShow;
  }

  private handleResize(): void {
    const overlayChildren = this.orientationOverlay?.list ?? [];
    const background = overlayChildren[0] as Phaser.GameObjects.Rectangle | undefined;
    const text = overlayChildren[1] as Phaser.GameObjects.Text | undefined;

    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.cameras.main.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    background?.setSize(this.scale.width, this.scale.height);
    text?.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.updateOrientationOverlay();
  }

  private shouldShowOrientationOverlay(): boolean {
    return false;
  }

  private isTouchOrNarrowScreen(): boolean {
    const phaserTouch = this.sys.game.device.input.touch;
    const hasTouch = (globalThis.navigator?.maxTouchPoints ?? 0) > 0;
    const hasCoarsePointer = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    const isNarrowWindow = (globalThis.innerWidth ?? this.scale.width) <= 900
      || (globalThis.innerHeight ?? this.scale.height) <= 900;

    return phaserTouch || hasTouch || hasCoarsePointer || isNarrowWindow;
  }

  private resumeFromPauseMenu(): void {
    if (!this.isPauseMenuOpen) {
      return;
    }

    this.isPauseMenuOpen = false;
    this.isGameplayPaused = false;
    this.virtualJoystick?.setGameplayActive(!this.playtestSettings.autoMode);
    this.scene.get('UIScene').events.emit('HidePauseMenu');
  }

  private restartFromPauseMenu(): void {
    this.isPauseMenuOpen = false;
    this.virtualJoystick?.setGameplayActive(false);
    this.scene.stop('UIScene');
    this.scene.restart();
  }

  private backToTitleFromPauseMenu(): void {
    this.isPauseMenuOpen = false;
    this.virtualJoystick?.setGameplayActive(false);
    this.scene.stop('UIScene');
    this.scene.start('TitleScene');
  }

  private showEnemyDamageFloatingText(payload: {
    x: number;
    y: number;
    damage: number;
    isBoss?: boolean;
  }): void {
    if (payload.damage <= 0) {
      return;
    }

    this.floatingTextManager?.showEnemyDamage(
      payload.x,
      payload.y,
      payload.damage,
      payload.isBoss === true,
    );
    AudioManager.play(this, 'enemy_hit', {
      autoMode: this.playtestSettings.autoMode,
    });
  }

  private getUpgradeSelectionContext(): UpgradeSelectionContext {
    return {
      hasWeapon: (weaponId: string) => this.weaponManager?.hasWeapon(weaponId) ?? false,
      getWeaponStat: (weaponId, stat) => this.weaponManager?.getWeaponStat(weaponId, stat),
      getPassiveLevel: (passiveId: string) => this.passiveManager?.getLevel(passiveId) ?? 0,
      isWeaponUpgradeLimitReached: (weaponId: string) => (
        this.weaponManager?.isWeaponUpgradeLimitReached(weaponId) ?? false
      ),
      hasWeaponOrEvolution: (weaponId: string) => (
        this.weaponManager?.hasWeaponOrEvolution(weaponId) ?? false
      ),
      isBaseWeaponEvolved: (weaponId: string) => (
        this.weaponManager?.isBaseWeaponEvolved(weaponId) ?? false
      ),
      getPlayerStat: (stat) => {
        switch (stat) {
          case 'moveSpeed':
            return this.playerStats?.moveSpeed ?? 0;
          case 'pickupRange':
            return this.playerStats?.pickupRange ?? 0;
          case 'maxHp':
            return this.playerHealth?.maxHp ?? this.playerStats?.maxHp ?? 0;
          default:
            return 0;
        }
      },
      getPlayerStatLimit: (stat) => {
        switch (stat) {
          case 'moveSpeed':
            return this.playerStats?.maxMoveSpeed ?? Infinity;
          case 'pickupRange':
            return this.playerStats?.maxPickupRange ?? Infinity;
          case 'maxHp':
            return this.playerStats?.maxHpLimit ?? Infinity;
          default:
            return Infinity;
        }
      },
    };
  }

  private getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext {
    return {
      weaponIds: this.weaponManager?.getWeaponIds() ?? [],
      getWeaponUpgradeTotal: (weaponId: string) => (
        this.weaponManager?.getWeaponUpgradeTotal(weaponId) ?? 0
      ),
      getPassiveLevel: (passiveId: string) => this.passiveManager?.getLevel(passiveId) ?? 0,
    };
  }

  private getEvolutionCandidateStats(): string {
    if (!this.weaponManager) {
      return '';
    }

    return EVOLUTION_RULES.map((rule) => {
      const weaponUpgradeTotal = this.weaponManager?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0;
      const passiveLevel = this.passiveManager?.getLevel(rule.requiredPassiveId) ?? 0;
      const hasBase = this.weaponManager?.hasWeapon(rule.baseWeaponId) ?? false;
      const hasEvolved = this.weaponManager?.hasWeapon(rule.evolvedWeaponId) ?? false;
      const eligible = hasBase
        && !hasEvolved
        && weaponUpgradeTotal >= rule.requiredWeaponUpgradeTotal
        && passiveLevel >= rule.requiredPassiveLevel;

      return [
        `${rule.baseWeaponId}->${rule.evolvedWeaponId}`,
        `weapon=${weaponUpgradeTotal}/${rule.requiredWeaponUpgradeTotal}`,
        `passive=${rule.requiredPassiveId}:${passiveLevel}/${rule.requiredPassiveLevel}`,
        `base=${hasBase ? 'true' : 'false'}`,
        `evolved=${hasEvolved ? 'true' : 'false'}`,
        `eligible=${eligible ? 'true' : 'false'}`,
      ].join(';');
    }).join('|');
  }

  private syncPassiveEffects(): void {
    const effects = this.passiveManager?.getEffects();

    if (!effects) {
      return;
    }

    this.weaponManager?.setPassiveModifiers({
      damageMultiplier: effects.damageMultiplier,
      cooldownMultiplier: effects.cooldownMultiplier,
      projectileSpeedMultiplier: effects.projectileSpeedMultiplier,
    });
    this.treasureManager?.setBonusDropChance(effects.treasureDropBonus);
  }

  private updatePlayerPickupRangeFromStats(): void {
    this.playerPickupRange = (this.playerStats?.pickupRange ?? 0) * 48;

    if (this.gameplayContext) {
      this.gameplayContext.playerPickupRange = this.playerPickupRange;
    }
  }

  private getGameplayTimeScale(): number {
    if (!this.playtestSettings.autoMode || !this.playtestSettings.fastMode) {
      return 1;
    }

    return this.playtestSettings.autoTimeScale;
  }

  private cleanup(): void {
    this.unsubscribeLevelUp?.();
    this.unsubscribeLevelUp = undefined;
    this.unsubscribeEnemyKilled?.();
    this.unsubscribeEnemyKilled = undefined;
    this.uiScene?.events.off('UpgradeSelected', this.handleUpgradeSelected, this);
    this.uiScene?.events.off('PauseResume', this.resumeFromPauseMenu, this);
    this.uiScene?.events.off('PauseRestart', this.restartFromPauseMenu, this);
    this.uiScene?.events.off('PauseBackToTitle', this.backToTitleFromPauseMenu, this);
    this.events.off('EnemyDamagedFloatingText', this.showEnemyDamageFloatingText, this);
    this.input.keyboard?.off('keydown-ESC', this.handleEscapePressed, this);
    this.scale.off('resize', this.handleResize, this);
    this.uiScene = undefined;
    this.gameplayContext?.enemyFlow.clear();
    this.gameplayContext?.bossController.clear();
    this.clearGameplayResources();
    this.destroyEnemies();
    this.clearCenterMessages();
    this.playerHitRange?.destroy();
    this.playerHitRange = undefined;
    this.spawnDirector = undefined;
    this.bossAttackController?.destroy();
    this.bossAttackController = undefined;
    this.endlessManager?.reset();
    this.endlessManager = undefined;
    this.bossSpawnDirector = undefined;
    this.enemyFactory = undefined;
    this.virtualJoystick?.destroy();
    this.virtualJoystick = undefined;
    this.orientationOverlay?.destroy(true);
    this.orientationOverlay = undefined;
    this.floatingTextManager?.destroy();
    this.floatingTextManager = undefined;
    this.evolutionManager = undefined;
    this.gameplayContext = undefined;
  }

  private destroyEnemies(): void {
    for (const enemy of this.enemies) {
      if (!enemy.body.active) {
        continue;
      }

      enemy.destroy();
    }

    this.enemies = [];
  }

  private clearCenterMessages(): void {
    for (const message of this.centerMessages) {
      this.tweens.killTweensOf(message);

      if (message.active) {
        message.destroy();
      }
    }

    this.centerMessages.clear();
  }

  private clearGameplayResources(): void {
    this.contactDamageCooldowns.clear();
    this.weaponManager?.destroy();
    this.weaponManager = undefined;
    this.pickupManager?.destroy();
    this.pickupManager = undefined;
    this.treasureManager?.destroy();
    this.treasureManager = undefined;
    this.passiveManager = undefined;
    this.upgradeFlow = undefined;
  }
}
