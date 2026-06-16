import type { RenderEventPort, RenderTransform, RenderVisualId, SpawnVisualRequest } from '../core/ports/RenderEventPort';
import type {
  CameraShakeRequest,
  FloatingTextRequest,
  PlayEffectRequest,
} from '../core/ports/RenderEventPort';
import type { FloatingTextManager } from '../ui/FloatingTextManager';

export class PhaserRenderEventAdapter implements RenderEventPort {
  private nextVisualId = 1;

  constructor(private readonly floatingTextManager?: FloatingTextManager) {}

  spawnVisual(request: SpawnVisualRequest): RenderVisualId {
    return request.id ?? `phaser-visual-${this.nextVisualId++}`;
  }

  despawnVisual(_id: RenderVisualId): void {
    // Visual object lifecycle remains owned by existing Phaser runtime paths.
  }

  updateTransform(_id: RenderVisualId, _transform: Partial<RenderTransform>): void {
    // Transform updates remain owned by existing Phaser runtime paths.
  }

  playEffect(_request: PlayEffectRequest): void {
    // Effect playback remains owned by existing Phaser runtime paths.
  }

  showFloatingText(request: FloatingTextRequest): void {
    const kind = request.metadata?.kind;

    if (kind === 'enemyDamage') {
      const damage = Number(request.metadata?.damage ?? request.text);

      if (!Number.isFinite(damage) || damage <= 0) {
        return;
      }

      this.floatingTextManager?.showEnemyDamage(
        request.position.x,
        request.position.y,
        damage,
        request.metadata?.isBoss === true,
      );
    }
  }

  shakeCamera(_request: CameraShakeRequest): void {
    // Camera effects remain owned by existing Phaser runtime paths.
  }
}
