import { ChallengeDefinition } from './ChallengeDefinition';

export class ChallengeRules {
  static getRulesetId(challenge: ChallengeDefinition): string {
    const difficultyId = challenge.difficultyId ?? 'normal';
    const mutatorIds = (challenge.mutators ?? [])
      .map((mutator, index) => mutator.id ?? `${mutator.type}:${index}`);

    return mutatorIds.length === 0
      ? `${challenge.id}:${difficultyId}`
      : `${challenge.id}:${difficultyId}+${mutatorIds.join('+')}`;
  }

  static isEndlessEnabled(challenge: ChallengeDefinition): boolean {
    return challenge.endlessMode === true;
  }
}
