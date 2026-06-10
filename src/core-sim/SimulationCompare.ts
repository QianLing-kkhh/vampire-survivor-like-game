import type { SimulationAggregateReport, SimulationAggregateGroup } from './SimulationAggregate';

export type ThresholdStatus = 'pass' | 'warn' | 'fail';
export type ThresholdPolicyId = 'smoke' | 'regression';

export interface SimulationThresholdPolicy {
  id: ThresholdPolicyId | string;
  failRelativeDrop: number;
  warnRelativeDrop: number;
  failAbsoluteSurvivalDropSeconds: number;
  warnAbsoluteSurvivalDropSeconds: number;
}

export interface SimulationCompareIssue {
  status: ThresholdStatus;
  groupKey: string;
  metric: string;
  baseline: number | string;
  current: number | string;
  message: string;
}

export interface SimulationCompareReport {
  schemaVersion: 1;
  status: ThresholdStatus;
  policyId: string;
  baselineRunCount: number;
  currentRunCount: number;
  issues: SimulationCompareIssue[];
}

export function createThresholdPolicy(id: string): SimulationThresholdPolicy {
  if (id === 'smoke') {
    return {
      id,
      failRelativeDrop: 0.5,
      warnRelativeDrop: 0.25,
      failAbsoluteSurvivalDropSeconds: 30,
      warnAbsoluteSurvivalDropSeconds: 10,
    };
  }

  return {
    id: 'regression',
    failRelativeDrop: 0.12,
    warnRelativeDrop: 0.06,
    failAbsoluteSurvivalDropSeconds: 20,
    warnAbsoluteSurvivalDropSeconds: 8,
  };
}

export function compareSimulationAggregates(
  baseline: SimulationAggregateReport,
  current: SimulationAggregateReport,
  policy = createThresholdPolicy('regression'),
): SimulationCompareReport {
  const issues: SimulationCompareIssue[] = [];
  const currentGroups = new Map(current.groups.map((group) => [group.key, group]));

  for (const baselineGroup of baseline.groups) {
    const currentGroup = currentGroups.get(baselineGroup.key);

    if (!currentGroup) {
      issues.push({
        status: 'fail',
        groupKey: baselineGroup.key,
        metric: 'missingGroup',
        baseline: 'present',
        current: 'missing',
        message: `Current results are missing group ${baselineGroup.key}.`,
      });
      continue;
    }

    compareDrop(issues, baselineGroup, currentGroup, 'averageSurvivalTimeSeconds', policy, {
      failAbsoluteDrop: policy.failAbsoluteSurvivalDropSeconds,
      warnAbsoluteDrop: policy.warnAbsoluteSurvivalDropSeconds,
    });
    compareDrop(issues, baselineGroup, currentGroup, 'averageScore', policy);
    compareDrop(issues, baselineGroup, currentGroup, 'averageKills', policy);
    compareDrop(issues, baselineGroup, currentGroup, 'averageLevel', policy);
    compareIncrease(issues, baselineGroup, currentGroup, 'averageDamageTaken', policy);
    compareDrop(issues, baselineGroup, currentGroup, 'victoryRate', policy);
  }

  const status = issues.some((issue) => issue.status === 'fail')
    ? 'fail'
    : issues.some((issue) => issue.status === 'warn') ? 'warn' : 'pass';

  return {
    schemaVersion: 1,
    status,
    policyId: policy.id,
    baselineRunCount: baseline.totalRuns,
    currentRunCount: current.totalRuns,
    issues,
  };
}

export function compareToMarkdown(report: SimulationCompareReport): string {
  const lines = [
    '# Headless Simulation Compare',
    '',
    `Status: ${report.status}`,
    `Policy: ${report.policyId}`,
    `Baseline runs: ${report.baselineRunCount}`,
    `Current runs: ${report.currentRunCount}`,
    '',
  ];

  if (report.issues.length === 0) {
    lines.push('No threshold issues.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Status | Group | Metric | Baseline | Current | Message |');
  lines.push('|---|---|---|---:|---:|---|');

  for (const issue of report.issues) {
    lines.push(`| ${issue.status} | ${issue.groupKey} | ${issue.metric} | ${issue.baseline} | ${issue.current} | ${issue.message} |`);
  }

  return `${lines.join('\n')}\n`;
}

function compareDrop(
  issues: SimulationCompareIssue[],
  baseline: SimulationAggregateGroup,
  current: SimulationAggregateGroup,
  metric: keyof Pick<
    SimulationAggregateGroup,
    'averageSurvivalTimeSeconds' | 'averageScore' | 'averageKills' | 'averageLevel' | 'victoryRate'
  >,
  policy: SimulationThresholdPolicy,
  absolute?: { failAbsoluteDrop: number; warnAbsoluteDrop: number },
): void {
  const baselineValue = baseline[metric];
  const currentValue = current[metric];
  const drop = baselineValue - currentValue;
  const relativeDrop = baselineValue > 0 ? drop / baselineValue : 0;
  const fail = relativeDrop >= policy.failRelativeDrop || (absolute && drop >= absolute.failAbsoluteDrop);
  const warn = relativeDrop >= policy.warnRelativeDrop || (absolute && drop >= absolute.warnAbsoluteDrop);

  if (!fail && !warn) {
    return;
  }

  issues.push({
    status: fail ? 'fail' : 'warn',
    groupKey: baseline.key,
    metric,
    baseline: roundMetric(baselineValue),
    current: roundMetric(currentValue),
    message: `${metric} dropped by ${roundMetric(drop)} (${roundMetric(relativeDrop * 100)}%).`,
  });
}

function compareIncrease(
  issues: SimulationCompareIssue[],
  baseline: SimulationAggregateGroup,
  current: SimulationAggregateGroup,
  metric: keyof Pick<SimulationAggregateGroup, 'averageDamageTaken'>,
  policy: SimulationThresholdPolicy,
): void {
  const baselineValue = baseline[metric];
  const currentValue = current[metric];
  const increase = currentValue - baselineValue;
  const relativeIncrease = baselineValue > 0 ? increase / baselineValue : increase > 0 ? 1 : 0;

  if (relativeIncrease < policy.warnRelativeDrop) {
    return;
  }

  issues.push({
    status: relativeIncrease >= policy.failRelativeDrop ? 'fail' : 'warn',
    groupKey: baseline.key,
    metric,
    baseline: roundMetric(baselineValue),
    current: roundMetric(currentValue),
    message: `${metric} increased by ${roundMetric(increase)} (${roundMetric(relativeIncrease * 100)}%).`,
  });
}

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}
