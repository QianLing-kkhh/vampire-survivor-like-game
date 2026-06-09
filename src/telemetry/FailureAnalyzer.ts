export interface FailureAnalysis {
  reason: 'playerDeath' | 'victory' | 'unknown';
  summary: string;
}

export interface FailureAnalysisContext {
  resultType: 'gameOver' | 'victory';
  survivalTimeSeconds: number;
  finalLevel: number;
  damageTaken: number;
  lowestHp: number;
  killsPerMinute: number;
  expPerMinute: number;
}

export class FailureAnalyzer {
  static analyze(context: FailureAnalysisContext): FailureAnalysis {
    if (context.resultType === 'victory') {
      return {
        reason: 'victory',
        summary: 'Victory: strategy survived the run objective.',
      };
    }

    const lowGrowth = context.finalLevel <= 3 || context.expPerMinute < 45;
    const highDamage = context.damageTaken > 0 && context.survivalTimeSeconds > 0
      && context.damageTaken / Math.max(1, context.survivalTimeSeconds / 60) >= 35;
    const criticalLowHp = context.lowestHp > 0 && context.lowestHp <= 10;
    const lowKills = context.killsPerMinute < 25;

    if (highDamage || criticalLowHp) {
      return {
        reason: 'playerDeath',
        summary: 'Defeat: damage intake was high before death.',
      };
    }

    if (lowGrowth) {
      return {
        reason: 'playerDeath',
        summary: 'Defeat: growth pace was low before death.',
      };
    }

    if (lowKills) {
      return {
        reason: 'playerDeath',
        summary: 'Defeat: kill pressure was low before death.',
      };
    }

    return {
      reason: 'playerDeath',
      summary: 'Defeat: player died before completing the run objective.',
    };
  }
}
