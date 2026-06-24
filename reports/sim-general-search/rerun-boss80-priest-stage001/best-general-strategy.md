# Best General Strategy

## Search Config

- Scenario count: 1
- Seed count: 5
- Candidates: 200
- Rounds: 3
- Duration seconds: 900
- Tick ms: 100
- Minimum boss kill rate: 0.8
- Phases: 0-180, 180-300, 300-900

## Overall Performance

- Evaluated random scenarios: 5
- Exp fitness score: 3904.4
- Fitness target: average gained experience among candidates with boss kill rate at or above the configured minimum.
- Boss kill rate: 0.8
- Avg exp: 3904.4
- Median exp: 2671
- P10 exp: 928.6
- P90 exp: 7690
- Exp std dev: 3170.2655
- Avg damage dealt: 184251.6
- Median damage dealt: 59004
- P10 damage dealt: 23333
- Damage dealt std dev: 204809.3308
- Avg score: 26480.8
- Median score: 20134
- P10 score: 7813
- Completion rate: 0.8
- Avg damage taken: 355.4
- Damage window pass rate: 0
- Avg 30s damage window violation count: 5.4
- Damage safety penalty: 38910.2
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 62
- Delta: 3842.4

## Phase Weight Tables

### 0-180

| Weight | Value |
| --- | ---: |
| movement.bossBias | 78 |
| movement.combatBias | 83 |
| movement.farmBias | 10 |
| movement.loopBias | 100 |
| movement.overKitePenalty | 74 |
| movement.riskTolerance | 75 |
| movement.survivalBias | 81 |
| movement.treasureBias | 14 |
| upgrade.cooldownPriority | 0 |
| upgrade.damagePriority | 48 |
| upgrade.evolutionPriority | 82 |
| upgrade.growthPriority | 32 |
| upgrade.mainWeaponPriority | 90 |
| upgrade.newWeaponPriority | 89 |
| upgrade.passivePriority | 48 |
| upgrade.survivalPriority | 0 |
| treasure.evolutionChestPriority | 89 |
| treasure.openRiskTolerance | 60 |
| treasure.relicExpectedValuePriority | 38 |
| treasure.routeDeviationTolerance | 43 |
| relic.damageRelicPriority | 86 |
| relic.economyRelicPriority | 20 |
| relic.rarityPriority | 90 |
| relic.survivalRelicPriority | 60 |
| relic.synergyPriority | 29 |

### 180-300

| Weight | Value |
| --- | ---: |
| movement.bossBias | 73 |
| movement.combatBias | 84 |
| movement.farmBias | 5 |
| movement.loopBias | 98 |
| movement.overKitePenalty | 79 |
| movement.riskTolerance | 86 |
| movement.survivalBias | 79 |
| movement.treasureBias | 8 |
| upgrade.cooldownPriority | 0 |
| upgrade.damagePriority | 45 |
| upgrade.evolutionPriority | 93 |
| upgrade.growthPriority | 19 |
| upgrade.mainWeaponPriority | 86 |
| upgrade.newWeaponPriority | 91 |
| upgrade.passivePriority | 30 |
| upgrade.survivalPriority | 1 |
| treasure.evolutionChestPriority | 98 |
| treasure.openRiskTolerance | 53 |
| treasure.relicExpectedValuePriority | 39 |
| treasure.routeDeviationTolerance | 49 |
| relic.damageRelicPriority | 75 |
| relic.economyRelicPriority | 0 |
| relic.rarityPriority | 87 |
| relic.survivalRelicPriority | 61 |
| relic.synergyPriority | 13 |

### 300-900

| Weight | Value |
| --- | ---: |
| movement.bossBias | 82 |
| movement.combatBias | 86 |
| movement.farmBias | 14 |
| movement.loopBias | 100 |
| movement.overKitePenalty | 71 |
| movement.riskTolerance | 80 |
| movement.survivalBias | 87 |
| movement.treasureBias | 4 |
| upgrade.cooldownPriority | 2 |
| upgrade.damagePriority | 47 |
| upgrade.evolutionPriority | 88 |
| upgrade.growthPriority | 13 |
| upgrade.mainWeaponPriority | 73 |
| upgrade.newWeaponPriority | 100 |
| upgrade.passivePriority | 48 |
| upgrade.survivalPriority | 9 |
| treasure.evolutionChestPriority | 100 |
| treasure.openRiskTolerance | 41 |
| treasure.relicExpectedValuePriority | 45 |
| treasure.routeDeviationTolerance | 55 |
| relic.damageRelicPriority | 74 |
| relic.economyRelicPriority | 21 |
| relic.rarityPriority | 90 |
| relic.survivalRelicPriority | 67 |
| relic.synergyPriority | 14 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
