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

const nonObjectMapEntryResult = runFixture({
  'weapons.json': {
    knife: 'invalid',
  },
});
const nonObjectMapEntryOutput = `${nonObjectMapEntryResult.stdout}\n${nonObjectMapEntryResult.stderr}`;
if (nonObjectMapEntryResult.status === 0) {
  throw new Error(`Expected content audit to reject non-object map entries.\n${nonObjectMapEntryOutput}`);
}

if (!nonObjectMapEntryOutput.includes('Invalid entry in weapons.json object entry knife: expected object')) {
  throw new Error(`Expected non-object map entry output to identify weapons.json knife.\n${nonObjectMapEntryOutput}`);
}

const invalidWaveEntryResult = runFixture({
  'waves.json': [
    'invalid',
  ],
});
const invalidWaveEntryOutput = `${invalidWaveEntryResult.stdout}\n${invalidWaveEntryResult.stderr}`;
if (invalidWaveEntryResult.status === 0) {
  throw new Error(`Expected content audit to reject non-object wave entries.\n${invalidWaveEntryOutput}`);
}

if (!invalidWaveEntryOutput.includes('Invalid wave entry in waves at index 0: expected object')) {
  throw new Error(`Expected invalid wave entry output to identify waves index 0.\n${invalidWaveEntryOutput}`);
}

const invalidWaveSetResult = runFixture({
  'waves.json': {
    early: 'invalid',
  },
});
const invalidWaveSetOutput = `${invalidWaveSetResult.stdout}\n${invalidWaveSetResult.stderr}`;
if (invalidWaveSetResult.status === 0) {
  throw new Error(`Expected content audit to reject invalid wave-set containers.\n${invalidWaveSetOutput}`);
}

if (!invalidWaveSetOutput.includes('Invalid wave set early in waves.json: expected array or object with waves')) {
  throw new Error(`Expected invalid wave-set output to identify waves.json early.\n${invalidWaveSetOutput}`);
}

const invalidWaveRootResult = runFixture({
  'waves.json': null,
});
const invalidWaveRootOutput = `${invalidWaveRootResult.stdout}\n${invalidWaveRootResult.stderr}`;
if (invalidWaveRootResult.status === 0) {
  throw new Error(`Expected content audit to reject an invalid waves root.\n${invalidWaveRootOutput}`);
}

if (!invalidWaveRootOutput.includes('Invalid waves.json: expected array or object')) {
  throw new Error(`Expected invalid waves root output to identify waves.json.\n${invalidWaveRootOutput}`);
}

const invalidBossRootResult = runFixture({
  'bosses.json': null,
});
const invalidBossRootOutput = `${invalidBossRootResult.stdout}\n${invalidBossRootResult.stderr}`;
if (invalidBossRootResult.status === 0) {
  throw new Error(`Expected content audit to reject an invalid bosses root.\n${invalidBossRootOutput}`);
}

if (!invalidBossRootOutput.includes('Invalid bosses.json: expected array or object')) {
  throw new Error(`Expected invalid bosses root output to identify bosses.json.\n${invalidBossRootOutput}`);
}

const invalidBossEntryResult = runFixture({
  'bosses.json': [
    'invalid',
  ],
});
const invalidBossEntryOutput = `${invalidBossEntryResult.stdout}\n${invalidBossEntryResult.stderr}`;
if (invalidBossEntryResult.status === 0) {
  throw new Error(`Expected content audit to reject a non-object boss entry.\n${invalidBossEntryOutput}`);
}

if (!invalidBossEntryOutput.includes('Invalid boss entry in bosses.json array at index 0: expected object')) {
  throw new Error(`Expected invalid boss entry output to identify bosses.json index 0.\n${invalidBossEntryOutput}`);
}

const invalidBossMapEntryResult = runFixture({
  'bosses.json': {
    finalBoss: 'invalid',
  },
});
const invalidBossMapEntryOutput = `${invalidBossMapEntryResult.stdout}\n${invalidBossMapEntryResult.stderr}`;
if (invalidBossMapEntryResult.status === 0) {
  throw new Error(`Expected content audit to reject an invalid boss map entry.\n${invalidBossMapEntryOutput}`);
}

if (!invalidBossMapEntryOutput.includes('Invalid boss entry in bosses.json object entry finalBoss: expected object')) {
  throw new Error(`Expected invalid boss map entry output to identify bosses.json finalBoss.\n${invalidBossMapEntryOutput}`);
}

const mismatchedBossIdResult = runFixture({
  'bosses.json': {
    finalBoss: {
      id: 'otherBoss',
      enemyId: 'slime',
    },
  },
});
const mismatchedBossIdOutput = `${mismatchedBossIdResult.stdout}\n${mismatchedBossIdResult.stderr}`;
if (mismatchedBossIdResult.status === 0) {
  throw new Error(`Expected content audit to reject a mismatched boss id.\n${mismatchedBossIdOutput}`);
}

if (!mismatchedBossIdOutput.includes('Mismatched id in bosses.json: key finalBoss has id otherBoss')) {
  throw new Error(`Expected mismatched boss id output to identify bosses.json finalBoss.\n${mismatchedBossIdOutput}`);
}

console.log('Content audit output regression tests passed.');
