# Best General Strategy

## Search Config

- Scenario count: 30
- Seed count: 5
- Candidates: 360
- Rounds: 4
- Duration seconds: 900
- Tick ms: 100
- Minimum boss kill rate: 0.5
- Phases: 0-180, 180-300, 300-900

## Overall Performance

- Evaluated random scenarios: 8
- Exp fitness score: 4408.25
- Fitness target: average gained experience among candidates with boss kill rate at or above the configured minimum.
- Boss kill rate: 0.5
- Avg exp: 4408.25
- Median exp: 4223.5
- P10 exp: 49.9
- P90 exp: 9046.5
- Exp std dev: 4357.1185
- Avg damage dealt: 179488.375
- Median damage dealt: 116818.5
- P10 damage dealt: 2055.2
- Damage dealt std dev: 208771.447
- Avg score: 28601.75
- Median score: 27856
- P10 score: 1177.1
- Completion rate: 0.5
- Avg damage taken: 185
- Damage window pass rate: 0
- Avg 30s damage window violation count: 3.125
- Damage safety penalty: 22452
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 492.875
- Delta: 3915.375

## Phase Weight Tables

### 0-180

| Weight | Value |
| --- | ---: |
| movement.bossBias | 15 |
| movement.combatBias | 70 |
| movement.farmBias | 82 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 67 |
| movement.riskTolerance | 3 |
| movement.survivalBias | 50 |
| movement.treasureBias | 51 |
| upgrade.cooldownPriority | 42 |
| upgrade.damagePriority | 11 |
| upgrade.evolutionPriority | 61 |
| upgrade.growthPriority | 12 |
| upgrade.mainWeaponPriority | 76 |
| upgrade.newWeaponPriority | 20 |
| upgrade.passivePriority | 41 |
| upgrade.survivalPriority | 9 |
| treasure.evolutionChestPriority | 35 |
| treasure.openRiskTolerance | 64 |
| treasure.relicExpectedValuePriority | 60 |
| treasure.routeDeviationTolerance | 35 |
| relic.damageRelicPriority | 91 |
| relic.economyRelicPriority | 54 |
| relic.rarityPriority | 42 |
| relic.survivalRelicPriority | 57 |
| relic.synergyPriority | 38 |

### 180-300

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 79 |
| movement.farmBias | 78 |
| movement.loopBias | 58 |
| movement.overKitePenalty | 83 |
| movement.riskTolerance | 5 |
| movement.survivalBias | 44 |
| movement.treasureBias | 46 |
| upgrade.cooldownPriority | 38 |
| upgrade.damagePriority | 11 |
| upgrade.evolutionPriority | 54 |
| upgrade.growthPriority | 12 |
| upgrade.mainWeaponPriority | 74 |
| upgrade.newWeaponPriority | 27 |
| upgrade.passivePriority | 40 |
| upgrade.survivalPriority | 0 |
| treasure.evolutionChestPriority | 25 |
| treasure.openRiskTolerance | 83 |
| treasure.relicExpectedValuePriority | 67 |
| treasure.routeDeviationTolerance | 43 |
| relic.damageRelicPriority | 82 |
| relic.economyRelicPriority | 57 |
| relic.rarityPriority | 41 |
| relic.survivalRelicPriority | 51 |
| relic.synergyPriority | 31 |

### 300-900

| Weight | Value |
| --- | ---: |
| movement.bossBias | 28 |
| movement.combatBias | 90 |
| movement.farmBias | 74 |
| movement.loopBias | 62 |
| movement.overKitePenalty | 72 |
| movement.riskTolerance | 17 |
| movement.survivalBias | 47 |
| movement.treasureBias | 46 |
| upgrade.cooldownPriority | 51 |
| upgrade.damagePriority | 3 |
| upgrade.evolutionPriority | 58 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 74 |
| upgrade.newWeaponPriority | 23 |
| upgrade.passivePriority | 53 |
| upgrade.survivalPriority | 0 |
| treasure.evolutionChestPriority | 22 |
| treasure.openRiskTolerance | 86 |
| treasure.relicExpectedValuePriority | 71 |
| treasure.routeDeviationTolerance | 39 |
| relic.damageRelicPriority | 100 |
| relic.economyRelicPriority | 54 |
| relic.rarityPriority | 48 |
| relic.survivalRelicPriority | 73 |
| relic.synergyPriority | 23 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
