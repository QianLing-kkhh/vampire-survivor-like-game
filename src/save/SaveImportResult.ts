import { SaveData } from './SaveData';

export interface SaveImportIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface SaveImportResult {
  success: boolean;
  save?: SaveData;
  errors: SaveImportIssue[];
  warnings: SaveImportIssue[];
}

export function createSaveImportResult(
  issues: SaveImportIssue[],
  save?: SaveData,
): SaveImportResult {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return {
    success: errors.length === 0,
    save,
    errors,
    warnings,
  };
}
