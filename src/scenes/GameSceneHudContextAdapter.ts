import type Phaser from 'phaser';

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
import type { WeaponManager } from '../weapon/WeaponManager';
import type { GameSceneHudEmitterContext } from './GameSceneHudEmitter';

export interface GameSceneHudScenePort {
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
  timeManager: {
    gameTimeSeconds: number;
  };
  worldWidth: number;
  worldHeight: number;
  getEvolutionCandidateStats(): string;
}

export class GameSceneHudContextAdapter {
  build(scene: Phaser.Scene & GameSceneHudScenePort): GameSceneHudEmitterContext {
    return {
      scene,
      currentStage: scene.currentStage,
      currentMap: scene.currentMap,
      enemies: scene.enemies,
      player: scene.player,
      gameplayContext: scene.gameplayContext,
      playerHealth: scene.playerHealth,
      playerStats: scene.playerStats,
      levelManager: scene.levelManager,
      expManager: scene.expManager,
      weaponManager: scene.weaponManager,
      passiveManager: scene.passiveManager,
      evolutionManager: scene.evolutionManager,
      runState: scene.runState,
      strategyTacticsPanelEnabledForRun: scene.strategyTacticsPanelEnabledForRun,
      playtestSettings: scene.playtestSettings,
      timeSeconds: scene.timeManager.gameTimeSeconds,
      evolutionCandidateStats: scene.getEvolutionCandidateStats(),
      worldWidth: scene.worldWidth,
      worldHeight: scene.worldHeight,
    };
  }
}
