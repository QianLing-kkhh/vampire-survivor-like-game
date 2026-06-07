import Phaser from 'phaser';

export interface LoadingOverlayConfig {
  title: string;
  message: string;
}

export class LoadingOverlay {
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly progressTrack: Phaser.GameObjects.Graphics;
  private readonly progressFill: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly percentText: Phaser.GameObjects.Text;
  private readonly currentFileText: Phaser.GameObjects.Text;
  private progress = 0;
  private readonly onResize: () => void;

  constructor(private readonly scene: Phaser.Scene, config: LoadingOverlayConfig) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(10000);
    this.background = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.progressTrack = scene.add.graphics();
    this.progressFill = scene.add.graphics();
    this.titleText = scene.add.text(0, 0, config.title, {
      color: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      align: 'center',
    });
    this.titleText.setOrigin(0.5);
    this.messageText = scene.add.text(0, 0, config.message, {
      color: '#cbd5e1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      align: 'center',
    });
    this.messageText.setOrigin(0.5);
    this.percentText = scene.add.text(0, 0, '0%', {
      color: '#facc15',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      align: 'center',
    });
    this.percentText.setOrigin(0.5);
    this.currentFileText = scene.add.text(0, 0, '', {
      color: '#94a3b8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      align: 'center',
    });
    this.currentFileText.setOrigin(0.5);
    this.currentFileText.setMaxLines(1);
    this.container.add([
      this.background,
      this.panel,
      this.progressTrack,
      this.progressFill,
      this.titleText,
      this.messageText,
      this.percentText,
      this.currentFileText,
    ]);
    this.onResize = () => this.render();
    scene.scale.on('resize', this.onResize);
    this.render();
  }

  setProgress(value: number): void {
    this.progress = Phaser.Math.Clamp(value, 0, 1);
    this.percentText.setText(`${Math.round(this.progress * 100)}%`);
    this.render();
  }

  setCurrentFile(label: string): void {
    this.currentFileText.setText(label);
  }

  setMessage(label: string): void {
    this.messageText.setText(label);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.onResize);
    this.container.destroy(true);
  }

  private render(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const panelWidth = Math.min(Math.max(300, width * 0.62), 620);
    const panelHeight = 190;
    const centerX = width / 2;
    const centerY = height / 2;
    const barWidth = panelWidth - 72;
    const barHeight = 18;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 32;

    this.background.clear();
    this.background.fillStyle(0x020617, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x0b1220, 0.82);
    this.background.fillRect(0, 0, width, height);

    this.panel.clear();
    this.panel.fillStyle(0x0f172a, 0.94);
    this.panel.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 10);
    this.panel.lineStyle(2, 0x5b7fa8, 0.8);
    this.panel.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 10);

    this.progressTrack.clear();
    this.progressTrack.fillStyle(0x111827, 1);
    this.progressTrack.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
    this.progressTrack.lineStyle(1, 0x93c5fd, 0.5);
    this.progressTrack.strokeRoundedRect(barX, barY, barWidth, barHeight, 8);

    this.progressFill.clear();
    this.progressFill.fillStyle(0x60a5fa, 0.95);
    this.progressFill.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barWidth - 4) * this.progress), barHeight - 4, 6);

    this.titleText.setPosition(centerX, centerY - 56);
    this.messageText.setPosition(centerX, centerY - 20);
    this.percentText.setPosition(centerX, barY + barHeight / 2);
    this.currentFileText.setPosition(centerX, centerY + 78);
    this.currentFileText.setWordWrapWidth(barWidth);
  }
}
