import maps from '../data/maps.json';

import { MapDefinition } from './MapDefinition';

type MapData = Record<string, MapDefinition>;

const DEFAULT_MAP_ID = 'prototype_field';

export class MapManager {
  constructor(
    private readonly mapData: MapData = maps,
    private selectedMapId = DEFAULT_MAP_ID,
  ) {}

  getSelectedMap(): MapDefinition {
    return this.getMap(this.selectedMapId);
  }

  getMap(mapId: string): MapDefinition {
    return this.mapData[mapId] ?? this.mapData[DEFAULT_MAP_ID];
  }
}
