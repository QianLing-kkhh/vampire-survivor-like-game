import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';

let cachedBuiltInContentHash: string | null = null;

export function getBuiltInContentHash(): string {
  if (cachedBuiltInContentHash !== null) {
    return cachedBuiltInContentHash;
  }

  ContentBootstrap.ensureInitialized();

  cachedBuiltInContentHash = hashStableJson({
    weapons: ContentRegistry.listWeapons(),
    enemies: ContentRegistry.listEnemies(),
    passives: ContentRegistry.listPassives(),
    upgrades: ContentRegistry.getUpgradeOptions(),
    waves: {
      [DEFAULT_CONTENT_IDS.waveSet]: ContentRegistry.getWaveSet(DEFAULT_CONTENT_IDS.waveSet) ?? [],
    },
    characters: ContentRegistry.listCharacters(),
    stages: ContentRegistry.listStages(),
    maps: ContentRegistry.listMaps(),
  });

  return cachedBuiltInContentHash;
}

export function hashStableJson(value: unknown): string {
  return hashString(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function hashString(text: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;

  for (let index = 0; index < text.length; index += 1) {
    const value = text.charCodeAt(index);
    hash1 = Math.imul(hash1 ^ value, 2654435761);
    hash2 = Math.imul(hash2 ^ value, 1597334677);
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507)
    ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507)
    ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

  const combined = 4294967296 * (2097151 & hash2) + (hash1 >>> 0);
  return `ch_${combined.toString(16)}`;
}

