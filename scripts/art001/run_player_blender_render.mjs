import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const PYTHON_SCRIPT = path.join(ROOT_DIR, 'scripts', 'art001', 'render_player_sprites.py');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT_DIR, 'public', 'assets', 'art001_render_tmp', 'player');
const DEFAULT_SKINS = ['assassin_default', 'witch_default', 'priest_default', 'warrior_default'];

function parseArgs(argv) {
  const values = {
    outputRoot: DEFAULT_OUTPUT_ROOT,
    skins: [...DEFAULT_SKINS],
    blenderPath: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output-root' && argv[i + 1]) {
      values.outputRoot = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--skins' && argv[i + 1]) {
      values.skins = argv[i + 1]
        .split(',')
        .map((skin) => skin.trim())
        .filter((skin) => skin.length > 0);
      i += 1;
      continue;
    }

    if (arg === '--blender' && argv[i + 1]) {
      values.blenderPath = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return values;
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: false,
  });
}

function commandExists(candidate) {
  if (!candidate) {
    return null;
  }

  const normalized = path.normalize(candidate);

  if (fs.existsSync(normalized)) {
    return normalized;
  }

  const result = runCommand(candidate, ['--version']);
  return result.status === 0 ? candidate : null;
}

function resolveBlenderPath(specified = '') {
  if (specified) {
    return commandExists(specified);
  }

  const installRoots = [process.env.ProgramFiles ?? '', process.env.ProgramW6432 ?? ''];
  const installCandidates = [];
  for (const root of installRoots) {
    if (!root) {
      continue;
    }

    installCandidates.push(path.join(root, 'Blender Foundation', 'Blender 5.1', 'blender.exe'));
    installCandidates.push(path.join(root, 'Blender Foundation', 'Blender', 'blender.exe'));
  }

  const candidates = [
    'blender',
    'blender.exe',
    'blender-launcher',
    'blender-cli',
    'blendercmd',
    ...installCandidates,
  ];

  for (const candidate of candidates) {
    const found = commandExists(candidate);
    if (found) {
      return found;
    }
  }

  const msStoreCandidate = path.join(
    process.env.LOCALAPPDATA ?? '',
    'Microsoft',
    'WindowsApps',
    'blender.exe',
  );
  return commandExists(msStoreCandidate);
}

function ensureOutputDir(outputRoot) {
  fs.mkdirSync(outputRoot, { recursive: true });
}

const args = parseArgs(process.argv.slice(2));
const resolvedBlender = resolveBlenderPath(args.blenderPath);

if (!resolvedBlender) {
  console.error('[art001] Cannot find Blender command. Set --blender <path-to-blender> or add blender to PATH.');
  process.exit(1);
}

if (!fs.existsSync(PYTHON_SCRIPT)) {
  console.error(`[art001] Missing render script: ${PYTHON_SCRIPT}`);
  process.exit(1);
}

ensureOutputDir(args.outputRoot);

const finalArgs = [
  '--background',
  '--python',
  PYTHON_SCRIPT,
  '--',
  '--output-root',
  path.normalize(args.outputRoot),
  '--skins',
  args.skins.join(','),
];

console.info(`[art001] Running Blender render: ${resolvedBlender}`);
const result = runCommand(resolvedBlender, finalArgs);

if (result.status !== 0) {
  console.error('[art001] Blender render failed. Keep fallback plan in place and regenerate later.');
  process.exit(result.status || 1);
}

console.info('[art001] Blender player render finished.');
