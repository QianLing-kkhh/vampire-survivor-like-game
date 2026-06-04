import { BossSkillContext } from './BossSkillContext';
import { BossSkillType } from './BossSkillConfig';

export interface BossSkill {
  readonly type: BossSkillType;
  update(deltaMs: number, context: BossSkillContext): void;
  clear(): void;
  isActive?(): boolean;
}
