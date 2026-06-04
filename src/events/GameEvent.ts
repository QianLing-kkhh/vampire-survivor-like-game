export interface GameEvent<TType extends string = string, TPayload = unknown> {
  id: string;
  type: TType;
  payload: TPayload;
  gameTimeSeconds: number;
  realTimestamp: string;
  runId?: string;
}
