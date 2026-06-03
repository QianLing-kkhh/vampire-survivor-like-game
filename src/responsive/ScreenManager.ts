import Phaser from 'phaser';

export type ScreenOrientation = 'landscape' | 'portrait';
export type ResizeHandler = (screen: ScreenManager) => void;

export class ScreenManager {
  private readonly callbacks = new Set<ResizeHandler>();
  private readonly resizeHandler = (): void => {
    for (const callback of this.callbacks) {
      callback(this);
    }
  };

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.scale.on('resize', this.resizeHandler);
  }

  get width(): number {
    return this.scene.scale.width;
  }

  get height(): number {
    return this.scene.scale.height;
  }

  get centerX(): number {
    return this.width / 2;
  }

  get centerY(): number {
    return this.height / 2;
  }

  get orientation(): ScreenOrientation {
    return this.width >= this.height ? 'landscape' : 'portrait';
  }

  isLandscape(): boolean {
    return this.orientation === 'landscape';
  }

  isPortrait(): boolean {
    return this.orientation === 'portrait';
  }

  onResize(callback: ResizeHandler): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  dispose(): void {
    this.callbacks.clear();
    this.scene.scale.off('resize', this.resizeHandler);
  }
}
