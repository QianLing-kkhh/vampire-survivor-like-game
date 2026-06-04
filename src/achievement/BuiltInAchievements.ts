import { AchievementDefinition } from './AchievementDefinition';

export const BUILT_IN_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_kill',
    nameKey: 'achievement.first_kill.name',
    descriptionKey: 'achievement.first_kill.description',
    triggerType: 'event',
    category: 'combat',
    conditions: [{ type: 'eventType', eventType: 'enemy.killed' }],
  },
  {
    id: 'first_level_up',
    nameKey: 'achievement.first_level_up.name',
    descriptionKey: 'achievement.first_level_up.description',
    triggerType: 'event',
    category: 'progression',
    conditions: [{ type: 'eventType', eventType: 'player.levelUp' }],
  },
  {
    id: 'first_treasure',
    nameKey: 'achievement.first_treasure.name',
    descriptionKey: 'achievement.first_treasure.description',
    triggerType: 'event',
    category: 'collection',
    conditions: [{ type: 'eventType', eventType: 'pickup.treasureOpened' }],
  },
  {
    id: 'first_evolution',
    nameKey: 'achievement.first_evolution.name',
    descriptionKey: 'achievement.first_evolution.description',
    triggerType: 'event',
    category: 'progression',
    conditions: [{ type: 'eventType', eventType: 'weapon.evolved' }],
  },
  {
    id: 'first_boss_kill',
    nameKey: 'achievement.first_boss_kill.name',
    descriptionKey: 'achievement.first_boss_kill.description',
    triggerType: 'event',
    category: 'boss',
    conditions: [{ type: 'eventType', eventType: 'boss.killed' }],
  },
  {
    id: 'first_victory',
    nameKey: 'achievement.first_victory.name',
    descriptionKey: 'achievement.first_victory.description',
    triggerType: 'runEnd',
    category: 'progression',
    conditions: [
      { type: 'eventType', eventType: 'run.ended' },
      { type: 'runResult', resultType: 'victory' },
    ],
  },
  {
    id: 'first_endless',
    nameKey: 'achievement.first_endless.name',
    descriptionKey: 'achievement.first_endless.description',
    triggerType: 'event',
    category: 'endless',
    conditions: [{ type: 'eventType', eventType: 'endless.started' }],
  },
  {
    id: 'endless_5_min',
    nameKey: 'achievement.endless_5_min.name',
    descriptionKey: 'achievement.endless_5_min.description',
    triggerType: 'runEnd',
    category: 'endless',
    conditions: [
      { type: 'eventType', eventType: 'run.ended' },
      { type: 'endlessSurvivalTimeAtLeast', value: 300 },
    ],
  },
];
