import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const result = spawnSync(process.execPath, ['scripts/check-content-audit.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

const output = `${result.stdout}\n${result.stderr}`;

if (result.status !== 0) {
  throw new Error(`Expected content audit to pass.\n${output}`);
}

if (output.includes('[content] Warning:')) {
  throw new Error(`Expected content audit output to stay warning-free.\n${output}`);
}

if (!output.includes('[content] JSON reference checks passed.')) {
  throw new Error(`Expected content audit success output.\n${output}`);
}

const fixtureRoot = path.join(process.cwd(), '.tmp', `content-audit-fixture-${process.pid}`);

function writeJson(name, value) {
  fs.writeFileSync(path.join(fixtureRoot, name), JSON.stringify(value, null, 2));
}

function runFixture(overrides, options = {}) {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  try {
    fs.mkdirSync(fixtureRoot, { recursive: true });
    const files = {
      'weapons.json': { knife: { id: 'knife', requiredPassiveId: 'bracer' } },
      'enemies.json': { slime: { id: 'slime' } },
      'passives.json': { bracer: { id: 'bracer' } },
      'upgrades.json': {},
      'waves.json': [],
      'characters.json': {},
      'stages.json': {},
      'maps.json': {},
      'bosses.json': [],
      ...overrides,
    };

    for (const [name, value] of Object.entries(files)) {
      if (options.missingFiles?.includes(name)) {
        continue;
      }
      writeJson(name, value);
    }

    return spawnSync(process.execPath, ['scripts/check-content-audit.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CONTENT_AUDIT_DATA_DIR: fixtureRoot,
      },
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

const duplicateIdResult = runFixture({
  'weapons.json': [
    { id: 'knife', requiredPassiveId: 'bracer' },
    { id: 'knife', requiredPassiveId: 'bracer' },
  ],
});
const duplicateIdOutput = `${duplicateIdResult.stdout}\n${duplicateIdResult.stderr}`;
if (duplicateIdResult.status === 0) {
  throw new Error(`Expected content audit to reject duplicate ids.\n${duplicateIdOutput}`);
}

if (!duplicateIdOutput.includes('Duplicate id in weapons.json: knife')) {
  throw new Error(`Expected duplicate id output to identify weapons.json knife.\n${duplicateIdOutput}`);
}

const mismatchedIdResult = runFixture({
  'weapons.json': {
    knife: { id: 'dagger', requiredPassiveId: 'bracer' },
  },
});
const mismatchedIdOutput = `${mismatchedIdResult.stdout}\n${mismatchedIdResult.stderr}`;
if (mismatchedIdResult.status === 0) {
  throw new Error(`Expected content audit to reject mismatched object-map ids.\n${mismatchedIdOutput}`);
}

if (!mismatchedIdOutput.includes('Mismatched id in weapons.json: key knife has id dagger')) {
  throw new Error(`Expected mismatched id output to identify weapons.json knife/dagger.\n${mismatchedIdOutput}`);
}

const missingFileResult = runFixture({}, { missingFiles: ['weapons.json'] });
const missingFileOutput = `${missingFileResult.stdout}\n${missingFileResult.stderr}`;
if (missingFileResult.status === 0) {
  throw new Error(`Expected content audit to reject missing files.\n${missingFileOutput}`);
}

const missingWeaponsCount = missingFileOutput.match(/Missing data file: .*weapons\.json/g)?.length ?? 0;
if (missingWeaponsCount !== 1) {
  throw new Error(`Expected missing weapons.json to be reported once, got ${missingWeaponsCount}.\n${missingFileOutput}`);
}

const missingArrayIdResult = runFixture({
  'weapons.json': [
    { requiredPassiveId: 'bracer' },
  ],
});
const missingArrayIdOutput = `${missingArrayIdResult.stdout}\n${missingArrayIdResult.stderr}`;
if (missingArrayIdResult.status === 0) {
  throw new Error(`Expected content audit to reject array entries without ids.\n${missingArrayIdOutput}`);
}

if (!missingArrayIdOutput.includes('Missing id in weapons.json array entry at index 0')) {
  throw new Error(`Expected missing array id output to identify weapons.json index 0.\n${missingArrayIdOutput}`);
}

const blankArrayIdResult = runFixture({
  'weapons.json': [
    { id: '   ', requiredPassiveId: 'bracer' },
  ],
});
const blankArrayIdOutput = `${blankArrayIdResult.stdout}\n${blankArrayIdResult.stderr}`;
if (blankArrayIdResult.status === 0) {
  throw new Error(`Expected content audit to reject blank array ids.\n${blankArrayIdOutput}`);
}

if (!blankArrayIdOutput.includes('Missing id in weapons.json array entry at index 0')) {
  throw new Error(`Expected blank array id output to identify weapons.json index 0.\n${blankArrayIdOutput}`);
}

const paddedArrayIdResult = runFixture({
  'weapons.json': [
    { id: ' knife ', requiredPassiveId: 'bracer' },
  ],
});
const paddedArrayIdOutput = `${paddedArrayIdResult.stdout}\n${paddedArrayIdResult.stderr}`;
if (paddedArrayIdResult.status === 0) {
  throw new Error(`Expected content audit to reject padded array ids.\n${paddedArrayIdOutput}`);
}

if (!paddedArrayIdOutput.includes('Padded id in weapons.json array entry at index 0:  knife ')) {
  throw new Error(`Expected padded array id output to identify weapons.json index 0.\n${paddedArrayIdOutput}`);
}

const paddedMapKeyResult = runFixture({
  'weapons.json': {
    ' knife ': { id: ' knife ', requiredPassiveId: 'bracer' },
  },
});
const paddedMapKeyOutput = `${paddedMapKeyResult.stdout}\n${paddedMapKeyResult.stderr}`;
if (paddedMapKeyResult.status === 0) {
  throw new Error(`Expected content audit to reject padded object-map keys.\n${paddedMapKeyOutput}`);
}

if (!paddedMapKeyOutput.includes('Padded key in weapons.json:  knife ')) {
  throw new Error(`Expected padded object-map key output to identify weapons.json knife.\n${paddedMapKeyOutput}`);
}

const blankMapKeyResult = runFixture({
  'weapons.json': {
    '   ': { id: '   ', requiredPassiveId: 'bracer' },
  },
});
const blankMapKeyOutput = `${blankMapKeyResult.stdout}\n${blankMapKeyResult.stderr}`;
if (blankMapKeyResult.status === 0) {
  throw new Error(`Expected content audit to reject blank object-map keys.\n${blankMapKeyOutput}`);
}

if (!blankMapKeyOutput.includes('Missing key in weapons.json object entry')) {
  throw new Error(`Expected blank object-map key output to identify weapons.json.\n${blankMapKeyOutput}`);
}

const paddedMapIdResult = runFixture({
  'weapons.json': {
    knife: { id: ' knife ', requiredPassiveId: 'bracer' },
  },
});
const paddedMapIdOutput = `${paddedMapIdResult.stdout}\n${paddedMapIdResult.stderr}`;
if (paddedMapIdResult.status === 0) {
  throw new Error(`Expected content audit to reject padded object-map ids.\n${paddedMapIdOutput}`);
}

if (!paddedMapIdOutput.includes('Padded id in weapons.json object entry knife:  knife ')) {
  throw new Error(`Expected padded object-map id output to identify weapons.json knife.\n${paddedMapIdOutput}`);
}

const nonStringMapIdResult = runFixture({
  'weapons.json': {
    knife: { id: 123, requiredPassiveId: 'bracer' },
  },
});
const nonStringMapIdOutput = `${nonStringMapIdResult.stdout}\n${nonStringMapIdResult.stderr}`;
if (nonStringMapIdResult.status === 0) {
  throw new Error(`Expected content audit to reject non-string object-map ids.\n${nonStringMapIdOutput}`);
}

if (!nonStringMapIdOutput.includes('Invalid id in weapons.json object entry knife: expected string')) {
  throw new Error(`Expected non-string object-map id output to identify weapons.json knife.\n${nonStringMapIdOutput}`);
}

console.log('Content audit output regression tests passed.');
