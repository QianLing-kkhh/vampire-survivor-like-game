# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 40
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001-round-1
- Search Mode: random
- Center Strategy: n/a
- Mutation Radius: n/a
- Mutation Mode: n/a
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000001_3dcb0ae4 | 5.2 | 1 | 184.6667 | 2.3333 | 0 | 3 | 60 | 0 | 2.3333 | 32 |
| 2 | search_candidate_000017_60ca10c5 | 5.0334 | 1 | 180.6667 | 2.6667 | 0 | 2.6667 | 56.6667 | 0.2 | 2.6667 | 32 |
| 3 | search_candidate_000022_b8acd643 | 4.9333 | 1 | 180.6667 | 2.3333 | 0 | 2.6667 | 60 | 0 | 2.3333 | 32 |
| 4 | search_candidate_000034_758d0c28 | 4.8 | 1 | 184 | 2 | 0 | 3 | 63.3333 | 0 | 2 | 32 |
| 5 | search_candidate_000003_79ebbde3 | 4.5334 | 1 | 180 | 2 | 0 | 2.6667 | 56.6667 | 0 | 2 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000036_b7931094 | 153.3733 | 1 | 384.3333 | 13.3333 | 1 | 18.6667 | 428.6667 | 4 | 13.3333 | 50 |
| 2 | search_candidate_000038_a4bb761d | 153.2533 | 1 | 353.6667 | 12 | 1 | 16 | 370.6667 | 1.2 | 12 | 50 |
| 3 | search_candidate_000010_3bdb8996 | 147.9333 | 1 | 367 | 14 | 1 | 17.3333 | 370 | 6 | 14 | 50 |
| 4 | search_candidate_000012_d8bbd995 | 146.0867 | 1 | 355 | 10.6667 | 1 | 16.6667 | 405.6667 | 5.2 | 10.6667 | 50 |
| 5 | search_candidate_000023_8af10d67 | 145.88 | 1 | 361.6667 | 14.3333 | 1 | 17 | 393.3333 | 7.4 | 14.3333 | 50 |

## Top Weight Distribution by Phase

### 0-30

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 46 | 52 | 20 | 59 |
| movement.combatBias | 63.6 | 63 | 9 | 94 |
| movement.farmBias | 66 | 65 | 49 | 96 |
| movement.loopBias | 57.6 | 55 | 39 | 99 |
| movement.overKitePenalty | 65.6 | 82 | 1 | 90 |
| movement.riskTolerance | 47.2 | 42 | 17 | 93 |
| movement.survivalBias | 33.4 | 29 | 24 | 58 |
| movement.treasureBias | 60 | 64 | 26 | 97 |
| relic.damageRelicPriority | 68.6 | 87 | 2 | 90 |
| relic.economyRelicPriority | 53.2 | 57 | 13 | 87 |
| relic.rarityPriority | 32.2 | 30 | 1 | 75 |
| relic.survivalRelicPriority | 59.2 | 60 | 32 | 86 |
| relic.synergyPriority | 39.8 | 32 | 10 | 99 |
| treasure.evolutionChestPriority | 53.8 | 63 | 18 | 77 |
| treasure.openRiskTolerance | 37.8 | 31 | 12 | 85 |
| treasure.relicExpectedValuePriority | 36.8 | 28 | 6 | 92 |
| treasure.routeDeviationTolerance | 41 | 27 | 19 | 75 |
| upgrade.cooldownPriority | 54.8 | 78 | 10 | 97 |
| upgrade.damagePriority | 74.4 | 72 | 54 | 99 |
| upgrade.evolutionPriority | 44.2 | 21 | 19 | 97 |
| upgrade.growthPriority | 39.6 | 31 | 8 | 68 |
| upgrade.mainWeaponPriority | 43.2 | 43 | 34 | 58 |
| upgrade.newWeaponPriority | 57.8 | 74 | 3 | 85 |
| upgrade.passivePriority | 45.4 | 43 | 11 | 79 |
| upgrade.survivalPriority | 50.8 | 68 | 9 | 92 |

### 30-60

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 48 | 37 | 17 | 91 |
| movement.combatBias | 80.4 | 93 | 30 | 98 |
| movement.farmBias | 63 | 63 | 27 | 98 |
| movement.loopBias | 60.4 | 62 | 25 | 98 |
| movement.overKitePenalty | 38.6 | 39 | 23 | 56 |
| movement.riskTolerance | 31.4 | 14 | 5 | 88 |
| movement.survivalBias | 59 | 59 | 28 | 81 |
| movement.treasureBias | 55.4 | 57 | 18 | 76 |
| relic.damageRelicPriority | 53 | 50 | 32 | 81 |
| relic.economyRelicPriority | 45.8 | 45 | 13 | 74 |
| relic.rarityPriority | 49.2 | 51 | 5 | 89 |
| relic.survivalRelicPriority | 65.8 | 82 | 19 | 99 |
| relic.synergyPriority | 49.4 | 52 | 6 | 100 |
| treasure.evolutionChestPriority | 37.8 | 33 | 8 | 66 |
| treasure.openRiskTolerance | 63.4 | 76 | 7 | 80 |
| treasure.relicExpectedValuePriority | 47.8 | 50 | 9 | 81 |
| treasure.routeDeviationTolerance | 54.2 | 51 | 25 | 81 |
| upgrade.cooldownPriority | 52 | 66 | 18 | 83 |
| upgrade.damagePriority | 40.8 | 35 | 24 | 65 |
| upgrade.evolutionPriority | 62.2 | 76 | 13 | 94 |
| upgrade.growthPriority | 35.2 | 32 | 6 | 71 |
| upgrade.mainWeaponPriority | 67.2 | 69 | 19 | 94 |
| upgrade.newWeaponPriority | 73.6 | 90 | 44 | 94 |
| upgrade.passivePriority | 50.8 | 52 | 17 | 71 |
| upgrade.survivalPriority | 74.4 | 89 | 27 | 93 |

## Top Candidate Weight Tables

### search_candidate_000001_3dcb0ae4

| Weight | Value |
| --- | ---: |
| movement.bossBias | 59 |
| movement.combatBias | 58 |
| movement.farmBias | 49 |
| movement.loopBias | 40 |
| movement.overKitePenalty | 90 |
| movement.riskTolerance | 23 |
| movement.survivalBias | 58 |
| movement.treasureBias | 26 |
| upgrade.cooldownPriority | 10 |
| upgrade.damagePriority | 54 |
| upgrade.evolutionPriority | 21 |
| upgrade.growthPriority | 26 |
| upgrade.mainWeaponPriority | 46 |
| upgrade.newWeaponPriority | 85 |
| upgrade.passivePriority | 68 |
| upgrade.survivalPriority | 68 |
| treasure.evolutionChestPriority | 63 |
| treasure.openRiskTolerance | 22 |
| treasure.relicExpectedValuePriority | 92 |
| treasure.routeDeviationTolerance | 27 |
| relic.damageRelicPriority | 76 |
| relic.economyRelicPriority | 86 |
| relic.rarityPriority | 5 |
| relic.survivalRelicPriority | 60 |
| relic.synergyPriority | 32 |

### search_candidate_000017_60ca10c5

| Weight | Value |
| --- | ---: |
| movement.bossBias | 20 |
| movement.combatBias | 63 |
| movement.farmBias | 65 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 82 |
| movement.riskTolerance | 93 |
| movement.survivalBias | 24 |
| movement.treasureBias | 97 |
| upgrade.cooldownPriority | 78 |
| upgrade.damagePriority | 99 |
| upgrade.evolutionPriority | 63 |
| upgrade.growthPriority | 65 |
| upgrade.mainWeaponPriority | 58 |
| upgrade.newWeaponPriority | 3 |
| upgrade.passivePriority | 79 |
| upgrade.survivalPriority | 9 |
| treasure.evolutionChestPriority | 77 |
| treasure.openRiskTolerance | 12 |
| treasure.relicExpectedValuePriority | 33 |
| treasure.routeDeviationTolerance | 60 |
| relic.damageRelicPriority | 87 |
| relic.economyRelicPriority | 87 |
| relic.rarityPriority | 75 |
| relic.survivalRelicPriority | 63 |
| relic.synergyPriority | 99 |

### search_candidate_000022_b8acd643

| Weight | Value |
| --- | ---: |
| movement.bossBias | 45 |
| movement.combatBias | 9 |
| movement.farmBias | 96 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 90 |
| movement.riskTolerance | 42 |
| movement.survivalBias | 29 |
| movement.treasureBias | 28 |
| upgrade.cooldownPriority | 10 |
| upgrade.damagePriority | 72 |
| upgrade.evolutionPriority | 19 |
| upgrade.growthPriority | 68 |
| upgrade.mainWeaponPriority | 35 |
| upgrade.newWeaponPriority | 44 |
| upgrade.passivePriority | 43 |
| upgrade.survivalPriority | 73 |
| treasure.evolutionChestPriority | 18 |
| treasure.openRiskTolerance | 31 |
| treasure.relicExpectedValuePriority | 28 |
| treasure.routeDeviationTolerance | 75 |
| relic.damageRelicPriority | 90 |
| relic.economyRelicPriority | 23 |
| relic.rarityPriority | 30 |
| relic.survivalRelicPriority | 86 |
| relic.synergyPriority | 13 |

### search_candidate_000034_758d0c28

| Weight | Value |
| --- | ---: |
| movement.bossBias | 54 |
| movement.combatBias | 94 |
| movement.farmBias | 69 |
| movement.loopBias | 99 |
| movement.overKitePenalty | 1 |
| movement.riskTolerance | 61 |
| movement.survivalBias | 32 |
| movement.treasureBias | 85 |
| upgrade.cooldownPriority | 79 |
| upgrade.damagePriority | 83 |
| upgrade.evolutionPriority | 21 |
| upgrade.growthPriority | 8 |
| upgrade.mainWeaponPriority | 34 |
| upgrade.newWeaponPriority | 74 |
| upgrade.passivePriority | 11 |
| upgrade.survivalPriority | 92 |
| treasure.evolutionChestPriority | 71 |
| treasure.openRiskTolerance | 39 |
| treasure.relicExpectedValuePriority | 6 |
| treasure.routeDeviationTolerance | 24 |
| relic.damageRelicPriority | 88 |
| relic.economyRelicPriority | 57 |
| relic.rarityPriority | 1 |
| relic.survivalRelicPriority | 32 |
| relic.synergyPriority | 10 |

### search_candidate_000003_79ebbde3

| Weight | Value |
| --- | ---: |
| movement.bossBias | 52 |
| movement.combatBias | 94 |
| movement.farmBias | 51 |
| movement.loopBias | 39 |
| movement.overKitePenalty | 65 |
| movement.riskTolerance | 17 |
| movement.survivalBias | 24 |
| movement.treasureBias | 64 |
| upgrade.cooldownPriority | 97 |
| upgrade.damagePriority | 64 |
| upgrade.evolutionPriority | 97 |
| upgrade.growthPriority | 31 |
| upgrade.mainWeaponPriority | 43 |
| upgrade.newWeaponPriority | 83 |
| upgrade.passivePriority | 26 |
| upgrade.survivalPriority | 12 |
| treasure.evolutionChestPriority | 40 |
| treasure.openRiskTolerance | 85 |
| treasure.relicExpectedValuePriority | 25 |
| treasure.routeDeviationTolerance | 19 |
| relic.damageRelicPriority | 2 |
| relic.economyRelicPriority | 13 |
| relic.rarityPriority | 50 |
| relic.survivalRelicPriority | 55 |
| relic.synergyPriority | 45 |

### search_candidate_000036_b7931094

| Weight | Value |
| --- | ---: |
| movement.bossBias | 91 |
| movement.combatBias | 98 |
| movement.farmBias | 48 |
| movement.loopBias | 98 |
| movement.overKitePenalty | 30 |
| movement.riskTolerance | 14 |
| movement.survivalBias | 81 |
| movement.treasureBias | 18 |
| upgrade.cooldownPriority | 83 |
| upgrade.damagePriority | 35 |
| upgrade.evolutionPriority | 76 |
| upgrade.growthPriority | 71 |
| upgrade.mainWeaponPriority | 63 |
| upgrade.newWeaponPriority | 90 |
| upgrade.passivePriority | 65 |
| upgrade.survivalPriority | 73 |
| treasure.evolutionChestPriority | 66 |
| treasure.openRiskTolerance | 80 |
| treasure.relicExpectedValuePriority | 69 |
| treasure.routeDeviationTolerance | 74 |
| relic.damageRelicPriority | 81 |
| relic.economyRelicPriority | 13 |
| relic.rarityPriority | 51 |
| relic.survivalRelicPriority | 91 |
| relic.synergyPriority | 52 |

### search_candidate_000038_a4bb761d

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 85 |
| movement.farmBias | 79 |
| movement.loopBias | 25 |
| movement.overKitePenalty | 56 |
| movement.riskTolerance | 5 |
| movement.survivalBias | 51 |
| movement.treasureBias | 56 |
| upgrade.cooldownPriority | 72 |
| upgrade.damagePriority | 65 |
| upgrade.evolutionPriority | 51 |
| upgrade.growthPriority | 6 |
| upgrade.mainWeaponPriority | 91 |
| upgrade.newWeaponPriority | 44 |
| upgrade.passivePriority | 52 |
| upgrade.survivalPriority | 90 |
| treasure.evolutionChestPriority | 33 |
| treasure.openRiskTolerance | 76 |
| treasure.relicExpectedValuePriority | 50 |
| treasure.routeDeviationTolerance | 25 |
| relic.damageRelicPriority | 32 |
| relic.economyRelicPriority | 74 |
| relic.rarityPriority | 42 |
| relic.survivalRelicPriority | 82 |
| relic.synergyPriority | 33 |

### search_candidate_000010_3bdb8996

| Weight | Value |
| --- | ---: |
| movement.bossBias | 37 |
| movement.combatBias | 30 |
| movement.farmBias | 98 |
| movement.loopBias | 45 |
| movement.overKitePenalty | 23 |
| movement.riskTolerance | 39 |
| movement.survivalBias | 59 |
| movement.treasureBias | 70 |
| upgrade.cooldownPriority | 66 |
| upgrade.damagePriority | 24 |
| upgrade.evolutionPriority | 13 |
| upgrade.growthPriority | 32 |
| upgrade.mainWeaponPriority | 69 |
| upgrade.newWeaponPriority | 94 |
| upgrade.passivePriority | 17 |
| upgrade.survivalPriority | 93 |
| treasure.evolutionChestPriority | 53 |
| treasure.openRiskTolerance | 74 |
| treasure.relicExpectedValuePriority | 30 |
| treasure.routeDeviationTolerance | 81 |
| relic.damageRelicPriority | 62 |
| relic.economyRelicPriority | 29 |
| relic.rarityPriority | 59 |
| relic.survivalRelicPriority | 99 |
| relic.synergyPriority | 100 |

### search_candidate_000012_d8bbd995

| Weight | Value |
| --- | ---: |
| movement.bossBias | 71 |
| movement.combatBias | 96 |
| movement.farmBias | 27 |
| movement.loopBias | 72 |
| movement.overKitePenalty | 45 |
| movement.riskTolerance | 88 |
| movement.survivalBias | 76 |
| movement.treasureBias | 57 |
| upgrade.cooldownPriority | 18 |
| upgrade.damagePriority | 25 |
| upgrade.evolutionPriority | 94 |
| upgrade.growthPriority | 12 |
| upgrade.mainWeaponPriority | 94 |
| upgrade.newWeaponPriority | 90 |
| upgrade.passivePriority | 49 |
| upgrade.survivalPriority | 27 |
| treasure.evolutionChestPriority | 8 |
| treasure.openRiskTolerance | 80 |
| treasure.relicExpectedValuePriority | 81 |
| treasure.routeDeviationTolerance | 51 |
| relic.damageRelicPriority | 40 |
| relic.economyRelicPriority | 68 |
| relic.rarityPriority | 5 |
| relic.survivalRelicPriority | 19 |
| relic.synergyPriority | 56 |

### search_candidate_000023_8af10d67

| Weight | Value |
| --- | ---: |
| movement.bossBias | 24 |
| movement.combatBias | 93 |
| movement.farmBias | 63 |
| movement.loopBias | 62 |
| movement.overKitePenalty | 39 |
| movement.riskTolerance | 11 |
| movement.survivalBias | 28 |
| movement.treasureBias | 76 |
| upgrade.cooldownPriority | 21 |
| upgrade.damagePriority | 55 |
| upgrade.evolutionPriority | 77 |
| upgrade.growthPriority | 55 |
| upgrade.mainWeaponPriority | 19 |
| upgrade.newWeaponPriority | 50 |
| upgrade.passivePriority | 71 |
| upgrade.survivalPriority | 89 |
| treasure.evolutionChestPriority | 29 |
| treasure.openRiskTolerance | 7 |
| treasure.relicExpectedValuePriority | 9 |
| treasure.routeDeviationTolerance | 40 |
| relic.damageRelicPriority | 50 |
| relic.economyRelicPriority | 45 |
| relic.rarityPriority | 89 |
| relic.survivalRelicPriority | 38 |
| relic.synergyPriority | 6 |

## Phased Strategy Evaluation

- Best strategy: searched_top10-average-phased_7b406d07
- Evaluated strategies: 5
- Best Improvement Over Center: n/a
- Best Improvement Over Baseline: 6.2466

| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | top10-average-phased | 6.2466 | 3.1233 | 1 / 2 | yes |
| 2 | top1-phased | -2.3068 | -1.1534 | 1 / 2 | no |
| 3 | top10-median-phased | -26.5868 | -13.2934 | 1 / 2 | no |
| 4 | topN-median-phased | -37.1799 | -18.59 | 1 / 2 | no |
| 5 | top5-average-phased | -41.0535 | -20.5267 | 1 / 2 | no |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | search_candidate_000001_3dcb0ae4 | 5.2 | 4.5334 | 0.6666 |
| 30-60 | search_candidate_000036_b7931094 | 153.3733 | 142.2133 | 11.16 |

## Recommended Phased Strategy Drafts

```json
[
  {
    "version": 1,
    "id": "searched_top1-phased_d0fabfd2",
    "name": "Top1 Phased Strategy",
    "generationMethod": "top1-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_d0fabfd2_0_30",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 58,
            "combatBias": 58,
            "farmBias": 49,
            "treasureBias": 26,
            "bossBias": 59,
            "riskTolerance": 23,
            "loopBias": 40,
            "overKitePenalty": 90
          },
          "upgrade": {
            "evolutionPriority": 21,
            "mainWeaponPriority": 46,
            "newWeaponPriority": 85,
            "passivePriority": 68,
            "survivalPriority": 68,
            "cooldownPriority": 10,
            "damagePriority": 54,
            "growthPriority": 26
          },
          "treasure": {
            "openRiskTolerance": 22,
            "evolutionChestPriority": 63,
            "relicExpectedValuePriority": 92,
            "routeDeviationTolerance": 27
          },
          "relic": {
            "rarityPriority": 5,
            "synergyPriority": 32,
            "survivalRelicPriority": 60,
            "damageRelicPriority": 76,
            "economyRelicPriority": 86
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_d0fabfd2_30_60",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 81,
            "combatBias": 98,
            "farmBias": 48,
            "treasureBias": 18,
            "bossBias": 91,
            "riskTolerance": 14,
            "loopBias": 98,
            "overKitePenalty": 30
          },
          "upgrade": {
            "evolutionPriority": 76,
            "mainWeaponPriority": 63,
            "newWeaponPriority": 90,
            "passivePriority": 65,
            "survivalPriority": 73,
            "cooldownPriority": 83,
            "damagePriority": 35,
            "growthPriority": 71
          },
          "treasure": {
            "openRiskTolerance": 80,
            "evolutionChestPriority": 66,
            "relicExpectedValuePriority": 69,
            "routeDeviationTolerance": 74
          },
          "relic": {
            "rarityPriority": 51,
            "synergyPriority": 52,
            "survivalRelicPriority": 91,
            "damageRelicPriority": 81,
            "economyRelicPriority": 13
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top5-average-phased_d821b963",
    "name": "Top5 Average Phased Strategy",
    "generationMethod": "top5-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_d821b963_0_30",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 33,
            "combatBias": 64,
            "farmBias": 66,
            "treasureBias": 60,
            "bossBias": 46,
            "riskTolerance": 47,
            "loopBias": 58,
            "overKitePenalty": 66
          },
          "upgrade": {
            "evolutionPriority": 44,
            "mainWeaponPriority": 43,
            "newWeaponPriority": 58,
            "passivePriority": 45,
            "survivalPriority": 51,
            "cooldownPriority": 55,
            "damagePriority": 74,
            "growthPriority": 40
          },
          "treasure": {
            "openRiskTolerance": 38,
            "evolutionChestPriority": 54,
            "relicExpectedValuePriority": 37,
            "routeDeviationTolerance": 41
          },
          "relic": {
            "rarityPriority": 32,
            "synergyPriority": 40,
            "survivalRelicPriority": 59,
            "damageRelicPriority": 69,
            "economyRelicPriority": 53
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_d821b963_30_60",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 59,
            "combatBias": 80,
            "farmBias": 63,
            "treasureBias": 55,
            "bossBias": 48,
            "riskTolerance": 31,
            "loopBias": 60,
            "overKitePenalty": 39
          },
          "upgrade": {
            "evolutionPriority": 62,
            "mainWeaponPriority": 67,
            "newWeaponPriority": 74,
            "passivePriority": 51,
            "survivalPriority": 74,
            "cooldownPriority": 52,
            "damagePriority": 41,
            "growthPriority": 35
          },
          "treasure": {
            "openRiskTolerance": 63,
            "evolutionChestPriority": 38,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 49,
            "synergyPriority": 49,
            "survivalRelicPriority": 66,
            "damageRelicPriority": 53,
            "economyRelicPriority": 46
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-average-phased_7b406d07",
    "name": "Top10 Average Phased Strategy",
    "generationMethod": "top10-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_7b406d07_0_30",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 28,
            "combatBias": 50,
            "farmBias": 66,
            "treasureBias": 66,
            "bossBias": 37,
            "riskTolerance": 48,
            "loopBias": 48,
            "overKitePenalty": 58
          },
          "upgrade": {
            "evolutionPriority": 48,
            "mainWeaponPriority": 52,
            "newWeaponPriority": 60,
            "passivePriority": 45,
            "survivalPriority": 55,
            "cooldownPriority": 48,
            "damagePriority": 66,
            "growthPriority": 46
          },
          "treasure": {
            "openRiskTolerance": 43,
            "evolutionChestPriority": 47,
            "relicExpectedValuePriority": 51,
            "routeDeviationTolerance": 46
          },
          "relic": {
            "rarityPriority": 41,
            "synergyPriority": 31,
            "survivalRelicPriority": 57,
            "damageRelicPriority": 61,
            "economyRelicPriority": 51
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_7b406d07_30_60",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 69,
            "combatBias": 66,
            "farmBias": 53,
            "treasureBias": 50,
            "bossBias": 52,
            "riskTolerance": 48,
            "loopBias": 61,
            "overKitePenalty": 34
          },
          "upgrade": {
            "evolutionPriority": 52,
            "mainWeaponPriority": 62,
            "newWeaponPriority": 62,
            "passivePriority": 46,
            "survivalPriority": 66,
            "cooldownPriority": 60,
            "damagePriority": 51,
            "growthPriority": 42
          },
          "treasure": {
            "openRiskTolerance": 60,
            "evolutionChestPriority": 38,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 58,
            "synergyPriority": 59,
            "survivalRelicPriority": 44,
            "damageRelicPriority": 55,
            "economyRelicPriority": 56
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-median-phased_7021ae3c",
    "name": "Top10 Median Phased Strategy",
    "generationMethod": "top10-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_7021ae3c_0_30",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 27,
            "combatBias": 58,
            "farmBias": 66,
            "treasureBias": 75,
            "bossBias": 41,
            "riskTolerance": 46,
            "loopBias": 48,
            "overKitePenalty": 61
          },
          "upgrade": {
            "evolutionPriority": 39,
            "mainWeaponPriority": 52,
            "newWeaponPriority": 69,
            "passivePriority": 48,
            "survivalPriority": 69,
            "cooldownPriority": 61,
            "damagePriority": 67,
            "growthPriority": 46
          },
          "treasure": {
            "openRiskTolerance": 36,
            "evolutionChestPriority": 49,
            "relicExpectedValuePriority": 42,
            "routeDeviationTolerance": 42
          },
          "relic": {
            "rarityPriority": 42,
            "synergyPriority": 26,
            "survivalRelicPriority": 61,
            "damageRelicPriority": 70,
            "economyRelicPriority": 53
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_7021ae3c_30_60",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 73,
            "combatBias": 64,
            "farmBias": 55,
            "treasureBias": 57,
            "bossBias": 56,
            "riskTolerance": 48,
            "loopBias": 65,
            "overKitePenalty": 33
          },
          "upgrade": {
            "evolutionPriority": 57,
            "mainWeaponPriority": 66,
            "newWeaponPriority": 70,
            "passivePriority": 43,
            "survivalPriority": 81,
            "cooldownPriority": 69,
            "damagePriority": 56,
            "growthPriority": 35
          },
          "treasure": {
            "openRiskTolerance": 73,
            "evolutionChestPriority": 36,
            "relicExpectedValuePriority": 49,
            "routeDeviationTolerance": 50
          },
          "relic": {
            "rarityPriority": 59,
            "synergyPriority": 55,
            "survivalRelicPriority": 34,
            "damageRelicPriority": 50,
            "economyRelicPriority": 56
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_topN-median-phased_98cf8c23",
    "name": "TopN Median Phased Strategy",
    "generationMethod": "topN-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_98cf8c23_0_30",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 29,
            "combatBias": 63,
            "farmBias": 65,
            "treasureBias": 64,
            "bossBias": 52,
            "riskTolerance": 42,
            "loopBias": 55,
            "overKitePenalty": 82
          },
          "upgrade": {
            "evolutionPriority": 21,
            "mainWeaponPriority": 43,
            "newWeaponPriority": 74,
            "passivePriority": 43,
            "survivalPriority": 68,
            "cooldownPriority": 78,
            "damagePriority": 72,
            "growthPriority": 31
          },
          "treasure": {
            "openRiskTolerance": 31,
            "evolutionChestPriority": 63,
            "relicExpectedValuePriority": 28,
            "routeDeviationTolerance": 27
          },
          "relic": {
            "rarityPriority": 30,
            "synergyPriority": 32,
            "survivalRelicPriority": 60,
            "damageRelicPriority": 87,
            "economyRelicPriority": 57
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_98cf8c23_30_60",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 59,
            "combatBias": 93,
            "farmBias": 63,
            "treasureBias": 57,
            "bossBias": 37,
            "riskTolerance": 14,
            "loopBias": 62,
            "overKitePenalty": 39
          },
          "upgrade": {
            "evolutionPriority": 76,
            "mainWeaponPriority": 69,
            "newWeaponPriority": 90,
            "passivePriority": 52,
            "survivalPriority": 89,
            "cooldownPriority": 66,
            "damagePriority": 35,
            "growthPriority": 32
          },
          "treasure": {
            "openRiskTolerance": 76,
            "evolutionChestPriority": 33,
            "relicExpectedValuePriority": 50,
            "routeDeviationTolerance": 51
          },
          "relic": {
            "rarityPriority": 51,
            "synergyPriority": 52,
            "survivalRelicPriority": 82,
            "damageRelicPriority": 50,
            "economyRelicPriority": 45
          }
        }
      }
    ]
  }
]
```

