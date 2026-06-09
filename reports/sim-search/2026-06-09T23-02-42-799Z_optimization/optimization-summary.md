# Strategy Weight Optimization

- Rounds: 3
- Initial mutation radius: 12
- Mutation decay: 0.6
- Center strategy mode: best
- Carry forward top: 0
- Carry forward applied: no
- Best strategy: searched_top10-average-phased_7b406d07
- Best round: 1
- Best vs baseline delta: 6.2466
- Best avgScore: 267.5

| Round | Search Mode | Center Strategy | Mutation Radius | Best Strategy | AvgScore | Vs Baseline Delta | Improved | Output |
| ---: | --- | --- | ---: | --- | ---: | ---: | --- | --- |
| 1 | random |  |  | searched_top10-average-phased_7b406d07 | 267.5 | 6.2466 | yes | reports\sim-search\2026-06-09T23-02-42-799Z_round-1 |
| 2 | centered | searched_top10-average-phased_7b406d07 | 12 | searched_topN-median-phased_e96d1bf1 | 263.6667 | -5.3135 | no | reports\sim-search\2026-06-09T23-02-42-799Z_round-2 |
| 3 | centered | searched_topN-median-phased_e96d1bf1 | 7.2 | searched_top1-phased_2ba90e89 | 266.8333 | -8.38 | no | reports\sim-search\2026-06-09T23-02-42-799Z_round-3 |
