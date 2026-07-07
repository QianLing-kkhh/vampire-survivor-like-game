import type { AutoPlayer } from '../auto/AutoPlayer';
import { AutoPlayerContextBuilder } from '../auto/AutoPlayerContextBuilder';
import type { BossAttackController } from '../boss/BossAttackController';
import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { VirtualJoystick } from '../input/VirtualJoystick';
import type { PickupManager } from '../pickup/PickupManager';
import type { TreasureManager } from '../pickup/TreasureManager';
import { PhaserPlayerIntentAdapter } from '../phaser-adapter/PhaserPlayerIntentAdapter';
import type { LevelManager } from '../progression/LevelManager';
import type { WeaponManager } from '../weapon/WeaponManager';

import type { PlayerController } from './PlayerController';
import type { PlayerHealth } from './PlayerHealth';
import type { PlayerStats } from './PlayerStats';

export interface PlayerMovementUpdateContext {
  autoPlayer: AutoPlayer;
  player?: PlayerController;
  enemies: Enemy[];
  pickupManager?: PickupManager;
  treasureManager?: TreasureManager;
  playerPickupRange: number;
  playerHitRadiusPx: number;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  weaponManager?: WeaponManager;
  gameplayContext?: GameplayContext;
  bossAttackController?: BossAttackController;
  virtualJoystick?: VirtualJoystick;
  deltaMs: number;
  worldBounds: {
    width: number;
    height: number;
  };
}

export class PlayerMovementUpdater {
  private readonly autoPlayerContextBuilder = new AutoPlayerContextBuilder();

  updateAutoPlayer(context: PlayerMovementUpdateContext): void {
    if (!context.player || !context.playerStats) {
      return;
    }

    const autoPlayerContext = this.autoPlayerContextBuilder.build({
      player: context.player,
      enemies: context.enemies,
      pickupPositions: context.pickupManager?.getPickupSnapshots() ?? [],
      treasurePositions: context.treasureManager?.getChests() ?? [],
      playerPickupRange: context.playerPickupRange,
      playerHitRadiusPx: context.playerHitRadiusPx,
      playerStats: context.playerStats,
      playerHealth: context.playerHealth,
      levelManager: context.levelManager,
      weaponManager: context.weaponManager,
      gameplayContext: context.gameplayContext,
      bossAttackController: context.bossAttackController,
      deltaMs: context.deltaMs,
      worldBounds: context.worldBounds,
    });
    const intent = context.autoPlayer.getMoveIntent(autoPlayerContext);
    const direction = PhaserPlayerIntentAdapter.toVector(intent);

    context.player.moveWithDirection(direction, context.deltaMs, 'auto');
  }

  updatePlayerFromVirtualJoystick(context: PlayerMovementUpdateContext): void {
    if (!context.player || !context.playerStats || !context.virtualJoystick) {
      return;
    }

    const direction = context.virtualJoystick.getDirection();

    context.player.moveWithDirection(direction, context.deltaMs, 'virtualJoystick');
  }
}
