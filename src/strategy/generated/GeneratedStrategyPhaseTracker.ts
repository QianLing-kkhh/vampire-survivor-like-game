import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import type { GeneratedTestStrategy } from './GeneratedStrategyLoader';

import {
  GENERATED_TEST_STRATEGY_ID,
  getGeneratedStrategyPhaseIdAtSeconds,
  getGeneratedStrategyProfileAtSeconds,
  loadGeneratedTestStrategy,
} from './GeneratedStrategyLoader';

export class GeneratedStrategyPhaseTracker {
  private strategy?: GeneratedTestStrategy;
  private activePhaseId?: string;

  setStrategy(strategy: GeneratedTestStrategy | undefined): void {
    this.strategy = strategy;
    this.activePhaseId = undefined;
  }

  setStrategyForProfileId(strategyProfileId: string | undefined): void {
    if (strategyProfileId !== GENERATED_TEST_STRATEGY_ID) {
      this.clear();
      return;
    }

    const generatedStrategy = loadGeneratedTestStrategy();

    if (!generatedStrategy) {
      console.warn(
        '[generated-strategy] Run metadata requested generated_test, but generated-test-strategy.json is unavailable.',
      );
    }

    this.setStrategy(generatedStrategy);
  }

  clear(): void {
    this.setStrategy(undefined);
  }

  hasStrategy(): boolean {
    return this.strategy !== undefined;
  }

  getActiveProfile(elapsedSeconds: number): AutoStrategyProfile | undefined {
    if (!this.strategy) {
      return undefined;
    }

    const phaseId = getGeneratedStrategyPhaseIdAtSeconds(this.strategy, elapsedSeconds);

    if (phaseId !== this.activePhaseId) {
      this.activePhaseId = phaseId;
      console.info(`[generated-strategy] strategyProfileId=generated_test phase=${phaseId}`);
    }

    return getGeneratedStrategyProfileAtSeconds(this.strategy, elapsedSeconds);
  }
}
