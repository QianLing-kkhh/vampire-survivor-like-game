import Phaser from 'phaser';

interface WorldPosition {
  x: number;
  y: number;
}

export interface HUDState {
  currentHp: number;
  maxHp: number;
  level: number;
  currentExp: number;
  requiredExp: number;
  timeSeconds: number;
  targetTimeSeconds: number;
  weaponIds: string[];
  autoMode?: boolean;
  evolutionCandidateStats?: string;
  weaponHudInfo?: Array<{
    weaponId: string;
    upgradeSummary: string;
  }>;
  passiveItems?: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  moveSpeed: number;
  pickupRange: number;
  playerMaxHp?: number;
  worldWidth: number;
  worldHeight: number;
  playerPosition: WorldPosition;
  enemyPositions: WorldPosition[];
  message?: string;
}

export class HUD {
  private static readonly MINIMAP_WIDTH = 140;
  private static readonly MINIMAP_HEIGHT = 90;
  private static readonly MAX_MINIMAP_ENEMIES = 50;

  private readonly text: Phaser.GameObjects.Text;
  private readonly minimapX: number;
  private readonly minimapY = 16;
  private readonly minimapBackground: Phaser.GameObjects.Rectangle;
  private readonly minimapPlayer: Phaser.GameObjects.Arc;
  private readonly minimapEnemies: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(16, 16, '', {
      color: '#ffffff',
      fontSize: '16px',
      lineSpacing: 4,
    });
    this.text.setDepth(900);

    this.minimapX = scene.scale.width - HUD.MINIMAP_WIDTH - 16;
    this.minimapBackground = scene.add.rectangle(
      this.minimapX,
      this.minimapY,
      HUD.MINIMAP_WIDTH,
      HUD.MINIMAP_HEIGHT,
      0x020617,
      0.72,
    );
    this.minimapBackground.setOrigin(0, 0);
    this.minimapBackground.setStrokeStyle(1, 0xe2e8f0, 0.65);
    this.minimapBackground.setDepth(900);

    for (let index = 0; index < HUD.MAX_MINIMAP_ENEMIES; index += 1) {
      const enemyDot = scene.add.circle(0, 0, 2, 0xef4444, 0.85);
      enemyDot.setDepth(901);
      enemyDot.setVisible(false);
      this.minimapEnemies.push(enemyDot);
    }

    this.minimapPlayer = scene.add.circle(0, 0, 3, 0x38bdf8, 1);
    this.minimapPlayer.setDepth(902);

    this.update({
      currentHp: 0,
      maxHp: 0,
      level: 1,
      currentExp: 0,
      requiredExp: 5,
      timeSeconds: 0,
      targetTimeSeconds: 300,
      weaponIds: [],
      autoMode: false,
      evolutionCandidateStats: undefined,
      weaponHudInfo: [],
      passiveItems: [],
      moveSpeed: 0,
      pickupRange: 0,
      playerMaxHp: 0,
      worldWidth: 1,
      worldHeight: 1,
      playerPosition: { x: 0, y: 0 },
      enemyPositions: [],
      message: undefined,
    });
  }

  update(state: HUDState): void {
    const weaponLines = this.formatWeaponLines(state);
    const passiveLines = this.formatPassiveLines(state);
    const evolutionDebugLines = this.formatEvolutionDebugLines(state);
    const currentHp = this.formatInteger(state.currentHp);
    const maxHp = this.formatInteger(state.playerMaxHp ?? state.maxHp);

    this.text.setText([
      `HP: ${currentHp} / ${maxHp}`,
      `Level: ${state.level}`,
      `EXP: ${Math.floor(state.currentExp)} / ${Math.floor(state.requiredExp)}`,
      `Time: ${this.formatTime(state.timeSeconds)}`,
      `Goal: ${this.formatTime(Math.max(0, state.targetTimeSeconds - state.timeSeconds))}`,
      'Weapons:',
      ...weaponLines,
      'Passives:',
      ...passiveLines,
      `Move Speed: ${this.formatNumber(state.moveSpeed)}`,
      `Pickup Range: ${this.formatNumber(state.pickupRange)}`,
      `Max HP: ${maxHp}`,
      ...evolutionDebugLines,
      ...(state.message ? [state.message] : []),
    ]);

    this.updateMinimap(state);
  }

  private updateMinimap(state: HUDState): void {
    this.minimapPlayer.setPosition(
      this.toMinimapX(state.playerPosition.x, state.worldWidth),
      this.toMinimapY(state.playerPosition.y, state.worldHeight),
    );

    for (const enemyDot of this.minimapEnemies) {
      enemyDot.setVisible(false);
    }

    state.enemyPositions
      .slice(0, HUD.MAX_MINIMAP_ENEMIES)
      .forEach((position, index) => {
        const enemyDot = this.minimapEnemies[index];

        enemyDot.setPosition(
          this.toMinimapX(position.x, state.worldWidth),
          this.toMinimapY(position.y, state.worldHeight),
        );
        enemyDot.setVisible(true);
      });
  }

  private formatWeaponLines(state: HUDState): string[] {
    if (state.weaponHudInfo && state.weaponHudInfo.length > 0) {
      return state.weaponHudInfo.map((weapon) => (
        `- ${this.formatLabel(weapon.weaponId)}  ${weapon.upgradeSummary}`
      ));
    }

    if (state.weaponIds.length === 0) {
      return ['- None'];
    }

    return state.weaponIds.map((weaponId) => `- ${this.formatLabel(weaponId)}  Base`);
  }

  private formatPassiveLines(state: HUDState): string[] {
    if (!state.passiveItems || state.passiveItems.length === 0) {
      return ['- None'];
    }

    return state.passiveItems.map((passive) => (
      `- ${this.formatLabel(passive.id)} Lv.${passive.level}`
    ));
  }

  private formatEvolutionDebugLines(state: HUDState): string[] {
    if (!state.autoMode || !state.evolutionCandidateStats) {
      return [];
    }

    return [
      'Evolution Debug',
      ...state.evolutionCandidateStats
        .split('|')
        .map((candidate) => `- ${candidate}`),
    ];
  }

  private formatLabel(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toMinimapX(worldX: number, worldWidth: number): number {
    return this.minimapX
      + Phaser.Math.Clamp(worldX / Math.max(worldWidth, 1), 0, 1) * HUD.MINIMAP_WIDTH;
  }

  private toMinimapY(worldY: number, worldHeight: number): number {
    return this.minimapY
      + Phaser.Math.Clamp(worldY / Math.max(worldHeight, 1), 0, 1) * HUD.MINIMAP_HEIGHT;
  }

  private formatNumber(value: number): string {
    return value.toFixed(1);
  }

  private formatInteger(value: number): string {
    return Math.round(value).toString();
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
