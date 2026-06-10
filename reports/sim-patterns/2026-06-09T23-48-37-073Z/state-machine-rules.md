# Strategy State Machine Rules

- State machine: discovered_strategy_state_machine_2026_06_09T23_48_37_073Z
- Source optimizations: 1

## Balanced Transition Phase

- State id: balanced-transition-01
- Pattern: balanced-transition
- Time window: 0-60s
- Entry conditions: elapsedSeconds >= 0; phase evidence is mixed or confidence is below threshold
- Exit conditions: elapsedSeconds >= 60; a stronger objective signal appears
- Recommended focus: No single stable weight cluster dominates; keep a conservative blended policy. Use live runtime signals to choose between farm, evolution, survival, and boss objectives.

## Transitions

| From | To | Condition |
| --- | --- | --- |
