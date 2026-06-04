import { RunSeed } from '../random/RunSeed';

import { PlaytestScenario, PlaytestScenarioRunConfig } from './PlaytestScenario';
import { PlaytestScenarioResult } from './PlaytestScenarioResult';

export interface PlaytestScenarioSummary {
  active: boolean;
  scenarioId?: string;
  name?: string;
  completedRuns: number;
  totalRuns: number;
  remainingRuns: number;
}

export class PlaytestScenarioRunner {
  private activeScenario?: PlaytestScenario;
  private completedRuns = 0;
  private readonly results: PlaytestScenarioResult[] = [];

  startScenario(scenario: PlaytestScenario): PlaytestScenarioRunConfig {
    this.activeScenario = this.cloneScenario(scenario);
    this.completedRuns = 0;
    this.results.length = 0;

    return this.createRunConfig();
  }

  onRunEnded(result: Omit<PlaytestScenarioResult, 'scenarioId' | 'scenarioRunIndex' | 'scenarioTotalRuns' | 'timestamp'>): void {
    if (!this.activeScenario) {
      return;
    }

    this.completedRuns = Math.min(this.completedRuns + 1, this.getTotalRuns());
    this.results.push({
      scenarioId: this.activeScenario.id,
      scenarioRunIndex: this.completedRuns,
      scenarioTotalRuns: this.getTotalRuns(),
      timestamp: new Date().toISOString(),
      ...result,
    });
  }

  shouldStartNextRun(): boolean {
    return this.activeScenario !== undefined && this.completedRuns < this.getTotalRuns();
  }

  getCurrentRunConfig(): PlaytestScenarioRunConfig | null {
    return this.activeScenario ? this.createRunConfig() : null;
  }

  getCurrentScenarioSummary(): PlaytestScenarioSummary {
    const totalRuns = this.getTotalRuns();

    return {
      active: this.activeScenario !== undefined,
      scenarioId: this.activeScenario?.id,
      name: this.activeScenario?.name,
      completedRuns: this.completedRuns,
      totalRuns,
      remainingRuns: Math.max(0, totalRuns - this.completedRuns),
    };
  }

  getResults(): PlaytestScenarioResult[] {
    return this.results.map((result) => ({ ...result }));
  }

  stop(): void {
    this.activeScenario = undefined;
    this.completedRuns = 0;
    this.results.length = 0;
  }

  private createRunConfig(): PlaytestScenarioRunConfig {
    if (!this.activeScenario) {
      throw new Error('Cannot create playtest run config without an active scenario.');
    }

    const nextRunIndex = Math.min(this.completedRuns + 1, this.getTotalRuns());
    const selection = { ...this.activeScenario.selection };

    if (selection.seedMode === 'sequence') {
      selection.seed = RunSeed.normalizeSeed(`${this.activeScenario.id}:${nextRunIndex}`);
    }

    return {
      scenarioId: this.activeScenario.id,
      scenarioRunIndex: nextRunIndex,
      scenarioTotalRuns: this.getTotalRuns(),
      selection,
      settings: { ...this.activeScenario.settings },
      mutators: [...(this.activeScenario.mutators ?? [])],
    };
  }

  private getTotalRuns(): number {
    return Math.max(0, Math.floor(this.activeScenario?.runs ?? 0));
  }

  private cloneScenario(scenario: PlaytestScenario): PlaytestScenario {
    return JSON.parse(JSON.stringify(scenario)) as PlaytestScenario;
  }
}

