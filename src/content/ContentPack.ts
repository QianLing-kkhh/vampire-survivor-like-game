import { CharacterDefinition } from '../character/CharacterDefinition';
import { EnemyStats } from '../enemy/Enemy';
import { MapDefinition } from '../map/MapDefinition';
import { PassiveItem } from '../passive/PassiveItem';
import { UpgradeOption } from '../progression/UpgradeOption';
import { SpawnWave } from '../spawn/SpawnWave';
import { StageDefinition } from '../stage/StageDefinition';
import { WeaponConfig } from '../weapon/Weapon';

export interface ContentPack {
  id: string;
  version: string;
  source: 'builtin' | 'custom' | 'mod';
  weapons?: Record<string, WeaponConfig>;
  enemies?: Record<string, EnemyStats>;
  passives?: Record<string, PassiveItem>;
  upgrades?: UpgradeOption[];
  waves?: Record<string, readonly SpawnWave[]>;
  characters?: Record<string, CharacterDefinition>;
  stages?: Record<string, StageDefinition>;
  maps?: Record<string, MapDefinition>;
}
