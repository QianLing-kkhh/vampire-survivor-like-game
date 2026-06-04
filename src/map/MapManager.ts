import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { CustomStagePackage } from '../custom/CustomStageSchema';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import { CustomStageValidator } from '../custom/CustomStageValidator';
import { SaveManager } from '../save/SaveManager';
import { UnlockManager } from '../unlock/UnlockManager';

import { MapDefinition } from './MapDefinition';

type MapData = Record<string, MapDefinition>;

const DEFAULT_GRID_SIZE = 128;
const DEFAULT_LANDMARK_SPACING = 512;

export class MapManager {
  constructor(
    mapData?: MapData,
    private selectedMapId = SaveManager.get().selections.selectedMapId,
  ) {
    ContentBootstrap.ensureInitialized();
    this.mapData = mapData ?? this.getMapDataFromRegistry();

    if (!this.mapData[this.selectedMapId]) {
      this.selectedMapId = DEFAULT_CONTENT_IDS.map;
    }
  }

  private readonly mapData: MapData;

  getSelectedMap(): MapDefinition {
    return this.getMap(this.getSelectedMapId());
  }

  getSelectedMapId(): string {
    const customStagePackage = this.getSelectedCustomStagePackage();

    if (customStagePackage) {
      return customStagePackage.map.id;
    }

    const savedMapId = SaveManager.get().selections.selectedMapId;

    this.selectedMapId = this.mapData[savedMapId]
      ? savedMapId
      : DEFAULT_CONTENT_IDS.map;

    return this.selectedMapId;
  }

  setSelectedMapId(mapId: string): void {
    this.selectedMapId = this.mapData[mapId] ? mapId : DEFAULT_CONTENT_IDS.map;

    SaveManager.update({
      selections: {
        selectedMapId: this.selectedMapId,
        selectedCustomStageId: undefined,
      },
    });
  }

  getMap(mapId: string): MapDefinition {
    const customStagePackage = this.getSelectedCustomStagePackage();

    if (customStagePackage?.map.id === mapId) {
      return this.toMapDefinition(customStagePackage);
    }

    return this.mapData[mapId] ?? this.mapData[DEFAULT_CONTENT_IDS.map];
  }

  listMaps(options: { includeLocked?: boolean } = {}): MapDefinition[] {
    const maps = Object.values(this.mapData).map((map) => ({ ...map }));

    if (options.includeLocked === true) {
      return maps;
    }

    return maps.filter((map) => this.isMapUnlocked(map.id));
  }

  isMapUnlocked(mapId: string): boolean {
    return UnlockManager.isUnlocked('map', mapId);
  }

  private getMapDataFromRegistry(): MapData {
    return ContentRegistry.listMaps().reduce<MapData>((record, map) => {
      record[map.id] = map;
      return record;
    }, {});
  }

  private getSelectedCustomStagePackage(): CustomStagePackage | undefined {
    const customStageId = SaveManager.get().selections.selectedCustomStageId;

    if (!customStageId) {
      return undefined;
    }

    const stagePackage = new CustomStageStorage().get(customStageId);

    if (!stagePackage) {
      console.warn(`Selected custom stage package not found: ${customStageId}`);
      return undefined;
    }

    const validation = new CustomStageValidator().validate(stagePackage);

    if (!validation.valid) {
      console.warn(`Selected custom stage package is invalid: ${customStageId}`);
      return undefined;
    }

    return stagePackage;
  }

  private toMapDefinition(stagePackage: CustomStagePackage): MapDefinition {
    return {
      id: stagePackage.map.id,
      name: stagePackage.map.name,
      worldWidth: stagePackage.map.width,
      worldHeight: stagePackage.map.height,
      gridSize: DEFAULT_GRID_SIZE,
      landmarkSpacing: DEFAULT_LANDMARK_SPACING,
    };
  }
}
