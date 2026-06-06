import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { SettingsManager } from '../settings/SettingsManager';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualSettings } from '../visual/VisualSettings';
import { VisualScale } from '../visual/VisualScale';

import { PlayerStats } from './PlayerStats';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

type PlayerBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  radius: number;
};

type MovementSource = 'manual' | 'auto' | 'virtualJoystick' | 'external';
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

export class PlayerController {
  private static readonly MAX_MOVEMENT_STEP = 24;
  private static readonly IDLE_SPEED_THRESHOLD = 6;
  private static readonly PLAYER_DEPTH = 20;

  readonly body: PlayerBody;

  private readonly keys: MovementKeys;
  private readonly previousPosition: Phaser.Math.Vector2;
  private readonly lastFramePosition: Phaser.Math.Vector2;
  private readonly velocity = new Phaser.Math.Vector2(0, 0);
  private externalMoveDirection?: Phaser.Math.Vector2;
  private lastFacingDirection: FacingDirection8 = 'right';
  private currentAnimationKey?: string;
  private currentTextureKey: string | null = null;
  private shadow?: Phaser.GameObjects.Ellipse;
  private temporaryMoveSpeedMultiplier = 1;
  private mapMoveSpeedMultiplier = 1;
  private temporaryMoveSpeedRemainingMs = 0;
  private unsubscribeSettings?: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stats: PlayerStats,
    x: number,
    y: number,
    private readonly characterId?: string,
    private readonly skinId?: string,
  ) {
    this.body = this.createBody(x, y);
    this.shadow = ShadowFactory.createShadow(scene, this.body, 'player');
    this.previousPosition = new Phaser.Math.Vector2(x, y);
    this.lastFramePosition = new Phaser.Math.Vector2(x, y);
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

    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
  }

  update(deltaMs: number): void {
    const direction = this.externalMoveDirection?.clone() ?? new Phaser.Math.Vector2(
      this.getHorizontalDirection(),
      this.getVerticalDirection(),
    );

    if (!this.externalMoveDirection) {
      direction.add(this.getMouseDirection());
    }

    this.moveWithDirection(direction, deltaMs, 'manual');
  }

  moveWithDirection(
    direction: Phaser.Math.Vector2,
    deltaMs: number,
    source: MovementSource = 'external',
  ): void {
    const deltaSeconds = Math.max(0, deltaMs / 1000);

    this.updateTemporaryMoveSpeed(deltaMs);
    this.rollbackAbnormalExternalJump(deltaSeconds, direction, source);
    this.previousPosition.set(this.body.x, this.body.y);
    this.updateFacingFromInput(direction);
    this.updateVelocity(direction, deltaSeconds);
    this.moveByVelocity(deltaSeconds);
    this.rollbackAbnormalMovement(deltaSeconds, direction, source);
    this.updateAnimation();
    this.updateShadow();
    this.lastFramePosition.set(this.body.x, this.body.y);
  }

  applyExternalDisplacement(displacement: Phaser.Math.Vector2): void {
    if (displacement.lengthSq() === 0) {
      return;
    }

    this.previousPosition.set(this.body.x, this.body.y);
    this.body.x += displacement.x;
    this.body.y += displacement.y;
    this.clampToWorldBounds();
    this.updateAnimation();
    this.updateShadow();
    this.lastFramePosition.set(this.body.x, this.body.y);
  }

  setPosition(x: number, y: number): void {
    this.previousPosition.set(this.body.x, this.body.y);
    this.body.x = x;
    this.body.y = y;
    this.clampToWorldBounds();
    this.updateAnimation();
    this.updateShadow();
    this.lastFramePosition.set(this.body.x, this.body.y);
  }

  stopMovement(): void {
    this.velocity.set(0, 0);
  }

  setMapMoveSpeedMultiplier(multiplier: number): void {
    this.mapMoveSpeedMultiplier = Math.max(0.1, multiplier);
  }

  setExternalMoveDirection(direction?: Phaser.Math.Vector2): void {
    this.externalMoveDirection = direction?.clone();
  }

  clearExternalMoveDirection(): void {
    this.externalMoveDirection = undefined;
  }

  destroy(): void {
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = undefined;
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.body.destroy();
  }

  getPreviousPosition(): Phaser.Math.Vector2 {
    return this.previousPosition.clone();
  }

  getLastFacingDirection(): Phaser.Math.Vector2 {
    return this.getVectorFromDirection8(this.lastFacingDirection);
  }

  setTemporaryMoveSpeedMultiplier(multiplier: number, durationMs: number): void {
    const nextDurationMs = Math.max(0, durationMs);

    if (nextDurationMs <= 0) {
      this.temporaryMoveSpeedMultiplier = 1;
      this.temporaryMoveSpeedRemainingMs = 0;
      return;
    }

    this.temporaryMoveSpeedMultiplier = Math.max(0.1, multiplier);
    this.temporaryMoveSpeedRemainingMs = nextDurationMs;
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

  private moveBy(direction: Phaser.Math.Vector2, distance: number): void {
    const steps = Math.max(1, Math.ceil(distance / PlayerController.MAX_MOVEMENT_STEP));
    const stepDistance = distance / steps;

    for (let step = 0; step < steps; step += 1) {
      this.body.x += direction.x * stepDistance;
      this.body.y += direction.y * stepDistance;
      this.clampToWorldBounds();
    }
  }

  private updateVelocity(direction: Phaser.Math.Vector2, deltaSeconds: number): void {
    const hasInput = direction.lengthSq() > 0;
    const moveSpeed = this.getEffectiveMoveSpeed();
    const desiredVelocity = hasInput
      ? direction.clone().normalize().scale(moveSpeed)
      : new Phaser.Math.Vector2(0, 0);
    const maxVelocityDelta = (hasInput ? this.stats.acceleration : this.stats.deceleration)
      * deltaSeconds;

    this.moveVelocityToward(desiredVelocity, maxVelocityDelta);

    if (this.velocity.length() > moveSpeed) {
      this.velocity.normalize().scale(moveSpeed);
    }
  }

  private moveVelocityToward(targetVelocity: Phaser.Math.Vector2, maxDelta: number): void {
    const deltaVelocity = targetVelocity.clone().subtract(this.velocity);

    if (deltaVelocity.lengthSq() === 0) {
      return;
    }

    if (deltaVelocity.length() <= maxDelta) {
      this.velocity.copy(targetVelocity);
      return;
    }

    this.velocity.add(deltaVelocity.normalize().scale(maxDelta));
  }

  private moveByVelocity(deltaSeconds: number): void {
    const distance = this.velocity.length() * deltaSeconds;

    if (distance <= 0) {
      return;
    }

    this.moveBy(this.velocity.clone().normalize(), distance);
  }

  private rollbackAbnormalExternalJump(
    deltaSeconds: number,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    const currentPosition = new Phaser.Math.Vector2(this.body.x, this.body.y);
    const distance = currentPosition.distance(this.lastFramePosition);

    if (distance <= this.getMaxExpectedMove(deltaSeconds)) {
      return;
    }

    this.warnAbnormalJump('before-move', this.lastFramePosition, currentPosition, inputDirection, source);
    this.body.x = this.lastFramePosition.x;
    this.body.y = this.lastFramePosition.y;
    this.velocity.set(0, 0);
  }

  private rollbackAbnormalMovement(
    deltaSeconds: number,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    const currentPosition = new Phaser.Math.Vector2(this.body.x, this.body.y);
    const distance = currentPosition.distance(this.previousPosition);

    if (distance <= this.getMaxExpectedMove(deltaSeconds)) {
      return;
    }

    this.warnAbnormalJump('after-move', this.previousPosition, currentPosition, inputDirection, source);
    this.body.x = this.previousPosition.x;
    this.body.y = this.previousPosition.y;
    this.velocity.set(0, 0);
  }

  private getMaxExpectedMove(deltaSeconds: number): number {
    return Math.max(300, this.getEffectiveMoveSpeed() * deltaSeconds + 50);
  }

  private getEffectiveMoveSpeed(): number {
    return this.stats.moveSpeed
      * this.temporaryMoveSpeedMultiplier
      * this.mapMoveSpeedMultiplier;
  }

  private updateTemporaryMoveSpeed(deltaMs: number): void {
    if (this.temporaryMoveSpeedRemainingMs <= 0) {
      return;
    }

    this.temporaryMoveSpeedRemainingMs = Math.max(
      0,
      this.temporaryMoveSpeedRemainingMs - Math.max(0, deltaMs),
    );

    if (this.temporaryMoveSpeedRemainingMs === 0) {
      this.temporaryMoveSpeedMultiplier = 1;
    }
  }

  private warnAbnormalJump(
    phase: string,
    previousPosition: Phaser.Math.Vector2,
    currentPosition: Phaser.Math.Vector2,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    console.warn('Abnormal player jump prevented', {
      phase,
      previous: { x: previousPosition.x, y: previousPosition.y },
      current: { x: currentPosition.x, y: currentPosition.y },
      delta: {
        x: currentPosition.x - previousPosition.x,
        y: currentPosition.y - previousPosition.y,
        distance: currentPosition.distance(previousPosition),
      },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      inputDirection: { x: inputDirection.x, y: inputDirection.y },
      source,
      autoMode: source === 'auto',
    });
  }

  private clampToWorldBounds(): void {
    const bounds = this.scene.physics.world.bounds;
    const radius = this.body.radius;
    const minX = bounds.x + radius;
    const maxX = bounds.right - radius;
    const minY = bounds.y + radius;
    const maxY = bounds.bottom - radius;
    const clampedX = Phaser.Math.Clamp(this.body.x, minX, maxX);
    const clampedY = Phaser.Math.Clamp(this.body.y, minY, maxY);

    if ((clampedX <= minX && this.velocity.x < 0) || (clampedX >= maxX && this.velocity.x > 0)) {
      this.velocity.x = 0;
    }

    if ((clampedY <= minY && this.velocity.y < 0) || (clampedY >= maxY && this.velocity.y > 0)) {
      this.velocity.y = 0;
    }

    this.body.x = clampedX;
    this.body.y = clampedY;
  }

  private getHorizontalDirection(): number {
    const movingLeft = this.keys.left.isDown || this.keys.a.isDown;
    const movingRight = this.keys.right.isDown || this.keys.d.isDown;

    return Number(movingRight) - Number(movingLeft);
  }

  private getVerticalDirection(): number {
    const movingUp = this.keys.up.isDown || this.keys.w.isDown;
    const movingDown = this.keys.down.isDown || this.keys.s.isDown;

    return Number(movingDown) - Number(movingUp);
  }

  private getMouseDirection(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown || !pointer.leftButtonDown()) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const direction = new Phaser.Math.Vector2(
      worldPoint.x - this.body.x,
      worldPoint.y - this.body.y,
    );

    if (direction.lengthSq() < 1) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return direction.normalize();
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
    const isMoving = this.velocity.length() > PlayerController.IDLE_SPEED_THRESHOLD;
    const direction = isMoving
      ? this.getDirection8FromVector(this.velocity.x, this.velocity.y)
      : this.lastFacingDirection;

    if (isMoving) {
      this.lastFacingDirection = direction;
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

  private updateFacingFromInput(direction: Phaser.Math.Vector2): void {
    if (direction.lengthSq() === 0) {
      return;
    }

    this.lastFacingDirection = this.getDirection8FromVector(direction.x, direction.y);
  }

  private getVectorFromDirection8(direction: FacingDirection8): Phaser.Math.Vector2 {
    switch (direction) {
      case 'down_right':
        return new Phaser.Math.Vector2(1, 1).normalize();
      case 'down':
        return new Phaser.Math.Vector2(0, 1);
      case 'down_left':
        return new Phaser.Math.Vector2(-1, 1).normalize();
      case 'left':
        return new Phaser.Math.Vector2(-1, 0);
      case 'up_left':
        return new Phaser.Math.Vector2(-1, -1).normalize();
      case 'up':
        return new Phaser.Math.Vector2(0, -1);
      case 'up_right':
        return new Phaser.Math.Vector2(1, -1).normalize();
      case 'right':
      default:
        return new Phaser.Math.Vector2(1, 0);
    }
  }

  private getDirection8FromVector(vx: number, vy: number): FacingDirection8 {
    const angle = Phaser.Math.Angle.Normalize(Math.atan2(vy, vx));
    const degrees = Phaser.Math.RadToDeg(angle);

    if (degrees < 22.5 || degrees >= 337.5) {
      return 'right';
    }

    if (degrees < 67.5) {
      return 'down_right';
    }

    if (degrees < 112.5) {
      return 'down';
    }

    if (degrees < 157.5) {
      return 'down_left';
    }

    if (degrees < 202.5) {
      return 'left';
    }

    if (degrees < 247.5) {
      return 'up_left';
    }

    if (degrees < 292.5) {
      return 'up';
    }

    return 'up_right';
  }
}
