import Phaser from 'phaser';

import type { BossAttackController } from '../boss/BossAttackController';
import type { BossSpawnDirector } from '../boss/BossSpawnDirector';
import type { Enemy } from '../enemy/Enemy';
import { destroyActiveEnemies } from '../enemy/EnemyCleanup';
import type { EnemyFactory } from '../enemy/EnemyFactory';
import type { EndlessBossManager } from '../endless/EndlessBossManager';
import type { EndlessManager } from '../endless/EndlessManager';
import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { FloatingTextManager } from '../ui/FloatingTextManager';
import type { GameSceneInputBindings, GameSceneInputBindingHandlers } from './GameSceneInputBindings';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PickupManager } from '../pickup/PickupManager';
import type { SpawnDirector } from '../spawn/SpawnDirector';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { UpgradeFlow } from '../progression/UpgradeFlow';
import type { VirtualJoystick } from '../input/VirtualJoystick';
import type { WeaponManager } from '../weapon/WeaponManager';

interface ClearableController {
  clear(): void;
}

interface DestroyableController {
  destroy(): void;
}

interface ResettableController {
  reset(): void;
}

interface MapVisibilityControllerPort {
  destroy(): void;
}

export interface GameSceneCleanupPort extends Phaser.Scene {
  gameplayContext?: GameplayContext;
  unsubscribeLevelUp?: () => void;
  unsubscribeEnemyKilled?: () => void;
  unsubscribeSettings?: () => void;
  inputBindings: GameSceneInputBindings;
  inputBindingHandlers: GameSceneInputBindingHandlers;
  uiScene?: Phaser.Scene;
  liveStrategyControlHandler: ResettableController;
  contactDamageCooldowns: Map<Enemy, number>;
  weaponManager?: WeaponManager;
  pickupManager?: PickupManager;
  treasureManager?: TreasureManager;
  passiveManager?: PassiveManager;
  upgradeFlow?: UpgradeFlow;
  enemies: Enemy[];
  centerMessageController: ClearableController;
  playerHitRangeAdapter: DestroyableController;
  spawnDirector?: SpawnDirector;
  bossAttackController?: BossAttackController;
  endlessManager?: EndlessManager;
  endlessBossManager?: EndlessBossManager;
  bossSpawnDirector?: BossSpawnDirector;
  enemyFactory?: EnemyFactory;
  virtualJoystick?: VirtualJoystick;
  orientationOverlayController: DestroyableController;
  floatingTextManager?: FloatingTextManager;
  enemyDamageFeedbackController: ClearableController;
  playerFeedbackController: ClearableController;
  treasureRewardFeedbackController: ClearableController;
  mapVisibilityController: MapVisibilityControllerPort;
  evolutionManager?: EvolutionManager;
}

export class GameSceneCleanupCoordinator {
  cleanup(scene: GameSceneCleanupPort): void {
    scene.gameplayContext?.gameEventBridge?.clear();
    scene.gameplayContext?.gameEventBus.clear();
    scene.unsubscribeLevelUp?.();
    scene.unsubscribeLevelUp = undefined;
    scene.unsubscribeEnemyKilled?.();
    scene.unsubscribeEnemyKilled = undefined;
    scene.unsubscribeSettings?.();
    scene.unsubscribeSettings = undefined;
    scene.inputBindings.unbind(
      scene,
      scene.uiScene,
      scene.inputBindingHandlers,
      scene,
    );
    scene.uiScene = undefined;
    scene.liveStrategyControlHandler.reset();
    scene.gameplayContext?.enemyFlow.clear();
    scene.gameplayContext?.bossController.clear();
    scene.gameplayContext?.mapMechanicRuntime.destroy();
    scene.gameplayContext?.relicManager.destroy();
    scene.contactDamageCooldowns.clear();
    scene.weaponManager?.destroy();
    scene.weaponManager = undefined;
    scene.pickupManager?.destroy();
    scene.pickupManager = undefined;
    scene.treasureManager?.destroy();
    scene.treasureManager = undefined;
    scene.passiveManager = undefined;
    scene.upgradeFlow = undefined;
    destroyActiveEnemies(scene.enemies);
    scene.enemies = [];
    scene.centerMessageController.clear();
    scene.playerHitRangeAdapter.destroy();
    scene.spawnDirector = undefined;
    scene.bossAttackController?.destroy();
    scene.bossAttackController = undefined;
    scene.endlessManager?.reset();
    scene.endlessManager = undefined;
    scene.endlessBossManager?.clear();
    scene.endlessBossManager = undefined;
    scene.bossSpawnDirector = undefined;
    scene.enemyFactory = undefined;
    scene.virtualJoystick?.destroy();
    scene.virtualJoystick = undefined;
    scene.orientationOverlayController.destroy();
    scene.floatingTextManager?.destroy();
    scene.floatingTextManager = undefined;
    scene.enemyDamageFeedbackController.clear();
    scene.playerFeedbackController.clear();
    scene.treasureRewardFeedbackController.clear();
    scene.mapVisibilityController.destroy();
    scene.gameplayContext?.poolManager.clear();
    scene.evolutionManager = undefined;
    scene.gameplayContext = undefined;
  }
}
