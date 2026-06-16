import Phaser from 'phaser';

import { LayoutConfig, RectLayout } from '../../responsive/LayoutConfig';
import { ScreenManager } from '../../responsive/ScreenManager';
import { UIButton } from './UIButton';

export interface UIActionBarAction<T extends string = string> {
  id: T;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
}

export interface UIActionBarLayoutOptions {
  columns: number;
  compact?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  fontSize?: string;
}

export class UIActionBar<T extends string = string> {
  readonly container: Phaser.GameObjects.Container;
  private readonly buttons: Array<{ id: T; button: UIButton }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    actions: readonly UIActionBarAction<T>[],
  ) {
    this.container = scene.add.container(0, 0);
    this.setActions(actions);
  }

  setActions(actions: readonly UIActionBarAction<T>[]): void {
    this.buttons.forEach(({ button }) => button.destroy());
    this.buttons.length = 0;

    actions.forEach((action) => {
      const button = new UIButton(this.scene, {
        x: 0,
        y: 0,
        label: action.label,
        size: 'medium',
        disabled: action.disabled,
        selected: action.selected,
        onClick: action.onClick,
      });
      this.buttons.push({ id: action.id, button });
      this.container.add(button.container);
    });
  }

  layout(
    screen: ScreenManager,
    area: RectLayout,
    options: UIActionBarLayoutOptions,
  ): ReturnType<typeof LayoutConfig.getCompactButtonGridLayout> {
    const layout = LayoutConfig.getCompactButtonGridLayout(screen, this.buttons.length, {
      area,
      columns: options.columns,
      compact: options.compact,
      minWidth: options.minWidth,
      maxWidth: options.maxWidth,
      minHeight: options.minHeight,
      maxHeight: options.maxHeight,
      fontSize: options.fontSize,
    });

    this.buttons.forEach(({ button }, index) => {
      const position = layout.positions[index];
      button.setFontSize(layout.fontSize);
      button.setSize(layout.width, layout.height);
      button.setPosition(position.x, position.y);
    });

    return layout;
  }

  setSelected(id: T, selected: boolean): void {
    this.buttons.find((entry) => entry.id === id)?.button.setSelected(selected);
  }

  setDisabled(id: T, disabled: boolean): void {
    this.buttons.find((entry) => entry.id === id)?.button.setDisabled(disabled);
  }

  destroy(): void {
    this.container.destroy(true);
    this.buttons.length = 0;
  }
}
