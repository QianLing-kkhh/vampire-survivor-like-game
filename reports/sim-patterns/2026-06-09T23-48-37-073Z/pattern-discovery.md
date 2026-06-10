# Strategy Pattern Discovery

## Scope

- Input: reports/sim-search
- Source optimizations: 1
- Min confidence: 0.35
- Skipped directories: 0

## Phase Patterns

| Phase | Pattern | Confidence | Stable High | Stable Low | Unstable |
| --- | --- | ---: | --- | --- | --- |
| 0-30 | Balanced Transition Phase | 0.5 | none | movement.survivalBias | none |
| 30-60 | Balanced Transition Phase | 1 | none | none | none |

## Suggested State Machine

### Balanced Transition Phase

- State id: balanced-transition-01
- Phase ids: 0-30, 30-60
- Time window: 0-60s
- Confidence: 0.75
- Entry: elapsedSeconds >= 0; phase evidence is mixed or confidence is below threshold
- Exit: elapsedSeconds >= 60; a stronger objective signal appears
- Focus: No single stable weight cluster dominates; keep a conservative blended policy. Use live runtime signals to choose between farm, evolution, survival, and boss objectives.

| Evidence Field | Median | Avg | StdDev | Label |
| --- | ---: | ---: | ---: | --- |
| movement.survivalBias | 28 | 28 | 0 | stable-low |

## Transitions

| From | To | Condition |
| --- | --- | --- |

## Important Notes

- These rules are inferred from headless optimization outputs.
- They should be treated as design guidance for a future strategy state machine, not as final gameplay balance.
- Do not convert them into built-in presets until browser/headless behavior is aligned and validated.

## Warnings

- Pattern discovery is an interpretation layer over optimization outputs, not a formal AutoStrategyEngine preset.
