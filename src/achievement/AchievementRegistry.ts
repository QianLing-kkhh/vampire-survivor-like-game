import { AchievementDefinition } from './AchievementDefinition';
import { BUILT_IN_ACHIEVEMENTS } from './BuiltInAchievements';

export class AchievementRegistry {
  private static readonly definitions = new Map<string, AchievementDefinition>();
  private static initialized = false;

  static ensureBuiltInsRegistered(): void {
    if (this.initialized) {
      return;
    }

    this.registerMany(BUILT_IN_ACHIEVEMENTS);
    this.initialized = true;
  }

  static register(definition: AchievementDefinition): void {
    if (this.definitions.has(definition.id)) {
      console.warn(`Achievement id already registered: ${definition.id}`);
      return;
    }

    this.definitions.set(definition.id, definition);
  }

  static registerMany(definitions: readonly AchievementDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  static get(id: string): AchievementDefinition | undefined {
    this.ensureBuiltInsRegistered();
    return this.definitions.get(id);
  }

  static list(): AchievementDefinition[] {
    this.ensureBuiltInsRegistered();
    return [...this.definitions.values()];
  }

  static clear(): void {
    this.definitions.clear();
    this.initialized = false;
  }
}
