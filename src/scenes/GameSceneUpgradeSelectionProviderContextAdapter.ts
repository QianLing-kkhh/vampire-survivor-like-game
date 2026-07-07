import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PickupManager } from '../pickup/PickupManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { UpgradeSelectionProviderContext } from '../progression/UpgradeSelectionContextProvider';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneUpgradeSelectionProviderScenePort {
  gameplayContext?: GameplayContext;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  player?: PlayerController;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  enemies: Enemy[];
  pickupManager?: PickupManager;
  treasureManager?: TreasureManager;
}

export class GameSceneUpgradeSelectionProviderContextAdapter {
  build(
    scene: GameSceneUpgradeSelectionProviderScenePort,
  ): UpgradeSelectionProviderContext {
    return {
      gameplayContext: scene.gameplayContext,
      weaponManager: scene.weaponManager,
      passiveManager: scene.passiveManager,
      player: scene.player,
      playerStats: scene.playerStats,
      playerHealth: scene.playerHealth,
      enemies: scene.enemies,
      pickupManager: scene.pickupManager,
      treasureManager: scene.treasureManager,
    };
  }
}
