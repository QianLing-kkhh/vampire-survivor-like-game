import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fixtureRoot = path.join(root, '.tmp', 'ui-hitarea-fixture');
const fixtureFile = path.join(fixtureRoot, 'ImplicitDimmer.ts');

fs.mkdirSync(fixtureRoot, { recursive: true });
fs.writeFileSync(
  fixtureFile,
  [
    "import Phaser from 'phaser';",
    '',
    'export function createDimmer(scene: Phaser.Scene): void {',
    '  const dimmer = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);',
    '  dimmer.setInteractive();',
    '}',
    '',
  ].join('\n'),
);

const result = spawnSync(process.execPath, ['scripts/check-ui-hitareas.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    UI_HITAREA_SCAN_ROOTS: fixtureRoot,
  },
  encoding: 'utf8',
});

fs.rmSync(fixtureRoot, { recursive: true, force: true });

if (result.status === 0) {
  throw new Error('Expected implicit rectangle setInteractive() fixture to fail the UI hit area audit.');
}

const output = `${result.stdout}\n${result.stderr}`;
if (!output.includes('implicit rectangle setInteractive')) {
  throw new Error(`Expected failure output to identify implicit rectangle setInteractive().\n${output}`);
}

console.log('UI hit area checker regression tests passed.');
