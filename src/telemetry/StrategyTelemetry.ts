import { DecisionLog, DecisionLogEntry } from './DecisionLog';
import { FailureAnalyzer, FailureAnalysis } from './FailureAnalyzer';

export interface StrategyTelemetrySummary {
  failureReason: FailureAnalysis['reason'];
  summary: string;
  killsPerMinute: number;
  expPerMinute: number;
  damageTakenPerMinute: number;
  treasuresOpenedPerMinute: number;
  upgradeCount: number;
  evolutionCount: number;
  relicCount: number;
  decisionCount: number;
  recentDecisions: DecisionLogEntry[];
}

export interface StrategyTelemetryContext {
  resultType: 'gameOver' | 'victory';
  survivalTimeSeconds: number;
  finalLevel: number;
  finalExp: number;
  killCount: number;
  treasureOpenCount: number;
  upgradeCount: number;
  evolutionCount: number;
  relicCount: number;
  damageTaken: number;
  lowestHp: number;
}

export class StrategyTelemetry {
  private readonly decisionLog = new DecisionLog();

  recordDecision(entry: DecisionLogEntry): void {
    this.decisionLog.add(entry);
  }

  getSummary(): StrategyTelemetrySummary {
    const recentDecisions = this.decisionLog.getRecent(20);

    return {
      failureReason: 'unknown',
      summary: 'No strategy telemetry summary was generated.',
      killsPerMinute: 0,
      expPerMinute: 0,
      damageTakenPerMinute: 0,
      treasuresOpenedPerMinute: 0,
      upgradeCount: 0,
      evolutionCount: 0,
      relicCount: 0,
      decisionCount: this.decisionLog.getCount(),
      recentDecisions,
    };
  }

  static buildSummary(context: StrategyTelemetryContext): StrategyTelemetrySummary {
    const minutes = Math.max(1 / 60, context.survivalTimeSeconds / 60);
    const killsPerMinute = StrategyTelemetry.round(context.killCount / minutes);
    const expPerMinute = StrategyTelemetry.round(context.finalExp / minutes);
    const damageTakenPerMinute = StrategyTelemetry.round(context.damageTaken / minutes);
    const treasuresOpenedPerMinute = StrategyTelemetry.round(context.treasureOpenCount / minutes);
    const failure = FailureAnalyzer.analyze({
      resultType: context.resultType,
      survivalTimeSeconds: context.survivalTimeSeconds,
      finalLevel: context.finalLevel,
      damageTaken: context.damageTaken,
      lowestHp: context.lowestHp,
      killsPerMinute,
      expPerMinute,
    });

    return {
      failureReason: failure.reason,
      summary: failure.summary,
      killsPerMinute,
      expPerMinute,
      damageTakenPerMinute,
      treasuresOpenedPerMinute,
      upgradeCount: context.upgradeCount,
      evolutionCount: context.evolutionCount,
      relicCount: context.relicCount,
      decisionCount: 0,
      recentDecisions: [],
    };
  }

  static serializeSummary(summary: StrategyTelemetrySummary): string {
    return JSON.stringify({
      failureReason: summary.failureReason,
      summary: summary.summary,
      killsPerMinute: summary.killsPerMinute,
      expPerMinute: summary.expPerMinute,
      damageTakenPerMinute: summary.damageTakenPerMinute,
      treasuresOpenedPerMinute: summary.treasuresOpenedPerMinute,
      upgradeCount: summary.upgradeCount,
      evolutionCount: summary.evolutionCount,
      relicCount: summary.relicCount,
      decisionCount: summary.decisionCount,
    });
  }

  private static round(value: number): number {
    return Number.isFinite(value)
      ? Math.round(value * 10) / 10
      : 0;
  }
}
