# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 20
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000011_1ec5245d | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |
| 2 | search_candidate_000020_05879dac | 4.9333 | 1 | 180.6667 | 2.3333 | 0 | 2.6667 | 56.6667 | 0 | 2.3333 | 32 |
| 3 | search_candidate_000010_a0191c22 | 4.6666 | 1 | 176.6667 | 2.3333 | 0 | 2.3333 | 53.3333 | 0 | 2.3333 | 32 |
| 4 | search_candidate_000006_a85c4c4e | 4.2666 | 1 | 176 | 2 | 0 | 2.3333 | 53.3333 | 0 | 2 | 32 |
| 5 | search_candidate_000015_5cf61568 | 4.2666 | 1 | 176.3333 | 2 | 0 | 2.3333 | 53.3333 | 0 | 2 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000010_a0191c22 | 161 | 1 | 390 | 14 | 1 | 18.6667 | 416.6667 | 0 | 14 | 50 |
| 2 | search_candidate_000008_e05c1b0e | 158.76 | 1 | 377.6667 | 14.3333 | 1 | 17.6667 | 410 | 0.8 | 14.3333 | 50 |
| 3 | search_candidate_000007_7ec2cf34 | 157.28 | 1 | 391.3333 | 14 | 1 | 19 | 412 | 2.2 | 14 | 50 |
| 4 | search_candidate_000002_c906466d | 152.6267 | 1 | 373 | 13.6667 | 1 | 17.6667 | 406.6667 | 3.8 | 13.6667 | 50 |
| 5 | search_candidate_000006_a85c4c4e | 148.9333 | 1 | 375 | 14.3333 | 1 | 18 | 406 | 6.4 | 14.3333 | 50 |

## Top Candidate Weight Tables

### search_candidate_000011_1ec5245d

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 22 |
| movement.farmBias | 82 |
| movement.loopBias | 63 |
| movement.overKitePenalty | 59 |
| movement.riskTolerance | 16 |
| movement.survivalBias | 37 |
| movement.treasureBias | 14 |
| upgrade.cooldownPriority | 25 |
| upgrade.damagePriority | 11 |
| upgrade.evolutionPriority | 43 |
| upgrade.growthPriority | 43 |
| upgrade.mainWeaponPriority | 41 |
| upgrade.newWeaponPriority | 34 |
| upgrade.passivePriority | 70 |
| upgrade.survivalPriority | 82 |
| treasure.evolutionChestPriority | 55 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 67 |
| treasure.routeDeviationTolerance | 95 |
| relic.damageRelicPriority | 13 |
| relic.economyRelicPriority | 94 |
| relic.rarityPriority | 59 |
| relic.survivalRelicPriority | 1 |
| relic.synergyPriority | 14 |

### search_candidate_000020_05879dac

| Weight | Value |
| --- | ---: |
| movement.bossBias | 45 |
| movement.combatBias | 37 |
| movement.farmBias | 99 |
| movement.loopBias | 99 |
| movement.overKitePenalty | 95 |
| movement.riskTolerance | 28 |
| movement.survivalBias | 58 |
| movement.treasureBias | 71 |
| upgrade.cooldownPriority | 39 |
| upgrade.damagePriority | 8 |
| upgrade.evolutionPriority | 53 |
| upgrade.growthPriority | 40 |
| upgrade.mainWeaponPriority | 0 |
| upgrade.newWeaponPriority | 58 |
| upgrade.passivePriority | 29 |
| upgrade.survivalPriority | 85 |
| treasure.evolutionChestPriority | 50 |
| treasure.openRiskTolerance | 46 |
| treasure.relicExpectedValuePriority | 69 |
| treasure.routeDeviationTolerance | 20 |
| relic.damageRelicPriority | 58 |
| relic.economyRelicPriority | 7 |
| relic.rarityPriority | 10 |
| relic.survivalRelicPriority | 66 |
| relic.synergyPriority | 100 |

### search_candidate_000010_a0191c22

| Weight | Value |
| --- | ---: |
| movement.bossBias | 65 |
| movement.combatBias | 59 |
| movement.farmBias | 78 |
| movement.loopBias | 39 |
| movement.overKitePenalty | 70 |
| movement.riskTolerance | 8 |
| movement.survivalBias | 47 |
| movement.treasureBias | 90 |
| upgrade.cooldownPriority | 97 |
| upgrade.damagePriority | 10 |
| upgrade.evolutionPriority | 69 |
| upgrade.growthPriority | 83 |
| upgrade.mainWeaponPriority | 96 |
| upgrade.newWeaponPriority | 35 |
| upgrade.passivePriority | 87 |
| upgrade.survivalPriority | 59 |
| treasure.evolutionChestPriority | 5 |
| treasure.openRiskTolerance | 65 |
| treasure.relicExpectedValuePriority | 63 |
| treasure.routeDeviationTolerance | 93 |
| relic.damageRelicPriority | 42 |
| relic.economyRelicPriority | 41 |
| relic.rarityPriority | 7 |
| relic.survivalRelicPriority | 72 |
| relic.synergyPriority | 83 |

### search_candidate_000006_a85c4c4e

| Weight | Value |
| --- | ---: |
| movement.bossBias | 26 |
| movement.combatBias | 67 |
| movement.farmBias | 73 |
| movement.loopBias | 41 |
| movement.overKitePenalty | 65 |
| movement.riskTolerance | 14 |
| movement.survivalBias | 46 |
| movement.treasureBias | 54 |
| upgrade.cooldownPriority | 89 |
| upgrade.damagePriority | 8 |
| upgrade.evolutionPriority | 90 |
| upgrade.growthPriority | 40 |
| upgrade.mainWeaponPriority | 17 |
| upgrade.newWeaponPriority | 48 |
| upgrade.passivePriority | 1 |
| upgrade.survivalPriority | 12 |
| treasure.evolutionChestPriority | 17 |
| treasure.openRiskTolerance | 75 |
| treasure.relicExpectedValuePriority | 86 |
| treasure.routeDeviationTolerance | 26 |
| relic.damageRelicPriority | 55 |
| relic.economyRelicPriority | 5 |
| relic.rarityPriority | 2 |
| relic.survivalRelicPriority | 86 |
| relic.synergyPriority | 49 |

### search_candidate_000015_5cf61568

| Weight | Value |
| --- | ---: |
| movement.bossBias | 2 |
| movement.combatBias | 100 |
| movement.farmBias | 27 |
| movement.loopBias | 14 |
| movement.overKitePenalty | 47 |
| movement.riskTolerance | 95 |
| movement.survivalBias | 9 |
| movement.treasureBias | 83 |
| upgrade.cooldownPriority | 42 |
| upgrade.damagePriority | 38 |
| upgrade.evolutionPriority | 1 |
| upgrade.growthPriority | 32 |
| upgrade.mainWeaponPriority | 66 |
| upgrade.newWeaponPriority | 72 |
| upgrade.passivePriority | 95 |
| upgrade.survivalPriority | 99 |
| treasure.evolutionChestPriority | 93 |
| treasure.openRiskTolerance | 99 |
| treasure.relicExpectedValuePriority | 38 |
| treasure.routeDeviationTolerance | 43 |
| relic.damageRelicPriority | 59 |
| relic.economyRelicPriority | 87 |
| relic.rarityPriority | 60 |
| relic.survivalRelicPriority | 68 |
| relic.synergyPriority | 75 |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | search_candidate_000011_1ec5245d | 5.3334 | 3.8667 | 1.4667 |
| 30-60 | search_candidate_000010_a0191c22 | 161 | 151.9467 | 9.0533 |

## Recommended Phased Strategy Draft

```json
{
  "version": 1,
  "id": "searched_phased_strategy_157e3945",
  "name": "Searched Phased Strategy",
  "phases": [
    {
      "startSeconds": 0,
      "endSeconds": 30,
      "profile": {
        "version": 1,
        "id": "search_candidate_000011_1ec5245d",
        "name": "Search Candidate 000011",
        "movement": {
          "survivalBias": 37,
          "combatBias": 22,
          "farmBias": 82,
          "treasureBias": 14,
          "bossBias": 17,
          "riskTolerance": 16,
          "loopBias": 63,
          "overKitePenalty": 59
        },
        "upgrade": {
          "evolutionPriority": 43,
          "mainWeaponPriority": 41,
          "newWeaponPriority": 34,
          "passivePriority": 70,
          "survivalPriority": 82,
          "cooldownPriority": 25,
          "damagePriority": 11,
          "growthPriority": 43
        },
        "treasure": {
          "openRiskTolerance": 100,
          "evolutionChestPriority": 55,
          "relicExpectedValuePriority": 67,
          "routeDeviationTolerance": 95
        },
        "relic": {
          "rarityPriority": 59,
          "synergyPriority": 14,
          "survivalRelicPriority": 1,
          "damageRelicPriority": 13,
          "economyRelicPriority": 94
        }
      }
    },
    {
      "startSeconds": 30,
      "endSeconds": 60,
      "profile": {
        "version": 1,
        "id": "search_candidate_000010_a0191c22",
        "name": "Search Candidate 000010",
        "movement": {
          "survivalBias": 47,
          "combatBias": 59,
          "farmBias": 78,
          "treasureBias": 90,
          "bossBias": 65,
          "riskTolerance": 8,
          "loopBias": 39,
          "overKitePenalty": 70
        },
        "upgrade": {
          "evolutionPriority": 69,
          "mainWeaponPriority": 96,
          "newWeaponPriority": 35,
          "passivePriority": 87,
          "survivalPriority": 59,
          "cooldownPriority": 97,
          "damagePriority": 10,
          "growthPriority": 83
        },
        "treasure": {
          "openRiskTolerance": 65,
          "evolutionChestPriority": 5,
          "relicExpectedValuePriority": 63,
          "routeDeviationTolerance": 93
        },
        "relic": {
          "rarityPriority": 7,
          "synergyPriority": 83,
          "survivalRelicPriority": 72,
          "damageRelicPriority": 42,
          "economyRelicPriority": 41
        }
      }
    }
  ]
}
```

