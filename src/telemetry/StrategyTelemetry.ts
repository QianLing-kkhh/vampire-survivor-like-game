import { DecisionLog, DecisionLogEntry } from './DecisionLog';

export interface StrategyTelemetrySummary {
  decisionCount: number;
  recentDecisions: DecisionLogEntry[];
}

export class StrategyTelemetry {
  private readonly decisionLog = new DecisionLog();

  recordDecision(entry: DecisionLogEntry): void {
    this.decisionLog.add(entry);
  }

  getSummary(): StrategyTelemetrySummary {
    const recentDecisions = this.decisionLog.getRecent(20);

    return {
      decisionCount: recentDecisions.length,
      recentDecisions,
    };
  }
}
