import { GameplayContext } from '../gameplay/GameplayContext';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { getCurrentVersionInfo } from '../version/VersionInfo';

import { DebugPanelData } from './DebugPanelData';

export class DebugDataCollector {
  collect(context: GameplayContext): DebugPanelData {
    const versionInfo = getCurrentVersionInfo();
    const runState = context.runState;
    const performanceStats = context.performanceMonitor.getStats();

    return {
      gameVersion: runState.gameVersion || versionInfo.gameVersion,
      contentHash: runState.contentHash || versionInfo.contentHash,
      runId: context.runId,
      runSeed: context.runSeed,
      characterId: runState.characterId,
      stageId: runState.stageId,
      mapId: runState.mapId,
      difficultyId: runState.difficultyId,
      fps: performanceStats.fps || context.scene.game.loop.actualFps,
      averageDeltaMs: performanceStats.averageDeltaMs,
      configuredTimeScale: performanceStats.configuredTimeScale,
      effectiveTimeScale: performanceStats.effectiveTimeScale,
      sceneTimeScale: performanceStats.sceneTimeScale,
      physicsTimeScale: performanceStats.physicsTimeScale,
      gameSecondsPerRealSecond: performanceStats.gameSecondsPerRealSecond,
      gameTimeSeconds: context.timeManager.gameTimeSeconds,
      enemyCount: performanceStats.enemyCount || context.enemies.filter((enemy) => !enemy.isDead).length,
      projectileCount: performanceStats.projectileCount,
      activeBossCount: performanceStats.activeBossCount ?? context.enemies.filter((enemy) => (
        !enemy.isDead && this.isBossLikeEnemyId(enemy.id)
      )).length,
      endlessEnemyCount: performanceStats.endlessEnemyCount,
      endlessBossCount: performanceStats.endlessBossCount,
      endlessStarted: runState.endlessStarted,
      endlessTimeSeconds: runState.endlessSurvivalTime,
      endlessScalingLevel: runState.endlessScalingLevel,
      playerLevel: context.levelManager.currentLevel,
      playerHp: context.playerHealth.currentHp,
      playerMaxHp: context.playerHealth.maxHp,
      csvBufferSize: PlaytestLogBuffer.getCount(),
      recentEventCount: context.gameEventRecorder?.getRecentEvents().length,
      pickupCount: performanceStats.pickupCount,
      pickupGemCount: performanceStats.pickupGemCount,
      pickupMergeCount: performanceStats.pickupMergeCount,
      treasureCount: performanceStats.treasureCount,
      chestCount: performanceStats.chestCount,
      floatingTextCount: performanceStats.floatingTextCount,
      floatingTextActiveCount: performanceStats.floatingTextActiveCount,
      floatingTextPoolSize: performanceStats.floatingTextPoolSize,
      activeTweenCount: performanceStats.activeTweenCount,
      activeTimerCount: performanceStats.activeTimerCount,
      mapMechanicVisualCount: performanceStats.mapMechanicVisualCount,
      slowZoneCount: performanceStats.slowZoneCount,
      totalRenderableWorldObjects: performanceStats.totalRenderableWorldObjects,
      spawnAccumulatorSummary: performanceStats.spawnAccumulatorSummary,
      spawnClampCount: performanceStats.spawnClampCount,
      pooledObjectCount: performanceStats.pooledObjectCount,
      createdObjectCount: performanceStats.createdObjectCount,
      reusedObjectCount: performanceStats.reusedObjectCount,
      destroyedObjectCount: performanceStats.destroyedObjectCount,
    };
  }

  private isBossLikeEnemyId(enemyId: string): boolean {
    return enemyId === 'boss'
      || enemyId.endsWith('_boss')
      || enemyId.startsWith('endless_');
  }
}
