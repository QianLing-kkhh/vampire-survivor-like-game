import Phaser from 'phaser';

import { UIButton } from './UIButton';

export interface UITabItem<T extends string> {
  id: T;
  label: string;
}

export interface UITabBarConfig<T extends string> {
  x: number;
  y: number;
  width: number;
  items: UITabItem<T>[];
  selectedId: T;
  tabWidth?: number;
  tabHeight?: number;
  gap?: number;
  onSelect(id: T): void;
}

export class UITabBar<T extends string> {
  readonly container: Phaser.GameObjects.Container;
  readonly height: number;
  private readonly buttons: Array<{ id: T; button: UIButton }> = [];

  constructor(scene: Phaser.Scene, config: UITabBarConfig<T>) {
    this.container = scene.add.container(config.x, config.y);
    const tabWidth = config.tabWidth ?? 108;
    const tabHeight = config.tabHeight ?? 34;
    const gap = config.gap ?? 8;
    const columns = Math.max(1, Math.floor((config.width + gap) / (tabWidth + gap)));
    const rows = Math.ceil(config.items.length / columns);
    this.height = rows * tabHeight + Math.max(0, rows - 1) * gap;

    config.items.forEach((item, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = -config.width / 2 + tabWidth / 2 + column * (tabWidth + gap);
      const y = tabHeight / 2 + row * (tabHeight + gap);
      const button = new UIButton(scene, {
        x,
        y,
        label: item.label,
        width: tabWidth,
        height: tabHeight,
        size: 'small',
        selected: item.id === config.selectedId,
        onClick: () => config.onSelect(item.id),
      });
      this.buttons.push({ id: item.id, button });
      this.container.add(button.container);
    });
  }

  setSelected(id: T): void {
    for (const entry of this.buttons) {
      entry.button.setSelected(entry.id === id);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
