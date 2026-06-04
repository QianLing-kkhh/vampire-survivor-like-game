import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { DamageType } from '../combat/DamageType';
import { Enemy } from '../enemy/Enemy';
import { VisualScale } from '../visual/VisualScale';

import { Weapon, WeaponConfig, WeaponUpdateContext } from './Weapon';

export class AuraWeapon extends Weapon {
  private static readonly GARLIC_PERCENT_DAMAGE = 0.003;
  private static readonly AURA_DEPTH = 8;
  private static readonly AURA_FILL_ALPHA = 0.12;
  private static readonly AURA_STROKE_ALPHA = 0.5;
  private static readonly AURA_ICON_DEPTH = 22;
  private static readonly AURA_ICON_DISPLAY_SIZE = 30;

  private auraBody?: Phaser.GameObjects.Arc;
  private auraIcon?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, id: string, config: WeaponConfig) {
    super(scene, id, config);
  }

  override update(context: WeaponUpdateContext): void {
    this.updateAuraBody(context);
    super.update(context);
  }

  destroy(): void {
    this.auraBody?.destroy();
    this.auraBody = undefined;
    this.auraIcon?.destroy();
    this.auraIcon = undefined;
  }

  override applyUpgrade(upgradeId: string): boolean {
    if (this.id !== 'garlic') {
      return false;
    }

    switch (upgradeId) {
      case 'garlic_damage_up':
        this.increaseDamage(0.1);
        return true;
      case 'garlic_radius_up':
        this.increaseRadius(0.1);
        this.radius = Math.min(this.radius, 4.0);
        this.auraBody?.setRadius(this.radiusPixels);
        return true;
      default:
        return false;
    }
  }

  protected activate(context: WeaponUpdateContext): void {
    const radius = this.radiusPixels;

    for (const enemy of context.enemies) {
      if (enemy.isDead || !this.isEnemyInRange(context, enemy, radius)) {
        continue;
      }

      const actualDamage = enemy.takeDamage(this.createAuraHitResult(enemy));

      this.recordEnemyHit(enemy, actualDamage);

      if (enemy.isDead) {
        enemy.body.destroy();
      }
    }
  }

  private updateAuraBody(context: WeaponUpdateContext): void {
    if (!this.auraBody) {
      this.auraBody = this.scene.add.circle(
        context.player.x,
        context.player.y,
        this.radiusPixels,
        0x22c55e,
        AuraWeapon.AURA_FILL_ALPHA,
      );
      this.auraBody.setStrokeStyle(
        VisualScale.auraStrokeWidth,
        0x86efac,
        AuraWeapon.AURA_STROKE_ALPHA,
      );
      this.auraBody.setDepth(AuraWeapon.AURA_DEPTH);
    }

    this.ensureAuraIcon(context);

    this.auraBody.setPosition(context.player.x, context.player.y);
    this.auraBody.setRadius(this.radiusPixels);
    this.auraIcon?.setPosition(context.player.x, context.player.y);
  }

  private ensureAuraIcon(context: WeaponUpdateContext): void {
    if (this.auraIcon) {
      return;
    }

    const textureKey = AssetKeyResolver.getWeaponProjectileTextureKey(this.scene, this.id);
    const animationKey = AssetKeyResolver.getWeaponProjectileAnimationKey(this.scene, this.id);

    if (textureKey && animationKey) {
      const icon = this.scene.add.sprite(context.player.x, context.player.y, textureKey);
      icon.setDisplaySize(
        AuraWeapon.AURA_ICON_DISPLAY_SIZE,
        AuraWeapon.AURA_ICON_DISPLAY_SIZE,
      );
      icon.setDepth(AuraWeapon.AURA_ICON_DEPTH);
      icon.setAlpha(0.9);
      icon.play(animationKey);
      this.auraIcon = icon;
      return;
    }

    if (!textureKey) {
      return;
    }

    this.auraIcon = this.scene.add.image(context.player.x, context.player.y, textureKey);
    this.auraIcon.setDisplaySize(
      AuraWeapon.AURA_ICON_DISPLAY_SIZE,
      AuraWeapon.AURA_ICON_DISPLAY_SIZE,
    );
    this.auraIcon.setDepth(AuraWeapon.AURA_ICON_DEPTH);
    this.auraIcon.setAlpha(0.9);
  }

  private isEnemyInRange(
    context: WeaponUpdateContext,
    enemy: Enemy,
    radius: number,
  ): boolean {
    return Phaser.Math.Distance.Between(
      context.player.x,
      context.player.y,
      enemy.body.x,
      enemy.body.y,
    ) <= radius;
  }

  private get radiusPixels(): number {
    return (this.radius || 2) * 48;
  }

  private createAuraHitResult(enemy: Enemy) {
    if (this.id !== 'garlic') {
      return this.createHitResult();
    }

    return {
      damage: this.modifiedDamage + enemy.maxHp * AuraWeapon.GARLIC_PERCENT_DAMAGE,
      isCritical: false,
      damageType: DamageType.Normal,
    };
  }
}
