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
  visualType?: 'grave' | 'rock' | 'tree' | 'wall';
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
  visualType?: 'river' | 'swamp' | 'mud';
}

export interface MapPortalDefinition extends BaseMapMechanicDefinition {
  type: 'portal';
  radius: number;
  targetPortalId: string;
  cooldownMs: number;
  visualType?: 'blue' | 'purple' | 'green';
}

export interface MapLightSourceDefinition extends BaseMapMechanicDefinition {
  type: 'lightSource';
  radius: number;
  intensity?: number;
  visualType?: 'lamp' | 'torch' | 'crystal';
}

export type MapMechanicDefinition =
  | MapObstacleDefinition
  | MapSlowZoneDefinition
  | MapPortalDefinition
  | MapLightSourceDefinition
  | BaseMapMechanicDefinition;
