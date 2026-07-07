import Phaser from 'phaser';

import type { PlayerController } from './PlayerController';

export const knockPlayerBackFromPoint = (
  player: PlayerController | undefined,
  point: Phaser.Math.Vector2,
  distance: number,
): void => {
  if (!player) {
    return;
  }

  const playerPosition = player.getPositionLike();
  const direction = new Phaser.Math.Vector2(
    playerPosition.x - point.x,
    playerPosition.y - point.y,
  );

  if (direction.lengthSq() === 0) {
    direction.set(1, 0);
  }

  direction.normalize().scale(distance);

  player.applyExternalDisplacementLike({
    x: direction.x,
    y: direction.y,
  });
};
