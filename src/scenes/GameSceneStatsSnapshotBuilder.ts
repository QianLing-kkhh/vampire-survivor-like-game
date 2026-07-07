import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { ExpManager } from '../progression/ExpManager';
import type { LevelManager } from '../progression/LevelManager';
import type { UpgradeFlow } from '../progression/UpgradeFlow';
import type { RunState } from '../run/RunState';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { RunStats } from '../stats/RunStats';
import { StatsBuildSnapshotBuilder } from '../ui/stats/StatsBuildSnapshotBuilder';
import type { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneStatsSnapshotContext {
  timeSeconds: number;
  runState: RunState;
  runStats: RunStats;
  playtestSettings: PlaytestSettingsState;
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  playerStats?: PlayerStats;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  evolutionManager?: EvolutionManager;
  gameplayContext?: GameplayContext;
  upgradeFlow?: UpgradeFlow;
}

export class GameSceneStatsSnapshotBuilder {
  private readonly statsBuildSnapshotBuilder = new StatsBuildSnapshotBuilder();

  build(context: GameSceneStatsSnapshotContext): StatsBuildSnapshot {
    const playerPosition = context.player?.getPositionLike();
    const playerSlowState = playerPosition && context.gameplayContext
      ? context.gameplayContext.mapMechanicRuntime.getPlayerSlowState(
        playerPosition.x,
        playerPosition.y,
      )
      : undefined;

    return this.statsBuildSnapshotBuilder.build({
      timeSeconds: context.timeSeconds,
      runState: context.runState,
      runStatsSummary: context.runStats.getSummary(),
      playtestSettings: context.playtestSettings,
      playerHealth: context.playerHealth,
      playerStats: context.playerStats,
      levelManager: context.levelManager,
      expManager: context.expManager,
      weaponManager: context.weaponManager,
      passiveManager: context.passiveManager,
      evolutionManager: context.evolutionManager,
      relicManager: context.gameplayContext?.relicManager,
      endlessRewardManager: context.upgradeFlow?.getEndlessRewardManager(),
      characterRuntime: context.gameplayContext?.characterRuntime,
      playerMapSlow: playerSlowState ? {
        slowed: playerSlowState.isSlowed,
        multiplier: playerSlowState.multiplier,
      } : undefined,
    });
  }
}
