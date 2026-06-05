import { MapMechanicContext } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import {
  MapLightSourceDefinition,
  MapMechanicDefinition,
  MapObstacleDefinition,
  MapPortalDefinition,
  MapSlowZoneDefinition,
} from './MapMechanicDefinition';
import { MapLightSource } from './MapLightSource';
import { MapObstacle } from './MapObstacle';
import { MapPortal } from './MapPortal';
import { MapSlowZone } from './MapSlowZone';

export interface MapMechanicRuntimeParts {
  interactables: MapInteractable[];
  obstacles: MapObstacle[];
  slowZones: MapSlowZone[];
  portals: MapPortal[];
}

export class MapMechanicFactory {
  static createMany(
    definitions: readonly MapMechanicDefinition[],
    context: MapMechanicContext,
  ): MapMechanicRuntimeParts {
    const interactables: MapInteractable[] = [];
    const obstacles: MapObstacle[] = [];
    const slowZones: MapSlowZone[] = [];
    const portals: MapPortal[] = [];

    for (const definition of definitions) {
      if (definition.enabled === false) {
        continue;
      }

      switch (definition.type) {
        case 'obstacle': {
          const obstacle = new MapObstacle(context, definition as MapObstacleDefinition);
          obstacles.push(obstacle);
          interactables.push(obstacle);
          break;
        }
        case 'slowZone': {
          const slowZone = new MapSlowZone(context, definition as MapSlowZoneDefinition);
          slowZones.push(slowZone);
          interactables.push(slowZone);
          break;
        }
        case 'portal': {
          const portal = new MapPortal(context, definition as MapPortalDefinition);
          portals.push(portal);
          interactables.push(portal);
          break;
        }
        case 'lightSource': {
          interactables.push(new MapLightSource(context, definition as MapLightSourceDefinition));
          break;
        }
        default:
          break;
      }
    }

    this.linkPortals(definitions, portals);

    return {
      interactables,
      obstacles,
      slowZones,
      portals,
    };
  }

  private static linkPortals(
    definitions: readonly MapMechanicDefinition[],
    portals: readonly MapPortal[],
  ): void {
    const portalById = new Map(portals.map((portal) => [portal.id, portal]));

    for (const definition of definitions) {
      if (definition.type !== 'portal' || definition.enabled === false) {
        continue;
      }

      const portal = portalById.get(definition.id);
      portal?.setTarget(portalById.get((definition as MapPortalDefinition).targetPortalId));
    }
  }
}
