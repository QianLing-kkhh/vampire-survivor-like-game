import type { MapMechanicDefinition } from '../../map/mechanics/MapMechanicDefinition';

export interface WorldPosition {
  x: number;
  y: number;
}

export interface MinimapEnemyPosition extends WorldPosition {
  bossLike?: boolean;
  finalBoss?: boolean;
}

export interface MinimapOverlayState {
  worldWidth: number;
  worldHeight: number;
  mapMechanics?: readonly MapMechanicDefinition[];
  playerPosition: WorldPosition;
  enemyPositions: MinimapEnemyPosition[];
}
