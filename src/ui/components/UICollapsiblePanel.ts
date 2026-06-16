import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { PanelFrame } from './PanelFrame';
import { UIButton } from './UIButton';

export type UICollapsiblePanelOrientation = 'rightSidebar' | 'bottomBar' | 'floating';

export interface UICollapsiblePanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  collapsed?: boolean;
  orientation?: UICollapsiblePanelOrientation;
  collapsedLabel?: string;
  expandedLabel?: string;
  onToggle?: (collapsed: boolean) => void;
}

export class UICollapsiblePanel {
  readonly container: Phaser.GameObjects.Container;
  readonly contentContainer: Phaser.GameObjects.Container;
  readonly toggleButton: UIButton;
  private frameContainer: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private width: number;
  private height: number;
  private collapsed: boolean;
  private orientation: UICollapsiblePanelOrientation;
  private title: string;
  private collapsedLabel?: string;
  private expandedLabel?: string;

  constructor(private readonly scene: Phaser.Scene, private readonly config: UICollapsiblePanelConfig) {
    this.width = config.width;
    this.height = config.height;
    this.collapsed = config.collapsed === true;
    this.orientation = config.orientation ?? 'floating';
    this.title = config.title;
    this.collapsedLabel = config.collapsedLabel;
    this.expandedLabel = config.expandedLabel;

    this.container = scene.add.container(config.x, config.y);
    this.container.setScrollFactor(0);
    this.frameContainer = this.createFrame();
    this.titleText = scene.add.text(0, 0, this.title, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      fontStyle: 'bold',
      align: 'center',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setScrollFactor(0);
    this.contentContainer = scene.add.container(0, 0);
    this.contentContainer.setScrollFactor(0);
    this.toggleButton = new UIButton(scene, {
      x: 0,
      y: 0,
      width: Math.min(180, this.width - 18),
      height: 32,
      size: 'small',
      label: this.getToggleLabel(),
      onClick: () => this.setCollapsed(!this.collapsed),
    });

    this.container.add([
      this.frameContainer,
      this.titleText,
      this.contentContainer,
      this.toggleButton.container,
    ]);
    this.render();
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setLayout(params: {
    width: number;
    height: number;
    orientation?: UICollapsiblePanelOrientation;
  }): void {
    this.width = params.width;
    this.height = params.height;
    this.orientation = params.orientation ?? this.orientation;
    this.frameContainer.destroy(true);
    this.frameContainer = this.createFrame();
    this.container.addAt(this.frameContainer, 0);
    this.render();
  }

  setCollapsed(collapsed: boolean): void {
    if (this.collapsed === collapsed) {
      return;
    }

    this.collapsed = collapsed;
    this.render();
    this.config.onToggle?.(collapsed);
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  setLabels(labels: {
    title?: string;
    collapsedLabel?: string;
    expandedLabel?: string;
  }): void {
    if (labels.title !== undefined) {
      this.title = labels.title;
      this.titleText.setText(labels.title);
    }
    if (labels.collapsedLabel !== undefined) {
      this.collapsedLabel = labels.collapsedLabel;
    }
    if (labels.expandedLabel !== undefined) {
      this.expandedLabel = labels.expandedLabel;
    }
    this.render();
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  setScrollFactor(x: number, y?: number): void {
    this.container.setScrollFactor(x, y);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private createFrame(): Phaser.GameObjects.Container {
    const frame = PanelFrame.create(this.scene, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      variant: 'hud',
    });
    frame.setScrollFactor(0);
    return frame;
  }

  private render(): void {
    this.contentContainer.setVisible(!this.collapsed);
    this.titleText.setVisible(!this.collapsed);
    this.titleText.setText(this.title);
    this.titleText.setPosition(0, -this.height / 2 + 22);
    this.positionToggleButton();
    this.toggleButton.setText(this.getToggleLabel());
  }

  private getToggleLabel(): string {
    if (this.collapsed) {
      return this.collapsedLabel ?? (
        this.orientation === 'bottomBar' ? `${this.title} ^` : `< ${this.title}`
      );
    }

    return this.expandedLabel ?? (
      this.orientation === 'bottomBar' ? 'Collapse v' : 'Collapse'
    );
  }

  private positionToggleButton(): void {
    if (this.collapsed && this.orientation === 'rightSidebar') {
      this.toggleButton.container.setRotation(-Math.PI / 2);
      this.toggleButton.setSize(Math.max(72, this.height - 18), Math.max(28, this.width - 12));
      this.toggleButton.setPosition(0, 0);
      return;
    }

    this.toggleButton.container.setRotation(0);
    this.toggleButton.setSize(
      Math.min(180, Math.max(48, this.width - 18)),
      Math.min(32, Math.max(24, this.height - 10)),
    );
    this.toggleButton.setPosition(0, this.collapsed ? 0 : this.height / 2 - 26);
  }
}
