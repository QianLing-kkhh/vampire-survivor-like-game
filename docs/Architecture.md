# Architecture

## Goal

Build a small but expandable 2D Vampire Survivors-like game.

The architecture should allow:
- adding weapons without rewriting combat
- adding enemies without rewriting spawn logic
- adding upgrades without rewriting player or weapon classes
- adding UI without changing gameplay systems
- changing data balance without modifying code

## Layers

### 1. Data Layer

Contains configuration files.

Examples:
- weapons.json
- enemies.json
- waves.json
- upgrades.json
- characters.json

This layer defines values, not logic.

### 2. Core Layer

Contains game state, event bus, time control, and main loop.

Core does not contain weapon, enemy, UI, or progression logic.

### 3. Gameplay Systems

Independent systems:
- PlayerSystem
- EnemySystem
- CombatSystem
- WeaponSystem
- SpawnSystem
- PickupSystem
- ProgressionSystem

Each system owns its own logic.

### 4. Presentation Layer

Contains:
- UI
- animation
- audio
- visual effects

Presentation reacts to gameplay events.
It should not control core gameplay rules.

## Event-Based Communication

Systems communicate through events.

Core events:
- GameStarted
- GamePaused
- GameResumed
- GameOver
- EnemySpawned
- EnemyKilled
- PlayerDamaged
- PlayerDied
- ExpPicked
- LevelUp
- UpgradeSelected
- WeaponAdded
- WeaponUpgraded
- WaveStarted
- BossSpawned

## System Boundaries

### Player

Responsible for:
- movement
- health
- base stats
- receiving damage
- death state

Not responsible for:
- enemy spawn
- weapon attack logic
- upgrade selection
- UI rendering

### Enemy

Responsible for:
- enemy data
- movement
- health
- death event
- pooling

Not responsible for:
- drop creation
- UI update
- exp calculation outside enemy data

### Combat

Responsible for:
- damage calculation
- hit detection
- critical hits
- status effects
- damage type handling

Not responsible for:
- animation
- sound
- UI display

### Weapon

Responsible for:
- automatic attack
- cooldown
- projectile/aura/orbit behavior
- weapon upgrade application

Not responsible for:
- player movement
- enemy spawning
- level-up UI

### Progression

Responsible for:
- exp
- level
- upgrade choices
- applying selected upgrades

Not responsible for:
- weapon attack behavior
- enemy movement
- spawn timing

### Spawn

Responsible for:
- wave timing
- enemy density
- spawn position
- difficulty scaling

Not responsible for:
- enemy AI
- enemy drops
- player stats

### Pickup

Responsible for:
- exp gems
- coins
- magnet behavior
- pickup collection

Not responsible for:
- level calculation
- enemy death logic

### UI

Responsible for:
- HUD
- level-up panel
- result screen

Not responsible for:
- gameplay rule changes
