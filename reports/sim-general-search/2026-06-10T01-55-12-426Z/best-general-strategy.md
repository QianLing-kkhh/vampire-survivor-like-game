# Best General Strategy

## Search Config

- Scenario count: 5
- Seed count: 2
- Candidates: 20
- Rounds: 2
- Duration seconds: 60
- Tick ms: 50
- Phases: 0-30, 30-60, 60-120

## Overall Performance

- Evaluated random scenarios: 10
- General fitness score: 2852.6562
- Avg score: 815.5
- Median score: 819.5
- P10 score: 797.2
- Completion rate: 1
- Avg damage taken: 3.9

## Balanced Default Comparison

- Balanced fitness: 2621.1377
- Delta: 231.5185

## Phase Weight Tables

### 0-30

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 46 |
| movement.farmBias | 58 |
| movement.loopBias | 20 |
| movement.overKitePenalty | 64 |
| movement.riskTolerance | 36 |
| movement.survivalBias | 12 |
| movement.treasureBias | 0 |
| upgrade.cooldownPriority | 34 |
| upgrade.damagePriority | 97 |
| upgrade.evolutionPriority | 45 |
| upgrade.growthPriority | 66 |
| upgrade.mainWeaponPriority | 61 |
| upgrade.newWeaponPriority | 28 |
| upgrade.passivePriority | 12 |
| upgrade.survivalPriority | 91 |
| treasure.evolutionChestPriority | 32 |
| treasure.openRiskTolerance | 63 |
| treasure.relicExpectedValuePriority | 50 |
| treasure.routeDeviationTolerance | 12 |
| relic.damageRelicPriority | 83 |
| relic.economyRelicPriority | 5 |
| relic.rarityPriority | 45 |
| relic.survivalRelicPriority | 81 |
| relic.synergyPriority | 25 |

### 30-60

| Weight | Value |
| --- | ---: |
| movement.bossBias | 26 |
| movement.combatBias | 33 |
| movement.farmBias | 75 |
| movement.loopBias | 12 |
| movement.overKitePenalty | 60 |
| movement.riskTolerance | 33 |
| movement.survivalBias | 15 |
| movement.treasureBias | 0 |
| upgrade.cooldownPriority | 21 |
| upgrade.damagePriority | 85 |
| upgrade.evolutionPriority | 63 |
| upgrade.growthPriority | 68 |
| upgrade.mainWeaponPriority | 70 |
| upgrade.newWeaponPriority | 38 |
| upgrade.passivePriority | 14 |
| upgrade.survivalPriority | 81 |
| treasure.evolutionChestPriority | 6 |
| treasure.openRiskTolerance | 72 |
| treasure.relicExpectedValuePriority | 54 |
| treasure.routeDeviationTolerance | 22 |
| relic.damageRelicPriority | 100 |
| relic.economyRelicPriority | 0 |
| relic.rarityPriority | 59 |
| relic.survivalRelicPriority | 89 |
| relic.synergyPriority | 17 |

### 60-120

| Weight | Value |
| --- | ---: |
| movement.bossBias | 20 |
| movement.combatBias | 38 |
| movement.farmBias | 79 |
| movement.loopBias | 12 |
| movement.overKitePenalty | 52 |
| movement.riskTolerance | 37 |
| movement.survivalBias | 10 |
| movement.treasureBias | 4 |
| upgrade.cooldownPriority | 29 |
| upgrade.damagePriority | 71 |
| upgrade.evolutionPriority | 51 |
| upgrade.growthPriority | 70 |
| upgrade.mainWeaponPriority | 64 |
| upgrade.newWeaponPriority | 26 |
| upgrade.passivePriority | 26 |
| upgrade.survivalPriority | 76 |
| treasure.evolutionChestPriority | 41 |
| treasure.openRiskTolerance | 71 |
| treasure.relicExpectedValuePriority | 48 |
| treasure.routeDeviationTolerance | 16 |
| relic.damageRelicPriority | 100 |
| relic.economyRelicPriority | 5 |
| relic.rarityPriority | 57 |
| relic.survivalRelicPriority | 78 |
| relic.synergyPriority | 11 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
