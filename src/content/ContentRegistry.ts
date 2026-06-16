import { CharacterDefinition } from '../character/CharacterDefinition';
import type { EnemyStats } from '../core/domain/EnemyTypes';
import type { WeaponConfig } from '../core/domain/WeaponTypes';
import { EvolutionRule } from '../evolution/EvolutionRule';
import { MapDefinition } from '../map/MapDefinition';
import { PassiveItem } from '../passive/PassiveItem';
import { UpgradeOption } from '../progression/UpgradeOption';
import { SpawnWave } from '../spawn/SpawnWave';
import { StageDefinition } from '../stage/StageDefinition';

import { ContentPack } from './ContentPack';

export class ContentRegistry {
  private static readonly packs = new Map<string, ContentPack>();
  private static readonly weapons = new Map<string, WeaponConfig>();
  private static readonly enemies = new Map<string, EnemyStats>();
  private static readonly passives = new Map<string, PassiveItem>();
  private static readonly upgrades: UpgradeOption[] = [];
  private static readonly waves = new Map<string, readonly SpawnWave[]>();
  private static readonly characters = new Map<string, CharacterDefinition>();
  private static readonly stages = new Map<string, StageDefinition>();
  private static readonly maps = new Map<string, MapDefinition>();
  private static readonly evolutions: EvolutionRule[] = [];

  static registerPack(pack: ContentPack): void {
    if (this.packs.has(pack.id)) {
      console.warn(`Content pack already registered: ${pack.id}`);
      return;
    }

    this.registerMap('weapon', this.weapons, pack.weapons, pack);
    this.registerMap('enemy', this.enemies, pack.enemies, pack);
    this.registerMap('passive', this.passives, pack.passives, pack);
    this.registerMap('waveSet', this.waves, pack.waves, pack);
    this.registerMap('character', this.characters, pack.characters, pack);
    this.registerMap('stage', this.stages, pack.stages, pack);
    this.registerMap('map', this.maps, pack.maps, pack);

    if (pack.upgrades) {
      this.upgrades.push(...pack.upgrades.map((upgrade) => ({ ...upgrade })));
    }

    if (pack.evolutions) {
      this.evolutions.push(...pack.evolutions.map((rule) => ({ ...rule })));
    }

    this.packs.set(pack.id, pack);
  }

  static clear(): void {
    this.packs.clear();
    this.weapons.clear();
    this.enemies.clear();
    this.passives.clear();
    this.upgrades.splice(0, this.upgrades.length);
    this.waves.clear();
    this.characters.clear();
    this.stages.clear();
    this.maps.clear();
    this.evolutions.splice(0, this.evolutions.length);
  }

  static getWeapon(id: string): WeaponConfig | undefined {
    return this.clone(this.weapons.get(id));
  }

  static getEnemy(id: string): EnemyStats | undefined {
    return this.clone(this.enemies.get(id));
  }

  static getPassive(id: string): PassiveItem | undefined {
    return this.clone(this.passives.get(id));
  }

  static getUpgradeOptions(): UpgradeOption[] {
    return this.upgrades.map((upgrade) => ({ ...upgrade }));
  }

  static getWaveSet(id: string): readonly SpawnWave[] | undefined {
    return this.waves.get(id)?.map((wave) => ({ ...wave }));
  }

  static getCharacter(id: string): CharacterDefinition | undefined {
    return this.clone(this.characters.get(id));
  }

  static getStage(id: string): StageDefinition | undefined {
    return this.clone(this.stages.get(id));
  }

  static getMap(id: string): MapDefinition | undefined {
    return this.clone(this.maps.get(id));
  }

  static listWeapons(): Record<string, WeaponConfig> {
    return this.toRecord(this.weapons);
  }

  static listEnemies(): Record<string, EnemyStats> {
    return this.toRecord(this.enemies);
  }

  static listPassives(): PassiveItem[] {
    return Array.from(this.passives.values()).map((passive) => ({ ...passive }));
  }

  static listCharacters(): CharacterDefinition[] {
    return Array.from(this.characters.values()).map((character) => this.clone(character));
  }

  static listStages(): StageDefinition[] {
    return Array.from(this.stages.values()).map((stage) => this.clone(stage));
  }

  static listMaps(): MapDefinition[] {
    return Array.from(this.maps.values()).map((map) => this.clone(map));
  }

  static listEvolutionRules(): EvolutionRule[] {
    return this.evolutions.map((rule) => ({ ...rule }));
  }

  private static registerMap<T>(
    contentType: string,
    target: Map<string, T>,
    values: Record<string, T> | undefined,
    pack: ContentPack,
  ): void {
    if (!values) {
      return;
    }

    for (const [id, value] of Object.entries(values)) {
      if (target.has(id)) {
        console.warn(
          `Content ${contentType} id conflict skipped: ${id} from pack ${pack.id}`,
        );
        continue;
      }

      target.set(id, this.clone(value));
    }
  }

  private static toRecord<T>(source: Map<string, T>): Record<string, T> {
    const record: Record<string, T> = {};

    for (const [id, value] of source.entries()) {
      record[id] = this.clone(value);
    }

    return record;
  }

  private static clone<T>(value: T): T {
    if (value === undefined) {
      return value;
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }
}
