import { GameEventBus } from '../events/GameEventBus';
import { PlayerHealth } from '../player/PlayerHealth';
import { RunRuleSet } from '../rules/RunRuleSet';
import { WeaponManager } from '../weapon/WeaponManager';

export interface RelicEffectContext {
  gameEventBus?: GameEventBus;
  runRuleSet?: RunRuleSet;
  weaponManager?: WeaponManager;
  playerHealth?: PlayerHealth;
  getGameTimeSeconds?: () => number;
}
