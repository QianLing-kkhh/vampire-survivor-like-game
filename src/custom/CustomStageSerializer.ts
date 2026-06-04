import {
  CUSTOM_STAGE_SCHEMA_VERSION,
  CustomStagePackage,
} from './CustomStageSchema';

export class CustomStageSerializer {
  static parseJson(text: string): CustomStagePackage | null {
    try {
      return JSON.parse(text) as CustomStagePackage;
    } catch {
      return null;
    }
  }

  static serialize(stagePackage: CustomStagePackage): string {
    return JSON.stringify(stagePackage, null, 2);
  }

  static clone(stagePackage: CustomStagePackage): CustomStagePackage {
    return JSON.parse(JSON.stringify(stagePackage)) as CustomStagePackage;
  }

  static normalize(stagePackage: CustomStagePackage): CustomStagePackage {
    const now = new Date().toISOString();
    const normalizedPackage = CustomStageSerializer.clone(stagePackage);

    normalizedPackage.schemaVersion = normalizedPackage.schemaVersion
      ?? CUSTOM_STAGE_SCHEMA_VERSION;
    normalizedPackage.createdAt = normalizedPackage.createdAt ?? now;
    normalizedPackage.updatedAt = now;
    normalizedPackage.stage.waveSetId = normalizedPackage.stage.waveSetId
      || `${normalizedPackage.id}_waves`;
    normalizedPackage.stage.mapId = normalizedPackage.stage.mapId
      || normalizedPackage.map.id;

    return normalizedPackage;
  }
}
