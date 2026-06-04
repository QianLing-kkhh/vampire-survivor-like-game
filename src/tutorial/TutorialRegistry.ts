import { BUILT_IN_TUTORIALS } from './BuiltInTutorials';
import { TutorialStep } from './TutorialStep';

export class TutorialRegistry {
  private static readonly steps = new Map<string, TutorialStep>();
  private static initialized = false;

  static ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.registerMany(BUILT_IN_TUTORIALS);
    this.initialized = true;
  }

  static register(step: TutorialStep): void {
    if (this.steps.has(step.id)) {
      console.warn(`Tutorial step id conflict skipped: ${step.id}`);
      return;
    }

    this.steps.set(step.id, step);
  }

  static registerMany(steps: readonly TutorialStep[]): void {
    for (const step of steps) {
      this.register(step);
    }
  }

  static get(id: string): TutorialStep | undefined {
    this.ensureInitialized();
    return this.steps.get(id);
  }

  static list(): TutorialStep[] {
    this.ensureInitialized();
    return [...this.steps.values()]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  static clear(): void {
    this.steps.clear();
    this.initialized = false;
  }
}
