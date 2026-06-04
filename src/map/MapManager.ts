import maps from '../data/maps.json';
import { SaveManager } from '../save/SaveManager';

import { MapDefinition } from './MapDefinition';

type MapData = Record<string, MapDefinition>;

const DEFAULT_MAP_ID = 'prototype_field';

export class MapManager {
  constructor(
    private readonly mapData: MapData = maps,
    private selectedMapId = SaveManager.get().selections.selectedMapId,
  ) {
    if (!this.mapData[this.selectedMapId]) {
      this.selectedMapId = DEFAULT_MAP_ID;
    }
  }

  getSelectedMap(): MapDefinition {
    return this.getMap(this.selectedMapId);
  }

  getSelectedMapId(): string {
    return this.selectedMapId;
  }

  setSelectedMapId(mapId: string): void {
    this.selectedMapId = this.mapData[mapId] ? mapId : DEFAULT_MAP_ID;

    SaveManager.update({
      selections: {
        ...SaveManager.get().selections,
        selectedMapId: this.selectedMapId,
      },
    });
  }

  getMap(mapId: string): MapDefinition {
    return this.mapData[mapId] ?? this.mapData[DEFAULT_MAP_ID];
  }
}
