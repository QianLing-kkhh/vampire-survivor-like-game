# Phased Strategy Evaluation Suite

- Best strategy: searched_top10-average-phased_7b406d07
- Seeds: 3
- Evaluated strategies: 5
- Best improvement over baseline: 6.2466
- Best improvement over center: n/a

## Ranking

| Rank | Method | Strategy | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | top10-average-phased | searched_top10-average-phased_7b406d07 | 6.2466 | 3.1233 | 1 / 2 | yes |
| 2 | top1-phased | searched_top1-phased_d0fabfd2 | -2.3068 | -1.1534 | 1 / 2 | no |
| 3 | top10-median-phased | searched_top10-median-phased_7021ae3c | -26.5868 | -13.2934 | 1 / 2 | no |
| 4 | topN-median-phased | searched_topN-median-phased_98cf8c23 | -37.1799 | -18.59 | 1 / 2 | no |
| 5 | top5-average-phased | searched_top5-average-phased_d821b963 | -41.0535 | -20.5267 | 1 / 2 | no |

## top1-phased

- Strategy: searched_top1-phased_d0fabfd2
- Improved phases: 1 / 2
- Total fitness delta: -2.3068
- Average fitness delta: -1.1534
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 4.5334 | 5.2 | 0.6666 | 1 | 1 | 4.6667 | 0.3333 | 0.3333 | 0 | yes |
| 30-60 | 142.2133 | 139.2399 | -2.9734 | 1 | 1 | -16 | -3 | -1 | -0.6 | no |

## top5-average-phased

- Strategy: searched_top5-average-phased_d821b963
- Improved phases: 1 / 2
- Total fitness delta: -41.0535
- Average fitness delta: -20.5267
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 4.5334 | 4.6666 | 0.1332 | 1 | 1 | -3.3333 | 0.3333 | -0.3334 | 0 | yes |
| 30-60 | 142.2133 | 101.0266 | -41.1867 | 1 | 1 | -17 | 0 | 1 | 23.8 | no |

## top10-average-phased

- Strategy: searched_top10-average-phased_7b406d07
- Improved phases: 1 / 2
- Total fitness delta: 6.2466
- Average fitness delta: 3.1233
- Beats baseline: yes

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 4.5334 | 3.9666 | -0.5668 | 1 | 1 | -4.3333 | 0 | -0.3334 | 0.2 | no |
| 30-60 | 142.2133 | 149.0267 | 6.8134 | 1 | 1 | 8.3333 | 0 | 0.3334 | -3.6 | yes |

## top10-median-phased

- Strategy: searched_top10-median-phased_7021ae3c
- Improved phases: 1 / 2
- Total fitness delta: -26.5868
- Average fitness delta: -13.2934
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 4.5334 | 4.9333 | 0.3999 | 1 | 1 | 0.6667 | 0.3333 | 0 | 0 | yes |
| 30-60 | 142.2133 | 115.2266 | -26.9867 | 1 | 1 | -8.6667 | -2.3333 | 1 | 14.4 | no |

## topN-median-phased

- Strategy: searched_topN-median-phased_98cf8c23
- Improved phases: 1 / 2
- Total fitness delta: -37.1799
- Average fitness delta: -18.59
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 4.5334 | 5.3334 | 0.8 | 1 | 1 | 1 | 0.6667 | 0 | 0 | yes |
| 30-60 | 142.2133 | 104.2334 | -37.9799 | 1 | 1 | -10.6667 | 0.3334 | 1.3334 | 22.4 | no |
