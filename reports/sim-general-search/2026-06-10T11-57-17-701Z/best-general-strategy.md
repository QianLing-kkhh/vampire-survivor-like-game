# Best General Strategy

## Search Config

- Scenario count: 40
- Seed count: 3
- Candidates: 120
- Rounds: 3
- Duration seconds: 120
- Tick ms: 50
- Phases: 0-30, 30-60, 60-120

## Overall Performance

- Evaluated random scenarios: 120
- General fitness score: -2092.2642
- Fitness target: damage dealt first, with 30s damage-window safety penalty retained.
- Avg damage dealt: 1982.1583
- Median damage dealt: 1720.5
- P10 damage dealt: 1116
- Damage dealt std dev: 757.6416
- Avg score: 1202.6833
- Median score: 1128.5
- P10 score: 687.1
- Completion rate: 0.9417
- Avg damage taken: 45.7833
- Damage window pass rate: 0.35
- Avg 30s damage window violation count: 0.9417
- Damage safety penalty: 6222.5417
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced fitness: -7682.0671
- Delta: 5589.8029

## Phase Weight Tables

### 0-30

| Weight | Value |
| --- | ---: |
| movement.bossBias | 13 |
| movement.combatBias | 27 |
| movement.farmBias | 43 |
| movement.loopBias | 70 |
| movement.overKitePenalty | 63 |
| movement.riskTolerance | 46 |
| movement.survivalBias | 54 |
| movement.treasureBias | 66 |
| upgrade.cooldownPriority | 40 |
| upgrade.damagePriority | 97 |
| upgrade.evolutionPriority | 55 |
| upgrade.growthPriority | 46 |
| upgrade.mainWeaponPriority | 8 |
| upgrade.newWeaponPriority | 2 |
| upgrade.passivePriority | 80 |
| upgrade.survivalPriority | 36 |
| treasure.evolutionChestPriority | 73 |
| treasure.openRiskTolerance | 80 |
| treasure.relicExpectedValuePriority | 93 |
| treasure.routeDeviationTolerance | 34 |
| relic.damageRelicPriority | 30 |
| relic.economyRelicPriority | 62 |
| relic.rarityPriority | 36 |
| relic.survivalRelicPriority | 97 |
| relic.synergyPriority | 79 |

### 30-60

| Weight | Value |
| --- | ---: |
| movement.bossBias | 10 |
| movement.combatBias | 22 |
| movement.farmBias | 51 |
| movement.loopBias | 83 |
| movement.overKitePenalty | 84 |
| movement.riskTolerance | 51 |
| movement.survivalBias | 55 |
| movement.treasureBias | 81 |
| upgrade.cooldownPriority | 41 |
| upgrade.damagePriority | 96 |
| upgrade.evolutionPriority | 80 |
| upgrade.growthPriority | 38 |
| upgrade.mainWeaponPriority | 14 |
| upgrade.newWeaponPriority | 1 |
| upgrade.passivePriority | 91 |
| upgrade.survivalPriority | 44 |
| treasure.evolutionChestPriority | 74 |
| treasure.openRiskTolerance | 54 |
| treasure.relicExpectedValuePriority | 66 |
| treasure.routeDeviationTolerance | 21 |
| relic.damageRelicPriority | 30 |
| relic.economyRelicPriority | 77 |
| relic.rarityPriority | 55 |
| relic.survivalRelicPriority | 83 |
| relic.synergyPriority | 78 |

### 60-120

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 44 |
| movement.farmBias | 36 |
| movement.loopBias | 78 |
| movement.overKitePenalty | 59 |
| movement.riskTolerance | 33 |
| movement.survivalBias | 49 |
| movement.treasureBias | 62 |
| upgrade.cooldownPriority | 58 |
| upgrade.damagePriority | 99 |
| upgrade.evolutionPriority | 62 |
| upgrade.growthPriority | 29 |
| upgrade.mainWeaponPriority | 11 |
| upgrade.newWeaponPriority | 1 |
| upgrade.passivePriority | 81 |
| upgrade.survivalPriority | 53 |
| treasure.evolutionChestPriority | 73 |
| treasure.openRiskTolerance | 77 |
| treasure.relicExpectedValuePriority | 95 |
| treasure.routeDeviationTolerance | 14 |
| relic.damageRelicPriority | 39 |
| relic.economyRelicPriority | 65 |
| relic.rarityPriority | 49 |
| relic.survivalRelicPriority | 82 |
| relic.synergyPriority | 78 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
