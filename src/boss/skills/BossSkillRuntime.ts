import { BossSkill } from './BossSkill';
import { BossSkillContext } from './BossSkillContext';

export class BossSkillRuntime {
  constructor(
    private readonly skills: BossSkill[],
    private readonly contextFactory: () => BossSkillContext,
  ) {}

  update(deltaMs: number): void {
    const context = this.contextFactory();

    if (context.boss.isDead) {
      this.clear();
      return;
    }

    for (const skill of this.skills) {
      skill.update(deltaMs, context);
    }
  }

  clear(): void {
    for (const skill of this.skills) {
      skill.clear();
    }
  }
}
