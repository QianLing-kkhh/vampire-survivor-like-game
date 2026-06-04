import { SelectionState } from '../selection/SelectionState';

export class RunSeed {
  static createRandomSeed(): string {
    const cryptoApi = globalThis.crypto as Crypto | undefined;
    const uuid = cryptoApi?.randomUUID?.();

    if (uuid) {
      return uuid.slice(0, 13);
    }

    return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`;
  }

  static createSeedFromSelection(selection: SelectionState, timestamp = Date.now()): string {
    if (selection.seed) {
      return RunSeed.normalizeSeed(selection.seed);
    }

    return RunSeed.normalizeSeed([
      selection.characterId,
      selection.stageId,
      selection.mapId,
      timestamp.toString(36),
      RunSeed.createRandomSeed(),
    ].join(':'));
  }

  static normalizeSeed(seed: string): string {
    const normalizedSeed = seed.trim();

    return normalizedSeed.length > 0 ? normalizedSeed : RunSeed.createRandomSeed();
  }
}
