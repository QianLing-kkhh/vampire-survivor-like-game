# Project Map

## Root Structure

src contains game code.
docs contains project documents.
assets contains art, UI, and audio resources.

## Source Directories

### src/core
Game flow and shared infrastructure.
Expected files:
- GameLoop.ts
- GameState.ts
- EventBus.ts
- TimeManager.ts

### src/player
Player movement, health, and base stats.
Expected files:
- PlayerController.ts
- PlayerStats.ts
- PlayerHealth.ts

### src/enemy
Enemy entity, movement, factory, and pooling.
Expected files:
- Enemy.ts
- EnemyFactory.ts
- EnemyMovement.ts
- EnemyPool.ts

### src/combat
Damage, hit detection, and status effects.
Expected files:
- DamageCalculator.ts
- HitDetector.ts
- DamageType.ts
- StatusEffectManager.ts

### src/weapon
Automatic weapon behavior.
Expected files:
- Weapon.ts
- WeaponManager.ts
- WeaponFactory.ts
- ProjectileWeapon.ts
- AuraWeapon.ts
- OrbitWeapon.ts

### src/progression
Experience, level, and upgrade selection.
Expected files:
- ExpManager.ts
- LevelManager.ts
- UpgradeSelector.ts

### src/spawn
Enemy wave and spawn control.
Expected files:
- SpawnManager.ts
- SpawnWave.ts
- SpawnDirector.ts

### src/pickup
Exp gems, coins, magnet, and item collection.
Expected files:
- Pickup.ts
- PickupManager.ts
- MagnetSystem.ts

### src/ui
Game interface.
Expected files:
- HUD.ts
- LevelUpPanel.ts
- ResultScreen.ts

### src/data
Gameplay configuration.
Expected files:
- weapons.json
- enemies.json
- waves.json
- upgrades.json
- characters.json

### src/save
Save and load.
Expected files:
- SaveManager.ts
- SaveData.ts

### src/audio
Music and sound effects.
Expected files:
- AudioManager.ts
- AudioManifest.ts

## Codex Usage Rule

For each Codex task, specify:
- target system
- files to read
- files to modify
- task details
- forbidden changes
- verification method
