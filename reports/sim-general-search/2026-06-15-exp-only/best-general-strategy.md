# Best General Strategy

## Search Config

- Scenario count: 30
- Seed count: 3
- Candidates: 160
- Rounds: 3
- Duration seconds: 120
- Tick ms: 50
- Phases: 0-30, 30-60, 60-120

## Overall Performance

- Evaluated random scenarios: 90
- Exp fitness score: 45.6111
- Fitness target: average gained experience only. Other metrics are diagnostic and do not affect ranking.
- Avg exp: 45.6111
- Median exp: 31
- P10 exp: 11.9
- P90 exp: 89.3
- Exp std dev: 36.4465
- Avg damage dealt: 1458.2333
- Median damage dealt: 1111
- P10 damage dealt: 584.5
- Damage dealt std dev: 883.0668
- Avg score: 1023.5333
- Median score: 847.5
- P10 score: 458
- Completion rate: 0.4778
- Avg damage taken: 90.5222
- Damage window pass rate: 0.1222
- Avg 30s damage window violation count: 1.7556
- Damage safety penalty: 13808.9333
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 32.0778
- Delta: 13.5333

## Phase Weight Tables

### 0-30

| Weight | Value |
| --- | ---: |
| movement.bossBias | 36 |
| movement.combatBias | 58 |
| movement.farmBias | 64 |
| movement.loopBias | 52 |
| movement.overKitePenalty | 69 |
| movement.riskTolerance | 64 |
| movement.survivalBias | 26 |
| movement.treasureBias | 28 |
| upgrade.cooldownPriority | 54 |
| upgrade.damagePriority | 58 |
| upgrade.evolutionPriority | 77 |
| upgrade.growthPriority | 17 |
| upgrade.mainWeaponPriority | 58 |
| upgrade.newWeaponPriority | 66 |
| upgrade.passivePriority | 49 |
| upgrade.survivalPriority | 29 |
| treasure.evolutionChestPriority | 56 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 30 |
| treasure.routeDeviationTolerance | 64 |
| relic.damageRelicPriority | 59 |
| relic.economyRelicPriority | 25 |
| relic.rarityPriority | 53 |
| relic.survivalRelicPriority | 39 |
| relic.synergyPriority | 34 |

### 30-60

| Weight | Value |
| --- | ---: |
| movement.bossBias | 33 |
| movement.combatBias | 59 |
| movement.farmBias | 62 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 70 |
| movement.riskTolerance | 59 |
| movement.survivalBias | 26 |
| movement.treasureBias | 30 |
| upgrade.cooldownPriority | 57 |
| upgrade.damagePriority | 58 |
| upgrade.evolutionPriority | 71 |
| upgrade.growthPriority | 14 |
| upgrade.mainWeaponPriority | 63 |
| upgrade.newWeaponPriority | 65 |
| upgrade.passivePriority | 40 |
| upgrade.survivalPriority | 27 |
| treasure.evolutionChestPriority | 54 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 22 |
| treasure.routeDeviationTolerance | 67 |
| relic.damageRelicPriority | 57 |
| relic.economyRelicPriority | 37 |
| relic.rarityPriority | 60 |
| relic.survivalRelicPriority | 33 |
| relic.synergyPriority | 40 |

### 60-120

| Weight | Value |
| --- | ---: |
| movement.bossBias | 34 |
| movement.combatBias | 54 |
| movement.farmBias | 61 |
| movement.loopBias | 57 |
| movement.overKitePenalty | 72 |
| movement.riskTolerance | 53 |
| movement.survivalBias | 27 |
| movement.treasureBias | 29 |
| upgrade.cooldownPriority | 56 |
| upgrade.damagePriority | 58 |
| upgrade.evolutionPriority | 72 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 64 |
| upgrade.newWeaponPriority | 62 |
| upgrade.passivePriority | 39 |
| upgrade.survivalPriority | 26 |
| treasure.evolutionChestPriority | 55 |
| treasure.openRiskTolerance | 54 |
| treasure.relicExpectedValuePriority | 27 |
| treasure.routeDeviationTolerance | 68 |
| relic.damageRelicPriority | 57 |
| relic.economyRelicPriority | 27 |
| relic.rarityPriority | 58 |
| relic.survivalRelicPriority | 37 |
| relic.synergyPriority | 38 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
