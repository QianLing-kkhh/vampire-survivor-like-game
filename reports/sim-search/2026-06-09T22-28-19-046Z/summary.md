# Strategy Weight Search

## Search Config

- Preset: custom
- Candidates: 30
- Seed count: 3
- Duration seconds: 60
- Tick ms: 100
- Character/stage/map/difficulty: priest / stage_001 / prototype_field / normal
- Random seed: strategy-search-001
- Search Mode: centered
- Center Strategy: searched_top1-phased_b5d8fdd0
- Mutation Radius: 10
- Mutation Mode: uniform
- Phases: 0-30, 30-60

## Top By Phase

### 0-30

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000004_3c0f6d85 | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |
| 2 | centered_candidate_000009_38255bf5 | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |
| 3 | centered_candidate_000017_f5a39e03 | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 53.3333 | 0 | 2.6667 | 32 |
| 4 | centered_candidate_000021_94339da4 | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |
| 5 | centered_candidate_000026_ebc08ee4 | 5.3334 | 1 | 181 | 2.6667 | 0 | 2.6667 | 56.6667 | 0 | 2.6667 | 32 |

### 30-60

| Rank | Candidate | Fitness | Survival | Score | Exp | Level | Kills | Damage Dealt | Damage Taken | Pickups | Spawns |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | centered_candidate_000013_0210fb8b | 159.6534 | 1 | 382 | 14.6667 | 1 | 18 | 403.3333 | 0.6 | 14.6667 | 50 |
| 2 | centered_candidate_000010_40325819 | 158.6734 | 1 | 388.3333 | 14.6667 | 1 | 18.6667 | 429 | 1.8 | 14.6667 | 50 |
| 3 | centered_candidate_000027_35aca95c | 156.4134 | 1 | 387.3333 | 15 | 1 | 18.6667 | 425.3333 | 3.2 | 15 | 50 |
| 4 | centered_candidate_000016_1cfcdd98 | 154.9201 | 1 | 372.6667 | 11.6667 | 1 | 17.6667 | 405.3333 | 1.4 | 11.6667 | 50 |
| 5 | centered_candidate_000008_7e955cea | 154.4866 | 1 | 392.3333 | 13.3333 | 1 | 19.3333 | 433 | 3.8 | 13.3333 | 50 |

## Top Weight Distribution by Phase

### 0-30

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 18.6 | 20 | 12 | 24 |
| movement.combatBias | 24.8 | 27 | 12 | 32 |
| movement.farmBias | 82.2 | 83 | 75 | 90 |
| movement.loopBias | 59.4 | 54 | 54 | 71 |
| movement.overKitePenalty | 54.6 | 56 | 51 | 58 |
| movement.riskTolerance | 16.2 | 13 | 12 | 25 |
| movement.survivalBias | 38.2 | 36 | 35 | 45 |
| movement.treasureBias | 13.6 | 13 | 7 | 22 |
| relic.damageRelicPriority | 11.2 | 12 | 9 | 13 |
| relic.economyRelicPriority | 93.8 | 94 | 87 | 100 |
| relic.rarityPriority | 60 | 60 | 50 | 67 |
| relic.survivalRelicPriority | 4.2 | 4 | 0 | 9 |
| relic.synergyPriority | 8.6 | 7 | 4 | 15 |
| treasure.evolutionChestPriority | 61.6 | 63 | 55 | 65 |
| treasure.openRiskTolerance | 95.6 | 95 | 91 | 100 |
| treasure.relicExpectedValuePriority | 70.4 | 72 | 66 | 74 |
| treasure.routeDeviationTolerance | 93 | 93 | 86 | 100 |
| upgrade.cooldownPriority | 21.6 | 20 | 18 | 26 |
| upgrade.damagePriority | 13 | 13 | 6 | 20 |
| upgrade.evolutionPriority | 41 | 38 | 33 | 50 |
| upgrade.growthPriority | 43.6 | 43 | 38 | 51 |
| upgrade.mainWeaponPriority | 43.6 | 47 | 33 | 50 |
| upgrade.newWeaponPriority | 32.8 | 35 | 27 | 37 |
| upgrade.passivePriority | 69.4 | 70 | 61 | 76 |
| upgrade.survivalPriority | 81.4 | 84 | 72 | 89 |

### 30-60

| Weight | Avg | Median | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| movement.bossBias | 65.4 | 64 | 60 | 74 |
| movement.combatBias | 59 | 56 | 56 | 68 |
| movement.farmBias | 80 | 81 | 72 | 88 |
| movement.loopBias | 42.8 | 48 | 30 | 49 |
| movement.overKitePenalty | 69.6 | 68 | 62 | 79 |
| movement.riskTolerance | 10.2 | 13 | 3 | 18 |
| movement.survivalBias | 49.8 | 49 | 44 | 55 |
| movement.treasureBias | 87.2 | 82 | 81 | 97 |
| relic.damageRelicPriority | 39.6 | 41 | 35 | 44 |
| relic.economyRelicPriority | 34 | 32 | 31 | 43 |
| relic.rarityPriority | 8.4 | 11 | 0 | 14 |
| relic.survivalRelicPriority | 72.6 | 75 | 66 | 78 |
| relic.synergyPriority | 85.4 | 85 | 79 | 93 |
| treasure.evolutionChestPriority | 5.6 | 5 | 0 | 13 |
| treasure.openRiskTolerance | 63.6 | 64 | 57 | 74 |
| treasure.relicExpectedValuePriority | 61.6 | 59 | 54 | 70 |
| treasure.routeDeviationTolerance | 86.8 | 87 | 84 | 90 |
| upgrade.cooldownPriority | 94.8 | 95 | 89 | 100 |
| upgrade.damagePriority | 5.8 | 2 | 0 | 20 |
| upgrade.evolutionPriority | 68 | 68 | 61 | 78 |
| upgrade.growthPriority | 82.4 | 83 | 75 | 88 |
| upgrade.mainWeaponPriority | 89.4 | 88 | 86 | 94 |
| upgrade.newWeaponPriority | 38.4 | 39 | 28 | 44 |
| upgrade.passivePriority | 83.8 | 83 | 78 | 93 |
| upgrade.survivalPriority | 62.2 | 64 | 54 | 66 |

## Top Candidate Weight Tables

### centered_candidate_000004_3c0f6d85

| Weight | Value |
| --- | ---: |
| movement.bossBias | 24 |
| movement.combatBias | 32 |
| movement.farmBias | 83 |
| movement.loopBias | 64 |
| movement.overKitePenalty | 58 |
| movement.riskTolerance | 13 |
| movement.survivalBias | 45 |
| movement.treasureBias | 16 |
| upgrade.cooldownPriority | 25 |
| upgrade.damagePriority | 6 |
| upgrade.evolutionPriority | 36 |
| upgrade.growthPriority | 43 |
| upgrade.mainWeaponPriority | 47 |
| upgrade.newWeaponPriority | 35 |
| upgrade.passivePriority | 76 |
| upgrade.survivalPriority | 89 |
| treasure.evolutionChestPriority | 65 |
| treasure.openRiskTolerance | 92 |
| treasure.relicExpectedValuePriority | 72 |
| treasure.routeDeviationTolerance | 93 |
| relic.damageRelicPriority | 10 |
| relic.economyRelicPriority | 87 |
| relic.rarityPriority | 67 |
| relic.survivalRelicPriority | 0 |
| relic.synergyPriority | 15 |

### centered_candidate_000009_38255bf5

| Weight | Value |
| --- | ---: |
| movement.bossBias | 17 |
| movement.combatBias | 27 |
| movement.farmBias | 90 |
| movement.loopBias | 54 |
| movement.overKitePenalty | 56 |
| movement.riskTolerance | 25 |
| movement.survivalBias | 35 |
| movement.treasureBias | 10 |
| upgrade.cooldownPriority | 20 |
| upgrade.damagePriority | 13 |
| upgrade.evolutionPriority | 33 |
| upgrade.growthPriority | 46 |
| upgrade.mainWeaponPriority | 50 |
| upgrade.newWeaponPriority | 27 |
| upgrade.passivePriority | 70 |
| upgrade.survivalPriority | 84 |
| treasure.evolutionChestPriority | 63 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 74 |
| treasure.routeDeviationTolerance | 86 |
| relic.damageRelicPriority | 12 |
| relic.economyRelicPriority | 94 |
| relic.rarityPriority | 60 |
| relic.survivalRelicPriority | 4 |
| relic.synergyPriority | 7 |

### centered_candidate_000017_f5a39e03

| Weight | Value |
| --- | ---: |
| movement.bossBias | 20 |
| movement.combatBias | 12 |
| movement.farmBias | 79 |
| movement.loopBias | 71 |
| movement.overKitePenalty | 56 |
| movement.riskTolerance | 13 |
| movement.survivalBias | 36 |
| movement.treasureBias | 7 |
| upgrade.cooldownPriority | 26 |
| upgrade.damagePriority | 19 |
| upgrade.evolutionPriority | 38 |
| upgrade.growthPriority | 51 |
| upgrade.mainWeaponPriority | 50 |
| upgrade.newWeaponPriority | 29 |
| upgrade.passivePriority | 71 |
| upgrade.survivalPriority | 78 |
| treasure.evolutionChestPriority | 63 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 73 |
| treasure.routeDeviationTolerance | 100 |
| relic.damageRelicPriority | 13 |
| relic.economyRelicPriority | 94 |
| relic.rarityPriority | 63 |
| relic.survivalRelicPriority | 9 |
| relic.synergyPriority | 4 |

### centered_candidate_000021_94339da4

| Weight | Value |
| --- | ---: |
| movement.bossBias | 20 |
| movement.combatBias | 31 |
| movement.farmBias | 84 |
| movement.loopBias | 54 |
| movement.overKitePenalty | 52 |
| movement.riskTolerance | 12 |
| movement.survivalBias | 35 |
| movement.treasureBias | 22 |
| upgrade.cooldownPriority | 19 |
| upgrade.damagePriority | 7 |
| upgrade.evolutionPriority | 48 |
| upgrade.growthPriority | 38 |
| upgrade.mainWeaponPriority | 33 |
| upgrade.newWeaponPriority | 37 |
| upgrade.passivePriority | 61 |
| upgrade.survivalPriority | 72 |
| treasure.evolutionChestPriority | 62 |
| treasure.openRiskTolerance | 91 |
| treasure.relicExpectedValuePriority | 66 |
| treasure.routeDeviationTolerance | 86 |
| relic.damageRelicPriority | 9 |
| relic.economyRelicPriority | 100 |
| relic.rarityPriority | 50 |
| relic.survivalRelicPriority | 0 |
| relic.synergyPriority | 5 |

### centered_candidate_000026_ebc08ee4

| Weight | Value |
| --- | ---: |
| movement.bossBias | 12 |
| movement.combatBias | 22 |
| movement.farmBias | 75 |
| movement.loopBias | 54 |
| movement.overKitePenalty | 51 |
| movement.riskTolerance | 18 |
| movement.survivalBias | 40 |
| movement.treasureBias | 13 |
| upgrade.cooldownPriority | 18 |
| upgrade.damagePriority | 20 |
| upgrade.evolutionPriority | 50 |
| upgrade.growthPriority | 40 |
| upgrade.mainWeaponPriority | 38 |
| upgrade.newWeaponPriority | 36 |
| upgrade.passivePriority | 69 |
| upgrade.survivalPriority | 84 |
| treasure.evolutionChestPriority | 55 |
| treasure.openRiskTolerance | 95 |
| treasure.relicExpectedValuePriority | 67 |
| treasure.routeDeviationTolerance | 100 |
| relic.damageRelicPriority | 12 |
| relic.economyRelicPriority | 94 |
| relic.rarityPriority | 60 |
| relic.survivalRelicPriority | 8 |
| relic.synergyPriority | 12 |

### centered_candidate_000013_0210fb8b

| Weight | Value |
| --- | ---: |
| movement.bossBias | 18 |
| movement.combatBias | 20 |
| movement.farmBias | 79 |
| movement.loopBias | 64 |
| movement.overKitePenalty | 53 |
| movement.riskTolerance | 22 |
| movement.survivalBias | 43 |
| movement.treasureBias | 21 |
| upgrade.cooldownPriority | 31 |
| upgrade.damagePriority | 8 |
| upgrade.evolutionPriority | 39 |
| upgrade.growthPriority | 49 |
| upgrade.mainWeaponPriority | 39 |
| upgrade.newWeaponPriority | 30 |
| upgrade.passivePriority | 72 |
| upgrade.survivalPriority | 75 |
| treasure.evolutionChestPriority | 50 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 75 |
| treasure.routeDeviationTolerance | 100 |
| relic.damageRelicPriority | 16 |
| relic.economyRelicPriority | 100 |
| relic.rarityPriority | 50 |
| relic.survivalRelicPriority | 5 |
| relic.synergyPriority | 16 |

### centered_candidate_000010_40325819

| Weight | Value |
| --- | ---: |
| movement.bossBias | 7 |
| movement.combatBias | 27 |
| movement.farmBias | 78 |
| movement.loopBias | 65 |
| movement.overKitePenalty | 50 |
| movement.riskTolerance | 10 |
| movement.survivalBias | 43 |
| movement.treasureBias | 11 |
| upgrade.cooldownPriority | 17 |
| upgrade.damagePriority | 3 |
| upgrade.evolutionPriority | 35 |
| upgrade.growthPriority | 33 |
| upgrade.mainWeaponPriority | 37 |
| upgrade.newWeaponPriority | 35 |
| upgrade.passivePriority | 79 |
| upgrade.survivalPriority | 89 |
| treasure.evolutionChestPriority | 57 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 63 |
| treasure.routeDeviationTolerance | 88 |
| relic.damageRelicPriority | 7 |
| relic.economyRelicPriority | 94 |
| relic.rarityPriority | 64 |
| relic.survivalRelicPriority | 4 |
| relic.synergyPriority | 5 |

### centered_candidate_000027_35aca95c

| Weight | Value |
| --- | ---: |
| movement.bossBias | 18 |
| movement.combatBias | 32 |
| movement.farmBias | 74 |
| movement.loopBias | 66 |
| movement.overKitePenalty | 55 |
| movement.riskTolerance | 21 |
| movement.survivalBias | 42 |
| movement.treasureBias | 19 |
| upgrade.cooldownPriority | 20 |
| upgrade.damagePriority | 10 |
| upgrade.evolutionPriority | 47 |
| upgrade.growthPriority | 36 |
| upgrade.mainWeaponPriority | 42 |
| upgrade.newWeaponPriority | 42 |
| upgrade.passivePriority | 68 |
| upgrade.survivalPriority | 81 |
| treasure.evolutionChestPriority | 63 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 76 |
| treasure.routeDeviationTolerance | 87 |
| relic.damageRelicPriority | 10 |
| relic.economyRelicPriority | 96 |
| relic.rarityPriority | 69 |
| relic.survivalRelicPriority | 0 |
| relic.synergyPriority | 20 |

### centered_candidate_000016_1cfcdd98

| Weight | Value |
| --- | ---: |
| movement.bossBias | 12 |
| movement.combatBias | 20 |
| movement.farmBias | 89 |
| movement.loopBias | 70 |
| movement.overKitePenalty | 51 |
| movement.riskTolerance | 20 |
| movement.survivalBias | 41 |
| movement.treasureBias | 18 |
| upgrade.cooldownPriority | 27 |
| upgrade.damagePriority | 8 |
| upgrade.evolutionPriority | 36 |
| upgrade.growthPriority | 50 |
| upgrade.mainWeaponPriority | 36 |
| upgrade.newWeaponPriority | 37 |
| upgrade.passivePriority | 62 |
| upgrade.survivalPriority | 88 |
| treasure.evolutionChestPriority | 53 |
| treasure.openRiskTolerance | 92 |
| treasure.relicExpectedValuePriority | 72 |
| treasure.routeDeviationTolerance | 100 |
| relic.damageRelicPriority | 21 |
| relic.economyRelicPriority | 91 |
| relic.rarityPriority | 63 |
| relic.survivalRelicPriority | 0 |
| relic.synergyPriority | 9 |

### centered_candidate_000008_7e955cea

| Weight | Value |
| --- | ---: |
| movement.bossBias | 7 |
| movement.combatBias | 32 |
| movement.farmBias | 77 |
| movement.loopBias | 56 |
| movement.overKitePenalty | 58 |
| movement.riskTolerance | 25 |
| movement.survivalBias | 29 |
| movement.treasureBias | 21 |
| upgrade.cooldownPriority | 23 |
| upgrade.damagePriority | 9 |
| upgrade.evolutionPriority | 33 |
| upgrade.growthPriority | 39 |
| upgrade.mainWeaponPriority | 44 |
| upgrade.newWeaponPriority | 38 |
| upgrade.passivePriority | 79 |
| upgrade.survivalPriority | 92 |
| treasure.evolutionChestPriority | 64 |
| treasure.openRiskTolerance | 100 |
| treasure.relicExpectedValuePriority | 65 |
| treasure.routeDeviationTolerance | 94 |
| relic.damageRelicPriority | 15 |
| relic.economyRelicPriority | 100 |
| relic.rarityPriority | 61 |
| relic.survivalRelicPriority | 5 |
| relic.synergyPriority | 19 |

## Phased Strategy Evaluation

- Best strategy: searched_topN-median-phased_509648ee
- Evaluated strategies: 5
- Best Improvement Over Center: 6.4733
- Best Improvement Over Baseline: 5.8733

| Rank | Method | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | topN-median-phased | 5.8733 | 2.9367 | 2 / 2 | yes |
| 2 | top10-median-phased | 0.5466 | 0.2733 | 1 / 2 | yes |
| 3 | top5-average-phased | -1.5933 | -0.7966 | 1 / 2 | no |
| 4 | top1-phased | -8.44 | -4.22 | 1 / 2 | no |
| 5 | top10-average-phased | -13.34 | -6.67 | 1 / 2 | no |

## Balanced Default Comparison

| Phase | Best Candidate | Best Fitness | Balanced Fitness | Delta |
| --- | --- | ---: | ---: | ---: |
| 0-30 | centered_candidate_000004_3c0f6d85 | 5.3334 | 3.8667 | 1.4667 |
| 30-60 | centered_candidate_000013_0210fb8b | 159.6534 | 151.9467 | 7.7067 |

## Recommended Phased Strategy Drafts

```json
[
  {
    "version": 1,
    "id": "searched_top1-phased_d64199cd",
    "name": "Top1 Phased Strategy",
    "generationMethod": "top1-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "id": "searched_top1-phased_d64199cd_0_30",
          "movement": {
            "bossBias": 24,
            "combatBias": 32,
            "farmBias": 83,
            "loopBias": 64,
            "overKitePenalty": 58,
            "riskTolerance": 13,
            "survivalBias": 45,
            "treasureBias": 16
          },
          "name": "Top1 Phased Strategy",
          "relic": {
            "damageRelicPriority": 10,
            "economyRelicPriority": 87,
            "rarityPriority": 67,
            "survivalRelicPriority": 0,
            "synergyPriority": 15
          },
          "treasure": {
            "evolutionChestPriority": 65,
            "openRiskTolerance": 92,
            "relicExpectedValuePriority": 72,
            "routeDeviationTolerance": 93
          },
          "upgrade": {
            "cooldownPriority": 25,
            "damagePriority": 6,
            "evolutionPriority": 36,
            "growthPriority": 43,
            "mainWeaponPriority": 47,
            "newWeaponPriority": 35,
            "passivePriority": 76,
            "survivalPriority": 89
          },
          "version": 1
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "id": "searched_top1-phased_d64199cd_30_60",
          "movement": {
            "bossBias": 74,
            "combatBias": 56,
            "farmBias": 72,
            "loopBias": 48,
            "overKitePenalty": 66,
            "riskTolerance": 3,
            "survivalBias": 52,
            "treasureBias": 81
          },
          "name": "Top1 Phased Strategy",
          "relic": {
            "damageRelicPriority": 41,
            "economyRelicPriority": 33,
            "rarityPriority": 3,
            "survivalRelicPriority": 77,
            "synergyPriority": 91
          },
          "treasure": {
            "evolutionChestPriority": 13,
            "openRiskTolerance": 74,
            "relicExpectedValuePriority": 54,
            "routeDeviationTolerance": 84
          },
          "upgrade": {
            "cooldownPriority": 89,
            "damagePriority": 6,
            "evolutionPriority": 68,
            "growthPriority": 85,
            "mainWeaponPriority": 91,
            "newWeaponPriority": 44,
            "passivePriority": 78,
            "survivalPriority": 64
          },
          "version": 1
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top5-average-phased_4da20854",
    "name": "Top5 Average Phased Strategy",
    "generationMethod": "top5-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "id": "searched_top5-average-phased_4da20854_0_30",
          "movement": {
            "bossBias": 19,
            "combatBias": 25,
            "farmBias": 82,
            "loopBias": 59,
            "overKitePenalty": 55,
            "riskTolerance": 16,
            "survivalBias": 38,
            "treasureBias": 14
          },
          "name": "Top5 Average Phased Strategy",
          "relic": {
            "damageRelicPriority": 11,
            "economyRelicPriority": 94,
            "rarityPriority": 60,
            "survivalRelicPriority": 4,
            "synergyPriority": 9
          },
          "treasure": {
            "evolutionChestPriority": 62,
            "openRiskTolerance": 96,
            "relicExpectedValuePriority": 70,
            "routeDeviationTolerance": 93
          },
          "upgrade": {
            "cooldownPriority": 22,
            "damagePriority": 13,
            "evolutionPriority": 41,
            "growthPriority": 44,
            "mainWeaponPriority": 44,
            "newWeaponPriority": 33,
            "passivePriority": 69,
            "survivalPriority": 81
          },
          "version": 1
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "id": "searched_top5-average-phased_4da20854_30_60",
          "movement": {
            "bossBias": 65,
            "combatBias": 59,
            "farmBias": 80,
            "loopBias": 43,
            "overKitePenalty": 70,
            "riskTolerance": 10,
            "survivalBias": 50,
            "treasureBias": 87
          },
          "name": "Top5 Average Phased Strategy",
          "relic": {
            "damageRelicPriority": 40,
            "economyRelicPriority": 34,
            "rarityPriority": 8,
            "survivalRelicPriority": 73,
            "synergyPriority": 85
          },
          "treasure": {
            "evolutionChestPriority": 6,
            "openRiskTolerance": 64,
            "relicExpectedValuePriority": 62,
            "routeDeviationTolerance": 87
          },
          "upgrade": {
            "cooldownPriority": 95,
            "damagePriority": 6,
            "evolutionPriority": 68,
            "growthPriority": 82,
            "mainWeaponPriority": 89,
            "newWeaponPriority": 38,
            "passivePriority": 84,
            "survivalPriority": 62
          },
          "version": 1
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-average-phased_260a733b",
    "name": "Top10 Average Phased Strategy",
    "generationMethod": "top10-average-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "id": "searched_top10-average-phased_260a733b_0_30",
          "movement": {
            "bossBias": 19,
            "combatBias": 24,
            "farmBias": 80,
            "loopBias": 59,
            "overKitePenalty": 56,
            "riskTolerance": 17,
            "survivalBias": 40,
            "treasureBias": 15
          },
          "name": "Top10 Average Phased Strategy",
          "relic": {
            "damageRelicPriority": 12,
            "economyRelicPriority": 95,
            "rarityPriority": 59,
            "survivalRelicPriority": 3,
            "synergyPriority": 11
          },
          "treasure": {
            "evolutionChestPriority": 59,
            "openRiskTolerance": 97,
            "relicExpectedValuePriority": 69,
            "routeDeviationTolerance": 94
          },
          "upgrade": {
            "cooldownPriority": 24,
            "damagePriority": 11,
            "evolutionPriority": 41,
            "growthPriority": 41,
            "mainWeaponPriority": 43,
            "newWeaponPriority": 34,
            "passivePriority": 68,
            "survivalPriority": 78
          },
          "version": 1
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "id": "searched_top10-average-phased_260a733b_30_60",
          "movement": {
            "bossBias": 65,
            "combatBias": 56,
            "farmBias": 79,
            "loopBias": 42,
            "overKitePenalty": 70,
            "riskTolerance": 8,
            "survivalBias": 49,
            "treasureBias": 89
          },
          "name": "Top10 Average Phased Strategy",
          "relic": {
            "damageRelicPriority": 42,
            "economyRelicPriority": 36,
            "rarityPriority": 5,
            "survivalRelicPriority": 73,
            "synergyPriority": 86
          },
          "treasure": {
            "evolutionChestPriority": 5,
            "openRiskTolerance": 65,
            "relicExpectedValuePriority": 63,
            "routeDeviationTolerance": 91
          },
          "upgrade": {
            "cooldownPriority": 96,
            "damagePriority": 7,
            "evolutionPriority": 68,
            "growthPriority": 82,
            "mainWeaponPriority": 93,
            "newWeaponPriority": 38,
            "passivePriority": 87,
            "survivalPriority": 61
          },
          "version": 1
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_top10-median-phased_43b192a2",
    "name": "Top10 Median Phased Strategy",
    "generationMethod": "top10-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "id": "searched_top10-median-phased_43b192a2_0_30",
          "movement": {
            "bossBias": 19,
            "combatBias": 24,
            "farmBias": 79,
            "loopBias": 58,
            "overKitePenalty": 56,
            "riskTolerance": 16,
            "survivalBias": 39,
            "treasureBias": 14
          },
          "name": "Top10 Median Phased Strategy",
          "relic": {
            "damageRelicPriority": 12,
            "economyRelicPriority": 94,
            "rarityPriority": 60,
            "survivalRelicPriority": 3,
            "synergyPriority": 10
          },
          "treasure": {
            "evolutionChestPriority": 62,
            "openRiskTolerance": 98,
            "relicExpectedValuePriority": 71,
            "routeDeviationTolerance": 94
          },
          "upgrade": {
            "cooldownPriority": 23,
            "damagePriority": 10,
            "evolutionPriority": 39,
            "growthPriority": 39,
            "mainWeaponPriority": 44,
            "newWeaponPriority": 36,
            "passivePriority": 69,
            "survivalPriority": 77
          },
          "version": 1
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "id": "searched_top10-median-phased_43b192a2_30_60",
          "movement": {
            "bossBias": 64,
            "combatBias": 56,
            "farmBias": 81,
            "loopBias": 46,
            "overKitePenalty": 69,
            "riskTolerance": 8,
            "survivalBias": 49,
            "treasureBias": 90
          },
          "name": "Top10 Median Phased Strategy",
          "relic": {
            "damageRelicPriority": 42,
            "economyRelicPriority": 34,
            "rarityPriority": 2,
            "survivalRelicPriority": 75,
            "synergyPriority": 87
          },
          "treasure": {
            "evolutionChestPriority": 5,
            "openRiskTolerance": 65,
            "relicExpectedValuePriority": 64,
            "routeDeviationTolerance": 90
          },
          "upgrade": {
            "cooldownPriority": 98,
            "damagePriority": 3,
            "evolutionPriority": 69,
            "growthPriority": 82,
            "mainWeaponPriority": 94,
            "newWeaponPriority": 38,
            "passivePriority": 85,
            "survivalPriority": 63
          },
          "version": 1
        }
      }
    ]
  },
  {
    "version": 1,
    "id": "searched_topN-median-phased_509648ee",
    "name": "TopN Median Phased Strategy",
    "generationMethod": "topN-median-phased",
    "phases": [
      {
        "startSeconds": 0,
        "endSeconds": 30,
        "profile": {
          "id": "searched_topN-median-phased_509648ee_0_30",
          "movement": {
            "bossBias": 20,
            "combatBias": 27,
            "farmBias": 83,
            "loopBias": 54,
            "overKitePenalty": 56,
            "riskTolerance": 13,
            "survivalBias": 36,
            "treasureBias": 13
          },
          "name": "TopN Median Phased Strategy",
          "relic": {
            "damageRelicPriority": 12,
            "economyRelicPriority": 94,
            "rarityPriority": 60,
            "survivalRelicPriority": 4,
            "synergyPriority": 7
          },
          "treasure": {
            "evolutionChestPriority": 63,
            "openRiskTolerance": 95,
            "relicExpectedValuePriority": 72,
            "routeDeviationTolerance": 93
          },
          "upgrade": {
            "cooldownPriority": 20,
            "damagePriority": 13,
            "evolutionPriority": 38,
            "growthPriority": 43,
            "mainWeaponPriority": 47,
            "newWeaponPriority": 35,
            "passivePriority": 70,
            "survivalPriority": 84
          },
          "version": 1
        }
      },
      {
        "startSeconds": 30,
        "endSeconds": 60,
        "profile": {
          "id": "searched_topN-median-phased_509648ee_30_60",
          "movement": {
            "bossBias": 64,
            "combatBias": 56,
            "farmBias": 81,
            "loopBias": 48,
            "overKitePenalty": 68,
            "riskTolerance": 13,
            "survivalBias": 49,
            "treasureBias": 82
          },
          "name": "TopN Median Phased Strategy",
          "relic": {
            "damageRelicPriority": 41,
            "economyRelicPriority": 32,
            "rarityPriority": 11,
            "survivalRelicPriority": 75,
            "synergyPriority": 85
          },
          "treasure": {
            "evolutionChestPriority": 5,
            "openRiskTolerance": 64,
            "relicExpectedValuePriority": 59,
            "routeDeviationTolerance": 87
          },
          "upgrade": {
            "cooldownPriority": 95,
            "damagePriority": 2,
            "evolutionPriority": 68,
            "growthPriority": 83,
            "mainWeaponPriority": 88,
            "newWeaponPriority": 39,
            "passivePriority": 83,
            "survivalPriority": 64
          },
          "version": 1
        }
      }
    ]
  }
]
```

