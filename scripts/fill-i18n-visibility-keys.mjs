import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const translations = ['en-US', 'zh-CN', 'ja-JP'];

const keys = {
  characterSelection: {
    locked: 'Locked',
  },
  common: {
    back: 'Back',
  },
  game: {
    bossAppears: 'Boss Appears',
    rotateForBetterPlay: 'Please rotate your device for a better view.',
  },
  help: {
    characters: {
      description: {
        default: 'No detailed description available.',
      },
      levelUp: {
        default: 'Special growth effect',
        unknown: 'Unknown growth effect',
      },
      reaction: {
        none: 'None',
      },
    },
    evolution: {
      requirement: '{weaponUpgrades} upgrades + {passive} Lv.{passiveLevel}',
    },
    map: {
      mechanic: {
        item: 'item',
      },
      noMechanics: 'No special map mechanics',
    },
    maps: {
      endlessUnknown: 'Depends on map configuration',
      randomDetail: 'A random unlocked stage is selected each run.',
      unknown: 'Unknown map',
    },
    passives: {
      routes: 'Routes: {routes}',
    },
    testing: {
      actualRunCharacter: 'actual character',
      actualRunStage: 'actual stage',
    },
    weapon: {
      behavior: {
        default: 'Unknown behavior',
        unknown: 'unknown',
      },
      summary: 'Type: {type}',
    },
  },
  hud: {
    endless: 'Endless',
    relics: 'Relics',
    shield: 'Shield',
  },
  levelUp: {
    emptyMessage: 'No upgrades available',
    newWeapon: 'New Weapon',
    noUpgrades: 'No upgrades available',
    upgrade: 'Upgrade',
  },
  pause: {
    bossPhaseDamage: 'Boss Phase Damage',
    characterStats: 'Character Stats',
    damageTaken: 'Damage Taken',
    endlessTime: 'Endless Time',
    exp: 'EXP',
    expMultiplier: 'EXP Multiplier',
    hits: 'Hits',
    hp: 'HP',
    killCount: 'Kill Count',
    kills: 'Kills',
    level: 'Lv',
    moveSpeed: 'Move Speed',
    passives: 'Passives',
    pickupRange: 'Pickup Range',
    requires: 'Requires',
    settings: 'Settings',
    shieldAbsorbed: 'Shield Absorbed',
    shieldConsumed: 'Shield Consumed',
    shieldStacks: 'Shield Stacks',
    statsBuild: 'Stats / Build',
    treasureOpens: 'Treasure Opens',
    weaponEvolvedFrom: 'Evolved From',
    weaponTotalDamage: 'Weapon Total Damage',
    weapons: 'Weapons',
    moreItems: '+{count} more',
  },
  result: {
    character: 'Character',
    endlessBosses: 'Endless Bosses',
    endlessLeaderboard: 'No endless entries',
    endlessLeaderboardTop: 'Top {count} Endless Records',
    endlessSurvivalTime: 'Endless Survival',
    endlessVictory: 'Endless Victory',
    killed: 'killed',
    leaderboardEntry: '#{rank}. Time {time} | Lv {level} | Kills {kills}',
    more: '+{count} more',
    none: 'None',
    relicAcquired: 'Relic acquired',
    relics: 'Relics',
    seed: 'Seed',
    settings: 'Settings',
    skills: 'Skills',
    stage: 'Stage',
  },
  selection: {
    damageReaction: 'Damage Reaction',
    damageReactionKeyed: 'Damage Reaction: {id}',
    damageReactionUnknown: 'Damage Reaction: Unknown',
    iconShown: 'icon',
    more: '+{count} more',
    role: 'Role',
    shortLabelAvailable: 'Avail',
    startingWeapon: 'Starting Weapon',
    startingWeaponLabel: 'Starting Weapon: {item}',
  },
  settings: {
    uiStyle: 'UI Style',
  },
  stage: {
    builtIn: 'Built-In',
    custom: 'Custom',
    warningsCount: '{count} warnings',
  },
  title: {
    settings: 'Settings',
  },
  ui: {
    max: 'Max',
    pause: 'Pause',
    pauseIcon: '¢ò',
    role: {
      default: 'Specialist',
      assassin: {
        m1: 'Mobility',
        m2: 'Crit',
        m3: 'Axe',
      },
      witch: {
        m1: 'Magic',
        m2: 'Slow',
        m3: 'Explosion',
      },
      priest: {
        m1: 'Shield',
        m2: 'Heal',
        m3: 'Orbit',
      },
      warrior: {
        m1: 'Armor',
        m2: 'Counter',
        m3: 'Axe',
      },
    },
  },
};

function setNested(target, keyParts, value) {
  let cursor = target;
  for (let i = 0; i < keyParts.length; i += 1) {
    const part = keyParts[i];
    if (i === keyParts.length - 1) {
      cursor[part] = value;
      return;
    }

    if (!cursor[part] || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
}

function flatten(obj, prefix = []) {
  return Object.entries(obj).flatMap(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value, [...prefix, key]);
    }

    return [[[...prefix, key], String(value)]];
  });
}

const flat = flatten(keys);

for (const locale of translations) {
  const file = path.join(root, 'src', 'i18n', 'translations', `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const [parts, value] of flat) {
    setNested(data, parts, value);
  }

  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

console.log(`updated keys: ${flat.length}`);
