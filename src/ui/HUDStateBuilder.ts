import { Enemy } from '../enemy/Enemy';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { CharacterRuntime } from '../character/CharacterRuntime';
import { MapDefinition } from '../map/MapDefinition';
import { PassiveManager } from '../passive/PassiveManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { ExpManager } from '../progression/ExpManager';
import { LevelManager } from '../progression/LevelManager';
import { RunState } from '../run/RunState';
import { RelicManager } from '../relic/RelicManager';
import { PlaytestSettingsState } from '../settings/PlaytestSettings';
import { StageDefinition } from '../stage/StageDefinition';
import { RuntimeStrategyState } from '../strategy/runtime/RuntimeStrategyState';
import { WeaponManager } from '../weapon/WeaponManager';
import { HUDState } from './HUD';

export interface HUDStateBuildInput {
  currentStage: StageDefinition;
  currentMap: MapDefinition;
  enemies: Enemy[];
  player?: PlayerController;
  characterRuntime?: CharacterRuntime;
  playerHealth?: PlayerHealth;
  playerStats?: PlayerStats;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  relicManager?: RelicManager;
  evolutionManager?: EvolutionManager;
  runState: RunState;
  runtimeStrategyState?: RuntimeStrategyState;
  playtestSettings: PlaytestSettingsState;
  timeSeconds: number;
  nowMs: number;
  hudMessage?: string;
  evolutionCandidateStats?: string;
  worldWidth: number;
  worldHeight: number;
}

export class HUDStateBuilder {
  build(input: HUDStateBuildInput): HUDState | undefined {
    const {
      playerHealth,
      levelManager,
      expManager,
      playerStats,
    } = input;

    if (!playerHealth || !levelManager || !expManager || !playerStats) {
      return undefined;
    }

    return {
      currentHp: playerHealth.currentHp,
      maxHp: playerHealth.maxHp,
      level: levelManager.currentLevel,
      currentExp: expManager.currentExp,
      requiredExp: levelManager.requiredExp,
      timeSeconds: input.timeSeconds,
      targetTimeSeconds: input.currentStage.finalBossSpawnTimeSeconds,
      score: input.runState.score,
      relicCount: input.relicManager?.getRelicIds().length ?? 0,
      weaponIds: input.weaponManager?.getWeaponIds() ?? [],
      characterHudInfo: input.characterRuntime ? {
        characterId: input.characterRuntime.getCharacterId(),
        skinId: input.characterRuntime.getSkinId(),
        damageReactionCooldown: input.characterRuntime.getDamageReactionCooldownStatus(input.nowMs),
      } : undefined,
      weaponHudInfo: input.weaponManager?.getWeaponHudInfo() ?? [],
      weaponBuildHudInfo: input.weaponManager?.getWeaponBuildHudInfo({
        getPassiveLevel: (passiveId) => input.passiveManager?.getPassiveLevel(passiveId) ?? 0,
        getPassiveName: (passiveId) => input.passiveManager?.getPassiveName(passiveId) ?? passiveId,
        getPassiveMaxLevel: (passiveId) => input.passiveManager?.getPassiveMaxLevel(passiveId) ?? 5,
        getRequiredPassiveForWeapon: (weaponId) => (
          input.evolutionManager?.getRequiredPassiveForWeapon(weaponId)
        ),
      }) ?? [],
      passiveItems: input.passiveManager?.getPassiveLevels() ?? [],
      autoMode: input.playtestSettings.autoMovement
        || input.playtestSettings.autoUpgrade
        || input.playtestSettings.autoOpenTreasure,
      evolutionCandidateStats: input.evolutionCandidateStats,
      moveSpeed: playerStats.moveSpeed,
      pickupRange: playerStats.pickupRange,
      playerMaxHp: playerHealth.maxHp,
      worldWidth: input.worldWidth,
      worldHeight: input.worldHeight,
      mapMechanics: input.currentMap.mechanics ?? [],
      playerPosition: input.player
        ? { x: input.player.body.x, y: input.player.body.y }
        : { x: 0, y: 0 },
      enemyPositions: this.getMinimapEnemyPositions(input.enemies, input.currentStage.finalBossId),
      message: input.hudMessage,
      liveStrategy: this.buildLiveStrategyState(input),
      endlessMode: input.playtestSettings.endlessMode,
      endlessStarted: input.runState.endlessStarted,
      endlessTimeSeconds: input.runState.endlessSurvivalTime,
    };
  }

  private buildLiveStrategyState(input: HUDStateBuildInput): HUDState['liveStrategy'] {
    const metadata = input.runState.getRunMetadata();

    if (
      metadata.controlMode !== 'autoStrategy'
      || metadata.strategyControlType !== 'live'
      || metadata.allowRuntimeStrategyEdit !== true
      || !input.runtimeStrategyState
    ) {
      return undefined;
    }

    const profile = input.runtimeStrategyState.getProfile();
    const summary = input.runtimeStrategyState.getSummary();

    return {
      enabled: true,
      movement: {
        survivalBias: profile.movement.survivalBias,
        combatBias: profile.movement.combatBias,
        farmBias: profile.movement.farmBias,
        treasureBias: profile.movement.treasureBias,
        riskTolerance: profile.movement.riskTolerance,
        loopBias: profile.movement.loopBias,
      },
      editCount: summary.editCount,
      runtimeProfileHash: summary.runtimeProfileHash,
    };
  }

  private getMinimapEnemyPositions(
    enemies: Enemy[],
    finalBossId: string,
  ): HUDState['enemyPositions'] {
    const activeEnemies = enemies.filter((enemy) => !enemy.isDead);
    const bossEnemies = activeEnemies.filter((enemy) => this.isMinimapBossEnemy(enemy, finalBossId));
    const normalEnemies = activeEnemies
      .filter((enemy) => !this.isMinimapBossEnemy(enemy, finalBossId))
      .slice(0, 50);

    return [
      ...normalEnemies.map((enemy) => ({
        x: enemy.body.x,
        y: enemy.body.y,
      })),
      ...bossEnemies.map((enemy) => ({
        x: enemy.body.x,
        y: enemy.body.y,
        bossLike: true,
        finalBoss: enemy.id === finalBossId,
      })),
    ];
  }

  private isMinimapBossEnemy(enemy: Enemy, finalBossId: string): boolean {
    return enemy.id === finalBossId
      || enemy.id.endsWith('_boss')
      || enemy.id.startsWith('endless_');
  }
}
