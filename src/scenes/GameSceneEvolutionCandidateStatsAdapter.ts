import type { EvolutionManager } from '../evolution/EvolutionManager';
import { EvolutionCandidateStatsFormatter } from '../evolution/EvolutionCandidateStatsFormatter';
import type { PassiveManager } from '../passive/PassiveManager';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface GameSceneEvolutionCandidateStatsScenePort {
  evolutionManager?: EvolutionManager;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
}

export class GameSceneEvolutionCandidateStatsAdapter {
  private readonly evolutionCandidateStatsFormatter = new EvolutionCandidateStatsFormatter();

  format(scene: GameSceneEvolutionCandidateStatsScenePort): string {
    return this.evolutionCandidateStatsFormatter.format({
      evolutionManager: scene.evolutionManager,
      weaponManager: scene.weaponManager,
      passiveManager: scene.passiveManager,
    });
  }
}
