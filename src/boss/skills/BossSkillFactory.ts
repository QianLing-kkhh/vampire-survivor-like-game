import { BeamSkill } from './BeamSkill';
import { BossSkill } from './BossSkill';
import { BossSkillConfig } from './BossSkillConfig';
import { DashSkill } from './DashSkill';
import { ShockwaveSkill } from './ShockwaveSkill';
import { SlowZoneSkill } from './SlowZoneSkill';
import { SummonSkill } from './SummonSkill';

export class BossSkillFactory {
  static createSkill(config: BossSkillConfig): BossSkill | null {
    switch (config.type) {
      case 'dash':
        return new DashSkill(config);
      case 'beam':
        return new BeamSkill(config);
      case 'summon':
        return new SummonSkill(config);
      case 'shockwave':
        return new ShockwaveSkill(config);
      case 'slowZone':
        return new SlowZoneSkill(config);
      default:
        console.warn('Unknown boss skill config:', config);
        return null;
    }
  }

  static createSkills(configs: BossSkillConfig[]): BossSkill[] {
    return configs
      .map((config) => BossSkillFactory.createSkill(config))
      .filter((skill): skill is BossSkill => skill !== null);
  }
}
