import { ChallengeDefinition } from './ChallengeDefinition';
import { DailyChallengeGenerator } from './DailyChallengeGenerator';

export class ChallengeRegistry {
  private static readonly challenges = new Map<string, ChallengeDefinition>();
  private static initialized = false;

  static ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.register(new DailyChallengeGenerator().generate());
    this.initialized = true;
  }

  static register(challenge: ChallengeDefinition): void {
    if (this.challenges.has(challenge.id)) {
      console.warn(`Challenge id conflict skipped: ${challenge.id}`);
      return;
    }

    this.challenges.set(challenge.id, this.clone(challenge));
  }

  static registerMany(challenges: readonly ChallengeDefinition[]): void {
    for (const challenge of challenges) {
      this.register(challenge);
    }
  }

  static get(id: string): ChallengeDefinition | undefined {
    this.ensureInitialized();
    const challenge = this.challenges.get(id);

    return challenge ? this.clone(challenge) : undefined;
  }

  static list(): ChallengeDefinition[] {
    this.ensureInitialized();
    return Array.from(this.challenges.values()).map((challenge) => this.clone(challenge));
  }

  static clear(): void {
    this.challenges.clear();
    this.initialized = false;
  }

  private static clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
