# Technical Framework

## Engine and Tooling

Engine: Phaser 3
Language: TypeScript
Build tool: Vite
Package manager: npm
Renderer: WebGL with Canvas fallback
Physics: Phaser Arcade Physics
Target platform: Browser first
Data format: JSON

## Purpose

This document defines the technical framework for the project.
Codex must not introduce another engine or framework unless explicitly requested.

## Project Structure

Expected technical structure:

- package.json
- index.html
- tsconfig.json
- vite.config.ts
- src/main.ts
- src/game/GameConfig.ts
- src/scenes/BootScene.ts
- src/scenes/PreloadScene.ts
- src/scenes/GameScene.ts
- src/scenes/UIScene.ts
- src/scenes/ResultScene.ts

## Scene Responsibilities

### BootScene

Responsible for:
- initial boot flow
- simple setup before loading assets

Not responsible for:
- gameplay logic
- combat logic
- UI business logic

### PreloadScene

Responsible for:
- loading images
- loading audio
- loading JSON data
- preparing assets for later scenes

Not responsible for:
- spawning enemies
- calculating damage
- handling level-up choices

### GameScene

Responsible for:
- owning Phaser world objects
- starting gameplay systems
- updating gameplay systems each frame
- coordinating scene-level lifecycle

Not responsible for:
- containing all gameplay rules directly
- hardcoding weapon, enemy, or wave values

### UIScene

Responsible for:
- HUD display
- level-up panel
- result transition display

Not responsible for:
- changing combat rules
- changing spawn rules
- directly modifying player or enemy internals

### ResultScene

Responsible for:
- showing game result
- restart or return-to-title flow

Not responsible for:
- gameplay simulation

## Engine Rules

1. Phaser-specific lifecycle code stays in src/scenes.
2. Phaser game configuration stays in src/game.
3. Gameplay logic stays in system directories such as src/weapon, src/enemy, src/combat, and src/progression.
4. Scenes may orchestrate systems but should not contain business logic.
5. Data comes from src/data JSON files whenever possible.
6. Do not introduce Unity, Godot, React, PixiJS, or another engine unless explicitly requested.
7. Do not hardcode balance values in scenes.
8. Keep Phaser object creation separate from pure gameplay calculation where practical.

## Initial Implementation Order

1. Create Vite and Phaser project skeleton.
2. Create GameConfig and scenes.
3. Create core GameState and EventBus.
4. Create player movement.
5. Create enemy movement.
6. Create combat and weapon systems.
7. Create pickups and progression.
8. Create spawning and UI.

## First Technical Milestone

The first milestone is a blank Phaser project that can run in the browser and enter GameScene without gameplay logic.
