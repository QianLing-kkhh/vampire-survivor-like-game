import type { AudioPort } from './AudioPort';
import type { ClockPort } from './ClockPort';
import type { InputPort } from './InputPort';
import type { RenderEventPort } from './RenderEventPort';
import type { StoragePort } from './StoragePort';

export interface EngineAdapter {
  input: InputPort;
  storage: StoragePort;
  audio: AudioPort;
  render: RenderEventPort;
  clock: ClockPort;
}
