# core-sim

`src/core-sim` is the Phaser-free headless simulation boundary. It is used by the Node scripts for deterministic large-run testing without starting a browser.

## Commands

```sh
npm.cmd run simulate -- --preset smoke
npm.cmd run simulate:batch -- --preset balance-quick --out .tmp/headless-runs/balance-quick
npm.cmd run simulate:compare -- --current .tmp/headless-runs/validate-smoke --baseline baselines/headless/smoke --threshold smoke
npm.cmd run validate:sim
```

## Presets

- `smoke`: small deterministic matrix used by `validate:sim`.
- `strategy-quick`: built-in strategies over fixed seeds on the default stage/map.
- `balance-quick`: built-in characters, stage/map pairs, normal/hard difficulty, and a moderate seed count.
- `regression`: larger stable matrix covering built-in characters, stage/map pairs, easy/normal/hard, built-in strategies, and longer duration.

## Artifacts

Batch runs can write:

- `manifest.json`
- `run-results.jsonl`
- `run-results.csv`
- `aggregate.json`
- `aggregate.md`

Compare runs can write:

- `compare.json`
- `compare.md`

Repository baselines live under `baselines/headless/`. Refresh them intentionally by running a batch command with `--out baselines/headless/<preset>`. Normal compare commands never mutate baselines.

## Boundary

The core simulation must not import Phaser or depend on the DOM. Browser gameplay should be preserved by adapting Phaser scenes to the pure runtime boundary over time, not by maintaining a second unrelated emulator. `SimulationTrace` provides a shared checkpoint shape for comparing browser and headless state at deterministic ticks.
