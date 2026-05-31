# Game Design

## Concept

A 2D roguelike survival game inspired by Vampire Survivors.

The player survives against continuous waves of enemies.
Weapons attack automatically.
The player collects experience gems, levels up, and selects upgrades.

## MVP Scope

1. Player movement
2. Enemy chasing player
3. Automatic weapon attack
4. Enemy death
5. Experience gem drop
6. Experience pickup
7. Level-up
8. Upgrade selection
9. Wave-based enemy spawning
10. HUD
11. Game over screen

## Initial Weapons

Knife:
- projectile
- targets nearest enemy

Garlic:
- aura
- damages enemies in range

Bible:
- orbit weapon
- circles around player

## Initial Enemies

Slime:
- slow
- basic enemy

Bat:
- fast
- low HP

Golem:
- slow
- high HP

## Upgrade Types

- weapon damage
- cooldown reduction
- projectile count
- area increase
- move speed
- pickup range
- max HP

## Design Rules

1. New weapons should be added mostly through data.
2. New enemies should be added through enemy data.
3. New waves should be added through waves.json.
4. UI should only display state.
5. Balance should be changed in data files.
