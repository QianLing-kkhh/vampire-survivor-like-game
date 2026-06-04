export type LeaderboardMode = 'normal' | 'endless' | 'challenge' | 'custom';

export interface LeaderboardKey {
  mode: LeaderboardMode;
  characterId?: string;
  stageId?: string;
  mapId?: string;
  difficultyId?: string;
  seed?: string;
  challengeId?: string;
  customStageId?: string;
  rulesetId?: string;
}

const LEADERBOARD_KEY_FIELDS: Array<keyof LeaderboardKey> = [
  'mode',
  'characterId',
  'stageId',
  'mapId',
  'difficultyId',
  'seed',
  'challengeId',
  'customStageId',
  'rulesetId',
];

const VALID_MODES = new Set<LeaderboardMode>([
  'normal',
  'endless',
  'challenge',
  'custom',
]);

export function createLeaderboardKey(params: LeaderboardKey): LeaderboardKey {
  return {
    mode: params.mode,
    characterId: params.characterId,
    stageId: params.stageId,
    mapId: params.mapId,
    difficultyId: params.difficultyId,
    seed: params.seed,
    challengeId: params.challengeId,
    customStageId: params.customStageId,
    rulesetId: params.rulesetId,
  };
}

export function serializeLeaderboardKey(key: LeaderboardKey): string {
  return LEADERBOARD_KEY_FIELDS
    .map((field) => {
      const value = key[field] ?? '';
      return `${field}=${encodeURIComponent(value)}`;
    })
    .join('|');
}

export function parseLeaderboardKey(serialized: string): LeaderboardKey | null {
  const values = new Map<string, string>();

  for (const part of serialized.split('|')) {
    const [field, rawValue = ''] = part.split('=');

    if (!field) {
      continue;
    }

    values.set(field, decodeURIComponent(rawValue));
  }

  const mode = values.get('mode') as LeaderboardMode | undefined;

  if (!mode || !VALID_MODES.has(mode)) {
    return null;
  }

  return createLeaderboardKey({
    mode,
    characterId: readOptionalValue(values, 'characterId'),
    stageId: readOptionalValue(values, 'stageId'),
    mapId: readOptionalValue(values, 'mapId'),
    difficultyId: readOptionalValue(values, 'difficultyId'),
    seed: readOptionalValue(values, 'seed'),
    challengeId: readOptionalValue(values, 'challengeId'),
    customStageId: readOptionalValue(values, 'customStageId'),
    rulesetId: readOptionalValue(values, 'rulesetId'),
  });
}

function readOptionalValue(values: Map<string, string>, field: keyof LeaderboardKey): string | undefined {
  const value = values.get(field);

  return value && value.length > 0 ? value : undefined;
}
