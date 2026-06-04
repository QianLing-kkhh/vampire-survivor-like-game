import { getCurrentVersionInfo } from '../version/VersionInfo';

import {
  CUSTOM_STAGE_SCHEMA_VERSION,
  CustomStagePackage,
  CustomWaveDefinition,
} from './CustomStageSchema';
import { CustomStageSerializer } from './CustomStageSerializer';

export class CustomStageTemplate {
  static createDefaultCustomStagePackage(): CustomStagePackage {
    const now = new Date().toISOString();
    const id = `custom_stage_${Date.now().toString(36)}`;
    const versionInfo = getCurrentVersionInfo();

    return {
      schemaVersion: CUSTOM_STAGE_SCHEMA_VERSION,
      id,
      name: 'Custom Stage',
      description: 'A locally created custom stage.',
      createdAt: now,
      updatedAt: now,
      createdWithGameVersion: versionInfo.gameVersion,
      createdWithContentHash: versionInfo.contentHash,
      stage: {
        id,
        name: 'Custom Stage',
        mapId: `${id}_map`,
        waveSetId: `${id}_waves`,
        finalBossId: 'boss',
        finalBossSpawnTime: 300,
        warningBeforeBoss: 30,
        allowEndless: false,
      },
      map: {
        id: `${id}_map`,
        name: 'Custom Field',
        width: 4800,
        height: 2700,
        safeSpawnRadius: 220,
      },
      waves: [
        {
          startTime: 0,
          enemyId: 'slime',
          count: 8,
          interval: 2,
          duration: 60,
        },
      ],
    };
  }

  static createEmptyWave(): CustomWaveDefinition {
    return {
      startTime: 0,
      enemyId: 'slime',
      count: 8,
      interval: 2,
      duration: 60,
    };
  }

  static clonePackage(stagePackage: CustomStagePackage): CustomStagePackage {
    return CustomStageSerializer.clone(stagePackage);
  }
}
