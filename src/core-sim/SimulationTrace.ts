import type { SimTracePoint } from './SimulationState';

export interface SimulationTraceMismatch {
  index: number;
  tick?: number;
  field: keyof SimTracePoint | 'length';
  expected: unknown;
  actual: unknown;
}

export interface SimulationTraceCompareResult {
  matched: boolean;
  mismatches: SimulationTraceMismatch[];
}

export function compareSimulationTraces(
  expected: readonly SimTracePoint[],
  actual: readonly SimTracePoint[],
): SimulationTraceCompareResult {
  const mismatches: SimulationTraceMismatch[] = [];
  const count = Math.min(expected.length, actual.length);

  if (expected.length !== actual.length) {
    mismatches.push({
      index: count,
      field: 'length',
      expected: expected.length,
      actual: actual.length,
    });
  }

  for (let index = 0; index < count; index += 1) {
    const expectedPoint = expected[index];
    const actualPoint = actual[index];
    const fields = Object.keys(expectedPoint) as Array<keyof SimTracePoint>;

    for (const field of fields) {
      if (expectedPoint[field] !== actualPoint[field]) {
        mismatches.push({
          index,
          tick: expectedPoint.tick,
          field,
          expected: expectedPoint[field],
          actual: actualPoint[field],
        });
      }
    }
  }

  return {
    matched: mismatches.length === 0,
    mismatches,
  };
}
