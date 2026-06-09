import { BossSkillContext } from './BossSkillContext';
import { BossSkillType } from './BossSkillConfig';
import type { AutoBossWarningSnapshot } from '../../auto/AutoPlayerTypes';

export interface BossSkill {
  readonly type: BossSkillType;
  update(deltaMs: number, context: BossSkillContext): void;
  clear(): void;
  isActive?(): boolean;
  getAutoBossWarnings?(): AutoBossWarningSnapshot[];
}
