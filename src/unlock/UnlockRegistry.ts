import { UnlockDefinition } from './UnlockDefinition';
import { UnlockableType } from './UnlockableType';
import { BUILT_IN_UNLOCKS } from './BuiltInUnlocks';

export class UnlockRegistry {
  private static readonly definitions = new Map<string, UnlockDefinition>();
  private static initialized = false;

  static ensureBuiltInsRegistered(): void {
    if (this.initialized) {
      return;
    }

    this.registerMany(BUILT_IN_UNLOCKS);
    this.initialized = true;
  }

  static register(definition: UnlockDefinition): void {
    if (this.definitions.has(definition.id)) {
      console.warn(`Unlock definition id already registered: ${definition.id}`);
      return;
    }

    this.definitions.set(definition.id, { ...definition });
  }

  static registerMany(definitions: readonly UnlockDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  static get(id: string): UnlockDefinition | undefined {
    this.ensureBuiltInsRegistered();
    const definition = this.definitions.get(id);

    return definition ? { ...definition } : undefined;
  }

  static list(): UnlockDefinition[] {
    this.ensureBuiltInsRegistered();
    return [...this.definitions.values()].map((definition) => ({ ...definition }));
  }

  static listByType(type: UnlockableType): UnlockDefinition[] {
    return this.list().filter((definition) => definition.type === type);
  }

  static findByTarget(
    type: UnlockableType,
    targetId: string,
  ): UnlockDefinition | undefined {
    return this.list().find((definition) => (
      definition.type === type && definition.targetId === targetId
    ));
  }

  static clear(): void {
    this.definitions.clear();
    this.initialized = false;
  }
}
