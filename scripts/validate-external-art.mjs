import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const importsDir = path.join(root, 'public', 'assets', 'imports');
const manifestPath = path.join(importsDir, 'manifest.json');
const errors = [];
const warnings = [];

const validTypes = new Set(['spritesheet', 'image', 'effect', 'portrait', 'icon', 'ui']);
const validCategories = new Set([
  'player',
  'enemy',
  'boss',
  'weapon',
  'passive',
  'pickup',
  'world',
  'effect',
  'ui',
]);

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isSafeRelativePath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !value.includes('..')
    && !value.includes('\\');
}

function resolveAssetPath(manifest, assetPath) {
  const basePath = typeof manifest.basePath === 'string' && manifest.basePath.length > 0
    ? manifest.basePath
    : 'assets/imports';
  const normalizedBase = basePath.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '');

  if (normalizedBase.startsWith('public/')) {
    return path.join(root, normalizedBase, assetPath);
  }

  if (normalizedBase.startsWith('assets/')) {
    return path.join(root, 'public', normalizedBase, assetPath);
  }

  return path.join(importsDir, assetPath);
}

if (!fs.existsSync(manifestPath)) {
  console.info('No external art manifest found.');
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  addError(`Invalid external art manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (manifest) {
  if (!isObject(manifest)) {
    addError('Manifest must be an object.');
  } else {
    if (typeof manifest.version !== 'number') {
      addError('Manifest version must be a number.');
    }

    if (typeof manifest.basePath !== 'string' || manifest.basePath.length === 0) {
      addError('Manifest basePath must be a non-empty string.');
    }

    if (!Array.isArray(manifest.assets)) {
      addError('Manifest assets must be an array.');
    } else {
      const textureKeys = new Set();
      const animationKeys = new Set();

      for (const [index, asset] of manifest.assets.entries()) {
        const label = `Asset ${index}`;

        if (!isObject(asset)) {
          addError(`${label} must be an object.`);
          continue;
        }

        for (const field of ['id', 'type', 'category', 'path', 'textureKey']) {
          if (typeof asset[field] !== 'string' || asset[field].length === 0) {
            addError(`${label} is missing required string field: ${field}`);
          }
        }

        if (typeof asset.type === 'string' && !validTypes.has(asset.type)) {
          addError(`${label} has unsupported type: ${asset.type}`);
        }

        if (typeof asset.category === 'string' && !validCategories.has(asset.category)) {
          addError(`${label} has unsupported category: ${asset.category}`);
        }

        if (typeof asset.path === 'string') {
          if (!isSafeRelativePath(asset.path)) {
            addError(`${label} path must be relative and stay inside imports: ${asset.path}`);
          } else if (!fs.existsSync(resolveAssetPath(manifest, asset.path))) {
            addError(`${label} references missing file: ${asset.path}`);
          }

          if (!asset.path.toLowerCase().endsWith('.png')) {
            addWarning(`${label} path should point to a PNG file: ${asset.path}`);
          }
        }

        if (asset.type === 'spritesheet') {
          if (!isPositiveNumber(asset.frameWidth)) {
            addError(`${label} spritesheet requires frameWidth.`);
          }

          if (!isPositiveNumber(asset.frameHeight)) {
            addError(`${label} spritesheet requires frameHeight.`);
          }

          if (asset.frameCount !== undefined && !isPositiveNumber(asset.frameCount)) {
            addError(`${label} frameCount must be a positive number when provided.`);
          }
        }

        if (typeof asset.textureKey === 'string') {
          if (textureKeys.has(asset.textureKey)) {
            addError(`Duplicate textureKey: ${asset.textureKey}`);
          }
          textureKeys.add(asset.textureKey);
        }

        if (typeof asset.animationKey === 'string' && asset.animationKey.length > 0) {
          if (animationKeys.has(asset.animationKey)) {
            addError(`Duplicate animationKey: ${asset.animationKey}`);
          }
          animationKeys.add(asset.animationKey);
        }
      }
    }
  }
}

for (const warning of warnings) {
  console.warn(`[external-art] Warning: ${warning}`);
}

if (errors.length > 0) {
  console.error('[external-art] Validation failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.info('[external-art] External art validation passed.');
