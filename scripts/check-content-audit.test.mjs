import { spawnSync } from 'node:child_process';

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

console.log('Content audit output regression tests passed.');
