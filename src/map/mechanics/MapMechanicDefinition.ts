export type MapMechanicType =
  | 'obstacle'
  | 'slowZone'
  | 'portal'
  | 'lightSource'
  | 'hazard'
  | 'altar'
  | 'destructible'
  | 'spawner';

export type MapMechanicShape = 'circle' | 'rect';

export interface BaseMapMechanicDefinition {
  id: string;
  type: MapMechanicType;
  x: number;
  y: number;
  enabled?: boolean;
  minimapVisible?: boolean;
  minimapIcon?: string;
  minimapPriority?: number;
}

export interface MapObstacleDefinition extends BaseMapMechanicDefinition {
  type: 'obstacle';
  width: number;
  height: number;
  shape?: MapMechanicShape;
  blocksPlayer?: boolean;
  blocksEnemies?: boolean;
  visualType?:
    | 'grave'
    | 'rock'
    | 'tree'
    | 'wall'
    | 'cathedralWall'
    | 'cathedralPillar'
    | 'bookshelf'
    | 'archivePillar';
}

export interface MapSlowZoneDefinition extends BaseMapMechanicDefinition {
  type: 'slowZone';
  radius?: number;
  width?: number;
  height?: number;
  shape?: MapMechanicShape;
  playerSpeedMultiplier: number;
  enemySpeedMultiplier: number;
  affectsBossLike?: boolean;
  visualType?: 'river' | 'swamp' | 'mud' | 'ink';
}

export interface MapPortalDefinition extends BaseMapMechanicDefinition {
  type: 'portal';
  radius: number;
  targetPortalId: string;
  cooldownMs: number;
  visualType?: 'blue' | 'purple' | 'green' | 'gold';
}

export interface MapLightSourceDefinition extends BaseMapMechanicDefinition {
  type: 'lightSource';
  radius: number;
  intensity?: number;
  visualType?: 'lamp' | 'torch' | 'crystal' | 'candle' | 'arcaneLamp';
}

export interface MapAltarDefinition extends BaseMapMechanicDefinition {
  type: 'altar';
  radius: number;
  chargeMs: number;
  cooldownMs: number;
  healLostHpRatio: number;
  visualType?: 'cathedral' | 'library';
}

export type MapMechanicDefinition =
  | MapObstacleDefinition
  | MapSlowZoneDefinition
  | MapPortalDefinition
  | MapLightSourceDefinition
  | MapAltarDefinition
  | BaseMapMechanicDefinition;
