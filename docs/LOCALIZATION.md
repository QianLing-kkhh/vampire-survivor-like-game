# Localization

This project includes a small custom i18n layer. It does not use a third-party localization framework.

## Supported Locales

Current locales:

- `en-US`
- `zh-CN`
- `ja-JP`

Default locale:

- `en-US`

## Files

Locale definitions:

```text
src/i18n/Locale.ts
```

Translation service:

```text
src/i18n/I18n.ts
```

Translation JSON files:

```text
src/i18n/translations/en-US.json
src/i18n/translations/zh-CN.json
src/i18n/translations/ja-JP.json
```

## Lookup Rule

`I18n.t(key, params?)` resolves text in this order:

1. Current locale
2. `en-US`
3. The key itself

This means missing keys remain visible and debuggable.

## Dynamic Params

Simple interpolation is supported.

Example:

```ts
I18n.t('title.autoStartCountdown', { seconds: 10 })
```

Text can contain:

```text
Auto test starts in {seconds}s
```

Common params include:

- `{seconds}`
- `{time}`
- `{level}`

## Adding a Language

To add a locale:

1. Add the locale code to `SUPPORTED_LOCALES` in `Locale.ts`.
2. Add a display name to `LOCALE_DISPLAY_NAMES`.
3. Add `src/i18n/translations/<locale>.json`.
4. Import the JSON file in `I18n.ts`.
5. Add it to the `TRANSLATIONS` map.

Keep keys consistent with `en-US.json`.

## What Should Not Be Translated

Do not translate:

- CSV field names
- Internal debug keys
- Data IDs such as `knife`, `spinach`, or `endless_overdrive`
- Storage keys
- GitHub Actions or package script names
- Content pack IDs
- Save schema field names

If user-facing weapon, upgrade, passive, enemy, character, stage, or map names need localization later, add `nameKey` / `descriptionKey` fields or a dedicated display mapping instead of changing data IDs.

## Current Usage

i18n is used by:

- TitleScene
- ResultScene
- PauseMenu
- SettingsMenu
- HelpOverlay
- LevelUpPanel labels where available
- HUD fixed labels

Some gameplay data names are still displayed from data/config and may remain English until a data-localization layer is added.

## Future Work

Potential future improvements:

- Add `nameKey` and `descriptionKey` to weapons, passives, upgrades, enemies, characters, stages, and maps.
- Add locale-aware formatting for numbers and time.
- Add translation coverage tests for required UI keys.
- Add better font fallback handling for CJK text.
