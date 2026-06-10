# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 30
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001
- Search Mode: random
- Center Strategy: n/a
- Mutation Radius: n/a
- Mutation Mode: n/a
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000011_1ec5245d | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |
| 2 | search_candidate_000020_05879dac | 4.9333 | 1 | 180.6667 | 2.3333 | 0 | 2.6667 | 56.6667 | 0 | 2.3333 | 32 |
| 3 | search_candidate_000029_f73a716e | 4.7334 | 1 | 180.3333 | 2.6667 | 0 | 2.6667 | 56.6667 | 0.4 | 2.6667 | 32 |
| 4 | search_candidate_000010_a0191c22 | 4.6666 | 1 | 176.6667 | 2.3333 | 0 | 2.3333 | 53.3333 | 0 | 2.3333 | 32 |
| 5 | search_candidate_000006_a85c4c4e | 4.2666 | 1 | 176 | 2 | 0 | 2.3333 | 53.3333 | 0 | 2 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | search_candidate_000010_a0191c22 | 161 | 1 | 390 | 14 | 1 | 18.6667 | 416.6667 | 0 | 14 | 50 |
| 2 | search_candidate_000008_e05c1b0e | 158.76 | 1 | 377.6667 | 14.3333 | 1 | 17.6667 | 410 | 0.8 | 14.3333 | 50 |
| 3 | search_candidate_000007_7ec2cf34 | 157.28 | 1 | 391.3333 | 14 | 1 | 19 | 412 | 2.2 | 14 | 50 |
| 4 | search_candidate_000026_3f35f4cf | 156.24 | 1 | 386.6667 | 13.3333 | 1 | 18.6667 | 410 | 2.2 | 13.3333 | 50 |
| 5 | search_candidate_000027_90b40c9d | 153.14 | 1 | 435.3333 | 13 | 1 | 23.3333 | 506.3333 | 7.4 | 13 | 50 |

## Top Weight Distribution by Phase

### 0-30

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 49.4 | 45 | 17 | 94 |
| movement.combatBias | 52 | 59 | 22 | 75 |
| movement.farmBias | 81.6 | 78 | 73 | 99 |
| movement.loopBias | 54 | 41 | 28 | 99 |
| movement.overKitePenalty | 67 | 65 | 46 | 95 |
| movement.riskTolerance | 20.4 | 16 | 8 | 36 |
| movement.survivalBias | 38.8 | 46 | 6 | 58 |
| movement.treasureBias | 63.2 | 71 | 14 | 90 |
| relic.damageRelicPriority | 41.8 | 42 | 13 | 58 |
| relic.economyRelicPriority | 30.6 | 7 | 5 | 94 |
| relic.rarityPriority | 28.8 | 10 | 2 | 66 |
| relic.survivalRelicPriority | 55.4 | 66 | 1 | 86 |
| relic.synergyPriority | 61.8 | 63 | 14 | 100 |
| treasure.evolutionChestPriority | 36.4 | 50 | 5 | 55 |
| treasure.openRiskTolerance | 70.2 | 65 | 46 | 100 |
| treasure.relicExpectedValuePriority | 62.6 | 67 | 28 | 86 |
| treasure.routeDeviationTolerance | 53.6 | 34 | 20 | 95 |
| upgrade.cooldownPriority | 62.2 | 61 | 25 | 97 |
| upgrade.damagePriority | 21.6 | 10 | 8 | 71 |
| upgrade.evolutionPriority | 66.4 | 69 | 43 | 90 |
| upgrade.growthPriority | 47.2 | 40 | 30 | 83 |
| upgrade.mainWeaponPriority | 36.2 | 27 | 0 | 96 |
| upgrade.newWeaponPriority | 43.8 | 44 | 34 | 58 |
| upgrade.passivePriority | 47.4 | 50 | 1 | 87 |
| upgrade.survivalPriority | 63 | 77 | 12 | 85 |

### 30-60

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 65.2 | 65 | 23 | 94 |
| movement.combatBias | 68.8 | 76 | 33 | 98 |
| movement.farmBias | 54.2 | 56 | 20 | 91 |
| movement.loopBias | 61.2 | 57 | 15 | 99 |
| movement.overKitePenalty | 55 | 47 | 31 | 83 |
| movement.riskTolerance | 23.8 | 25 | 8 | 38 |
| movement.survivalBias | 76.2 | 81 | 47 | 90 |
| movement.treasureBias | 40.8 | 44 | 1 | 90 |
| relic.damageRelicPriority | 35.4 | 34 | 26 | 44 |
| relic.economyRelicPriority | 38.8 | 41 | 12 | 75 |
| relic.rarityPriority | 56 | 75 | 7 | 92 |
| relic.survivalRelicPriority | 41 | 24 | 12 | 74 |
| relic.synergyPriority | 68.2 | 83 | 22 | 92 |
| treasure.evolutionChestPriority | 59.8 | 92 | 5 | 98 |
| treasure.openRiskTolerance | 60.6 | 65 | 12 | 95 |
| treasure.relicExpectedValuePriority | 41.6 | 60 | 4 | 77 |
| treasure.routeDeviationTolerance | 47.4 | 42 | 4 | 93 |
| upgrade.cooldownPriority | 42.6 | 36 | 11 | 97 |
| upgrade.damagePriority | 30.2 | 30 | 10 | 54 |
| upgrade.evolutionPriority | 38 | 42 | 17 | 69 |
| upgrade.growthPriority | 53.4 | 59 | 1 | 83 |
| upgrade.mainWeaponPriority | 69.2 | 81 | 23 | 96 |
| upgrade.newWeaponPriority | 73.4 | 86 | 35 | 99 |
| upgrade.passivePriority | 47.8 | 38 | 4 | 87 |
| upgrade.survivalPriority | 54.8 | 59 | 16 | 85 |

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

### search_candidate_000029_f73a716e

| Weight | Value |
| --- | ---: |
| movement.bossBias | 94 |
| movement.combatBias | 75 |
| movement.farmBias | 76 |
| movement.loopBias | 28 |
| movement.overKitePenalty | 46 |
| movement.riskTolerance | 36 |
| movement.survivalBias | 6 |
| movement.treasureBias | 87 |
| upgrade.cooldownPriority | 61 |
| upgrade.damagePriority | 71 |
| upgrade.evolutionPriority | 77 |
| upgrade.growthPriority | 30 |
| upgrade.mainWeaponPriority | 27 |
| upgrade.newWeaponPriority | 44 |
| upgrade.passivePriority | 50 |
| upgrade.survivalPriority | 77 |
| treasure.evolutionChestPriority | 55 |
| treasure.openRiskTolerance | 65 |
| treasure.relicExpectedValuePriority | 28 |
| treasure.routeDeviationTolerance | 34 |
| relic.damageRelicPriority | 41 |
| relic.economyRelicPriority | 6 |
| relic.rarityPriority | 66 |
| relic.survivalRelicPriority | 52 |
| relic.synergyPriority | 63 |

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

### search_candidate_000008_e05c1b0e

| Weight | Value |
| --- | ---: |
| movement.bossBias | 61 |
| movement.combatBias | 78 |
| movement.farmBias | 91 |
| movement.loopBias | 99 |
| movement.overKitePenalty | 44 |
| movement.riskTolerance | 38 |
| movement.survivalBias | 90 |
| movement.treasureBias | 1 |
| upgrade.cooldownPriority | 36 |
| upgrade.damagePriority | 54 |
| upgrade.evolutionPriority | 42 |
| upgrade.growthPriority | 76 |
| upgrade.mainWeaponPriority | 95 |
| upgrade.newWeaponPriority | 99 |
| upgrade.passivePriority | 32 |
| upgrade.survivalPriority | 39 |
| treasure.evolutionChestPriority | 95 |
| treasure.openRiskTolerance | 81 |
| treasure.relicExpectedValuePriority | 4 |
| treasure.routeDeviationTolerance | 82 |
| relic.damageRelicPriority | 31 |
| relic.economyRelicPriority | 75 |
| relic.rarityPriority | 78 |
| relic.survivalRelicPriority | 12 |
| relic.synergyPriority | 92 |

### search_candidate_000007_7ec2cf34

| Weight | Value |
| --- | ---: |
| movement.bossBias | 83 |
| movement.combatBias | 98 |
| movement.farmBias | 56 |
| movement.loopBias | 57 |
| movement.overKitePenalty | 47 |
| movement.riskTolerance | 35 |
| movement.survivalBias | 90 |
| movement.treasureBias | 62 |
| upgrade.cooldownPriority | 49 |
| upgrade.damagePriority | 27 |
| upgrade.evolutionPriority | 17 |
| upgrade.growthPriority | 48 |
| upgrade.mainWeaponPriority | 81 |
| upgrade.newWeaponPriority | 54 |
| upgrade.passivePriority | 78 |
| upgrade.survivalPriority | 85 |
| treasure.evolutionChestPriority | 98 |
| treasure.openRiskTolerance | 12 |
| treasure.relicExpectedValuePriority | 77 |
| treasure.routeDeviationTolerance | 42 |
| relic.damageRelicPriority | 34 |
| relic.economyRelicPriority | 14 |
| relic.rarityPriority | 92 |
| relic.survivalRelicPriority | 24 |
| relic.synergyPriority | 54 |

### search_candidate_000026_3f35f4cf

| Weight | Value |
| --- | ---: |
| movement.bossBias | 94 |
| movement.combatBias | 33 |
| movement.farmBias | 20 |
| movement.loopBias | 96 |
| movement.overKitePenalty | 31 |
| movement.riskTolerance | 25 |
| movement.survivalBias | 73 |
| movement.treasureBias | 7 |
| upgrade.cooldownPriority | 11 |
| upgrade.damagePriority | 30 |
| upgrade.evolutionPriority | 44 |
| upgrade.growthPriority | 59 |
| upgrade.mainWeaponPriority | 23 |
| upgrade.newWeaponPriority | 93 |
| upgrade.passivePriority | 4 |
| upgrade.survivalPriority | 75 |
| treasure.evolutionChestPriority | 92 |
| treasure.openRiskTolerance | 95 |
| treasure.relicExpectedValuePriority | 4 |
| treasure.routeDeviationTolerance | 4 |
| relic.damageRelicPriority | 44 |
| relic.economyRelicPriority | 12 |
| relic.rarityPriority | 28 |
| relic.survivalRelicPriority | 74 |
| relic.synergyPriority | 90 |

### search_candidate_000027_90b40c9d

| Weight | Value |
| --- | ---: |
| movement.bossBias | 23 |
| movement.combatBias | 76 |
| movement.farmBias | 26 |
| movement.loopBias | 15 |
| movement.overKitePenalty | 83 |
| movement.riskTolerance | 13 |
| movement.survivalBias | 81 |
| movement.treasureBias | 44 |
| upgrade.cooldownPriority | 20 |
| upgrade.damagePriority | 30 |
| upgrade.evolutionPriority | 18 |
| upgrade.growthPriority | 1 |
| upgrade.mainWeaponPriority | 51 |
| upgrade.newWeaponPriority | 86 |
| upgrade.passivePriority | 38 |
| upgrade.survivalPriority | 16 |
| treasure.evolutionChestPriority | 9 |
| treasure.openRiskTolerance | 50 |
| treasure.relicExpectedValuePriority | 60 |
| treasure.routeDeviationTolerance | 16 |
| relic.damageRelicPriority | 26 |
| relic.economyRelicPriority | 52 |
| relic.rarityPriority | 75 |
| relic.survivalRelicPriority | 23 |
| relic.synergyPriority | 22 |

## Phased Strategy Evaluation

- Best strategy: searched_top10-average-phased_37b3e1a5
- Evaluated strategies: 5
- Best Improvement Over Center: n/a
- Best Improvement Over Baseline: 0.9265

| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | top10-average-phased | 0.9265 | 0.4632 | 1 / 2 | yes |
| 2 | top1-phased | -0.6 | -0.3 | 1 / 2 | no |
| 3 | top5-average-phased | -1.36 | -0.68 | 1 / 2 | no |
| 4 | topN-median-phased | -6.5935 | -3.2967 | 1 / 2 | no |
| 5 | top10-median-phased | -10.2002 | -5.1001 | 1 / 2 | no |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | search_candidate_000011_1ec5245d | 5.3334 | 3.8667 | 1.4667 |
| 30-60 | search_candidate_000010_a0191c22 | 161 | 151.9467 | 9.0533 |

## Recommended Phased Strategy Drafts

```json
[
  {
    "version": 1,
    "id": "searched_top1-phased_b5d8fdd0",
    "name": "Top1 Phased Strategy",
    "generationMethod": "top1-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_b5d8fdd0_0_30",
          "name": "Top1 Phased Strategy",
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
          "id": "searched_top1-phased_b5d8fdd0_30_60",
          "name": "Top1 Phased Strategy",
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
  },
  {
    "version": 1,
    "id": "searched_top5-average-phased_048560e4",
    "name": "Top5 Average Phased Strategy",
    "generationMethod": "top5-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_048560e4_0_30",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 39,
            "combatBias": 52,
            "farmBias": 82,
            "treasureBias": 63,
            "bossBias": 49,
            "riskTolerance": 20,
            "loopBias": 54,
            "overKitePenalty": 67
          },
          "upgrade": {
            "evolutionPriority": 66,
            "mainWeaponPriority": 36,
            "newWeaponPriority": 44,
            "passivePriority": 47,
            "survivalPriority": 63,
            "cooldownPriority": 62,
            "damagePriority": 22,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 70,
            "evolutionChestPriority": 36,
            "relicExpectedValuePriority": 63,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 29,
            "synergyPriority": 62,
            "survivalRelicPriority": 55,
            "damageRelicPriority": 42,
            "economyRelicPriority": 31
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_048560e4_30_60",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 76,
            "combatBias": 69,
            "farmBias": 54,
            "treasureBias": 41,
            "bossBias": 65,
            "riskTolerance": 24,
            "loopBias": 61,
            "overKitePenalty": 55
          },
          "upgrade": {
            "evolutionPriority": 38,
            "mainWeaponPriority": 69,
            "newWeaponPriority": 73,
            "passivePriority": 48,
            "survivalPriority": 55,
            "cooldownPriority": 43,
            "damagePriority": 30,
            "growthPriority": 53
          },
          "treasure": {
            "openRiskTolerance": 61,
            "evolutionChestPriority": 60,
            "relicExpectedValuePriority": 42,
            "routeDeviationTolerance": 47
          },
          "relic": {
            "rarityPriority": 56,
            "synergyPriority": 68,
            "survivalRelicPriority": 41,
            "damageRelicPriority": 35,
            "economyRelicPriority": 39
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-average-phased_37b3e1a5",
    "name": "Top10 Average Phased Strategy",
    "generationMethod": "top10-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_37b3e1a5_0_30",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 41,
            "combatBias": 61,
            "farmBias": 71,
            "treasureBias": 70,
            "bossBias": 46,
            "riskTolerance": 46,
            "loopBias": 51,
            "overKitePenalty": 61
          },
          "upgrade": {
            "evolutionPriority": 43,
            "mainWeaponPriority": 52,
            "newWeaponPriority": 41,
            "passivePriority": 63,
            "survivalPriority": 64,
            "cooldownPriority": 64,
            "damagePriority": 38,
            "growthPriority": 48
          },
          "treasure": {
            "openRiskTolerance": 52,
            "evolutionChestPriority": 53,
            "relicExpectedValuePriority": 58,
            "routeDeviationTolerance": 46
          },
          "relic": {
            "rarityPriority": 44,
            "synergyPriority": 56,
            "survivalRelicPriority": 39,
            "damageRelicPriority": 47,
            "economyRelicPriority": 38
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_37b3e1a5_30_60",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 72,
            "combatBias": 58,
            "farmBias": 53,
            "treasureBias": 54,
            "bossBias": 55,
            "riskTolerance": 40,
            "loopBias": 65,
            "overKitePenalty": 59
          },
          "upgrade": {
            "evolutionPriority": 40,
            "mainWeaponPriority": 51,
            "newWeaponPriority": 57,
            "passivePriority": 41,
            "survivalPriority": 44,
            "cooldownPriority": 55,
            "damagePriority": 29,
            "growthPriority": 54
          },
          "treasure": {
            "openRiskTolerance": 54,
            "evolutionChestPriority": 48,
            "relicExpectedValuePriority": 57,
            "routeDeviationTolerance": 56
          },
          "relic": {
            "rarityPriority": 40,
            "synergyPriority": 58,
            "survivalRelicPriority": 50,
            "damageRelicPriority": 51,
            "economyRelicPriority": 42
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-median-phased_9f2e4732",
    "name": "Top10 Median Phased Strategy",
    "generationMethod": "top10-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_9f2e4732_0_30",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 42,
            "combatBias": 63,
            "farmBias": 76,
            "treasureBias": 77,
            "bossBias": 37,
            "riskTolerance": 36,
            "loopBias": 49,
            "overKitePenalty": 62
          },
          "upgrade": {
            "evolutionPriority": 41,
            "mainWeaponPriority": 54,
            "newWeaponPriority": 41,
            "passivePriority": 72,
            "survivalPriority": 80,
            "cooldownPriority": 59,
            "damagePriority": 32,
            "growthPriority": 42
          },
          "treasure": {
            "openRiskTolerance": 56,
            "evolutionChestPriority": 54,
            "relicExpectedValuePriority": 65,
            "routeDeviationTolerance": 38
          },
          "relic": {
            "rarityPriority": 51,
            "synergyPriority": 59,
            "survivalRelicPriority": 38,
            "damageRelicPriority": 50,
            "economyRelicPriority": 22
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_9f2e4732_30_60",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 77,
            "combatBias": 63,
            "farmBias": 55,
            "treasureBias": 60,
            "bossBias": 58,
            "riskTolerance": 32,
            "loopBias": 57,
            "overKitePenalty": 62
          },
          "upgrade": {
            "evolutionPriority": 35,
            "mainWeaponPriority": 45,
            "newWeaponPriority": 56,
            "passivePriority": 35,
            "survivalPriority": 37,
            "cooldownPriority": 44,
            "damagePriority": 30,
            "growthPriority": 54
          },
          "treasure": {
            "openRiskTolerance": 57,
            "evolutionChestPriority": 43,
            "relicExpectedValuePriority": 66,
            "routeDeviationTolerance": 62
          },
          "relic": {
            "rarityPriority": 35,
            "synergyPriority": 56,
            "survivalRelicPriority": 68,
            "damageRelicPriority": 50,
            "economyRelicPriority": 39
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_topN-median-phased_3282fd3e",
    "name": "TopN Median Phased Strategy",
    "generationMethod": "topN-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_3282fd3e_0_30",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 46,
            "combatBias": 59,
            "farmBias": 78,
            "treasureBias": 71,
            "bossBias": 45,
            "riskTolerance": 16,
            "loopBias": 41,
            "overKitePenalty": 65
          },
          "upgrade": {
            "evolutionPriority": 69,
            "mainWeaponPriority": 27,
            "newWeaponPriority": 44,
            "passivePriority": 50,
            "survivalPriority": 77,
            "cooldownPriority": 61,
            "damagePriority": 10,
            "growthPriority": 40
          },
          "treasure": {
            "openRiskTolerance": 65,
            "evolutionChestPriority": 50,
            "relicExpectedValuePriority": 67,
            "routeDeviationTolerance": 34
          },
          "relic": {
            "rarityPriority": 10,
            "synergyPriority": 63,
            "survivalRelicPriority": 66,
            "damageRelicPriority": 42,
            "economyRelicPriority": 7
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_3282fd3e_30_60",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 81,
            "combatBias": 76,
            "farmBias": 56,
            "treasureBias": 44,
            "bossBias": 65,
            "riskTolerance": 25,
            "loopBias": 57,
            "overKitePenalty": 47
          },
          "upgrade": {
            "evolutionPriority": 42,
            "mainWeaponPriority": 81,
            "newWeaponPriority": 86,
            "passivePriority": 38,
            "survivalPriority": 59,
            "cooldownPriority": 36,
            "damagePriority": 30,
            "growthPriority": 59
          },
          "treasure": {
            "openRiskTolerance": 65,
            "evolutionChestPriority": 92,
            "relicExpectedValuePriority": 60,
            "routeDeviationTolerance": 42
          },
          "relic": {
            "rarityPriority": 75,
            "synergyPriority": 83,
            "survivalRelicPriority": 24,
            "damageRelicPriority": 34,
            "economyRelicPriority": 41
          }
        }
      }
    ]
  }
]
```

