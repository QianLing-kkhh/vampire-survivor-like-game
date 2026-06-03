import Phaser from 'phaser';

import { UITheme } from './UITheme';

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

type IconEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  visualKey?: string;
};

export class HUD {
  private static readonly MINIMAP_WIDTH = 130;
  private static readonly MINIMAP_HEIGHT = 82;
  private static readonly MAX_MINIMAP_ENEMIES = 50;
  private static readonly BAR_WIDTH = 230;
  private static readonly BAR_HEIGHT = 14;
  private static readonly ICON_SIZE = 28;

  private readonly scene: Phaser.Scene;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBarFill: Phaser.GameObjects.Rectangle;
  private readonly expText: Phaser.GameObjects.Text;
  private readonly expBarBg: Phaser.GameObjects.Rectangle;
  private readonly expBarFill: Phaser.GameObjects.Rectangle;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly goalText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly evolutionDebugText: Phaser.GameObjects.Text;
  private readonly weaponEntries: IconEntry[] = [];
  private readonly passiveEntries: IconEntry[] = [];
  private readonly minimapBackground: Phaser.GameObjects.Rectangle;
  private readonly minimapPlayer: Phaser.GameObjects.Arc;
  private readonly minimapEnemies: Phaser.GameObjects.Arc[] = [];
  private minimapX: number;
  private minimapY = 14;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.hpText = this.createText(16, 12, UITheme.smallFontSize);
    this.hpBarBg = this.createBarBackground(16, 34, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.hpBarFill = this.createBarFill(16, 34, UITheme.hpBarColor);
    this.expText = this.createText(16, 54, UITheme.smallFontSize);
    this.expBarBg = this.createBarBackground(16, 76, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.expBarFill = this.createBarFill(16, 76, UITheme.expBarColor);
    this.timeText = this.createText(16, 98, UITheme.smallFontSize);
    this.goalText = this.createText(16, 118, UITheme.smallFontSize, UITheme.mutedTextColor);
    this.messageText = this.createText(16, 140, UITheme.smallFontSize, UITheme.successTextColor);
    this.evolutionDebugText = this.createText(16, 520, '12px', UITheme.mutedTextColor);

    this.minimapX = scene.scale.width - HUD.MINIMAP_WIDTH - 16;
    this.minimapBackground = scene.add.rectangle(
      this.minimapX,
      this.minimapY,
      HUD.MINIMAP_WIDTH,
      HUD.MINIMAP_HEIGHT,
      UITheme.panelBgColor,
      0.72,
    );
    this.minimapBackground.setOrigin(0, 0);
    this.minimapBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.65);
    this.minimapBackground.setDepth(900);
    this.minimapBackground.setScrollFactor(0);

    for (let index = 0; index < HUD.MAX_MINIMAP_ENEMIES; index += 1) {
      const enemyDot = scene.add.circle(0, 0, 2, 0xef4444, 0.85);
      enemyDot.setDepth(901);
      enemyDot.setScrollFactor(0);
      enemyDot.setVisible(false);
      this.minimapEnemies.push(enemyDot);
    }

    this.minimapPlayer = scene.add.circle(0, 0, 3, 0x38bdf8, 1);
    this.minimapPlayer.setDepth(902);
    this.minimapPlayer.setScrollFactor(0);
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
      weaponHudInfo: [],
      passiveItems: [],
      moveSpeed: 0,
      pickupRange: 0,
      playerMaxHp: 0,
      worldWidth: 1,
      worldHeight: 1,
      playerPosition: { x: 0, y: 0 },
      enemyPositions: [],
    });
  }

  update(state: HUDState): void {
    const currentHp = this.formatInteger(state.currentHp);
    const maxHp = this.formatInteger(state.playerMaxHp ?? state.maxHp);
    const exp = Math.floor(state.currentExp);
    const requiredExp = Math.max(1, Math.floor(state.requiredExp));

    this.hpText.setText(`HP ${currentHp} / ${maxHp}`);
    this.setBarRatio(this.hpBarFill, state.currentHp / Math.max(state.playerMaxHp ?? state.maxHp, 1));
    this.expText.setText(`Lv.${state.level}  EXP ${exp} / ${requiredExp}`);
    this.setBarRatio(this.expBarFill, state.currentExp / requiredExp);
    this.timeText.setText(`Time ${this.formatTime(state.timeSeconds)}`);
    this.goalText.setText(this.getGoalText(state));
    this.messageText.setText(state.message ?? '');
    this.updateIconList(
      this.weaponEntries,
      this.getWeaponIconItems(state),
      16,
      168,
    );
    this.updateIconList(
      this.passiveEntries,
      this.getPassiveIconItems(state),
      16,
      168 + this.getWeaponIconItems(state).length * 34 + 14,
    );
    this.evolutionDebugText.setText(this.getEvolutionDebugText(state));
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

  private updateIconList(
    entries: IconEntry[],
    items: Array<{ id: string; textureKey?: string; label: string; fallback: string }>,
    x: number,
    y: number,
  ): void {
    while (entries.length < items.length) {
      entries.push(this.createIconEntry());
    }

    entries.forEach((entry, index) => {
      const item = items[index];

      if (!item) {
        entry.container.setVisible(false);
        return;
      }

      entry.container.setPosition(x, y + index * 34);
      entry.container.setVisible(true);
      entry.label.setText(item.label);
      const visualKey = item.textureKey && this.scene.textures.exists(item.textureKey)
        ? `texture:${item.textureKey}`
        : `fallback:${item.fallback}`;

      if (entry.visualKey === visualKey) {
        return;
      }

      entry.icon?.destroy();
      entry.fallback?.destroy();
      entry.icon = undefined;
      entry.fallback = undefined;
      entry.visualKey = visualKey;

      if (item.textureKey && this.scene.textures.exists(item.textureKey)) {
        entry.icon = this.scene.add.image(0, 0, item.textureKey);
        entry.icon.setDisplaySize(HUD.ICON_SIZE - 6, HUD.ICON_SIZE - 6);
        entry.container.addAt(entry.icon, 1);
        return;
      }

      entry.fallback = this.scene.add.text(0, 0, item.fallback, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
      });
      entry.fallback.setOrigin(0.5);
      entry.container.addAt(entry.fallback, 1);
    });
  }

  private createIconEntry(): IconEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const background = this.scene.add.rectangle(
      0,
      0,
      HUD.ICON_SIZE,
      HUD.ICON_SIZE,
      UITheme.iconBgColor,
      0.78,
    );
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);
    const label = this.scene.add.text(22, -8, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
    });

    container.add([background, label]);
    return { container, background, label };
  }

  private getWeaponIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
  }> {
    const weaponHudInfo = state.weaponHudInfo && state.weaponHudInfo.length > 0
      ? state.weaponHudInfo
      : state.weaponIds.map((weaponId) => ({ weaponId, upgradeSummary: 'Base' }));

    return weaponHudInfo.map((weapon) => ({
      id: weapon.weaponId,
      textureKey: this.getWeaponIconTextureKey(weapon.weaponId),
      label: this.getCompactWeaponLabel(weapon),
      fallback: this.getInitials(weapon.weaponId),
    }));
  }

  private getPassiveIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
  }> {
    return (state.passiveItems ?? []).map((passive) => ({
      id: passive.id,
      textureKey: undefined,
      label: `Lv.${passive.level}`,
      fallback: this.getInitials(passive.id),
    }));
  }

  private getWeaponIconTextureKey(weaponId: string): string | undefined {
    switch (weaponId) {
      case 'knife':
        return 'knife_icon';
      case 'garlic':
        return 'garlic_icon';
      case 'bible':
        return 'bible_icon';
      case 'axe':
        return 'axe_projectile';
      case 'magic_wand':
        return 'magic_wand_projectile';
      case 'thousand_edge':
        return 'thousand_edge_projectile';
      case 'holy_wand':
        return 'holy_wand_projectile';
      case 'death_spiral':
        return 'death_spiral_projectile';
      case 'unholy_vespers':
        return 'unholy_vespers_orbit_book';
      case 'soul_eater':
        return 'soul_eater_core';
      default:
        return undefined;
    }
  }

  private getCompactWeaponLabel(weapon: { weaponId: string; upgradeSummary: string }): string {
    if (weapon.upgradeSummary === 'Evolved') {
      return 'Evo';
    }

    const match = /Total Lv\.(\d+) \/ (\d+)/.exec(weapon.upgradeSummary);

    if (!match) {
      return 'Lv.0';
    }

    return `Lv.${match[1]}/${match[2]}`;
  }

  private getEvolutionDebugText(state: HUDState): string {
    if (!state.autoMode || !state.evolutionCandidateStats) {
      return '';
    }

    return [
      'Evolution Debug',
      ...state.evolutionCandidateStats
        .split('|')
        .slice(0, 5)
        .map((candidate) => candidate
          .replace(/;/g, ' ')
          .replace(/true/g, 'Y')
          .replace(/false/g, 'N')),
    ].join('\n');
  }

  private getGoalText(state: HUDState): string {
    if (state.timeSeconds >= state.targetTimeSeconds) {
      return 'Goal Defeat Boss';
    }

    return `Boss in ${this.formatTime(Math.max(0, state.targetTimeSeconds - state.timeSeconds))}`;
  }

  private createText(
    x: number,
    y: number,
    fontSize: string,
    color = UITheme.textColor,
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, '', {
      color,
      fontFamily: UITheme.fontFamily,
      fontSize,
    });
    text.setDepth(900);
    text.setScrollFactor(0);
    return text;
  }

  private createBarBackground(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    const bar = this.scene.add.rectangle(x, y, width, height, UITheme.barBgColor, 0.82);
    bar.setOrigin(0, 0);
    bar.setStrokeStyle(1, UITheme.panelBorderColor, 0.45);
    bar.setDepth(900);
    bar.setScrollFactor(0);
    return bar;
  }

  private createBarFill(
    x: number,
    y: number,
    color: number,
  ): Phaser.GameObjects.Rectangle {
    const bar = this.scene.add.rectangle(x, y, HUD.BAR_WIDTH, HUD.BAR_HEIGHT, color, 0.92);
    bar.setOrigin(0, 0);
    bar.setDepth(901);
    bar.setScrollFactor(0);
    return bar;
  }

  private setBarRatio(bar: Phaser.GameObjects.Rectangle, ratio: number): void {
    bar.displayWidth = HUD.BAR_WIDTH * Phaser.Math.Clamp(ratio, 0, 1);
  }

  private toMinimapX(worldX: number, worldWidth: number): number {
    return this.minimapX
      + Phaser.Math.Clamp(worldX / Math.max(worldWidth, 1), 0, 1) * HUD.MINIMAP_WIDTH;
  }

  private toMinimapY(worldY: number, worldHeight: number): number {
    return this.minimapY
      + Phaser.Math.Clamp(worldY / Math.max(worldHeight, 1), 0, 1) * HUD.MINIMAP_HEIGHT;
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
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
