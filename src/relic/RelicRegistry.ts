import { RelicDefinition } from './RelicDefinition';

export class RelicRegistry {
  private static readonly definitions = new Map<string, RelicDefinition>();

  static register(definition: RelicDefinition): void {
    if (this.definitions.has(definition.id)) {
      console.warn(`Relic definition id already registered: ${definition.id}`);
      return;
    }

    this.definitions.set(definition.id, this.clone(definition));
  }

  static registerMany(definitions: readonly RelicDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  static get(id: string): RelicDefinition | undefined {
    const definition = this.definitions.get(id);

    return definition ? this.clone(definition) : undefined;
  }

  static list(): RelicDefinition[] {
    return [...this.definitions.values()].map((definition) => this.clone(definition));
  }

  static clear(): void {
    this.definitions.clear();
  }

  private static clone(definition: RelicDefinition): RelicDefinition {
    return JSON.parse(JSON.stringify(definition)) as RelicDefinition;
  }
}
