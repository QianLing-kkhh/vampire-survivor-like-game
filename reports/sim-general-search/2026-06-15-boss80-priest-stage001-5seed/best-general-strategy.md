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
- Exp fitness score: 7449
- Fitness target: average gained experience among candidates with boss kill rate at or above the configured minimum.
- Boss kill rate: 0.8
- Avg exp: 7449
- Median exp: 8343
- P10 exp: 4863.4
- P90 exp: 9216.8
- Exp std dev: 2406.3336
- Avg damage dealt: 543464.2
- Median damage dealt: 392889
- P10 damage dealt: 197427.6
- Damage dealt std dev: 433363.0166
- Avg score: 47743.8
- Median score: 53480
- P10 score: 32605.6
- Completion rate: 0.8
- Avg damage taken: 333.6
- Damage window pass rate: 0
- Avg 30s damage window violation count: 5.4
- Damage safety penalty: 35454.6
- Damage safety rule: every 30s window must stay within 15% max HP; passing windows add no damage penalty, violations apply a large penalty.

## Balanced Default Comparison

- Balanced exp fitness: 43.8
- Delta: 7405.2

## Phase Weight Tables

### 0-180

| Weight | Value |
| --- | ---: |
| movement.bossBias | 91 |
| movement.combatBias | 55 |
| movement.farmBias | 89 |
| movement.loopBias | 67 |
| movement.overKitePenalty | 85 |
| movement.riskTolerance | 62 |
| movement.survivalBias | 46 |
| movement.treasureBias | 26 |
| upgrade.cooldownPriority | 19 |
| upgrade.damagePriority | 54 |
| upgrade.evolutionPriority | 46 |
| upgrade.growthPriority | 8 |
| upgrade.mainWeaponPriority | 39 |
| upgrade.newWeaponPriority | 20 |
| upgrade.passivePriority | 47 |
| upgrade.survivalPriority | 2 |
| treasure.evolutionChestPriority | 49 |
| treasure.openRiskTolerance | 5 |
| treasure.relicExpectedValuePriority | 65 |
| treasure.routeDeviationTolerance | 38 |
| relic.damageRelicPriority | 52 |
| relic.economyRelicPriority | 45 |
| relic.rarityPriority | 2 |
| relic.survivalRelicPriority | 31 |
| relic.synergyPriority | 36 |

### 180-300

| Weight | Value |
| --- | ---: |
| movement.bossBias | 74 |
| movement.combatBias | 66 |
| movement.farmBias | 91 |
| movement.loopBias | 71 |
| movement.overKitePenalty | 78 |
| movement.riskTolerance | 59 |
| movement.survivalBias | 56 |
| movement.treasureBias | 22 |
| upgrade.cooldownPriority | 7 |
| upgrade.damagePriority | 59 |
| upgrade.evolutionPriority | 33 |
| upgrade.growthPriority | 16 |
| upgrade.mainWeaponPriority | 22 |
| upgrade.newWeaponPriority | 39 |
| upgrade.passivePriority | 46 |
| upgrade.survivalPriority | 17 |
| treasure.evolutionChestPriority | 35 |
| treasure.openRiskTolerance | 3 |
| treasure.relicExpectedValuePriority | 63 |
| treasure.routeDeviationTolerance | 36 |
| relic.damageRelicPriority | 58 |
| relic.economyRelicPriority | 24 |
| relic.rarityPriority | 2 |
| relic.survivalRelicPriority | 48 |
| relic.synergyPriority | 47 |

### 300-900

| Weight | Value |
| --- | ---: |
| movement.bossBias | 100 |
| movement.combatBias | 63 |
| movement.farmBias | 95 |
| movement.loopBias | 67 |
| movement.overKitePenalty | 84 |
| movement.riskTolerance | 46 |
| movement.survivalBias | 42 |
| movement.treasureBias | 20 |
| upgrade.cooldownPriority | 14 |
| upgrade.damagePriority | 57 |
| upgrade.evolutionPriority | 46 |
| upgrade.growthPriority | 6 |
| upgrade.mainWeaponPriority | 35 |
| upgrade.newWeaponPriority | 14 |
| upgrade.passivePriority | 32 |
| upgrade.survivalPriority | 2 |
| treasure.evolutionChestPriority | 27 |
| treasure.openRiskTolerance | 0 |
| treasure.relicExpectedValuePriority | 68 |
| treasure.routeDeviationTolerance | 39 |
| relic.damageRelicPriority | 53 |
| relic.economyRelicPriority | 15 |
| relic.rarityPriority | 0 |
| relic.survivalRelicPriority | 42 |
| relic.synergyPriority | 42 |

## Risks

- This result is based on core-sim simplified.
- It has not been validated in browser gameplay.
- It is not a formal game balance conclusion.
