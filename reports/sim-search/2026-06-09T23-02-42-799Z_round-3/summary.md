# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 40
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001-round-3
- Search Mode: centered
- Center Strategy: searched_topN-median-phased_e96d1bf1
- Mutation Radius: 7.2
- Mutation Mode: uniform
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000004_e6a62ce5 | 3.3666 | 1 | 175.3333 | 2 | 0 | 2.3333 | 46.6667 | 0.6 | 2 | 32 |
| 2 | centered_candidate_000018_cbfd2ef7 | 3.0666 | 1 | 175 | 2 | 0 | 2.3333 | 46.6667 | 0.8 | 2 | 32 |
| 3 | centered_candidate_000001_cfa9d5e6 | 2.7666 | 1 | 175 | 2 | 0 | 2.3333 | 53.3333 | 1 | 2 | 32 |
| 4 | centered_candidate_000040_24493ed9 | 2.7666 | 1 | 174.6667 | 2 | 0 | 2.3333 | 46.6667 | 1 | 2 | 32 |
| 5 | centered_candidate_000010_1905dd38 | 2.7 | 1 | 170.6667 | 1.6667 | 0 | 2 | 46.6667 | 0.6 | 1.6667 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000027_dcf32298 | 160.8933 | 1 | 390.6667 | 15.3333 | 1 | 18.6667 | 434.6667 | 1 | 15.3333 | 50 |
| 2 | centered_candidate_000003_a9b64b1a | 157.2266 | 1 | 371.3333 | 12.3333 | 1 | 17.3333 | 396 | 0.2 | 12.3333 | 50 |
| 3 | centered_candidate_000022_0f80325e | 157.1266 | 1 | 391.6667 | 14.3333 | 1 | 19 | 423.6667 | 2.6 | 14.3333 | 50 |
| 4 | centered_candidate_000013_a676e887 | 156.9733 | 1 | 375 | 12.3333 | 1 | 17.6667 | 384.6667 | 0.4 | 12.3333 | 50 |
| 5 | centered_candidate_000005_05e736e1 | 156.8133 | 1 | 394.6667 | 14 | 1 | 19.3333 | 426 | 2.8 | 14 | 50 |

## Top Weight Distribution by Phase

### 0-30

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 38.2 | 38 | 32 | 44 |
| movement.combatBias | 55.6 | 55 | 50 | 59 |
| movement.farmBias | 63 | 63 | 58 | 70 |
| movement.loopBias | 54.4 | 56 | 51 | 57 |
| movement.overKitePenalty | 52.4 | 54 | 44 | 58 |
| movement.riskTolerance | 37 | 38 | 32 | 43 |
| movement.survivalBias | 31 | 31 | 26 | 35 |
| movement.treasureBias | 72.4 | 71 | 69 | 77 |
| relic.damageRelicPriority | 66.2 | 67 | 61 | 72 |
| relic.economyRelicPriority | 54.8 | 56 | 49 | 61 |
| relic.rarityPriority | 44 | 45 | 38 | 47 |
| relic.survivalRelicPriority | 64.4 | 66 | 58 | 68 |
| relic.synergyPriority | 36.6 | 32 | 31 | 45 |
| treasure.evolutionChestPriority | 45.6 | 44 | 41 | 53 |
| treasure.openRiskTolerance | 48.2 | 49 | 45 | 51 |
| treasure.relicExpectedValuePriority | 47.6 | 48 | 41 | 52 |
| treasure.routeDeviationTolerance | 41.4 | 45 | 33 | 46 |
| upgrade.cooldownPriority | 56.2 | 56 | 52 | 60 |
| upgrade.damagePriority | 62.8 | 64 | 58 | 67 |
| upgrade.evolutionPriority | 45.2 | 47 | 39 | 52 |
| upgrade.growthPriority | 47.4 | 45 | 43 | 53 |
| upgrade.mainWeaponPriority | 44.2 | 45 | 39 | 49 |
| upgrade.newWeaponPriority | 56.6 | 59 | 47 | 60 |
| upgrade.passivePriority | 41 | 41 | 36 | 46 |
| upgrade.survivalPriority | 46.4 | 46 | 41 | 52 |

### 30-60

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 50 | 49 | 46 | 54 |
| movement.combatBias | 68.6 | 68 | 64 | 73 |
| movement.farmBias | 55.8 | 59 | 48 | 61 |
| movement.loopBias | 58.2 | 57 | 52 | 64 |
| movement.overKitePenalty | 29 | 27 | 25 | 36 |
| movement.riskTolerance | 51 | 51 | 46 | 59 |
| movement.survivalBias | 69.4 | 70 | 62 | 75 |
| movement.treasureBias | 48.6 | 49 | 46 | 53 |
| relic.damageRelicPriority | 51.4 | 50 | 45 | 59 |
| relic.economyRelicPriority | 47.4 | 46 | 43 | 54 |
| relic.rarityPriority | 55.4 | 54 | 51 | 62 |
| relic.survivalRelicPriority | 41.4 | 42 | 36 | 45 |
| relic.synergyPriority | 59.4 | 59 | 57 | 62 |
| treasure.evolutionChestPriority | 42.8 | 42 | 40 | 46 |
| treasure.openRiskTolerance | 65.6 | 63 | 61 | 71 |
| treasure.relicExpectedValuePriority | 47.2 | 44 | 42 | 54 |
| treasure.routeDeviationTolerance | 54 | 54 | 49 | 62 |
| upgrade.cooldownPriority | 54.4 | 55 | 47 | 60 |
| upgrade.damagePriority | 49.4 | 49 | 44 | 54 |
| upgrade.evolutionPriority | 46.4 | 47 | 40 | 50 |
| upgrade.growthPriority | 43.2 | 42 | 36 | 50 |
| upgrade.mainWeaponPriority | 56.4 | 58 | 50 | 63 |
| upgrade.newWeaponPriority | 68.6 | 70 | 62 | 73 |
| upgrade.passivePriority | 41.8 | 43 | 36 | 48 |
| upgrade.survivalPriority | 75.6 | 77 | 72 | 78 |

## Top Candidate Weight Tables

### centered_candidate_000004_e6a62ce5

| Weight | Value |
| --- | ---: |
| movement.bossBias | 44 |
| movement.combatBias | 55 |
| movement.farmBias | 63 |
| movement.loopBias | 51 |
| movement.overKitePenalty | 54 |
| movement.riskTolerance | 38 |
| movement.survivalBias | 33 |
| movement.treasureBias | 71 |
| upgrade.cooldownPriority | 53 |
| upgrade.damagePriority | 58 |
| upgrade.evolutionPriority | 41 |
| upgrade.growthPriority | 52 |
| upgrade.mainWeaponPriority | 49 |
| upgrade.newWeaponPriority | 59 |
| upgrade.passivePriority | 36 |
| upgrade.survivalPriority | 52 |
| treasure.evolutionChestPriority | 44 |
| treasure.openRiskTolerance | 46 |
| treasure.relicExpectedValuePriority | 52 |
| treasure.routeDeviationTolerance | 37 |
| relic.damageRelicPriority | 61 |
| relic.economyRelicPriority | 61 |
| relic.rarityPriority | 45 |
| relic.survivalRelicPriority | 68 |
| relic.synergyPriority | 32 |

### centered_candidate_000018_cbfd2ef7

| Weight | Value |
| --- | ---: |
| movement.bossBias | 37 |
| movement.combatBias | 59 |
| movement.farmBias | 58 |
| movement.loopBias | 56 |
| movement.overKitePenalty | 52 |
| movement.riskTolerance | 43 |
| movement.survivalBias | 30 |
| movement.treasureBias | 77 |
| upgrade.cooldownPriority | 60 |
| upgrade.damagePriority | 67 |
| upgrade.evolutionPriority | 47 |
| upgrade.growthPriority | 43 |
| upgrade.mainWeaponPriority | 48 |
| upgrade.newWeaponPriority | 47 |
| upgrade.passivePriority | 46 |
| upgrade.survivalPriority | 45 |
| treasure.evolutionChestPriority | 41 |
| treasure.openRiskTolerance | 51 |
| treasure.relicExpectedValuePriority | 48 |
| treasure.routeDeviationTolerance | 33 |
| relic.damageRelicPriority | 72 |
| relic.economyRelicPriority | 49 |
| relic.rarityPriority | 47 |
| relic.survivalRelicPriority | 66 |
| relic.synergyPriority | 45 |

### centered_candidate_000001_cfa9d5e6

| Weight | Value |
| --- | ---: |
| movement.bossBias | 32 |
| movement.combatBias | 50 |
| movement.farmBias | 64 |
| movement.loopBias | 57 |
| movement.overKitePenalty | 44 |
| movement.riskTolerance | 33 |
| movement.survivalBias | 26 |
| movement.treasureBias | 74 |
| upgrade.cooldownPriority | 56 |
| upgrade.damagePriority | 64 |
| upgrade.evolutionPriority | 39 |
| upgrade.growthPriority | 53 |
| upgrade.mainWeaponPriority | 39 |
| upgrade.newWeaponPriority | 60 |
| upgrade.passivePriority | 44 |
| upgrade.survivalPriority | 48 |
| treasure.evolutionChestPriority | 49 |
| treasure.openRiskTolerance | 45 |
| treasure.relicExpectedValuePriority | 48 |
| treasure.routeDeviationTolerance | 46 |
| relic.damageRelicPriority | 67 |
| relic.economyRelicPriority | 52 |
| relic.rarityPriority | 43 |
| relic.survivalRelicPriority | 58 |
| relic.synergyPriority | 43 |

### centered_candidate_000040_24493ed9

| Weight | Value |
| --- | ---: |
| movement.bossBias | 38 |
| movement.combatBias | 55 |
| movement.farmBias | 70 |
| movement.loopBias | 56 |
| movement.overKitePenalty | 54 |
| movement.riskTolerance | 32 |
| movement.survivalBias | 31 |
| movement.treasureBias | 71 |
| upgrade.cooldownPriority | 60 |
| upgrade.damagePriority | 58 |
| upgrade.evolutionPriority | 52 |
| upgrade.growthPriority | 44 |
| upgrade.mainWeaponPriority | 45 |
| upgrade.newWeaponPriority | 59 |
| upgrade.passivePriority | 38 |
| upgrade.survivalPriority | 46 |
| treasure.evolutionChestPriority | 41 |
| treasure.openRiskTolerance | 50 |
| treasure.relicExpectedValuePriority | 41 |
| treasure.routeDeviationTolerance | 46 |
| relic.damageRelicPriority | 63 |
| relic.economyRelicPriority | 56 |
| relic.rarityPriority | 38 |
| relic.survivalRelicPriority | 62 |
| relic.synergyPriority | 32 |

### centered_candidate_000010_1905dd38

| Weight | Value |
| --- | ---: |
| movement.bossBias | 40 |
| movement.combatBias | 59 |
| movement.farmBias | 60 |
| movement.loopBias | 52 |
| movement.overKitePenalty | 58 |
| movement.riskTolerance | 39 |
| movement.survivalBias | 35 |
| movement.treasureBias | 69 |
| upgrade.cooldownPriority | 52 |
| upgrade.damagePriority | 67 |
| upgrade.evolutionPriority | 47 |
| upgrade.growthPriority | 45 |
| upgrade.mainWeaponPriority | 40 |
| upgrade.newWeaponPriority | 58 |
| upgrade.passivePriority | 41 |
| upgrade.survivalPriority | 41 |
| treasure.evolutionChestPriority | 53 |
| treasure.openRiskTolerance | 49 |
| treasure.relicExpectedValuePriority | 49 |
| treasure.routeDeviationTolerance | 45 |
| relic.damageRelicPriority | 68 |
| relic.economyRelicPriority | 56 |
| relic.rarityPriority | 47 |
| relic.survivalRelicPriority | 68 |
| relic.synergyPriority | 31 |

### centered_candidate_000027_dcf32298

| Weight | Value |
| --- | ---: |
| movement.bossBias | 40 |
| movement.combatBias | 52 |
| movement.farmBias | 68 |
| movement.loopBias | 62 |
| movement.overKitePenalty | 49 |
| movement.riskTolerance | 42 |
| movement.survivalBias | 29 |
| movement.treasureBias | 70 |
| upgrade.cooldownPriority | 58 |
| upgrade.damagePriority | 65 |
| upgrade.evolutionPriority | 45 |
| upgrade.growthPriority | 48 |
| upgrade.mainWeaponPriority | 45 |
| upgrade.newWeaponPriority | 47 |
| upgrade.passivePriority | 49 |
| upgrade.survivalPriority | 53 |
| treasure.evolutionChestPriority | 48 |
| treasure.openRiskTolerance | 56 |
| treasure.relicExpectedValuePriority | 46 |
| treasure.routeDeviationTolerance | 42 |
| relic.damageRelicPriority | 61 |
| relic.economyRelicPriority | 52 |
| relic.rarityPriority | 37 |
| relic.survivalRelicPriority | 65 |
| relic.synergyPriority | 40 |

### centered_candidate_000003_a9b64b1a

| Weight | Value |
| --- | ---: |
| movement.bossBias | 36 |
| movement.combatBias | 49 |
| movement.farmBias | 69 |
| movement.loopBias | 51 |
| movement.overKitePenalty | 47 |
| movement.riskTolerance | 33 |
| movement.survivalBias | 26 |
| movement.treasureBias | 71 |
| upgrade.cooldownPriority | 57 |
| upgrade.damagePriority | 63 |
| upgrade.evolutionPriority | 47 |
| upgrade.growthPriority | 47 |
| upgrade.mainWeaponPriority | 47 |
| upgrade.newWeaponPriority | 53 |
| upgrade.passivePriority | 41 |
| upgrade.survivalPriority | 52 |
| treasure.evolutionChestPriority | 50 |
| treasure.openRiskTolerance | 53 |
| treasure.relicExpectedValuePriority | 54 |
| treasure.routeDeviationTolerance | 36 |
| relic.damageRelicPriority | 68 |
| relic.economyRelicPriority | 50 |
| relic.rarityPriority | 42 |
| relic.survivalRelicPriority | 66 |
| relic.synergyPriority | 42 |

### centered_candidate_000022_0f80325e

| Weight | Value |
| --- | ---: |
| movement.bossBias | 33 |
| movement.combatBias | 50 |
| movement.farmBias | 63 |
| movement.loopBias | 56 |
| movement.overKitePenalty | 56 |
| movement.riskTolerance | 43 |
| movement.survivalBias | 22 |
| movement.treasureBias | 76 |
| upgrade.cooldownPriority | 54 |
| upgrade.damagePriority | 69 |
| upgrade.evolutionPriority | 48 |
| upgrade.growthPriority | 51 |
| upgrade.mainWeaponPriority | 38 |
| upgrade.newWeaponPriority | 58 |
| upgrade.passivePriority | 38 |
| upgrade.survivalPriority | 47 |
| treasure.evolutionChestPriority | 50 |
| treasure.openRiskTolerance | 50 |
| treasure.relicExpectedValuePriority | 43 |
| treasure.routeDeviationTolerance | 37 |
| relic.damageRelicPriority | 64 |
| relic.economyRelicPriority | 49 |
| relic.rarityPriority | 45 |
| relic.survivalRelicPriority | 58 |
| relic.synergyPriority | 42 |

### centered_candidate_000013_a676e887

| Weight | Value |
| --- | ---: |
| movement.bossBias | 32 |
| movement.combatBias | 54 |
| movement.farmBias | 69 |
| movement.loopBias | 57 |
| movement.overKitePenalty | 54 |
| movement.riskTolerance | 44 |
| movement.survivalBias | 29 |
| movement.treasureBias | 66 |
| upgrade.cooldownPriority | 50 |
| upgrade.damagePriority | 60 |
| upgrade.evolutionPriority | 40 |
| upgrade.growthPriority | 49 |
| upgrade.mainWeaponPriority | 44 |
| upgrade.newWeaponPriority | 54 |
| upgrade.passivePriority | 41 |
| upgrade.survivalPriority | 48 |
| treasure.evolutionChestPriority | 47 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 48 |
| treasure.routeDeviationTolerance | 41 |
| relic.damageRelicPriority | 69 |
| relic.economyRelicPriority | 58 |
| relic.rarityPriority | 41 |
| relic.survivalRelicPriority | 66 |
| relic.synergyPriority | 35 |

### centered_candidate_000005_05e736e1

| Weight | Value |
| --- | ---: |
| movement.bossBias | 38 |
| movement.combatBias | 59 |
| movement.farmBias | 58 |
| movement.loopBias | 55 |
| movement.overKitePenalty | 53 |
| movement.riskTolerance | 31 |
| movement.survivalBias | 25 |
| movement.treasureBias | 74 |
| upgrade.cooldownPriority | 53 |
| upgrade.damagePriority | 69 |
| upgrade.evolutionPriority | 49 |
| upgrade.growthPriority | 48 |
| upgrade.mainWeaponPriority | 50 |
| upgrade.newWeaponPriority | 58 |
| upgrade.passivePriority | 44 |
| upgrade.survivalPriority | 49 |
| treasure.evolutionChestPriority | 41 |
| treasure.openRiskTolerance | 52 |
| treasure.relicExpectedValuePriority | 51 |
| treasure.routeDeviationTolerance | 45 |
| relic.damageRelicPriority | 66 |
| relic.economyRelicPriority | 55 |
| relic.rarityPriority | 45 |
| relic.survivalRelicPriority | 61 |
| relic.synergyPriority | 36 |

## Phased Strategy Evaluation

- Best strategy: searched_top1-phased_2ba90e89
- Evaluated strategies: 5
- Best Improvement Over Center: 16.0401
- Best Improvement Over Baseline: -8.38

| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | top1-phased | -8.38 | -4.19 | 0 / 2 | no |
| 2 | top5-average-phased | -10.5266 | -5.2633 | 0 / 2 | no |
| 3 | top10-average-phased | -15.6467 | -7.8233 | 0 / 2 | no |
| 4 | topN-median-phased | -20.9801 | -10.4901 | 0 / 2 | no |
| 5 | top10-median-phased | -23.8 | -11.9 | 0 / 2 | no |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | centered_candidate_000004_e6a62ce5 | 3.3666 | 3.4666 | -0.1 |
| 30-60 | centered_candidate_000027_dcf32298 | 160.8933 | 162.4867 | -1.5934 |

## Recommended Phased Strategy Drafts

```json
[
  {
    "version": 1,
    "id": "searched_top1-phased_2ba90e89",
    "name": "Top1 Phased Strategy",
    "generationMethod": "top1-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_2ba90e89_0_30",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 33,
            "combatBias": 55,
            "farmBias": 63,
            "treasureBias": 71,
            "bossBias": 44,
            "riskTolerance": 38,
            "loopBias": 51,
            "overKitePenalty": 54
          },
          "upgrade": {
            "evolutionPriority": 41,
            "mainWeaponPriority": 49,
            "newWeaponPriority": 59,
            "passivePriority": 36,
            "survivalPriority": 52,
            "cooldownPriority": 53,
            "damagePriority": 58,
            "growthPriority": 52
          },
          "treasure": {
            "openRiskTolerance": 46,
            "evolutionChestPriority": 44,
            "relicExpectedValuePriority": 52,
            "routeDeviationTolerance": 37
          },
          "relic": {
            "rarityPriority": 45,
            "synergyPriority": 32,
            "survivalRelicPriority": 68,
            "damageRelicPriority": 61,
            "economyRelicPriority": 61
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top1-phased_2ba90e89_30_60",
          "name": "Top1 Phased Strategy",
          "movement": {
            "survivalBias": 70,
            "combatBias": 67,
            "farmBias": 59,
            "treasureBias": 46,
            "bossBias": 54,
            "riskTolerance": 46,
            "loopBias": 55,
            "overKitePenalty": 27
          },
          "upgrade": {
            "evolutionPriority": 50,
            "mainWeaponPriority": 51,
            "newWeaponPriority": 62,
            "passivePriority": 43,
            "survivalPriority": 78,
            "cooldownPriority": 60,
            "damagePriority": 44,
            "growthPriority": 42
          },
          "treasure": {
            "openRiskTolerance": 63,
            "evolutionChestPriority": 40,
            "relicExpectedValuePriority": 43,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 51,
            "synergyPriority": 59,
            "survivalRelicPriority": 44,
            "damageRelicPriority": 49,
            "economyRelicPriority": 50
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top5-average-phased_19d1a6aa",
    "name": "Top5 Average Phased Strategy",
    "generationMethod": "top5-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top5-average-phased_19d1a6aa_0_30",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 31,
            "combatBias": 56,
            "farmBias": 63,
            "treasureBias": 72,
            "bossBias": 38,
            "riskTolerance": 37,
            "loopBias": 54,
            "overKitePenalty": 52
          },
          "upgrade": {
            "evolutionPriority": 45,
            "mainWeaponPriority": 44,
            "newWeaponPriority": 57,
            "passivePriority": 41,
            "survivalPriority": 46,
            "cooldownPriority": 56,
            "damagePriority": 63,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 48,
            "evolutionChestPriority": 46,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 41
          },
          "relic": {
            "rarityPriority": 44,
            "synergyPriority": 37,
            "survivalRelicPriority": 64,
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
          "id": "searched_top5-average-phased_19d1a6aa_30_60",
          "name": "Top5 Average Phased Strategy",
          "movement": {
            "survivalBias": 69,
            "combatBias": 69,
            "farmBias": 56,
            "treasureBias": 49,
            "bossBias": 50,
            "riskTolerance": 51,
            "loopBias": 58,
            "overKitePenalty": 29
          },
          "upgrade": {
            "evolutionPriority": 46,
            "mainWeaponPriority": 56,
            "newWeaponPriority": 69,
            "passivePriority": 42,
            "survivalPriority": 76,
            "cooldownPriority": 54,
            "damagePriority": 49,
            "growthPriority": 43
          },
          "treasure": {
            "openRiskTolerance": 66,
            "evolutionChestPriority": 43,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 55,
            "synergyPriority": 59,
            "survivalRelicPriority": 41,
            "damageRelicPriority": 51,
            "economyRelicPriority": 47
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-average-phased_ba12cf77",
    "name": "Top10 Average Phased Strategy",
    "generationMethod": "top10-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_ba12cf77_0_30",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 28,
            "combatBias": 54,
            "farmBias": 65,
            "treasureBias": 73,
            "bossBias": 37,
            "riskTolerance": 37,
            "loopBias": 58,
            "overKitePenalty": 50
          },
          "upgrade": {
            "evolutionPriority": 44,
            "mainWeaponPriority": 43,
            "newWeaponPriority": 55,
            "passivePriority": 41,
            "survivalPriority": 46,
            "cooldownPriority": 54,
            "damagePriority": 63,
            "growthPriority": 47
          },
          "treasure": {
            "openRiskTolerance": 50,
            "evolutionChestPriority": 47,
            "relicExpectedValuePriority": 47,
            "routeDeviationTolerance": 41
          },
          "relic": {
            "rarityPriority": 43,
            "synergyPriority": 39,
            "survivalRelicPriority": 64,
            "damageRelicPriority": 67,
            "economyRelicPriority": 54
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-average-phased_ba12cf77_30_60",
          "name": "Top10 Average Phased Strategy",
          "movement": {
            "survivalBias": 69,
            "combatBias": 69,
            "farmBias": 56,
            "treasureBias": 47,
            "bossBias": 51,
            "riskTolerance": 51,
            "loopBias": 59,
            "overKitePenalty": 30
          },
          "upgrade": {
            "evolutionPriority": 45,
            "mainWeaponPriority": 56,
            "newWeaponPriority": 68,
            "passivePriority": 43,
            "survivalPriority": 73,
            "cooldownPriority": 56,
            "damagePriority": 47,
            "growthPriority": 41
          },
          "treasure": {
            "openRiskTolerance": 64,
            "evolutionChestPriority": 44,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 55
          },
          "relic": {
            "rarityPriority": 57,
            "synergyPriority": 57,
            "survivalRelicPriority": 42,
            "damageRelicPriority": 52,
            "economyRelicPriority": 47
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-median-phased_48e5aea6",
    "name": "Top10 Median Phased Strategy",
    "generationMethod": "top10-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_48e5aea6_0_30",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 27,
            "combatBias": 55,
            "farmBias": 66,
            "treasureBias": 72,
            "bossBias": 37,
            "riskTolerance": 37,
            "loopBias": 58,
            "overKitePenalty": 51
          },
          "upgrade": {
            "evolutionPriority": 43,
            "mainWeaponPriority": 43,
            "newWeaponPriority": 54,
            "passivePriority": 41,
            "survivalPriority": 46,
            "cooldownPriority": 53,
            "damagePriority": 65,
            "growthPriority": 46
          },
          "treasure": {
            "openRiskTolerance": 51,
            "evolutionChestPriority": 47,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 43
          },
          "relic": {
            "rarityPriority": 42,
            "synergyPriority": 42,
            "survivalRelicPriority": 64,
            "damageRelicPriority": 67,
            "economyRelicPriority": 54
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_top10-median-phased_48e5aea6_30_60",
          "name": "Top10 Median Phased Strategy",
          "movement": {
            "survivalBias": 70,
            "combatBias": 70,
            "farmBias": 59,
            "treasureBias": 47,
            "bossBias": 52,
            "riskTolerance": 50,
            "loopBias": 59,
            "overKitePenalty": 31
          },
          "upgrade": {
            "evolutionPriority": 46,
            "mainWeaponPriority": 56,
            "newWeaponPriority": 69,
            "passivePriority": 44,
            "survivalPriority": 73,
            "cooldownPriority": 56,
            "damagePriority": 48,
            "growthPriority": 41
          },
          "treasure": {
            "openRiskTolerance": 64,
            "evolutionChestPriority": 45,
            "relicExpectedValuePriority": 46,
            "routeDeviationTolerance": 55
          },
          "relic": {
            "rarityPriority": 56,
            "synergyPriority": 57,
            "survivalRelicPriority": 42,
            "damageRelicPriority": 51,
            "economyRelicPriority": 48
          }
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_topN-median-phased_700ee7af",
    "name": "TopN Median Phased Strategy",
    "generationMethod": "topN-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_700ee7af_0_30",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 31,
            "combatBias": 55,
            "farmBias": 63,
            "treasureBias": 71,
            "bossBias": 38,
            "riskTolerance": 38,
            "loopBias": 56,
            "overKitePenalty": 54
          },
          "upgrade": {
            "evolutionPriority": 47,
            "mainWeaponPriority": 45,
            "newWeaponPriority": 59,
            "passivePriority": 41,
            "survivalPriority": 46,
            "cooldownPriority": 56,
            "damagePriority": 64,
            "growthPriority": 45
          },
          "treasure": {
            "openRiskTolerance": 49,
            "evolutionChestPriority": 44,
            "relicExpectedValuePriority": 48,
            "routeDeviationTolerance": 45
          },
          "relic": {
            "rarityPriority": 45,
            "synergyPriority": 32,
            "survivalRelicPriority": 66,
            "damageRelicPriority": 67,
            "economyRelicPriority": 56
          }
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "version": 1,
          "id": "searched_topN-median-phased_700ee7af_30_60",
          "name": "TopN Median Phased Strategy",
          "movement": {
            "survivalBias": 70,
            "combatBias": 68,
            "farmBias": 59,
            "treasureBias": 49,
            "bossBias": 49,
            "riskTolerance": 51,
            "loopBias": 57,
            "overKitePenalty": 27
          },
          "upgrade": {
            "evolutionPriority": 47,
            "mainWeaponPriority": 58,
            "newWeaponPriority": 70,
            "passivePriority": 43,
            "survivalPriority": 77,
            "cooldownPriority": 55,
            "damagePriority": 49,
            "growthPriority": 42
          },
          "treasure": {
            "openRiskTolerance": 63,
            "evolutionChestPriority": 42,
            "relicExpectedValuePriority": 44,
            "routeDeviationTolerance": 54
          },
          "relic": {
            "rarityPriority": 54,
            "synergyPriority": 59,
            "survivalRelicPriority": 42,
            "damageRelicPriority": 50,
            "economyRelicPriority": 46
          }
        }
      }
    ]
  }
]
```

