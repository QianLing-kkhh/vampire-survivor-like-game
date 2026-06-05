import {
  ExternalArtAsset,
  ExternalArtAssetCategory,
  ExternalArtAssetDirection,
  ExternalArtAssetType,
  ExternalArtManifest,
} from './ExternalArtManifest';

export type ExternalArtValidationResult = {
  errors: string[];
  warnings: string[];
};

const VALID_TYPES: readonly ExternalArtAssetType[] = [
  'spritesheet',
  'image',
  'effect',
  'portrait',
  'icon',
  'ui',
];

const VALID_CATEGORIES: readonly ExternalArtAssetCategory[] = [
  'player',
  'enemy',
  'boss',
  'weapon',
  'passive',
  'pickup',
  'world',
  'effect',
  'ui',
];

const VALID_DIRECTIONS: readonly ExternalArtAssetDirection[] = [
  'up',
  'up_right',
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
];

export class ExternalArtValidator {
  static validateManifest(value: unknown): ExternalArtValidationResult {
    const result = ExternalArtValidator.createResult();

    if (!ExternalArtValidator.isObject(value)) {
      result.errors.push('Manifest must be an object.');
      return result;
    }

    if (typeof value.version !== 'number') {
      result.errors.push('Manifest version must be a number.');
    }

    if (typeof value.basePath !== 'string' || value.basePath.length === 0) {
      result.errors.push('Manifest basePath must be a non-empty string.');
    }

    if (!Array.isArray(value.assets)) {
      result.errors.push('Manifest assets must be an array.');
      return result;
    }

    for (const [index, asset] of value.assets.entries()) {
      ExternalArtValidator.mergeResult(
        result,
        ExternalArtValidator.validateAsset(asset, index),
      );
    }

    ExternalArtValidator.validateDuplicateKeys(value as unknown as ExternalArtManifest, result);

    return result;
  }

  static validateAsset(value: unknown, index = 0): ExternalArtValidationResult {
    const result = ExternalArtValidator.createResult();
    const label = `Asset ${index}`;

    if (!ExternalArtValidator.isObject(value)) {
      result.errors.push(`${label} must be an object.`);
      return result;
    }

    ExternalArtValidator.validateRequiredFields(value, label, result);
    ExternalArtValidator.validatePathFormat(value, label, result);
    ExternalArtValidator.validateFrameInfo(value, label, result);

    if (typeof value.type === 'string' && !VALID_TYPES.includes(value.type as ExternalArtAssetType)) {
      result.errors.push(`${label} has unsupported type: ${value.type}`);
    }

    if (
      typeof value.category === 'string'
      && !VALID_CATEGORIES.includes(value.category as ExternalArtAssetCategory)
    ) {
      result.errors.push(`${label} has unsupported category: ${value.category}`);
    }

    if (
      typeof value.direction === 'string'
      && !VALID_DIRECTIONS.includes(value.direction as ExternalArtAssetDirection)
    ) {
      result.errors.push(`${label} has unsupported direction: ${value.direction}`);
    }

    return result;
  }

  static validateRequiredFields(
    asset: Record<string, unknown>,
    label: string,
    result: ExternalArtValidationResult,
  ): void {
    for (const field of ['id', 'type', 'category', 'path', 'textureKey']) {
      if (typeof asset[field] !== 'string' || asset[field].length === 0) {
        result.errors.push(`${label} is missing required string field: ${field}`);
      }
    }
  }

  static validateDuplicateKeys(
    manifest: ExternalArtManifest,
    result: ExternalArtValidationResult,
  ): void {
    const textureKeys = new Set<string>();
    const animationKeys = new Set<string>();

    for (const asset of manifest.assets) {
      if (textureKeys.has(asset.textureKey)) {
        result.errors.push(`Duplicate textureKey: ${asset.textureKey}`);
      }
      textureKeys.add(asset.textureKey);

      if (!asset.animationKey) {
        continue;
      }

      if (animationKeys.has(asset.animationKey)) {
        result.errors.push(`Duplicate animationKey: ${asset.animationKey}`);
      }
      animationKeys.add(asset.animationKey);
    }
  }

  static validatePathFormat(
    asset: Record<string, unknown>,
    label: string,
    result: ExternalArtValidationResult,
  ): void {
    if (typeof asset.path !== 'string') {
      return;
    }

    if (asset.path.startsWith('/') || asset.path.includes('..') || asset.path.includes('\\')) {
      result.errors.push(`${label} path must be relative and stay inside imports: ${asset.path}`);
    }

    if (!asset.path.toLowerCase().endsWith('.png')) {
      result.warnings.push(`${label} path should point to a PNG file: ${asset.path}`);
    }
  }

  static validateFrameInfo(
    asset: Record<string, unknown>,
    label: string,
    result: ExternalArtValidationResult,
  ): void {
    if (asset.type !== 'spritesheet') {
      return;
    }

    if (!ExternalArtValidator.isPositiveNumber(asset.frameWidth)) {
      result.errors.push(`${label} spritesheet requires frameWidth.`);
    }

    if (!ExternalArtValidator.isPositiveNumber(asset.frameHeight)) {
      result.errors.push(`${label} spritesheet requires frameHeight.`);
    }

    if (asset.frameCount !== undefined && !ExternalArtValidator.isPositiveNumber(asset.frameCount)) {
      result.errors.push(`${label} frameCount must be a positive number when provided.`);
    }
  }

  private static createResult(): ExternalArtValidationResult {
    return { errors: [], warnings: [] };
  }

  private static mergeResult(
    target: ExternalArtValidationResult,
    next: ExternalArtValidationResult,
  ): void {
    target.errors.push(...next.errors);
    target.warnings.push(...next.warnings);
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private static isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }
}
