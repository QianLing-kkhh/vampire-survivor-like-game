# Best General Strategy

## Search Config

- Scenario count: 80
- Seed count: 3
- Candidates: 220
- Rounds: 4
- Duration seconds: 120
- Tick ms: 50
- Phases: 0-30, 30-60, 60-120

## Overall Performance

- Evaluated random scenarios: 240
- General fitness score: -3073.6244
- Avg score: 1041.6667
- Median score: 1041.5
- P10 score: 649.8
- Completion rate: 0.9792
- Avg damage taken: 43.4458
- Damage window pass rate: 0.325
- Avg 30s damage window violation count: 0.9667
- Damage safety penalty: 6070.5833
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced fitness: -9619.2885
- Delta: 6545.6641

## Phase Weight Tables

### 0-30

| Weight | Value |
| --- | ---: |
| movement.bossBias | 61 |
| movement.combatBias | 24 |
| movement.farmBias | 15 |
| movement.loopBias | 47 |
| movement.overKitePenalty | 27 |
| movement.riskTolerance | 97 |
| movement.survivalBias | 30 |
| movement.treasureBias | 10 |
| upgrade.cooldownPriority | 43 |
| upgrade.damagePriority | 41 |
| upgrade.evolutionPriority | 99 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 26 |
| upgrade.newWeaponPriority | 92 |
| upgrade.passivePriority | 95 |
| upgrade.survivalPriority | 33 |
| treasure.evolutionChestPriority | 74 |
| treasure.openRiskTolerance | 7 |
| treasure.relicExpectedValuePriority | 55 |
| treasure.routeDeviationTolerance | 12 |
| relic.damageRelicPriority | 91 |
| relic.economyRelicPriority | 43 |
| relic.rarityPriority | 22 |
| relic.survivalRelicPriority | 3 |
| relic.synergyPriority | 97 |

### 30-60

| Weight | Value |
| --- | ---: |
| movement.bossBias | 61 |
| movement.combatBias | 24 |
| movement.farmBias | 15 |
| movement.loopBias | 47 |
| movement.overKitePenalty | 27 |
| movement.riskTolerance | 97 |
| movement.survivalBias | 30 |
| movement.treasureBias | 10 |
| upgrade.cooldownPriority | 43 |
| upgrade.damagePriority | 41 |
| upgrade.evolutionPriority | 99 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 26 |
| upgrade.newWeaponPriority | 92 |
| upgrade.passivePriority | 95 |
| upgrade.survivalPriority | 33 |
| treasure.evolutionChestPriority | 74 |
| treasure.openRiskTolerance | 7 |
| treasure.relicExpectedValuePriority | 55 |
| treasure.routeDeviationTolerance | 12 |
| relic.damageRelicPriority | 91 |
| relic.economyRelicPriority | 43 |
| relic.rarityPriority | 22 |
| relic.survivalRelicPriority | 3 |
| relic.synergyPriority | 97 |

### 60-120

| Weight | Value |
| --- | ---: |
| movement.bossBias | 61 |
| movement.combatBias | 24 |
| movement.farmBias | 15 |
| movement.loopBias | 47 |
| movement.overKitePenalty | 27 |
| movement.riskTolerance | 97 |
| movement.survivalBias | 30 |
| movement.treasureBias | 10 |
| upgrade.cooldownPriority | 43 |
| upgrade.damagePriority | 41 |
| upgrade.evolutionPriority | 99 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 26 |
| upgrade.newWeaponPriority | 92 |
| upgrade.passivePriority | 95 |
| upgrade.survivalPriority | 33 |
| treasure.evolutionChestPriority | 74 |
| treasure.openRiskTolerance | 7 |
| treasure.relicExpectedValuePriority | 55 |
| treasure.routeDeviationTolerance | 12 |
| relic.damageRelicPriority | 91 |
| relic.economyRelicPriority | 43 |
| relic.rarityPriority | 22 |
| relic.survivalRelicPriority | 3 |
| relic.synergyPriority | 97 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
