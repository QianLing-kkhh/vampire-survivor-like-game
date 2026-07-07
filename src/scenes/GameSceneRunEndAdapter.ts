import type { AutoUpgradeSelector } from '../auto/AutoUpgradeSelector';
import type { ExpManager } from '../progression/ExpManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { LevelManager } from '../progression/LevelManager';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { RunEndFlowController } from '../run/RunEndFlowController';
import type { RunState } from '../run/RunState';
import type { RunStats } from '../stats/RunStats';
import type { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneRunEndScenePort {
  isGameOver: boolean;
  timeManager: { gameTimeSeconds: number };
  runEndFlowController: RunEndFlowController;
  runId: string;
  runState: RunState;
  runStats: RunStats;
  playtestSettings: PlaytestSettingsState;
  gameplayContext?: GameplayContext;
  runtimeTimeScale: PhaserRuntimeTimeScale;
  autoUpgradeSelector: Pick<AutoUpgradeSelector, 'mode'>;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  emitHUDState(): void;
  getEvolutionCandidateStats(): string;
  buildStatsBuildSnapshot(): StatsBuildSnapshot;
  cleanup(): void;
}

export class GameSceneRunEndAdapter {
  endGame(
    scene: GameSceneRunEndScenePort,
    resultType: 'gameOver' | 'victory',
  ): void {
    scene.isGameOver = true;
    scene.emitHUDState();
    const survivalTime = scene.timeManager.gameTimeSeconds;

    scene.runEndFlowController.endRun({
      runId: scene.runId,
      resultType,
      survivalTime,
      runState: scene.runState,
      runStats: scene.runStats,
      playtestSettings: scene.playtestSettings,
      gameplayContext: scene.gameplayContext,
      timeScale: scene.runtimeTimeScale.getEffective(
        scene.gameplayContext,
        scene.playtestSettings,
      ),
      upgradeSelectionMode: scene.autoUpgradeSelector.mode,
      evolutionCandidateStats: scene.getEvolutionCandidateStats(),
      weaponManager: scene.weaponManager,
      passiveManager: scene.passiveManager,
      relicManager: scene.gameplayContext?.relicManager,
      playerStats: scene.playerStats,
      playerHealth: scene.playerHealth,
      levelManager: scene.levelManager,
      expManager: scene.expManager,
      statsBuildSnapshot: scene.buildStatsBuildSnapshot(),
      cleanup: () => scene.cleanup(),
    });
  }
}
