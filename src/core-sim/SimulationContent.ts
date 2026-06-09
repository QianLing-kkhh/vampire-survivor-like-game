export interface SimulationVersionInfo {
  gameVersion: string;
  contentHash: string;
  saveSchemaVersion: number;
  csvSchemaVersion: number;
  replaySchemaVersion: number;
  customStageSchemaVersion: number;
}

export interface SimulationCharacterDefinition {
  id?: string;
  startingWeaponId?: string;
  initialStats?: {
    maxHp?: number;
    moveSpeed?: number;
    pickupRange?: number;
    damageMultiplier?: number;
    damageTakenMultiplier?: number;
    expGainMultiplier?: number;
  };
}

export interface SimulationStageDefinition {
  id: string;
  mapId: string;
  waveSetId?: string;
  finalBossId?: string;
  finalBossSpawnTimeSeconds?: number;
  allowEndless?: boolean;
}

export interface SimulationMapDefinition {
  id: string;
  worldWidth: number;
  worldHeight: number;
}

export interface SimulationEnemyDefinition {
  hp: number;
  moveSpeed: number;
  damage: number;
  exp: number;
  scale?: number;
  bossLike?: boolean;
}

export interface SimulationWeaponDefinition {
  type?: string;
  damage?: number;
  cooldown?: number;
  radius?: number;
  projectileCount?: number;
  pierce?: number;
  tags?: string[];
}

export interface SimulationDifficultyDefinition {
  id: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  spawnRateMultiplier: number;
  treasureDropMultiplier: number;
  expMultiplier: number;
  bossHpMultiplier: number;
  bossDamageMultiplier: number;
  bossSkillCooldownMultiplier: number;
  scoreMultiplier?: number;
}

export interface SimulationWaveEntry {
  time: number;
  enemy: string;
  count: number;
  interval: number;
}

export interface SimulationContentBundle {
  characters: Record<string, SimulationCharacterDefinition>;
  stages: Record<string, SimulationStageDefinition>;
  maps: Record<string, SimulationMapDefinition>;
  enemies: Record<string, SimulationEnemyDefinition>;
  weapons: Record<string, SimulationWeaponDefinition>;
  waves: Record<string, SimulationWaveEntry[]>;
  difficulties: Record<string, SimulationDifficultyDefinition>;
}

export function createDefaultSimulationVersionInfo(): SimulationVersionInfo {
  return {
    gameVersion: '0.1.0-prototype',
    contentHash: 'unknown',
    saveSchemaVersion: 13,
    csvSchemaVersion: 10,
    replaySchemaVersion: 1,
    customStageSchemaVersion: 1,
  };
}

export function createFallbackSimulationContent(): SimulationContentBundle {
  return {
    characters: {
      priest: {
        startingWeaponId: 'magic_wand',
        initialStats: {
          maxHp: 92,
          moveSpeed: 148,
          pickupRange: 58,
          damageMultiplier: 1,
          damageTakenMultiplier: 1,
          expGainMultiplier: 1,
        },
      },
    },
    stages: {
      stage_001: {
        id: 'stage_001',
        mapId: 'prototype_field',
        waveSetId: 'default',
        finalBossId: 'boss',
        finalBossSpawnTimeSeconds: 300,
        allowEndless: true,
      },
    },
    maps: {
      prototype_field: {
        id: 'prototype_field',
        worldWidth: 1600,
        worldHeight: 900,
      },
    },
    enemies: {
      slime: { hp: 18, moveSpeed: 85, damage: 6, exp: 1 },
      boss: { hp: 1600, moveSpeed: 72, damage: 22, exp: 80, bossLike: true, scale: 3 },
    },
    weapons: {
      magic_wand: { type: 'magic_wand', damage: 15, cooldown: 1, projectileCount: 1, pierce: 1 },
    },
    waves: {
      default: [
        { time: 0, enemy: 'slime', count: 9999, interval: 0.92 },
      ],
    },
    difficulties: {
      normal: {
        id: 'normal',
        enemyHpMultiplier: 1,
        enemyDamageMultiplier: 1,
        enemySpeedMultiplier: 1,
        spawnRateMultiplier: 1,
        treasureDropMultiplier: 1,
        expMultiplier: 1,
        bossHpMultiplier: 1,
        bossDamageMultiplier: 1,
        bossSkillCooldownMultiplier: 1,
        scoreMultiplier: 1,
      },
    },
  };
}
