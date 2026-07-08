import { spawn } from 'node:child_process';

const steps = [
  ['UI shell audit', 'scripts/check-ui-shell.mjs'],
  ['UI interaction contract', 'scripts/check-ui-interaction-contract.mjs'],
  ['UI hit area audit', 'scripts/check-ui-hitareas.mjs'],
  ['UI hit area checker regression', 'scripts/check-ui-hitareas.test.mjs'],
  ['HUD layout audit', 'scripts/check-hud-layout.mjs'],
  ['UI layout budget audit', 'scripts/check-ui-layout-budget.mjs'],
];

function runStep([label, scriptPath]) {
  return new Promise((resolve, reject) => {
    console.info(`[validate:ui] ${label}`);
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      shell: false,
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

for (const step of steps) {
  try {
    await runStep(step);
  } catch (error) {
    console.error(`[validate:ui] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

console.info('[validate:ui] UI validation passed.');
