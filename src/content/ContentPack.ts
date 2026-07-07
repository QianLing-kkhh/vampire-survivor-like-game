import { CharacterDefinition } from '../character/CharacterDefinition';
import type { EnemyStats } from '../core/domain/EnemyTypes';
import type { WeaponConfig } from '../core/domain/WeaponTypes';
import type { EndlessBossConfig } from '../endless/EndlessBossConfig';
import { EvolutionRule } from '../evolution/EvolutionRule';
import { MapDefinition } from '../map/MapDefinition';
import { PassiveItem } from '../passive/PassiveItem';
import { UpgradeOption } from '../progression/UpgradeOption';
import { SpawnWave } from '../spawn/SpawnWave';
import { StageDefinition } from '../stage/StageDefinition';

export interface ContentPack {
  id: string;
  version: string;
  source: 'builtin' | 'custom' | 'mod';
  weapons?: Record<string, WeaponConfig>;
  enemies?: Record<string, EnemyStats>;
  endlessBosses?: Record<string, EndlessBossConfig>;
  passives?: Record<string, PassiveItem>;
  upgrades?: UpgradeOption[];
  waves?: Record<string, readonly SpawnWave[]>;
  characters?: Record<string, CharacterDefinition>;
  stages?: Record<string, StageDefinition>;
  maps?: Record<string, MapDefinition>;
  evolutions?: readonly EvolutionRule[];
}
