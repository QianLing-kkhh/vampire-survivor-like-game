export type UpgradeOptionKind = 'playerStat' | 'addWeapon' | 'weaponStat' | 'passive';

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  kind?: UpgradeOptionKind;
  weaponId?: string;
  passiveId?: string;
  stat?: 'moveSpeed'
    | 'pickupRange'
    | 'maxHp'
    | 'damage'
    | 'cooldown'
    | 'radius'
    | 'orbitCount'
    | 'orbitSpeed'
    | 'projectileSpeed'
    | 'projectileCount';
  operation?: 'multiply' | 'add';
  value?: number;
  cap?: number;
}
