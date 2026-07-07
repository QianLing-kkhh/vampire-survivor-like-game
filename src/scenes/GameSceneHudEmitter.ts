import Phaser from 'phaser';

import type { Enemy } from '../enemy/Enemy';
import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { MapDefinition } from '../map/MapDefinition';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { ExpManager } from '../progression/ExpManager';
import type { LevelManager } from '../progression/LevelManager';
import type { RunState } from '../run/RunState';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { StageDefinition } from '../stage/StageDefinition';
import { HUDStateBuilder } from '../ui/HUDStateBuilder';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneHudEmitterContext {
  scene: Phaser.Scene;
  currentStage: StageDefinition;
  currentMap: MapDefinition;
  enemies: Enemy[];
  player?: PlayerController;
  gameplayContext?: GameplayContext;
  playerHealth?: PlayerHealth;
  playerStats?: PlayerStats;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  evolutionManager?: EvolutionManager;
  runState: RunState;
  strategyTacticsPanelEnabledForRun: boolean;
  playtestSettings: PlaytestSettingsState;
  timeSeconds: number;
  evolutionCandidateStats: string;
  worldWidth: number;
  worldHeight: number;
}

export class GameSceneHudEmitter {
  private readonly hudStateBuilder = new HUDStateBuilder();

  emit(context: GameSceneHudEmitterContext): void {
    const cameraView = context.scene.cameras.main.worldView;
    const state = this.hudStateBuilder.build({
      currentStage: context.currentStage,
      currentMap: context.currentMap,
      enemies: context.enemies,
      player: context.player,
      characterRuntime: context.gameplayContext?.characterRuntime,
      playerHealth: context.playerHealth,
      playerStats: context.playerStats,
      levelManager: context.levelManager,
      expManager: context.expManager,
      weaponManager: context.weaponManager,
      passiveManager: context.passiveManager,
      relicManager: context.gameplayContext?.relicManager,
      evolutionManager: context.evolutionManager,
      runState: context.runState,
      runtimeStrategyState: context.gameplayContext?.runtimeStrategyState,
      strategyTacticsPanelEnabledForRun: context.strategyTacticsPanelEnabledForRun,
      playtestSettings: context.playtestSettings,
      timeSeconds: context.timeSeconds,
      nowMs: context.scene.time.now,
      hudMessage: context.gameplayContext?.endlessBossManager.getHudMessage(
        context.timeSeconds,
      ) ?? context.gameplayContext?.bossController.getHUDMessage(),
      evolutionCandidateStats: context.evolutionCandidateStats,
      worldWidth: context.worldWidth,
      worldHeight: context.worldHeight,
      cameraView: {
        x: cameraView.x,
        y: cameraView.y,
        width: cameraView.width,
        height: cameraView.height,
      },
    });

    if (!state) {
      return;
    }

    context.scene.scene.get('UIScene').events.emit('UpdateHUD', state);
  }
}
