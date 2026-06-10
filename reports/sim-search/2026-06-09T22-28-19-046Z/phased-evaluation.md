# Phased Strategy Evaluation Suite

- Best strategy: searched_topN-median-phased_509648ee
- Seeds: 3
- Evaluated strategies: 5
- Best improvement over baseline: 5.8733
- Best improvement over center: 6.4733

## Ranking

| Rank | Method | Strategy | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | topN-median-phased | searched_topN-median-phased_509648ee | 5.8733 | 2.9367 | 2 / 2 | yes |
| 2 | top10-median-phased | searched_top10-median-phased_43b192a2 | 0.5466 | 0.2733 | 1 / 2 | yes |
| 3 | top5-average-phased | searched_top5-average-phased_4da20854 | -1.5933 | -0.7966 | 1 / 2 | no |
| 4 | top1-phased | searched_top1-phased_d64199cd | -8.44 | -4.22 | 1 / 2 | no |
| 5 | top10-average-phased | searched_top10-average-phased_260a733b | -13.34 | -6.67 | 1 / 2 | no |

## Center Strategy

- Strategy: searched_top1-phased_b5d8fdd0
- Total fitness delta vs baseline: -0.6
- Average fitness delta vs baseline: -0.3
- Beats baseline: no

## top1-phased

- Strategy: searched_top1-phased_d64199cd
- Improved phases: 1 / 2
- Total fitness delta: -8.44
- Average fitness delta: -4.22
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.3334 | 1.4667 | 1 | 1 | 5.3333 | 1 | 0.3334 | 0 | yes |
| 30-60 | 151.9467 | 142.04 | -9.9067 | 1 | 1 | 13.3334 | 1.3333 | 1.6667 | 7.2 | no |

## top5-average-phased

- Strategy: searched_top5-average-phased_4da20854
- Improved phases: 1 / 2
- Total fitness delta: -1.5933
- Average fitness delta: -0.7966
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.3334 | 1.4667 | 1 | 1 | 5.3333 | 1 | 0.3334 | 0 | yes |
| 30-60 | 151.9467 | 148.8867 | -3.06 | 1 | 1 | 9.6667 | 0.6667 | 1 | 2.8 | no |

## top10-average-phased

- Strategy: searched_top10-average-phased_260a733b
- Improved phases: 1 / 2
- Total fitness delta: -13.34
- Average fitness delta: -6.67
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.3334 | 1.4667 | 1 | 1 | 5.3333 | 1 | 0.3334 | 0 | yes |
| 30-60 | 151.9467 | 137.14 | -14.8067 | 1 | 1 | 4 | 3 | 1 | 10.4 | no |

## top10-median-phased

- Strategy: searched_top10-median-phased_43b192a2
- Improved phases: 1 / 2
- Total fitness delta: 0.5466
- Average fitness delta: 0.2733
- Beats baseline: yes

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 4.6333 | 0.7666 | 1 | 1 | 4.6666 | 0.6666 | 0.3334 | 0.2 | yes |
| 30-60 | 151.9467 | 151.7267 | -0.22 | 1 | 1 | 11.6667 | 0.6667 | 1 | 1.2 | no |

## topN-median-phased

- Strategy: searched_topN-median-phased_509648ee
- Improved phases: 2 / 2
- Total fitness delta: 5.8733
- Average fitness delta: 2.9367
- Beats baseline: yes

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.0334 | 1.1667 | 1 | 1 | 5 | 1 | 0.3334 | 0.2 | yes |
| 30-60 | 151.9467 | 156.6533 | 4.7066 | 1 | 1 | 35.6667 | 2.3333 | 2.6667 | 0.2 | yes |
