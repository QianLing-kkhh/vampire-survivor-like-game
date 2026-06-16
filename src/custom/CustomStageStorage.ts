import { LocalStorageAdapter } from '../save/storage/LocalStorageAdapter';
import { MemoryStorageAdapter } from '../save/storage/MemoryStorageAdapter';

import { CustomStagePackage } from './CustomStageSchema';
import { CustomStageSerializer } from './CustomStageSerializer';
import { CustomStageValidator } from './CustomStageValidator';

export class CustomStageStorage {
  private static readonly STORAGE_KEY = 'vampire_survivor_like_custom_stages_v1';
  private readonly storage = new LocalStorageAdapter(new MemoryStorageAdapter());
  private memoryPackages: CustomStagePackage[] = [];

  list(): CustomStagePackage[] {
    return this.loadPackages()
      .map((stagePackage) => this.safeClone(stagePackage))
      .filter((stagePackage): stagePackage is CustomStagePackage => stagePackage !== null);
  }

  listValid(validator = new CustomStageValidator()): CustomStagePackage[] {
    return this.list().filter((stagePackage) => {
      const result = validator.validate(stagePackage);

      return result.valid;
    });
  }

  get(id: string): CustomStagePackage | undefined {
    const stagePackage = this.loadPackages().find((candidate) => candidate.id === id);

    return stagePackage ? this.safeClone(stagePackage) ?? undefined : undefined;
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
    this.storage.removeItem(CustomStageStorage.STORAGE_KEY);
  }

  private loadPackages(): CustomStagePackage[] {
    try {
      const rawValue = this.storage.getItem(CustomStageStorage.STORAGE_KEY);

      if (!rawValue) {
        return this.memoryPackages;
      }

      const parsedValue = JSON.parse(rawValue) as unknown;

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue
        .map((value) => this.safeClone(value as CustomStagePackage))
        .filter((value): value is CustomStagePackage => value !== null);
    } catch {
      return this.memoryPackages;
    }
  }

  private savePackages(packages: CustomStagePackage[]): void {
    this.memoryPackages = packages.map((stagePackage) => (
      CustomStageSerializer.clone(stagePackage)
    ));

    this.storage.setItem(
      CustomStageStorage.STORAGE_KEY,
      JSON.stringify(this.memoryPackages),
    );
  }

  private safeClone(stagePackage: CustomStagePackage): CustomStagePackage | null {
    try {
      return CustomStageSerializer.clone(stagePackage);
    } catch {
      console.warn('Skipping corrupted custom stage package.');
      return null;
    }
  }
}
