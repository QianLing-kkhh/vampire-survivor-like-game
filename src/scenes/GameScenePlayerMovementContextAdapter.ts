import type { AutoPlayer } from '../auto/AutoPlayer';
import type { BossAttackController } from '../boss/BossAttackController';
import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { LevelManager } from '../progression/LevelManager';
import type { PickupManager } from '../pickup/PickupManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerMovementUpdateContext } from '../player/PlayerMovementUpdater';
import type { PlayerStats } from '../player/PlayerStats';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { VirtualJoystick } from '../input/VirtualJoystick';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameScenePlayerMovementScenePort {
  autoPlayer: AutoPlayer;
  player?: PlayerController;
  enemies: Enemy[];
  pickupManager?: PickupManager;
  treasureManager?: TreasureManager;
  playerPickupRange: number;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  weaponManager?: WeaponManager;
  gameplayContext?: GameplayContext;
  bossAttackController?: BossAttackController;
  virtualJoystick?: VirtualJoystick;
  worldWidth: number;
  worldHeight: number;
}

export interface GameScenePlayerMovementConstants {
  playerHitRadiusPx: number;
}

export class GameScenePlayerMovementContextAdapter {
  build(
    scene: GameScenePlayerMovementScenePort,
    deltaMs: number,
    constants: GameScenePlayerMovementConstants,
  ): PlayerMovementUpdateContext {
    return {
      autoPlayer: scene.autoPlayer,
      player: scene.player,
      enemies: scene.enemies,
      pickupManager: scene.pickupManager,
      treasureManager: scene.treasureManager,
      playerPickupRange: scene.playerPickupRange,
      playerHitRadiusPx: constants.playerHitRadiusPx,
      playerStats: scene.playerStats,
      playerHealth: scene.playerHealth,
      levelManager: scene.levelManager,
      weaponManager: scene.weaponManager,
      gameplayContext: scene.gameplayContext,
      bossAttackController: scene.bossAttackController,
      virtualJoystick: scene.virtualJoystick,
      deltaMs,
      worldBounds: {
        width: scene.worldWidth,
        height: scene.worldHeight,
      },
    };
  }
}
