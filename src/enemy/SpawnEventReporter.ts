import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import type { EventBus } from '../core/EventBus';
import type { GameplayContext } from '../gameplay/GameplayContext';
import { I18n } from '../i18n/I18n';
import type { CenterMessageController } from '../ui/CenterMessageController';

import type { Enemy, GameEventMap } from './Enemy';

export interface SpawnEventReporterContext {
  scene: Phaser.Scene;
  eventBus: EventBus<GameEventMap>;
  enemies: Enemy[];
  gameplayContext?: GameplayContext;
  gameTimeSeconds: number;
  runId: string;
  centerMessageController: CenterMessageController;
}

export class SpawnEventReporter {
  recordEnemySpawn(enemy: Enemy, context: SpawnEventReporterContext): void {
    enemy.setEventBus(context.eventBus);
    context.enemies.push(enemy);

    context.gameplayContext?.gameEventBus.emit('enemy.spawned', {
      enemyId: enemy.id,
      x: enemy.body.x,
      y: enemy.body.y,
      isBoss: enemy.id === 'boss'
        || enemy.id.endsWith('_boss')
        || enemy.id.startsWith('endless_'),
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });

    if (!enemy.id.startsWith('endless_')) {
      return;
    }

    context.gameplayContext?.gameEventBus.emit('endless.bossSpawned', {
      bossId: enemy.id,
      x: enemy.body.x,
      y: enemy.body.y,
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
  }

  recordBossSpawn(boss: Enemy, context: SpawnEventReporterContext): void {
    boss.setEventBus(context.eventBus);
    context.enemies.push(boss);

    context.gameplayContext?.gameEventBus.emit('boss.spawned', {
      bossId: boss.id,
      x: boss.body.x,
      y: boss.body.y,
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
    AudioManager.playSfx(context.scene, 'boss_spawn');
    AudioManager.playBgm(context.scene, 'boss_bgm');
    context.centerMessageController.show(
      I18n.t('game.bossAppears'),
      { kind: 'boss', durationMs: 2200 },
    );
  }
}
