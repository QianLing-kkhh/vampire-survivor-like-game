# Release Checklist

This checklist is for local release and GitHub Pages deployment preparation. It does not replace GitHub Actions, and it does not deploy automatically.

## Pre-Release

1. Confirm `git status` is clean or contains only expected release changes.
2. Run TypeScript:

   ```sh
   npm.cmd exec tsc
   ```

3. Run the production build:

   ```sh
   npm.cmd run build
   ```

4. Run the full validation gate when available:

   ```sh
   npm.cmd run validate
   ```

5. Or run the combined local pre-release check:

   ```sh
   npm.cmd run pre-release
   ```

6. Confirm content and asset checks pass:

   ```sh
   npm.cmd run validate:content
   npm.cmd run validate:assets
   ```

7. Confirm CSV schema/version changes are intentional when CSV fields changed.
8. Confirm save migration behavior when `SaveData` or schema versions changed.

## Smoke Test

Before deployment, run at least one local smoke test:

1. Open TitleScene.
2. Start Game.
3. Pause and resume.
4. Open Settings and confirm settings still apply.
5. Trigger a level up and verify LevelUpPanel.
6. Reach ResultScene or use Auto Test to reach it.
7. Download current CSV or All CSV if playtest logging changed.
8. Start Auto Test and confirm it still runs.
9. Test Endless Mode when endless, Boss, reward, or scaling code changed.

## Deploy

1. Stage and commit release changes:

   ```sh
   git add -A
   git commit -m "your release message"
   ```

2. Rebase onto latest `main`:

   ```sh
   git pull --rebase origin main
   ```

3. Push to GitHub:

   ```sh
   git push origin main
   ```

4. Check GitHub Actions for the `Deploy to GitHub Pages` workflow.
5. Confirm GitHub Pages deployment completed successfully.

## Post-Release

1. Hard refresh the deployed page.
2. Confirm TitleScene loads.
3. Confirm the Playtest CSV buffer starts a new batch after TitleScene entry.
4. Run one deployed smoke test.
5. Note known warnings, such as the current Vite chunk-size warning.
6. Keep CSV samples separated by `csvSchemaVersion`, `gameVersion`, and `contentHash`.

## Expected Warnings

- Vite may warn that the main bundle is larger than 500 kB. This is currently accepted if the build exits successfully.
- `validate:content` may warn that `src/tools/ContentAudit.ts` is absent and fall back to Node JSON reference checks.
