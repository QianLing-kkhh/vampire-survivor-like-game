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

function runFixture() {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  try {
    fs.mkdirSync(fixtureRoot, { recursive: true });
    writeJson('weapons.json', [
      { id: 'knife', requiredPassiveId: 'bracer' },
      { id: 'knife', requiredPassiveId: 'bracer' },
    ]);
    writeJson('enemies.json', { slime: { id: 'slime' } });
    writeJson('passives.json', { bracer: { id: 'bracer' } });
    writeJson('upgrades.json', {});
    writeJson('waves.json', []);
    writeJson('characters.json', {});
    writeJson('stages.json', {});
    writeJson('maps.json', {});
    writeJson('bosses.json', []);

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

const duplicateIdResult = runFixture();
const duplicateIdOutput = `${duplicateIdResult.stdout}\n${duplicateIdResult.stderr}`;
if (duplicateIdResult.status === 0) {
  throw new Error(`Expected content audit to reject duplicate ids.\n${duplicateIdOutput}`);
}

if (!duplicateIdOutput.includes('Duplicate id in weapons.json: knife')) {
  throw new Error(`Expected duplicate id output to identify weapons.json knife.\n${duplicateIdOutput}`);
}

console.log('Content audit output regression tests passed.');
