# Best General Strategy

## Search Config

- Scenario count: 1
- Seed count: 5
- Candidates: 260
- Rounds: 4
- Duration seconds: 900
- Tick ms: 100
- Minimum boss kill rate: 0.8
- Phases: 0-30, 30-60, 60-120

## Overall Performance

- Evaluated random scenarios: 5
- Exp fitness score: 6934.8
- Fitness target: average gained experience among candidates with boss kill rate at or above the configured minimum.
- Boss kill rate: 0.8
- Avg exp: 6934.8
- Median exp: 8231
- P10 exp: 3397.4
- P90 exp: 9103
- Exp std dev: 3364.8676
- Avg damage dealt: 237443.8
- Median damage dealt: 245755
- P10 damage dealt: 89386.2
- Damage dealt std dev: 131746.2865
- Avg score: 44787.2
- Median score: 53049
- P10 score: 22997.2
- Completion rate: 0.8
- Avg damage taken: 287.2
- Damage window pass rate: 0
- Avg 30s damage window violation count: 5
- Damage safety penalty: 32296.2
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 462.2
- Delta: 6472.6

## Phase Weight Tables

### 0-30

| Weight | Value |
| --- | ---: |
| movement.bossBias | 33 |
| movement.combatBias | 59 |
| movement.farmBias | 48 |
| movement.loopBias | 77 |
| movement.overKitePenalty | 73 |
| movement.riskTolerance | 36 |
| movement.survivalBias | 67 |
| movement.treasureBias | 62 |
| upgrade.cooldownPriority | 60 |
| upgrade.damagePriority | 75 |
| upgrade.evolutionPriority | 56 |
| upgrade.growthPriority | 37 |
| upgrade.mainWeaponPriority | 77 |
| upgrade.newWeaponPriority | 35 |
| upgrade.passivePriority | 54 |
| upgrade.survivalPriority | 33 |
| treasure.evolutionChestPriority | 79 |
| treasure.openRiskTolerance | 30 |
| treasure.relicExpectedValuePriority | 31 |
| treasure.routeDeviationTolerance | 51 |
| relic.damageRelicPriority | 52 |
| relic.economyRelicPriority | 66 |
| relic.rarityPriority | 70 |
| relic.survivalRelicPriority | 59 |
| relic.synergyPriority | 71 |

### 30-60

| Weight | Value |
| --- | ---: |
| movement.bossBias | 40 |
| movement.combatBias | 51 |
| movement.farmBias | 29 |
| movement.loopBias | 80 |
| movement.overKitePenalty | 74 |
| movement.riskTolerance | 34 |
| movement.survivalBias | 44 |
| movement.treasureBias | 50 |
| upgrade.cooldownPriority | 37 |
| upgrade.damagePriority | 67 |
| upgrade.evolutionPriority | 37 |
| upgrade.growthPriority | 24 |
| upgrade.mainWeaponPriority | 69 |
| upgrade.newWeaponPriority | 37 |
| upgrade.passivePriority | 53 |
| upgrade.survivalPriority | 28 |
| treasure.evolutionChestPriority | 64 |
| treasure.openRiskTolerance | 29 |
| treasure.relicExpectedValuePriority | 26 |
| treasure.routeDeviationTolerance | 39 |
| relic.damageRelicPriority | 51 |
| relic.economyRelicPriority | 63 |
| relic.rarityPriority | 52 |
| relic.survivalRelicPriority | 35 |
| relic.synergyPriority | 68 |

### 60-120

| Weight | Value |
| --- | ---: |
| movement.bossBias | 36 |
| movement.combatBias | 43 |
| movement.farmBias | 30 |
| movement.loopBias | 75 |
| movement.overKitePenalty | 55 |
| movement.riskTolerance | 54 |
| movement.survivalBias | 52 |
| movement.treasureBias | 64 |
| upgrade.cooldownPriority | 66 |
| upgrade.damagePriority | 85 |
| upgrade.evolutionPriority | 46 |
| upgrade.growthPriority | 29 |
| upgrade.mainWeaponPriority | 63 |
| upgrade.newWeaponPriority | 32 |
| upgrade.passivePriority | 59 |
| upgrade.survivalPriority | 22 |
| treasure.evolutionChestPriority | 86 |
| treasure.openRiskTolerance | 28 |
| treasure.relicExpectedValuePriority | 32 |
| treasure.routeDeviationTolerance | 60 |
| relic.damageRelicPriority | 52 |
| relic.economyRelicPriority | 64 |
| relic.rarityPriority | 85 |
| relic.survivalRelicPriority | 56 |
| relic.synergyPriority | 75 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
