import { TutorialStep } from './TutorialStep';

export const BUILT_IN_TUTORIALS: TutorialStep[] = [
  {
    id: 'first_level_up',
    titleKey: 'tutorial.first_level_up.title',
    messageKey: 'tutorial.first_level_up.message',
    trigger: {
      type: 'event',
      eventType: 'player.levelUp',
    },
    once: true,
    priority: 100,
    helpTabId: 'upgrades',
  },
  {
    id: 'first_treasure',
    titleKey: 'tutorial.first_treasure.title',
    messageKey: 'tutorial.first_treasure.message',
    trigger: {
      type: 'event',
      eventType: 'pickup.treasureOpened',
    },
    once: true,
    priority: 90,
    helpTabId: 'treasures',
  },
  {
    id: 'first_evolution',
    titleKey: 'tutorial.first_evolution.title',
    messageKey: 'tutorial.first_evolution.message',
    trigger: {
      type: 'event',
      eventType: 'weapon.evolved',
    },
    once: true,
    priority: 90,
    helpTabId: 'evolution',
  },
  {
    id: 'boss_incoming',
    titleKey: 'tutorial.boss_incoming.title',
    messageKey: 'tutorial.boss_incoming.message',
    trigger: {
      type: 'event',
      eventType: 'boss.spawned',
    },
    once: true,
    priority: 80,
    helpTabId: 'controls',
  },
  {
    id: 'first_endless',
    titleKey: 'tutorial.first_endless.title',
    messageKey: 'tutorial.first_endless.message',
    trigger: {
      type: 'event',
      eventType: 'endless.started',
    },
    once: true,
    priority: 80,
    helpTabId: 'endless',
  },
  {
    id: 'mobile_joystick_hint',
    titleKey: 'tutorial.mobile_joystick.title',
    messageKey: 'tutorial.mobile_joystick.message',
    trigger: {
      type: 'condition',
      conditionId: 'mobileJoystickAvailable',
    },
    once: true,
    priority: 70,
    helpTabId: 'controls',
  },
];
