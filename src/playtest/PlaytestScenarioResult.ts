export interface PlaytestScenarioResult {
  scenarioId: string;
  scenarioRunIndex: number;
  scenarioTotalRuns: number;
  runId?: string;
  runSeed?: string;
  resultType?: string;
  survivalTime?: number;
  endlessSurvivalTime?: number;
  finalLevel?: number;
  killCount?: number;
  timestamp: string;
}

