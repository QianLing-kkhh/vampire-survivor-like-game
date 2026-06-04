import type { CustomStagePackage } from '../custom/CustomStageSchema';
import type { ReplayData } from '../replay/ReplayData';
import type { SaveData } from '../save/SaveData';

import { getCurrentVersionInfo } from './VersionInfo';

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
}

export class CompatibilityCheck {
  static checkReplayCompatibility(replay: Partial<ReplayData>): CompatibilityResult {
    const current = getCurrentVersionInfo();
    const result = this.createResult();
    const replayVersion = this.readNumber(replay.replayVersion);
    const gameVersion = replay.versionInfo?.gameVersion ?? replay.gameVersion;
    const contentHash = replay.versionInfo?.contentHash ?? replay.contentHash;

    this.compareSchema(
      'Replay',
      replayVersion,
      current.replaySchemaVersion,
      result,
    );
    this.compareGameVersion(gameVersion, result);
    this.compareContentHash(contentHash, result);

    return this.finalize(result);
  }

  static checkSaveCompatibility(save: Partial<SaveData>): CompatibilityResult {
    const current = getCurrentVersionInfo();
    const result = this.createResult();

    this.compareSchema(
      'Save',
      this.readNumber(save.schemaVersion),
      current.saveSchemaVersion,
      result,
    );
    this.compareGameVersion(save.versionInfo?.gameVersion, result);
    this.compareContentHash(save.versionInfo?.contentHash, result);

    return this.finalize(result);
  }

  static checkCustomStageCompatibility(
    customStagePackage: Partial<CustomStagePackage>,
  ): CompatibilityResult {
    const current = getCurrentVersionInfo();
    const result = this.createResult();

    this.compareSchema(
      'Custom stage',
      this.readNumber(customStagePackage.schemaVersion),
      current.customStageSchemaVersion,
      result,
    );
    this.compareGameVersion(customStagePackage.createdWithGameVersion, result);
    this.compareContentHash(customStagePackage.createdWithContentHash, result);

    return this.finalize(result);
  }

  static checkCsvCompatibility(
    schemaVersion: number | undefined,
    contentHash?: string,
    gameVersion?: string,
  ): CompatibilityResult {
    const current = getCurrentVersionInfo();
    const result = this.createResult();

    this.compareSchema('CSV', schemaVersion, current.csvSchemaVersion, result);
    this.compareGameVersion(gameVersion, result);
    this.compareContentHash(contentHash, result);

    return this.finalize(result);
  }

  private static createResult(): CompatibilityResult {
    return {
      compatible: true,
      warnings: [],
      errors: [],
    };
  }

  private static finalize(result: CompatibilityResult): CompatibilityResult {
    return {
      ...result,
      compatible: result.errors.length === 0,
    };
  }

  private static compareSchema(
    label: string,
    actual: number | undefined,
    current: number,
    result: CompatibilityResult,
  ): void {
    if (actual === undefined) {
      result.warnings.push(`${label} schema version is missing.`);
      return;
    }

    if (actual > current) {
      result.errors.push(`${label} schema ${actual} is newer than supported schema ${current}.`);
      return;
    }

    if (actual < current) {
      result.warnings.push(`${label} schema ${actual} is older than current schema ${current}; migration may be needed.`);
    }
  }

  private static compareGameVersion(
    gameVersion: string | undefined,
    result: CompatibilityResult,
  ): void {
    const current = getCurrentVersionInfo();

    if (!gameVersion) {
      result.warnings.push('Game version is missing.');
      return;
    }

    if (gameVersion !== current.gameVersion) {
      result.warnings.push(`Game version ${gameVersion} differs from current version ${current.gameVersion}.`);
    }
  }

  private static compareContentHash(
    contentHash: string | undefined,
    result: CompatibilityResult,
  ): void {
    const current = getCurrentVersionInfo();

    if (!contentHash) {
      result.warnings.push('Content hash is missing.');
      return;
    }

    if (contentHash !== current.contentHash) {
      result.warnings.push('Content hash differs from the current built-in content hash.');
    }
  }

  private static readNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }
}
