export interface FailureAnalysis {
  reason: 'playerDeath' | 'victory' | 'unknown';
  summary: string;
}

export class FailureAnalyzer {
  static analyze(resultType: 'gameOver' | 'victory'): FailureAnalysis {
    if (resultType === 'victory') {
      return {
        reason: 'victory',
        summary: 'Run ended in victory.',
      };
    }

    return {
      reason: 'playerDeath',
      summary: 'Run ended because the player died.',
    };
  }
}
