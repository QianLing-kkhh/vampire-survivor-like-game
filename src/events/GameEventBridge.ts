import { EventBus } from '../core/EventBus';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';

import { GameEventBus } from './GameEventBus';

export interface GameEventBridgeConfig {
  sourceEventBus: EventBus<GameEventMap>;
  gameEventBus: GameEventBus;
  getGameTimeSeconds(): number;
  getRunId(): string | undefined;
}

export class GameEventBridge {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(private readonly config: GameEventBridgeConfig) {
    this.attach();
  }

  clear(): void {
    while (this.unsubscribers.length > 0) {
      this.unsubscribers.pop()?.();
    }
  }

  private attach(): void {
    this.unsubscribers.push(
      this.config.sourceEventBus.subscribe('EnemyKilled', (event) => {
        if (!isEnemyKilledEvent(event)) {
          return;
        }

        const gameTimeSeconds = this.config.getGameTimeSeconds();
        const meta = {
          gameTimeSeconds,
          runId: this.config.getRunId(),
        };
        const enemyId = event.enemyId ?? (event.isBoss ? 'boss' : 'unknown');
        const payload = {
          enemyId,
          x: event.x,
          y: event.y,
          exp: event.exp,
          isBoss: event.isBoss === true,
          gameTimeSeconds,
        };

        this.config.gameEventBus.emit('enemy.killed', payload, meta);

        if (event.isBoss === true) {
          this.config.gameEventBus.emit('boss.killed', {
            bossId: enemyId,
            x: event.x,
            y: event.y,
            gameTimeSeconds,
          }, meta);
        }

        if (enemyId.startsWith('endless_')) {
          this.config.gameEventBus.emit('endless.bossKilled', {
            bossId: enemyId,
            x: event.x,
            y: event.y,
            gameTimeSeconds,
          }, meta);
        }
      }),
    );

    this.unsubscribers.push(
      this.config.sourceEventBus.subscribe('LevelUp', (event) => {
        const level = typeof event === 'object'
          && event !== null
          && 'level' in event
          && typeof (event as { level?: unknown }).level === 'number'
          ? (event as { level: number }).level
          : 0;
        const gameTimeSeconds = this.config.getGameTimeSeconds();

        this.config.gameEventBus.emit('player.levelUp', {
          level,
          gameTimeSeconds,
        }, {
          gameTimeSeconds,
          runId: this.config.getRunId(),
        });
      }),
    );

    this.unsubscribers.push(
      this.config.sourceEventBus.subscribe('ExpGained', (event) => {
        const gameTimeSeconds = this.config.getGameTimeSeconds();
        const amount = typeof event === 'object'
          && event !== null
          && 'amount' in event
          && typeof (event as { amount?: unknown }).amount === 'number'
          ? (event as { amount: number }).amount
          : 0;

        this.config.gameEventBus.emit('pickup.expCollected', {
          amount,
          gameTimeSeconds,
        }, {
          gameTimeSeconds,
          runId: this.config.getRunId(),
        });
      }),
    );
  }
}
