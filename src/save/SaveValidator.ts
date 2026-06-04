import { SAVE_SCHEMA_VERSION, SaveData } from './SaveData';
import {
  SaveImportIssue,
  SaveImportResult,
  createSaveImportResult,
} from './SaveImportResult';

export class SaveValidator {
  validateSave(data: unknown): SaveImportResult {
    const issues: SaveImportIssue[] = [];

    if (!this.isObject(data)) {
      issues.push(this.error('invalid_save', 'Save data must be an object.'));
      return createSaveImportResult(issues);
    }

    this.validateSchemaVersion(data, issues);
    this.validateObjectField(data, 'settings', issues);
    this.validateObjectField(data, 'progression', issues);
    this.validateSelections(data.selections, issues);
    this.validateObjectField(data, 'cosmetics', issues);
    this.validateRecords(data.records, issues);

    return createSaveImportResult(issues, issues.some((issue) => issue.level === 'error')
      ? undefined
      : data as unknown as SaveData);
  }

  private validateSchemaVersion(
    data: Record<string, unknown>,
    issues: SaveImportIssue[],
  ): void {
    if (typeof data.schemaVersion !== 'number') {
      issues.push(this.warning(
        'missing_schema_version',
        'schemaVersion is missing or invalid; migrator will apply defaults.',
        'schemaVersion',
      ));
      return;
    }

    if (data.schemaVersion > SAVE_SCHEMA_VERSION) {
      issues.push(this.error(
        'unsupported_future_schema',
        `Unsupported future save version: ${data.schemaVersion}. Current version is ${SAVE_SCHEMA_VERSION}.`,
        'schemaVersion',
      ));
      return;
    }

    if (data.schemaVersion < SAVE_SCHEMA_VERSION) {
      issues.push(this.warning(
        'old_schema_version',
        `Save schema ${data.schemaVersion} will be migrated to ${SAVE_SCHEMA_VERSION}.`,
        'schemaVersion',
      ));
    }
  }

  private validateObjectField(
    data: Record<string, unknown>,
    field: string,
    issues: SaveImportIssue[],
  ): void {
    if (!this.isObject(data[field])) {
      issues.push(this.warning(
        `invalid_${field}`,
        `${field} is missing or invalid; migrator will apply defaults.`,
        field,
      ));
    }
  }

  private validateSelections(value: unknown, issues: SaveImportIssue[]): void {
    if (!this.isObject(value)) {
      issues.push(this.warning(
        'invalid_selections',
        'selections is missing or invalid; migrator will apply defaults.',
        'selections',
      ));
      return;
    }

    this.validateOptionalString(value, 'selectedCharacterId', 'selections.selectedCharacterId', issues);
    this.validateOptionalString(value, 'selectedStageId', 'selections.selectedStageId', issues);
    this.validateOptionalString(value, 'selectedMapId', 'selections.selectedMapId', issues);
    this.validateOptionalString(value, 'selectedDifficultyId', 'selections.selectedDifficultyId', issues);
    this.validateOptionalString(value, 'selectedThemeId', 'selections.selectedThemeId', issues);
  }

  private validateRecords(value: unknown, issues: SaveImportIssue[]): void {
    if (!this.isObject(value)) {
      issues.push(this.warning(
        'invalid_records',
        'records is missing or invalid; migrator will apply defaults.',
        'records',
      ));
      return;
    }

    if (
      value.leaderboardsByKey !== undefined
      && !this.isObject(value.leaderboardsByKey)
    ) {
      issues.push(this.warning(
        'invalid_leaderboards',
        'records.leaderboardsByKey should be an object.',
        'records.leaderboardsByKey',
      ));
    }
  }

  private validateOptionalString(
    data: Record<string, unknown>,
    field: string,
    path: string,
    issues: SaveImportIssue[],
  ): void {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      issues.push(this.warning(
        `invalid_${field}`,
        `${path} should be a string; migrator may replace it with a default.`,
        path,
      ));
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private error(code: string, message: string, path?: string): SaveImportIssue {
    return { level: 'error', code, message, path };
  }

  private warning(code: string, message: string, path?: string): SaveImportIssue {
    return { level: 'warning', code, message, path };
  }
}
