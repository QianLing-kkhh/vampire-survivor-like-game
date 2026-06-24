# Codex Asset Integration Prompt

Target system:
asset integration / visual polish / spritesheet animation

Assets are placed under:
public/assets/art/

Important:
- Use spritesheets for animated objects instead of GIF.
- Do not modify gameplay values.
- Do not modify hitboxes unless absolutely necessary.
- Keep existing fallback graphics if a texture is missing.

Read:
src/scenes/PreloadScene.ts
src/player/PlayerController.ts
src/enemy/EnemyFactory.ts
src/weapon/ProjectileWeapon.ts
src/weapon/MagicWandWeapon.ts
src/weapon/AxeWeapon.ts
src/weapon/OrbitWeapon.ts
src/weapon/AuraWeapon.ts
src/pickup/Pickup.ts
src/pickup/TreasureChest.ts
src/world/WorldRenderer.ts
src/ui/HUD.ts
public/assets/art/animation_manifest.json

Modify:
src/scenes/PreloadScene.ts
src/player/PlayerController.ts
src/enemy/EnemyFactory.ts
src/weapon/ProjectileWeapon.ts
src/weapon/MagicWandWeapon.ts
src/weapon/AxeWeapon.ts
src/weapon/OrbitWeapon.ts
src/weapon/AuraWeapon.ts
src/pickup/Pickup.ts
src/pickup/TreasureChest.ts
src/world/WorldRenderer.ts
src/ui/HUD.ts

Task:
Integrate the new unified visual asset pack.

Requirements:
1. Load all images and spritesheets listed in animation_manifest.json.
2. Create Phaser animations for spritesheets.
3. Player uses player/player_walk_sheet.png.
4. Slime, bat, golem and boss use their animated sheets.
5. Mini bosses use slime_boss_placeholder, bat_boss_placeholder, golem_boss_placeholder.
6. Projectiles use weapon spritesheets:
   - knife_projectile_sheet
   - axe_projectile_sheet
   - magic_wand_projectile_sheet
   - bible_orbit_book_sheet
   - thousand_edge_projectile_sheet
   - holy_wand_projectile_sheet
   - death_spiral_projectile_sheet
   - unholy_vespers_orbit_book_sheet
7. Garlic and Soul Eater can keep Phaser aura circles but use garlic_core_sheet / soul_eater_core_sheet as center icons.
8. Pickups use exp_gem.png and treasure_chest.png.
9. Passives use passives/*.png in HUD if simple; otherwise preload only and keep text fallback.
10. WorldRenderer uses tree_landmark.png, rock_landmark.png, grave_landmark.png and optionally ground/grass tiles.
11. Effects may use hit_flash_sheet, boss_dash_impact_sheet, level_up_glow_sheet.
12. Missing textures must fallback safely.
13. Do not modify gameplay values or CSV fields.

Validation:
npm.cmd exec tsc
npm.cmd run build
