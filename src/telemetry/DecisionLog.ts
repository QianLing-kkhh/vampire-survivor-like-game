export interface DecisionLogEntry {
  timeSeconds: number;
  type: 'movement' | 'upgrade' | 'treasure' | 'relic';
  decision: string;
  reason?: string;
}

export class DecisionLog {
  private readonly entries: DecisionLogEntry[] = [];

  add(entry: DecisionLogEntry): void {
    this.entries.push({ ...entry });
  }

  getRecent(limit = 60): DecisionLogEntry[] {
    return this.entries.slice(-Math.max(0, limit)).map((entry) => ({ ...entry }));
  }
}
