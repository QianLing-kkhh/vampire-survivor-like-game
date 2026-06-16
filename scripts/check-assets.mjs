import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicAssetsDir = path.join(root, 'public', 'assets');
const importsDir = path.join(publicAssetsDir, 'imports');
const importExampleManifestPath = path.join(importsDir, 'manifest.example.json');
const artRoots = [
  { label: 'art', dir: path.join(publicAssetsDir, 'art') },
  { label: 'art001', dir: path.join(publicAssetsDir, 'art001') },
];
const requiredArtDirs = ['player', 'enemies', 'weapons', 'passives', 'pickups', 'ui', 'world'];
const requiredManifestKeys = [
  'art_player_assassin_default_idle_down',
  'art_player_priest_default_idle_down',
  'art_player_witch_default_idle_down',
  'art_player_warrior_default_idle_down',
  'art_player_assassin_default_walk_sheet',
  'art_world_graveyard_ground_tile',
  'art_world_swamp_ground_tile',
  'art_world_ruins_ground_tile',
  'art_world_ground_tile',
];
const tieredWeaponIds = [
  'knife',
  'garlic',
  'bible',
  'magic_wand',
  'axe',
  'thousand_edge',
  'holy_wand',
  'death_spiral',
  'unholy_vespers',
  'soul_eater',
];
const tieredPassiveIds = [
  'spinach',
  'empty_tome',
  'bracer',
  'clover',
  'pummarola',
];
const excludedPathParts = [
  'debug/',
  'player_direction_fix_preview',
  'player_direction_fix_preview_v',
];
const excludedPathPatterns = [
  /^player\/[^/]+_default\/walk_sheet\.png$/,
];
const errors = [];

function addError(message) {
  errors.push(message);
}

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function resolveAssetPath(artDir, manifestPathValue) {
  const normalized = normalizePath(manifestPathValue);

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

function collectPngFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = normalizePath(path.relative(baseDir, fullPath));

    if (
      excludedPathParts.some((part) => relativePath.includes(part))
      || excludedPathPatterns.some((pattern) => pattern.test(relativePath))
    ) {
      return [];
    }

    if (entry.isDirectory()) {
      return collectPngFiles(fullPath, baseDir);
    }

    return entry.isFile() && entry.name.toLowerCase().endsWith('.png')
      ? [relativePath]
      : [];
  });
}

function getPngDimensions(filePath) {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(filePath, 'r');

  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  const pngSignature = '89504e470d0a1a0a';
  if (header.subarray(0, 8).toString('hex') !== pngSignature) {
    return undefined;
  }

  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  };
}

function getManifestPath(entry) {
  return entry.path ?? entry.file ?? entry.url;
}

function validateManifestEntry(label, artDir, entry, index) {
  const assetPath = getManifestPath(entry);
  if (typeof assetPath !== 'string' || assetPath.length === 0) {
    addError(`${label}: animation manifest entry ${index} is missing a path/file/url field.`);
    return undefined;
  }

  const resolved = resolveAssetPath(artDir, assetPath);
  if (!fs.existsSync(resolved)) {
    addError(`${label}: animation manifest references missing file: ${assetPath}`);
    return normalizePath(assetPath);
  }

  if (resolved.toLowerCase().endsWith('.png')) {
    validatePngEntry(label, entry, assetPath, resolved);
  }

  return normalizePath(assetPath);
}

function validatePngEntry(label, entry, assetPath, resolved) {
  const dimensions = getPngDimensions(resolved);

  if (!dimensions) {
    addError(`${label}: manifest entry is not a valid PNG: ${assetPath}`);
    return;
  }

  if (entry.type === 'spritesheet') {
    const frameWidth = entry.frameWidth;
    const frameHeight = entry.frameHeight;
    const frames = entry.frames;

    if (
      typeof frameWidth !== 'number'
      || typeof frameHeight !== 'number'
      || typeof frames !== 'number'
      || frameWidth <= 0
      || frameHeight <= 0
      || frames <= 0
    ) {
      addError(`${label}: invalid spritesheet frame spec for ${assetPath}`);
      return;
    }

    const columns = Math.floor(dimensions.width / frameWidth);
    const rows = Math.floor(dimensions.height / frameHeight);
    const cells = columns * rows;

    if (
      dimensions.width % frameWidth !== 0
      || dimensions.height % frameHeight !== 0
      || cells < frames
    ) {
      addError(
        `${label}: spritesheet frame spec does not fit ${assetPath}: `
        + `${dimensions.width}x${dimensions.height}, frame=${frameWidth}x${frameHeight}, frames=${frames}`,
      );
    }
  }
}

function validateArtRoot({ label, dir }) {
  const manifestPath = path.join(dir, 'animation_manifest.json');

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    addError(`Missing public/assets/${label} directory.`);
    return;
  }

  for (const dirName of requiredArtDirs) {
    const dirPath = path.join(dir, dirName);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      addError(`${label}: missing required art directory: public/assets/${label}/${dirName}`);
    }
  }

  if (!fs.existsSync(manifestPath)) {
    addError(`${label}: missing animation_manifest.json.`);
    return;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entries = collectManifestEntries(manifest);
    const manifestKeys = new Set();
    const manifestPaths = new Set();

    for (const [index, entry] of entries.entries()) {
      const key = entry.key;
      if (typeof key === 'string' && key.length > 0) {
        if (manifestKeys.has(key)) {
          addError(`${label}: duplicate animation manifest key: ${key}`);
        }
        manifestKeys.add(key);
      }

      const entryPath = validateManifestEntry(label, dir, entry, index);
      if (entryPath) {
        manifestPaths.add(entryPath);
      }
    }

    for (const key of requiredManifestKeys) {
      if (!manifestKeys.has(key)) {
        addError(`${label}: animation manifest is missing required key: ${key}`);
      }
    }

    if (label === 'art') {
      validateTierManifestKeys(label, manifestKeys);
    }

    for (const pngPath of collectPngFiles(dir).map(normalizePath)) {
      if (!manifestPaths.has(pngPath)) {
        addError(`${label}: PNG is not listed in animation manifest: ${pngPath}`);
      }
    }

    console.info(`[assets] Parsed ${label} animation manifest with ${entries.length} file references.`);
  } catch (error) {
    addError(`${label}: invalid animation_manifest.json: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateTierManifestKeys(label, manifestKeys) {
  for (const weaponId of tieredWeaponIds) {
    for (const tier of [1, 2, 3]) {
      for (const key of [
        `art_weapons_${weaponId}_icon_tier${tier}`,
        `art_weapons_${weaponId}_projectile_tier${tier}_sheet`,
      ]) {
        if (!manifestKeys.has(key)) {
          addError(`${label}: animation manifest is missing tier key: ${key}`);
        }
      }
    }
  }

  for (const passiveId of tieredPassiveIds) {
    for (const tier of [1, 2, 3]) {
      const key = `art_passives_${passiveId}_icon_tier${tier}`;

      if (!manifestKeys.has(key)) {
        addError(`${label}: animation manifest is missing tier key: ${key}`);
      }
    }
  }
}

if (!fs.existsSync(publicAssetsDir)) {
  addError('Missing public/assets directory.');
}

if (!fs.existsSync(importsDir) || !fs.statSync(importsDir).isDirectory()) {
  addError('Missing public/assets/imports directory.');
}

for (const artRoot of artRoots) {
  validateArtRoot(artRoot);
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
