import Phaser from 'phaser';

import { AutoPlayer } from '../auto/AutoPlayer';
import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { BossFactory } from '../boss/BossFactory';
import { BossSpawnDirector } from '../boss/BossSpawnDirector';
import { DamageCalculator } from '../combat/DamageCalculator';
import { EventBus } from '../core/EventBus';
import { TimeManager } from '../core/TimeManager';
import characters from '../data/characters.json';
import enemies from '../data/enemies.json';
import passives from '../data/passives.json';
import waves from '../data/waves.json';
import { Enemy, GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyMovement } from '../enemy/EnemyMovement';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { PlaytestLog } from '../logging/PlaytestLog';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { PickupManager } from '../pickup/PickupManager';
import { TreasureManager } from '../pickup/TreasureManager';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import { PlaytestSettings, PlaytestSettingsState } from '../settings/PlaytestSettings';
import { SpawnDirector } from '../spawn/SpawnDirector';
import { RunStats } from '../stats/RunStats';
import weapons from '../data/weapons.json';
import upgrades from '../data/upgrades.json';
import { WeaponFactory } from '../weapon/WeaponFactory';
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
  private static readonly LEVEL_UP_HEAL_LOST_HP_RATIO = 0.2;

  private eventBus = new EventBus<GameEventMap>();
  private readonly autoPlayer = new AutoPlayer();
  private readonly autoUpgradeSelector = new AutoUpgradeSelector();
  private readonly damageCalculator = new DamageCalculator();
  private playtestSettings: PlaytestSettingsState = PlaytestSettings.get();
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
  private spawnDirector?: SpawnDirector;
  private bossSpawnDirector?: BossSpawnDirector;
  private enemyFactory?: EnemyFactory;
  private readonly timeManager = new TimeManager();
  private readonly contactDamageCooldowns = new Map<Enemy, number>();
  private readonly centerMessages = new Set<Phaser.GameObjects.Text>();
  private unsubscribeLevelUp?: () => void;
  private unsubscribeEnemyKilled?: () => void;
  private uiScene?: Phaser.Scene;
  private playerPickupRange = 0;
  private killCount = 0;
  private treasureDropCount = 0;
  private treasureOpenCount = 0;
  private levelUpUpgradeCount = 0;
  private chestUpgradeCount = 0;
  private duplicateOrInvalidUpgradeCount = 0;
  private upgradePath: string[] = [];
  private treasureUpgradePath: string[] = [];
  private evolutionPath: string[] = [];
  private evolutionTime: number | null = null;
  private runId = PlaytestLog.createRunId();
  private runStats = new RunStats();
  private isGameplayPaused = false;
  private isGameOver = false;
  private finalBossWarningShown = false;
  private finalBossSpawned = false;
  private finalBossDefeated = false;
  private finalBossSpawnTime = 0;
  private finalBossKillTime = 0;
  private bossPhaseDamageTaken = 0;
  private bossPhaseLowestHp = 0;
  private bossPhaseKills = 0;

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
    this.killCount = 0;
    this.treasureDropCount = 0;
    this.treasureOpenCount = 0;
    this.levelUpUpgradeCount = 0;
    this.chestUpgradeCount = 0;
    this.duplicateOrInvalidUpgradeCount = 0;
    this.upgradePath = [];
    this.treasureUpgradePath = [];
    this.evolutionPath = [];
    this.evolutionTime = null;
    this.runId = PlaytestLog.createRunId();
    this.player = undefined;
    this.playerHitRange = undefined;
    this.playerHealth = undefined;
    this.expManager = undefined;
    this.levelManager = undefined;
    this.playerStats = undefined;
    this.upgradeApplier = undefined;
    this.isGameplayPaused = false;
    this.isGameOver = false;
    this.spawnDirector = undefined;
    this.bossSpawnDirector = undefined;
    this.enemyFactory = undefined;
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
    this.bossPhaseDamageTaken = 0;
    this.bossPhaseLowestHp = 0;
    this.bossPhaseKills = 0;

    const playerStats = PlayerStats.fromConfig(characters.default);
    this.playerStats = playerStats;
    this.runStats = new RunStats(playerStats.maxHp);
    const weaponFactory = new WeaponFactory(this, weapons);
    this.weaponManager = new WeaponManager(this.runStats, weaponFactory);
    this.passiveManager = new PassiveManager(passives);
    this.playerHealth = new PlayerHealth(playerStats.maxHp);
    this.upgradeApplier = new UpgradeApplier(
      playerStats,
      this.playerHealth,
      this.weaponManager,
      weaponFactory,
      this.runStats,
      this.passiveManager,
    );
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.playerPickupRange = playerStats.pickupRange * 48;
    this.physics.world.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, GameScene.WORLD_WIDTH, GameScene.WORLD_HEIGHT);
    new WorldRenderer(this).render();
    this.scene.launch('UIScene');

    this.player = new PlayerController(this, playerStats, centerX, centerY);
    this.playerHitRange = this.add.circle(
      this.player.body.x,
      this.player.body.y,
      GameScene.PLAYER_HIT_RADIUS,
      0xffffff,
      0.08,
    );
    this.playerHitRange.setStrokeStyle(1, 0xffffff, 0.45);
    this.playerHitRange.setDepth(20);
    this.cameras.main.startFollow(this.player.body, true, 0.08, 0.08);
    this.expManager = new ExpManager(this.eventBus);
    this.levelManager = new LevelManager(this.expManager, this.eventBus);
    const upgradeSelector = new UpgradeSelector([...upgrades, ...passives]);
    this.evolutionManager = new EvolutionManager(EVOLUTION_RULES);
    const uiScene = this.scene.get('UIScene');
    this.uiScene = uiScene;

    this.unsubscribeLevelUp = this.eventBus.subscribe('LevelUp', (event) => {
      console.log('LevelUp', event);
      this.playerHealth?.healLostHpRatio(GameScene.LEVEL_UP_HEAL_LOST_HP_RATIO);
      this.emitHUDState();
      this.isGameplayPaused = true;
      const selectedOptions = upgradeSelector
        .selectOptions(3, this.getUpgradeSelectionContext())
        .map((option) => ({
          ...option,
          preview: this.upgradeApplier?.getUpgradePreview(option),
        }));
      const autoSelectedOption = this.playtestSettings.autoMode
        ? this.autoUpgradeSelector.select(
          selectedOptions,
          this.getAutoUpgradeSelectionContext(),
        )
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
    this.unsubscribeEnemyKilled = this.eventBus.subscribe('EnemyKilled', (event) => {
      this.killCount += 1;
      if (this.finalBossSpawned) {
        this.bossPhaseKills += 1;
      }

      if (isEnemyKilledEvent(event) && event.isBoss) {
        this.showCenterMessage('Boss Defeated!');

        if (event.enemyId === GameScene.FINAL_BOSS_ID) {
          this.finalBossKillTime = this.timeManager.gameTimeSeconds;
          this.finalBossDefeated = true;
        }
      }
    });
    uiScene.events.on('UpgradeSelected', this.handleUpgradeSelected, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.pickupManager = new PickupManager(this, this.eventBus, this.expManager);
    this.treasureManager = new TreasureManager(
      this,
      this.eventBus,
      upgradeSelector,
      this.upgradeApplier,
      this.getUpgradeSelectionContext(),
      this.weaponManager,
      (option) => {
        const treasureUpgradeId = `chest:${option.id}`;
        this.chestUpgradeCount += 1;
        this.upgradePath.push(treasureUpgradeId);
        this.treasureUpgradePath.push(treasureUpgradeId);
        this.syncPassiveEffects();
        this.playerPickupRange = (this.playerStats?.pickupRange ?? 0) * 48;
      },
      () => {
        this.treasureDropCount += 1;
      },
      () => {
        this.treasureOpenCount += 1;
      },
      this.evolutionManager,
      (result) => {
        const evolutionId = `evolve:${result.baseWeaponId}->${result.evolvedWeaponId}`;
        this.evolutionTime ??= this.timeManager.gameTimeSeconds;
        this.chestUpgradeCount += 1;
        this.upgradePath.push(evolutionId);
        this.evolutionPath.push(evolutionId);
        this.syncPassiveEffects();
      },
      () => {
        this.duplicateOrInvalidUpgradeCount += 1;
      },
    );

    const enemyFactory = new EnemyFactory(this, enemies);
    this.enemyFactory = enemyFactory;
    const bossFactory = new BossFactory(this, enemies);

    this.spawnDirector = new SpawnDirector(
      waves,
      enemyFactory,
      () => this.player?.body ?? { x: centerX, y: centerY },
      () => ({ width: this.scale.width, height: this.scale.height }),
      (enemy) => {
        enemy.setEventBus(this.eventBus);
        this.enemies.push(enemy);
      },
    );

    this.bossSpawnDirector = new BossSpawnDirector(
      bossFactory,
      () => this.player?.body ?? { x: centerX, y: centerY },
      () => ({
        width: GameScene.WORLD_WIDTH,
        height: GameScene.WORLD_HEIGHT,
      }),
      (boss) => {
        boss.setEventBus(this.eventBus);
        this.enemies.push(boss);
        this.showCenterMessage('Boss Appears!');
      },
    );

    this.weaponManager.addWeapon(weaponFactory.create(GameScene.INITIAL_WEAPON_ID));
    this.syncPassiveEffects();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) {
      return;
    }

    if (this.isGameplayPaused) {
      this.emitHUDState();
      return;
    }

    const effectiveDelta = delta * this.getGameplayTimeScale();

    this.timeManager.update(effectiveDelta);
    this.passiveManager?.update(effectiveDelta, this.playerHealth);
    this.updateFinalBossEvent();

    if (this.playtestSettings.autoMode) {
      this.updateAutoPlayer(effectiveDelta);
    } else {
      this.player?.update(effectiveDelta);
    }
    this.updatePlayerHitRange();

    if (!this.player) {
      return;
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.isDead);
    this.spawnDirector?.update(this.timeManager.gameTimeSeconds, effectiveDelta);
    this.bossSpawnDirector?.update(this.timeManager.gameTimeSeconds);

    for (const enemy of this.enemies) {
      this.enemyMovement.moveToward(enemy, this.player.body, effectiveDelta);
    }

    this.updateContactDamage(effectiveDelta);

    if (this.playerHealth?.isDead) {
      this.endGame('gameOver');
      return;
    }

    if (this.finalBossDefeated) {
      this.endGame('victory');
      return;
    }

    this.weaponManager?.update(this.player, this.enemies, effectiveDelta);

    if (this.finalBossDefeated) {
      this.endGame('victory');
      return;
    }

    this.pickupManager?.update(this.player.body, this.playerPickupRange);
    this.treasureManager?.update(this.player.body, this.playerPickupRange);
    this.emitHUDState();
  }

  getPlayerHealth(): PlayerHealth | undefined {
    return this.playerHealth;
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
    this.bossPhaseLowestHp = this.playerHealth?.currentHp ?? 0;
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
    if (this.finalBossSpawned && !this.finalBossDefeated) {
      return 'Defeat the Boss';
    }

    if (this.finalBossWarningShown && !this.finalBossSpawned) {
      return 'Boss Coming';
    }

    return undefined;
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
      if (enemy.isDead || this.contactDamageCooldowns.has(enemy)) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.body.x,
        this.player.body.y,
        enemy.body.x,
        enemy.body.y,
      );

      if (distance > GameScene.PLAYER_HIT_RADIUS) {
        continue;
      }

      const hpBeforeDamage = this.playerHealth.currentHp;

      const actualDamage = this.playerHealth.takeDamage(enemy.damage);
      this.contactDamageCooldowns.set(enemy, GameScene.CONTACT_DAMAGE_COOLDOWN_MS);

      if (actualDamage > 0) {
        this.runStats.recordDamageTaken(actualDamage, this.playerHealth.currentHp);

        if (this.finalBossSpawned) {
          this.bossPhaseDamageTaken += actualDamage;
          this.bossPhaseLowestHp = this.bossPhaseLowestHp === 0
            ? this.playerHealth.currentHp
            : Math.min(this.bossPhaseLowestHp, this.playerHealth.currentHp);
        }
      }

      if (this.playerHealth.currentHp < hpBeforeDamage) {
        this.triggerDamageReaction();
      }
    }
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
      weaponContext: this.weaponManager?.getAutoWeaponContext(),
      worldBounds: {
        width: GameScene.WORLD_WIDTH,
        height: GameScene.WORLD_HEIGHT,
      },
    });

    if (direction.lengthSq() === 0) {
      return;
    }

    const distance = this.playerStats.moveSpeed * (deltaMs / 1000);
    const radius = this.player.body.radius;

    this.player.body.x = Phaser.Math.Clamp(
      this.player.body.x + direction.x * distance,
      radius,
      GameScene.WORLD_WIDTH - radius,
    );
    this.player.body.y = Phaser.Math.Clamp(
      this.player.body.y + direction.y * distance,
      radius,
      GameScene.WORLD_HEIGHT - radius,
    );
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
    this.emitHUDState();
    const weaponIds = this.weaponManager?.getWeaponIds() ?? [];
    const passiveItems = this.passiveManager?.getPassiveLevels() ?? [];
    const weaponDamageStats = this.weaponManager?.getWeaponDamageStats() ?? [];
    const runStatsSummary = this.runStats.getSummary();
    const finalLevel = this.levelManager?.currentLevel ?? 1;
    const finalExp = this.expManager?.totalExp ?? 0;
    const survivalTime = this.timeManager.gameTimeSeconds;
    const bossFightDuration = this.finalBossSpawned
      ? Math.max(
        0,
        (this.finalBossDefeated ? this.finalBossKillTime : survivalTime)
          - this.finalBossSpawnTime,
      )
      : 0;
    const evolutionCandidateStats = this.getEvolutionCandidateStats();
    const postEvolutionDuration = this.evolutionTime === null
      ? 0
      : Math.max(0, survivalTime - this.evolutionTime);
    const totalUpgradeCount = this.levelUpUpgradeCount + this.chestUpgradeCount;
    const playtestCsv = PlaytestLog.createCsv({
      runId: this.runId,
      timestamp: new Date().toISOString(),
      autoMode: this.playtestSettings.autoMode,
      fastMode: this.playtestSettings.fastMode,
      timeScale: this.getGameplayTimeScale(),
      upgradeSelectionMode: this.autoUpgradeSelector.mode,
      resultType,
      survivalTime,
      finalLevel,
      finalExp,
      killCount: this.killCount,
      treasureDropCount: this.treasureDropCount,
      treasureOpenCount: this.treasureOpenCount,
      treasureUpgradePath: this.treasureUpgradePath,
      evolutionPath: this.evolutionPath,
      evolutionCandidateStats,
      evolutionTime: this.evolutionTime,
      postEvolutionDuration,
      bossSpawned: this.finalBossSpawned,
      bossKilled: this.finalBossDefeated,
      bossSpawnTime: this.finalBossSpawnTime,
      bossKillTime: this.finalBossKillTime,
      bossFightDuration,
      bossPhaseDamageTaken: this.bossPhaseDamageTaken,
      bossPhaseLowestHp: this.bossPhaseLowestHp,
      bossPhaseKills: this.bossPhaseKills,
      totalUpgradeCount,
      levelUpUpgradeCount: this.levelUpUpgradeCount,
      chestUpgradeCount: this.chestUpgradeCount,
      duplicateOrInvalidUpgradeCount: this.duplicateOrInvalidUpgradeCount,
      weaponIds,
      passiveItems,
      upgradePath: this.upgradePath,
      weaponDamageStats,
      damageTaken: runStatsSummary.damageTaken,
      lowestHp: runStatsSummary.lowestHp,
      weaponHitStats: runStatsSummary.weaponHitStats,
      weaponKillStats: runStatsSummary.weaponKillStats,
      upgradeCountStats: runStatsSummary.upgradeCountStats,
    });

    PlaytestLogBuffer.append(playtestCsv);

    const resultData = {
      resultType,
      survivalTime,
      finalLevel,
      finalExp,
      killCount: this.killCount,
      treasureDropCount: this.treasureDropCount,
      treasureOpenCount: this.treasureOpenCount,
      treasureUpgradePath: this.treasureUpgradePath,
      evolutionPath: this.evolutionPath,
      evolutionCandidateStats,
      evolutionTime: this.evolutionTime,
      postEvolutionDuration,
      bossSpawned: this.finalBossSpawned,
      bossKilled: this.finalBossDefeated,
      bossSpawnTime: this.finalBossSpawnTime,
      bossKillTime: this.finalBossKillTime,
      bossFightDuration,
      bossPhaseDamageTaken: this.bossPhaseDamageTaken,
      bossPhaseLowestHp: this.bossPhaseLowestHp,
      bossPhaseKills: this.bossPhaseKills,
      totalUpgradeCount,
      levelUpUpgradeCount: this.levelUpUpgradeCount,
      chestUpgradeCount: this.chestUpgradeCount,
      duplicateOrInvalidUpgradeCount: this.duplicateOrInvalidUpgradeCount,
      weaponIds,
      passiveItems,
      weaponDamageStats,
      damageTaken: runStatsSummary.damageTaken,
      lowestHp: runStatsSummary.lowestHp,
      weaponHitStats: runStatsSummary.weaponHitStats,
      weaponKillStats: runStatsSummary.weaponKillStats,
      upgradeCountStats: runStatsSummary.upgradeCountStats,
      runId: this.runId,
      autoMode: this.playtestSettings.autoMode,
      fastMode: this.playtestSettings.fastMode,
      timeScale: this.getGameplayTimeScale(),
      upgradeSelectionMode: this.autoUpgradeSelector.mode,
      upgradePath: this.upgradePath,
      playtestCsv,
      bufferedRunsCount: PlaytestLogBuffer.getCount(),
    };

    this.cleanup();
    this.scene.stop('UIScene');
    this.scene.start('ResultScene', resultData);
  }

  private handleUpgradeSelected(option: UpgradeOption): void {
    this.levelUpUpgradeCount += 1;
    this.upgradePath.push(option.id);
    const applied = this.upgradeApplier?.apply(option) ?? false;

    if (!applied) {
      this.duplicateOrInvalidUpgradeCount += 1;
    }

    this.syncPassiveEffects();
    this.playerPickupRange = (this.playerStats?.pickupRange ?? 0) * 48;
    this.isGameplayPaused = false;
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
    this.uiScene = undefined;
    this.clearGameplayResources();
    this.destroyEnemies();
    this.clearCenterMessages();
    this.playerHitRange?.destroy();
    this.playerHitRange = undefined;
    this.spawnDirector = undefined;
    this.bossSpawnDirector = undefined;
    this.enemyFactory = undefined;
    this.evolutionManager = undefined;
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
  }
}
