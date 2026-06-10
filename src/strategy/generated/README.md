# Generated Test Strategy

This directory is reserved for generated strategy artifacts used by automated testing.

`generated-test-strategy.json` is written by:

```powershell
npm.cmd run simulate:apply-generated-strategy -- --source reports/sim-general-search/<timestamp>/best-general-strategy.json
```

The `generated_test` strategy is used by headless automatic tests and browser developer playtest auto-test runs. It is based on `core-sim-simplified` search output and is not a built-in gameplay preset, ordinary player UI default, save format, replay format, or leaderboard format.

If the generated strategy is missing or invalid in a browser playtest auto-test run, the runtime logs a console warning and falls back to `balanced_default`.
