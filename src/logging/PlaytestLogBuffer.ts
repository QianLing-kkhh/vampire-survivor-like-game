import { PlaytestLog } from './PlaytestLog';
import { getCurrentVersionInfo } from '../version/VersionInfo';
import { LocalStorageAdapter } from '../save/storage/LocalStorageAdapter';

interface BufferedPlaytestLog {
  row: string;
  timestamp: string;
  runIndex: number;
  sessionId: string;
  previousRunTimestamp: string;
  realTimeGapSeconds: string;
}

type StoredPlaytestLog = string | Partial<BufferedPlaytestLog>;

export class PlaytestLogBuffer {
  private static readonly MAX_ROWS = 1000;
  private static readonly STORAGE_KEY = 'vampire_survivor_like_playtest_logs';
  private static readonly storage = new LocalStorageAdapter();
  private static sessionId = PlaytestLogBuffer.createSessionId();
  private static rows: BufferedPlaytestLog[] = PlaytestLogBuffer.loadStoredRows();

  static append(csvRow: string): void {
    if (!csvRow) {
      return;
    }

    if (!this.isCurrentCsvRow(csvRow)) {
      console.info('Playtest CSV buffer cleared because CSV schema or content hash changed.');
      this.clear();
    }

    if (this.rows.length > 0 && !this.areRowsCompatible(csvRow, this.rows[0].row)) {
      console.info('Playtest CSV buffer cleared because CSV schema or content hash changed.');
      this.clear();
    }

    const timestamp = this.extractTimestamp(csvRow);
    const previousRow = this.rows[this.rows.length - 1];
    const previousRunTimestamp = previousRow?.timestamp ?? '';

    this.rows.push({
      row: csvRow,
      timestamp,
      runIndex: this.getNextRunIndex(),
      sessionId: PlaytestLogBuffer.sessionId,
      previousRunTimestamp,
      realTimeGapSeconds: this.calculateGapSeconds(timestamp, previousRunTimestamp),
    });
    this.trimToMaxRows();
    this.saveRows();
  }

  static getAll(): string[] {
    return this.rows.map((row) => row.row);
  }

  static getCount(): number {
    return this.rows.length;
  }

  static hasRows(): boolean {
    return this.rows.length > 0;
  }

  static toCsvText(): string {
    return this.rows.map((row) => row.row).join('\n');
  }

  static getAllCsvWithHeader(): string {
    const rows = [this.getHeader(), ...this.getRowsWithDiagnostics()];

    return rows.join('\n');
  }

  static clear(): void {
    this.rows = [];
    this.sessionId = PlaytestLogBuffer.createSessionId();
    PlaytestLogBuffer.storage.removeItem(PlaytestLogBuffer.STORAGE_KEY);
  }

  private static getHeader(): string {
    return [
      PlaytestLog.getHeader(),
      'runIndex',
      'sessionId',
      'bufferSizeAtExport',
      'previousRunTimestamp',
      'realTimeGapSeconds',
    ].join(',');
  }

  private static getRowsWithDiagnostics(): string[] {
    const bufferSizeAtExport = this.rows.length.toString();

    return this.rows.map((row) => [
      row.row,
      row.runIndex.toString(),
      this.escapeCsvValue(row.sessionId),
      bufferSizeAtExport,
      this.escapeCsvValue(row.previousRunTimestamp),
      row.realTimeGapSeconds,
    ].join(','));
  }

  private static getNextRunIndex(): number {
    const lastRunIndex = this.rows.reduce(
      (maxRunIndex, row) => Math.max(maxRunIndex, row.runIndex),
      0,
    );

    return lastRunIndex + 1;
  }

  private static trimToMaxRows(): void {
    const overflowCount = this.rows.length - PlaytestLogBuffer.MAX_ROWS;

    if (overflowCount <= 0) {
      return;
    }

    this.rows.splice(0, overflowCount);
  }

  private static loadStoredRows(): BufferedPlaytestLog[] {
    try {
      const rawRows = PlaytestLogBuffer.storage.getItem(PlaytestLogBuffer.STORAGE_KEY);

      if (!rawRows) {
        return [];
      }

      const parsedRows = JSON.parse(rawRows) as StoredPlaytestLog[];

      if (!Array.isArray(parsedRows)) {
        return [];
      }

      return this.normalizeStoredRows(parsedRows)
        .filter((row) => this.isCurrentCsvRow(row.row))
        .slice(-PlaytestLogBuffer.MAX_ROWS);
    } catch {
      return [];
    }
  }

  private static normalizeStoredRows(rows: StoredPlaytestLog[]): BufferedPlaytestLog[] {
    const normalizedRows: BufferedPlaytestLog[] = [];

    rows.forEach((storedRow, index) => {
      const row = typeof storedRow === 'string' ? storedRow : storedRow.row;

      if (!row) {
        return;
      }

      const timestamp = typeof storedRow === 'string'
        ? this.extractTimestamp(row)
        : storedRow.timestamp ?? this.extractTimestamp(row);
      const previousRunTimestamp = typeof storedRow === 'string'
        ? normalizedRows[normalizedRows.length - 1]?.timestamp ?? ''
        : storedRow.previousRunTimestamp
          ?? normalizedRows[normalizedRows.length - 1]?.timestamp
          ?? '';

      normalizedRows.push({
        row,
        timestamp,
        runIndex: typeof storedRow === 'string'
          ? index + 1
          : storedRow.runIndex ?? index + 1,
        sessionId: typeof storedRow === 'string'
          ? PlaytestLogBuffer.sessionId
          : storedRow.sessionId ?? PlaytestLogBuffer.sessionId,
        previousRunTimestamp,
        realTimeGapSeconds: typeof storedRow === 'string'
          ? this.calculateGapSeconds(timestamp, previousRunTimestamp)
          : storedRow.realTimeGapSeconds
            ?? this.calculateGapSeconds(timestamp, previousRunTimestamp),
      });
    });

    return normalizedRows;
  }

  private static saveRows(): void {
    PlaytestLogBuffer.storage.setItem(
      PlaytestLogBuffer.STORAGE_KEY,
      JSON.stringify(this.rows),
    );
  }

  private static extractTimestamp(csvRow: string): string {
    return this.parseCsvLine(csvRow)[this.getPlaytestColumnIndex('timestamp')] ?? '';
  }

  private static isCurrentCsvRow(csvRow: string): boolean {
    const parsedRow = this.parseCsvLine(csvRow);
    const currentVersionInfo = getCurrentVersionInfo();

    return parsedRow[5] === PlaytestLog.getCsvSchemaVersion().toString()
      && parsedRow[4] === currentVersionInfo.contentHash
      && parsedRow[3] === currentVersionInfo.gameVersion;
  }

  private static areRowsCompatible(leftRow: string, rightRow: string): boolean {
    const left = this.parseCsvLine(leftRow);
    const right = this.parseCsvLine(rightRow);

    return left[5] === right[5] && left[4] === right[4] && left[3] === right[3];
  }

  private static calculateGapSeconds(
    timestamp: string,
    previousTimestamp: string,
  ): string {
    if (!timestamp || !previousTimestamp) {
      return '';
    }

    const currentTime = Date.parse(timestamp);
    const previousTime = Date.parse(previousTimestamp);

    if (Number.isNaN(currentTime) || Number.isNaN(previousTime)) {
      return '';
    }

    return Math.max(0, Math.round((currentTime - previousTime) / 1000)).toString();
  }

  private static parseCsvLine(csvRow: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let isQuoted = false;

    for (let index = 0; index < csvRow.length; index += 1) {
      const character = csvRow[index];
      const nextCharacter = csvRow[index + 1];

      if (character === '"' && isQuoted && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        isQuoted = !isQuoted;
        continue;
      }

      if (character === ',' && !isQuoted) {
        values.push(currentValue);
        currentValue = '';
        continue;
      }

      currentValue += character;
    }

    values.push(currentValue);
    return values;
  }

  private static getPlaytestColumnIndex(columnName: string): number {
    return this.parseCsvLine(PlaytestLog.getHeader()).indexOf(columnName);
  }

  private static escapeCsvValue(value: string): string {
    if (!/[",\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }

  private static createSessionId(): string {
    return `session-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}
