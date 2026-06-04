export type CustomStageValidationIssueLevel = 'error' | 'warning';

export interface CustomStageValidationIssue {
  level: CustomStageValidationIssueLevel;
  code: string;
  message: string;
  path?: string;
}

export interface CustomStageValidationResult {
  valid: boolean;
  errors: CustomStageValidationIssue[];
  warnings: CustomStageValidationIssue[];
}

export function createCustomStageValidationResult(
  issues: CustomStageValidationIssue[],
): CustomStageValidationResult {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
