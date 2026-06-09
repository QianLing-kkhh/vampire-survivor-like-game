import type {
  AutoChallengeType,
  LeaderboardControlMode,
  StrategySpeedBucket,
} from '../runtime/RunModeConfig';

export type LeaderboardMode = 'normal' | 'endless' | 'challenge' | 'custom';

export interface LeaderboardKey {
  mode: LeaderboardMode;
  controlMode?: LeaderboardControlMode;
  autoChallengeType?: AutoChallengeType;
  characterId?: string;
  stageId?: string;
  mapId?: string;
  difficultyId?: string;
  seed?: string;
  challengeId?: string;
  customStageId?: string;
  rulesetId?: string;
  strategyProfileHash?: string;
  speedBucket?: StrategySpeedBucket;
}

const LEADERBOARD_KEY_FIELDS: Array<keyof LeaderboardKey> = [
  'mode',
  'controlMode',
  'autoChallengeType',
  'characterId',
  'stageId',
  'mapId',
  'difficultyId',
  'seed',
  'challengeId',
  'customStageId',
  'rulesetId',
  'strategyProfileHash',
  'speedBucket',
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
    controlMode: params.controlMode,
    autoChallengeType: params.autoChallengeType,
    characterId: params.characterId,
    stageId: params.stageId,
    mapId: params.mapId,
    difficultyId: params.difficultyId,
    seed: params.seed,
    challengeId: params.challengeId,
    customStageId: params.customStageId,
    rulesetId: params.rulesetId,
    strategyProfileHash: params.strategyProfileHash,
    speedBucket: params.speedBucket,
  };
}

export function createChallengeLeaderboardKey(params: Omit<LeaderboardKey, 'mode'> & {
  challengeId: string;
  seed: string;
}): LeaderboardKey {
  return createLeaderboardKey({
    ...params,
    mode: 'challenge',
  });
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
    controlMode: readControlMode(values.get('controlMode')),
    autoChallengeType: readAutoChallengeType(values.get('autoChallengeType')),
    characterId: readOptionalValue(values, 'characterId'),
    stageId: readOptionalValue(values, 'stageId'),
    mapId: readOptionalValue(values, 'mapId'),
    difficultyId: readOptionalValue(values, 'difficultyId'),
    seed: readOptionalValue(values, 'seed'),
    challengeId: readOptionalValue(values, 'challengeId'),
    customStageId: readOptionalValue(values, 'customStageId'),
    rulesetId: readOptionalValue(values, 'rulesetId'),
    strategyProfileHash: readOptionalValue(values, 'strategyProfileHash'),
    speedBucket: readSpeedBucket(values.get('speedBucket')),
  });
}

function readOptionalValue(values: Map<string, string>, field: keyof LeaderboardKey): string | undefined {
  const value = values.get(field);

  return value && value.length > 0 ? value : undefined;
}

function readControlMode(value: string | undefined): LeaderboardControlMode | undefined {
  return value === 'manual' || value === 'autoStrategy' ? value : undefined;
}

function readAutoChallengeType(value: string | undefined): AutoChallengeType | undefined {
  return value === 'normal' || value === 'endless' || value === 'scoreAttack' ? value : undefined;
}

function readSpeedBucket(value: string | undefined): StrategySpeedBucket | undefined {
  return (
    value === '0.5x'
    || value === '1.0x'
    || value === '1.5x'
    || value === '2.0x'
    || value === '2.5x'
    || value === '3.0x'
  )
    ? value
    : undefined;
}
