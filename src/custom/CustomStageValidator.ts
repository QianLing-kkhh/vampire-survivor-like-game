import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import { EnemyModifierFactory } from '../enemy/modifiers/EnemyModifierFactory';
import { MutatorFactory } from '../rules/MutatorFactory';

import {
  CUSTOM_STAGE_SCHEMA_VERSION,
  CustomMapDefinition,
  CustomStagePackage,
  CustomWaveDefinition,
} from './CustomStageSchema';
import {
  CustomStageValidationIssue,
  CustomStageValidationResult,
  createCustomStageValidationResult,
} from './CustomStageValidationResult';

export class CustomStageValidator {
  private static readonly MIN_MAP_SIZE = 1200;
  private static readonly MAX_MAP_SIZE = 12000;
  private static readonly MIN_SAFE_SPAWN_RADIUS = 100;
  private static readonly SINGLE_WAVE_SPAWNS_PER_MINUTE_WARNING = 300;
  private static readonly OVERLAP_SPAWNS_PER_MINUTE_WARNING = 600;
  private static readonly PRE_BOSS_TOTAL_SPAWN_WARNING = 2400;

  validate(stagePackage: unknown): CustomStageValidationResult {
    ContentBootstrap.ensureInitialized();

    const issues: CustomStageValidationIssue[] = [];

    if (!this.isObject(stagePackage)) {
      issues.push(this.error('invalid_package', 'Custom stage package must be an object.'));
      return createCustomStageValidationResult(issues);
    }

    const customPackage = stagePackage as Partial<CustomStagePackage>;

    this.validatePackage(customPackage, issues);

    if (!customPackage.stage || !this.isObject(customPackage.stage)) {
      issues.push(this.error('missing_stage', 'Package stage definition is required.', 'stage'));
    }

    if (!customPackage.map || !this.isObject(customPackage.map)) {
      issues.push(this.error('missing_map', 'Package map definition is required.', 'map'));
    }

    if (!Array.isArray(customPackage.waves)) {
      issues.push(this.error('missing_waves', 'Package waves must be an array.', 'waves'));
    }

    if (!customPackage.stage || !customPackage.map || !Array.isArray(customPackage.waves)) {
      return createCustomStageValidationResult(issues);
    }

    this.validateStage(customPackage as CustomStagePackage, issues);
    this.validateMap(customPackage.map, issues);
    this.validateWaves(customPackage as CustomStagePackage, issues);
    this.validatePerformance(customPackage as CustomStagePackage, issues);

    return createCustomStageValidationResult(issues);
  }

  private validatePackage(
    stagePackage: Partial<CustomStagePackage>,
    issues: CustomStageValidationIssue[],
  ): void {
    if (stagePackage.schemaVersion === undefined) {
      issues.push(this.error('missing_schema_version', 'schemaVersion is required.', 'schemaVersion'));
    } else if (stagePackage.schemaVersion !== CUSTOM_STAGE_SCHEMA_VERSION) {
      issues.push(this.warning(
        'unsupported_schema_version',
        `schemaVersion ${stagePackage.schemaVersion} may need migration.`,
        'schemaVersion',
      ));
    }

    if (!this.isNonEmptyString(stagePackage.id)) {
      issues.push(this.error('missing_package_id', 'Package id is required.', 'id'));
    } else {
      this.validateId(stagePackage.id, 'id', issues);

      if (!stagePackage.id.startsWith('custom_')) {
        issues.push(this.warning(
          'custom_id_prefix',
          'Custom stage package id should start with custom_.',
          'id',
        ));
      }
    }

    if (!this.isNonEmptyString(stagePackage.name)) {
      issues.push(this.error('missing_package_name', 'Package name is required.', 'name'));
    }
  }

  private validateStage(
    stagePackage: CustomStagePackage,
    issues: CustomStageValidationIssue[],
  ): void {
    const stage = stagePackage.stage;

    if (!this.isNonEmptyString(stage.id)) {
      issues.push(this.error('missing_stage_id', 'Stage id is required.', 'stage.id'));
    } else {
      this.validateId(stage.id, 'stage.id', issues);
      this.warnIfBuiltinStageConflict(stage.id, issues, 'stage.id');
    }

    if (!this.isNonEmptyString(stage.name)) {
      issues.push(this.error('missing_stage_name', 'Stage name is required.', 'stage.name'));
    }

    if (stage.mapId !== stagePackage.map.id) {
      issues.push(this.error(
        'stage_map_mismatch',
        'stage.mapId must equal package map.id.',
        'stage.mapId',
      ));
    }

    if (!this.isNonEmptyString(stage.waveSetId)) {
      issues.push(this.error('missing_wave_set_id', 'stage.waveSetId is required.', 'stage.waveSetId'));
    } else if (stage.waveSetId !== `${stagePackage.id}_waves` && stage.waveSetId !== stage.id) {
      issues.push(this.warning(
        'nonstandard_wave_set_id',
        'stage.waveSetId should normally equal stage.id or package id plus _waves.',
        'stage.waveSetId',
      ));
    }

    if (!this.enemyExists(stage.finalBossId)) {
      issues.push(this.error(
        'missing_final_boss',
        `finalBossId does not exist in registered enemies: ${stage.finalBossId}`,
        'stage.finalBossId',
      ));
    }

    if (stage.finalBossSpawnTime <= 0) {
      issues.push(this.error(
        'invalid_boss_spawn_time',
        'finalBossSpawnTime must be greater than 0.',
        'stage.finalBossSpawnTime',
      ));
    }

    if (stage.warningBeforeBoss < 0) {
      issues.push(this.error(
        'invalid_boss_warning',
        'warningBeforeBoss must be greater than or equal to 0.',
        'stage.warningBeforeBoss',
      ));
    }

    if (stage.warningBeforeBoss >= stage.finalBossSpawnTime) {
      issues.push(this.error(
        'boss_warning_after_spawn',
        'warningBeforeBoss must be less than finalBossSpawnTime.',
        'stage.warningBeforeBoss',
      ));
    }

    if (stage.finalBossSpawnTime < 60) {
      issues.push(this.warning(
        'early_boss_spawn',
        'Boss appears before 60 seconds; this may be too early for a normal stage.',
        'stage.finalBossSpawnTime',
      ));
    }

    this.validateStageMutators(stage.mutators, 'stage.mutators', issues);
  }

  private validateStageMutators(
    mutators: readonly unknown[] | undefined,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (mutators === undefined) {
      return;
    }

    if (!Array.isArray(mutators)) {
      issues.push(this.error('invalid_mutators', 'Stage mutators must be an array.', path));
      return;
    }

    mutators.forEach((mutator, index) => {
      const mutatorPath = `${path}.${index}`;

      if (!this.isObject(mutator)) {
        issues.push(this.error('invalid_mutator', 'Mutator must be an object.', mutatorPath));
        return;
      }

      const type = mutator.type;

      if (typeof type !== 'string') {
        issues.push(this.error('missing_mutator_type', 'Mutator type is required.', `${mutatorPath}.type`));
        return;
      }

      if (!MutatorFactory.isKnownType(type)) {
        issues.push(this.warning(
          'unknown_mutator_type',
          `Mutator type is not registered: ${type}`,
          `${mutatorPath}.type`,
        ));
      }

      this.validateMutatorSpecificFields(mutator, mutatorPath, issues);
    });
  }

  private validateMutatorSpecificFields(
    mutator: Record<string, unknown>,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    switch (mutator.type) {
      case 'enemyStat':
        this.validatePositiveOptionalNumber(mutator.enemyHpMultiplier, `${path}.enemyHpMultiplier`, issues);
        this.validatePositiveOptionalNumber(mutator.enemyDamageMultiplier, `${path}.enemyDamageMultiplier`, issues);
        this.validatePositiveOptionalNumber(mutator.enemySpeedMultiplier, `${path}.enemySpeedMultiplier`, issues);
        break;
      case 'spawnRate':
        this.validatePositiveRequiredNumber(mutator.spawnRateMultiplier, `${path}.spawnRateMultiplier`, issues);
        break;
      case 'treasureRate':
        this.validateNonNegativeRequiredNumber(mutator.treasureDropMultiplier, `${path}.treasureDropMultiplier`, issues);
        break;
      case 'expRate':
        this.validateNonNegativeRequiredNumber(mutator.expMultiplier, `${path}.expMultiplier`, issues);
        break;
      case 'bossTiming':
        this.validatePositiveOptionalNumber(
          mutator.finalBossSpawnTimeMultiplier,
          `${path}.finalBossSpawnTimeMultiplier`,
          issues,
        );
        this.validateNumberOptional(mutator.finalBossSpawnTimeOffsetSeconds, `${path}.finalBossSpawnTimeOffsetSeconds`, issues);
        this.validateNumberOptional(mutator.warningBeforeBossOffsetSeconds, `${path}.warningBeforeBossOffsetSeconds`, issues);
        break;
      case 'weaponPool':
        this.validateStringArrayOptional(mutator.allowedWeaponIds, `${path}.allowedWeaponIds`, issues);
        this.validateStringArrayOptional(mutator.bannedWeaponIds, `${path}.bannedWeaponIds`, issues);
        this.validateStringArrayOptional(mutator.requiredTags, `${path}.requiredTags`, issues);
        this.validateStringArrayOptional(mutator.bannedTags, `${path}.bannedTags`, issues);
        break;
      default:
        break;
    }
  }

  private validateMap(
    map: CustomMapDefinition,
    issues: CustomStageValidationIssue[],
  ): void {
    if (!this.isNonEmptyString(map.id)) {
      issues.push(this.error('missing_map_id', 'Map id is required.', 'map.id'));
    } else {
      this.validateId(map.id, 'map.id', issues);
      this.warnIfBuiltinMapConflict(map.id, issues, 'map.id');
    }

    if (!this.isNonEmptyString(map.name)) {
      issues.push(this.error('missing_map_name', 'Map name is required.', 'map.name'));
    }

    this.validateMapDimension(map.width, 'map.width', issues);
    this.validateMapDimension(map.height, 'map.height', issues);

    if (map.safeSpawnRadius !== undefined && map.safeSpawnRadius < CustomStageValidator.MIN_SAFE_SPAWN_RADIUS) {
      issues.push(this.warning(
        'small_safe_spawn_radius',
        `safeSpawnRadius below ${CustomStageValidator.MIN_SAFE_SPAWN_RADIUS} may spawn enemies too close.`,
        'map.safeSpawnRadius',
      ));
    }

    map.spawnRegions?.forEach((region, index) => {
      const path = `map.spawnRegions.${index}`;

      if (
        region.x < 0
        || region.y < 0
        || region.width <= 0
        || region.height <= 0
        || region.x + region.width > map.width
        || region.y + region.height > map.height
      ) {
        issues.push(this.error(
          'spawn_region_out_of_bounds',
          'Spawn region must be inside map bounds.',
          path,
        ));
      }
    });
  }

  private validateWaves(
    stagePackage: CustomStagePackage,
    issues: CustomStageValidationIssue[],
  ): void {
    if (stagePackage.waves.length === 0) {
      issues.push(this.error('empty_waves', 'At least one wave is required.', 'waves'));
      return;
    }

    const hasEarlyWave = stagePackage.waves.some((wave) => wave.startTime <= 60);

    if (!hasEarlyWave) {
      issues.push(this.warning(
        'no_early_wave',
        'No waves start in the first 60 seconds.',
        'waves',
      ));
    }

    stagePackage.waves.forEach((wave, index) => {
      this.validateWave(wave, index, stagePackage.stage.finalBossSpawnTime, issues);
    });
  }

  private validateWave(
    wave: CustomWaveDefinition,
    index: number,
    finalBossSpawnTime: number,
    issues: CustomStageValidationIssue[],
  ): void {
    const path = `waves.${index}`;

    if (!this.enemyExists(wave.enemyId)) {
      issues.push(this.error(
        'missing_wave_enemy',
        `Wave enemyId does not exist in registered enemies: ${wave.enemyId}`,
        `${path}.enemyId`,
      ));
    }

    if (wave.startTime < 0) {
      issues.push(this.error('invalid_wave_start_time', 'Wave startTime must be >= 0.', `${path}.startTime`));
    }

    if (wave.count <= 0) {
      issues.push(this.error('invalid_wave_count', 'Wave count must be > 0.', `${path}.count`));
    }

    if (wave.interval <= 0) {
      issues.push(this.error('invalid_wave_interval', 'Wave interval must be > 0.', `${path}.interval`));
    }

    if (wave.duration !== undefined && wave.duration < 0) {
      issues.push(this.error('invalid_wave_duration', 'Wave duration must be >= 0.', `${path}.duration`));
    }

    if (wave.startTime > finalBossSpawnTime) {
      issues.push(this.warning(
        'post_boss_wave',
        'Wave starts after finalBossSpawnTime; this is boss/endless phase pressure.',
        `${path}.startTime`,
      ));
    }

    if (this.getWaveSpawnsPerMinute(wave) > CustomStageValidator.SINGLE_WAVE_SPAWNS_PER_MINUTE_WARNING) {
      issues.push(this.warning(
        'high_single_wave_density',
        'Single wave may spawn more than 300 enemies per minute.',
        path,
      ));
    }

    this.validateWaveModifiers(wave.modifiers, `${path}.modifiers`, issues);
  }

  private validateWaveModifiers(
    modifiers: readonly unknown[] | undefined,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (modifiers === undefined) {
      return;
    }

    if (!Array.isArray(modifiers)) {
      issues.push(this.error('invalid_modifiers', 'Wave modifiers must be an array.', path));
      return;
    }

    modifiers.forEach((modifier, index) => {
      const modifierPath = `${path}.${index}`;

      if (!this.isObject(modifier)) {
        issues.push(this.error('invalid_modifier', 'Enemy modifier must be an object.', modifierPath));
        return;
      }

      const type = modifier.type;

      if (typeof type !== 'string') {
        issues.push(this.error(
          'missing_modifier_type',
          'Enemy modifier type is required.',
          `${modifierPath}.type`,
        ));
        return;
      }

      if (!EnemyModifierFactory.isKnownType(type)) {
        issues.push(this.warning(
          'unknown_modifier_type',
          `Enemy modifier type is not registered: ${type}`,
          `${modifierPath}.type`,
        ));
      }

      if (
        modifier.strength !== undefined
        && (typeof modifier.strength !== 'number' || modifier.strength < 0)
      ) {
        issues.push(this.warning(
          'invalid_modifier_strength',
          'Modifier strength should be greater than or equal to 0.',
          `${modifierPath}.strength`,
        ));
      }

      this.validateModifierSpecificFields(modifier, modifierPath, issues);
    });
  }

  private validateModifierSpecificFields(
    modifier: Record<string, unknown>,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    switch (modifier.type) {
      case 'fast':
        if (
          modifier.speedMultiplier !== undefined
          && (typeof modifier.speedMultiplier !== 'number' || modifier.speedMultiplier <= 0)
        ) {
          issues.push(this.error('invalid_fast_modifier', 'speedMultiplier must be > 0.', path));
        }
        break;
      case 'shielded':
        if (
          modifier.shieldHp !== undefined
          && (typeof modifier.shieldHp !== 'number' || modifier.shieldHp < 0)
        ) {
          issues.push(this.error('invalid_shielded_modifier', 'shieldHp must be >= 0.', path));
        }
        break;
      case 'explosive':
        if (
          modifier.explosionRadius !== undefined
          && (typeof modifier.explosionRadius !== 'number' || modifier.explosionRadius < 0)
        ) {
          issues.push(this.error('invalid_explosive_modifier', 'explosionRadius must be >= 0.', path));
        }
        if (
          modifier.explosionDamage !== undefined
          && (typeof modifier.explosionDamage !== 'number' || modifier.explosionDamage < 0)
        ) {
          issues.push(this.error('invalid_explosive_modifier', 'explosionDamage must be >= 0.', path));
        }
        break;
      case 'splitOnDeath':
        if (typeof modifier.spawnEnemyId !== 'string' || !this.enemyExists(modifier.spawnEnemyId)) {
          issues.push(this.error(
            'invalid_split_modifier_enemy',
            `splitOnDeath spawnEnemyId does not exist: ${modifier.spawnEnemyId}`,
            `${path}.spawnEnemyId`,
          ));
        }
        if (typeof modifier.count !== 'number' || modifier.count <= 0) {
          issues.push(this.error('invalid_split_modifier_count', 'splitOnDeath count must be > 0.', path));
        }
        break;
      default:
        break;
    }
  }

  private validatePositiveRequiredNumber(
    value: unknown,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (typeof value !== 'number' || value <= 0) {
      issues.push(this.error('invalid_mutator_number', 'Value must be > 0.', path));
    }
  }

  private validatePositiveOptionalNumber(
    value: unknown,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
      issues.push(this.error('invalid_mutator_number', 'Value must be > 0.', path));
    }
  }

  private validateNonNegativeRequiredNumber(
    value: unknown,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (typeof value !== 'number' || value < 0) {
      issues.push(this.error('invalid_mutator_number', 'Value must be >= 0.', path));
    }
  }

  private validateNumberOptional(
    value: unknown,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (value !== undefined && typeof value !== 'number') {
      issues.push(this.error('invalid_mutator_number', 'Value must be a number.', path));
    }
  }

  private validateStringArrayOptional(
    value: unknown,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (value !== undefined && !(
      Array.isArray(value) && value.every((item) => typeof item === 'string')
    )) {
      issues.push(this.error('invalid_mutator_string_array', 'Value must be a string array.', path));
    }
  }

  private validatePerformance(
    stagePackage: CustomStagePackage,
    issues: CustomStageValidationIssue[],
  ): void {
    const preBossTotal = stagePackage.waves
      .filter((wave) => wave.startTime < stagePackage.stage.finalBossSpawnTime)
      .reduce((total, wave) => total + this.getEstimatedWaveSpawnCount(wave), 0);

    if (preBossTotal > CustomStageValidator.PRE_BOSS_TOTAL_SPAWN_WARNING) {
      issues.push(this.warning(
        'high_pre_boss_spawn_total',
        'Estimated pre-Boss enemy count is high and may overwhelm low-end devices.',
        'waves',
      ));
    }

    for (const wave of stagePackage.waves) {
      const overlapRate = stagePackage.waves
        .filter((otherWave) => this.wavesOverlap(wave, otherWave))
        .reduce((rate, otherWave) => rate + this.getWaveSpawnsPerMinute(otherWave), 0);

      if (overlapRate > CustomStageValidator.OVERLAP_SPAWNS_PER_MINUTE_WARNING) {
        issues.push(this.warning(
          'high_overlapping_wave_density',
          'Overlapping waves may spawn more than 600 enemies per minute.',
          'waves',
        ));
        return;
      }
    }
  }

  private validateId(
    id: string,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (!/^[a-z][a-z0-9_]*$/.test(id)) {
      issues.push(this.error(
        'invalid_id_format',
        'IDs must use lowercase letters, numbers, and underscores, and start with a letter.',
        path,
      ));
    }
  }

  private validateMapDimension(
    value: number,
    path: string,
    issues: CustomStageValidationIssue[],
  ): void {
    if (!Number.isFinite(value) || value <= 0) {
      issues.push(this.error('invalid_map_dimension', 'Map dimensions must be positive numbers.', path));
      return;
    }

    if (
      value < CustomStageValidator.MIN_MAP_SIZE
      || value > CustomStageValidator.MAX_MAP_SIZE
    ) {
      issues.push(this.warning(
        'map_dimension_risk',
        `Map dimensions should usually be between ${CustomStageValidator.MIN_MAP_SIZE} and ${CustomStageValidator.MAX_MAP_SIZE}.`,
        path,
      ));
    }
  }

  private warnIfBuiltinStageConflict(
    id: string,
    issues: CustomStageValidationIssue[],
    path: string,
  ): void {
    if (ContentRegistry.getStage(id)) {
      issues.push(this.error('builtin_stage_conflict', `Stage id conflicts with builtin stage: ${id}`, path));
    }
  }

  private warnIfBuiltinMapConflict(
    id: string,
    issues: CustomStageValidationIssue[],
    path: string,
  ): void {
    if (ContentRegistry.getMap(id)) {
      issues.push(this.error('builtin_map_conflict', `Map id conflicts with builtin map: ${id}`, path));
    }
  }

  private enemyExists(enemyId: string): boolean {
    return this.isNonEmptyString(enemyId) && ContentRegistry.getEnemy(enemyId) !== undefined;
  }

  private wavesOverlap(left: CustomWaveDefinition, right: CustomWaveDefinition): boolean {
    const leftEnd = this.getWaveEndTime(left);
    const rightEnd = this.getWaveEndTime(right);

    return left.startTime <= rightEnd && right.startTime <= leftEnd;
  }

  private getWaveEndTime(wave: CustomWaveDefinition): number {
    return wave.startTime + (wave.duration ?? wave.count * wave.interval);
  }

  private getWaveSpawnsPerMinute(wave: CustomWaveDefinition): number {
    if (wave.interval <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return (wave.count / wave.interval) * 60;
  }

  private getEstimatedWaveSpawnCount(wave: CustomWaveDefinition): number {
    if (wave.duration === undefined || wave.interval <= 0) {
      return wave.count;
    }

    return Math.ceil(wave.duration / wave.interval) * wave.count;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private error(
    code: string,
    message: string,
    path?: string,
  ): CustomStageValidationIssue {
    return { level: 'error', code, message, path };
  }

  private warning(
    code: string,
    message: string,
    path?: string,
  ): CustomStageValidationIssue {
    return { level: 'warning', code, message, path };
  }
}
