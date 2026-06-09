# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 40
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001-round-2
- Search Mode: centered
- Center Strategy: searched_top10-average-phased_7b406d07
- Mutation Radius: 12
- Mutation Mode: uniform
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000002_980cc24b | 2.2666 | 1 | 162.6667 | 1 | 0 | 1.3333 | 33.3333 | 0 | 1 | 32 |
| 2 | centered_candidate_000004_ef747119 | 2.2666 | 1 | 162.6667 | 1 | 0 | 1.3333 | 30 | 0 | 1 | 32 |
| 3 | centered_candidate_000027_ed20b9f5 | 2.2666 | 1 | 162.6667 | 1 | 0 | 1.3333 | 30 | 0 | 1 | 32 |
| 4 | centered_candidate_000030_65761f26 | 2.2666 | 1 | 162.6667 | 1 | 0 | 1.3333 | 30 | 0 | 1 | 32 |
| 5 | centered_candidate_000012_3511e82b | 2 | 1 | 158.6667 | 1 | 0 | 1 | 23.3333 | 0 | 1 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000004_ef747119 | 150.44 | 1 | 372.6667 | 11 | 1 | 18 | 414 | 3.8 | 11 | 50 |
| 2 | centered_candidate_000003_710df30f | 149.6133 | 1 | 397 | 14 | 1 | 20 | 446.6667 | 7.4 | 14 | 50 |
| 3 | centered_candidate_000010_af384b9f | 148.9001 | 1 | 368.6667 | 11.6667 | 1 | 17.6667 | 428.3333 | 5 | 11.6667 | 50 |
| 4 | centered_candidate_000020_5f99bc6d | 147.5866 | 1 | 360.3333 | 11.3333 | 1 | 17 | 394.6667 | 4.8 | 11.3333 | 50 |
| 5 | centered_candidate_000012_3511e82b | 146.82 | 1 | 360 | 12.3333 | 1 | 17 | 414.3333 | 6 | 12.3333 | 50 |

## Top Weight Distribution by Phase

### 0-30

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 38 | 37 | 28 | 49 |
| movement.combatBias | 49.2 | 55 | 39 | 56 |
| movement.farmBias | 65 | 65 | 55 | 78 |
| movement.loopBias | 58 | 58 | 55 | 60 |
| movement.overKitePenalty | 52.2 | 51 | 47 | 58 |
| movement.riskTolerance | 41.4 | 38 | 37 | 50 |
| movement.survivalBias | 27 | 28 | 19 | 36 |
| movement.treasureBias | 71.6 | 73 | 64 | 78 |
| relic.damageRelicPriority | 65.8 | 67 | 54 | 73 |
| relic.economyRelicPriority | 55 | 55 | 49 | 62 |
| relic.rarityPriority | 42.4 | 42 | 31 | 51 |
| relic.survivalRelicPriority | 60.8 | 65 | 47 | 67 |
| relic.synergyPriority | 33.8 | 38 | 24 | 41 |
| treasure.evolutionChestPriority | 47.6 | 48 | 36 | 58 |
| treasure.openRiskTolerance | 45.2 | 50 | 34 | 54 |
| treasure.relicExpectedValuePriority | 49.8 | 47 | 43 | 58 |
| treasure.routeDeviationTolerance | 43 | 40 | 37 | 55 |
| upgrade.cooldownPriority | 50 | 53 | 41 | 57 |
| upgrade.damagePriority | 63.6 | 62 | 59 | 71 |
| upgrade.evolutionPriority | 45.2 | 45 | 37 | 56 |
| upgrade.growthPriority | 47 | 47 | 38 | 55 |
| upgrade.mainWeaponPriority | 49.4 | 44 | 42 | 60 |
| upgrade.newWeaponPriority | 56.4 | 53 | 48 | 71 |
| upgrade.passivePriority | 43.6 | 42 | 36 | 55 |
| upgrade.survivalPriority | 48.6 | 48 | 44 | 53 |

### 30-60

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 49.6 | 50 | 42 | 58 |
| movement.combatBias | 70.8 | 69 | 66 | 76 |
| movement.farmBias | 53 | 54 | 46 | 62 |
| movement.loopBias | 60 | 58 | 50 | 73 |
| movement.overKitePenalty | 29.4 | 30 | 22 | 39 |
| movement.riskTolerance | 47.2 | 53 | 36 | 54 |
| movement.survivalBias | 67.6 | 69 | 58 | 79 |
| movement.treasureBias | 48 | 46 | 42 | 54 |
| relic.damageRelicPriority | 52 | 52 | 46 | 61 |
| relic.economyRelicPriority | 51.6 | 47 | 44 | 65 |
| relic.rarityPriority | 57.8 | 58 | 49 | 64 |
| relic.survivalRelicPriority | 42.4 | 42 | 35 | 54 |
| relic.synergyPriority | 58.8 | 57 | 47 | 69 |
| treasure.evolutionChestPriority | 40.8 | 43 | 30 | 50 |
| treasure.openRiskTolerance | 63.4 | 65 | 53 | 68 |
| treasure.relicExpectedValuePriority | 47.8 | 48 | 37 | 57 |
| treasure.routeDeviationTolerance | 53.2 | 55 | 46 | 61 |
| upgrade.cooldownPriority | 57.2 | 54 | 50 | 72 |
| upgrade.damagePriority | 50 | 49 | 42 | 60 |
| upgrade.evolutionPriority | 48 | 45 | 43 | 57 |
| upgrade.growthPriority | 42.6 | 43 | 34 | 52 |
| upgrade.mainWeaponPriority | 56.4 | 57 | 52 | 59 |
| upgrade.newWeaponPriority | 65.2 | 66 | 58 | 69 |
| upgrade.passivePriority | 44.2 | 42 | 36 | 52 |
| upgrade.survivalPriority | 70 | 72 | 61 | 76 |

## Top Candidate Weight Tables

### centered_candidate_000002_980cc24b

| Weight | Value |
| --- | ---: |
| movement.bossBias | 41 |
| movement.combatBias | 41 |
| movement.farmBias | 56 |
| movement.loopBias | 58 |
| movement.overKitePenalty | 47 |
| movement.riskTolerance | 50 |
| movement.survivalBias | 36 |
| movement.treasureBias | 68 |
| upgrade.cooldownPriority | 57 |
| upgrade.damagePriority | 59 |
| upgrade.evolutionPriority | 48 |
| upgrade.growthPriority | 47 |
| upgrade.mainWeaponPriority | 60 |
| upgrade.newWeaponPriority | 53 |
| upgrade.passivePriority | 42 |
| upgrade.survivalPriority | 47 |
| treasure.evolutionChestPriority | 58 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 43 |
| treasure.routeDeviationTolerance | 37 |
| relic.damageRelicPriority | 66 |
| relic.economyRelicPriority | 49 |
| relic.rarityPriority | 49 |
| relic.survivalRelicPriority | 60 |
| relic.synergyPriority | 28 |

### centered_candidate_000004_ef747119

| Weight | Value |
| --- | ---: |
| movement.bossBias | 49 |
| movement.combatBias | 55 |
| movement.farmBias | 65 |
| movement.loopBias | 59 |
| movement.overKitePenalty | 55 |
| movement.riskTolerance | 38 |
| movement.survivalBias | 28 |
| movement.treasureBias | 64 |
| upgrade.cooldownPriority | 53 |
| upgrade.damagePriority | 66 |
| upgrade.evolutionPriority | 56 |
| upgrade.growthPriority | 44 |
| upgrade.mainWeaponPriority | 44 |
| upgrade.newWeaponPriority | 61 |
| upgrade.passivePriority | 44 |
| upgrade.survivalPriority | 44 |
| treasure.evolutionChestPriority | 36 |
| treasure.openRiskTolerance | 34 |
| treasure.relicExpectedValuePriority | 46 |
| treasure.routeDeviationTolerance | 37 |
| relic.damageRelicPriority | 67 |
| relic.economyRelicPriority | 55 |
| relic.rarityPriority | 51 |
| relic.survivalRelicPriority | 65 |
| relic.synergyPriority | 41 |

### centered_candidate_000027_ed20b9f5

| Weight | Value |
| --- | ---: |
| movement.bossBias | 28 |
| movement.combatBias | 56 |
| movement.farmBias | 55 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 51 |
| movement.riskTolerance | 37 |
| movement.survivalBias | 30 |
| movement.treasureBias | 73 |
| upgrade.cooldownPriority | 42 |
| upgrade.damagePriority | 71 |
| upgrade.evolutionPriority | 40 |
| upgrade.growthPriority | 38 |
| upgrade.mainWeaponPriority | 43 |
| upgrade.newWeaponPriority | 49 |
| upgrade.passivePriority | 41 |
| upgrade.survivalPriority | 53 |
| treasure.evolutionChestPriority | 54 |
| treasure.openRiskTolerance | 54 |
| treasure.relicExpectedValuePriority | 47 |
| treasure.routeDeviationTolerance | 40 |
| relic.damageRelicPriority | 69 |
| relic.economyRelicPriority | 62 |
| relic.rarityPriority | 31 |
| relic.survivalRelicPriority | 47 |
| relic.synergyPriority | 24 |

### centered_candidate_000030_65761f26

| Weight | Value |
| --- | ---: |
| movement.bossBias | 35 |
| movement.combatBias | 39 |
| movement.farmBias | 71 |
| movement.loopBias | 58 |
| movement.overKitePenalty | 50 |
| movement.riskTolerance | 37 |
| movement.survivalBias | 19 |
| movement.treasureBias | 78 |
| upgrade.cooldownPriority | 57 |
| upgrade.damagePriority | 62 |
| upgrade.evolutionPriority | 45 |
| upgrade.growthPriority | 55 |
| upgrade.mainWeaponPriority | 58 |
| upgrade.newWeaponPriority | 48 |
| upgrade.passivePriority | 55 |
| upgrade.survivalPriority | 48 |
| treasure.evolutionChestPriority | 48 |
| treasure.openRiskTolerance | 50 |
| treasure.relicExpectedValuePriority | 55 |
| treasure.routeDeviationTolerance | 46 |
| relic.damageRelicPriority | 73 |
| relic.economyRelicPriority | 53 |
| relic.rarityPriority | 39 |
| relic.survivalRelicPriority | 67 |
| relic.synergyPriority | 38 |

### centered_candidate_000012_3511e82b

| Weight | Value |
| --- | ---: |
| movement.bossBias | 37 |
| movement.combatBias | 55 |
| movement.farmBias | 78 |
| movement.loopBias | 60 |
| movement.overKitePenalty | 58 |
| movement.riskTolerance | 45 |
| movement.survivalBias | 22 |
| movement.treasureBias | 75 |
| upgrade.cooldownPriority | 41 |
| upgrade.damagePriority | 60 |
| upgrade.evolutionPriority | 37 |
| upgrade.growthPriority | 51 |
| upgrade.mainWeaponPriority | 42 |
| upgrade.newWeaponPriority | 71 |
| upgrade.passivePriority | 36 |
| upgrade.survivalPriority | 51 |
| treasure.evolutionChestPriority | 42 |
| treasure.openRiskTolerance | 36 |
| treasure.relicExpectedValuePriority | 58 |
| treasure.routeDeviationTolerance | 55 |
| relic.damageRelicPriority | 54 |
| relic.economyRelicPriority | 56 |
| relic.rarityPriority | 42 |
| relic.survivalRelicPriority | 65 |
| relic.synergyPriority | 38 |

### centered_candidate_000003_710df30f

| Weight | Value |
| --- | ---: |
| movement.bossBias | 27 |
| movement.combatBias | 57 |
| movement.farmBias | 59 |
| movement.loopBias | 52 |
| movement.overKitePenalty | 62 |
| movement.riskTolerance | 48 |
| movement.survivalBias | 20 |
| movement.treasureBias | 61 |
| upgrade.cooldownPriority | 43 |
| upgrade.damagePriority | 57 |
| upgrade.evolutionPriority | 56 |
| upgrade.growthPriority | 55 |
| upgrade.mainWeaponPriority | 51 |
| upgrade.newWeaponPriority | 70 |
| upgrade.passivePriority | 43 |
| upgrade.survivalPriority | 66 |
| treasure.evolutionChestPriority | 45 |
| treasure.openRiskTolerance | 47 |
| treasure.relicExpectedValuePriority | 51 |
| treasure.routeDeviationTolerance | 42 |
| relic.damageRelicPriority | 62 |
| relic.economyRelicPriority | 60 |
| relic.rarityPriority | 47 |
| relic.survivalRelicPriority | 64 |
| relic.synergyPriority | 26 |

### centered_candidate_000010_af384b9f

| Weight | Value |
| --- | ---: |
| movement.bossBias | 25 |
| movement.combatBias | 48 |
| movement.farmBias | 62 |
| movement.loopBias | 50 |
| movement.overKitePenalty | 48 |
| movement.riskTolerance | 49 |
| movement.survivalBias | 29 |
| movement.treasureBias | 68 |
| upgrade.cooldownPriority | 53 |
| upgrade.damagePriority | 66 |
| upgrade.evolutionPriority | 42 |
| upgrade.growthPriority | 44 |
| upgrade.mainWeaponPriority | 41 |
| upgrade.newWeaponPriority | 58 |
| upgrade.passivePriority | 35 |
| upgrade.survivalPriority | 65 |
| treasure.evolutionChestPriority | 40 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 43 |
| treasure.routeDeviationTolerance | 54 |
| relic.damageRelicPriority | 63 |
| relic.economyRelicPriority | 40 |
| relic.rarityPriority | 32 |
| relic.survivalRelicPriority | 68 |
| relic.synergyPriority | 22 |

### centered_candidate_000020_5f99bc6d

| Weight | Value |
| --- | ---: |
| movement.bossBias | 45 |
| movement.combatBias | 40 |
| movement.farmBias | 71 |
| movement.loopBias | 51 |
| movement.overKitePenalty | 51 |
| movement.riskTolerance | 57 |
| movement.survivalBias | 27 |
| movement.treasureBias | 69 |
| upgrade.cooldownPriority | 45 |
| upgrade.damagePriority | 62 |
| upgrade.evolutionPriority | 59 |
| upgrade.growthPriority | 43 |
| upgrade.mainWeaponPriority | 58 |
| upgrade.newWeaponPriority | 54 |
| upgrade.passivePriority | 43 |
| upgrade.survivalPriority | 43 |
| treasure.evolutionChestPriority | 55 |
| treasure.openRiskTolerance | 33 |
| treasure.relicExpectedValuePriority | 48 |
| treasure.routeDeviationTolerance | 53 |
| relic.damageRelicPriority | 57 |
| relic.economyRelicPriority | 58 |
| relic.rarityPriority | 35 |
| relic.survivalRelicPriority | 47 |
| relic.synergyPriority | 31 |

## Phased Strategy Evaluation

- Best strategy: searched_topN-median-phased_e96d1bf1
- Evaluated strategies: 5
- Best Improvement Over Center: -2.2868
- Best Improvement Over Baseline: -5.3135

| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | topN-median-phased | -5.3135 | -2.6568 | 1 / 2 | no |
| 2 | top10-median-phased | -5.5135 | -2.7567 | 1 / 2 | no |
| 3 | top5-average-phased | -6.2801 | -3.1401 | 1 / 2 | no |
| 4 | top10-average-phased | -8.7267 | -4.3633 | 1 / 2 | no |
| 5 | top1-phased | -12.8334 | -6.4167 | 1 / 2 | no |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | centered_candidate_000002_980cc24b | 2.2666 | 1.2 | 1.0666 |
| 30-60 | centered_candidate_000004_ef747119 | 150.44 | 154.2067 | -3.7667 |

## Recommended Phased Strategy Drafts

```json
[
  {
    "version": 1,
    "id": "searched_top1-phased_8afd1afd",
    "name": "Top1 Phased Strategy",
    "generationMethod": "top1-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_8afd1afd_0_30",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 36,
            "combatBias": 41,
            "farmBias": 56,
            "treasureBias": 68,
            "bossBias": 41,
            "riskTolerance": 50,
            "loopBias": 58,
            "overKitePenalty": 47
          },
          "upgrade": {
            "evolutionPriority": 48,
            "mainWeaponPriority": 60,
            "newWeaponPriority": 53,
            "passivePriority": 42,
            "survivalPriority": 47,
            "cooldownPriority": 57,
            "damagePriority": 59,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 52,
            "evolutionChestPriority": 58,
            "relicExpectedValuePriority": 43,
            "routeDeviationTolerance": 37
          },
          "relic": {
            "rarityPriority": 49,
            "synergyPriority": 28,
            "survivalRelicPriority": 60,
            "damageRelicPriority": 66,
            "economyRelicPriority": 49
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_8afd1afd_30_60",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 79,
            "combatBias": 76,
            "farmBias": 62,
            "treasureBias": 46,
            "bossBias": 58,
            "riskTolerance": 53,
            "loopBias": 58,
            "overKitePenalty": 39
          },
          "upgrade": {
            "evolutionPriority": 57,
            "mainWeaponPriority": 55,
            "newWeaponPriority": 69,
            "passivePriority": 42,
            "survivalPriority": 76,
            "cooldownPriority": 57,
            "damagePriority": 50,
            "growthPriority": 52
          },
          "treasure": {
            "openRiskTolerance": 68,
            "evolutionChestPriority": 43,
            "relicExpectedValuePriority": 55,
            "routeDeviationTolerance": 47
          },
          "relic": {
            "rarityPriority": 62,
            "synergyPriority": 65,
            "survivalRelicPriority": 54,
            "damageRelicPriority": 48,
            "economyRelicPriority": 55
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top5-average-phased_cefaddb3",
    "name": "Top5 Average Phased Strategy",
    "generationMethod": "top5-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_cefaddb3_0_30",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 27,
            "combatBias": 49,
            "farmBias": 65,
            "treasureBias": 72,
            "bossBias": 38,
            "riskTolerance": 41,
            "loopBias": 58,
            "overKitePenalty": 52
          },
          "upgrade": {
            "evolutionPriority": 45,
            "mainWeaponPriority": 49,
            "newWeaponPriority": 56,
            "passivePriority": 44,
            "survivalPriority": 49,
            "cooldownPriority": 50,
            "damagePriority": 64,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 45,
            "evolutionChestPriority": 48,
            "relicExpectedValuePriority": 50,
            "routeDeviationTolerance": 43
          },
          "relic": {
            "rarityPriority": 42,
            "synergyPriority": 34,
            "survivalRelicPriority": 61,
            "damageRelicPriority": 66,
            "economyRelicPriority": 55
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_cefaddb3_30_60",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 68,
            "combatBias": 71,
            "farmBias": 53,
            "treasureBias": 48,
            "bossBias": 50,
            "riskTolerance": 47,
            "loopBias": 60,
            "overKitePenalty": 29
          },
          "upgrade": {
            "evolutionPriority": 48,
            "mainWeaponPriority": 56,
            "newWeaponPriority": 65,
            "passivePriority": 44,
            "survivalPriority": 70,
            "cooldownPriority": 57,
            "damagePriority": 50,
            "growthPriority": 43
          },
          "treasure": {
            "openRiskTolerance": 63,
            "evolutionChestPriority": 41,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 53
          },
          "relic": {
            "rarityPriority": 58,
            "synergyPriority": 59,
            "survivalRelicPriority": 42,
            "damageRelicPriority": 52,
            "economyRelicPriority": 52
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-average-phased_70ec5fac",
    "name": "Top10 Average Phased Strategy",
    "generationMethod": "top10-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_70ec5fac_0_30",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 25,
            "combatBias": 49,
            "farmBias": 64,
            "treasureBias": 70,
            "bossBias": 34,
            "riskTolerance": 45,
            "loopBias": 57,
            "overKitePenalty": 55
          },
          "upgrade": {
            "evolutionPriority": 46,
            "mainWeaponPriority": 50,
            "newWeaponPriority": 59,
            "passivePriority": 43,
            "survivalPriority": 54,
            "cooldownPriority": 48,
            "damagePriority": 65,
            "growthPriority": 49
          },
          "treasure": {
            "openRiskTolerance": 45,
            "evolutionChestPriority": 47,
            "relicExpectedValuePriority": 49,
            "routeDeviationTolerance": 45
          },
          "relic": {
            "rarityPriority": 40,
            "synergyPriority": 31,
            "survivalRelicPriority": 58,
            "damageRelicPriority": 63,
            "economyRelicPriority": 52
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_70ec5fac_30_60",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 68,
            "combatBias": 69,
            "farmBias": 52,
            "treasureBias": 49,
            "bossBias": 49,
            "riskTolerance": 46,
            "loopBias": 62,
            "overKitePenalty": 33
          },
          "upgrade": {
            "evolutionPriority": 51,
            "mainWeaponPriority": 60,
            "newWeaponPriority": 65,
            "passivePriority": 45,
            "survivalPriority": 67,
            "cooldownPriority": 58,
            "damagePriority": 52,
            "growthPriority": 40
          },
          "treasure": {
            "openRiskTolerance": 60,
            "evolutionChestPriority": 41,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 53
          },
          "relic": {
            "rarityPriority": 60,
            "synergyPriority": 58,
            "survivalRelicPriority": 47,
            "damageRelicPriority": 54,
            "economyRelicPriority": 53
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-median-phased_26a13b58",
    "name": "Top10 Median Phased Strategy",
    "generationMethod": "top10-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_26a13b58_0_30",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 25,
            "combatBias": 51,
            "farmBias": 61,
            "treasureBias": 71,
            "bossBias": 35,
            "riskTolerance": 46,
            "loopBias": 58,
            "overKitePenalty": 53
          },
          "upgrade": {
            "evolutionPriority": 46,
            "mainWeaponPriority": 49,
            "newWeaponPriority": 58,
            "passivePriority": 42,
            "survivalPriority": 52,
            "cooldownPriority": 46,
            "damagePriority": 64,
            "growthPriority": 50
          },
          "treasure": {
            "openRiskTolerance": 49,
            "evolutionChestPriority": 47,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 44
          },
          "relic": {
            "rarityPriority": 41,
            "synergyPriority": 30,
            "survivalRelicPriority": 62,
            "damageRelicPriority": 64,
            "economyRelicPriority": 53
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_26a13b58_30_60",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 69,
            "combatBias": 69,
            "farmBias": 52,
            "treasureBias": 49,
            "bossBias": 49,
            "riskTolerance": 45,
            "loopBias": 63,
            "overKitePenalty": 32
          },
          "upgrade": {
            "evolutionPriority": 51,
            "mainWeaponPriority": 58,
            "newWeaponPriority": 66,
            "passivePriority": 47,
            "survivalPriority": 65,
            "cooldownPriority": 56,
            "damagePriority": 50,
            "growthPriority": 41
          },
          "treasure": {
            "openRiskTolerance": 63,
            "evolutionChestPriority": 43,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 62,
            "synergyPriority": 58,
            "survivalRelicPriority": 48,
            "damageRelicPriority": 53,
            "economyRelicPriority": 52
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_topN-median-phased_e96d1bf1",
    "name": "TopN Median Phased Strategy",
    "generationMethod": "topN-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_e96d1bf1_0_30",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 28,
            "combatBias": 55,
            "farmBias": 65,
            "treasureBias": 73,
            "bossBias": 37,
            "riskTolerance": 38,
            "loopBias": 58,
            "overKitePenalty": 51
          },
          "upgrade": {
            "evolutionPriority": 45,
            "mainWeaponPriority": 44,
            "newWeaponPriority": 53,
            "passivePriority": 42,
            "survivalPriority": 48,
            "cooldownPriority": 53,
            "damagePriority": 62,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 50,
            "evolutionChestPriority": 48,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 40
          },
          "relic": {
            "rarityPriority": 42,
            "synergyPriority": 38,
            "survivalRelicPriority": 65,
            "damageRelicPriority": 67,
            "economyRelicPriority": 55
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_e96d1bf1_30_60",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 69,
            "combatBias": 69,
            "farmBias": 54,
            "treasureBias": 46,
            "bossBias": 50,
            "riskTolerance": 53,
            "loopBias": 58,
            "overKitePenalty": 30
          },
          "upgrade": {
            "evolutionPriority": 45,
            "mainWeaponPriority": 57,
            "newWeaponPriority": 66,
            "passivePriority": 42,
            "survivalPriority": 72,
            "cooldownPriority": 54,
            "damagePriority": 49,
            "growthPriority": 43
          },
          "treasure": {
            "openRiskTolerance": 65,
            "evolutionChestPriority": 43,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 55
          },
          "relic": {
            "rarityPriority": 58,
            "synergyPriority": 57,
            "survivalRelicPriority": 42,
            "damageRelicPriority": 52,
            "economyRelicPriority": 47
          }
        }
      }
    ]
  }
]
```

