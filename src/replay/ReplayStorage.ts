import { LocalStorageAdapter } from '../save/storage/LocalStorageAdapter';
import { MemoryStorageAdapter } from '../save/storage/MemoryStorageAdapter';

import { ReplayData } from './ReplayData';
import { ReplaySerializer } from './ReplaySerializer';
import { REPLAY_STORAGE_KEY } from './ReplayVersion';

export class ReplayStorage {
  private static readonly MAX_REPLAYS = 10;
  private static memoryReplays: ReplayData[] = [];
  private static readonly storage = new LocalStorageAdapter(new MemoryStorageAdapter());

  save(replay: ReplayData): void {
    const replays = this.list()
      .filter((item) => item.runId !== replay.runId);

    replays.unshift(replay);
    this.saveAll(replays.slice(0, ReplayStorage.MAX_REPLAYS));
  }

  get(id: string): ReplayData | undefined {
    return this.list().find((replay) => replay.runId === id);
  }

  list(): ReplayData[] {
    const raw = this.loadRaw();

    if (!raw) {
      return [...ReplayStorage.memoryReplays];
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return [...ReplayStorage.memoryReplays];
    }

    if (!Array.isArray(parsed)) {
      return [...ReplayStorage.memoryReplays];
    }

    return parsed
      .filter((replay): replay is ReplayData => (
        ReplaySerializer.validate(replay).valid
      ))
      .slice(0, ReplayStorage.MAX_REPLAYS);
  }

  remove(id: string): void {
    this.saveAll(this.list().filter((replay) => replay.runId !== id));
  }

  clear(): void {
    ReplayStorage.memoryReplays = [];
    ReplayStorage.storage.removeItem(REPLAY_STORAGE_KEY);
  }

  private saveAll(replays: ReplayData[]): void {
    ReplayStorage.memoryReplays = [...replays];

    ReplayStorage.storage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
  }

  private loadRaw(): string | null {
    return ReplayStorage.storage.getItem(REPLAY_STORAGE_KEY);
  }
}
