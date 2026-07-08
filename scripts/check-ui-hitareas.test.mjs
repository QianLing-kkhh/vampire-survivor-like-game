import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const fixtureRoot = path.join(root, '.tmp', `ui-hitarea-fixture-${process.pid}`);

function runUnsafeFixture(name, bodyLines) {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(fixtureRoot, { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, `${name}.ts`),
    [
      "import Phaser from 'phaser';",
      '',
      'export function createDimmer(scene: Phaser.Scene): void {',
      ...bodyLines,
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
    throw new Error(`Expected ${name} fixture to fail the UI hit area audit.`);
  }

  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes('implicit rectangle setInteractive')) {
    throw new Error(`Expected ${name} failure output to identify implicit rectangle setInteractive().\n${output}`);
  }
}

runUnsafeFixture('ImplicitVariableDimmer', [
  '  const dimmer = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);',
  '  dimmer.setInteractive();',
]);

runUnsafeFixture('ImplicitMultilineVariableDimmer', [
  '  const dimmer = scene.add.rectangle(',
  '    0,',
  '    0,',
  '    scene.scale.width,',
  '    scene.scale.height,',
  '    0x000000,',
  '    0.5,',
  '  );',
  '  dimmer.setInteractive();',
]);

runUnsafeFixture('ImplicitTypedVariableDimmer', [
  '  const dimmer: Phaser.GameObjects.Rectangle =',
  '    scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);',
  '  dimmer.setInteractive();',
]);

runUnsafeFixture('ImplicitPropertyDimmer', [
  '  const panel = {',
  '    backdrop: scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5),',
  '  };',
  '  panel.backdrop.setInteractive();',
]);

runUnsafeFixture('ImplicitInstancePropertyDimmer', [
  '  const panel = { backdrop: undefined as Phaser.GameObjects.Rectangle | undefined };',
  '  panel.backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);',
  '  panel.backdrop.setInteractive();',
]);

runUnsafeFixture('ImplicitChainedDimmer', [
  '  scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5).setInteractive();',
]);

runUnsafeFixture('ImplicitMultilineChainedDimmer', [
  '  scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5)',
  '    .setInteractive();',
]);

console.log('UI hit area checker regression tests passed.');
