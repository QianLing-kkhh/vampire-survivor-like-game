import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return packageJson.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function readGameVersion() {
  try {
    const source = fs.readFileSync(path.join(root, 'src', 'version', 'GameVersion.ts'), 'utf8');
    const match = source.match(/GAME_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function readGitValue(args) {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

const info = {
  packageVersion: readPackageVersion(),
  gameVersion: readGameVersion(),
  gitBranch: readGitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
  gitCommit: readGitValue(['rev-parse', '--short', 'HEAD']),
};

console.info('[build-info]');
console.info(`packageVersion: ${info.packageVersion}`);
console.info(`gameVersion: ${info.gameVersion}`);
console.info(`gitBranch: ${info.gitBranch}`);
console.info(`gitCommit: ${info.gitCommit}`);
