import type { Enemy } from './Enemy';

export const destroyActiveEnemies = (enemies: readonly Enemy[]): void => {
  for (const enemy of enemies) {
    if (!enemy.body.active) {
      continue;
    }

    enemy.destroy();
  }
};
