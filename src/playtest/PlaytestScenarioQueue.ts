import { PlaytestScenario } from './PlaytestScenario';

export interface PlaytestScenarioQueueProgress {
  queuedCount: number;
  hasCurrent: boolean;
  currentScenarioId?: string;
}

export class PlaytestScenarioQueue {
  private readonly scenarios: PlaytestScenario[] = [];
  private currentScenario?: PlaytestScenario;

  enqueue(scenario: PlaytestScenario): void {
    this.scenarios.push(this.cloneScenario(scenario));
  }

  dequeue(): PlaytestScenario | undefined {
    this.currentScenario = this.scenarios.shift();
    return this.current();
  }

  current(): PlaytestScenario | undefined {
    return this.currentScenario
      ? this.cloneScenario(this.currentScenario)
      : undefined;
  }

  clear(): void {
    this.scenarios.length = 0;
    this.currentScenario = undefined;
  }

  progress(): PlaytestScenarioQueueProgress {
    return {
      queuedCount: this.scenarios.length,
      hasCurrent: this.currentScenario !== undefined,
      currentScenarioId: this.currentScenario?.id,
    };
  }

  private cloneScenario(scenario: PlaytestScenario): PlaytestScenario {
    return JSON.parse(JSON.stringify(scenario)) as PlaytestScenario;
  }
}

