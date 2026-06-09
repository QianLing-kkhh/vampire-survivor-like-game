# Phased Strategy Evaluation Suite

- Best strategy: searched_top10-average-phased_37b3e1a5
- Seeds: 3
- Evaluated strategies: 5
- Best improvement over baseline: 0.9265
- Best improvement over center: n/a

## Ranking

| Rank | Method | Strategy | Total Delta | Avg Delta | Improved Phases | Beats Baseline |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | top10-average-phased | searched_top10-average-phased_37b3e1a5 | 0.9265 | 0.4632 | 1 / 2 | yes |
| 2 | top1-phased | searched_top1-phased_b5d8fdd0 | -0.6 | -0.3 | 1 / 2 | no |
| 3 | top5-average-phased | searched_top5-average-phased_048560e4 | -1.36 | -0.68 | 1 / 2 | no |
| 4 | topN-median-phased | searched_topN-median-phased_3282fd3e | -6.5935 | -3.2967 | 1 / 2 | no |
| 5 | top10-median-phased | searched_top10-median-phased_9f2e4732 | -10.2002 | -5.1001 | 1 / 2 | no |

## top1-phased

- Strategy: searched_top1-phased_b5d8fdd0
- Improved phases: 1 / 2
- Total fitness delta: -0.6
- Average fitness delta: -0.3
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.3334 | 1.4667 | 1 | 1 | 5.3333 | 1 | 0.3334 | 0 | yes |
| 30-60 | 151.9467 | 149.88 | -2.0667 | 1 | 1 | 3.3334 | 1 | 0.3333 | 2 | no |

## top5-average-phased

- Strategy: searched_top5-average-phased_048560e4
- Improved phases: 1 / 2
- Total fitness delta: -1.36
- Average fitness delta: -0.68
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 5.3334 | 1.4667 | 1 | 1 | 5.3333 | 1 | 0.3334 | 0 | yes |
| 30-60 | 151.9467 | 149.12 | -2.8267 | 1 | 1 | -3.6666 | -2.3333 | 0 | 0.2 | no |

## top10-average-phased

- Strategy: searched_top10-average-phased_37b3e1a5
- Improved phases: 1 / 2
- Total fitness delta: 0.9265
- Average fitness delta: 0.4632
- Beats baseline: yes

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 3.6 | -0.2667 | 1 | 1 | -4 | 0 | -0.3333 | 0 | no |
| 30-60 | 151.9467 | 153.1399 | 1.1932 | 1 | 1 | 28.6667 | 2.3333 | 2.3333 | 2.2 | yes |

## top10-median-phased

- Strategy: searched_top10-median-phased_9f2e4732
- Improved phases: 1 / 2
- Total fitness delta: -10.2002
- Average fitness delta: -5.1001
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 4.6666 | 0.7999 | 1 | 1 | 1 | 0.6666 | 0 | 0 | yes |
| 30-60 | 151.9467 | 140.9466 | -11.0001 | 1 | 1 | -15.3333 | -1 | -0.6667 | 5 | no |

## topN-median-phased

- Strategy: searched_topN-median-phased_3282fd3e
- Improved phases: 1 / 2
- Total fitness delta: -6.5935
- Average fitness delta: -3.2967
- Beats baseline: no

| Phase | Baseline Fitness | Phased Fitness | Delta | Baseline Survival | Phased Survival | Score Delta | Exp Delta | Kills Delta | Damage Taken Delta | Improved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0-30 | 3.8667 | 4.2666 | 0.3999 | 1 | 1 | 0.6666 | 0.3333 | 0 | 0 | yes |
| 30-60 | 151.9467 | 144.9533 | -6.9934 | 1 | 1 | -0.6666 | 0.3333 | 0.3333 | 4.2 | no |
