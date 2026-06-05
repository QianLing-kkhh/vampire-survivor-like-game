import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  { label: 'TypeScript', args: ['exec', 'tsc'] },
  { label: 'Build', args: ['run', 'build'] },
  { label: 'Content audit', args: ['run', 'validate:content'] },
  { label: 'Asset audit', args: ['run', 'validate:assets'] },
  { label: 'External art audit', args: ['run', 'validate:external-art'] },
  { label: 'Architecture boundaries', args: ['run', 'check:architecture'] },
  { label: 'Documentation links', args: ['run', 'validate:docs'] },
];

function runStep(step, index) {
  return new Promise((resolve, reject) => {
    console.info(`[validate] ${index + 1}/${steps.length} ${step.label}`);

    const command = process.platform === 'win32'
      ? `${npmCommand} ${step.args.join(' ')}`
      : npmCommand;
    const args = process.platform === 'win32' ? [] : step.args;
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.label} failed with exit code ${code ?? 1}`));
    });
  });
}

for (const [index, step] of steps.entries()) {
  try {
    await runStep(step, index);
  } catch (error) {
    console.error(`[validate] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

console.info('[validate] Project validation passed.');
