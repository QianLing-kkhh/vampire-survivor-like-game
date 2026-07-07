import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { ProgressionEffectSyncContext } from '../progression/ProgressionEffectSynchronizer';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneProgressionEffectScenePort {
  gameplayContext?: GameplayContext;
  passiveManager?: PassiveManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  treasureManager?: TreasureManager;
  weaponManager?: WeaponManager;
}

export class GameSceneProgressionEffectContextAdapter {
  build(scene: GameSceneProgressionEffectScenePort): ProgressionEffectSyncContext {
    return {
      gameplayContext: scene.gameplayContext,
      passiveManager: scene.passiveManager,
      playerStats: scene.playerStats,
      playerHealth: scene.playerHealth,
      treasureManager: scene.treasureManager,
      weaponManager: scene.weaponManager,
    };
  }
}
