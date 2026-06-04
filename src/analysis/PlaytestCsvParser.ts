export type PlaytestCsvRow = Record<string, string>;

export interface ParsedPlaytestCsv {
  headers: string[];
  rows: PlaytestCsvRow[];
}

export class PlaytestCsvParser {
  parse(text: string): ParsedPlaytestCsv {
    const parsedRows = this.parseRows(text).filter((row) => row.some((value) => value.length > 0));
    const headers = parsedRows[0] ?? [];
    const rows = parsedRows.slice(1).map((values) => this.toRecord(headers, values));

    return { headers, rows };
  }

  private parseRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let isQuoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const nextCharacter = text[index + 1];

      if (character === '"' && isQuoted && nextCharacter === '"') {
        value += '"';
        index += 1;
        continue;
      }

      if (character === '"') {
        isQuoted = !isQuoted;
        continue;
      }

      if (character === ',' && !isQuoted) {
        row.push(value);
        value = '';
        continue;
      }

      if ((character === '\n' || character === '\r') && !isQuoted) {
        if (character === '\r' && nextCharacter === '\n') {
          index += 1;
        }
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
        continue;
      }

      value += character;
    }

    if (value.length > 0 || row.length > 0) {
      row.push(value);
      rows.push(row);
    }

    return rows;
  }

  private toRecord(headers: string[], values: string[]): PlaytestCsvRow {
    const row: PlaytestCsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  }
}
