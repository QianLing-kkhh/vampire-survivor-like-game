import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import type { FloatingTextManager } from '../ui/FloatingTextManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import { PhaserRenderEventAdapter } from '../phaser-adapter/PhaserRenderEventAdapter';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { RunStats } from '../stats/RunStats';

interface FloatingTextFeedbackController {
  setFloatingTextManager(floatingTextManager: FloatingTextManager): void;
}

interface EnemyDamageFeedbackControllerPort {
  setRenderEventPort(renderEventPort: PhaserRenderEventAdapter): void;
}

export interface GameSceneGameplayContextScenePort {
  gameplayContext?: GameplayContext;
  playtestSettings: PlaytestSettingsState;
  runStats: RunStats;
  runtimeStrategyProfileSynchronizer: {
    setStrategyForProfileId(profileId: string | undefined): void;
  };
  player?: GameplayContext['player'];
  playerHealth?: GameplayContext['playerHealth'];
  enemies: GameplayContext['enemies'];
  weaponManager?: GameplayContext['weaponManager'];
  pickupManager?: GameplayContext['pickupManager'];
  treasureManager?: GameplayContext['treasureManager'];
  evolutionManager?: GameplayContext['evolutionManager'];
  passiveManager?: GameplayContext['passiveManager'];
  expManager?: GameplayContext['expManager'];
  levelManager?: GameplayContext['levelManager'];
  playerStats?: GameplayContext['playerStats'];
  upgradeApplier?: GameplayContext['upgradeApplier'];
  upgradeFlow?: GameplayContext['upgradeFlow'];
  spawnDirector?: GameplayContext['spawnDirector'];
  bossSpawnDirector?: GameplayContext['bossSpawnDirector'];
  bossAttackController?: GameplayContext['bossAttackController'];
  endlessManager?: GameplayContext['endlessManager'];
  endlessBossManager?: GameplayContext['endlessBossManager'];
  enemyFactory?: GameplayContext['enemyFactory'];
  floatingTextManager?: GameplayContext['floatingTextManager'];
  playerFeedbackController: FloatingTextFeedbackController;
  treasureRewardFeedbackController: FloatingTextFeedbackController;
  enemyDamageFeedbackController: EnemyDamageFeedbackControllerPort;
  virtualJoystick?: GameplayContext['virtualJoystick'];
  playerPickupRange: number;
  syncRuntimeStrategyProfile(profile?: AutoStrategyProfile): void;
}

export class GameSceneGameplayContextApplier {
  apply(scene: GameSceneGameplayContextScenePort, context: GameplayContext): void {
    scene.gameplayContext = context;
    scene.playtestSettings = context.playtestSettings;
    scene.runStats = context.runStats;
    scene.runtimeStrategyProfileSynchronizer.setStrategyForProfileId(
      context.runState.getRunMetadata().strategyProfileId,
    );
    scene.player = context.player;
    scene.playerHealth = context.playerHealth;
    scene.enemies = context.enemies;
    scene.weaponManager = context.weaponManager;
    scene.pickupManager = context.pickupManager;
    scene.treasureManager = context.treasureManager;
    scene.evolutionManager = context.evolutionManager;
    scene.passiveManager = context.passiveManager;
    scene.expManager = context.expManager;
    scene.levelManager = context.levelManager;
    scene.playerStats = context.playerStats;
    scene.upgradeApplier = context.upgradeApplier;
    scene.upgradeFlow = context.upgradeFlow;
    scene.spawnDirector = context.spawnDirector;
    scene.bossSpawnDirector = context.bossSpawnDirector;
    scene.bossAttackController = context.bossAttackController;
    scene.endlessManager = context.endlessManager;
    scene.endlessBossManager = context.endlessBossManager;
    scene.enemyFactory = context.enemyFactory;
    scene.floatingTextManager = context.floatingTextManager;
    scene.playerFeedbackController.setFloatingTextManager(scene.floatingTextManager);
    scene.treasureRewardFeedbackController.setFloatingTextManager(scene.floatingTextManager);
    scene.enemyDamageFeedbackController.setRenderEventPort(
      new PhaserRenderEventAdapter(scene.floatingTextManager),
    );
    scene.virtualJoystick = context.virtualJoystick;
    scene.playerPickupRange = context.playerPickupRange;
    scene.syncRuntimeStrategyProfile(context.runtimeStrategyState?.getProfile());
  }
}
