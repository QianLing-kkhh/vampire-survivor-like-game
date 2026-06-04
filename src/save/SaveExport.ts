import { SaveData } from './SaveData';

export interface SaveExportPackage {
  exportVersion: number;
  exportedAt: string;
  gameVersion?: string;
  save: SaveData;
  checksum?: string;
}

export function createSaveExportPackage(save: SaveData): SaveExportPackage {
  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    save,
  };
}
