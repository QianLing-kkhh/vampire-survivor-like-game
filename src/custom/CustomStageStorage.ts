import { CustomStagePackage } from './CustomStageSchema';
import { CustomStageSerializer } from './CustomStageSerializer';

export class CustomStageStorage {
  private static readonly STORAGE_KEY = 'vampire_survivor_like_custom_stages_v1';
  private memoryPackages: CustomStagePackage[] = [];

  list(): CustomStagePackage[] {
    return this.loadPackages().map((stagePackage) => (
      CustomStageSerializer.clone(stagePackage)
    ));
  }

  get(id: string): CustomStagePackage | undefined {
    const stagePackage = this.loadPackages().find((candidate) => candidate.id === id);

    return stagePackage ? CustomStageSerializer.clone(stagePackage) : undefined;
  }

  save(stagePackage: CustomStagePackage): void {
    const normalizedPackage = CustomStageSerializer.normalize(stagePackage);
    const packages = this.loadPackages()
      .filter((candidate) => candidate.id !== normalizedPackage.id);

    packages.push(normalizedPackage);
    this.savePackages(packages);
  }

  remove(id: string): void {
    this.savePackages(this.loadPackages().filter((stagePackage) => stagePackage.id !== id));
  }

  clear(): void {
    this.memoryPackages = [];

    try {
      globalThis.localStorage?.removeItem(CustomStageStorage.STORAGE_KEY);
    } catch {
      // Memory fallback already cleared.
    }
  }

  private loadPackages(): CustomStagePackage[] {
    try {
      const rawValue = globalThis.localStorage?.getItem(CustomStageStorage.STORAGE_KEY);

      if (!rawValue) {
        return this.memoryPackages;
      }

      const parsedValue = JSON.parse(rawValue) as unknown;

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue as CustomStagePackage[];
    } catch {
      return this.memoryPackages;
    }
  }

  private savePackages(packages: CustomStagePackage[]): void {
    this.memoryPackages = packages.map((stagePackage) => (
      CustomStageSerializer.clone(stagePackage)
    ));

    try {
      globalThis.localStorage?.setItem(
        CustomStageStorage.STORAGE_KEY,
        JSON.stringify(this.memoryPackages),
      );
    } catch {
      // Keep memory fallback when localStorage is unavailable.
    }
  }
}
