import fs from 'node:fs';
import path from 'node:path';

import {
  composeGrid,
  composeHorizontalStrip,
  copyFrameToCanvas,
  cropImage,
  readPng,
  resizeImage,
  writePng,
} from './png_utils.mjs';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ART_DIR = path.join(PUBLIC_DIR, 'assets', 'art');
const REFINED_DIR = path.join(PUBLIC_DIR, 'assets', 'imports', 'refined_art');
const TARGET_DIR = path.join(PUBLIC_DIR, 'assets', 'art001');
const TARGET_PLAYER_DIR = path.join(TARGET_DIR, 'player');
const RENDER_PLAYER_DIR = path.join(PUBLIC_DIR, 'assets', 'art001_render_tmp', 'player');
const MANIFEST_PATH = path.join(TARGET_DIR, 'animation_manifest.json');
const DEBUG_DIR = path.join(TARGET_DIR, 'debug');

const PLAYER_SKINS = ['assassin_default', 'witch_default', 'priest_default', 'warrior_default'];
const DIRECTIONS = ['up', 'up_right', 'right', 'down_right', 'down', 'down_left', 'left', 'up_left'];
const RENDER_STATES = ['walk', 'idle'];
const NON_PLAYER_CATEGORIES = ['enemies', 'effects', 'weapons', 'ui', 'passives', 'pickups', 'world', 'map-mechanics'];
const FRAME_SIZE = 80;
const FALLBACK_FOOT_Y = 74;
const LUMA_ADJUST_BY_SKIN = {
  assassin_default: 0.905,
  witch_default: 0.93,
  priest_default: 0.95,
  warrior_default: 0.95,
};
const FRAME_FIT_SCALE_BY_SKIN = {
  assassin_default: 1.0,
  witch_default: 1.0,
  priest_default: 1.0,
  warrior_default: 0.86,
};

const SPECIAL_FX = {
  assassin_default: ['blink_trail', 'blink_flash'],
  witch_default: ['slow_zone'],
  priest_default: ['sanctuary_circle'],
  warrior_default: ['counter_wave'],
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clearDir(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyDir(src, dst) {
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    return;
  }

  ensureDir(path.dirname(dst));
  fs.cpSync(src, dst, { recursive: true });
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function collectManifestAssets(manifest) {
  if (!manifest || !Array.isArray(manifest.assets)) {
    return [];
  }

  return manifest.assets.filter((entry) => (
    entry
    && typeof entry === 'object'
    && typeof entry.key === 'string'
    && typeof entry.path === 'string'
  ));
}

function isPlayerAssetKey(key) {
  return /^art_player_(?:assassin_default|witch_default|priest_default|warrior_default)_/.test(key)
    || /^art_player_player_/.test(key);
}

function copyCategory(category) {
  const refined = path.join(REFINED_DIR, category);
  const baseline = path.join(ART_DIR, category);
  const target = path.join(TARGET_DIR, category);
  if (fs.existsSync(baseline)) {
    copyDir(baseline, target);
  }
  if (fs.existsSync(refined)) {
    copyDir(refined, target);
  }
}

function copyNonPlayerAssets() {
  for (const category of NON_PLAYER_CATEGORIES) {
    copyCategory(category);
  }
}

function createBlankFrame(width, height) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4) };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyPostTone(png, skinId) {
  const tone = LUMA_ADJUST_BY_SKIN[skinId];
  if (typeof tone !== "number" || tone === 1.0) {
    return png;
  }

  const out = {
    width: png.width,
    height: png.height,
    pixels: new Uint8ClampedArray(png.pixels.length),
  };

  for (let i = 0; i < png.pixels.length; i += 4) {
    out.pixels[i] = clamp(Math.round(png.pixels[i] * tone), 0, 255);
    out.pixels[i + 1] = clamp(Math.round(png.pixels[i + 1] * tone), 0, 255);
    out.pixels[i + 2] = clamp(Math.round(png.pixels[i + 2] * tone), 0, 255);
    out.pixels[i + 3] = png.pixels[i + 3];
  }

  return out;
}

function alphaBoundingBox(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let nonTransparent = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alphaOffset = (y * png.width + x) * 4 + 3;
      if (png.pixels[alphaOffset] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        nonTransparent += 1;
      }
    }
  }

  return {
    nonTransparent,
    minX,
    maxX,
    minY,
    maxY,
    width: nonTransparent > 0 ? (maxX - minX + 1) : 0,
    height: nonTransparent > 0 ? (maxY - minY + 1) : 0,
  };
}

function normalizeFrameToCanvas(png, targetSize = FRAME_SIZE, fitScale = 1.0) {
  const bbox = alphaBoundingBox(png);
  if (bbox.nonTransparent === 0) {
    return createBlankFrame(targetSize, targetSize);
  }

  const cropped = cropImage(png, bbox.minX, bbox.minY, bbox.width, bbox.height);
  const inset = 4;
  const availableW = Math.max(1, targetSize - inset * 2);
  const availableH = Math.max(1, targetSize - inset * 2);
  const scale = Math.min(availableW / cropped.width, availableH / cropped.height, fitScale);
  const scaledW = Math.max(1, Math.floor(cropped.width * scale));
  const scaledH = Math.max(1, Math.floor(cropped.height * scale));
  const resized = resizeImage(cropped, scaledW, scaledH);

  const out = createBlankFrame(targetSize, targetSize);
  const x = Math.floor((targetSize - scaledW) / 2);
  const y = clamp(FALLBACK_FOOT_Y - scaledH, inset, targetSize - scaledH);

  for (let sourceY = 0; sourceY < resized.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < resized.width; sourceX += 1) {
      const srcOffset = (sourceY * resized.width + sourceX) * 4;
      const dstX = x + sourceX;
      const dstY = y + sourceY;
      if (dstX < 0 || dstX >= targetSize || dstY < 0 || dstY >= targetSize) {
        continue;
      }
      const dstOffset = (dstY * targetSize + dstX) * 4;
      out.pixels[dstOffset] = resized.pixels[srcOffset];
      out.pixels[dstOffset + 1] = resized.pixels[srcOffset + 1];
      out.pixels[dstOffset + 2] = resized.pixels[srcOffset + 2];
      out.pixels[dstOffset + 3] = resized.pixels[srcOffset + 3];
    }
  }

  return out;
}

function clearDirectionalTargets(skinTargetDir) {
  for (const direction of DIRECTIONS) {
    for (const state of RENDER_STATES) {
      const filePath = path.join(skinTargetDir, `${state}_${direction}.png`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  const generatedSheets = [
    path.join(skinTargetDir, 'walk_8dir_sheet.png'),
    path.join(skinTargetDir, 'idle_8dir_sheet.png'),
    path.join(skinTargetDir, 'walk_sheet.png'),
    path.join(skinTargetDir, 'walk_down.png'),
    path.join(skinTargetDir, 'idle_down.png'),
  ];
  for (const candidate of generatedSheets) {
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
}

function copyPlayerSupplement(skinId, skinTargetDir) {
  const refinedSource = path.join(REFINED_DIR, 'player', skinId);
  const artSource = path.join(ART_DIR, 'player', skinId);
  const supplementalFiles = [
    'portrait.png',
    'hit_fx.png',
    ...SPECIAL_FX[skinId] ?? [],
  ];

  for (const fileName of supplementalFiles) {
    const sourceFile = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    const source = fs.existsSync(path.join(refinedSource, sourceFile))
      ? path.join(refinedSource, sourceFile)
      : path.join(artSource, sourceFile);

    if (!fs.existsSync(source)) {
      if (fileName.endsWith('.png')) {
        console.warn(`[art001] Missing player supplement file for ${skinId}: ${sourceFile}`);
      }
      continue;
    }

    ensureDir(skinTargetDir);
    fs.copyFileSync(source, path.join(skinTargetDir, sourceFile));
  }
}

function resolveRenderedDirectionFrames(skinDir, state, direction) {
  const files = [];
  for (let frame = 0; frame < 4; frame += 1) {
    const filePath = path.join(skinDir, `${state}_${direction}_${frame}.png`);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    files.push(filePath);
  }
  return files;
}

function composeDirectionFromFrames(skinDir, state, direction, outputPath, skinId, fitScale = 1.0) {
  const framePaths = resolveRenderedDirectionFrames(skinDir, state, direction);
  if (framePaths.length !== 4) {
    return false;
  }

  const frames = framePaths.map((filePath) => normalizeFrameToCanvas(readPng(filePath), FRAME_SIZE, fitScale));
  const frame0 = frames[0];
  for (const frame of frames) {
    if (frame.width !== frame0.width || frame.height !== frame0.height || frame.width !== FRAME_SIZE || frame.height !== FRAME_SIZE) {
      return false;
    }
  }

  const sheet = composeHorizontalStrip(frames, frame0.width, frame0.height);
  const toned = applyPostTone(sheet, skinId);
  writePng(outputPath, toned);
  return true;
}

function compose8DirSheet(skinDir, state, outputPath, skinId, fitScale = 1.0) {
  const rows = [];
  for (const direction of DIRECTIONS) {
    const framePaths = resolveRenderedDirectionFrames(skinDir, state, direction);
    if (framePaths.length !== 4) {
      return false;
    }
    const rowFrames = framePaths.map((filePath) => normalizeFrameToCanvas(readPng(filePath), FRAME_SIZE, fitScale));
    const rowWidth = rowFrames[0].width;
    const rowHeight = rowFrames[0].height;
    rows.push(composeHorizontalStrip(rowFrames, rowWidth, rowHeight));
  }

  const width = rows[0].width;
  const height = rows[0].height * DIRECTIONS.length;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    copyFrameToCanvas(pixels, width, height, rows[rowIndex], 0, rowIndex * rows[0].height);
  }

  const sheet = { width, height, pixels };
  const toned = applyPostTone(sheet, skinId);
  writePng(outputPath, toned);
  return true;
}

function writeFallbackWalkSheet(skinTargetDir, skinId) {
  const downSheetPath = path.join(skinTargetDir, 'walk_down.png');
  if (!fs.existsSync(downSheetPath)) {
    return;
  }

  const downSheet = readPng(downSheetPath);
  const fallback = resizeImage(downSheet, 256, 64);
  writePng(path.join(TARGET_PLAYER_DIR, `${skinId}_walk_sheet.png`), fallback);
  writePng(path.join(skinTargetDir, 'walk_sheet.png'), fallback);
}

function composeOrCopyPlayer(skinId) {
  const skinTargetDir = path.join(TARGET_PLAYER_DIR, skinId);
  const renderedSkinDir = path.join(RENDER_PLAYER_DIR, skinId);
  ensureDir(skinTargetDir);
  clearDirectionalTargets(skinTargetDir);
  copyPlayerSupplement(skinId, skinTargetDir);

  const hasRendered = RENDER_STATES.every((state) => (
    DIRECTIONS.every((direction) => {
      for (let frame = 0; frame < 4; frame += 1) {
        const renderedPath = path.join(renderedSkinDir, `${state}_${direction}_${frame}.png`);
        if (!fs.existsSync(renderedPath)) {
          return false;
        }
      }
      return true;
    })
  ));

  if (hasRendered) {
    let composedAll = true;
    const fitScale = FRAME_FIT_SCALE_BY_SKIN[skinId] ?? 1.0;
    for (const state of RENDER_STATES) {
      for (const direction of DIRECTIONS) {
        composedAll = composedAll && composeDirectionFromFrames(
          renderedSkinDir,
          state,
          direction,
          path.join(skinTargetDir, `${state}_${direction}.png`),
          skinId,
          fitScale,
        );
      }
    }
    composedAll = composedAll && compose8DirSheet(
      renderedSkinDir,
      'walk',
      path.join(skinTargetDir, 'walk_8dir_sheet.png'),
      skinId,
      fitScale,
    );
    composedAll = composedAll && compose8DirSheet(
      renderedSkinDir,
      'idle',
      path.join(skinTargetDir, 'idle_8dir_sheet.png'),
      skinId,
      fitScale,
    );

    if (!composedAll) {
      console.warn(`[art001] Rendered direction frames are incomplete for ${skinId}, using rendered assets where available.`);
    }
  }

  if (fs.existsSync(path.join(skinTargetDir, `walk_${DIRECTIONS[0]}.png`))) {
    writeFallbackWalkSheet(skinTargetDir, skinId);
  }
}

function copyPlayerAssets() {
  ensureDir(TARGET_PLAYER_DIR);
  for (const skinId of PLAYER_SKINS) {
    composeOrCopyPlayer(skinId);
  }

  const commonDown = path.join(TARGET_PLAYER_DIR, 'assassin_default', 'walk_down.png');
  if (fs.existsSync(commonDown)) {
    const down = readPng(commonDown);
    writePng(path.join(TARGET_PLAYER_DIR, 'player_walk_sheet.png'), resizeImage(down, 256, 64));
  }
}

function makePlayerManifestEntries() {
  const entries = [];

  for (const skinId of PLAYER_SKINS) {
    const playerDir = path.join(TARGET_PLAYER_DIR, skinId);
    for (const direction of DIRECTIONS) {
      const walkPath = path.join(playerDir, `walk_${direction}.png`);
      const idlePath = path.join(playerDir, `idle_${direction}.png`);
      if (fs.existsSync(walkPath)) {
        entries.push({
          path: `player/${skinId}/walk_${direction}.png`,
          key: `art_player_${skinId}_walk_${direction}`,
          type: 'spritesheet',
          frameWidth: 80,
          frameHeight: 80,
          frames: 4,
        });
      }

      if (fs.existsSync(idlePath)) {
        entries.push({
          path: `player/${skinId}/idle_${direction}.png`,
          key: `art_player_${skinId}_idle_${direction}`,
          type: 'spritesheet',
          frameWidth: 80,
          frameHeight: 80,
          frames: 4,
        });
      }
    }

    for (const sheet of ['walk_8dir_sheet.png', 'idle_8dir_sheet.png']) {
      const candidate = path.join(playerDir, sheet);
      if (fs.existsSync(candidate)) {
        entries.push({
          path: `player/${skinId}/${sheet}`,
          key: `art_player_${skinId}_${sheet.replace('.png', '')}`,
          type: 'spritesheet',
          frameWidth: 80,
          frameHeight: 80,
          frames: 32,
        });
      }
    }

    const fallbackWalkPath = path.join(TARGET_PLAYER_DIR, `${skinId}_walk_sheet.png`);
    if (fs.existsSync(fallbackWalkPath)) {
      entries.push({
        path: `player/${skinId}_walk_sheet.png`,
        key: `art_player_${skinId}_walk_sheet`,
        type: 'spritesheet',
        frameWidth: 64,
        frameHeight: 64,
        frames: 4,
      });
    }

    for (const walkDownFile of ['portrait.png', 'hit_fx.png']) {
      if (!fs.existsSync(path.join(playerDir, walkDownFile))) {
        continue;
      }
      if (walkDownFile === 'portrait.png') {
        entries.push({
          path: `player/${skinId}/portrait.png`,
          key: `art_player_${skinId}_portrait`,
          type: 'image',
          frameWidth: 128,
          frameHeight: 128,
          frames: 1,
        });
      } else if (walkDownFile === 'hit_fx.png') {
        entries.push({
          path: `player/${skinId}/hit_fx.png`,
          key: `art_player_${skinId}_hit_fx`,
          type: 'image',
          frameWidth: 96,
          frameHeight: 96,
          frames: 1,
        });
      }
    }

    for (const fxName of SPECIAL_FX[skinId] ?? []) {
      const fxPath = path.join(playerDir, `${fxName}.png`);
      if (!fs.existsSync(fxPath)) {
        continue;
      }

      let frameWidth = 192;
      let frameHeight = 192;
      if (skinId === 'assassin_default' && fxName === 'blink_trail') {
        frameWidth = 128;
        frameHeight = 64;
      } else if (skinId === 'assassin_default' && fxName === 'blink_flash') {
        frameWidth = 96;
        frameHeight = 96;
      } else if (skinId === 'priest_default' && fxName === 'sanctuary_circle') {
        frameWidth = 224;
        frameHeight = 224;
      }

      entries.push({
        path: `player/${skinId}/${fxName}.png`,
        key: `art_player_${skinId}_${fxName}`,
        type: 'image',
        frameWidth,
        frameHeight,
        frames: 1,
      });
    }
  }

  const fallbackGlobal = path.join(TARGET_PLAYER_DIR, 'player_walk_sheet.png');
  if (fs.existsSync(fallbackGlobal)) {
    entries.push({
      path: 'player/player_walk_sheet.png',
      key: 'art_player_player_walk_sheet',
      type: 'spritesheet',
      frameWidth: 64,
      frameHeight: 64,
      frames: 4,
    });
  }

  return entries;
}

function mergeManifest() {
  const baseManifest = readJsonSafe(path.join(ART_DIR, 'animation_manifest.json'));
  const refinedManifest = readJsonSafe(path.join(REFINED_DIR, 'animation_manifest.json'));
  const merged = new Map();

  for (const entry of collectManifestAssets(refinedManifest)) {
    merged.set(entry.key, entry);
  }
  for (const entry of collectManifestAssets(baseManifest)) {
    if (!merged.has(entry.key)) {
      merged.set(entry.key, entry);
    }
  }

  for (const key of [...merged.keys()]) {
    if (isPlayerAssetKey(key)) {
      merged.delete(key);
    }
  }

  for (const entry of makePlayerManifestEntries()) {
    merged.set(entry.key, entry);
  }

  return {
    version: 'vsg-final-art001-20260606',
    style: 'art001',
    root: 'public/assets/art001/',
    notes: [
      'Generated by scripts/art001/build_art001_pack.mjs',
      'Player walk/idle directions are 80x80 with 4 frames.',
      'Directional order: up, up_right, right, down_right, down, down_left, left, up_left.',
    ],
    assets: [...merged.values()],
  };
}

function copyCentered(canvasPixels, canvasWidth, canvasHeight, sourcePng, cellX, cellY, cellWidth, cellHeight) {
  const x = Math.max(0, Math.floor((cellWidth - sourcePng.width) / 2));
  const y = Math.max(0, Math.floor((cellHeight - sourcePng.height) / 2));
  for (let sourceY = 0; sourceY < sourcePng.height; sourceY += 1) {
    for (let sourceX = 0; sourceX < sourcePng.width; sourceX += 1) {
      const dstX = cellX + x + sourceX;
      const dstY = cellY + y + sourceY;
      if (dstX >= canvasWidth || dstY >= canvasHeight) {
        continue;
      }
      const sourceOffset = (sourceY * sourcePng.width + sourceX) * 4;
      const dstOffset = (dstY * canvasWidth + dstX) * 4;
      canvasPixels[dstOffset] = sourcePng.pixels[sourceOffset];
      canvasPixels[dstOffset + 1] = sourcePng.pixels[sourceOffset + 1];
      canvasPixels[dstOffset + 2] = sourcePng.pixels[sourceOffset + 2];
      canvasPixels[dstOffset + 3] = sourcePng.pixels[sourceOffset + 3];
    }
  }
}

function composeFixedGrid(frames, cellWidth, cellHeight, columns) {
  const cols = Math.max(1, Math.min(columns, Math.max(1, frames.length)));
  const rows = Math.ceil(frames.length / cols);
  const width = cols * cellWidth;
  const height = rows * cellHeight;
  const pixels = new Uint8ClampedArray(width * height * 4);
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const frame = frames[index];
      if (!frame) {
        break;
      }
      copyCentered(pixels, width, height, frame, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
      index += 1;
    }
  }

  return { width, height, pixels };
}

function collectCategoryThumbnails(categoryRelativePath, maxItems) {
  const categoryDir = path.join(TARGET_DIR, categoryRelativePath);
  const images = [];

  if (!fs.existsSync(categoryDir) || !fs.statSync(categoryDir).isDirectory()) {
    return images;
  }

  const stack = [categoryDir];
  while (stack.length > 0 && images.length < maxItems) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (images.length >= maxItems) {
        break;
      }

      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        try {
          images.push(readPng(entryPath));
        } catch {
          continue;
        }
      }
    }
  }

  return images;
}

function createDirectionPreview() {
  const previewFrames = [];
  for (const skinId of PLAYER_SKINS) {
    for (const direction of DIRECTIONS) {
      const spritePath = path.join(TARGET_PLAYER_DIR, skinId, `walk_${direction}.png`);
      if (fs.existsSync(spritePath)) {
        const sheet = readPng(spritePath);
        previewFrames.push(cropImage(sheet, 0, 0, FRAME_SIZE, FRAME_SIZE));
      } else {
        previewFrames.push(createBlankFrame(FRAME_SIZE, FRAME_SIZE));
      }
    }
  }

  const preview = composeGrid(previewFrames, FRAME_SIZE, FRAME_SIZE, 8);
  writePng(path.join(DEBUG_DIR, 'player_direction_preview.png'), preview);
}

function create8DirPreview() {
  const previews = [];
  for (const skinId of PLAYER_SKINS) {
    const walk8 = path.join(TARGET_PLAYER_DIR, skinId, 'walk_8dir_sheet.png');
    if (fs.existsSync(walk8)) {
      previews.push(readPng(walk8));
    }
  }

  if (previews.length === 0) {
    return;
  }

  const maxWidth = Math.max(...previews.map((entry) => entry.width));
  const height = previews.reduce((sum, image) => sum + image.height, 0);
  const pixels = new Uint8ClampedArray(maxWidth * height * 4);
  let y = 0;
  for (const image of previews) {
    copyFrameToCanvas(pixels, maxWidth, height, image, 0, y);
    y += image.height;
  }

  writePng(path.join(DEBUG_DIR, 'player_8dir_sheet_preview.png'), { width: maxWidth, height, pixels });
}

function createArtPackOverview() {
  const directionPreview = path.join(DEBUG_DIR, 'player_direction_preview.png');
  const sheetPreview = path.join(DEBUG_DIR, 'player_8dir_sheet_preview.png');
  const baseFrames = [directionPreview, sheetPreview];
  const frames = baseFrames
    .filter((item) => fs.existsSync(item))
    .map((item) => readPng(item));

  const categoryThumbnails = [
    ...collectCategoryThumbnails('enemies', 6),
    ...collectCategoryThumbnails('effects', 6),
    ...collectCategoryThumbnails('weapons', 6),
    ...collectCategoryThumbnails('ui', 6),
    ...collectCategoryThumbnails('passives', 6),
    ...collectCategoryThumbnails('pickups', 4),
    ...collectCategoryThumbnails('map-mechanics', 6),
  ];
  frames.push(...categoryThumbnails);

  if (frames.length === 0) {
    return;
  }

  const cellSize = Math.min(...frames.map((frame) => Math.max(32, Math.min(frame.width, frame.height))));
  const sheet = composeFixedGrid(frames, Math.max(128, cellSize), Math.max(128, cellSize), 5);
  writePng(path.join(DEBUG_DIR, 'art_pack_overview.png'), sheet);
}

function writeManifest(manifest) {
  const payload = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(MANIFEST_PATH, `${payload}\n`);
}

function main() {
  clearDir(TARGET_DIR);
  ensureDir(TARGET_DIR);
  copyNonPlayerAssets();
  copyPlayerAssets();
  const manifest = mergeManifest();
  writeManifest(manifest);
  ensureDir(DEBUG_DIR);
  createDirectionPreview();
  create8DirPreview();
  createArtPackOverview();
}

main();
