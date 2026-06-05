import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicAssetsDir = path.join(root, 'public', 'assets');
const artDir = path.join(publicAssetsDir, 'art');
const importsDir = path.join(publicAssetsDir, 'imports');
const importExampleManifestPath = path.join(importsDir, 'manifest.example.json');
const manifestPath = path.join(artDir, 'animation_manifest.json');
const requiredArtDirs = ['player', 'enemies', 'weapons', 'passives', 'pickups', 'ui'];
const errors = [];

function addError(message) {
  errors.push(message);
}

function resolveAssetPath(manifestPathValue) {
  const normalized = manifestPathValue.replaceAll('\\', '/');

  if (normalized.startsWith('public/')) {
    return path.join(root, normalized);
  }

  if (normalized.startsWith('assets/')) {
    return path.join(root, 'public', normalized);
  }

  return path.join(artDir, normalized);
}

function collectManifestEntries(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectManifestEntries);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (typeof value.path === 'string' || typeof value.file === 'string' || typeof value.url === 'string') {
    return [value];
  }

  return Object.values(value).flatMap(collectManifestEntries);
}

if (!fs.existsSync(publicAssetsDir)) {
  addError('Missing public/assets directory.');
}

if (!fs.existsSync(artDir)) {
  addError('Missing public/assets/art directory.');
}

if (!fs.existsSync(importsDir) || !fs.statSync(importsDir).isDirectory()) {
  addError('Missing public/assets/imports directory.');
}

for (const dirName of requiredArtDirs) {
  const dirPath = path.join(artDir, dirName);
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    addError(`Missing required art directory: public/assets/art/${dirName}`);
  }
}

if (!fs.existsSync(manifestPath)) {
  addError('Missing public/assets/art/animation_manifest.json.');
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entries = collectManifestEntries(manifest);

    for (const [index, entry] of entries.entries()) {
      const assetPath = entry.path ?? entry.file ?? entry.url;
      if (typeof assetPath !== 'string' || assetPath.length === 0) {
        addError(`Animation manifest entry ${index} is missing a path/file/url field.`);
        continue;
      }

      const resolved = resolveAssetPath(assetPath);
      if (!fs.existsSync(resolved)) {
        addError(`Animation manifest references missing file: ${assetPath}`);
      }
    }

    console.info(`[assets] Parsed animation manifest with ${entries.length} file references.`);
  } catch (error) {
    addError(`Invalid animation_manifest.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (fs.existsSync(importExampleManifestPath)) {
  try {
    JSON.parse(fs.readFileSync(importExampleManifestPath, 'utf8'));
    console.info('[assets] Parsed external art example manifest.');
  } catch (error) {
    addError(`Invalid public/assets/imports/manifest.example.json: ${
      error instanceof Error ? error.message : String(error)
    }`);
  }
}

if (errors.length > 0) {
  console.error('[assets] Asset audit failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.info('[assets] Asset checks passed.');
