import Phaser from 'phaser';

import { GameEventBus } from '../events/GameEventBus';
import { DamageCalculator } from '../combat/DamageCalculator';
import { Enemy } from '../enemy/Enemy';
import { FloatingTextManager } from '../ui/FloatingTextManager';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerController } from '../player/PlayerController';
import { RunState } from '../run/RunState';
import { RunRuleSet } from '../rules/RunRuleSet';
import { WeaponManager } from '../weapon/WeaponManager';

export interface RelicEffectContext {
  scene?: Phaser.Scene;
  gameEventBus?: GameEventBus;
  runRuleSet?: RunRuleSet;
  weaponManager?: WeaponManager;
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  enemies?: Enemy[];
  damageCalculator?: DamageCalculator;
  floatingTextManager?: FloatingTextManager;
  getGameTimeSeconds?: () => number;
  runState?: RunState;
}
