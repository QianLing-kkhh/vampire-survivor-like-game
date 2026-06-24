# Best General Strategy

## Search Config

- Scenario count: 1
- Seed count: 5
- Candidates: 520
- Rounds: 5
- Duration seconds: 900
- Tick ms: 100
- Minimum boss kill rate: 0.8
- Phases: 0-180, 180-300, 300-900

## Overall Performance

- Evaluated random scenarios: 5
- Exp fitness score: 6987.8
- Fitness target: average gained experience among candidates with boss kill rate at or above the configured minimum.
- Boss kill rate: 0.8
- Avg exp: 6987.8
- Median exp: 8119
- P10 exp: 3300
- P90 exp: 9373.6
- Exp std dev: 3495.0628
- Avg damage dealt: 398678.8
- Median damage dealt: 379898
- P10 damage dealt: 139943
- Damage dealt std dev: 265441.9445
- Avg score: 44791.4
- Median score: 52693
- P10 score: 22031
- Completion rate: 0.8
- Avg damage taken: 254.8
- Damage window pass rate: 0
- Avg 30s damage window violation count: 4.2
- Damage safety penalty: 27457.8
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 390.4
- Delta: 6597.4

## Phase Weight Tables

### 0-180

| Weight | Value |
| --- | ---: |
| movement.bossBias | 82 |
| movement.combatBias | 100 |
| movement.farmBias | 72 |
| movement.loopBias | 53 |
| movement.overKitePenalty | 55 |
| movement.riskTolerance | 59 |
| movement.survivalBias | 51 |
| movement.treasureBias | 28 |
| upgrade.cooldownPriority | 28 |
| upgrade.damagePriority | 86 |
| upgrade.evolutionPriority | 17 |
| upgrade.growthPriority | 29 |
| upgrade.mainWeaponPriority | 100 |
| upgrade.newWeaponPriority | 31 |
| upgrade.passivePriority | 78 |
| upgrade.survivalPriority | 1 |
| treasure.evolutionChestPriority | 41 |
| treasure.openRiskTolerance | 44 |
| treasure.relicExpectedValuePriority | 2 |
| treasure.routeDeviationTolerance | 43 |
| relic.damageRelicPriority | 10 |
| relic.economyRelicPriority | 17 |
| relic.rarityPriority | 43 |
| relic.survivalRelicPriority | 46 |
| relic.synergyPriority | 18 |

### 180-300

| Weight | Value |
| --- | ---: |
| movement.bossBias | 64 |
| movement.combatBias | 100 |
| movement.farmBias | 71 |
| movement.loopBias | 59 |
| movement.overKitePenalty | 52 |
| movement.riskTolerance | 56 |
| movement.survivalBias | 50 |
| movement.treasureBias | 32 |
| upgrade.cooldownPriority | 8 |
| upgrade.damagePriority | 84 |
| upgrade.evolutionPriority | 0 |
| upgrade.growthPriority | 35 |
| upgrade.mainWeaponPriority | 79 |
| upgrade.newWeaponPriority | 26 |
| upgrade.passivePriority | 78 |
| upgrade.survivalPriority | 7 |
| treasure.evolutionChestPriority | 42 |
| treasure.openRiskTolerance | 49 |
| treasure.relicExpectedValuePriority | 7 |
| treasure.routeDeviationTolerance | 56 |
| relic.damageRelicPriority | 12 |
| relic.economyRelicPriority | 24 |
| relic.rarityPriority | 52 |
| relic.survivalRelicPriority | 50 |
| relic.synergyPriority | 25 |

### 300-900

| Weight | Value |
| --- | ---: |
| movement.bossBias | 91 |
| movement.combatBias | 87 |
| movement.farmBias | 67 |
| movement.loopBias | 68 |
| movement.overKitePenalty | 47 |
| movement.riskTolerance | 47 |
| movement.survivalBias | 43 |
| movement.treasureBias | 30 |
| upgrade.cooldownPriority | 31 |
| upgrade.damagePriority | 94 |
| upgrade.evolutionPriority | 7 |
| upgrade.growthPriority | 33 |
| upgrade.mainWeaponPriority | 84 |
| upgrade.newWeaponPriority | 18 |
| upgrade.passivePriority | 100 |
| upgrade.survivalPriority | 2 |
| treasure.evolutionChestPriority | 39 |
| treasure.openRiskTolerance | 40 |
| treasure.relicExpectedValuePriority | 5 |
| treasure.routeDeviationTolerance | 66 |
| relic.damageRelicPriority | 19 |
| relic.economyRelicPriority | 11 |
| relic.rarityPriority | 53 |
| relic.survivalRelicPriority | 36 |
| relic.synergyPriority | 32 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
