import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const ART_DIR = path.join(ROOT_DIR, 'public', 'assets', 'art001');
const OUTPUT_ZIP = path.join(ROOT_DIR, 'vsg_final_art_pack_with_blender_players.zip');

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
  });
  return result.status === 0;
}

function commandExists(command) {
  try {
    return spawnSync('where', [command], { shell: false }).status === 0;
  } catch {
    return false;
  }
}

function ensureSource() {
  if (!fs.existsSync(ART_DIR)) {
    throw new Error(`[art001] Missing source directory: ${path.relative(ROOT_DIR, ART_DIR)}`);
  }
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function runTar() {
  return runCommand('tar', ['-a', '-c', '-f', OUTPUT_ZIP, '-C', ROOT_DIR, 'public/assets/art001']);
}

function runPowershellZip() {
  const command = `if (Test-Path -LiteralPath '${OUTPUT_ZIP.replace(/'/g, "''")}') { Remove-Item -LiteralPath '${OUTPUT_ZIP.replace(/'/g, "''")}' -Force }; Compress-Archive -Path '${path.join(ROOT_DIR, 'public', 'assets', 'art001')}' -DestinationPath '${OUTPUT_ZIP.replace(/'/g, "''")}' -Force`;
  return runCommand('powershell', [
    '-NoProfile',
    '-Command',
    command,
  ]);
}

function runZipFallback() {
  if (commandExists('tar')) {
    if (runTar()) {
      return true;
    }
  }

  return runPowershellZip();
}

function main() {
  ensureSource();
  removeIfExists(OUTPUT_ZIP);

  const packed = runZipFallback();
  if (!packed) {
    throw new Error('[art001] Failed to create zip package. Install tar or ensure PowerShell is available.');
  }

  const size = fs.statSync(OUTPUT_ZIP).size;
  console.info(`[art001] Package generated: ${path.basename(OUTPUT_ZIP)} (${size} bytes)`);
}

main();
