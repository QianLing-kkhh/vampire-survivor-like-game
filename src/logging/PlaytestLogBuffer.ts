import { PlaytestLog } from './PlaytestLog';

export class PlaytestLogBuffer {
  private static readonly MAX_ROWS = 1000;
  private static readonly rows: string[] = [];

  static append(csvRow: string): void {
    if (!csvRow) {
      return;
    }

    this.rows.push(csvRow);
    this.trimToMaxRows();
  }

  static getAll(): string[] {
    return [...this.rows];
  }

  static getCount(): number {
    return this.rows.length;
  }

  static hasRows(): boolean {
    return this.rows.length > 0;
  }

  static toCsvText(): string {
    return this.rows.join('\n');
  }

  static getAllCsvWithHeader(): string {
    const rows = [PlaytestLog.getHeader(), ...this.rows];

    return rows.join('\n');
  }

  static clear(): void {
    this.rows.length = 0;
  }

  private static trimToMaxRows(): void {
    const overflowCount = this.rows.length - PlaytestLogBuffer.MAX_ROWS;

    if (overflowCount <= 0) {
      return;
    }

    this.rows.splice(0, overflowCount);
  }
}
