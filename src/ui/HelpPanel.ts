import Phaser from 'phaser';

export class HelpPanel {
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, onClose: () => void) {
    const centerX = scene.scale.width / 2;
    const centerY = scene.scale.height / 2;
    const background = scene.add.rectangle(
      centerX,
      centerY,
      560,
      420,
      0x020617,
      0.92,
    );
    background.setStrokeStyle(2, 0x94a3b8, 0.8);

    const title = scene.add.text(centerX, centerY - 168, 'Help', {
      color: '#ffffff',
      fontSize: '32px',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const body = scene.add.text(
      centerX - 230,
      centerY - 116,
      [
        'Move: WASD / Arrow Keys',
        'Mouse Move: Hold Left Mouse Button',
        'Pause: ESC',
        'Level Up: Choose one upgrade',
        'Treasure: Move close to open',
        'Goal: Survive until Boss, then defeat Boss',
        'Auto Test: Starts automatically after 10s on Title if no input',
      ],
      {
        color: '#e2e8f0',
        fontSize: '18px',
        lineSpacing: 10,
      },
    );

    const closeButton = scene.add.text(centerX, centerY + 160, 'Close', {
      backgroundColor: '#334155',
      color: '#ffffff',
      fontSize: '20px',
      padding: {
        x: 18,
        y: 10,
      },
    });
    closeButton.setOrigin(0.5);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', onClose);

    this.container = scene.add.container(0, 0, [
      background,
      title,
      body,
      closeButton,
    ]);
    this.container.setDepth(1400);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
