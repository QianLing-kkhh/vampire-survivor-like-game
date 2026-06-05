# External Art Imports

Drop externally generated PNG assets in this directory and describe them with:

```text
public/assets/imports/manifest.json
```

The game starts normally when `manifest.json` is absent. Missing files listed in the manifest should be fixed before shipping, but runtime lookup keeps built-in fallback art available.

Use `manifest.example.json` as a template. Keep paths relative to this directory, use forward slashes, and do not use `..` path segments.

Validate local imports with:

```sh
npm.cmd run validate:external-art
```
