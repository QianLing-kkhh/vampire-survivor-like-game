export type LandmarkVisualType = 'tree' | 'rock' | 'grave';

export const VisualScale = {
  playerDisplaySize: 64,
  pickupDisplaySize: 36,
  treasureDisplayWidth: 72,
  treasureDisplayHeight: 64,
  auraStrokeWidth: 4,
  auraAlpha: 0.24,

  getEnemyDisplaySize(enemyId: string, logicalScale = 1): number {
    if (enemyId === 'boss') {
      return 224 * logicalScale;
    }

    if (enemyId.endsWith('_boss')) {
      return 112 * logicalScale;
    }

    if (enemyId === 'golem') {
      return 56 * logicalScale;
    }

    return 52 * logicalScale;
  },

  getProjectileDisplaySize(weaponId: string): number {
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
  },

  getAuraCoreDisplaySize(weaponId: string): number {
    return weaponId === 'soul_eater' ? 64 : 56;
  },

  getLandmarkDisplaySize(type: LandmarkVisualType): number {
    switch (type) {
      case 'tree':
        return 176;
      case 'rock':
      case 'grave':
      default:
        return 160;
    }
  },
};
