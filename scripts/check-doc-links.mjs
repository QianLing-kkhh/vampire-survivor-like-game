import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const markdownFiles = [
  path.join(root, 'README.md'),
  ...fs.readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(docsDir, name)),
].filter((filePath) => fs.existsSync(filePath));

const externalLinkPattern = /^(https?:\/\/|mailto:|tel:|#)/i;
const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;
const missingLinks = [];

function stripLinkTarget(rawTarget) {
  const withoutTitle = rawTarget.trim().split(/\s+["'][^"']*["']$/)[0] ?? rawTarget.trim();
  return withoutTitle.replace(/^<|>$/g, '').split('#')[0].split('?')[0];
}

for (const filePath of markdownFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativeFile = path.relative(root, filePath);
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const target = stripLinkTarget(match[1]);

    if (!target || externalLinkPattern.test(target)) {
      continue;
    }

    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(target));
    const exists = target.endsWith('/')
      ? fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()
      : fs.existsSync(resolved);

    if (!exists) {
      missingLinks.push(`${relativeFile} -> ${match[1]}`);
    }
  }
}

if (missingLinks.length > 0) {
  console.error('[docs] Missing relative links:');
  for (const link of missingLinks) {
    console.error(`  - ${link}`);
  }
  process.exit(1);
}

console.info(`[docs] Checked ${markdownFiles.length} markdown files. No missing relative links.`);
