import type { GameplayContext } from '../gameplay/GameplayContext';
import type { UpgradeSelectionModeLog } from '../logging/PlaytestLog';
import type { ExpManager } from '../progression/ExpManager';
import type { LevelManager } from '../progression/LevelManager';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { RelicManager } from '../relic/RelicManager';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { RunStats } from '../stats/RunStats';
import type { WeaponManager } from '../weapon/WeaponManager';

import type { RunResultBuildContext } from './RunResultBuilder';
import type { RunState } from './RunState';

export interface RunEndCoordinatorContext {
  runId: string;
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  runState: RunState;
  runStats: RunStats;
  playtestSettings: PlaytestSettingsState;
  gameplayContext?: GameplayContext;
  timeScale: number;
  upgradeSelectionMode: UpgradeSelectionModeLog;
  evolutionCandidateStats: string;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  relicManager?: RelicManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  expManager?: ExpManager;
}

export interface RunEndCoordinatorResult {
  runEndedEvent: {
    payload: {
      runId: string;
      resultType: 'gameOver' | 'victory';
      survivalTime: number;
      endlessSurvivalTime: number;
      killCount: number;
      treasureOpenCount: number;
      evolutionCount: number;
      endlessStarted: boolean;
      gameTimeSeconds: number;
    };
    meta: {
      gameTimeSeconds: number;
      runId: string;
    };
  };
  replayStopContext: {
    resultType: 'gameOver' | 'victory';
    survivalTime: number;
    endlessSurvivalTime: number;
    finalLevel: number;
    killCount: number;
  };
  unlockContext: {
    resultType: 'gameOver' | 'victory';
    characterId?: string;
    stageId?: string;
  };
  resultBuildContext: RunResultBuildContext;
}

export class RunEndCoordinator {
  prepare(context: RunEndCoordinatorContext): RunEndCoordinatorResult {
    const finalLevel = context.levelManager?.currentLevel ?? 1;

    return {
      runEndedEvent: {
        payload: {
          runId: context.runId,
          resultType: context.resultType,
          survivalTime: context.survivalTime,
          endlessSurvivalTime: context.runState.endlessSurvivalTime,
          killCount: context.runState.killCount,
          treasureOpenCount: context.runState.treasureOpenCount,
          evolutionCount: context.runState.evolutionPath.length,
          endlessStarted: context.runState.endlessStarted,
          gameTimeSeconds: context.survivalTime,
        },
        meta: {
          gameTimeSeconds: context.survivalTime,
          runId: context.runId,
        },
      },
      replayStopContext: {
        resultType: context.resultType,
        survivalTime: context.survivalTime,
        endlessSurvivalTime: context.runState.endlessSurvivalTime,
        finalLevel,
        killCount: context.runState.killCount,
      },
      unlockContext: {
        resultType: context.resultType,
        characterId: context.runState.characterId,
        stageId: context.runState.stageId,
      },
      resultBuildContext: {
        runId: context.runId,
        autoMode: context.playtestSettings.autoMovement
          || context.playtestSettings.autoUpgrade
          || context.playtestSettings.autoOpenTreasure,
        fastMode: context.playtestSettings.fastMode,
        timeScale: context.timeScale,
        upgradeSelectionMode: context.upgradeSelectionMode,
        resultType: context.resultType,
        survivalTime: context.survivalTime,
        evolutionCandidateStats: context.evolutionCandidateStats,
        runState: context.runState,
        runStats: context.runStats,
        weaponManager: context.weaponManager,
        passiveManager: context.passiveManager,
        relicManager: context.relicManager,
        runtimeStrategyState: context.gameplayContext?.runtimeStrategyState,
        playerStats: context.playerStats,
        playerHealth: context.playerHealth,
        levelManager: context.levelManager,
        expManager: context.expManager,
        bossState: {
          bossSpawned: context.gameplayContext?.bossController.hasBossSpawned() ?? false,
          bossKilled: context.gameplayContext?.bossController.hasBossBeenKilled() ?? false,
          bossSpawnTime: context.gameplayContext?.bossController.getBossSpawnTime() ?? 0,
          bossKillTime: context.gameplayContext?.bossController.getBossKillTime() ?? 0,
        },
      },
    };
  }
}
