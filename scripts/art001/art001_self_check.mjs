import fs from 'node:fs';
import path from 'node:path';

import { readPng, sha1Hash } from './png_utils.mjs';

const ROOT_DIR = process.cwd();
const ART_DIR = path.join(ROOT_DIR, 'public', 'assets', 'art001');
const REFERENCE_ART_DIR = path.join(ROOT_DIR, 'public', 'assets', 'art');
const MANIFEST_PATH = path.join(ART_DIR, 'animation_manifest.json');

const SKINS = ['assassin_default', 'witch_default', 'priest_default', 'warrior_default'];
const DIRECTIONS = ['up', 'up_right', 'right', 'down_right', 'down', 'down_left', 'left', 'up_left'];
const STATES = ['walk', 'idle'];

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

function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function addCheck(result, name, passed, details) {
  if (!passed) {
    result.pass = false;
  }

  result.checks.push({
    name,
    passed,
    details,
  });
}

function countNonTransparentPixels(png) {
  let count = 0;
  for (let i = 3; i < png.pixels.length; i += 4) {
    if (png.pixels[i] > 0) {
      count += 1;
    }
  }
  return count;
}

function countNonEmptyFrame(png, frameWidth, frameHeight, frameIndex) {
  const x0 = frameIndex * frameWidth;
  let nonTransparent = 0;

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const offset = ((y * png.width + (x0 + x)) * 4) + 3;
      if (png.pixels[offset] > 0) {
        nonTransparent += 1;
      }
    }
  }

  return nonTransparent;
}

function mirrorHorizontal(png) {
  const out = new Uint8ClampedArray(png.pixels.length);
  const { width, height } = png;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = (y * width + (width - 1 - x)) * 4;
      out[dstOffset] = png.pixels[srcOffset];
      out[dstOffset + 1] = png.pixels[srcOffset + 1];
      out[dstOffset + 2] = png.pixels[srcOffset + 2];
      out[dstOffset + 3] = png.pixels[srcOffset + 3];
    }
  }

  return { width, height, pixels: out };
}

function alphaBox(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let nonTransparent = 0;
  let alphaSum = 0;
  let rgbSum = 0;
  let satSum = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const srcOffset = (y * png.width + x) * 4;
      const alpha = png.pixels[srcOffset + 3];
      if (alpha > 0) {
        const r = png.pixels[srcOffset];
        const g = png.pixels[srcOffset + 1];
        const b = png.pixels[srcOffset + 2];
        nonTransparent += 1;
        alphaSum += alpha;
        rgbSum += (r + g + b) / 3;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        satSum += max > 0 ? (max - min) / max : 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (nonTransparent === 0) {
    return {
      nonTransparent: 0,
      alphaRatio: 0,
      meanAlpha: 0,
      meanLuma: 0,
      meanSaturation: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  return {
    nonTransparent,
    alphaRatio: nonTransparent / (png.width * png.height),
    meanAlpha: alphaSum / nonTransparent,
    meanLuma: rgbSum / nonTransparent,
    meanSaturation: satSum / nonTransparent,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function cropFrame(png, frameWidth, frameHeight, frameIndex) {
  const x = frameIndex * frameWidth;
  const pixels = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  for (let y = 0; y < frameHeight; y += 1) {
    for (let x1 = 0; x1 < frameWidth; x1 += 1) {
      const sourceOffset = ((y * png.width) + (x + x1)) * 4;
      const destOffset = ((y * frameWidth) + x1) * 4;
      pixels[destOffset] = png.pixels[sourceOffset];
      pixels[destOffset + 1] = png.pixels[sourceOffset + 1];
      pixels[destOffset + 2] = png.pixels[sourceOffset + 2];
      pixels[destOffset + 3] = png.pixels[sourceOffset + 3];
    }
  }

  return { width: frameWidth, height: frameHeight, pixels };
}

function styleDeltaSummary(refStats, generatedStats) {
  return {
    alphaRatioDelta: generatedStats.alphaRatio - refStats.alphaRatio,
    heightDelta: generatedStats.height - refStats.height,
    topDelta: generatedStats.minY - refStats.minY,
    bottomDelta: generatedStats.maxY - refStats.maxY,
    lumaDelta: generatedStats.meanLuma - refStats.meanLuma,
    satDelta: generatedStats.meanSaturation - refStats.meanSaturation,
  };
}

function checkStyleConsistency(result) {
  for (const skin of SKINS) {
    const refWalkDown = path.join(REFERENCE_ART_DIR, 'player', skin, 'walk_down.png');
    const genWalkDown = path.join(ART_DIR, 'player', skin, 'walk_down.png');
    if (!fs.existsSync(refWalkDown) || !fs.existsSync(genWalkDown)) {
      addCheck(result, `style_reference_exists_${skin}`, false, {
        reference: fs.existsSync(refWalkDown),
        generated: fs.existsSync(genWalkDown),
      });
      continue;
    }

    const ref = alphaBox(readPng(refWalkDown));
    const gen = alphaBox(readPng(genWalkDown));
    const delta = styleDeltaSummary(ref, gen);

    const alphaPass = gen.alphaRatio > 0.45 * ref.alphaRatio && gen.alphaRatio < 1.75 * ref.alphaRatio;
    const heightPass = Math.abs(delta.heightDelta) <= 18;
    const topPass = Math.abs(delta.topDelta) <= 12;
    const lumaPass = Math.abs(delta.lumaDelta) <= 45;
    const satPass = Math.abs(delta.satDelta) <= 0.35;

    addCheck(result, `style_alpha_walk_${skin}`, alphaPass, {
      refAlpha: ref.alphaRatio,
      generatedAlpha: gen.alphaRatio,
      delta: delta.alphaRatioDelta,
    });
    addCheck(result, `style_bbox_height_walk_${skin}`, heightPass, {
      refHeight: ref.height,
      generatedHeight: gen.height,
      delta: delta.heightDelta,
    });
    addCheck(result, `style_bbox_top_walk_${skin}`, topPass, {
      refTop: ref.minY,
      generatedTop: gen.minY,
      delta: delta.topDelta,
    });
    addCheck(result, `style_luma_walk_${skin}`, lumaPass, {
      refLuma: ref.meanLuma,
      generatedLuma: gen.meanLuma,
      delta: delta.lumaDelta,
    });
    addCheck(result, `style_saturation_walk_${skin}`, satPass, {
      refSat: ref.meanSaturation,
      generatedSat: gen.meanSaturation,
      delta: delta.satDelta,
    });
  }

  for (const skin of SKINS) {
    for (const state of STATES) {
      const directionFrame = path.join(ART_DIR, `player/${skin}/${state}_down.png`);
      if (!fs.existsSync(directionFrame)) {
        continue;
      }
      const sheet = readPng(directionFrame);
      for (let frame = 0; frame < 4; frame += 1) {
        const framePng = cropFrame(sheet, 80, 80, frame);
        const frameAlpha = alphaBox(framePng);
        addCheck(result, `style_direction_frame_non_empty_${state}_${skin}_${frame}`, frameAlpha.nonTransparent > 10, {
          path: `player/${skin}/${state}_down.png`,
          frame,
          nonTransparent: frameAlpha.nonTransparent,
        });
      }
    }
  }
}

function makeResult() {
  return {
    generatedAt: new Date().toISOString(),
    pass: true,
    checks: [],
    summary: {
      manifest: {
        exists: false,
        parsed: false,
      },
      totalManifestEntries: 0,
      missingFiles: 0,
      duplicatePaths: 0,
      directionFiles: {
        required: 0,
        found: 0,
      },
      emptyFrameCount: 0,
      noTransparentCount: 0,
      identicalDirectionPairs: [],
    },
  };
}

function expectedRequirements() {
  const req = [];

  for (const skin of SKINS) {
    for (const state of STATES) {
      for (const direction of DIRECTIONS) {
        req.push({
          path: `player/${skin}/${state}_${direction}.png`,
          type: 'spritesheet',
          frameWidth: 80,
          frameHeight: 80,
          frames: 4,
          expectedCategory: 'direction',
        });
      }

      req.push({
        path: `player/${skin}/${state}_8dir_sheet.png`,
        type: 'spritesheet',
        frameWidth: 80,
        frameHeight: 80,
        frames: 32,
        expectedImageWidth: 320,
        expectedImageHeight: 640,
        expectedCategory: 'sheet8',
      });
    }

    req.push({ path: `player/${skin}/portrait.png`, type: 'image', frameWidth: 128, frameHeight: 128, frames: 1, expectedCategory: 'portrait' });
    req.push({ path: `player/${skin}/hit_fx.png`, type: 'image', frameWidth: 96, frameHeight: 96, frames: 1, expectedCategory: 'fx' });
    req.push({ path: `player/${skin}_walk_sheet.png`, type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4, expectedCategory: 'fallback' });

    if (skin === 'assassin_default') {
      req.push({ path: 'player/assassin_default/blink_trail.png', type: 'image', frameWidth: 128, frameHeight: 64, frames: 1, expectedCategory: 'fx' });
      req.push({ path: 'player/assassin_default/blink_flash.png', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1, expectedCategory: 'fx' });
    }
    if (skin === 'witch_default') {
      req.push({ path: 'player/witch_default/slow_zone.png', type: 'image', frameWidth: 192, frameHeight: 192, frames: 1, expectedCategory: 'fx' });
    }
    if (skin === 'priest_default') {
      req.push({ path: 'player/priest_default/sanctuary_circle.png', type: 'image', frameWidth: 224, frameHeight: 224, frames: 1, expectedCategory: 'fx' });
    }
    if (skin === 'warrior_default') {
      req.push({ path: 'player/warrior_default/counter_wave.png', type: 'image', frameWidth: 192, frameHeight: 192, frames: 1, expectedCategory: 'fx' });
    }
  }

  req.push({ path: 'player/player_walk_sheet.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4, expectedCategory: 'fallback' });

  return req;
}

function collectManifestEntries(manifest) {
  const entries = new Map();
  if (!manifest || !Array.isArray(manifest.assets)) {
    return entries;
  }

  for (const asset of manifest.assets) {
    if (asset && typeof asset.path === 'string' && typeof asset.key === 'string') {
      entries.set(asset.path, asset);
    }
  }

  return entries;
}

function checkManifest(result, manifest, manifestPath) {
  const exists = fs.existsSync(manifestPath);
  addCheck(result, 'manifest_exists', exists, { path: manifestPath, exists });

  if (!exists) {
    return;
  }

  result.summary.manifest.exists = true;
  result.summary.manifest.parsed = !!manifest;
  addCheck(result, 'manifest_parsed', !!manifest, { path: manifestPath });

  if (manifest && Array.isArray(manifest.assets)) {
    result.summary.totalManifestEntries = manifest.assets.length;
    result.summary.manifest.version = manifest.version ?? null;
  }
}

function checkPathDuplicates(result, manifestMap, manifestAssets) {
  const duplicates = [];
  const seen = new Map();

  if (Array.isArray(manifestAssets)) {
    for (const asset of manifestAssets) {
      if (!asset || typeof asset.path !== 'string') {
        continue;
      }
      seen.set(asset.path, (seen.get(asset.path) ?? 0) + 1);
    }

    for (const [assetPath, count] of seen.entries()) {
      if (count > 1) {
        duplicates.push({ path: assetPath, count });
      }
    }
  }

  result.summary.duplicatePaths = duplicates.length;
  addCheck(result, 'manifest_no_duplicate_paths', duplicates.length === 0, { duplicates });
}

function checkRequiredPlayerFiles(result, manifestMap, requirements) {
  let missing = 0;
  let directionRequired = 0;
  let directionFound = 0;
  let emptyFrames = 0;
  let noTransparent = 0;

  for (const req of requirements) {
    const absolute = path.join(ART_DIR, req.path);
    const inManifest = manifestMap.has(req.path);
    const exists = inManifest && fs.existsSync(absolute);
    if (req.expectedCategory === 'direction') {
      directionRequired += 1;
      if (exists) {
        directionFound += 1;
      }
    }

    addCheck(result, `required_file_${req.path}`, exists, {
      path: req.path,
      inManifest,
      exists,
    });

    if (!exists) {
      missing += 1;
      continue;
    }

    const png = readPng(absolute);
    const expectedWidth = req.type === 'image'
      ? req.frameWidth
      : req.expectedCategory === 'sheet8'
        ? req.expectedImageWidth
        : req.frameWidth * req.frames;
    const expectedHeight = req.type === 'image'
      ? req.frameHeight
      : req.expectedCategory === 'sheet8'
        ? req.expectedImageHeight
        : req.frameHeight;
    const sizePass = png.width === expectedWidth && png.height === expectedHeight;
    addCheck(result, `file_size_${req.path}`, sizePass, {
      path: req.path,
      actual: `${png.width}x${png.height}`,
      expected: `${expectedWidth}x${expectedHeight}`,
    });

    if (!sizePass) {
      continue;
    }

    if (req.expectedCategory === 'sheet8' && png.width !== 320) {
      addCheck(result, `sheet8_width_${req.path}`, false, { path: req.path, width: png.width });
    }
    if (req.expectedCategory === 'sheet8' && png.height !== 640) {
      addCheck(result, `sheet8_height_${req.path}`, false, { path: req.path, height: png.height });
    }

    if (req.expectedCategory === 'direction') {
      addCheck(result, `direction_frames_${req.path}`, png.width === req.frameWidth * req.frames && png.height === req.frameHeight, {
        path: req.path,
        frameWidth: req.frameWidth,
        frameHeight: req.frameHeight,
        frames: req.frames,
      });

      for (let frame = 0; frame < req.frames; frame += 1) {
        const nonTransparent = countNonEmptyFrame(png, req.frameWidth, req.frameHeight, frame);
        if (nonTransparent < 4) {
          emptyFrames += 1;
        }
      }
    }

    const transparent = countNonTransparentPixels(png);
    if (transparent === png.width * png.height) {
      noTransparent += 1;
    }
  }

  result.summary.directionFiles = {
    required: directionRequired,
    found: directionFound,
  };
  result.summary.missingFiles = missing;
  result.summary.emptyFrameCount = emptyFrames;
  result.summary.noTransparentCount = noTransparent;

  addCheck(result, 'player_file_count_direction_complete', missing === 0, {
    missing,
    required: requirements.length,
  });
  addCheck(result, 'player_direction_sheet_complete', directionFound === directionRequired, {
    found: directionFound,
    required: directionRequired,
  });
  addCheck(result, 'player_no_empty_frames', emptyFrames === 0, { emptyFrames });
  addCheck(result, 'player_transparent_background', noTransparent === 0, { noTransparent });
}

function checkManifestEntriesMatch(result, manifestMap, requirements) {
  for (const req of requirements) {
    const found = manifestMap.get(req.path);
    if (!found) {
      continue;
    }

    const sizePass = found.frameWidth === req.frameWidth
      && found.frameHeight === req.frameHeight
      && (found.frames === req.frames || req.expectedCategory === 'sheet8');

    addCheck(result, `manifest_entry_match_${req.path}`, sizePass, {
      path: req.path,
      manifest: {
        frameWidth: found.frameWidth,
        frameHeight: found.frameHeight,
        frames: found.frames,
      },
      expected: {
        frameWidth: req.frameWidth,
        frameHeight: req.frameHeight,
        frames: req.frames,
      },
    });
  }
}

function checkDirectionUniqueness(result, manifestMap) {
  const pairs = [
    ['up', 'down'],
    ['up_right', 'down_right'],
    ['up_left', 'down_left'],
    ['left', 'right'],
  ];

  for (const skin of SKINS) {
    const hashes = {};
    for (const state of STATES) {
      for (const direction of DIRECTIONS) {
        const relPath = `player/${skin}/${state}_${direction}.png`;
        const manifestEntry = manifestMap.get(relPath);
        const absolute = path.join(ART_DIR, relPath);
        if (!manifestEntry || !fs.existsSync(absolute)) {
          continue;
        }

        try {
          hashes[`${state}_${direction}`] = sha1Hash(readPng(absolute).pixels);
        } catch {
          // ignore parse issues, already checked by prior step
        }
      }

      for (const [a, b] of pairs) {
        const hashA = hashes[`${state}_${a}`];
        const hashB = hashes[`${state}_${b}`];
        const same = hashA !== undefined && hashB !== undefined && hashA === hashB;
        addCheck(result, `direction_unique_${skin}_${state}_${a}_${b}`, !same, {
          skin,
          state,
          pair: [a, b],
          same,
        });
        if (same) {
          result.summary.identicalDirectionPairs.push(`${skin}:${state}:${a}-${b}`);
        }
      }
    }

    const up = path.join(ART_DIR, `player/${skin}/walk_up_right.png`);
    const down = path.join(ART_DIR, `player/${skin}/walk_down_right.png`);
    const upLeft = path.join(ART_DIR, `player/${skin}/walk_up_left.png`);
    const downLeft = path.join(ART_DIR, `player/${skin}/walk_down_left.png`);
    const right = path.join(ART_DIR, `player/${skin}/walk_right.png`);
    const left = path.join(ART_DIR, `player/${skin}/walk_left.png`);

    if (fs.existsSync(up) && fs.existsSync(down)) {
      const upPng = readPng(up);
      const downPng = readPng(down);
      const same = upPng.width === downPng.width
        && upPng.height === downPng.height
        && Buffer.from(upPng.pixels).compare(Buffer.from(downPng.pixels)) === 0;
      addCheck(result, `walk_up_not_equal_down_${skin}`, !same, { skin });
      if (same) {
        result.summary.identicalDirectionPairs.push(`${skin}:walk_up_vs_down`);
      }
    }

    if (fs.existsSync(upLeft) && fs.existsSync(downLeft)) {
      const upPng = readPng(upLeft);
      const downPng = readPng(downLeft);
      const same = upPng.width === downPng.width
        && upPng.height === downPng.height
        && Buffer.from(upPng.pixels).compare(Buffer.from(downPng.pixels)) === 0;
      addCheck(result, `walk_upl_not_equal_downl_${skin}`, !same, { skin });
      if (same) {
        result.summary.identicalDirectionPairs.push(`${skin}:walk_up_left_vs_down_left`);
      }
    }

    if (fs.existsSync(right) && fs.existsSync(left)) {
      const rightPng = readPng(right);
      const leftPng = readPng(left);
      const same = rightPng.width === leftPng.width
        && rightPng.height === leftPng.height
        && Buffer.from(rightPng.pixels).compare(Buffer.from(leftPng.pixels)) === 0;
      addCheck(result, `walk_right_not_equal_left_${skin}`, !same, { skin });
      if (same) {
        result.summary.identicalDirectionPairs.push(`${skin}:walk_left_vs_right`);
      }
    }
  }
}

function checkManifestAssetCoverage(result, manifestMap) {
  let missing = 0;
  for (const [pathName, entry] of manifestMap) {
    if (entry?.path !== pathName) {
      continue;
    }

    const absolute = path.join(ART_DIR, entry.path);
    const exists = fs.existsSync(absolute);
    if (!exists) {
      missing += 1;
    }
    addCheck(result, `manifest_entry_exists_${entry.key ?? pathName}`, exists, {
      key: entry.key,
      path: entry.path,
      exists,
    });
  }

  addCheck(result, 'all_manifest_entries_exist', missing === 0, { missing });
}

function main() {
  const result = makeResult();
  const manifest = readJsonSafe(MANIFEST_PATH);
  const requirements = expectedRequirements();
  const manifestMap = collectManifestEntries(manifest);

  checkManifest(result, manifest, MANIFEST_PATH);
  checkPathDuplicates(result, manifestMap, manifest?.assets);
  checkRequiredPlayerFiles(result, manifestMap, requirements);
  checkManifestEntriesMatch(result, manifestMap, requirements);
  checkManifestAssetCoverage(result, manifestMap);
  checkDirectionUniqueness(result, manifestMap);
  checkStyleConsistency(result);

  const output = path.join(ART_DIR, 'debug', 'art_asset_self_check.json');
  ensureDirectory(output);
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.info(`[art001] self-check ${result.pass ? 'PASS' : 'FAIL'} -> ${output}`);
  if (!result.pass) {
    process.exitCode = 1;
  }
}

main();
