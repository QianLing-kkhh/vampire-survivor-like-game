import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { SaveManager } from '../save/SaveManager';

import { MapDefinition } from './MapDefinition';

type MapData = Record<string, MapDefinition>;

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
      },
    });
  }

  getMap(mapId: string): MapDefinition {
    return this.mapData[mapId] ?? this.mapData[DEFAULT_CONTENT_IDS.map];
  }

  private getMapDataFromRegistry(): MapData {
    return ContentRegistry.listMaps().reduce<MapData>((record, map) => {
      record[map.id] = map;
      return record;
    }, {});
  }
}
