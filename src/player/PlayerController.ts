import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { PhaserInputAdapter } from '../input/PhaserInputAdapter';
import { SettingsManager } from '../settings/SettingsManager';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualSettings } from '../visual/VisualSettings';
import { VisualScale } from '../visual/VisualScale';

import { PlayerModel } from './PlayerModel';
import { PlayerMovementSystem } from './PlayerMovementSystem';
import { PlayerHealth } from './PlayerHealth';
import type { PlayerQuery } from './PlayerQuery';
import { PlayerState } from './PlayerState';
import { PlayerStats } from './PlayerStats';
import type { Vector2Like } from '../core/domain/Vector2';
import type {
  PlayerFacingDirection8,
  PlayerMovementAnomaly,
  PlayerMovementSource,
  PlayerWorldBounds,
} from './PlayerTypes';

type PlayerBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  radius: number;
};

type FacingDirection8 =
  | 'right'
  | 'down_right'
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right';

type PlayerAssetDebug = {
  characterId?: string;
  skinId?: string;
  textureKey: string | null;
  animationKey: string | null;
  frameTextureKey?: string;
  frameName?: string | number;
  direction: FacingDirection8;
  isMoving: boolean;
};

type PlayerAssetDebugGlobal = typeof globalThis & {
  __vsgPlayerAssetDebug?: PlayerAssetDebug;
};

export class PlayerController implements PlayerQuery {
  private static readonly MAX_MOVEMENT_STEP = 24;
  private static readonly IDLE_SPEED_THRESHOLD = 6;
  private static readonly PLAYER_DEPTH = 20;
  private static readonly MAP_SLOW_SNOWFLAKE_COLOR = '#bfdbfe';
  private static readonly MAP_SLOW_SNOWFLAKE_ALPHA_MIN = 0.55;
  private static readonly MAP_SLOW_SNOWFLAKE_ALPHA_MAX = 0.95;
  private static readonly MAP_SLOW_VISUAL_MIN_MULTIPLIER = 0.25;

  readonly body: PlayerBody;

  private readonly inputAdapter: PhaserInputAdapter;
  private readonly model: PlayerModel;
  private readonly movementSystem = new PlayerMovementSystem();
  private playerState?: PlayerState;
  private externalMoveDirection?: Phaser.Math.Vector2;
  private currentAnimationKey?: string;
  private currentTextureKey: string | null = null;
  private shadow?: Phaser.GameObjects.Ellipse;
  private unsubscribeSettings?: () => void;
  private mapSlowVisual?: Phaser.GameObjects.Text;
  private isMapSlowVisualActive = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stats: PlayerStats,
    x: number,
    y: number,
    private readonly characterId?: string,
    private readonly skinId?: string,
  ) {
    this.body = this.createBody(x, y);
    this.model = new PlayerModel({
      x,
      y,
      collisionRadius: this.body.radius,
      moveSpeed: stats.moveSpeed,
      acceleration: stats.acceleration,
      deceleration: stats.deceleration,
      facingDirection: 'right',
    });
    this.inputAdapter = new PhaserInputAdapter(scene, () => ({
      x: this.body.x,
      y: this.body.y,
    }));
    this.shadow = ShadowFactory.createShadow(scene, this.body, 'player');
    this.unsubscribeSettings = SettingsManager.subscribe((domain, settingName) => {
      if (
        domain === 'display'
        && (
          settingName === 'visualModelScale'
          || settingName === 'shadowsEnabled'
          || settingName === 'displayQuality'
        )
      ) {
        this.refreshVisualScale();
      }
    });
  }

  update(deltaMs: number): void {
    this.syncHealthState();
    const direction = this.externalMoveDirection?.clone()
      ?? this.inputAdapter.getManualMoveDirection();

    this.moveWithDirection(direction, deltaMs, 'manual');
  }

  bindHealth(health: PlayerHealth): PlayerState {
    this.playerState = new PlayerState(this.model, health);
    return this.playerState;
  }

  getPlayerState(): PlayerState | undefined {
    return this.playerState;
  }

  isAlive(): boolean {
    this.syncHealthState();
    return this.playerState?.isAlive ?? this.model.alive;
  }

  syncHealthState(): void {
    this.playerState?.syncLifecycleFromHealth();
  }

  moveWithDirection(
    direction: Phaser.Math.Vector2,
    deltaMs: number,
    source: PlayerMovementSource = 'external',
  ): void {
    this.moveWithDirectionLike(direction, deltaMs, source);
  }

  moveWithDirectionLike(
    direction: Vector2Like,
    deltaMs: number,
    source: PlayerMovementSource = 'external',
  ): void {
    this.syncModelFromBody();
    this.syncHealthState();
    this.syncMovementStats();
    const anomalies = this.movementSystem.moveWithDirection(this.model, {
      direction,
      deltaMs,
      source,
      worldBounds: this.getWorldBounds(),
      maxMovementStep: PlayerController.MAX_MOVEMENT_STEP,
    });

    anomalies.forEach((anomaly) => this.warnAbnormalJump(anomaly));
    this.syncBodyFromModel();
    this.updateAnimation();
    this.updateShadow();
  }

  applyExternalDisplacement(displacement: Phaser.Math.Vector2): void {
    this.applyExternalDisplacementLike(displacement);
  }

  applyExternalDisplacementLike(displacement: Vector2Like): void {
    if ((displacement.x * displacement.x + displacement.y * displacement.y) === 0) {
      return;
    }

    this.syncModelFromBody();
    this.movementSystem.applyExternalDisplacement(
      this.model,
      displacement,
      this.getWorldBounds(),
    );
    this.syncBodyFromModel();
    this.updateAnimation();
    this.updateShadow();
  }

  setPosition(x: number, y: number): void {
    this.syncModelFromBody();
    this.movementSystem.setPosition(this.model, x, y, this.getWorldBounds());
    this.syncBodyFromModel();
    this.updateAnimation();
    this.updateShadow();
  }

  stopMovement(): void {
    this.model.stopMovement();
  }

  setMapMoveSpeedMultiplier(multiplier: number): void {
    this.movementSystem.setMapMoveSpeedMultiplier(this.model, multiplier);
  }

  setExternalMoveDirection(direction?: Phaser.Math.Vector2): void {
    this.externalMoveDirection = direction?.clone();
  }

  setExternalMoveDirectionLike(direction: Vector2Like | null | undefined): void {
    this.externalMoveDirection = direction
      ? new Phaser.Math.Vector2(direction.x, direction.y)
      : undefined;
  }

  clearExternalMoveDirection(): void {
    this.externalMoveDirection = undefined;
  }

  destroy(): void {
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = undefined;
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.destroySlowVisual();
    this.body.destroy();
  }

  setSlowVisual(active: boolean, multiplier = 1): boolean {
    if (!active) {
      this.clearSlowVisual();
      return false;
    }

    if (!this.isBodyUsable()) {
      this.clearSlowVisual();
      return false;
    }

    const normalizedMultiplier = Math.max(
      PlayerController.MAP_SLOW_VISUAL_MIN_MULTIPLIER,
      Math.min(1, multiplier),
    );
    const intensity = (1 - normalizedMultiplier) / (1 - PlayerController.MAP_SLOW_VISUAL_MIN_MULTIPLIER);
    const clampedIntensity = Phaser.Math.Clamp(intensity, 0, 1);
    const slowAlpha = Phaser.Math.Linear(
      PlayerController.MAP_SLOW_SNOWFLAKE_ALPHA_MIN,
      PlayerController.MAP_SLOW_SNOWFLAKE_ALPHA_MAX,
      clampedIntensity,
    );
    const fontSize = Math.round(this.getBodyRadius() * (1.05 + clampedIntensity * 0.25));
    const wasActive = this.isMapSlowVisualActive;

    if (!this.mapSlowVisual) {
      this.mapSlowVisual = this.scene.add.text(
        this.body.x,
        this.body.y,
        '\u2744',
        {
          color: PlayerController.MAP_SLOW_SNOWFLAKE_COLOR,
          fontSize: `${fontSize}px`,
          fontStyle: 'bold',
          stroke: '#0f172a',
          strokeThickness: 3,
        },
      );
      this.mapSlowVisual.setOrigin(0.5);
      this.mapSlowVisual.setDepth(PlayerController.PLAYER_DEPTH + 1);
    }

    this.mapSlowVisual.setPosition(this.body.x, this.body.y - this.getBodyRadius() * 1.15);
    this.mapSlowVisual.setFontSize(fontSize);
    this.mapSlowVisual.setVisible(true);
    this.mapSlowVisual.setAlpha(slowAlpha);
    this.isMapSlowVisualActive = true;
    return !wasActive;
  }

  clearSlowVisual(): void {
    if (!this.mapSlowVisual) {
      this.isMapSlowVisualActive = false;
      return;
    }

    this.mapSlowVisual.setVisible(false);
    this.mapSlowVisual.setAlpha(0);
    this.isMapSlowVisualActive = false;
  }

  private destroySlowVisual(): void {
    if (this.mapSlowVisual?.scene) {
      this.mapSlowVisual.destroy();
    }

    this.mapSlowVisual = undefined;
    this.isMapSlowVisualActive = false;
  }

  isSlowVisualActive(): boolean {
    return this.isMapSlowVisualActive;
  }

  getPositionLike(): Vector2Like {
    this.syncModelFromBody();
    return {
      x: this.model.position.x,
      y: this.model.position.y,
    };
  }

  getVelocityLike(): Vector2Like {
    return {
      x: this.model.velocity.x,
      y: this.model.velocity.y,
    };
  }

  getAimDirectionLike(): Vector2Like {
    return {
      x: this.model.aimDirection.x,
      y: this.model.aimDirection.y,
    };
  }

  getFacingDirectionLike(): Vector2Like {
    return this.movementSystem.getVectorFromDirection8(this.model.facingDirection);
  }

  getFacingDirectionName(): PlayerFacingDirection8 {
    return this.model.facingDirection;
  }

  getPreviousPositionLike(): Vector2Like {
    return {
      x: this.model.previousPosition.x,
      y: this.model.previousPosition.y,
    };
  }

  getCollisionRadius(): number {
    this.model.collisionRadius = this.body.radius;
    return this.model.collisionRadius;
  }

  getPreviousPosition(): Phaser.Math.Vector2 {
    return this.toPhaserVector(this.model.previousPosition);
  }

  getLastFacingDirection(): Phaser.Math.Vector2 {
    return this.toPhaserVector(
      this.movementSystem.getVectorFromDirection8(this.model.facingDirection),
    );
  }

  setTemporaryMoveSpeedMultiplier(multiplier: number, durationMs: number): void {
    this.movementSystem.setTemporaryMoveSpeedMultiplier(this.model, multiplier, durationMs);
  }

  refreshVisualScale(): void {
    if (!this.isBodyUsable()) {
      ShadowFactory.destroyShadow(this.shadow);
      this.shadow = undefined;
      return;
    }

    const body = this.body as PlayerBody & {
      setDisplaySize?: (width: number, height: number) => void;
      setScale?: (x: number, y?: number) => void;
    };

    if (body.setDisplaySize) {
      const displaySize = VisualScale.getPlayerDisplaySize();
      body.setDisplaySize(displaySize, displaySize);
    } else {
      body.setScale?.(VisualScale.getPlayerFallbackVisualRadius() / body.radius);
    }

    if (!VisualSettings.areShadowsEnabled()) {
      ShadowFactory.destroyShadow(this.shadow);
      this.shadow = undefined;
      return;
    }

    this.shadow = this.shadow
      ? ShadowFactory.updateShadow(this.shadow, this.body, 'player')
      : ShadowFactory.createShadow(this.scene, this.body, 'player');
  }

  private warnAbnormalJump(anomaly: PlayerMovementAnomaly): void {
    console.warn('Abnormal player jump prevented', {
      phase: anomaly.phase,
      previous: {
        x: anomaly.previousPosition.x,
        y: anomaly.previousPosition.y,
      },
      current: {
        x: anomaly.currentPosition.x,
        y: anomaly.currentPosition.y,
      },
      delta: {
        x: anomaly.currentPosition.x - anomaly.previousPosition.x,
        y: anomaly.currentPosition.y - anomaly.previousPosition.y,
        distance: Phaser.Math.Distance.Between(
          anomaly.currentPosition.x,
          anomaly.currentPosition.y,
          anomaly.previousPosition.x,
          anomaly.previousPosition.y,
        ),
      },
      velocity: { x: this.model.velocity.x, y: this.model.velocity.y },
      inputDirection: {
        x: anomaly.inputDirection.x,
        y: anomaly.inputDirection.y,
      },
      source: anomaly.source,
      autoMode: anomaly.source === 'auto',
    });
  }

  private getWorldBounds(): PlayerWorldBounds {
    const bounds = this.scene.physics.world.bounds;

    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  private createBody(x: number, y: number): PlayerBody {
    const textureKey = AssetKeyResolver.getPlayerTextureKey(
      this.scene,
      this.skinId,
      this.characterId,
    );
    const idleAnimationKey = AssetKeyResolver.getPlayerAnimationKey(
      this.scene,
      'idle',
      'down',
      this.skinId,
      this.characterId,
    );

    if (textureKey && idleAnimationKey) {
      const body = this.scene.add.sprite(x, y, textureKey);
      const displaySize = VisualScale.getPlayerDisplaySize();
      body.setDisplaySize(displaySize, displaySize);
      body.setDepth(PlayerController.PLAYER_DEPTH);
      this.currentTextureKey = textureKey;
      this.playPlayerAnimation(body, idleAnimationKey);
      this.exposeAssetDebug(body, idleAnimationKey, 'down', false);

      return Object.assign(body, { radius: 14 });
    }

    if (textureKey) {
      const body = this.scene.add.image(x, y, textureKey);
      const displaySize = VisualScale.getPlayerDisplaySize();
      body.setDisplaySize(displaySize, displaySize);
      body.setDepth(PlayerController.PLAYER_DEPTH);
      this.currentTextureKey = textureKey;
      this.exposeAssetDebug(body, null, 'down', false);

      return Object.assign(body, { radius: 14 });
    }

    const collisionRadius = 14;
    const body = this.scene.add.circle(x, y, collisionRadius, 0x4ade80);
    body.setScale(VisualScale.getPlayerFallbackVisualRadius() / collisionRadius);
    body.setDepth(PlayerController.PLAYER_DEPTH);
    return body;
  }

  private updateAnimation(): void {
    const body = this.body as PlayerBody & {
      play?: (key: string) => Phaser.GameObjects.Sprite;
      setFlipX?: (value: boolean) => Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
      frame?: Phaser.Textures.Frame;
    };
    const isMoving = this.model.velocity.length() > PlayerController.IDLE_SPEED_THRESHOLD;
    const direction = isMoving
      ? this.movementSystem.getDirection8FromVector(this.model.velocity.x, this.model.velocity.y)
      : this.model.facingDirection;

    if (isMoving) {
      this.model.facingDirection = direction;
    }

    const animationKey = AssetKeyResolver.getPlayerAnimationKey(
      this.scene,
      isMoving ? 'walk' : 'idle',
      direction,
      this.skinId,
      this.characterId,
    );

    this.setDirectionalFlip(body, direction, animationKey);

    if (!animationKey || !body.play) {
      return;
    }

    this.playPlayerAnimation(body, animationKey);
    this.exposeAssetDebug(body, animationKey, direction, isMoving);
  }

  private updateShadow(): void {
    if (!this.isBodyUsable()) {
      this.shadow = undefined;
      return;
    }

    if (!VisualSettings.areShadowsEnabled()) {
      ShadowFactory.destroyShadow(this.shadow);
      this.shadow = undefined;
      return;
    }

    this.shadow = this.shadow
      ? ShadowFactory.updateShadow(this.shadow, this.body, 'player')
      : ShadowFactory.createShadow(this.scene, this.body, 'player');
  }

  private isBodyUsable(): boolean {
    return Boolean(
      this.body
      && this.body.scene
      && this.body.active !== false,
    );
  }

  private getBodyRadius(): number {
    const body = this.body as { radius?: number };

    return body.radius ?? 14;
  }

  private playPlayerAnimation(
    body: { play?: (key: string) => Phaser.GameObjects.Sprite },
    animationKey: string,
  ): void {
    if (!body.play || !this.scene.anims.exists(animationKey)) {
      return;
    }

    if (this.currentAnimationKey === animationKey) {
      return;
    }

    body.play(animationKey);
    this.currentAnimationKey = animationKey;
  }

  private exposeAssetDebug(
    body: { frame?: Phaser.Textures.Frame },
    animationKey: string | null,
    direction: FacingDirection8,
    isMoving: boolean,
  ): void {
    (globalThis as PlayerAssetDebugGlobal).__vsgPlayerAssetDebug = {
      characterId: this.characterId,
      skinId: this.skinId,
      textureKey: this.currentTextureKey,
      animationKey,
      frameTextureKey: body.frame?.texture.key,
      frameName: body.frame?.name,
      direction,
      isMoving,
    };
  }

  private setDirectionalFlip(
    body: PlayerBody & {
      setFlipX?: (value: boolean) => Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    },
    direction: FacingDirection8,
    animationKey: string | null,
  ): void {
    const usesSkinDirectionalArt = (
      animationKey !== null
      && this.skinId !== undefined
      && animationKey.startsWith(`art_player_${this.skinId}_`)
      && animationKey.endsWith(`_${direction}`)
    );

    body.setFlipX?.(
      !usesSkinDirectionalArt
      && (
        direction === 'left'
        || direction === 'down_left'
        || direction === 'up_left'
      ),
    );
  }

  private syncModelFromBody(): void {
    this.model.collisionRadius = this.body.radius;
    this.model.syncPosition(this.body);
  }

  private syncBodyFromModel(): void {
    this.body.x = this.model.position.x;
    this.body.y = this.model.position.y;
  }

  private syncMovementStats(): void {
    this.model.syncMovementStats({
      moveSpeed: this.stats.moveSpeed,
      acceleration: this.stats.acceleration,
      deceleration: this.stats.deceleration,
    });
  }

  private toPhaserVector(value: { x: number; y: number }): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(value.x, value.y);
  }
}
