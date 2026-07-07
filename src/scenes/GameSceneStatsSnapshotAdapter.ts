import type { ExpManager } from '../progression/ExpManager';
import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { GameSceneStatsSnapshotBuilder } from './GameSceneStatsSnapshotBuilder';
import type { LevelManager } from '../progression/LevelManager';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { RunState } from '../run/RunState';
import type { RunStats } from '../stats/RunStats';
import type { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import type { UpgradeFlow } from '../progression/UpgradeFlow';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneStatsSnapshotScenePort {
  statsSnapshotBuilder: GameSceneStatsSnapshotBuilder;
  timeManager: { gameTimeSeconds: number };
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

export class GameSceneStatsSnapshotAdapter {
  build(scene: GameSceneStatsSnapshotScenePort): StatsBuildSnapshot {
    return scene.statsSnapshotBuilder.build({
      timeSeconds: scene.timeManager.gameTimeSeconds,
      runState: scene.runState,
      runStats: scene.runStats,
      playtestSettings: scene.playtestSettings,
      player: scene.player,
      playerHealth: scene.playerHealth,
      playerStats: scene.playerStats,
      levelManager: scene.levelManager,
      expManager: scene.expManager,
      weaponManager: scene.weaponManager,
      passiveManager: scene.passiveManager,
      evolutionManager: scene.evolutionManager,
      gameplayContext: scene.gameplayContext,
      upgradeFlow: scene.upgradeFlow,
    });
  }
}
