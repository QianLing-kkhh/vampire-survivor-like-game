import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function hasPackageScript(scriptName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return Boolean(packageJson.scripts?.[scriptName]);
  } catch {
    return false;
  }
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    console.info(`[pre-release] ${label}`);

    const shell = process.platform === 'win32' && command.endsWith('.cmd');
    const child = spawn(shell ? `${command} ${args.join(' ')}` : command, shell ? [] : args, {
      cwd: root,
      stdio: 'inherit',
      shell,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? 1}`));
    });
  });
}

const steps = [
  { command: npmCommand, args: ['exec', 'tsc'], label: 'TypeScript' },
  { command: npmCommand, args: ['run', 'build'], label: 'Build' },
];

if (hasPackageScript('validate')) {
  steps.push({ command: npmCommand, args: ['run', 'validate'], label: 'Project validation' });
} else {
  console.warn('[pre-release] Warning: package script "validate" not found; skipping project validation.');
}

steps.push({
  command: process.execPath,
  args: ['scripts/print-build-info.mjs'],
  label: 'Build info',
});

for (const step of steps) {
  try {
    await runCommand(step.command, step.args, step.label);
  } catch (error) {
    console.error(`[pre-release] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

console.info('[pre-release] Checks passed.');
