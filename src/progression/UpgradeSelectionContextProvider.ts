import type { AutoUpgradeSelectionContext } from '../auto/AutoUpgradeSelector';
import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PickupManager } from '../pickup/PickupManager';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { WeaponManager } from '../weapon/WeaponManager';

import { UpgradeSelectionContextBuilder } from './UpgradeSelectionContextBuilder';
import type { UpgradeSelectionContext } from './UpgradeSelector';

export interface UpgradeSelectionProviderContext {
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

export class UpgradeSelectionContextProvider {
  private readonly contextBuilder = new UpgradeSelectionContextBuilder();

  buildManualContext(context: UpgradeSelectionProviderContext): UpgradeSelectionContext {
    return this.contextBuilder.buildUpgradeSelectionContext({
      weaponManager: context.weaponManager,
      passiveManager: context.passiveManager,
      playerStats: context.playerStats,
      playerHealth: context.playerHealth,
    });
  }

  buildAutoContext(context: UpgradeSelectionProviderContext): AutoUpgradeSelectionContext {
    return this.contextBuilder.buildAutoUpgradeSelectionContext({
      gameplayContext: context.gameplayContext,
      weaponManager: context.weaponManager,
      passiveManager: context.passiveManager,
      playerStats: context.playerStats,
      playerHealth: context.playerHealth,
      playerPosition: context.player?.getPositionLike(),
      enemies: context.enemies,
      pickupPositions: context.pickupManager?.getPickupSnapshots() ?? [],
      treasureCount: context.treasureManager?.getActiveCount() ?? 0,
    });
  }
}
