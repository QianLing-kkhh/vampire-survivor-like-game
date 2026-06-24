import { VisualSettings } from './VisualSettings';

export type LandmarkVisualType =
  | 'tree'
  | 'rock'
  | 'grave'
  | 'wall'
  | 'cathedralWall'
  | 'cathedralPillar'
  | 'bookshelf'
  | 'archivePillar';

export const VisualScale = {
  playerDisplaySize: 88,
  pickupDisplaySize: 36,
  treasureDisplayWidth: 72,
  treasureDisplayHeight: 64,
  auraStrokeWidth: 4,
  auraAlpha: 0.24,
  finalBossVisualDisplayMultiplier: 0.375,

  applyModelScale(baseSize: number): number {
    return baseSize * VisualSettings.getModelScaleMultiplier();
  },

  getPlayerDisplaySize(): number {
    return this.applyModelScale(this.playerDisplaySize);
  },

  getPlayerFallbackVisualRadius(): number {
    return this.getPlayerDisplaySize() / 2;
  },

  getPickupDisplaySize(): number {
    return this.applyModelScale(this.pickupDisplaySize);
  },

  getTreasureDisplayWidth(): number {
    return this.applyModelScale(this.treasureDisplayWidth);
  },

  getTreasureDisplayHeight(): number {
    return this.applyModelScale(this.treasureDisplayHeight);
  },

  getEnemyDisplaySize(enemyId: string, logicalScale = 1): number {
    if (enemyId === 'boss') {
      return this.applyModelScale(224 * logicalScale);
    }

    if (enemyId.endsWith('_boss')) {
      return this.applyModelScale(112 * logicalScale);
    }

    if (enemyId === 'golem') {
      return this.applyModelScale(56 * logicalScale);
    }

    return this.applyModelScale(52 * logicalScale);
  },

  getEnemyVisualDisplayMultiplier(enemyId: string): number {
    return enemyId === 'boss' ? this.finalBossVisualDisplayMultiplier : 1;
  },

  getEnemyFallbackVisualRadius(enemyId: string, logicalScale = 1): number {
    return (
      this.getEnemyDisplaySize(enemyId, logicalScale)
      * this.getEnemyVisualDisplayMultiplier(enemyId)
    ) / 2;
  },

  getProjectileDisplaySize(weaponId: string): number {
    const baseSize = (() => {
      switch (weaponId) {
        case 'death_spiral':
          return 72;
        case 'unholy_vespers':
          return 60;
        case 'axe':
        case 'thousand_edge':
          return 52;
        case 'bible':
        case 'holy_wand':
          return 48;
        case 'magic_wand':
        case 'knife':
        default:
          return 40;
      }
    })();

    return this.applyModelScale(baseSize);
  },

  getAuraCoreDisplaySize(weaponId: string): number {
    return this.applyModelScale(weaponId === 'soul_eater' ? 64 : 56);
  },

  getLandmarkDisplaySize(type: LandmarkVisualType): number {
    const baseSize = (() => {
      switch (type) {
        case 'tree':
          return 176;
        case 'wall':
        case 'cathedralWall':
        case 'bookshelf':
          return 192;
        case 'cathedralPillar':
        case 'archivePillar':
          return 168;
        case 'rock':
        case 'grave':
        default:
          return 160;
      }
    })();

    return this.applyModelScale(baseSize);
  },
};
