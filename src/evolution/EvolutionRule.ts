export interface EvolutionRule {
  baseWeaponId: string;
  requiredPassiveId: string;
  requiredPassiveLevel: number;
  requiredWeaponUpgradeTotal: number;
  evolvedWeaponId: string;
}

export interface EvolutionResult {
  baseWeaponId: string;
  evolvedWeaponId: string;
}

const REQUIRED_PASSIVE_LEVEL = 4;
const REQUIRED_WEAPON_UPGRADE_TOTAL = 6;

export const EVOLUTION_RULES: readonly EvolutionRule[] = [
  {
    baseWeaponId: 'knife',
    requiredPassiveId: 'bracer',
    requiredPassiveLevel: REQUIRED_PASSIVE_LEVEL,
    requiredWeaponUpgradeTotal: REQUIRED_WEAPON_UPGRADE_TOTAL,
    evolvedWeaponId: 'thousand_edge',
  },
  {
    baseWeaponId: 'bible',
    requiredPassiveId: 'empty_tome',
    requiredPassiveLevel: REQUIRED_PASSIVE_LEVEL,
    requiredWeaponUpgradeTotal: REQUIRED_WEAPON_UPGRADE_TOTAL,
    evolvedWeaponId: 'unholy_vespers',
  },
  {
    baseWeaponId: 'magic_wand',
    requiredPassiveId: 'spinach',
    requiredPassiveLevel: REQUIRED_PASSIVE_LEVEL,
    requiredWeaponUpgradeTotal: REQUIRED_WEAPON_UPGRADE_TOTAL,
    evolvedWeaponId: 'holy_wand',
  },
  {
    baseWeaponId: 'axe',
    requiredPassiveId: 'spinach',
    requiredPassiveLevel: REQUIRED_PASSIVE_LEVEL,
    requiredWeaponUpgradeTotal: REQUIRED_WEAPON_UPGRADE_TOTAL,
    evolvedWeaponId: 'death_spiral',
  },
  {
    baseWeaponId: 'garlic',
    requiredPassiveId: 'pummarola',
    requiredPassiveLevel: REQUIRED_PASSIVE_LEVEL,
    requiredWeaponUpgradeTotal: REQUIRED_WEAPON_UPGRADE_TOTAL,
    evolvedWeaponId: 'soul_eater',
  },
];
